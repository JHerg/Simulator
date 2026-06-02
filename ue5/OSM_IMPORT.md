# OSM-Straßennetz importieren (M1)

Ziel: das echte Straßennetz um Altbaumburgweg 2 (1 km-Radius) als befahrbare
Straßen in UE5. Ablauf in 3 Phasen — **Phase A machst du im Browser**, Phase B
übernimmt das Tool, **Phase C bauen wir gemeinsam in UE5**.

---

## Phase A — OSM-Daten exportieren (Browser, ~5 Min)

1. Öffne **https://overpass-turbo.eu**
2. Lösche den Beispiel-Text links und füge diese Abfrage ein:

   ```
   [out:json][timeout:60];
   way["highway"](around:1000,50.9674,6.9382);
   out geom;
   ```

   > `around:1000` = 1 km-Radius. Für mehr später: `2000` oder `5000`.

3. Klick **„Ausführen"** (▶). Rechts erscheint das Straßennetz auf der Karte —
   das ist dein Viertel.
4. Klick oben **„Exportieren"** → **„GeoJSON"** → Datei speichern.
5. Lege die Datei ab als:

   ```
   ue5/Source/Data/osm_export.geojson
   ```

   (im Repo-Ordner, damit GitHub Desktop sie sieht)

---

## Phase B — In UE5-Format umwandeln (Tool, automatisch)

Im Repo-Ordner ausführen:

```bash
node ue5/Tools/export_osm_roads.mjs
```

Erzeugt:
- `ue5/Source/Data/DT_Roads.csv` — die UE5-DataTable (eine Zeile je Straße)
- `ue5/Source/Data/Roads.geojson` — Sichtkontrolle (auf geojson.io prüfbar)

Das Tool rechnet jeden GPS-Punkt über dieselbe Formel wie `GeoConvertLibrary`
in Welt-Zentimeter um — alles deckungsgleich mit der Story-Route.

> **Hinweis:** Das Tool kann nicht in der Cloud-Umgebung laufen (OSM-API dort
> gesperrt). Es läuft lokal auf deinem PC, ODER du schickst mir die
> `osm_export.geojson` und ich erzeuge die CSV hier.

---

## Phase C — Straßennetz in UE5 bauen (gemeinsam)

1. **DT_Roads.csv importieren** als DataTable mit Row-Struct `FRoadSegment`
   (Struktur analog zu `S_RouteWaypoint`, Felder: StreetName, Highway, Width, Points).
2. **BP_RoadNetwork** (Actor mit Spline) bauen — Logik:
   - ForEach Zeile in DT_Roads
   - `Points` per `ParseIntoArray("|")` in Punkt-Strings zerlegen
   - je Punkt `ParseIntoArray(":")` → X, Y → `Make Vector(X, Y, 0)`
   - Spline-Punkte setzen → Spline-Mesh (Asphalt) entlang ziehen
3. **World Partition** für das Gebiet aktivieren.
4. Vehicle platzieren → **durch das echte Bilderstöckchen fahren**.

Das ist fast dasselbe Blueprint wie BP_RouteSpline — nur mit einer äußeren
Schleife über alle Straßen statt einer einzelnen Route.

---

## Wichtig: nach jeder UE5-Session committen!

Sobald in UE5 etwas erstellt wurde (Blueprint, Level, DataTable, Assets):

1. UE5: **Strg+S** (Alles speichern)
2. GitHub Desktop: Änderungen committen **bevor** Branch gewechselt wird
3. Push

Sonst gehen die `.uasset`-Dateien beim Branch-Wechsel verloren.
