#!/bin/bash
# Installs the "T2 Fan (AUTO / MAX)" Cinnamon applet.
# Run it as your normal user (it asks for your sudo password when needed):  ./install.sh
# Running it again updates an existing installation.
#
# https://github.com/pepsimo/t2fan-control
# SPDX-License-Identifier: GPL-3.0-or-later
set -euo pipefail

UUID="t2fan-control@pepsimo"
HELPER=/usr/local/bin/t2fan-control
SUDOERS=/etc/sudoers.d/t2fan-control
APPLET_DIR="$HOME/.local/share/cinnamon/applets/$UUID"
LOCALE_DIR="$HOME/.local/share/locale"
DIR="$(cd "$(dirname "$0")" && pwd)"

if [ "$EUID" -eq 0 ]; then
    echo "Run it WITHOUT sudo: ./install.sh  (it asks for the password when needed)"
    exit 1
fi

# The user name goes into the sudoers rule: accept only ordinary names.
if ! [[ "$USER" =~ ^[a-z_][a-z0-9_-]*$ ]]; then
    echo "User name not supported for the sudoers rule: '$USER'"
    exit 1
fi

echo "== Checks"
[ -f /etc/t2fand.conf ] || { echo "/etc/t2fand.conf not found: install and start t2fanrd first (see README)."; exit 1; }
systemctl is-active --quiet t2fanrd || echo "Warning: the t2fanrd service is not active."
command -v cinnamon >/dev/null || echo "Warning: Cinnamon not found; the applet only works on Cinnamon."

echo "== 1/5 Removing the old prototype (t2fan-max), if present"
if [ -e /usr/local/bin/t2fan-max ] || [ -e /etc/sudoers.d/t2fan-max ] || [ -d "$HOME/.local/share/cinnamon/applets/t2fan-max@pep" ]; then
    sudo rm -f /usr/local/bin/t2fan-max /etc/sudoers.d/t2fan-max
    rm -rf "$HOME/.local/share/cinnamon/applets/t2fan-max@pep"
    echo "   Removed (take it off the panel if it is still visible)."
else
    echo "   Nothing to remove."
fi

echo "== 2/5 Installing the helper script to $HELPER"
sudo install -m 755 -o root -g root "$DIR/helper/t2fan-control" "$HELPER"

echo "== 3/5 Allowing only these exact commands without a password: on off strong medium quiet"
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT
{
    echo "# Created by t2fan-control/install.sh — only these exact commands, without a password."
    printf '%s ALL=(root) NOPASSWD: %s on, %s off, %s strong, %s medium, %s quiet\n' \
        "$USER" "$HELPER" "$HELPER" "$HELPER" "$HELPER" "$HELPER"
} > "$TMP"
if sudo visudo -cf "$TMP" >/dev/null; then
    sudo install -m 440 -o root -g root "$TMP" "$SUDOERS"
else
    echo "The sudoers rule did not validate. Nothing was installed in sudoers."
    exit 1
fi

echo "== 4/5 Copying the applet to $APPLET_DIR"
rm -rf "$APPLET_DIR"
mkdir -p "$APPLET_DIR"
cp "$DIR/applet/$UUID/applet.js" "$DIR/applet/$UUID/metadata.json" \
   "$DIR/applet/$UUID/settings-schema.json" "$DIR/applet/$UUID/icon.png" "$APPLET_DIR/"

echo "== 5/5 Installing translations"
for po in "$DIR/applet/$UUID/po/"*.po; do
    lang="$(basename "$po" .po)"
    dest="$LOCALE_DIR/$lang/LC_MESSAGES"
    mkdir -p "$dest"
    if command -v msgfmt >/dev/null; then
        msgfmt -o "$dest/$UUID.mo" "$po"
    else
        cp "$DIR/locale/$lang/LC_MESSAGES/$UUID.mo" "$dest/"
    fi
    echo "   $lang"
done

# If the applet is already on the panel, Cinnamon reloads it without logging out.
dbus-send --session --dest=org.Cinnamon.LookingGlass --type=method_call \
    /org/Cinnamon/LookingGlass org.Cinnamon.LookingGlass.ReloadExtension \
    string:"$UUID" string:'APPLET' >/dev/null 2>&1 || true

echo
echo "Done. If you don't see it, add it: right-click the panel > Applets > 'T2 Fan (AUTO / MAX)' > +"
echo "Current state: $("$HELPER" status)"
