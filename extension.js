const { St, Clutter } = imports.gi;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const GLib = imports.gi.GLib;

let mousemoveButton;

const MouseMoveButton = class extends PanelMenu.Button {
    _init() {
        super._init(0.0, _('MouseMove'));

        let icon = new St.Icon({
            icon_name: 'system-run-symbolic',
            style_class: 'system-status-icon'
        });

        this.actor.add_child(icon);
        this.actor.connect('button-press-event', this._toggleMouseMove.bind(this));
    }

    _toggleMouseMove() {
        if (this._isRunning()) {
            this._stopMouseMove();
        } else {
            this._startMouseMove();
        }
    }

    _startMouseMove() {
        GLib.spawn_command_line_async('gnome-terminal -- ./mousemove.sh');
    }

    _stopMouseMove() {
        GLib.spawn_command_line_async('pkill -f keep-presence');
    }

    _isRunning() {
        return GLib.find_program_in_path('keep-presence') !== null;
    }
};

function init() {
}

function enable() {
    mousemoveButton = new MouseMoveButton();
    Main.panel.addToStatusArea('mousemove-button', mousemoveButton, 1, 'right');
}

function disable() {
    mousemoveButton.destroy();
    mousemoveButton = null;
}
