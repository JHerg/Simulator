# Köln-Fahrsimulator 2 — Unreal Engine 5 Konzept

> **Arbeitstitel:** *Cologne Drive* (UE5-Neuauflage)
> **Status:** Konzept / Vorproduktion
> **Bezug:** Neuentwicklung als eigenständiges, zweites Spiel auf Basis des
> bestehenden Browser-Simulators (`index.html`, Three.js r158).
> Gleiche Strecke, gleiche Story, gleiche Minispiele — fotorealistisch in UE5.

Dieses Dokument ist das **Gesamtkonzept**. Die technische Asset-Pipeline
(Ordnerstruktur, Namenskonventionen, Import-Workflows, Formate, LODs) ist
detailliert in [`ASSET_PIPELINE.md`](./ASSET_PIPELINE.md) beschrieben.

---

## 1. Vision & Leitlinien

### 1.1 Was bleibt gleich
Das bestehende Spiel hat einen klaren, persönlichen Charakter, der erhalten
bleiben muss:

- **Dieselbe reale Strecke:** Altbaumburgweg (Bilderstöckchen) → Scharfeneckweg
  → Triffelstraße → Ebernburgweg → Schiefersburger Weg → Escher Str. →
  Parkgürtel → Innere Kanalstraße → Aachener Str. → Kitschburger Str. →
  Friedrich-Schmidt-Str. → Junkersdorfer Str. → **RheinEnergie-Stadion**.
- **Dieselben Hero-Locations:** Wohnhaus „Altbaumburgweg 2" (Start), der
  „Oma-Stop" (Zwischenhalt mit Schere-Stein-Papier-Minispiel), das Stadion.
- **Dieselben Story-Beats:** Hinfahrt → Parken am Stadion → Fußballspiel als
  Zuschauer erleben → Pressekonferenz → Heimfahrt.
- **Derselbe Wagen:** VW Golf Sportsvan 7, Cockpit-Perspektive mit
  Infotainment-Navigation.

### 1.2 Was neu/besser wird
- **Fotorealistische Grafik:** Lumen (Echtzeit-GI + Reflexionen), Nanite
  (praktisch unbegrenzte Geometriedichte), Sky Atmosphere + volumetrische
  Wolken, echte nasse Straßen über Screen-Space-Reflections.
- **Echte Fahrphysik (optional):** Chaos Vehicles statt skriptbasierter
  Bewegung — Federung, Reifengrip, Gewichtsverlagerung.
- **Skalierbare Welt:** World Partition + Level Streaming, damit die komplette
  ~4 km lange Strecke ohne Ladebalken befahrbar ist.
- **Saubere Trennung** von Daten (Strecke, POIs), Logik (Gameplay) und
  Präsentation (Materialien, Effekte) — im Browser-Prototyp steckt alles in
  einer Datei.
- **Free-Roaming-Zone (V1.1):** Frei befahrbares Viertel Bilderstöckchen im
  2 km-Radius um den Altbaumburgweg — echte OSM-Straßen, echte Gebäude,
  kein Zielpunkt, einfach fahren. Siehe §6.9.

### 1.3 Nicht-Ziele (Scope-Disziplin)
- Kein Open-World-Köln. Version 1.0: nur der **Korridor entlang der Route**
  (≈ 80–120 m je Seite). Version 1.1: **2 km-Radius Free-Roaming** rund um
  den Altbaumburgweg (Bilderstöckchen) — geplant, aber nach 1.0.
- Kein Multiplayer, kein Schadensmodell.
- Kein Mobile-Build in 1.0 (UE5-Lumen-Zielplattform ist PC/Konsole).
- **Keine Google-Maps-Daten** (Lizenzverbot für Spieleentwicklung). Wir nutzen
  stattdessen OpenStreetMap (freie Lizenz) + Megascans-Texturen.

---

## 2. Analyse des Bestands → UE5-Entsprechung

Der Browser-Prototyp ist erstaunlich vollständig. Die folgende Tabelle ist die
**Übersetzungsmatrix**: jede vorhandene Funktion bekommt ihr UE5-Pendant. Sie
ist gleichzeitig die Feature-Checkliste für die Portierung.

| Bestand (Three.js, `index.html`) | Zweck | UE5-Entsprechung |
|---|---|---|
| `WP[]`-Array (Wegpunkte mit `ll(lat,lng)`) | Streckenverlauf, georeferenziert | Datentabelle (`DT_Route`) → **Spline-Actor** `BP_RouteSpline` |
| `ll()` / inverse Formel (`LAT0/LNG0/mLat/mLng`) | GPS ↔ Welt-Koordinaten | **Georeferencing-Origin** (Cesium) oder eigene `UGeoConvert`-Funktionsbibliothek |
| `buildRoute()` | Asphalt, Gehweg, Mittellinien aus WP | **Spline-Mesh** entlang `BP_RouteSpline` (Straße + Bordstein + Markierung) |
| `buildTrees()` | Bäume entlang Route | **PCG (Procedural Content Generation)** Graph + Spline-Streuung, Nanite-Foliage |
| `buildOSMBuildings()` + `loadOSM()` | reale Gebäude aus Overpass-API | **Offline**-Import via Cesium/StreetMap-Plugin → Bake zu statischen Meshes |
| `makeFacadeTex()` | prozedurale Fassadentextur | Megascans-Fassadenmaterialien + Material-Instanzen, parametrisierte Fenster |
| `buildHomePark()` (Altbaumburgweg 2) | Hero-Asset Wohnhaus + Grundstück | handmodelliertes **Hero-Mesh-Set** (Blender → UE5) |
| `buildOmaStop()` | Hero-Asset Oma-Haus + Minispiel-Trigger | Hero-Mesh-Set + `BP_OmaStop` (Trigger-Volume) |
| `buildStadium()` + `buildStadiumAtmosphere()` | RheinEnergie-Stadion + Tribünen | Hero-Mesh-Set + Crowd-System (instanzierte Zuschauer) |
| `makeTrafficLight()` / `updateTrafficLights()` | Ampeln mit Phasen | `BP_TrafficLight` (State Machine, Material-Emissive) |
| `createNPC()` / `updateNPCs()` | Verkehr (fahrende Autos) | `BP_TrafficVehicle` + Spline-Follow oder Mass-AI (Mass Entity) |
| `buildPedestrians()` / `updatePedestrians()` | Fußgänger | Mass-AI Crowd oder einfache `BP_Pedestrian` auf Spline |
| `updateCar()` / `checkCollisions()` | Fahrlogik + Kollision | **Chaos Vehicle** `BP_GolfSportsvan` (oder Arcade-Movement-Component) |
| `drawCockpit()` / `_drawNavScreen()` / `_gauge()` | 2D-Cockpit-HUD + Navi | **Widget Blueprint** (UMG) HUD + ggf. 3D-Cockpit-Mesh mit Render-Target-Displays |
| `drawMinimap()` / `toMM()` | Minimap | UMG-Minimap mit SceneCapture2D oder vorgebackener Karte |
| `checkWaypoint()` / `updateNavHUD()` / `navArrowFor()` | Navigationsführung + TTS | `BP_NavSystem` + Sound-Cues / MetaSounds, evtl. TTS-Plugin |
| `startFootballMatch()` / `updateFootball()` / `drawFootball()` | Fußball-Minispiel (2D-Sim) | **Sub-Level** `L_Stadium_Match` + `BP_MatchSim` (Datenmodell) + Kamera-Sequenz |
| `showPressConference()` / `_drawPressConf()` | Pressekonferenz nach Spiel | **Sequencer-Cinematic** + UMG-Overlay |
| `omaPlay()` / Schere-Stein-Papier | Minispiel bei Oma | UMG-Minispiel-Widget `WBP_RockPaperScissors` |
| `applyNightMode()` / `buildStreetLamps()` / `buildRain()` | Tag/Nacht/Regen | **Directional Light + Sky Atmosphere** Presets, Niagara-Regen, Material-Param-Collection |
| `setupComposer()` (SSAO/Bloom/SMAA/IBL) | Post-Processing | **Post Process Volume** (Lumen, Bloom, Exposure, AA = TSR) |
| `initAudio()` / `updateEngineSound()` | Motorsound, TTS, Stadion-Crowd | **MetaSounds** (Motor-RPM-Crossfade), Crowd-Loops, Ducking |

**Erkenntnis:** Es gibt kein Feature im Prototyp, das in UE5 nicht ein klares,
oft besseres Pendant hat. Das Projekt ist eine *Übersetzung mit Aufwertung*,
keine Neuerfindung. Die Spiellogik (Zustandsautomat der Story, Minispiel-Regeln)
ist bereits durchdacht und kann 1:1 nach Blueprint/C++ übertragen werden.

---

## 3. Technisches Fundament

### 3.1 Engine & Version
- **Unreal Engine 5.4 LTS** (oder die zum Projektstart aktuelle 5.x-LTS).
  Begründung: Lumen & Nanite stabil, PCG produktionsreif, gute Chaos-Vehicle-
  Templates, World Partition ausgereift.
- **Rendering-Pfad:** Deferred + Lumen (Software-Lumen als Fallback für
  schwächere GPUs, Hardware-Lumen/RT für High-End).
- **Antialiasing:** TSR (Temporal Super Resolution) — ersetzt unser SMAA/MSAA-
  Gefrickel im Browser komplett.

### 3.2 Sprache: Blueprint vs. C++
- **C++** für: Kern-Systeme mit Performance-/Wartungsanspruch — Georeferencing-
  Mathematik, Navigationssystem, Match-Simulation, Speicher/Savegame.
- **Blueprint** für: schnell iterierbare Spiellogik — Trigger, Story-Flow,
  UI-Bindings, Einzel-Actors (Ampel, NPC-Verhalten).
- **Faustregel:** Datenmodell & Algorithmen in C++, „Verkabelung" in Blueprint.

### 3.3 Plattform-Ziele
| Stufe | Ziel | Settings |
|---|---|---|
| Min | GTX 1660 / RTX 2060, 1080p 60fps | Software-Lumen, Nanite an, TSR „Performance" |
| Empfohlen | RTX 3070+, 1440p 60fps | Hardware-Lumen, TSR „Quality" |
| High-End | RTX 4080+, 4K 60fps | Hardware-Lumen + RT-Reflexionen, volle Foliage-Dichte |

Skalierbarkeit über die UE-Scalability-Gruppen (`sg.*` CVars) und ein
In-Game-Grafikmenü.

---

## 4. Asset-Pipeline (Kurzüberblick)

> Vollständige Details, Ordnerbaum, Namenskonventionen und Schritt-für-Schritt-
> Workflows: **[`ASSET_PIPELINE.md`](./ASSET_PIPELINE.md)**.

Die vier Asset-Quellen des Projekts:

1. **Prozedural aus Daten** (Straße, Bordsteine, Markierungen, Baumreihen,
   Straßenlaternen) — über Splines + PCG, gespeist aus `DT_Route`.
2. **OSM-Import** (reale Gebäude im Korridor) — einmalig offline importiert,
   bereinigt, zu Nanite-Meshes gebacken.
3. **Hero-Assets handmodelliert** (Altbaumburgweg 2, Oma-Haus, Stadion,
   Golf Sportsvan) — Blender → UE5, höchste Qualität, mit LODs/Collision.
4. **Bibliotheks-Assets** (Vegetation, Mobiliar, Verkehrsschilder, Materialien)
   — Quixel Megascans, Fab-Marketplace, eigene Master-Materialien.

Der georeferenzierte Workflow ist das Rückgrat: Die exakt gleichen GPS-Punkte
aus dem Prototyp (`ll(lat,lng)`) definieren ein **gemeinsames Welt-Koordinaten-
system**, in dem OSM-Daten, Splines und Hero-Assets deckungsgleich liegen.

---

## 5. Beleuchtung, Wetter & Atmosphäre

Der Prototyp kennt 4 Zustände (Tag/Nacht × Trocken/Regen). In UE5 als
**Lighting-Presets** über eine Data-Driven-Lösung:

### 5.1 Tag (klar)
- **Directional Light** (Sonne) + **Sky Atmosphere** + **Volumetric Cloud**.
- **Lumen GI** liefert die Umgebungsbeleuchtung, die im Prototyp über IBL/PMREM
  angenähert wurde — hier physikalisch korrekt und dynamisch.
- **Sky Light** (Capture vom Sky Atmosphere) für indirektes Himmelslicht.
- Exposure über Post Process Volume (Auto-Exposure, dezent).

### 5.2 Nacht
- Sonne → Mond (schwaches Directional Light, kühl).
- **Emissive-Materialien** + **Lokale Lichter** für Straßenlaternen
  (`BP_StreetLamp`), Stadion-Flutlicht, Auto-Scheinwerfer (Spot Lights).
- Lumen rendert die indirekte Ausleuchtung der Lampen realistisch.
- Performance: Lichter mit Attenuation-Radius begrenzen, ggf. „Lighting
  Channels", Schatten nur für die wichtigsten Lichter.

### 5.3 Regen
- **Niagara**-Partikelsystem für Regen (kameranah gespawnt, GPU-Partikel).
- **Wet-Surface-Material-Funktion:** Roughness runter, Reflexion rauf, Pfützen
  über Puddle-Mask (Distanzfeld/Höhenmaske). Echte SSR statt unseres Fakes.
- **Material Parameter Collection** `MPC_Weather` mit `Wetness` (0–1) — ein
  Parameter steuert alle Oberflächen gleichzeitig (sanfter Übergang möglich).
- Scheibenwischer am Cockpit (animiertes Mesh), Regentropfen auf der Windschutz-
  scheibe als Post-Process-/Decal-Effekt.
- Nebel über **Exponential Height Fog** (ersetzt unser `THREE.Fog`).

### 5.4 Zustandssteuerung
`BP_WeatherController` setzt anhand der gewählten `cfg` (Tag/Nacht, Regen)
die Presets: Lichtfarben/-intensitäten, `MPC_Weather.Wetness`, Niagara an/aus,
Sky-Atmosphere-Parameter. Übergänge können später animiert werden
(dynamischer Tagesverlauf als Stretch-Goal).

---

## 6. Gameplay-Systeme

### 6.1 Fahrzeug & Steuerung
Zwei Optionen, Entscheidung früh in Prototyp-Phase:
- **A) Chaos Vehicle** — realistische Physik, Federung, Reifen. Mehr Aufwand
  beim Tuning, fühlt sich „echt" an.
- **B) Arcade Movement Component** — kinematische Bewegung wie im Prototyp
  (`updateCar()`), vorhersehbar, leicht zu steuern, passt zum entspannten
  „Sonntagsfahrt"-Ton des Spiels.

**Empfehlung:** Mit **B (Arcade)** starten (entspricht dem bestehenden
Spielgefühl, schneller spielbar), Chaos als optionales Upgrade evaluieren.
Eingaben über **Enhanced Input System** (Tastatur, Gamepad, Lenkrad).

### 6.2 Story-Flow (Zustandsautomat)
Der Spielablauf ist bereits im Prototyp als impliziter Automat vorhanden. In
UE5 als expliziter **GameMode-State** (`BP_CologneGameMode`):

```
START (Altbaumburgweg 2)
  → FAHRT_ZUM_STADION  (Navigation aktiv, optionaler Oma-Stop)
      → OMA_STOP (optional) → Schere-Stein-Papier → zurück zu FAHRT
  → PARKEN_STADION (Einpark-Trigger)
  → FUSSBALLSPIEL (Sub-Level / Cinematic, Zuschauer-Perspektive)
  → PRESSEKONFERENZ (Cinematic + UMG)
  → HEIMFAHRT (Navigation invertiert)
  → ENDE (Altbaumburgweg 2)
```

Jeder Übergang wird durch **Trigger-Volumes** oder Navigations-Events ausgelöst.
Der Zustand wird im **SaveGame** persistiert (Wiederaufnahme möglich).

### 6.3 Navigation & HUD
- `BP_NavSystem` verfolgt den nächsten Wegpunkt auf `BP_RouteSpline`, berechnet
  Distanz/Richtung, triggert Ansagen („In 100 m rechts abbiegen").
- **Infotainment-Navi** im Cockpit: Karte als SceneCapture2D der Strecke oder
  vorgebackene 2D-Map auf einem **Render Target**, das auf das Cockpit-Display-
  Mesh gelegt wird (echtes 3D-Display statt 2D-Overlay).
- **Instrumente** (Tacho, Drehzahl): entweder UMG-Overlay (wie Prototyp) oder
  als Material auf dem 3D-Kombiinstrument mit Animations-getriebenen Zeigern.
- **TTS-Ansagen:** UE hat kein natives TTS; Optionen: (a) vorab generierte
  Audio-Clips für alle Ansagen, (b) TTS-Plugin/Middleware. Empfehlung: feste
  Clips (kalkulierbar, offline, mehrsprachig produzierbar).

### 6.4 Minispiel 1 — Fußballspiel (Stadion)
Der Prototyp simuliert ein 2D-Spiel und zeichnet es auf Canvas. In UE5:
- **Datenmodell** `BP_MatchSim` portiert die Spiel-Logik (Spielzüge, Tore,
  Elfmeter `triggerPenalty()`, Rote Karten `giveRedCard()`, Endstand).
- **Präsentation:** Zuschauer-Perspektive von der Tribüne. Spieler als
  einfache animierte Charaktere auf dem Rasen, Kamera folgt dem Ball.
  Crowd als instanzierte Mesh-Menge mit Animations-Varianten + Crowd-Audio.
- **Banner/Anzeigetafel** zeigt Spielstand (`showFBBanner()` → UMG/Render-Target).
- Realistisch ist eine **stilisierte** Darstellung (kein FIFA-Klon); der Reiz
  liegt im Erleben als Fan, nicht im Mitspielen.

### 6.5 Minispiel 2 — Pressekonferenz
- **Sequencer-Cinematic:** Podium, Mikrofone, Blitzlichter (Niagara), Trainer/
  Spieler-Charakter.
- **UMG-Overlay** mit Fragen/Antworten (Dialog), Untertitel.
- Übergang automatisch nach Spielende, danach „Jetzt heimfahren"-Button
  (entspricht `pc-home-btn` im Prototyp).

### 6.6 Minispiel 3 — Schere-Stein-Papier bei Oma
- Reines **UMG-Widget** `WBP_RockPaperScissors` (portiert `omaPlay()`,
  `omaBuildChoices()`, `omaUpdateScore()`).
- Ausgelöst durch Einpark-/Annäherungs-Trigger am Oma-Haus.
- Nach dem Spiel zurück in den Fahrmodus.

### 6.7 Verkehr & Fußgänger
- **Verkehr:** `BP_TrafficVehicle` folgt parallelen Verkehrs-Splines mit
  Geschwindigkeit + Ampel-Stopp-Logik. Für mehr Dichte später Mass-AI.
- **Fußgänger:** auf Gehweg-Splines; an Zebrastreifen Interaktion mit Ampeln.
- **Ampeln:** `BP_TrafficLight` als State Machine (Rot/Gelb/Grün), Emissive-
  Material, synchronisiert über einen zentralen `BP_TrafficManager`.

### 6.8 Einparken
- Hero-Trigger am Stadion-Parkplatz, am Oma-Haus, an der Heimat-Garage.
- Einfache **Parkzonen-Erkennung** (Overlap + Ausrichtungs-/Geschwindigkeits-
  prüfung), wie `checkParking()` / `checkHomePark()` / `checkOmaPark()`.

### 6.9 Free-Roaming-Zone „Bilderstöckchen" (V1.1)

> **Ziel:** Frei durch das echte Viertel fahren — kein Ziel, kein Timer,
> einfach das Gefühl von GTA 5 im eigenen Stadtteil.

**Geografischer Umfang:**
- Mittelpunkt: Altbaumburgweg 2 (`LAT0=50.9674, LNG0=6.9382`)
- Radius: **2 km** → ca. 4 km² Fläche
- Umfasst: Bilderstöckchen, Teile von Bocklemünd, Vogelsang, Ossendorf
- Straßen: vollständiges OSM-Netz im Radius (Hauptstraßen + Nebenstraßen)

**Datenbasis (OSM, lizenzfrei):**
- Overpass-Abfrage: `way["highway"](around:2000, 50.9674, 6.9382)` → alle
  Straßen im 2 km-Radius
- Gebäude: `way["building"](around:2000, 50.9674, 6.9382)` → Footprints
  mit Höhen aus `building:levels`
- Vegetation, Parkflächen, Gewässer aus OSM-Landuse-Daten

**Technische Umsetzung:**
- **Straßennetz:** OSM-Geometrie → Spline-Meshes (gleiche Pipeline wie die
  Hauptroute, nur flächendeckend statt linear)
- **Gebäude:** Batch-Import via Blender+blender-osm → Nanite-Meshes, gleiche
  Fassadenmaterialien wie Hauptroute
- **World Partition:** 2 km-Radius in ~16 Streaming-Zellen à 500×500 m;
  nur die Zelle um den Spieler + Nachbarzellen geladen
- **Verkehr:** vereinfachtes NPC-Netz auf Hauptstraßen des Viertels
- **Kein Navi-Zwang:** freies Fahren ohne Wegpunkt-Führung; optionale
  „Entdeckungs-Markers" (bekannte Orte im Viertel)

**Abgrenzung zu V1.0:**
- V1.0: nur der Korridor (80 m beidseitig der Route) — schneller fertig
- V1.1: der volle 2 km-Radius — baut auf derselben Pipeline auf,
  nur mehr Fläche. Kein Architektur-Umbau nötig.

**Warum OSM und nicht Google Maps:**
Google Maps verbietet die Nutzung für eigene Spiele ausdrücklich.
OSM (OpenStreetMap) steht unter der ODbL-Lizenz — kostenlos, auch für
eigene Spiele nutzbar, solange die Quellenangabe erhalten bleibt.
Qualitativ ist OSM für Köln/Bilderstöckchen sehr vollständig.

---

## 7. Audio

| Quelle (Prototyp) | UE5-Lösung |
|---|---|
| `updateEngineSound()` (RPM-Ton) | **MetaSound** mit RPM-gesteuertem Crossfade mehrerer Sample-Loops |
| TTS-Navi (`_speak()`) | vorgebackene Voice-Clips, getriggert vom NavSystem |
| Stadion-Crowd (`_startCrowd()`, `_playCheer()`) | Crowd-Loops + Jubel-One-Shots, räumlich am Stadion |
| Schiedsrichterpfiff (`_playWhistle()`) | One-Shot MetaSound |
| Navi-Beep / Warnungen | UI-Sound-Cues |

**Mixing:** Sound-Submixe (Engine / Voice / Crowd / UI) mit **Ducking**
(Navi-Ansage senkt Motor/Musik). Räumliches Audio (Attenuation) für Stadion
und Straßengeräusche.

---

## 8. UI / HUD

- **HUD-Layer (UMG):** Tacho/Drehzahl/Gang (falls nicht 3D), Tempolimit-Anzeige
  (`updateLimitHUD()`), Navi-Hinweise, Minimap, Toast-Nachrichten (`toast()`).
- **3D-Cockpit (Stretch):** Das eigentliche Golf-Sportsvan-Cockpit als Mesh mit
  funktionierenden Displays (Render Targets) — deutlich immersiver als das
  2D-Overlay des Prototyps, aber mehr Aufwand. Phasenweise: erst 2D-HUD, später
  3D-Cockpit.
- **Menüs:** Startmenü (Tag/Nacht, Regen, Direktstart Fußball), Pausemenü,
  Grafikeinstellungen, Savegame.

---

## 9. Performance & Welt-Struktur

- **World Partition:** Die Strecke wird in Zellen aufgeteilt; nur die Umgebung
  des Spielers ist geladen (Streaming). Erlaubt die volle ~4 km ohne Ruckler.
- **Nanite:** für Gebäude und Hero-Assets — kein manuelles LOD-Polishing für
  statische Geometrie nötig.
- **HLODs:** für Fern-Darstellung gestreamter Zellen.
- **Foliage:** Bäume/Büsche als Nanite-Foliage oder Hierarchical Instanced
  Static Meshes, PCG-gestreut entlang der Route.
- **Budget-Richtwerte (Empfohlen-Stufe, 1440p/60):** Draw-Calls durch Nanite/
  Instancing niedrig halten; Lumen-Kosten via Software-Lumen + begrenzte
  Reflexionsauflösung steuern; Niagara-Regen GPU-seitig + kameranah begrenzen.

---

## 10. Projekt-Roadmap (Meilensteine)

> Zeitangaben sind grobe Richtwerte für ein **Zwei-Personen-Team** in
> Teilzeit/Hobby-Intensität. Sie dienen der Reihenfolge, nicht als Deadline.

### M0 — Setup & Greybox (≈ 1–2 Wochen)
- UE5-Projekt, Git + Git LFS (oder Perforce), Ordnerstruktur & Namenskonvention
  gemäß `ASSET_PIPELINE.md` anlegen.
- `DT_Route` aus dem Prototyp-`WP[]`-Array exportieren (Skript: WP → CSV/JSON).
- Georeferencing-Origin festlegen (= `LAT0/LNG0` des Prototyps).
- **Greybox-Strecke:** `BP_RouteSpline` + Spline-Mesh-Straße über die volle
  Route, befahrbar mit Arcade-Vehicle. *Ziel: Ende-zu-Ende fahrbar in grau.*

### M1 — Fahrgefühl & Navigation (≈ 2–3 Wochen)
- Fahrzeugsteuerung final (Arcade), Kamera, Kollision.
- `BP_NavSystem`, Wegpunkt-Logik, HUD-Prototyp (2D-UMG), Minimap.
- Tempolimits, Ampeln (`BP_TrafficLight` + Manager).
- *Ziel: Die Fahrt fühlt sich gut an, Navigation führt korrekt.*

### M2 — Welt-Aufbau (Asset-Pipeline-Kern) (≈ 4–6 Wochen)
- OSM-Import des Korridors, Bereinigung, Bake zu Nanite-Meshes.
- PCG für Vegetation/Straßenmöblierung/Laternen.
- Materialien (Master-Material + Instanzen, Megascans-Integration).
- Lighting-Presets (Tag/Nacht/Regen) + `BP_WeatherController`.
- *Ziel: Die Strecke sieht „nach Köln" aus, alle 4 Wetter-Zustände stehen.*

### M3 — Hero-Assets (≈ 3–4 Wochen)
- Altbaumburgweg 2, Oma-Haus, RheinEnergie-Stadion in Blender → UE5.
- VW Golf Sportsvan 7 (Exterieur + Cockpit-Mesh).
- Platzierung georeferenziert an exakt den Prototyp-Positionen.
- *Ziel: Alle Story-Locations stehen in finaler Qualität.*

### M4 — Gameplay & Minispiele (≈ 4–5 Wochen)
- Story-State-Machine (`BP_CologneGameMode`), Trigger, SaveGame.
- Fußballspiel (`BP_MatchSim` + Stadion-Sub-Level + Crowd).
- Pressekonferenz (Sequencer + UMG).
- Schere-Stein-Papier bei Oma (`WBP_RockPaperScissors`).
- Verkehr & Fußgänger.
- *Ziel: Spiel von Start bis Ende durchspielbar.*

### M5 — Audio, Polish, Performance (≈ 3–4 Wochen, laufend)
- MetaSound-Motor, Voice-Clips, Crowd-Audio, Mixing.
- World-Partition-Tuning, Scalability-Stufen, Grafikmenü.
- Bugfixing, Balancing, finaler Look-Dev.
- *Ziel: Release-Kandidat 1.0.*

### M6 — Free-Roaming „Bilderstöckchen" V1.1 (≈ 4–5 Wochen)
- OSM-Straßennetz im 2 km-Radius um Altbaumburgweg vollständig importieren.
- Gebäude-Batch (Blender+blender-osm) für den Radius, gleiche Materialien.
- World-Partition-Zellen für den erweiterten Bereich, Streaming-Budget prüfen.
- NPC-Verkehr auf Hauptstraßen des Viertels.
- Entdeckungs-Marker für bekannte Orte (optional).
- *Ziel: Freies Fahren durch Bilderstöckchen ohne Zielvorgabe.*

### Stretch-Goals (nach 1.1)
- 3D-Cockpit mit funktionierenden Displays.
- Chaos-Fahrphysik.
- Dynamischer Tagesverlauf.
- Free-Roaming-Radius auf 5 km erweitern (mehr Kölner Viertel).
- VR-Modus.

---

## 11. Rollenverteilung (2-Personen-Team)

Die genaue Aufteilung klären wir, aber als Vorschlag:

| Bereich | Schwerpunkt |
|---|---|
| **Tech / Systeme** | UE5-Setup, C++-Kernsysteme (Georeferencing, NavSystem, MatchSim), Blueprint-Architektur, Performance |
| **Art / Welt** | Asset-Pipeline, OSM-Bake, Hero-Modelling (Blender), Materialien, Lighting, Look-Dev |
| **Gemeinsam** | Gameplay-Design, Story-Flow, Minispiele, Testing, Audio |

KI-Unterstützung (Claude) kann bei C++/Blueprint-Logik, Material-Konzepten,
Tooling-Skripten (WP-Export, Batch-Import) und Dokumentation einspringen.

---

## 12. Risiken & Gegenmaßnahmen

| Risiko | Auswirkung | Gegenmaßnahme |
|---|---|---|
| **Scope-Creep** (zu viel Welt) | Projekt nie fertig | Strikt nur Korridor; Feature-Freeze für 1.0 |
| **OSM-Datenqualität** (fehlende/falsche Gebäude) | Lücken in der Stadt | Manuelles Nachmodellieren von Schlüssel-Bereichen; OSM nur als Basis |
| **Lumen-Performance** auf schwacher Hardware | unspielbar für manche | Software-Lumen-Fallback + Scalability-Stufen früh testen |
| **Hero-Asset-Aufwand** (Stadion!) | Zeitfresser | Stilisieren statt fotoreal; Referenzfotos; ggf. Marketplace-Basis |
| **Rechte/Marken** (RheinEnergie, VW, Vereine) | rechtliche Probleme bei Veröffentlichung | Für privates/nicht-kommerzielles Projekt unkritisch; bei Release entschärfen (generische Namen/Designs) |
| **Verzettelung der 2 Personen** | Stillstand | Klare Meilensteine, kurze Iterationen, regelmäßige Builds |

---

## 13. Nächste konkrete Schritte

1. **`ASSET_PIPELINE.md` lesen** — die technische Detailbasis.
2. **WP-Export-Skript** schreiben: liest `WP[]` aus `index.html`, schreibt
   `DT_Route.csv` (lat, lng, street, width, tl) für den UE5-Import.
3. **UE5-Projekt aufsetzen** (M0): Vehicle-Template, Git-LFS, Ordnerstruktur.
4. **Greybox-Strecke** aus `DT_Route` generieren — erster fahrbarer Build.

> Dieses Dokument ist bewusst lebendig. Wir verfeinern es mit jeder
> Erkenntnis aus der Vorproduktion.
