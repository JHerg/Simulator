// Cologne Drive (UE5) — Row-Struct der Straßennetz-DataTable (DT_Roads).
//
// HINWEIS: Starter-Code. Wird wirksam, sobald das echte UE5-Projekt (.uproject)
// als C++-Modul kompiliert wird. Außerhalb von UE nicht baubar (Engine-Header).
//
// Spalten entsprechen exakt der von Tools/export_osm_roads.mjs erzeugten
// DT_Roads.csv. CSV-Header → UE-DataTable-Import (Row-Struct = FRoadSegment).
//
// Eine Zeile = eine Straße (OSM-Way). Die Stützpunkte stecken als kompakter
// String in `Points` ("x0:y0|x1:y1|...", Welt-cm), den BP_RoadNetwork beim
// Bau in Spline-Punkte zerlegt. So bleibt die DataTable flach, obwohl jede
// Straße beliebig viele Punkte hat.

#pragma once

#include "CoreMinimal.h"
#include "Engine/DataTable.h"
#include "RoadSegment.generated.h"

USTRUCT(BlueprintType)
struct FRoadSegment : public FTableRowBase
{
    GENERATED_BODY()

    // Straßenname aus OSM (kann leer sein, z. B. bei Service-Wegen).
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString StreetName;

    // OSM-highway-Typ (residential, primary, ...). Bestimmt u. a. die Breite.
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString Highway;

    // Fahrbahnbreite in Metern (Spline-Mesh-Skalierung).
    UPROPERTY(EditAnywhere, BlueprintReadOnly) float Width = 6.f;

    // Stützpunkte in UE-Welt-cm, kodiert als "x0:y0|x1:y1|...".
    // BP_RoadNetwork: ParseIntoArray("|") → je Punkt ParseIntoArray(":") → Vector.
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString Points;
};
