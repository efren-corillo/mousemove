import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';

export default class MouseMovePreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        const page = new Adw.PreferencesPage({
            title: _('General'),
            icon_name: 'input-mouse-symbolic'
        });
        window.add(page);

        const group = new Adw.PreferencesGroup({
            title: _('Mouse Move Settings'),
            description: _('Configure automatic mouse movement to maintain presence')
        });
        page.add(group);

        const enabledRow = new Adw.SwitchRow({
            title: _('Enabled'),
            subtitle: _('Enable automatic mouse movement')
        });
        group.add(enabledRow);
        settings.bind('enabled', enabledRow, 'active', Gio.SettingsBindFlags.DEFAULT);

        const idleRow = new Adw.SpinRow({
            title: _('Idle Threshold (seconds)'),
            subtitle: _('Wait duration of inactivity before the cursor moves'),
            adjustment: new Gtk.Adjustment({
                lower: 1,
                upper: 300,
                step_increment: 1,
                page_increment: 10,
                value: settings.get_int('idle-seconds')
            })
        });
        group.add(idleRow);
        settings.bind('idle-seconds', idleRow, 'value', Gio.SettingsBindFlags.DEFAULT);

        const distanceRow = new Adw.SpinRow({
            title: _('Movement Distance (pixels)'),
            subtitle: _('How many pixels the cursor will jump'),
            adjustment: new Gtk.Adjustment({
                lower: 1,
                upper: 100,
                step_increment: 1,
                page_increment: 5,
                value: settings.get_int('move-distance')
            })
        });
        group.add(distanceRow);
        settings.bind('move-distance', distanceRow, 'value', Gio.SettingsBindFlags.DEFAULT);

        const randomizeRow = new Adw.SwitchRow({
            title: _('Randomize Movement'),
            subtitle: _('Vary the jump distance slightly each time for a more natural feel')
        });
        group.add(randomizeRow);
        settings.bind('randomize-movement', randomizeRow, 'active', Gio.SettingsBindFlags.DEFAULT);

        const notificationsRow = new Adw.SwitchRow({
            title: _('Show Notifications'),
            subtitle: _('Show a banner when monitoring goes idle (active) and when you return')
        });
        group.add(notificationsRow);
        settings.bind('show-notifications', notificationsRow, 'active', Gio.SettingsBindFlags.DEFAULT);

        const intervalRow = new Adw.SpinRow({
            title: _('Check Frequency (seconds)'),
            subtitle: _('How often the cursor jiggles once the idle threshold has been reached'),
            adjustment: new Gtk.Adjustment({
                lower: 1,
                upper: 3600,
                step_increment: 1,
                page_increment: 10,
                value: settings.get_int('check-interval')
            })
        });
        group.add(intervalRow);
        settings.bind('check-interval', intervalRow, 'value', Gio.SettingsBindFlags.DEFAULT);
    }
}
