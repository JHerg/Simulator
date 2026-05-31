// Cologne Drive (UE5) — Row-Struct der Strecken-DataTable (DT_Route).
//
// HINWEIS: Starter-Code. Wird wirksam, sobald das echte UE5-Projekt (.uproject)
// angelegt ist und dieser Ordner als C++-Modul kompiliert wird. Außerhalb von
// UE lässt sich das nicht bauen (referenziert Engine-Header) — das ist gewollt.
//
// Spalten entsprechen exakt der von Tools/export_route.mjs erzeugten
// DT_Route.csv. CSV-Header → UE-DataTable-Import (Row-Struct = FRouteWaypoint).

#pragma once

#include "CoreMinimal.h"
#include "Engine/DataTable.h"
#include "RouteWaypoint.generated.h"

USTRUCT(BlueprintType)
struct FRouteWaypoint : public FTableRowBase
{
    GENERATED_BODY()

    // Reihenfolge entlang der Strecke (0 = Start Altbaumburgweg).
    UPROPERTY(EditAnywhere, BlueprintReadOnly) int32 Index = 0;

    // Straßenname (für HUD, Tempolimit-Lookup, Navi-Ansagen).
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString Street;

    // GPS in WGS84. Über UGeoConvertLibrary::GeoToWorld() → Welt-Position.
    UPROPERTY(EditAnywhere, BlueprintReadOnly) double Lat = 0.0;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) double Lng = 0.0;

    // Fahrbahnbreite in Metern (Spline-Mesh-Breite).
    UPROPERTY(EditAnywhere, BlueprintReadOnly) float Width = 8.f;

    // Ampel an diesem Wegpunkt? (→ BP_TrafficLight platzieren)
    UPROPERTY(EditAnywhere, BlueprintReadOnly) bool HasTrafficLight = false;

    // Kreisverkehr-Ausfahrt-Nr. (0 = kein Kreisverkehr).
    UPROPERTY(EditAnywhere, BlueprintReadOnly) int32 RoundaboutExit = 0;

    // Tempolimit in km/h (aus LIMITS-Tabelle des Prototyps).
    UPROPERTY(EditAnywhere, BlueprintReadOnly) int32 SpeedLimit = 50;

    // Optionaler Point-of-Interest-Name (z. B. "RheinEnergie Stadion").
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString POI;
};
