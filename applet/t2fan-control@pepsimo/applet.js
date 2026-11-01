// T2 Fan Control — Cinnamon applet
// Controls the fan of Intel Macs with the Apple T2 chip through t2fanrd.
//
//  · Left click:  toggle AUTO <-> MAX.
//  · Right click: MAX switch, AUTO profile (Strong / Medium / Quiet),
//                 live CPU temperature and fan RPM, About… and Configure…
//  · Panel:       mode + CPU temperature + fan RPM (configurable).
//
// Cost: each refresh reads two tiny /sys files. The mode is refreshed only
// when /etc/t2fand.conf changes (file monitor, no polling).
//
// https://github.com/pepsimo/t2fan-control
// SPDX-License-Identifier: GPL-3.0-or-later

const Applet = imports.ui.applet;
const PopupMenu = imports.ui.popupMenu;
const Settings = imports.ui.settings;
const Main = imports.ui.main;
const Util = imports.misc.util;
const Gettext = imports.gettext;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;

const UUID = "t2fan-control@pepsimo";
const HELPER = "/usr/local/bin/t2fan-control";
const SUDO = "/usr/bin/sudo";
const CONF = "/etc/t2fand.conf";

// Cinnamon binds the applet's text domain only after the constructor runs,
// so we bind it ourselves to have translated strings from the start.
Gettext.bindtextdomain(UUID, GLib.get_home_dir() + "/.local/share/locale");

function _(str) {
    return Gettext.dgettext(UUID, str);
}

// "{a} and {b}" + {a: 1, b: 2} -> "1 and 2"
function fmt(template, values) {
    return template.replace(/\{(\w+)\}/g, (m, k) => (k in values ? String(values[k]) : m));
}

// The real values of each profile live in the helper script (single source of truth).
const PROFILES = [
    { id: "strong", icon: "💨", name: () => _("Strong"), tag: () => _("S|Strong").split("|")[0],
      info: () => _("40–60 °C · logarithmic curve") },
    { id: "medium", icon: "⚖️", name: () => _("Medium"), tag: () => _("M|Medium").split("|")[0],
      info: () => _("50–75 °C · linear curve") },
    { id: "quiet",  icon: "🔇", name: () => _("Quiet"),  tag: () => _("Q|Quiet").split("|")[0],
      info: () => _("60–85 °C · exponential curve") },
];

function curveName(c) {
    switch (c) {
        case "linear":      return _("linear");
        case "exponential": return _("exponential");
        case "logarithmic": return _("logarithmic");
        default:            return c;
    }
}

const decoder = new TextDecoder();

function readText(path) {
    if (!path) return null;
    try {
        let [ok, data] = GLib.file_get_contents(path);
        return ok ? decoder.decode(data).trim() : null;
    } catch (e) {
        return null;
    }
}

function readInt(path) {
    let t = readText(path);
    if (t === null) return null;
    let n = parseInt(t, 10);
    return isNaN(n) ? null : n;
}

// Runs a program without a shell and without blocking the panel.
// If it cannot be started (e.g. not installed), code = -1.
function spawn(argv, callback) {
    try {
        Util.spawnCommandLineAsyncIO("", callback, { argv: argv });
    } catch (e) {
        callback("", String(e), -1);
    }
}

class T2FanApplet extends Applet.TextApplet {
    constructor(metadata, orientation, panelHeight, instanceId) {
        super(orientation, panelHeight, instanceId);

        this._state = null;         // { mode, profile, low, high, curve }
        this._helperOk = true;
        this._busy = false;
        this._temp = null;
        this._rpm = null;
        this._paths = { fan: null, temp: null, fanMin: null, fanMax: null };
        this._timerId = 0;
        this._debounceId = 0;
        this._menuOpen = false;

        this.settings = new Settings.AppletSettings(this, metadata.uuid, instanceId);
        const changed = () => this._onSettingsChanged();
        this.settings.bind("show-temp", "showTemp", changed);
        this.settings.bind("show-rpm", "showRpm", changed);
        this.settings.bind("show-menu-readings", "showMenuReadings", changed);
        this.settings.bind("refresh-interval", "refreshInterval", changed);
        this.settings.bind("temp-warning", "tempWarning", changed);

        this._buildMenu();
        this._watchConfig();
        this._findSensors();
        this._refreshStatus();
        this._restartTimer();
    }

    // ---------- Right-click menu ----------

    _buildMenu() {
        const menu = this._applet_context_menu;

        this._maxItem = new PopupMenu.PopupSwitchMenuItem(_("Fan at full speed (MAX)"), false);
        this._maxItem.connect("toggled", (item, state) => this._run(state ? "on" : "off"));
        menu.addMenuItem(this._maxItem);

        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        menu.addMenuItem(new PopupMenu.PopupMenuItem(_("AUTO profile"), { reactive: false }));

        this._profileItems = {};
        for (let p of PROFILES) {
            let item = new PopupMenu.PopupMenuItem(`${p.icon} ${p.name()}   (${p.info()})`);
            item.setOrnament(PopupMenu.OrnamentType.DOT, false);
            item.connect("activate", () => this._run(p.id));
            menu.addMenuItem(item);
            this._profileItems[p.id] = item;
        }

        this._readSep = new PopupMenu.PopupSeparatorMenuItem();
        this._tempItem = new PopupMenu.PopupMenuItem("", { reactive: false });
        this._rpmItem = new PopupMenu.PopupMenuItem("", { reactive: false });
        menu.addMenuItem(this._readSep);
        menu.addMenuItem(this._tempItem);
        menu.addMenuItem(this._rpmItem);
        // Cinnamon appends About…, Configure… and Remove below these items.

        menu.connect("open-state-changed", (m, open) => {
            this._menuOpen = open;
            if (open) {
                this._readSensors();
                this._refreshStatus();
            }
            this._restartTimer();
        });
    }

    _updateMenu() {
        const s = this._state;
        this._maxItem.setToggleState(!!s && s.mode === "max");
        for (let p of PROFILES)
            this._profileItems[p.id].setOrnament(PopupMenu.OrnamentType.DOT, !!s && s.profile === p.id);

        const show = this.showMenuReadings;
        for (let it of [this._readSep, this._tempItem, this._rpmItem])
            show ? it.actor.show() : it.actor.hide();

        let temp = this._temp !== null ? `${this._temp} °C` : _("no reading");
        this._tempItem.setLabel("🌡  " + fmt(_("CPU: {value}"), { value: temp }));
        this._rpmItem.setLabel("🌀  " + fmt(_("Fan: {value}"), { value: this._rpmText(true) }));
    }

    _rpmText(long) {
        if (this._rpm === null) return _("no reading");
        let txt = `${this._rpm} rpm`;
        const { fanMin, fanMax } = this._paths;
        if (long && fanMin !== null && fanMax !== null && fanMax > fanMin) {
            let pct = Math.round(100 * (this._rpm - fanMin) / (fanMax - fanMin));
            pct = Math.max(0, Math.min(100, pct));
            txt += "  " + fmt(_("({pct} %, range {min}–{max})"), { pct: pct, min: fanMin, max: fanMax });
        }
        return txt;
    }

    // ---------- Actions ----------

    on_applet_clicked() {
        if (!this._state) {
            this._refreshStatus();
            return;
        }
        this._run(this._state.mode === "max" ? "off" : "on");
    }

    _run(action) {
        if (this._busy) return;
        this._busy = true;
        this.set_applet_label("🌀 …");
        spawn([SUDO, "-n", HELPER, action], (stdout, stderr, code) => {
            this._busy = false;
            if (code !== 0) {
                let why = (stderr || "").trim() || _("Check the installation (install.sh).");
                Main.notify(_("T2 Fan"), _("Could not change the fan mode.") + "\n" + why);
            }
            this._refreshStatus();
        });
    }

    // ---------- State (mode and profile) ----------

    _refreshStatus() {
        spawn([HELPER, "status"], (stdout, stderr, code) => {
            let parts = (stdout || "").trim().split(/\s+/);
            if (code === 0 && parts.length >= 5) {
                this._helperOk = true;
                this._state = {
                    mode: parts[0], profile: parts[1],
                    low: parts[2], high: parts[3], curve: parts[4],
                };
            } else {
                this._helperOk = (code !== -1);
                this._state = null;
            }
            this._updateAll();
        });
    }

    _watchConfig() {
        try {
            this._monitor = Gio.File.new_for_path(CONF).monitor_file(Gio.FileMonitorFlags.NONE, null);
            this._monitor.connect("changed", () => {
                // Collapse the burst of events produced by a single change.
                if (this._debounceId) GLib.source_remove(this._debounceId);
                this._debounceId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 400, () => {
                    this._debounceId = 0;
                    this._refreshStatus();
                    return GLib.SOURCE_REMOVE;
                });
            });
        } catch (e) {
            global.logError(`${UUID}: cannot watch ${CONF}: ${e}`);
        }
    }

    // ---------- Sensors ----------

    _findSensors() {
        spawn([HELPER, "paths"], (stdout, stderr, code) => {
            for (let line of (stdout || "").split("\n")) {
                let m = line.match(/^(fan|temp)=(\/sys\/\S+)$/);
                if (m) this._paths[m[1]] = m[2];
            }
            if (this._paths.fan) {
                this._paths.fanMin = readInt(this._paths.fan.replace(/_input$/, "_min"));
                this._paths.fanMax = readInt(this._paths.fan.replace(/_input$/, "_max"));
            }
            this._readSensors();
            this._updateAll();
        });
    }

    _readSensors() {
        let t = readInt(this._paths.temp);
        this._temp = (t === null) ? null : Math.round(t / 1000);
        this._rpm = readInt(this._paths.fan);
    }

    _needTimer() {
        return this.showTemp || this.showRpm || (this._menuOpen && this.showMenuReadings);
    }

    _restartTimer() {
        if (this._timerId) {
            GLib.source_remove(this._timerId);
            this._timerId = 0;
        }
        if (!this._needTimer()) return;
        let secs = Math.max(1, Math.min(10, this.refreshInterval | 0));
        this._timerId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, secs, () => {
            this._readSensors();
            this._updateAll();
            return GLib.SOURCE_CONTINUE;
        });
    }

    _onSettingsChanged() {
        this._restartTimer();
        this._readSensors();
        this._updateAll();
    }

    // ---------- Panel ----------

    _updateAll() {
        if (this._busy) return;
        const s = this._state;

        let mode;
        if (!s) mode = this._helperOk ? "?" : _("not installed");
        else if (s.mode === "max") mode = "MAX";
        else {
            let p = PROFILES.find(x => x.id === s.profile);
            mode = p ? `AUTO·${p.tag()}` : "AUTO";
        }

        let parts = [`🌀 ${mode}`];
        if (this.showTemp && this._temp !== null) parts.push(`${this._temp}°C`);
        if (this.showRpm && this._rpm !== null) parts.push(`${this._rpm} rpm`);
        this.set_applet_label(parts.join("  "));

        let hot = this._temp !== null && this._temp >= this.tempWarning;
        let style = "";
        if (hot) style = "color: #ff4040; font-weight: bold;";
        else if (s && s.mode === "max") style = "color: #ff8c00; font-weight: bold;";
        if (this.actor) this.actor.set_style(style);

        this.set_applet_tooltip(this._tooltip(hot));
        this._updateMenu();
    }

    _tooltip(hot) {
        const s = this._state;
        let lines = [];
        if (!s) {
            lines.push(this._helperOk
                ? _("Cannot read the t2fanrd status.")
                : _("Helper script missing: run install.sh."));
        } else if (s.mode === "max") {
            lines.push(_("Fan at FULL speed."));
        } else {
            let p = PROFILES.find(x => x.id === s.profile);
            let v = { profile: p ? p.name() : "", low: s.low, high: s.high, curve: curveName(s.curve) };
            lines.push(p ? fmt(_("AUTO · {profile} profile ({low}–{high} °C, {curve})"), v)
                         : fmt(_("AUTO · custom ({low}–{high} °C, {curve})"), v));
        }
        if (this._temp !== null || this._rpm !== null) {
            let temp = this._temp !== null ? `${this._temp} °C` : "?";
            lines.push(`CPU ${temp} · ${this._rpmText(true)}`);
        }
        if (hot) lines.push("⚠ " + fmt(_("Temperature above {temp} °C"), { temp: this.tempWarning }));
        lines.push(_("Click: AUTO ↔ MAX · Right-click: profiles and options"));
        return lines.join("\n");
    }

    on_applet_removed_from_panel() {
        if (this._timerId) GLib.source_remove(this._timerId);
        if (this._debounceId) GLib.source_remove(this._debounceId);
        this._timerId = this._debounceId = 0;
        if (this._monitor) {
            this._monitor.cancel();
            this._monitor = null;
        }
        this.settings.finalize();
    }
}

function main(metadata, orientation, panelHeight, instanceId) {
    return new T2FanApplet(metadata, orientation, panelHeight, instanceId);
}
