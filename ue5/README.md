# Cologne Drive — UE5-Neuauflage

Zweites Spiel auf Basis des Browser-Fahrsimulators (`../index.html`):
gleiche Strecke, gleiche Story, gleiche Minispiele — fotorealistisch in
**Unreal Engine 5** (Lumen / Nanite / World Partition).

> **Status:** Vorproduktion / Scaffold. Das eigentliche `.uproject` und die
> Binärassets entstehen lokal (UE5 läuft nicht in dieser Umgebung). Dieser
> Ordner enthält das **datengetriebene Fundament**, das von Anfang an stimmen
> muss — Strecke, Geo-Konvertierung, Projektkonventionen.

## Konzept & Einstieg

- **🟢 Erste Schritte am PC (Einsteiger, Windows):** [`SETUP_WINDOWS.md`](./SETUP_WINDOWS.md)
  — von Null: UE5 installieren, Tools, erstes Auto fahren.
- **Gesamtkonzept:** [`../docs/UNREAL_KONZEPT.md`](../docs/UNREAL_KONZEPT.md)
- **Asset-Pipeline (Detail):** [`../docs/ASSET_PIPELINE.md`](../docs/ASSET_PIPELINE.md)

## Was hier schon liegt

```
ue5/
├── README.md                  ← dieses Dokument
├── .gitignore                 ← UE5-Ignore (Binaries/Intermediate/Saved/…)
├── .gitattributes             ← Git-LFS-Tracking für .uasset/.umap/Texturen/…
├── Config/
│   └── DefaultEngine.ini       ← Lumen/Nanite/TSR-Defaults + Georeferenz-Doku
├── Tools/
│   └── export_route.mjs        ← Brücke Prototyp → UE5 (WP[] → DT_Route.csv)
└── Source/
    ├── Data/
    │   ├── DT_Route.csv          ← generierte Strecke (34 WP) für UE-DataTable
    │   └── Route.geojson         ← LineString zur Sichtkontrolle (geojson.io)
    └── CologneDrive/Public/
        ├── Route/RouteWaypoint.h     ← Row-Struct FRouteWaypoint (Starter-C++)
        └── Geo/GeoConvertLibrary.h   ← GPS↔Welt-Konvertierung (Starter-C++)
```

## Die Brücke: `export_route.mjs`

Der Prototyp bleibt **Source of Truth** für Strecke & Story. Das Skript liest
das `WP[]`-Array und die `LIMITS`-Tabelle direkt aus `../index.html` und erzeugt
`Source/Data/DT_Route.csv` (UE5-DataTable-Format) + `Route.geojson`.

```bash
node ue5/Tools/export_route.mjs
```

Ergebnis aktuell: **34 Wegpunkte, 14 Straßen, 5 Ampeln**, Altbaumburgweg 2 →
RheinEnergie-Stadion. Ändert sich die Strecke im Prototyp, einfach neu laufen
lassen — die UE5-Daten bleiben synchron.

`DT_Route.csv`-Spalten = Felder von `FRouteWaypoint`:
`Index, Street, Lat, Lng, Width, HasTrafficLight, RoundaboutExit, SpeedLimit, POI`.

## Koordinatensystem (verbindlich)

| | Wert |
|---|---|
| Ursprung (0,0,0) | Altbaumburgweg 2, Köln — `LAT0=50.9674, LNG0=6.9382` |
| Meter/° Breite | `111320` |
| Meter/° Länge | `111320 · cos(LAT0)` ≈ `70030` |
| Einheit | UE: 1 uu = 1 cm → `Meter × 100` |

Konvertierung **ausschließlich** über `UGeoConvertLibrary` (siehe
`Source/.../Geo/GeoConvertLibrary.h`). Niemals woanders hartcodieren.

## Nächste Schritte (Meilenstein M0 → M1)

1. **UE5-Projekt anlegen** (Vehicle-Template, UE 5.4 LTS), diesen `ue5/`-Ordner
   als Projekt-Root verwenden; `Config/DefaultEngine.ini` übernehmen.
2. **`git lfs install`** + erste `Content/`-Commits über LFS.
3. **`DT_Route.csv` importieren** als DataTable mit Row-Struct `FRouteWaypoint`.
4. **`BP_RouteSpline`** bauen: liest `DT_Route`, erzeugt Spline via
   `GeoToWorld()`, instanziert Spline-Mesh-Straße → **Greybox befahrbar**.
5. Achsen-Vorzeichen (UE.Y) **einmal verifizieren** und fixieren.

## Später auslagern

Dieser Ordner ist so geschnitten, dass er sich mit voller Git-Historie in ein
eigenes Repo lösen lässt:

```bash
git subtree split --prefix=ue5 -b cologne-drive-ue5
# dann in neues Repo pushen
```
