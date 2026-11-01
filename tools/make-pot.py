#!/usr/bin/env python3
"""Extract translatable strings from the applet into po/<uuid>.pot.

Sources:
  * applet.js            -> every _("...") call
  * metadata.json        -> name, description, comments
  * settings-schema.json -> description, tooltip, units

Usage: python3 tools/make-pot.py   (from the repository root)
SPDX-License-Identifier: GPL-3.0-or-later
"""
import json
import re
from pathlib import Path

UUID = "t2fan-control@pepsimo"
ROOT = Path(__file__).resolve().parent.parent
APPLET = ROOT / "applet" / UUID
POT = APPLET / "po" / f"{UUID}.pot"

# Notes shown to translators for tricky strings.
NOTES = {
    "S|Strong": "Panel tag for the Strong profile: translate only the letter before '|'.",
    "M|Medium": "Panel tag for the Medium profile: translate only the letter before '|'.",
    "Q|Quiet": "Panel tag for the Quiet profile: translate only the letter before '|'.",
}


def po_escape(s: str) -> str:
    return s.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")


def collect():
    entries = {}  # msgid -> list of references

    def add(msgid, ref):
        if msgid:
            entries.setdefault(msgid, []).append(ref)

    js = (APPLET / "applet.js").read_text(encoding="utf-8")
    for lineno, line in enumerate(js.splitlines(), 1):
        for m in re.finditer(r'(?<![\w.])_\("((?:[^"\\]|\\.)*)"\)', line):
            add(m.group(1).encode().decode("unicode_escape").encode("latin-1").decode("utf-8"),
                f"applet.js:{lineno}")

    meta = json.loads((APPLET / "metadata.json").read_text(encoding="utf-8"))
    for key in ("name", "description", "comments"):
        add(meta.get(key), f"metadata.json->{key}")

    schema = json.loads((APPLET / "settings-schema.json").read_text(encoding="utf-8"))
    for name, item in schema.items():
        for key in ("description", "tooltip", "units"):
            add(item.get(key), f"settings-schema.json->{name}->{key}")
    return entries


def main():
    entries = collect()
    out = [
        "# Translation template for the T2 Fan (AUTO / MAX) Cinnamon applet.",
        "# This file is distributed under the same license as the project (GPL-3.0-or-later).",
        "#",
        "#, fuzzy",
        'msgid ""',
        'msgstr ""',
        '"Project-Id-Version: t2fan-control\\n"',
        '"Report-Msgid-Bugs-To: https://github.com/pepsimo/t2fan-control/issues\\n"',
        '"MIME-Version: 1.0\\n"',
        '"Content-Type: text/plain; charset=UTF-8\\n"',
        '"Content-Transfer-Encoding: 8bit\\n"',
        "",
    ]
    for msgid, refs in entries.items():
        if msgid in NOTES:
            out.append(f"#. {NOTES[msgid]}")
        out.append("#: " + " ".join(refs))
        out.append(f'msgid "{po_escape(msgid)}"')
        out.append('msgstr ""')
        out.append("")
    POT.parent.mkdir(parents=True, exist_ok=True)
    POT.write_text("\n".join(out), encoding="utf-8")
    print(f"{POT.relative_to(ROOT)}: {len(entries)} strings")


if __name__ == "__main__":
    main()
