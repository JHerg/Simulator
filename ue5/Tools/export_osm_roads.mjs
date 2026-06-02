#!/usr/bin/env node
/**
 * export_osm_roads.mjs — OSM-Straßennetz → UE5
 * --------------------------------------------
 * Wandelt einen OSM-Export (Overpass-API) in eine UE5-DataTable um, aus der
 * ein Blueprint (BP_RoadNetwork) das komplette Straßennetz als Spline-Meshes
 * zeichnet. Jede Straße = eine Zeile mit allen Stützpunkten in Welt-cm.
 *
 * Eingabe (eines von beiden, per Argument oder Auto-Erkennung):
 *   - Overpass-JSON  (Abfrage mit "out geom;")   → enthält way.geometry[]
 *   - GeoJSON         (FeatureCollection, LineString/MultiLineString)
 *
 * So holst du die OSM-Daten (kostenlos, im Browser):
 *   1. https://overpass-turbo.eu öffnen
 *   2. Diese Abfrage einfügen und "Ausführen":
 *        [out:json][timeout:60];
 *        way["highway"](around:1900,50.9674,6.9382);
 *        out geom;
 *   3. "Exportieren" → "rohe OSM-Daten / GeoJSON" → Datei speichern als
 *        ue5/Source/Data/osm_export.geojson   (oder .json)
 *
 * Aufruf:
 *   node ue5/Tools/export_osm_roads.mjs [pfad/zur/datei]
 *
 * Ausgabe:
 *   ue5/Source/Data/DT_Roads.csv   — UE5-DataTable (Row-Struct FRoadSegment)
 *   ue5/Source/Data/Roads.geojson  — Sichtkontrolle (geojson.io)
 *
 * Koordinatensystem identisch zu GeoConvertLibrary / export_route.mjs:
 *   LAT0=50.9674, LNG0=6.9382, mLat=111320, mLng=mLat*cos(LAT0)
 *   UE.X = (lng-LNG0)*mLng * 100   [cm]
 *   UE.Y = (LAT0-lat)*mLat * 100   [cm]
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTDIR = resolve(__dirname, '../Source/Data');

// ── Geo-Konstanten (müssen mit GeoConvertLibrary übereinstimmen) ─────────────
const LAT0 = 50.9674, LNG0 = 6.9382;
const mLat = 111320;
const mLng = mLat * Math.cos(LAT0 * Math.PI / 180);

// GPS → UE-Welt (cm)
const toX = (lng) => +(((lng - LNG0) * mLng) * 100).toFixed(1);
const toY = (lat) => +(((LAT0 - lat) * mLat) * 100).toFixed(1);

// ── Straßenbreite (m) je highway-Typ → für Spline-Mesh-Skalierung ────────────
const WIDTH = {
  motorway: 14, motorway_link: 7, trunk: 12, trunk_link: 7,
  primary: 11, primary_link: 6, secondary: 9, secondary_link: 6,
  tertiary: 8, tertiary_link: 5, unclassified: 6, residential: 6,
  living_street: 5, service: 4, pedestrian: 4, track: 3,
  footway: 2, path: 2, cycleway: 2, steps: 2,
};
const widthFor = (hw) => WIDTH[hw] ?? 6;

// Nur befahrbare/sichtbare Wege übernehmen (Fußwege optional)
const KEEP = new Set(Object.keys(WIDTH));

// ── 1. Eingabedatei finden ───────────────────────────────────────────────────
const argPath = process.argv[2];
const candidates = argPath ? [resolve(argPath)] : [
  resolve(OUTDIR, 'osm_export.geojson'),
  resolve(OUTDIR, 'osm_export.json'),
  resolve(OUTDIR, 'export.geojson'),
  resolve(OUTDIR, 'export.json'),
];
const SRC = candidates.find(existsSync);
if (!SRC) {
  console.error('❌ Keine OSM-Eingabedatei gefunden. Erwartet eine von:');
  candidates.forEach(c => console.error('   ' + c));
  console.error('\n   Siehe Kopf dieser Datei: Daten via overpass-turbo.eu exportieren.');
  process.exit(1);
}
console.log('📂 Eingabe:', SRC);

const raw = JSON.parse(readFileSync(SRC, 'utf8'));

// ── 2. Wege extrahieren → einheitliches Format [{name, highway, coords:[[lat,lng]]}] ──
let roads = [];

if (Array.isArray(raw.elements)) {
  // Overpass-JSON (out geom)
  for (const el of raw.elements) {
    if (el.type !== 'way' || !el.geometry) continue;
    const hw = el.tags?.highway;
    if (!hw || !KEEP.has(hw)) continue;
    roads.push({
      name: el.tags?.name || '',
      highway: hw,
      coords: el.geometry.map(p => [p.lat, p.lon]),
    });
  }
} else if (raw.type === 'FeatureCollection') {
  // GeoJSON
  for (const f of raw.features) {
    const hw = f.properties?.highway;
    if (!hw || !KEEP.has(hw)) continue;
    const name = f.properties?.name || '';
    const g = f.geometry;
    if (!g) continue;
    const lines = g.type === 'LineString' ? [g.coordinates]
               : g.type === 'MultiLineString' ? g.coordinates : [];
    for (const line of lines) {
      // GeoJSON ist [lng, lat]
      roads.push({ name, highway: hw, coords: line.map(c => [c[1], c[0]]) });
    }
  }
} else {
  console.error('❌ Unbekanntes Format (weder Overpass-JSON noch GeoJSON).');
  process.exit(1);
}

// Wege mit < 2 Punkten verwerfen
roads = roads.filter(r => r.coords.length >= 2);

if (roads.length === 0) {
  console.error('❌ Keine passenden Straßen im Export gefunden.');
  process.exit(1);
}

// ── 3. DataTable-Zeilen bauen ────────────────────────────────────────────────
// Row-Struct FRoadSegment:
//   Name (RowName), StreetName, Highway, Width, Points
//   Points = "x0:y0|x1:y1|..."  (Welt-cm, vom Blueprint geparst)
const pad4 = (n) => String(n).padStart(4, '0');
const csvEsc = (v) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const headers = ['Name', 'StreetName', 'Highway', 'Width', 'Points'];
const rows = roads.map((r, i) => {
  const pts = r.coords.map(([lat, lng]) => `${toX(lng)}:${toY(lat)}`).join('|');
  return {
    Name:       `Road_${pad4(i)}`,
    StreetName: r.name.replace(/[^\x20-\x7E]/g, '').trim(),
    Highway:    r.highway,
    Width:      widthFor(r.highway),
    Points:     pts,
  };
});

const csv = [
  headers.join(','),
  ...rows.map(r => headers.map(h => csvEsc(r[h])).join(',')),
].join('\n') + '\n';

mkdirSync(OUTDIR, { recursive: true });
writeFileSync(resolve(OUTDIR, 'DT_Roads.csv'), csv, 'utf8');

// ── 4. GeoJSON zur Sichtkontrolle schreiben ──────────────────────────────────
const geojson = {
  type: 'FeatureCollection',
  features: roads.map(r => ({
    type: 'Feature',
    properties: { name: r.name, highway: r.highway },
    geometry: { type: 'LineString', coordinates: r.coords.map(([lat, lng]) => [lng, lat]) },
  })),
};
writeFileSync(resolve(OUTDIR, 'Roads.geojson'), JSON.stringify(geojson), 'utf8');

// ── 5. Zusammenfassung ───────────────────────────────────────────────────────
const segLen = (a, b) => {
  const dx = (b[1] - a[1]) * mLng, dy = (a[0] - b[0]) * mLat;
  return Math.hypot(dx, dy);
};
let totalM = 0, totalPts = 0;
for (const r of roads) {
  totalPts += r.coords.length;
  for (let i = 0; i < r.coords.length - 1; i++) totalM += segLen(r.coords[i], r.coords[i + 1]);
}
const byType = {};
for (const r of roads) byType[r.highway] = (byType[r.highway] || 0) + 1;

console.log('✅ Export abgeschlossen');
console.log(`   Straßen:        ${roads.length}`);
console.log(`   Stützpunkte:    ${totalPts}`);
console.log(`   Gesamtlänge:    ${(totalM / 1000).toFixed(2)} km`);
console.log(`   Typen:          ${Object.entries(byType).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k}:${v}`).join(', ')}`);
console.log(`   Geschrieben:    ${resolve(OUTDIR, 'DT_Roads.csv')}`);
console.log(`                   ${resolve(OUTDIR, 'Roads.geojson')}`);
