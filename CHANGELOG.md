# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [2.1.0] — 2026-11-01

### Added
- Translations: English (base), Catalan and Spanish, following the system language.
- `t2fan-control version` command.
- Documentation in English and Catalan, `SECURITY.md`, GPL-3.0 license.
- `tools/` scripts to maintain translations and precompiled `.mo` files.

### Changed
- Scripts renamed to `install.sh` and `uninstall.sh` (`--restore` option), with English messages.
- The installer now replaces the applet folder cleanly and installs translations.

## [2.0.0] — 2026-11-01

### Added
- AUTO profiles: Strong (40–60 °C, logarithmic), Medium (50–75 °C, linear) and Quiet (60–85 °C, exponential).
- Right-click menu with a MAX switch, profile selection and live readings.
- Live CPU temperature and fan RPM in the panel, with a configurable red warning.
- Configure… window: show or hide readings, refresh interval, warning temperature.
- About… window with description, profiles, requirements and icon.
- Backup of the original `/etc/t2fand.conf` and a `restore` command.

### Security
- The sudoers rule now allows only five exact commands (`on`, `off`, `strong`, `medium`, `quiet`).
- The helper edits a temporary copy, uses a lock and restarts `t2fanrd` only when something changes.

## [1.0.0]

- First prototype (`t2fan-max`): one-click AUTO / MAX toggle for the Mac mini 2018.
