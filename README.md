# T2 Fan Control — Cinnamon applet for Intel Macs with the Apple T2 chip

**English** · [Català](README.ca.md)

A small applet for the **Cinnamon** desktop (Linux Mint and others) that controls the fan of **Intel Macs with the Apple T2 security chip** running Linux. It is a friendly front end for [`t2fanrd`](https://github.com/GnomedDev/t2fanrd), the fan daemon used by the [t2linux](https://wiki.t2linux.org/) project.

- **One click** toggles the fan between **AUTO** (temperature-driven) and **MAX** (always at full speed).
- **Right click** lets you choose how AUTO behaves: **💨 Strong**, **⚖️ Medium** or **🔇 Quiet**.
- **Live CPU temperature and fan RPM** in the panel, plus a red warning when the CPU gets hot.
- Available in **English, Catalan and Spanish** (follows the system language).

<!-- Screenshots: save them as docs/panel.png and docs/menu.png, then remove these comment marks.
![Panel](docs/panel.png)
![Right-click menu](docs/menu.png)
-->

## Table of contents

- [Supported computers](#supported-computers)
- [Requirements](#requirements)
- [Installation](#installation)
- [Usage](#usage)
- [AUTO profiles](#auto-profiles)
- [How it works](#how-it-works)
- [Security](#security)
- [Command line](#command-line)
- [Uninstalling](#uninstalling)
- [Troubleshooting](#troubleshooting)
- [Translations](#translations)
- [Project layout](#project-layout)
- [Authors](#authors)
- [License](#license)

## Supported computers

This applet is for **Intel Macs with the Apple T2 chip** ([Apple's list](https://support.apple.com/en-us/103265)) running Linux with T2 support from [t2linux](https://wiki.t2linux.org/):

| Mac | Model identifier | Status |
|---|---|---|
| Mac mini (2018) | `Macmini8,1` | ✅ Tested |
| MacBook Air (2018, 2019, 2020 Intel) | `MacBookAir8,1` `8,2` `9,1` | Should work (untested) |
| MacBook Pro 13" (2018–2020 Intel) | `MacBookPro15,2` `15,4` `16,2` `16,3` | Should work (untested) |
| MacBook Pro 15" (2018, 2019) | `MacBookPro15,1` `15,3` | Should work (untested) |
| MacBook Pro 16" (2019) | `MacBookPro16,1` `16,4` | Should work (untested) |
| iMac 27" (2020) | `iMac20,1` `20,2` | Should work (untested) |
| iMac Pro (2017) | `iMacPro1,1` | Should work (untested) |
| Mac Pro (2019) | `MacPro7,1` | Should work (untested) |

Check your model with:

```bash
cat /sys/class/dmi/id/product_name
```

**Not supported:** Apple Silicon Macs (M1 and later) and Intel Macs *without* a T2 chip (those use other tools such as `mbpfan`).

**Macs with more than one fan:** the profiles are applied to every fan (all `[FanN]` sections of `/etc/t2fand.conf`), but the panel shows the speed of the first fan only.

If you try it on another model, please [open an issue](https://github.com/pepsimo/t2fan-control/issues) saying whether it works, so the table can be updated.

## Requirements

1. **Linux with T2 support** installed following the [t2linux guides](https://wiki.t2linux.org/).
2. **`t2fanrd` installed and running** — see the [t2linux fan guide](https://wiki.t2linux.org/guides/fan/). Check it with:
   ```bash
   systemctl is-active t2fanrd     # must print: active
   cat /etc/t2fand.conf            # must exist
   ```
3. **Cinnamon desktop.** Tested with Cinnamon 6.6 on Linux Mint.
4. A user account that can use `sudo` (only needed during installation).

Optional: the `gettext` package (`sudo apt install gettext`). Without it, the installer uses the precompiled translations included in `locale/`.

## Installation

```bash
git clone https://github.com/pepsimo/t2fan-control.git
cd t2fan-control
./install.sh
```

Run `install.sh` **as your normal user, without `sudo`**. It asks for your password when it needs it, and it:

1. removes the old `t2fan-max` prototype, if present;
2. installs the helper script to `/usr/local/bin/t2fan-control` (owned by root);
3. adds a sudoers rule that allows **only** five exact commands without a password (see [Security](#security));
4. copies the applet to `~/.local/share/cinnamon/applets/t2fan-control@pepsimo/`;
5. installs the translations to `~/.local/share/locale/`.

Then add it to the panel: **right-click the panel → Applets → "T2 Fan (AUTO / MAX)" → +**.

**Updating:** `git pull && ./install.sh`. The applet reloads by itself if it is already on the panel.

## Usage

**In the panel** you will see something like:

```
🌀 AUTO·M  52°C  2240 rpm
```

- `AUTO·S` / `AUTO·M` / `AUTO·Q` = AUTO with the Strong / Medium / Quiet profile (letters follow the language: `F/M/S` in Catalan and Spanish). Plain `AUTO` means a custom configuration of your own.
- `MAX` (orange) = fan always at full speed.
- The whole label turns **red** when the CPU reaches the warning temperature (85 °C by default).
- Hover over it for a summary (profile, temperature range, curve, fan % and range).

**Left click:** toggle AUTO ↔ MAX. Your AUTO profile is kept.

**Right click:**

- **Fan at full speed (MAX)** switch.
- **AUTO profile:** 💨 Strong, ⚖️ Medium, 🔇 Quiet. Choosing a profile also switches to AUTO.
- **Live readings:** CPU temperature and fan RPM with % and range, refreshed while the menu is open.
- **About…** and **Configure…** (added by Cinnamon).

**Configure…** lets you choose:

| Option | Default |
|---|---|
| Show the CPU temperature in the panel | on |
| Show the fan RPM in the panel | on |
| Turn red from | 85 °C |
| Show temperature and RPM in the menu | on |
| Refresh every | 2 seconds (1–10) |

## AUTO profiles

`t2fanrd` keeps the fan at its minimum below `low_temp`, at its maximum above `high_temp`, and follows a curve in between:

| Profile | `low_temp` | `high_temp` | `speed_curve` | Behaviour |
|---|---|---|---|---|
| 💨 Strong | 40 °C | 60 °C | `logarithmic` | Speeds up early and keeps the machine cool |
| ⚖️ Medium | 50 °C | 75 °C | `linear` | Balanced; close to the `t2fanrd` default (55/75 linear) |
| 🔇 Quiet | 60 °C | 85 °C | `exponential` | Stays at minimum most of the time; ramps up only under heavy load |

Approximate fan speed on a Mac mini 2018 (fan range 1700–4400 rpm), computed with the same formula `t2fanrd` uses:

| CPU | 40° | 45° | 50° | 55° | 60° | 65° | 70° | 75° | 80° | 85° |
|---|---|---|---|---|---|---|---|---|---|---|
| Strong | 1700 | 3150 | 3775 | 4140 | 4400 | 4400 | 4400 | 4400 | 4400 | 4400 |
| Medium | 1700 | 1700 | 1700 | 2240 | 2780 | 3320 | 3860 | 4400 | 4400 | 4400 |
| Quiet | 1700 | 1700 | 1700 | 1700 | 1700 | 1721 | 1872 | 2283 | 3082 | 4400 |

`t2fanrd` uses the hottest of the CPU package temperature and the GPU temperature (when there is a GPU sensor), averaged over its last 50 readings. That smooths out spikes, so even the Strong profile reacts within a few seconds rather than instantly.

## How it works

```
 Panel applet (your user)                Helper script (root, via sudo)        t2fanrd
 ────────────────────────                ──────────────────────────────        ───────
 left/right click  ── sudo -n ──────────▶ t2fan-control on|off|strong|…  ──▶ edits /etc/t2fand.conf
                                                                            restarts t2fanrd ──▶ fan
 reads /etc/t2fand.conf  ◀── file monitor (only when it changes)
 reads /sys …/fan1_input and coretemp temp1_input every N seconds (no root needed)
```

- The applet **never** runs as root. It only reads public files: the config file and two sensor files in `/sys`.
- To change the mode, it calls the helper script through `sudo -n` (non-interactive). The helper changes only the four keys `t2fanrd` uses (`low_temp`, `high_temp`, `speed_curve`, `always_full_speed`), and restarts the service **only if something actually changed**.
- The first time the helper changes your configuration, it saves a backup in `/etc/t2fand.conf.t2fan-control.bak`.
- **Resource usage:** every refresh reads two tiny `/sys` files. The mode is not polled: a file monitor updates it when `/etc/t2fand.conf` changes. If you turn off the panel readings, sensors are only read while the menu is open.

## Security

The applet needs root to change the fan, so it was designed to keep that power as small as possible:

- **Exact-command sudoers rule.** `/etc/sudoers.d/t2fan-control` allows your user to run, without a password, **only** these five commands:
  ```
  /usr/local/bin/t2fan-control on
  /usr/local/bin/t2fan-control off
  /usr/local/bin/t2fan-control strong
  /usr/local/bin/t2fan-control medium
  /usr/local/bin/t2fan-control quiet
  ```
  Any other argument asks for a password, like any other `sudo` command. The rule is validated with `visudo -c` before it is installed.
- **Root-owned helper.** `/usr/local/bin/t2fan-control` is owned by root with mode `755`, so your user cannot modify it.
- **No user input reaches root.** The helper accepts only fixed words, never numbers or free text. The temperature values are written in the script itself.
- **Safe writes.** It sets a fixed `PATH`, edits a temporary copy, checks that the required keys exist, uses a lock against concurrent clicks, and replaces the file in one step.
- **No network, no telemetry, no data collected.** Nothing leaves your computer.
- **Nothing personal in the code.** Your user name is written only into your local sudoers rule at install time.

Found a security problem? See [SECURITY.md](SECURITY.md).

## Command line

The helper script can also be used directly:

```bash
t2fan-control status          # e.g. "auto medium 50 75 linear"
t2fan-control paths           # sensor files used by the applet
t2fan-control version
sudo t2fan-control quiet      # on | off | strong | medium | quiet
sudo t2fan-control restore    # bring back the original /etc/t2fand.conf
```

## Uninstalling

```bash
./uninstall.sh              # removes everything and leaves the fan in AUTO
./uninstall.sh --restore    # also restores the /etc/t2fand.conf you had before
```

`t2fanrd` itself is not touched. Remove the applet from the panel if it is still visible.

## Troubleshooting

| Symptom | What to check |
|---|---|
| Panel shows `🌀 not installed` | Run `./install.sh` again. |
| Panel shows `🌀 ?` | `/etc/t2fand.conf` is missing or unreadable: check `t2fanrd` (`systemctl status t2fanrd`). |
| "Could not change the fan mode" notification | `sudo -n /usr/local/bin/t2fan-control off` must work without a password. Run `./install.sh` again. |
| No temperature or RPM | Run `t2fan-control paths`. Both lines must contain a path. If `fan=` is empty after a kernel update, update the applet: `git pull && ./install.sh` (2.1.1 or later). |
| Applet errors | `grep -i t2fan ~/.xsession-errors`, or open Looking Glass (`Alt+F2`, type `lg`) → Log. |

## Translations

Translations live in `applet/t2fan-control@pepsimo/po/`. To add a language:

```bash
cp applet/t2fan-control@pepsimo/po/t2fan-control@pepsimo.pot applet/t2fan-control@pepsimo/po/fr.po
# translate fr.po (e.g. with Poedit), then:
tools/update-translations.sh
./install.sh
```

After changing any text in the code, run `tools/update-translations.sh`. It regenerates the template, merges the `.po` files and rebuilds the precompiled `.mo` files. Pull requests with new languages are welcome.

## Project layout

```
t2fan-control/
├── applet/t2fan-control@pepsimo/
│   ├── applet.js              # the Cinnamon applet
│   ├── metadata.json          # name, description, version (About dialog)
│   ├── settings-schema.json   # options of the Configure… window
│   ├── icon.png
│   └── po/                    # translations (.pot template, ca.po, es.po)
├── helper/t2fan-control       # root helper script
├── locale/                    # precompiled translations (.mo)
├── tools/                     # translation maintenance scripts
├── install.sh
├── uninstall.sh
├── CHANGELOG.md
├── SECURITY.md
└── LICENSE
```

## Authors

- **pepsimo**: idea, design, testing on real hardware and maintenance. Web: [www.pepsimo.es](https://www.pepsimo.es) · GitHub: [@pepsimo](https://github.com/pepsimo)
- **Claude Opus 5.5** (Anthropic): co-author of the code, translations and documentation.

## License

[GPL-3.0-or-later](LICENSE). This program comes with **no warranty**: you use it at your own risk. Running the fan at a low speed under heavy load makes the computer run hotter. The Quiet profile still reaches full speed at 85 °C.

**Credits:** [`t2fanrd`](https://github.com/GnomedDev/t2fanrd) by GnomedDev and the [t2linux](https://wiki.t2linux.org/) community, who make Linux on T2 Macs possible.

*Not affiliated with Apple Inc. Apple, Mac, Mac mini, MacBook and iMac are trademarks of Apple Inc.*
