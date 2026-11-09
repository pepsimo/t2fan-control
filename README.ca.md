# T2 Fan Control — applet de Cinnamon per als Mac Intel amb xip Apple T2

[English](README.md) · **Català**

Un petit applet per a l'escriptori **Cinnamon** (Linux Mint i altres) que controla el ventilador dels **Mac Intel amb el xip de seguretat Apple T2** amb Linux. Serveix de comandament senzill per a [`t2fanrd`](https://github.com/GnomedDev/t2fanrd), el servei de ventilador que fa servir el projecte [t2linux](https://wiki.t2linux.org/).

- **Un clic** canvia el ventilador entre **AUTO** (segons la temperatura) i **MAX** (sempre al màxim).
- **Clic dret** per triar com es comporta AUTO: **💨 Fort**, **⚖️ Mitjà** o **🔇 Silenciós**.
- **Temperatura de la CPU i RPM del ventilador en directe** a la barra, amb avís en vermell quan la CPU s'escalfa.
- En **català, castellà i anglès** (segueix l'idioma del sistema).

<!-- Captures: desa-les com a docs/panel.png i docs/menu.png i treu aquestes marques de comentari.
![Barra](docs/panel.png)
![Menú del clic dret](docs/menu.png)
-->

## Índex

- [Ordinadors compatibles](#ordinadors-compatibles)
- [Requisits](#requisits)
- [Instal·lació](#installació)
- [Ús](#ús)
- [Perfils AUTO](#perfils-auto)
- [Com funciona](#com-funciona)
- [Seguretat](#seguretat)
- [Línia d'ordres](#línia-dordres)
- [Desinstal·lació](#desinstallació)
- [Resolució de problemes](#resolució-de-problemes)
- [Traduccions](#traduccions)
- [Estructura del projecte](#estructura-del-projecte)
- [Autors](#autors)
- [Llicència](#llicència)

## Ordinadors compatibles

L'applet és per als **Mac Intel amb xip Apple T2** ([llista d'Apple](https://support.apple.com/en-us/103265)) amb Linux i el suport per a T2 de [t2linux](https://wiki.t2linux.org/):

| Mac | Identificador de model | Estat |
|---|---|---|
| Mac mini (2018) | `Macmini8,1` | ✅ Provat |
| MacBook Air (2018, 2019, 2020 Intel) | `MacBookAir8,1` `8,2` `9,1` | Hauria de funcionar (no provat) |
| MacBook Pro 13" (2018–2020 Intel) | `MacBookPro15,2` `15,4` `16,2` `16,3` | Hauria de funcionar (no provat) |
| MacBook Pro 15" (2018, 2019) | `MacBookPro15,1` `15,3` | Hauria de funcionar (no provat) |
| MacBook Pro 16" (2019) | `MacBookPro16,1` `16,4` | Hauria de funcionar (no provat) |
| iMac 27" (2020) | `iMac20,1` `20,2` | Hauria de funcionar (no provat) |
| iMac Pro (2017) | `iMacPro1,1` | Hauria de funcionar (no provat) |
| Mac Pro (2019) | `MacPro7,1` | Hauria de funcionar (no provat) |

Per saber quin model tens:

```bash
cat /sys/class/dmi/id/product_name
```

**No compatibles:** els Mac amb Apple Silicon (M1 i posteriors) i els Mac Intel *sense* xip T2 (fan servir altres eines, com `mbpfan`).

**Mac amb més d'un ventilador:** els perfils s'apliquen a tots els ventiladors (totes les seccions `[FanN]` de `/etc/t2fand.conf`), però la barra només mostra la velocitat del primer.

Si el proves en un altre model, [obre una incidència](https://github.com/pepsimo/t2fan-control/issues) per dir si funciona, i així s'actualitza la taula.

## Requisits

1. **Linux amb suport per a T2**, instal·lat seguint les [guies de t2linux](https://wiki.t2linux.org/).
2. **`t2fanrd` instal·lat i en marxa**: consulta la [guia del ventilador de t2linux](https://wiki.t2linux.org/guides/fan/). Comprova-ho amb:
   ```bash
   systemctl is-active t2fanrd     # ha de dir: active
   cat /etc/t2fand.conf            # ha d'existir
   ```
3. **Escriptori Cinnamon.** Provat amb Cinnamon 6.6 a Linux Mint.
4. Un usuari que pugui fer servir `sudo` (només cal durant la instal·lació).

Opcional: el paquet `gettext` (`sudo apt install gettext`). Si no hi és, l'instal·lador fa servir les traduccions precompilades que hi ha a `locale/`.

## Instal·lació

```bash
git clone https://github.com/pepsimo/t2fan-control.git
cd t2fan-control
./install.sh
```

Executa `install.sh` **amb el teu usuari normal, sense `sudo`**. Demana la contrasenya quan li cal, i:

1. elimina el prototip antic `t2fan-max`, si hi és;
2. instal·la l'script auxiliar a `/usr/local/bin/t2fan-control` (propietat de root);
3. afegeix una regla de sudoers que permet **només** cinc ordres exactes sense contrasenya (vegeu [Seguretat](#seguretat));
4. copia l'applet a `~/.local/share/cinnamon/applets/t2fan-control@pepsimo/`;
5. instal·la les traduccions a `~/.local/share/locale/`.

Després afegeix-lo a la barra: **clic dret a la barra → Applets → "Ventilador T2 (AUTO / MAX)" → +**.

**Actualitzar:** `git pull && ./install.sh`. Si l'applet ja és a la barra, es recarrega sol.

## Ús

**A la barra** hi veuràs alguna cosa com:

```
🌀 AUTO·M  52°C  2240 rpm
```

- `AUTO·F` / `AUTO·M` / `AUTO·S` = AUTO amb el perfil Fort / Mitjà / Silenciós. Si només hi diu `AUTO`, tens una configuració personalitzada pròpia.
- `MAX` (taronja) = ventilador sempre al màxim.
- Tota l'etiqueta es posa **en vermell** quan la CPU arriba a la temperatura d'avís (85 °C per defecte).
- Si hi passes el ratolí per sobre, mostra un resum: perfil, interval de temperatures, corba, i % i rang del ventilador.

**Clic esquerre:** canvia entre AUTO i MAX. El perfil AUTO es conserva.

**Clic dret:**

- Interruptor **Ventilador al màxim (MAX)**.
- **Perfil AUTO:** 💨 Fort, ⚖️ Mitjà, 🔇 Silenciós. En triar un perfil també es passa a AUTO.
- **Lectures en directe:** temperatura de la CPU i RPM del ventilador amb % i rang, que s'actualitzen mentre el menú és obert.
- **Quant a…** i **Configura…** (els afegeix Cinnamon).

A **Configura…** pots triar:

| Opció | Per defecte |
|---|---|
| Mostrar la temperatura de la CPU a la barra | activat |
| Mostrar les RPM del ventilador a la barra | activat |
| Posar en vermell a partir de | 85 °C |
| Mostrar la temperatura i les RPM al menú | activat |
| Actualitzar cada | 2 segons (1–10) |

## Perfils AUTO

`t2fanrd` manté el ventilador al mínim per sota de `low_temp` i al màxim per sobre de `high_temp`. Entre els dos valors segueix una corba:

| Perfil | `low_temp` | `high_temp` | `speed_curve` | Comportament |
|---|---|---|---|---|
| 💨 Fort | 40 °C | 60 °C | `logarithmic` | Accelera aviat i manté l'ordinador fresc |
| ⚖️ Mitjà | 50 °C | 75 °C | `linear` | Equilibrat; semblant al valor per defecte de `t2fanrd` (55/75 lineal) |
| 🔇 Silenciós | 60 °C | 85 °C | `exponential` | Gairebé sempre al mínim; només accelera amb càrrega alta |

Velocitat aproximada del ventilador en un Mac mini 2018 (rang de 1700 a 4400 rpm), calculada amb la mateixa fórmula que fa servir `t2fanrd`:

| CPU | 40° | 45° | 50° | 55° | 60° | 65° | 70° | 75° | 80° | 85° |
|---|---|---|---|---|---|---|---|---|---|---|
| Fort | 1700 | 3150 | 3775 | 4140 | 4400 | 4400 | 4400 | 4400 | 4400 | 4400 |
| Mitjà | 1700 | 1700 | 1700 | 2240 | 2780 | 3320 | 3860 | 4400 | 4400 | 4400 |
| Silenciós | 1700 | 1700 | 1700 | 1700 | 1700 | 1721 | 1872 | 2283 | 3082 | 4400 |

`t2fanrd` fa servir la temperatura més alta entre la del paquet de la CPU i la de la GPU (si hi ha sensor de GPU), feta la mitjana de les últimes 50 lectures. Això suavitza els pics: fins i tot amb el perfil Fort, el ventilador reacciona en pocs segons, no a l'instant.

## Com funciona

```
 Applet de la barra (el teu usuari)      Script auxiliar (root, via sudo)      t2fanrd
 ──────────────────────────────────      ────────────────────────────────      ───────
 clic esquerre/dret ── sudo -n ─────────▶ t2fan-control on|off|strong|… ──▶ edita /etc/t2fand.conf
                                                                            reinicia t2fanrd ──▶ ventilador
 llegeix /etc/t2fand.conf ◀── vigilància del fitxer (només quan canvia)
 llegeix /sys …/fan1_input i coretemp temp1_input cada N segons (sense root)
```

- L'applet **mai** s'executa com a root. Només llegeix fitxers públics: el de configuració i dos sensors de `/sys`.
- Per canviar el mode, crida l'script auxiliar amb `sudo -n` (sense demanar res). L'script només canvia les quatre claus que fa servir `t2fanrd` (`low_temp`, `high_temp`, `speed_curve`, `always_full_speed`), i reinicia el servei **només si realment ha canviat alguna cosa**.
- El primer cop que l'script canvia la configuració, en desa una còpia a `/etc/t2fand.conf.t2fan-control.bak`.
- **Consum:** cada actualització llegeix dos fitxers minúsculs de `/sys`. El mode no es consulta periòdicament: una vigilància del fitxer l'actualitza quan canvia `/etc/t2fand.conf`. Si desactives les lectures de la barra, els sensors només es llegeixen amb el menú obert.

## Seguretat

L'applet necessita permisos de root per canviar el ventilador, i està pensat perquè aquest poder sigui el mínim possible:

- **Regla de sudoers amb ordres exactes.** `/etc/sudoers.d/t2fan-control` permet al teu usuari executar sense contrasenya **només** aquestes cinc ordres:
  ```
  /usr/local/bin/t2fan-control on
  /usr/local/bin/t2fan-control off
  /usr/local/bin/t2fan-control strong
  /usr/local/bin/t2fan-control medium
  /usr/local/bin/t2fan-control quiet
  ```
  Qualsevol altre argument demana contrasenya, com qualsevol altra ordre amb `sudo`. La regla es valida amb `visudo -c` abans d'instal·lar-la.
- **Script propietat de root.** `/usr/local/bin/t2fan-control` és de root amb permisos `755`, així que el teu usuari no el pot modificar.
- **Cap dada de l'usuari arriba a root.** L'script només accepta paraules fixes, mai números ni text lliure. Els valors de temperatura són escrits dins del mateix script.
- **Escriptura segura.** Fixa el `PATH`, edita una còpia temporal, comprova que hi hagi les claus necessàries, fa servir un bloqueig contra clics simultanis i substitueix el fitxer d'un sol cop.
- **Sense xarxa, sense telemetria, sense recollir dades.** No surt res de l'ordinador.
- **Res personal al codi.** El teu nom d'usuari només s'escriu a la regla de sudoers local en instal·lar.

Has trobat un problema de seguretat? Consulta [SECURITY.md](SECURITY.md).

## Línia d'ordres

També pots fer servir l'script auxiliar directament:

```bash
t2fan-control status          # p. ex. "auto medium 50 75 linear"
t2fan-control paths           # fitxers de sensors que fa servir l'applet
t2fan-control version
sudo t2fan-control quiet      # on | off | strong | medium | quiet
sudo t2fan-control restore    # recupera el /etc/t2fand.conf original
```

## Desinstal·lació

```bash
./uninstall.sh              # ho elimina tot i deixa el ventilador en AUTO
./uninstall.sh --restore    # a més, recupera el /etc/t2fand.conf que tenies abans
```

No es toca `t2fanrd`. Treu l'applet de la barra si encara es veu.

## Resolució de problemes

| Símptoma | Què cal revisar |
|---|---|
| La barra mostra `🌀 no instal·lat` | Torna a executar `./install.sh`. |
| La barra mostra `🌀 ?` | Falta `/etc/t2fand.conf` o no es pot llegir: revisa `t2fanrd` (`systemctl status t2fanrd`). |
| Avís "No s'ha pogut canviar el mode del ventilador" | `sudo -n /usr/local/bin/t2fan-control off` ha de funcionar sense contrasenya. Torna a executar `./install.sh`. |
| No surten la temperatura ni les RPM | Executa `t2fan-control paths`. Totes dues línies han de tenir una ruta. Si `fan=` surt buit després d'actualitzar el kernel, actualitza l'applet: `git pull && ./install.sh` (2.1.1 o posterior). |
| Errors de l'applet | `grep -i t2fan ~/.xsession-errors`, o obre Looking Glass (`Alt+F2`, escriu `lg`) → Log. |

## Traduccions

Les traduccions són a `applet/t2fan-control@pepsimo/po/`. Per afegir un idioma:

```bash
cp applet/t2fan-control@pepsimo/po/t2fan-control@pepsimo.pot applet/t2fan-control@pepsimo/po/fr.po
# tradueix fr.po (per exemple amb Poedit) i després:
tools/update-translations.sh
./install.sh
```

Si canvies algun text del codi, executa `tools/update-translations.sh`. Regenera la plantilla, actualitza els `.po` i torna a compilar els `.mo` precompilats. Les contribucions amb idiomes nous són benvingudes.

## Estructura del projecte

```
t2fan-control/
├── applet/t2fan-control@pepsimo/
│   ├── applet.js              # l'applet de Cinnamon
│   ├── metadata.json          # nom, descripció, versió (finestra Quant a)
│   ├── settings-schema.json   # opcions de la finestra Configura…
│   ├── icon.png
│   └── po/                    # traduccions (plantilla .pot, ca.po, es.po)
├── helper/t2fan-control       # script auxiliar (root)
├── locale/                    # traduccions precompilades (.mo)
├── tools/                     # scripts per mantenir les traduccions
├── install.sh
├── uninstall.sh
├── CHANGELOG.md
├── SECURITY.md
└── LICENSE
```

## Autors

- **pepsimo**: idea, disseny, proves en maquinari real i manteniment. Web: [www.pepsimo.es](https://www.pepsimo.es) · GitHub: [@pepsimo](https://github.com/pepsimo)
- **Claude Opus 5.5** (Anthropic): coautor del codi, les traduccions i la documentació.

## Llicència

[GPL-3.0-or-later](LICENSE). Aquest programa es distribueix **sense cap garantia**: el fas servir sota la teva responsabilitat. Si el ventilador va a poca velocitat amb càrrega alta, l'ordinador s'escalfa més. El perfil Silenciós igualment arriba a la velocitat màxima a 85 °C.

**Crèdits:** [`t2fanrd`](https://github.com/GnomedDev/t2fanrd), de GnomedDev, i la comunitat [t2linux](https://wiki.t2linux.org/), que fan possible Linux als Mac amb T2.

*Sense cap relació amb Apple Inc. Apple, Mac, Mac mini, MacBook i iMac són marques comercials d'Apple Inc.*
