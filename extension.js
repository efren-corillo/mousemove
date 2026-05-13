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
        _init(extension) {
            super._init(0.0, 'Mouse Move');
            console.log('MouseMove: Indicator _init');
            this._extension = extension;
            this._settings = extension.getSettings();
            this._timeoutId = null;
            this._lastX = 0;
            this._lastY = 0;
            this._lastActivityTime = Date.now();
            this._enabled = false;
            this._moveDirection = 1;

            // Detect Display Server
            this._isWayland = GLib.getenv('XDG_SESSION_TYPE') === 'wayland';
            console.log(`MouseMove: Initializing on ${this._isWayland ? 'Wayland' : 'X11'}`);

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

            // Watch settings changes
            this._settings.connect('changed::enabled', () => {
                this._updateEnabledState();
            });
            
            this._settings.connect('changed::idle-seconds', () => {
                const val = this._settings.get_int('idle-seconds');
                Main.notify(`MouseMove: Idle threshold changed to ${val}s`);
            });

            // Initial state
            this._updateEnabledState();
        }

        _updateEnabledState() {
            const enabled = this._settings.get_boolean('enabled');
            if (this._enabled === enabled) return;
            
            this._enabled = enabled;
            console.log(`MouseMove: Monitoring state -> ${enabled}`);

            if (enabled) {
                this._startMonitoring();
            } else {
                this._stopMonitoring();
            }
        }

        _startMonitoring() {
            this._stopMonitoring();
            this._checkIdle();
        }

        _stopMonitoring() {
            if (this._timeoutId) {
                GLib.source_remove(this._timeoutId);
                this._timeoutId = null;
            }
        }

        _checkIdle() {
            if (!this._enabled) return;

            this._updateActivityTime();

            const now = Date.now();
            const idleTime = now - this._lastActivityTime;
            const threshold = this._settings.get_int('idle-seconds') * 1000;
            const interval = this._settings.get_int('check-interval') * 1000;

            // HEARTBEAT: This should pop up every check interval
            Main.notify(`MouseMove: checking... (Idle: ${Math.round(idleTime/1000)}s)`);

            if (idleTime >= threshold) {
                console.log(`MouseMove: IDLE DETECTED. Moving cursor.`);
                this._moveMouse();
                this._lastActivityTime = Date.now();
            } else {
                this._lastLogTime = this._lastLogTime || 0;
                if (now - this._lastLogTime >= 2000) {
                    console.log(`MouseMove: Status - Idle for ${Math.round(idleTime/1000)}s / ${threshold/1000}s`);
                    this._lastLogTime = now;
                }
            }

            this._timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, interval, () => {
                this._checkIdle();
                return GLib.SOURCE_REMOVE;
            });
        }

        _updateActivityTime() {
            try {
                let [x, y] = global.get_pointer();

                if (x !== this._lastX || y !== this._lastY) {
                    this._lastActivityTime = Date.now();
                    this._lastX = x;
                    this._lastY = y;
                }
            } catch (e) {
                console.error(`MouseMove: Error updating activity: ${e.message}`);
            }
        }

        _moveMouse() {
            try {
                const display = Gdk.Display.get_default();
                if (!display) return;

                let [x, y] = global.get_pointer();
                const monitor = display.get_monitor_at_point(x, y);
                if (!monitor) return;

                const rect = monitor.get_geometry();
                const moveDistance = this._settings.get_int('move-distance');

                this._lastX = x;
                this._lastY = y;

                this._moveDirection *= -1;
                
                let newX = x + (moveDistance * this._moveDirection);
                let newY = y + (moveDistance * this._moveDirection);

                if (newX >= rect.x + rect.width || newX < rect.x) newX = x - (moveDistance * this._moveDirection);
                if (newY >= rect.y + rect.height || newY < rect.y) newY = y - (moveDistance * this._moveDirection);

                const seat = display.get_default_seat();
                const device = seat.get_pointer();
                
                console.log(`MouseMove: WARP (${x}, ${y}) -> (${newX}, ${newY}) [${this._isWayland ? 'Wayland' : 'X11'}]`);
                device.warp(display.get_default_screen?.() || display, newX, newY);
                
                Main.notify('MouseMove: Cursor jumped to maintain presence');

                this._lastX = newX;
                this._lastY = newY;
            } catch (e) {
                console.error(`MouseMove: Error moving cursor: ${e.message}`);
            }
        }

        destroy() {
            this._stopMonitoring();
            super.destroy();
        }
    }
);

export default class MouseMoveExtension extends Extension {
    enable() {
        console.log('MouseMove: Extension ENABLE');
        const settings = this.getSettings();
        if (settings.get_boolean('enable-on-startup')) {
            settings.set_boolean('enabled', true);
        }
        this._indicator = new Indicator(this);
        Main.panel.addToStatusArea(this.uuid, this._indicator);
    }

    disable() {
        console.log('MouseMove: Extension DISABLE');
        this._indicator?.destroy();
        this._indicator = null;
    }
}
