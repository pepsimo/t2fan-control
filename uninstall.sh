#!/bin/bash
# Removes the "T2 Fan (AUTO / MAX)" applet and leaves the fan in AUTO mode.
# With --restore it also brings back the /etc/t2fand.conf you had before installing.
#
# https://github.com/pepsimo/t2fan-control
# SPDX-License-Identifier: GPL-3.0-or-later
set -uo pipefail

UUID="t2fan-control@pepsimo"
HELPER=/usr/local/bin/t2fan-control
BACKUP=/etc/t2fand.conf.t2fan-control.bak

if [ "$EUID" -eq 0 ]; then
    echo "Run it WITHOUT sudo: ./uninstall.sh [--restore]"
    exit 1
fi

if [ -x "$HELPER" ]; then
    if [ "${1:-}" = "--restore" ]; then
        sudo "$HELPER" restore
    else
        sudo "$HELPER" off 2>/dev/null || true
        [ -e "$BACKUP" ] && \
            echo "A copy of your original configuration remains at $BACKUP (use --restore to bring it back)."
    fi
fi

sudo rm -f "$HELPER" /etc/sudoers.d/t2fan-control
rm -rf "$HOME/.local/share/cinnamon/applets/$UUID"
rm -f "$HOME"/.local/share/locale/*/LC_MESSAGES/"$UUID".mo
echo "Uninstalled. Remove the applet from the panel if it is still visible."
