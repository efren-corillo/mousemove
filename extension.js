import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as MessageTray from 'resource:///org/gnome/shell/ui/messageTray.js';
import * as Config from 'resource:///org/gnome/shell/misc/config.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import St from 'gi://St';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Gdk from 'gi://Gdk';
import GObject from 'gi://GObject';

const Indicator = GObject.registerClass(
    class Indicator extends PanelMenu.Button {
        /**
         * Constructs the panel indicator: initialises internal state, builds the
         * status-area icon and popup menu (Enabled switch + Settings… entry), and
         * wires the menu switch to the `enabled` GSetting via Gio.Settings.bind.
         *
         * @param {Extension} extension - The owning MouseMoveExtension instance;
         *   used to look up GSettings (`extension.getSettings()`) and to open the
         *   preferences window from the Settings… menu entry.
         */
        _init(extension) {
            super._init(0.0, 'Mouse Move');
            this._extension = extension;
            this._settings = extension.getSettings();
            this._timeoutId = null;
            this._lastX = 0;
            this._lastY = 0;
            this._lastActivityTime = Date.now();
            this._enabled = false;
            this._isIdle = false;
            this._moveDirection = 1;
            this._inhibitCookie = 0;
            this._notifSource = null;
            this._shellMajor = parseInt(Config.PACKAGE_VERSION.split('.')[0], 10);

            this._outlineGicon = Gio.ThemedIcon.new('input-mouse-symbolic');
            this._filledGicon = Gio.FileIcon.new(
                Gio.File.new_for_path(`${extension.path}/icons/mousemove-filled-symbolic.svg`)
            );

            this._icon = new St.Icon({
                gicon: this._outlineGicon,
                style_class: 'system-status-icon'
            });
            this.add_child(this._icon);

            this._enabledItem = new PopupMenu.PopupSwitchMenuItem('Enabled', false);

            // Bind the switch to the setting
            this._settings.bind(
                'enabled',
                this._enabledItem._switch,
                'state',
                Gio.SettingsBindFlags.DEFAULT
            );

            this.menu.addMenuItem(this._enabledItem);

            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

            const settingsItem = new PopupMenu.PopupMenuItem('Settings...');
            settingsItem.connect('activate', () => {
                this._extension.openPreferences();
            });
            this.menu.addMenuItem(settingsItem);

            this._settings.connect('changed::enabled', () => {
                this._updateEnabledState();
            });

            this._updateEnabledState();
        }

        /**
         * Reacts to changes in the `enabled` GSetting (toggled via the panel
         * switch or the preferences window). Starts the idle-check loop when
         * the setting flips to true; stops it and clears the cached idle state
         * when it flips to false. Idempotent: no-ops if the effective state is
         * unchanged.
         */
        _updateEnabledState() {
            const enabled = this._settings.get_boolean('enabled');
            if (this._enabled === enabled) return;

            this._enabled = enabled;
            this._icon.gicon = enabled ? this._filledGicon : this._outlineGicon;

            if (enabled) {
                this._addInhibitor();
                this._startMonitoring();
            } else {
                this._isIdle = false;
                this._stopMonitoring();
                this._removeInhibitor();
            }
        }

        /**
         * Asks GNOME's SessionManager to inhibit auto-suspend and the idle
         * flag (flags 4 | 8) while monitoring is on. Cursor warping alone
         * does not register as user input, so Mutter's idle timer keeps
         * ticking and GNOME still suspends; the inhibitor is what actually
         * keeps the session awake. Stores the returned cookie so we can
         * release the inhibitor when monitoring is disabled.
         */
        _addInhibitor() {
            if (this._inhibitCookie) return;
            try {
                Gio.DBus.session.call(
                    'org.gnome.SessionManager',
                    '/org/gnome/SessionManager',
                    'org.gnome.SessionManager',
                    'Inhibit',
                    new GLib.Variant('(susu)', [
                        'mousemove@efren-corillo.github.com',
                        0,
                        'Mouse Move keeping session active',
                        12,
                    ]),
                    new GLib.VariantType('(u)'),
                    Gio.DBusCallFlags.NONE,
                    -1,
                    null,
                    (conn, res) => {
                        try {
                            const reply = conn.call_finish(res);
                            this._inhibitCookie = reply.deep_unpack()[0];
                        } catch (e) {
                            console.error(`MouseMove: Inhibit failed: ${e.message}`);
                        }
                    }
                );
            } catch (e) {
                console.error(`MouseMove: Inhibit call error: ${e.message}`);
            }
        }

        /**
         * Releases the SessionManager inhibitor obtained by _addInhibitor.
         * Safe to call when no inhibitor is held.
         */
        _removeInhibitor() {
            if (!this._inhibitCookie) return;
            const cookie = this._inhibitCookie;
            this._inhibitCookie = 0;
            try {
                Gio.DBus.session.call(
                    'org.gnome.SessionManager',
                    '/org/gnome/SessionManager',
                    'org.gnome.SessionManager',
                    'Uninhibit',
                    new GLib.Variant('(u)', [cookie]),
                    null,
                    Gio.DBusCallFlags.NONE,
                    -1,
                    null,
                    null
                );
            } catch (e) {
                console.error(`MouseMove: Uninhibit call error: ${e.message}`);
            }
        }

        /**
         * Begins the idle-monitoring loop. Cancels any pre-existing timeout
         * first to avoid duplicate concurrent loops, resets the activity
         * baseline so a stale _lastActivityTime from a previous enable cycle
         * doesn't trigger an immediate spurious idle, then fires
         * _checkIdle() (which reschedules itself).
         */
        _startMonitoring() {
            this._stopMonitoring();
            this._lastActivityTime = Date.now();
            try {
                let [x, y] = global.get_pointer();
                this._lastX = x;
                this._lastY = y;
            } catch (e) {
                // Non-fatal; _updateActivityTime will recover on next tick.
            }
            this._checkIdle();
        }

        /**
         * Cancels the pending GLib timeout if one is scheduled. Safe to call
         * even when no timeout is active.
         */
        _stopMonitoring() {
            if (this._timeoutId) {
                GLib.source_remove(this._timeoutId);
                this._timeoutId = null;
            }
        }

        /**
         * One tick of the monitoring loop. Two-phase cadence:
         *
         *  - Pre-idle: sleep exactly until the idle threshold would expire
         *    (`threshold - idleTime`, min 1s). `check-interval` is NOT used
         *    here — there is no point polling more often than the threshold,
         *    since real pointer movement keeps pushing _lastActivityTime
         *    forward and only the time-since-last-activity decides whether
         *    we've crossed into idle.
         *  - Post-idle: jiggle and re-arm at `check-interval` seconds. The
         *    cadence stays fixed at that interval until the user returns;
         *    _updateActivityTime() clears `_isIdle` as soon as it sees real
         *    pointer movement (warps don't count — _moveMouse() updates
         *    _lastX/_lastY to the warped position).
         *
         * Reads GSettings:
         *   - `idle-seconds`   (int, seconds) → threshold before going idle
         *   - `check-interval` (int, seconds) → jiggle cadence once idle
         */
        _checkIdle() {
            if (!this._enabled) return;

            this._updateActivityTime();

            const threshold = this._settings.get_int('idle-seconds') * 1000;
            const idleTime = Date.now() - this._lastActivityTime;

            let nextDelay;
            if (this._isIdle) {
                this._moveMouse();
                nextDelay = this._settings.get_int('check-interval') * 1000;
            } else if (idleTime >= threshold) {
                this._isIdle = true;
                console.log('MouseMove: User went idle — activating cursor movement');
                this._notify('Mouse Move active', 'Idle detected — keeping your session awake.');
                this._moveMouse();
                nextDelay = this._settings.get_int('check-interval') * 1000;
            } else {
                nextDelay = Math.max(1000, threshold - idleTime);
            }

            this._timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, nextDelay, () => {
                this._checkIdle();
                return GLib.SOURCE_REMOVE;
            });
        }

        /**
         * Polls the current pointer position via `global.get_pointer()` and
         * updates _lastActivityTime if the pointer has moved since the last
         * call. When real pointer movement is detected while we were in the
         * idle state, logs a "presence detected" transition line and clears
         * _isIdle. Errors are caught and logged so the loop survives.
         */
        _updateActivityTime() {
            try {
                let [x, y] = global.get_pointer();

                if (x !== this._lastX || y !== this._lastY) {
                    if (this._isIdle) {
                        this._isIdle = false;
                        console.log('MouseMove: User presence detected — deactivating cursor movement');
                        this._notify('Mouse Move paused', 'Welcome back — cursor movement stopped.');
                    }
                    this._lastActivityTime = Date.now();
                    this._lastX = x;
                    this._lastY = y;
                }
            } catch (e) {
                console.error(`MouseMove: Error updating activity: ${e.message}`);
            }
        }

        /**
         * Warps the cursor by `move-distance` pixels (read from GSettings) in
         * the current direction. Direction alternates each call so consecutive
         * jiggles cancel out and the cursor stays near its origin. If the new
         * position would fall outside the monitor geometry, the move is
         * reflected to the opposite direction. After the warp, _lastX/_lastY
         * are updated to the new position so _updateActivityTime doesn't
         * mistake the warp itself for user activity.
         *
         * Reads GSettings:
         *   - `move-distance` (int, pixels)
         */
        _moveMouse() {
            try {
                const display = Gdk.Display.get_default();
                if (!display) return;

                let [x, y] = global.get_pointer();
                const monitor = display.get_monitor_at_point(x, y);
                if (!monitor) return;

                const rect = monitor.get_geometry();
                let moveDistance = this._settings.get_int('move-distance');

                if (this._settings.get_boolean('randomize-movement')) {
                    // Randomize between 50% and 150% of the set distance
                    const factor = 0.5 + Math.random();
                    moveDistance = Math.max(1, Math.round(moveDistance * factor));
                }

                this._lastX = x;
                this._lastY = y;

                this._moveDirection *= -1;

                let newX = x + (moveDistance * this._moveDirection);
                let newY = y + (moveDistance * this._moveDirection);

                if (newX >= rect.x + rect.width || newX < rect.x) newX = x - (moveDistance * this._moveDirection);
                if (newY >= rect.y + rect.height || newY < rect.y) newY = y - (moveDistance * this._moveDirection);

                const seat = display.get_default_seat();
                const device = seat.get_pointer();

                device.warp(display.get_default_screen?.() || display, newX, newY);

                this._lastX = newX;
                this._lastY = newY;
            } catch (e) {
                console.error(`MouseMove: Error moving cursor: ${e.message}`);
            }
        }

        /**
         * Shows a transient desktop notification for an idle/active
         * transition, unless the `show-notifications` GSetting is off. Lazily
         * creates a single reusable MessageTray source (kept alive across
         * transitions so banners don't pile up under separate sources) and
         * nulls the cached reference when the source is destroyed. The
         * MessageTray API differs between GNOME 45/46 (positional args,
         * showNotification/setTransient) and 47+ (object args,
         * addNotification/isTransient), so construction branches on the
         * detected shell major version. Errors are caught so a notification
         * failure never breaks the monitoring loop.
         */
        _notify(title, body) {
            if (!this._settings.get_boolean('show-notifications')) return;

            try {
                const useNewApi = this._shellMajor >= 47;

                if (!this._notifSource) {
                    this._notifSource = useNewApi
                        ? new MessageTray.Source({ title: 'Mouse Move', iconName: 'input-mouse-symbolic' })
                        : new MessageTray.Source('Mouse Move', 'input-mouse-symbolic');
                    this._notifSource.connect('destroy', () => {
                        this._notifSource = null;
                    });
                    Main.messageTray.add(this._notifSource);
                }

                if (useNewApi) {
                    const notification = new MessageTray.Notification({
                        source: this._notifSource,
                        title,
                        body,
                        isTransient: true,
                    });
                    this._notifSource.addNotification(notification);
                } else {
                    const notification = new MessageTray.Notification(this._notifSource, title, body);
                    notification.setTransient(true);
                    this._notifSource.showNotification(notification);
                }
            } catch (e) {
                console.error(`MouseMove: Notification error: ${e.message}`);
            }
        }

        /**
         * Lifecycle hook called when the indicator is being torn down (e.g.
         * extension disable or shell restart). Stops the monitoring loop so
         * no further timeouts fire after destruction, releases the suspend
         * inhibitor and the notification source, then defers to the parent
         * PanelMenu.Button.destroy for the rest of the cleanup.
         */
        destroy() {
            this._stopMonitoring();
            this._removeInhibitor();
            this._notifSource?.destroy();
            this._notifSource = null;
            super.destroy();
        }
    }
);

export default class MouseMoveExtension extends Extension {
    /**
     * GNOME Shell lifecycle hook fired when the extension is loaded (on
     * shell startup, login, or `gnome-extensions enable`). Forces the
     * `enabled` GSetting to false so monitoring never auto-starts — the
     * user must opt in via the panel switch each session — then constructs
     * the indicator and adds it to the top-panel status area under the
     * extension UUID.
     */
    enable() {
        this.getSettings().set_boolean('enabled', false);
        this._indicator = new Indicator(this);
        Main.panel.addToStatusArea(this.uuid, this._indicator);
    }

    /**
     * GNOME Shell lifecycle hook fired when the extension is unloaded
     * (on shell shutdown, logout, or `gnome-extensions disable`). Destroys
     * the indicator (which stops the monitoring loop via its own destroy)
     * and drops the reference so the instance can be garbage collected.
     */
    disable() {
        this._indicator?.destroy();
        this._indicator = null;
    }
}
