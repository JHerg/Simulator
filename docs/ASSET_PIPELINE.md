# Asset-Pipeline — Köln-Fahrsimulator 2 (UE5)

> Technische Detailbasis zum [Gesamtkonzept](./UNREAL_KONZEPT.md).
> Dieses Dokument beschreibt **wie** Assets entstehen, importiert, benannt,
> versioniert und in die Welt gebracht werden — von der GPS-Koordinate bis zum
> fertigen Nanite-Mesh in der Lumen-beleuchteten Szene.

**Inhalt**
1. [Grundprinzipien](#1-grundprinzipien)
2. [Georeferenzierung — das gemeinsame Koordinatensystem](#2-georeferenzierung)
3. [Die vier Asset-Quellen](#3-die-vier-asset-quellen)
4. [Quelle A — Prozedural aus Daten (Splines + PCG)](#4-quelle-a--prozedural-aus-daten)
5. [Quelle B — OSM-Import (reale Gebäude)](#5-quelle-b--osm-import)
6. [Quelle C — Hero-Assets (Blender → UE5)](#6-quelle-c--hero-assets)
7. [Quelle D — Bibliotheks-Assets (Megascans/Fab)](#7-quelle-d--bibliotheks-assets)
8. [Material-Pipeline](#8-material-pipeline)
9. [Ordnerstruktur & Namenskonventionen](#9-ordnerstruktur--namenskonventionen)
10. [Technische Standards (LODs, Collision, Pivots, Scale)](#10-technische-standards)
11. [Versionskontrolle & Datenhaltung](#11-versionskontrolle--datenhaltung)
12. [Werkzeugkette & Automatisierung](#12-werkzeugkette--automatisierung)
13. [Import-Checkliste & Validierung](#13-import-checkliste--validierung)

---

## 1. Grundprinzipien

1. **Eine Quelle der Wahrheit für die Geometrie der Welt:** das
   georeferenzierte Koordinatensystem. OSM-Gebäude, Splines und Hero-Assets
   liegen alle im selben Raum, abgeleitet aus denselben GPS-Punkten wie der
   Browser-Prototyp.
2. **Daten getrennt von Geometrie:** Die Strecke ist eine *Datentabelle*
   (`DT_Route`), kein hartcodiertes Mesh. Geometrie wird daraus generiert.
   Ändert sich die Strecke, regeneriert sich die Welt.
3. **Non-destruktiv & reproduzierbar:** Jeder Import-Schritt ist als
   Skript/Workflow dokumentiert, sodass ein Re-Import (z. B. neuere OSM-Daten)
   ohne Handarbeit möglich ist.
4. **Nanite-first für Statik:** Statische Geometrie nutzt Nanite — kein
   manuelles LOD-Tuning, hohe Detaildichte „umsonst".
5. **Konventionen vor Kreativität bei Technik:** strikte Namens-/Ordner-
   regeln, damit zwei Personen kollisionsfrei arbeiten.

---

## 2. Georeferenzierung

### 2.1 Übernahme aus dem Prototyp
Der Browser-Prototyp definiert (in `index.html`):

```js
const LAT0 = 50.9674, LNG0 = 6.9382;          // Welt-Ursprung (0,0)
const mLat = 111320;                          // Meter pro Breitengrad
const mLng = mLat * Math.cos(LAT0*Math.PI/180); // ≈ 70030 m/° Längengrad
// GPS → Welt:
ll(lat,lng) = { x:(lng-LNG0)*mLng, z:(LAT0-lat)*mLat }
// Welt → GPS (invers):
lat = LAT0 - z/mLat;  lng = LNG0 + x/mLng;
```

Das ist eine **lokale äquirektanguläre Projektion** mit Ursprung am
Altbaumburgweg. Für eine Stadt-Korridor-Größe (~4 km) ist die Verzerrung
vernachlässigbar.

### 2.2 Achsen-Mapping Three.js → Unreal
**Wichtig**, weil die Engines unterschiedliche Konventionen haben:

| | Three.js (Prototyp) | Unreal Engine 5 |
|---|---|---|
| Hand | rechtshändig, Y-up | linkshändig, Z-up |
| „Osten" (+lng) | `+x` | `+X` |
| „Norden" (−lat) | `−z` | `+Y` *(oder −Y, festzulegen)* |
| „Oben" | `+y` | `+Z` |
| Einheit | 1 = 1 Meter | 1 = 1 cm |

**Konvertierungsregel (festzunageln in M0):**
```
UE.X =  ll(lat,lng).x * 100              // Meter → cm
UE.Y =  ll(lat,lng).z * 100              // Three-z (Süd+) → UE-Y
UE.Z =  height * 100
```
(Falls die Karte gespiegelt wirkt, Vorzeichen von Y umdrehen — einmal testen,
dann fixieren.) Diese Formel lebt zentral in der C++-Funktionsbibliothek
**`UGeoConvert`** (`GeoToWorld(lat,lng,height)` / `WorldToGeo(vector)`), damit
**alle** Systeme (NavSystem, Asset-Platzierung, OSM-Import) identisch rechnen.

### 2.3 Alternative: Cesium for Unreal
Statt der eigenen Projektion kann **Cesium for Unreal** als Georeferencing-
Backbone dienen (echtes WGS84, `CesiumGeoreference`-Origin auf `LAT0/LNG0`).
Vorteil: Direkter Import von Gelände/3D-Tiles. Nachteil: schwergewichtiger.
**Entscheidung in M0**; für ein reines Korridor-Spiel reicht die eigene
`UGeoConvert`-Lösung meist aus.

### 2.4 DT_Route — die Strecke als Daten
Export aus dem Prototyp-`WP[]`-Array in eine UE-DataTable
(`DT_Route`, Row-Struct `FRouteWaypoint`):

| Feld | Typ | Quelle im Prototyp |
|---|---|---|
| `Index` | int | Array-Position |
| `Street` | Name | `street` |
| `Lat`, `Lng` | double | aus `x,z` rückgerechnet bzw. `ll()`-Eingang |
| `Width` | float | `width` (Straßenbreite in m) |
| `HasTrafficLight` | bool | `tl` |
| `SpeedLimit` | int | `LIMITS[street]` |
| `POI` | Name | optional (Home/Oma/Stadion/Park) |

Ein kleines Node-/Python-Skript liest `index.html`, parst das `WP[]`-Array und
schreibt `DT_Route.csv` (siehe [§12](#12-werkzeugkette--automatisierung)).

---

## 3. Die vier Asset-Quellen

| Quelle | Was | Methode | Qualität |
|---|---|---|---|
| **A** | Straße, Bordstein, Markierung, Bäume, Laternen, Schilder | Splines + PCG aus `DT_Route` | prozedural, regenerierbar |
| **B** | reale Wohn-/Geschäftsgebäude im Korridor | OSM-Import → Bake | mittel, Masse |
| **C** | Altbaumburgweg 2, Oma-Haus, Stadion, VW Golf Sportsvan | Handmodelling Blender → UE5 | höchste, Hero |
| **D** | Vegetation, Mobiliar, generische Materialien | Megascans / Fab | hoch, Bibliothek |

---

## 4. Quelle A — Prozedural aus Daten

### 4.1 Straße über Spline-Meshes
- `BP_RouteSpline` liest `DT_Route`, erzeugt zur Laufzeit/Editorzeit einen
  **USplineComponent** durch alle Wegpunkte (GeoToWorld konvertiert).
- Entlang des Splines werden **Spline-Mesh-Components** instanziert:
  - **Fahrbahn** (Breite aus `Width`) — tilendes Asphalt-Material.
  - **Bordsteine** links/rechts.
  - **Gehweg** (entspricht `roadGeo(width+3)` im Prototyp).
  - **Mittel-/Randmarkierung** als Decal-Spline oder Material-Maske.
- Kreuzungen: an Wegpunkten mit Richtungswechsel werden Kreuzungs-Stücke
  eingesetzt (Bibliothek aus wenigen Kreuzungs-Meshes), Bäume dort ausgespart
  (wie `if (t<0.1||t>0.9) continue;` im Prototyp).

**Editor-Workflow:** Spline-Punkte sind sichtbar/editierbar; ein „Rebuild"-
Button (Editor Utility) regeneriert die Mesh-Instanzen nach Datenänderung.

### 4.2 PCG für Streuung (Bäume, Laternen, Mobiliar)
Ein **PCG-Graph** (`PCG_StreetFurniture`):
- Sampelt Punkte entlang des Straßen-Splines im definierten Abstand
  (Prototyp: `treeSpacing` 14 m).
- Versetzt sie seitlich auf die Gehweg-Linie (Spline-Normale).
- Streut **Bäume** (Nanite-Foliage), **Straßenlaternen** (`BP_StreetLamp`),
  **Verkehrsschilder**, **Mülleimer/Bänke** mit Zufalls-Varianz (Seed wie
  der deterministische RNG im Prototyp, für Reproduzierbarkeit).
- Ausschlusszonen (wie im Prototyp die manuell gebauten Grundstücke) über
  **PCG-Exclusion-Volumes** an Hero-Asset-Standorten.

### 4.3 Straßenlaternen & Ampeln
- `BP_StreetLamp`: Mast-Mesh + Spot/Point-Light (nur nachts aktiv, gesteuert
  vom `BP_WeatherController`), Emissive-Lampenkopf.
- `BP_TrafficLight`: Ampelmast, 3 Emissive-Materialinstanzen, State Machine,
  Platzierung an Wegpunkten mit `HasTrafficLight = true`.

---

## 5. Quelle B — OSM-Import

> Ziel: die realen Gebäude im Korridor — **offline einmalig** importiert,
> bereinigt, zu Nanite-Meshes gebacken. Kein Laufzeit-Fetch wie im Prototyp
> (`loadOSM()` via Overpass) — das war für den Browser nötig, in UE5
> kontraproduktiv.

### 5.1 Datenbeschaffung
- **Overpass-API**-Abfrage (wie im Prototyp) für `way["building"]` im Korridor:
  `around:120` entlang der Route-Polyline. Ergebnis als `.osm`/`.geojson`
  speichern (versioniert im Repo unter `/SourceData/OSM/`).
- Alternativ **JOSM** oder **BBBike-Extrakt** für saubere Rohdaten.

### 5.2 Import-Pfade (zwei Optionen)
**Option 1 — StreetMap-Plugin (Mapzen/„Unreal StreetMap"):**
- Importiert `.osm` direkt als prozedurales Mesh mit Gebäude-Extrusion
  (Höhe aus `building:levels` oder Default).
- Schnell, aber rohe Geometrie → Cleanup nötig.

**Option 2 — Blender + „blender-osm" (empfohlen für Qualität):**
- `blender-osm` importiert Gebäude mit Footprints + Höhen, optional mit
  prozeduralen Fassaden.
- In Blender: Bereinigen, Footprints schließen, sinnvolle Höhen, UVs für
  Fassadenmaterialien, Export als glTF/FBX-Batch.

### 5.3 Veredelung
- **Höhen:** `building:levels × 3 m` (Prototyp-Annahme), sonst Default 3–5
  Stockwerke je nach Straße.
- **Dächer:** einfache Walm-/Flachdächer aus Footprint generiert.
- **Fassaden-UVs:** so gelegt, dass tilende Fassadenmaterialien (mit Fenster-
  Reihen) greifen — Ersatz für `makeFacadeTex()` des Prototyps, nun als echte
  PBR-Materialien mit parametrisierten Stockwerken.
- **Nanite aktivieren** beim Import → keine LODs nötig.

### 5.4 Ausschlusszonen
Gebäude, die in den Footprint der **Hero-Assets** fallen (Altbaumburgweg 2,
Oma-Haus, Stadion), werden beim Import gelöscht — exakt wie die Ausschluss-
zonen im Prototyp (`if (cx>-22 && cx<-1 && ...) return;`). Umgesetzt über
Lösch-Bounding-Boxes im Import-Skript oder manuell in Blender.

### 5.5 Platzierung in UE5
- Gebäude-Batch wird über `GeoToWorld` an die korrekten Welt-Positionen
  gesetzt (Footprint-Zentren aus OSM-Koordinaten).
- Gruppierung in World-Partition-Zellen entlang der Strecke.

---

## 6. Quelle C — Hero-Assets

> Höchste Qualität, handmodelliert. Diese Objekte tragen die emotionale
> Bindung des Spiels und müssen stimmen.

### 6.1 Asset-Liste
| Hero-Asset | Bezug Prototyp | Umfang |
|---|---|---|
| **Altbaumburgweg 2** | `buildHomePark()` | Wohnhaus, Gartenhaus, Stellplatz, Garten, Zaun, Garage |
| **Oma-Haus** | `buildOmaStop()` | Haus + Vorgarten + Parkzone, Minispiel-Marker |
| **RheinEnergie-Stadion** | `buildStadium()` + Atmosphere | Außenhülle, Tribünen, Spielfeld, Flutlicht, Parkplatz |
| **VW Golf Sportsvan 7** | Cockpit-Render + Fahrzeug | Exterieur (LOD/Collision) + Cockpit-Interieur |

### 6.2 Blender → UE5 Workflow
1. **Modelling** in Blender, **reale Maße** (Meter; UE skaliert ×100 beim Import
   oder Blender-Unit-Scale 0.01 setzen → cm).
2. **Pivot/Origin** sinnvoll setzen (Gebäude: Bodenmitte; Auto: Mittelpunkt
   Bodenkontakt). **+X = Vorne** für Fahrzeuge (UE-Konvention).
3. **UVs:** sauber, ohne Überlappung für unique-Texturierung; tilende Teile
   separat.
4. **Naming** der Objekte vor Export (wird zu Mesh-Slot-Namen).
5. **Export** als **glTF 2.0** (oder FBX) — separate Dateien je Hero-Set.
6. **Import in UE5:** Nanite an (statische Teile), Material-Slots benannt,
   Collision (siehe §10), Maßstab prüfen (1 m = 100 uu).
7. **Platzierung** georeferenziert an die exakten Prototyp-Koordinaten
   (`HOME_BASE_X/Z`, `OMA_CX/CZ`, Stadion-WP) via `GeoToWorld`.

### 6.3 Fahrzeug-Besonderheit
- **Exterieur:** ein Mesh mit LODs (oder Nanite für Karosserie), separate
  **Räder** (für Lenk-/Roll-Animation), Glas-Material, lackiertes Karosserie-
  Material (Clearcoat).
- **Cockpit:** Interieur-Mesh; Displays (Tacho, Infotainment) als eigene
  Mesh-Flächen mit **Render-Target-Materialien** (für 3D-HUD-Stretch-Goal).
- **Collision:** vereinfachtes Convex-Hull, nicht das Render-Mesh.

---

## 7. Quelle D — Bibliotheks-Assets

- **Quixel Megascans / Fab:** Vegetation (Bäume, Büsche, Gras), Oberflächen
  (Asphalt, Beton, Ziegel, Pflaster), Mobiliar (Bänke, Mülleimer, Poller).
- **Verkehrsschilder:** kleine eigene Mesh-Bibliothek mit deutschen Schildern
  (Tempolimit, Vorfahrt) — Material mit austauschbarer Schild-Textur.
- **NPCs/Fußgänger/Zuschauer:** MetaHumans (zu schwer für Crowds) → besser
  einfache modulare Charaktere oder Marketplace-Crowd-Packs, instanziert.
- **Konvention:** Bibliotheks-Assets liegen unter `/Content/External/…` und
  werden **nicht** verändert; Anpassungen nur über Material-Instanzen.

---

## 8. Material-Pipeline

### 8.1 Master-Materialien (wenige, mächtig)
| Master-Material | Verwendung | Wichtige Parameter |
|---|---|---|
| `M_Surface_Master` | Asphalt, Beton, Gehweg, Stein | BaseColor, Roughness, Normal, `Wetness` (aus `MPC_Weather`), Puddle-Mask |
| `M_Facade_Master` | OSM-Gebäudefassaden | Tiling, Fenster-Reihen-Param, Stockwerkshöhe, Dirt |
| `M_Foliage_Master` | Bäume, Büsche, Gras | Subsurface, Wind (WPO), Translucency |
| `M_VehiclePaint` | Autolack | Farbe (instanzierbar), Clearcoat, Metallic |
| `M_Glass` | Fenster, Windschutzscheibe | Refraction, Roughness, Wetness |
| `M_Emissive` | Ampeln, Laternen, Displays | EmissiveColor, Intensity (an/aus) |

Alle konkreten Materialien sind **Material-Instanzen** dieser Master — keine
Einzelmaterialien. Das hält Shader-Permutationen klein und Wetter global
steuerbar.

### 8.2 Wetter-Integration
- **`MPC_Weather`** (Material Parameter Collection) mit `Wetness` (0–1) und
  `RainIntensity`.
- `M_Surface_Master` liest `Wetness`: erhöht Reflexion, senkt Roughness, blendet
  Pfützen über eine Höhen-/Distanzfeld-Maske ein.
- Ein einziger Schreibzugriff (`BP_WeatherController`) macht die ganze Welt
  nass — ersetzt die per-Material-Umschaltung des Prototyps
  (`cfg.weather==='rain' ? Standard : Lambert`).

### 8.3 Megascans-Integration
Megascans-Surfaces werden auf `M_Surface_Master` umgestellt (statt ihres
mitgelieferten Materials), damit sie die Wetter-Parameter erben.

---

## 9. Ordnerstruktur & Namenskonventionen

### 9.1 Content-Ordnerbaum
```
/Content
  /Cologne                      ← projektspezifisch
    /Core                       ← GameMode, GameInstance, SaveGame
    /Data
        DT_Route                ← Strecke (aus Prototyp)
        DT_SpeedLimits
        DT_NavAnnouncements
        MPC_Weather
    /Route                      ← BP_RouteSpline, Spline-Meshes, Kreuzungen
    /PCG                        ← PCG-Graphs, gestreute Assets
    /Buildings
        /OSM_Baked              ← importierte OSM-Gebäude (Nanite)
        /Modular                ← modulare Fassaden-Teile
    /Heroes
        /Altbaumburgweg2
        /OmaHaus
        /Stadium
        /Vehicle_GolfSportsvan
    /Lighting                   ← Presets Tag/Nacht/Regen, Sky, PostProcess
    /Weather                    ← Niagara-Regen, Wet-Funktionen
    /Vehicles                   ← Verkehr (BP_TrafficVehicle)
    /Characters                 ← Fußgänger, Zuschauer
    /Gameplay
        /Football               ← BP_MatchSim, Stadion-Sub-Level-Assets
        /PressConf              ← Sequencer, Props
        /OmaGame                ← WBP_RockPaperScissors
        /Traffic                ← Ampeln, Manager
    /UI                         ← WBP_HUD, Menüs, Minimap
    /Audio                      ← MetaSounds, Voice-Clips, Crowd
    /Materials                  ← Master-Materialien + Instanzen
  /External                     ← Megascans/Fab (unverändert)
/SourceData                     ← NICHT im Build: .blend, .osm, Referenzfotos
```

### 9.2 Namenskonventionen (Epic-Standard + Projektpräfix)
| Typ | Präfix | Beispiel |
|---|---|---|
| Blueprint | `BP_` | `BP_RouteSpline`, `BP_TrafficLight` |
| Widget Blueprint | `WBP_` | `WBP_HUD`, `WBP_RockPaperScissors` |
| Static Mesh | `SM_` | `SM_Curb_Straight`, `SM_House_Altbaumburgweg2` |
| Skeletal Mesh | `SK_` | `SK_Pedestrian_A` |
| Material | `M_` | `M_Surface_Master` |
| Material Instance | `MI_` | `MI_Asphalt_Wet`, `MI_Facade_Brick01` |
| Texture | `T_` | `T_Asphalt_D` (D/N/R/ORM-Suffixe) |
| Niagara System | `NS_` | `NS_Rain` |
| MetaSound | `MS_` | `MS_EngineLoop` |
| Sound Cue/Wave | `SC_`/`SW_` | `SW_Whistle_Long` |
| Data Table | `DT_` | `DT_Route` |
| Level | `L_` | `L_Master`, `L_Stadium_Match` |
| PCG Graph | `PCG_` | `PCG_StreetFurniture` |
| Niagara/MPC | `NS_`/`MPC_` | `MPC_Weather` |

**Textur-Suffixe:** `_D` Diffuse/BaseColor, `_N` Normal, `_ORM`
(Occlusion/Roughness/Metallic gepackt), `_E` Emissive, `_M` Maske.

---

## 10. Technische Standards

| Aspekt | Standard |
|---|---|
| **Maßstab** | 1 Welt-Einheit = 1 cm. 1 m real = 100 uu. Blender mit Unit-Scale 0.01 exportieren. |
| **Up-Achse** | UE: Z-up. Beim glTF/FBX-Export Achsen korrekt mappen (Blender Y-Forward, Z-Up). |
| **Pivot** | Gebäude: Bodenmitte. Fahrzeug: Bodenkontakt-Mitte, +X vorne. Modulare Teile: Grid-Ecke. |
| **Nanite** | An für statische Gebäude/Hero-Geometrie. Aus für: Foliage mit WPO-Wind (prüfen), transluzente Materialien, bewegte Skeletals. |
| **LODs** | Nur für Nicht-Nanite (Foliage, Fahrzeuge, Charaktere): 3–4 LOD-Stufen, Auto-Generate + manuelle Kontrolle. |
| **Collision** | Hero/Fahrzeug: einfache Convex-Hulls (UCX_). Gebäude: „Use Complex as Simple" nur wenn nötig; bevorzugt simple Box/Convex. Straße: flache Boden-Collision. |
| **Lightmaps** | Bei reiner Lumen-Beleuchtung meist keine Baked-Lightmaps nötig; falls statische Bake-Bereiche, eigener Lightmap-UV-Kanal. |
| **Texturgröße** | Hero: bis 4K. Tiling-Surfaces: 2K. Props: 1K–2K. Konsistente Texel-Dichte (~5–10 px/cm). |
| **Polycount** | Mit Nanite unkritisch für Statik; Foliage/Charaktere budgetiert (Crowd-Member niedrig). |
| **Naming-Slots** | Material-Slots im DCC sinnvoll benennen → klare Zuordnung im Import. |

---

## 11. Versionskontrolle & Datenhaltung

### 11.1 Repository-Strategie
- **Empfehlung Perforce (Helix Core):** Industriestandard für UE-Binärassets,
  exklusives Checkout (verhindert Merge-Konflikte bei `.uasset`). Helix Core
  ist für kleine Teams kostenlos (bis 5 User).
- **Alternative Git + Git LFS:** funktioniert, aber `.uasset`/`.umap` sind
  binär und nicht mergebar → **File-Locking** über LFS nutzen, Disziplin nötig.
  Für ein 2-Personen-Team mit klarer Bereichstrennung machbar.

### 11.2 Was wohin
| Inhalt | Ort | Versioniert? |
|---|---|---|
| `.uasset`, `.umap` | `/Content` | ja (LFS/Perforce) |
| Quell-`.blend`, `.osm`, Referenzfotos | `/SourceData` | ja, aber **nicht** im Build/Cook |
| `DerivedDataCache`, `Intermediate`, `Saved`, `Binaries` | — | **nein** (`.gitignore`) |
| Engine | extern | nein (Version dokumentiert) |

### 11.3 .gitignore / Ignorier-Regeln
Standard-UE-Ignore: `Binaries/`, `Build/`, `DerivedDataCache/`, `Intermediate/`,
`Saved/`, `*.sln`, `.vs/`. Nur `Content/`, `Config/`, `Source/`, `*.uproject`,
`/SourceData` (ggf. separat) werden versioniert.

### 11.4 Branching
- `main` = immer baubar/spielbar.
- Feature-Branches pro Aufgabe (bei Git). Bei Perforce: Streams oder schlicht
  Bereichs-Disziplin + Locking.
- Regelmäßige **integrierte Builds** als Meilenstein-Checkpoints.

---

## 12. Werkzeugkette & Automatisierung

### 12.1 WP-Export-Skript (Prototyp → DT_Route)
Ein kleines Node-/Python-Skript (`tools/export_route.mjs`):
1. liest `index.html`, extrahiert das `WP[]`-Array (Regex/Parse),
2. löst `ll(lat,lng)`-Aufrufe und literale `x,z` auf,
3. rechnet zu `lat/lng` zurück (inverse Formel),
4. schreibt `DT_Route.csv` mit Spalten gemäß [§2.4](#24-dt_route--die-strecke-als-daten).

So bleibt die Strecke **synchron** zum Prototyp und ist in UE per CSV→DataTable
importierbar.

### 12.2 OSM-Fetch-Skript
`tools/fetch_osm.sh`: feuert die Overpass-Abfrage (`around:120` entlang der
Route-Polyline, identisch zur Prototyp-Logik) und legt das Ergebnis unter
`/SourceData/OSM/cologne_corridor.osm` ab — reproduzierbarer Re-Import.

### 12.3 DCC-Tools
- **Blender** (+ `blender-osm`, glTF-Exporter) — Hauptmodelling & OSM-Veredelung.
- **Quixel Bridge / Fab** — Bibliotheks-Assets.
- **(optional) Houdini** — falls prozedurale Gebäude-/Straßen-Generierung
  ausgebaut wird (Stretch).

### 12.4 Editor-Utilities in UE5
- **„Rebuild Route"** (Editor Utility Widget): regeneriert Spline-Meshes nach
  `DT_Route`-Änderung.
- **„Place Heroes"**: setzt Hero-Assets per `GeoToWorld` an ihre Koordinaten.
- **„Validate Assets"**: prüft Namenskonventionen, Nanite-Flags, Collision,
  fehlende Materialien (siehe §13).

---

## 13. Import-Checkliste & Validierung

Beim Import **jedes** Assets durchgehen:

- [ ] **Maßstab** korrekt (1 m = 100 uu) — Referenzwürfel zum Abgleich.
- [ ] **Pivot/Origin** an der vereinbarten Stelle.
- [ ] **Achsen** richtig (Auto fährt +X voraus, steht aufrecht).
- [ ] **Naming** entspricht Konvention (§9.2), im richtigen Ordner (§9.1).
- [ ] **Material-Slots** zugewiesen, Instanzen vom richtigen Master (§8).
- [ ] **Nanite** korrekt an/aus (§10).
- [ ] **Collision** vorhanden & sinnvoll (nicht „Complex" wo „Simple" reicht).
- [ ] **LODs** (nur Nicht-Nanite) generiert.
- [ ] **Texturen** richtige Suffixe, ORM gepackt, sRGB-Flag korrekt
      (BaseColor sRGB an; Normal/ORM sRGB aus).
- [ ] **Georeferenz**: an korrekter Welt-Position (für platzierte Assets).
- [ ] **Performance**: Draw-Calls/Instancing geprüft, keine Material-Explosion.

> Diese Checkliste idealerweise als automatisierter „Validate Assets"-Editor-
> Utility umsetzen, der Verstöße meldet — bei zwei Personen Gold wert.

---

## Anhang A — Mapping Prototyp-Funktion → Pipeline-Schritt

| Prototyp | Pipeline-Quelle | Dokument-Abschnitt |
|---|---|---|
| `WP[]`, `ll()` | Georeferenz + DT_Route | §2 |
| `buildRoute()`, `roadGeo()` | Spline-Meshes | §4.1 |
| `buildTrees()`, `buildStreetLamps()` | PCG-Streuung | §4.2/4.3 |
| `makeStreetSigns()` | Bibliothek + PCG | §4.2 / §7 |
| `loadOSM()`, `buildOSMBuildings()`, `makeFacadeTex()` | OSM-Import + Fassaden-Material | §5 / §8 |
| `buildHomePark()` | Hero: Altbaumburgweg 2 | §6 |
| `buildOmaStop()` | Hero: Oma-Haus | §6 |
| `buildStadium()`, `buildStadiumAtmosphere()` | Hero: Stadion | §6 |
| Cockpit-Render (`drawCockpit` etc.) | Hero: Fahrzeug + UI | §6.3 / Konzept §8 |
| `applyNightMode()`, `buildRain()`, `setupComposer()` | Lighting/Weather/Material | §8.2 / Konzept §5 |

---

*Lebendes Dokument — wird in der Vorproduktion (Meilenstein M0) gegen die
ersten echten Importe geschärft.*
