#!/bin/bash

# Mouse Move GNOME Extension Installer
# Compatible with GNOME 45+ (Ubuntu 24.10 with GNOME 49)

set -e

EXTENSION_UUID="mousemove@efren-corillo.github.com"
EXTENSION_NAME="MouseMove"
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST_DIR="$HOME/.local/share/gnome-shell/extensions/$EXTENSION_UUID"

echo "Installing $EXTENSION_NAME GNOME Extension..."
echo "Source: $SOURCE_DIR"
echo "Destination: $DEST_DIR"

# Check if schemas directory exists and compile
if [ -d "$SOURCE_DIR/schemas" ]; then
    echo "Compiling gsettings schemas..."
    glib-compile-schemas "$SOURCE_DIR/schemas"
fi

# Remove existing installation if present
if [ -d "$DEST_DIR" ]; then
    echo "Removing existing installation..."
    rm -rf "$DEST_DIR"
fi

# Create destination directory
mkdir -p "$DEST_DIR"

# Copy extension files
cp "$SOURCE_DIR/extension.js" "$DEST_DIR/"
cp "$SOURCE_DIR/prefs.js" "$DEST_DIR/"
cp "$SOURCE_DIR/metadata.json" "$DEST_DIR/"

# Copy icon if it exists
if [ -f "$SOURCE_DIR/icon.png" ]; then
    cp "$SOURCE_DIR/icon.png" "$DEST_DIR/"
fi

# Copy schemas directory
if [ -d "$SOURCE_DIR/schemas" ]; then
    cp -r "$SOURCE_DIR/schemas" "$DEST_DIR/"
fi

# Copy icons directory
if [ -d "$SOURCE_DIR/icons" ]; then
    cp -r "$SOURCE_DIR/icons" "$DEST_DIR/"
fi

echo "Extension files copied successfully!"
echo ""
echo "To enable the extension:"
echo "  1. Log out and log back in (or restart GNOME Shell with Alt+F2, type 'r', press Enter on X11)"
echo "  2. Open GNOME Extensions app or run: gnome-extensions enable $EXTENSION_UUID"
echo "  3. Or use GNOME Tweaks to enable the extension"
echo ""
echo "To configure settings:"
echo "  gnome-extensions prefs $EXTENSION_UUID"
echo ""
echo "Installation complete!"
