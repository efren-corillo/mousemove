import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
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
            this._enabled = false;
            this._isIdle = false;
            this._moveDirection = 1;

            this._icon = new St.Icon({
                icon_name: 'input-mouse-symbolic',
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

            if (enabled) {
                this._startMonitoring();
            } else {
                this._isIdle = false;
                this._stopMonitoring();
            }
        }

        /**
         * Begins the idle-monitoring loop. Cancels any pre-existing timeout
         * first to avoid duplicate concurrent loops, then fires _checkIdle()
         * immediately (which reschedules itself).
         */
        _startMonitoring() {
            this._stopMonitoring();
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
         * One tick of the monitoring loop. Queries the GNOME IdleMonitor for
         * the time since any input (mouse, keyboard, touch) was last received,
         * and if that exceeds the user's idle threshold, jiggles the cursor.
         * Logs transitions into and out of the idle state. Always schedules
         * the next tick via GLib.timeout_add.
         *
         * Reads GSettings:
         *   - `idle-seconds`   (int, seconds) → threshold before jiggling
         *   - `check-interval` (int, minutes) → delay until the next tick
         */
        _checkIdle() {
            if (!this._enabled) return;

            const idleMonitor = global.backend.get_core_idle_monitor();
            const idleTime = idleMonitor ? idleMonitor.get_idletime() : 0;
            const threshold = this._settings.get_int('idle-seconds') * 1000;
            const interval = this._settings.get_int('check-interval') * 60 * 1000;

            if (idleTime >= threshold) {
                if (!this._isIdle) {
                    this._isIdle = true;
                    console.log('MouseMove: User went idle — activating cursor movement');
                }
                this._moveMouse();
            } else {
                if (this._isIdle) {
                    this._isIdle = false;
                    console.log('MouseMove: User presence detected — deactivating cursor movement');
                }
            }

            this._timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, interval, () => {
                this._checkIdle();
                return GLib.SOURCE_REMOVE;
            });
        }

        /**
         * Warps the cursor by `move-distance` pixels (read from GSettings) in
         * the current direction. Direction alternates each call so consecutive
         * jiggles cancel out and the cursor stays near its origin. If the new
         * position would fall outside the monitor geometry, the move is
         * reflected to the opposite direction.
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

                this._moveDirection *= -1;

                let newX = x + (moveDistance * this._moveDirection);
                let newY = y + (moveDistance * this._moveDirection);

                if (newX >= rect.x + rect.width || newX < rect.x) newX = x - (moveDistance * this._moveDirection);
                if (newY >= rect.y + rect.height || newY < rect.y) newY = y - (moveDistance * this._moveDirection);

                const seat = display.get_default_seat();
                const device = seat.get_pointer();

                device.warp(display.get_default_screen?.() || display, newX, newY);
            } catch (e) {
                console.error(`MouseMove: Error moving cursor: ${e.message}`);
            }
        }

        /**
         * Lifecycle hook called when the indicator is being torn down (e.g.
         * extension disable or shell restart). Stops the monitoring loop so
         * no further timeouts fire after destruction, then defers to the
         * parent PanelMenu.Button.destroy for the rest of the cleanup.
         */
        destroy() {
            this._stopMonitoring();
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
