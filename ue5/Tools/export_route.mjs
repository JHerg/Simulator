#!/usr/bin/env node
/**
 * export_route.mjs — Brücke Prototyp → UE5
 * ----------------------------------------
 * Liest das WP[]-Array und die LIMITS-Tabelle aus dem Browser-Prototyp
 * (../../index.html) und erzeugt daraus:
 *
 *   1. DT_Route.csv   — UE5-DataTable (Row-Struct FRouteWaypoint)
 *   2. Route.geojson  — LineString der Strecke (Kontrolle in QGIS/geojson.io)
 *
 * Die Strecke bleibt damit die "Source of Truth" des Prototyps; ändert sich
 * dort das WP[]-Array, regeneriert dieses Skript die UE5-Daten 1:1.
 *
 * Aufruf:  node ue5/Tools/export_route.mjs
 *
 * Koordinatensystem (identisch zum Prototyp):
 *   LAT0 = 50.9674, LNG0 = 6.9382   (Altbaumburgweg 2, Köln = Welt-Ursprung)
 *   ll(lat,lng) -> { x:(lng-LNG0)*mLng, z:(LAT0-lat)*mLat }   [Meter]
 *   invers:  lat = LAT0 - z/mLat,  lng = LNG0 + x/mLng
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC   = resolve(__dirname, '../../index.html');
const OUTDIR = resolve(__dirname, '../Source/Data');

// ── Geo-Konstanten (müssen mit index.html übereinstimmen) ────────────────────
const LAT0 = 50.9674, LNG0 = 6.9382;
const mLat = 111320;
const mLng = mLat * Math.cos(LAT0 * Math.PI / 180);

// ── 1. Quelldatei einlesen & Blöcke extrahieren ──────────────────────────────
const html = readFileSync(SRC, 'utf8');

function extractBlock(startMarker, endMarker) {
  const i = html.indexOf(startMarker);
  if (i < 0) throw new Error(`Marker nicht gefunden: ${startMarker}`);
  const j = html.indexOf(endMarker, i);
  if (j < 0) throw new Error(`Endmarker nicht gefunden nach: ${startMarker}`);
  return html.slice(i, j + endMarker.length);
}

const wpBlock     = extractBlock('const WP = [', '\n];');
const limitsBlock = extractBlock('const LIMITS = {', '\n};');

// ── 2. In sicherer Sandbox auswerten (ll/LAT0/... werden bereitgestellt) ──────
const { WP, LIMITS } = new Function(`
  const LAT0 = ${LAT0}, LNG0 = ${LNG0};
  const mLat = ${mLat};
  const mLng = mLat * Math.cos(LAT0 * Math.PI / 180);
  function ll(lat, lng){ return { x:(lng-LNG0)*mLng, z:(LAT0-lat)*mLat }; }
  ${wpBlock}
  ${limitsBlock}
  return { WP, LIMITS };
`)();

const streetLimit = (s) => LIMITS[s] || 50;

// ── 3. Hilfen ────────────────────────────────────────────────────────────────
const toLat = (z) => +(LAT0 - z / mLat).toFixed(6);
const toLng = (x) => +(LNG0 + x / mLng).toFixed(6);
const pad2  = (n) => String(n).padStart(2, '0');

// Distanz zweier WP in Metern (euklidisch im lokalen Meter-Raum)
const segLen = (a, b) => Math.hypot(b.x - a.x, b.z - a.z);

// ── 4. DataTable-Zeilen bauen ────────────────────────────────────────────────
// Row-Struct FRouteWaypoint (siehe ue5/Source/.../FRouteWaypoint.h):
//   Index, Street, Lat, Lng, Width, HasTrafficLight, RoundaboutExit, SpeedLimit, POI
const rows = WP.map((wp, i) => ({
  Name:            `WP_${pad2(i)}`,
  Index:           i,
  Street:          wp.street,
  Lat:             toLat(wp.z),
  Lng:             toLng(wp.x),
  Width:           wp.width ?? 8,
  HasTrafficLight: !!wp.tl,
  RoundaboutExit:  wp.kv ?? 0,           // 0 = keine Kreisverkehr-Ausfahrt
  SpeedLimit:      streetLimit(wp.street),
  POI:             wp.name ? wp.name.replace(/[^\x20-\x7E]/g, '').trim() : '',
}));

// ── 5. CSV schreiben (UE5-DataTable-Format) ──────────────────────────────────
const headers = ['Name','Index','Street','Lat','Lng','Width',
                 'HasTrafficLight','RoundaboutExit','SpeedLimit','POI'];
const csvEsc = (v) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csv = [
  headers.join(','),
  ...rows.map(r => headers.map(h => csvEsc(r[h])).join(',')),
].join('\n') + '\n';

mkdirSync(OUTDIR, { recursive: true });
writeFileSync(resolve(OUTDIR, 'DT_Route.csv'), csv, 'utf8');

// ── 6. GeoJSON schreiben (Sichtkontrolle) ────────────────────────────────────
const geojson = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    properties: { name: 'Cologne Drive Route', waypoints: WP.length },
    geometry: {
      type: 'LineString',
      coordinates: WP.map(wp => [toLng(wp.x), toLat(wp.z)]),
    },
  }],
};
writeFileSync(resolve(OUTDIR, 'Route.geojson'), JSON.stringify(geojson, null, 2), 'utf8');

// ── 7. Zusammenfassung ───────────────────────────────────────────────────────
let total = 0;
for (let i = 0; i < WP.length - 1; i++) total += segLen(WP[i], WP[i + 1]);
const streets = [...new Set(WP.map(w => w.street))];

console.log('✅ Export abgeschlossen');
console.log(`   Wegpunkte:      ${WP.length}`);
console.log(`   Straßen:        ${streets.length}`);
console.log(`   Streckenlänge:  ${(total / 1000).toFixed(2)} km (Luftlinie der WP-Kette)`);
console.log(`   Ampeln:         ${WP.filter(w => w.tl).length}`);
console.log(`   Geschrieben:    ${resolve(OUTDIR, 'DT_Route.csv')}`);
console.log(`                   ${resolve(OUTDIR, 'Route.geojson')}`);
