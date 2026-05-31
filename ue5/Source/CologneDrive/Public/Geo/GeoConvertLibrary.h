// Cologne Drive (UE5) — zentrale Geo↔Welt-Konvertierung.
//
// HINWEIS: Starter-Code (kompiliert erst im echten UE5-Projekt).
//
// EINZIGE Stelle, an der GPS in Welt-Koordinaten umgerechnet wird. Alle Systeme
// (Strecken-Spline, Asset-Platzierung, OSM-Import, NavSystem) MÜSSEN diese
// Funktionen nutzen, damit alles deckungsgleich liegt.
//
// Projektion: lokale äquirektanguläre Projektion, Ursprung = Altbaumburgweg 2.
// Identisch zur ll()-Formel des Browser-Prototyps:
//   LAT0=50.9674, LNG0=6.9382, mLat=111320, mLng=mLat*cos(LAT0)
//   x=(lng-LNG0)*mLng [m]   z=(LAT0-lat)*mLat [m]
//
// Achsen-Mapping Three.js (m, Y-up) → UE5 (cm, Z-up):
//   UE.X =  x  * 100
//   UE.Y =  z  * 100        (Three-z "Süd+" → UE-Y; Vorzeichen in M0 verifizieren)
//   UE.Z =  height * 100

#pragma once

#include "CoreMinimal.h"
#include "Kismet/BlueprintFunctionLibrary.h"
#include "GeoConvertLibrary.generated.h"

UCLASS()
class UGeoConvertLibrary : public UBlueprintFunctionLibrary
{
    GENERATED_BODY()

public:
    // Welt-Ursprung (= Prototyp-Konstanten). Single Source of Truth.
    static constexpr double LAT0 = 50.9674;
    static constexpr double LNG0 = 6.9382;
    static constexpr double MetersPerLat = 111320.0;

    static double MetersPerLng()
    {
        return MetersPerLat * FMath::Cos(FMath::DegreesToRadians(LAT0));
    }

    // GPS → UE-Weltposition (cm). HeightMeters = Höhe über Grund.
    UFUNCTION(BlueprintPure, Category = "Geo")
    static FVector GeoToWorld(double Lat, double Lng, double HeightMeters = 0.0)
    {
        const double XMeters = (Lng - LNG0) * MetersPerLng();
        const double ZMeters = (LAT0 - Lat) * MetersPerLat;   // Three-z
        return FVector(XMeters * 100.0, ZMeters * 100.0, HeightMeters * 100.0);
    }

    // UE-Weltposition (cm) → GPS.
    UFUNCTION(BlueprintPure, Category = "Geo")
    static void WorldToGeo(const FVector& World, double& OutLat, double& OutLng)
    {
        const double XMeters = World.X / 100.0;
        const double ZMeters = World.Y / 100.0;
        OutLng = LNG0 + XMeters / MetersPerLng();
        OutLat = LAT0 - ZMeters / MetersPerLat;
    }
};
