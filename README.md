# 🚗 Köln Fahrsimulator
### Altbaumburgweg, Bilderstöckchen → RheinEnergie Stadion

Ein browserbasierter 3D-Fahrsimulator aus der Cockpitperspektive durch Kölner Straßen.

## ▶️ Starten

`index.html` im Browser öffnen – kein Server, kein Build-Schritt nötig.

> Empfohlen: Chrome/Edge für beste WebGL-Performance.

## 🗺️ Route

| # | Straße / Ort |
|---|---|
| 1 | Altbaumburgweg *(Start)* |
| 2 | Görlinger Str. |
| 3 | Nußbaumer Str. |
| 4 | Venloer Str. (Nord) |
| 5 | Ossendorfer Weg |
| 6 | Militärringstr. |
| 7 | Aachener Str. / Gürtel |
| 8 | Universitätsstr. |
| 9 | Aachener Str. West |
| 10 | **RheinEnergie Stadion 🏟️** *(Ziel)* |

## 🎮 Steuerung

| Taste | Funktion |
|-------|----------|
| ↑ / W | Gas geben |
| ↓ / S | Bremsen |
| ← / A | Links lenken |
| → / D | Rechts lenken |
| Space | Handbremse |
| R | Neustart |

**Gamepad/Joystick:** Automatisch erkannt – Linker Stick = Lenkung, RT = Gas, LT = Bremse.  
**Thrustmaster-Lenkrad:** Über Gamepad API erkannt (Achse 0 = Lenkung).

## 🔧 Roadmap

- [ ] Thrustmaster Force-Feedback
- [ ] Tag/Nacht-Zyklus + Straßenlampen
- [ ] Kreuzungen mit Ampeln
- [ ] Gegenverkehr
- [ ] Gebäude-Texturen
- [ ] Motor-Audio
- [ ] Echte OSM-Straßendaten