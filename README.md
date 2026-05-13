# Mouse Move

A GNOME Shell extension that automatically moves the mouse cursor after a period of inactivity to maintain presence (useful for chat clients and remote-work tools that flip your status to "away").

## Requirements

- GNOME Shell 45, 46, 47, 48, or 49
- Wayland or X11

## Installation

```bash
./install.sh
gnome-extensions enable mousemove@efren-corillo.github.com
```

You must reload GNOME Shell for the extension to load for the first time:

- **X11**: `Alt+F2`, type `r`, press Enter
- **Wayland**: log out and log back in (live shell restart is not supported on Wayland)

Then enable the extension from the panel menu, or via the GNOME Extensions app.

## Configuration

Open preferences either by clicking the panel icon → **Settings…**, or from the terminal:

```bash
gnome-extensions prefs mousemove@efren-corillo.github.com
```

Available settings:
- **Enabled** — turn monitoring on/off
- **Enable on Startup** — automatically enable monitoring when GNOME Shell loads the extension
- **Idle Threshold (seconds)** — how long the cursor must be still before it jumps
- **Movement Distance (pixels)** — how far the cursor jumps
- **Check Frequency (seconds)** — how often the extension polls activity

## Updating after changes

The reload steps depend on **what** you changed:

### JS only (`extension.js`, `prefs.js`)

```bash
./install.sh
gnome-extensions disable mousemove@efren-corillo.github.com
gnome-extensions enable mousemove@efren-corillo.github.com
```

A full shell restart is not needed — disabling and re-enabling reloads the JS.

### Schema changes (`schemas/*.gschema.xml`)

```bash
./install.sh   # this calls glib-compile-schemas automatically
```

Then reload GNOME Shell:
- **X11**: `Alt+F2` → `r` → Enter
- **Wayland**: log out and log back in

A disable/enable cycle is **not** sufficient for schema changes — GNOME Shell caches loaded schemas at session start, so the new keys won't appear until the shell process restarts.

### Manual schema recompile (without reinstalling)

If you are iterating on the schema in-place inside the installed extension directory:

```bash
glib-compile-schemas ~/.local/share/gnome-shell/extensions/mousemove@efren-corillo.github.com/schemas/
```

Still requires a shell restart to take effect.

## Uninstall

```bash
gnome-extensions disable mousemove@efren-corillo.github.com
rm -rf ~/.local/share/gnome-shell/extensions/mousemove@efren-corillo.github.com
```

Then reload GNOME Shell as above.

## Troubleshooting

Check the extension state:

```bash
gnome-extensions info mousemove@efren-corillo.github.com
```

If `State: ERROR`, view recent errors:

```bash
journalctl --user -b 0 | grep -i mousemove | tail -50
```
