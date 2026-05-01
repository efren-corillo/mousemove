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
            this._extension = extension;
            this._settings = extension.getSettings();
            this._timeoutId = null;
            this._lastX = 0;
            this._lastY = 0;
            this._lastActivityTime = Date.now();
            this._enabled = false;

            this._icon = new St.Icon({
                icon_name: 'input-mouse-symbolic',
                style_class: 'system-status-icon'
            });
            this.add_child(this._icon);

            this._enabledItem = new PopupMenu.PopupSwitchMenuItem('Enabled', false);
            this._enabledItem.connect('toggled', (item) => {
                this._setEnabled(item.state);
            });
            this.menu.addMenuItem(this._enabledItem);

            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

            const settingsItem = new PopupMenu.PopupMenuItem('Settings...');
            settingsItem.connect('activate', () => {
                this._extension.openPreferences();
            });
            this.menu.addMenuItem(settingsItem);

            this._settings.connect('changed::enabled', () => {
                this._sync();
            });

            this._sync();
        }

        _sync() {
            const enabled = this._settings.get_boolean('enabled');
            this._enabledItem.setToggleState(enabled);
            this._setEnabled(enabled);
        }

        _setEnabled(enabled) {
            if (this._enabled === enabled) return;
            this._enabled = enabled;
            this._settings.set_boolean('enabled', enabled);

            if (enabled) {
                this._icon.icon_name = 'input-mouse-symbolic';
                this._startMonitoring();
            } else {
                this._icon.icon_name = 'input-mouse-symbolic';
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

            const idleTime = Date.now() - this._lastActivityTime;
            const threshold = this._settings.get_int('idle-seconds') * 1000;

            if (idleTime >= threshold) {
                this._moveMouse();
                this._lastActivityTime = Date.now();
            }

            const interval = this._settings.get_int('check-interval');
            this._timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, interval, () => {
                this._checkIdle();
                return GLib.SOURCE_REMOVE;
            });
        }

        _updateActivityTime() {
            try {
                const display = Gdk.Display.get_default();
                if (!display) return;

                const seat = display.get_default_seat();
                if (!seat) return;

                const device = seat.get_pointer();
                if (!device) return;

                let [, x, y] = device.get_position();

                if (x !== this._lastX || y !== this._lastY) {
                    this._lastActivityTime = Date.now();
                    this._lastX = x;
                    this._lastY = y;
                }
            } catch (e) {
                logError(e, 'MouseMove');
            }
        }

        _moveMouse() {
            try {
                const display = Gdk.Display.get_default();
                if (!display) return;

                const seat = display.get_default_seat();
                if (!seat) return;

                const device = seat.get_pointer();
                if (!device) return;

                let [, x, y] = device.get_position();
                const monitor = display.get_monitor_at_point(x, y);
                if (!monitor) return;

                const rect = monitor.get_geometry();
                const moveDistance = this._settings.get_int('move-distance');

                this._lastX = x;
                this._lastY = y;

                const newX = Math.min(Math.max(x + moveDistance, rect.x), rect.x + rect.width - 1);
                const newY = Math.min(Math.max(y, rect.y), rect.y + rect.height - 1);

                device.warp(display.get_default_screen?.() || display, newX, newY);

                this._lastX = newX;
                this._lastY = newY;
            } catch (e) {
                logError(e, 'MouseMove');
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
        this._indicator = new Indicator(this);
        Main.panel.addToStatusArea(this.uuid, this._indicator);
    }

    disable() {
        this._indicator?.destroy();
        this._indicator = null;
    }
}
