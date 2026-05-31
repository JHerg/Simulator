# Einsteiger-Anleitung: Von Null zu Unreal Engine 5 (Windows)

> Für **Cologne Drive** (UE5-Neuauflage). Geschrieben für jemanden, der bisher
> nur im Browser (HTML) gearbeitet hat. Jeder Schritt einzeln, mit dem, was du
> sehen solltest, und einem Troubleshooting-Teil am Ende.
>
> **Dein Rechner:** Minisforum UM790 Pro (AMD Ryzen 9 7940HS, Radeon 780M).
> Reicht zum Lernen & Bauen. Wir entwickeln mit reduzierten Grafikeinstellungen.

---

## Überblick: Was wir installieren und warum

| Programm | Wofür | Wann nötig |
|---|---|---|
| **AMD-Treiber (Adrenalin)** | Aktuelle Grafiktreiber – wichtig für Stabilität von UE5 auf der Radeon | **Zuerst** |
| **GitHub Desktop** | Holt unsere Projektdateien aus GitHub auf deinen PC (ohne Kommandozeile) | Jetzt |
| **Epic Games Launcher + Unreal Engine 5.4** | Die Spiel-Engine selbst | Jetzt (großer Download) |
| **Visual Studio 2022 Community** | Compiler für den C++-Teil unseres Projekts | Bald (wenn wir Code einbauen) |
| **Node.js** | Um unser Strecken-Export-Skript laufen zu lassen | Optional / später |

Plane für die Downloads **mehrere Stunden** ein (UE5 allein sind viele GB). Du
kannst die Downloads anstoßen und nebenbei etwas anderes machen.

---

## Schritt 0 — Rechner prüfen (5 Minuten)

### 0a. Wie viel RAM und Speicherplatz habe ich?
1. Drücke `Strg` + `Umschalt` + `Esc` → der **Task-Manager** öffnet sich.
2. Reiter **„Leistung"** anklicken.
   - **Arbeitsspeicher:** Steht da **32,0 GB** (oder mehr)? Gut. Bei nur 16 GB
     wird UE5 zäh – dann später Aufrüsten überlegen, aber zum Lernen geht's.
   - **Datenträger (C:):** Du brauchst **mindestens 100 GB frei**. Im Explorer
     unter „Dieser PC" siehst du den freien Speicher der Laufwerke.

### 0b. Grafiktreiber aktualisieren (wichtig!)
1. Gehe auf **https://www.amd.com/de/support** (oder such „AMD Adrenalin Download").
2. Lade die **AMD Software: Adrenalin Edition** herunter und installiere sie.
3. Öffne sie, lass sie nach Updates suchen, installiere den neuesten Treiber,
   **starte den PC neu**.
   > Warum: UE5 stürzt auf veralteten Radeon-Treibern gern ab. Das ist die
   > häufigste Anfänger-Fehlerquelle – einmal richtig machen, dann Ruhe.

---

## Schritt 1 — GitHub Desktop installieren & Projekt holen (15 Min)

So kommen unsere Dateien (die wir zusammen erstellt haben) auf deinen PC – ganz
ohne Kommandozeile.

1. Gehe auf **https://desktop.github.com** → **Download for Windows**.
2. Installiere und starte **GitHub Desktop**.
3. **Sign in** → melde dich mit deinem GitHub-Konto an (dasselbe, in dem unser
   Projekt liegt).
4. Oben links: **File → Clone repository**.
5. Wähle das Repository **`Simulator`** aus der Liste.
6. **Local path:** lass den Vorschlag (z. B.
   `C:\Users\DEINNAME\Documents\GitHub\Simulator`) oder wähle einen Ordner.
   Merke dir diesen Pfad!
7. **Clone** klicken.

**Was du sehen solltest:** Im gewählten Ordner liegen jetzt `index.html`
(unser Browserspiel), der Ordner `docs/` und der Ordner `ue5/` – genau die
Dateien, die wir erstellt haben.

> **Wichtig zum Verständnis:** „Clonen" = eine Kopie des Projekts auf deinen PC
> holen. Später, wenn du etwas änderst, kannst du es in GitHub Desktop mit
> **Commit** + **Push** wieder hochladen – so wie wir es bisher gemacht haben,
> nur mit Mausklicks.

---

## Schritt 2 — Unreal Engine installieren (1–3 Std. Download)

1. Gehe auf **https://www.epicgames.com/store/download** → lade den
   **Epic Games Launcher** herunter und installiere ihn.
2. Starte den Launcher, **erstelle ein kostenloses Epic-Konto** (oder logge dich
   ein).
3. Im Launcher links auf **„Unreal Engine"** klicken.
4. Oben den Reiter **„Bibliothek"** (Library) wählen.
5. Neben **„ENGINE-VERSIONEN"** auf das **`+`** klicken.
6. Wähle Version **5.4** (oder die neueste 5.4.x) → **Installieren**.
   - **Speicherort:** Standard ist okay (braucht ~40–60 GB).
   - **Optionale Komponenten:** „Engine Source" und „Debug-Symbole" kannst du
     für den Anfang **abwählen** (spart viel Platz).
7. Warten, bis der Download fertig ist. ☕

**Was du sehen solltest:** Unter „Engine-Versionen" steht **5.4** mit einem
**„Starten"**-Button.

---

## Schritt 3 — Dein erstes Erfolgserlebnis: ein Auto fahren (30 Min)

Bevor wir unser Projekt aufbauen, machen wir UE5 einmal „live", damit du siehst,
dass alles funktioniert. Wir nehmen eine **Fahrzeug-Vorlage**, in der schon ein
fahrbares Auto steckt.

1. Im Epic Launcher bei Version 5.4 auf **„Starten"** klicken.
2. Es öffnet sich der **Unreal Project Browser**. Wähle links **„Games"**.
3. Wähle die Vorlage **„Vehicle"** (ein Auto-Symbol).
4. Rechts die Einstellungen:
   - **Blueprint** (nicht C++) auswählen → für den ersten Test brauchst du
     keinen Compiler.
   - **Target Platform:** Desktop.
   - **Quality Preset:** **Scalable** (wichtig für deine Grafik!).
   - **Starter Content:** angehakt lassen.
   - **Project Name:** z. B. `LernAuto` (das ist nur ein Test-Projekt zum
     Üben – kann später weg).
   - **Location:** irgendwo, z. B. `C:\Users\DEINNAME\Documents\Unreal Projects`.
5. **Create** klicken.

> ⏳ **Geduld beim ersten Start:** UE kompiliert beim ersten Öffnen sehr viele
> „Shader". Das kann auf deinem Rechner **10–30 Minuten** dauern und alles wirkt
> langsam – das ist **einmalig** und normal. Nicht abbrechen.

6. Wenn der Editor offen ist: oben Mitte den **▶ Play**-Knopf drücken.
7. Steuere das Auto mit **W A S D** / Pfeiltasten. 🚗

**Geschafft!** Du hast Unreal Engine installiert und ein Auto bewegt. Mit
`Esc` oder dem Stop-Knopf beendest du den Play-Modus.

### Falls es ruckelt (sehr wahrscheinlich auf der Radeon 780M)
Das ist erwartbar und behebbar:
1. Menü oben: **Settings (Einstellungen) → Engine Scalability Settings**.
2. Stelle alles auf **„Medium"** oder **„Low"**.
3. Optional: im Viewport oben links auf den Pfeil → **Viewport-Auflösung**
   reduzieren.
Das macht den Editor flüssiger. Für die Entwicklung brauchst du keine maximale
Grafik – die schalten wir nur fürs fertige Spiel hoch.

---

## Schritt 4 — Visual Studio 2022 (für später, kann aber jetzt schon)

Unser Projekt nutzt etwas **C++-Code** (die Strecken-Logik). Dafür braucht
Windows einen Compiler: **Visual Studio 2022 Community** (kostenlos).

> Du brauchst das **noch nicht** zum Auto-Fahren oder zum ersten Reinschauen.
> Aber sobald wir den Code-Teil einbauen, ist es nötig. Du kannst es jetzt schon
> im Hintergrund installieren.

1. Gehe auf **https://visualstudio.microsoft.com/de/downloads/** → bei
   **Visual Studio Community 2022** auf **Kostenloser Download**.
2. Starte den Installer. Bei **„Workloads"** (Arbeitslasten) **ankreuzen:**
   - ✅ **Spieleentwicklung mit C++** (Game development with C++)
   - ✅ **Desktopentwicklung mit C++** (Desktop development with C++)
3. Rechts unter „Installationsdetails" prüfen, dass beim Spiele-Workload
   **„Unreal Engine-Installationsprogramm"** mit angehakt ist (meist
   automatisch).
4. **Installieren** klicken. (Großer Download, läuft im Hintergrund.)

---

## Schritt 5 — Node.js (optional, für das Strecken-Skript)

Nur nötig, wenn **du selbst** das Export-Skript laufen lassen willst (z. B.
nachdem du die Strecke im Browserspiel geändert hast).

1. Gehe auf **https://nodejs.org** → lade die **LTS**-Version → installiere
   (einfach „Weiter, Weiter, Fertig").
2. Skript ausführen: GitHub Desktop → Menü **Repository → Open in Command
   Prompt**, dann tippen:
   ```
   node ue5/Tools/export_route.mjs
   ```
   Es schreibt `ue5/Source/Data/DT_Route.csv` neu.

---

## Wie es danach weitergeht (nächste Session zusammen)

Wenn das alles installiert ist und du einmal ein Auto gefahren hast, bauen wir
**unser** Projekt auf. Das machen wir gemeinsam Schritt für Schritt:

1. **Unser Projekt anlegen** (`CologneDrive`) – als C++-Projekt, gespeichert im
   geclonten `Simulator`-Ordner, damit es über GitHub gesichert ist.
2. **Strecke importieren:** `DT_Route.csv` als „DataTable" in UE laden.
3. **Strecken-Spline bauen** (`BP_RouteSpline`): liest die 34 Wegpunkte und
   zeichnet die Straße – die erste befahrbare Greybox-Strecke durch Köln.

Diese Schritte schreibe ich dir genauso ausführlich auf, sobald du hier durch
bist. **Sag mir einfach, wenn ein Schritt klemmt** – wir gehen das in deinem
Tempo durch.

---

## Troubleshooting (häufige Anfänger-Stolpersteine)

| Problem | Lösung |
|---|---|
| **Editor stürzt beim Start ab** | AMD-Treiber aktualisieren (Schritt 0b), PC neu starten. Häufigste Ursache. |
| **Alles superlangsam beim ersten Öffnen** | Shader-Kompilierung läuft (einmalig). Warten, nicht abbrechen. |
| **Dauerhaft ruckelig** | Engine Scalability auf Low/Medium (Schritt 3), Viewport-Auflösung runter, andere Programme schließen. |
| **„Out of video memory" / Absturz in großen Szenen** | Die iGPU teilt sich RAM als Grafikspeicher. Scalability runter, kleinere Szenen, evtl. im BIOS den iGPU-Speicher („UMA Frame Buffer Size") erhöhen. |
| **Festplatte voll** | UE + Cache fressen viel. Engine-Debug-Symbole abwählen, „DerivedDataCache" liegt im Projekt – Platz schaffen. |
| **GitHub Desktop zeigt das Repo nicht** | Bist du mit dem richtigen Konto eingeloggt? Sonst „Clone repository → URL" und die Repo-Adresse einfügen. |
| **Visual Studio wird nicht erkannt** | In UE: Edit → Editor Preferences → „Source Code" → als IDE „Visual Studio 2022" wählen. |

---

## Glossar (kurz erklärt)

- **Engine:** Das Programm, das das Spiel berechnet & darstellt (hier UE5). Im
  Browser war das die Three.js-Bibliothek – jetzt ein vollwertiges Programm.
- **Editor:** Die Benutzeroberfläche von UE5, in der du das Spiel baust.
- **Projekt / `.uproject`:** Dein konkretes Spiel (Dateien, Inhalte, Code).
- **Blueprint:** Visuelles Programmieren in UE per Knoten-Verbindungen (statt
  Text-Code) – fast wie ein Flussdiagramm.
- **C++:** Textbasierte Programmiersprache für die „schweren" Systeme.
- **DataTable:** Eine Tabelle in UE (wie eine Excel-Tabelle) – hier unsere
  Strecke aus `DT_Route.csv`.
- **Spline:** Eine Kurvenlinie – damit zeichnen wir die Straße entlang der
  Wegpunkte.
- **Greybox:** Erste, graue Rohversion ohne schöne Grafik – zum Testen des
  Aufbaus.
- **Commit / Push:** Änderungen sichern (Commit) und hochladen (Push) – wie
  bisher, jetzt per GitHub Desktop.
