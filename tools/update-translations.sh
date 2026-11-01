#!/bin/bash
# Regenerates the translation template, merges it into every .po file and
# rebuilds the precompiled .mo files in locale/ (used by install.sh when the
# gettext tools are not installed).
#
# Requires: python3 and gettext (sudo apt install gettext)
# Usage:    tools/update-translations.sh   (from anywhere)
#
# SPDX-License-Identifier: GPL-3.0-or-later
set -euo pipefail

UUID="t2fan-control@pepsimo"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PO_DIR="$ROOT/applet/$UUID/po"

python3 "$ROOT/tools/make-pot.py"

for po in "$PO_DIR"/*.po; do
    lang="$(basename "$po" .po)"
    msgmerge --quiet --update --backup=none --no-fuzzy-matching "$po" "$PO_DIR/$UUID.pot"
    mkdir -p "$ROOT/locale/$lang/LC_MESSAGES"
    msgfmt --check --statistics -o "$ROOT/locale/$lang/LC_MESSAGES/$UUID.mo" "$po"
done
