import * as Location from "expo-location";
import { LocationInfo } from "./storage";

/**
 * Ubicación en dos pasos para no frenar el escaneo:
 * 1) última posición conocida (instantánea) si es reciente y precisa,
 * 2) si no, una lectura nueva con precisión balanceada y timeout.
 * La dirección se resuelve después y es opcional.
 */

const MAX_AGE_MS = 60_000;
const MAX_ACCURACY_M = 100;
const TIMEOUT_MS = 8_000;

export async function hasLocationPermission(): Promise<boolean> {
  const { status } = await Location.getForegroundPermissionsAsync();
  return status === "granted";
}

export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === "granted";
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([p, new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))]);
}

export async function getFastLocation(): Promise<LocationInfo | null> {
  try {
    if (!(await hasLocationPermission())) return null;
    // Con el GPS apagado, getCurrentPositionAsync abre un diálogo del sistema
    // que pausa la app en medio del escaneo: mejor omitir la ubicación.
    if (!(await Location.hasServicesEnabledAsync())) return null;

    const last = await Location.getLastKnownPositionAsync({
      maxAge: MAX_AGE_MS,
      requiredAccuracy: MAX_ACCURACY_M,
    });
    const pos =
      last ??
      (await withTimeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced, mayShowUserSettingsDialog: false }), TIMEOUT_MS));
    if (!pos) return null;

    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy ?? undefined,
    };
  } catch (err) {
    console.warn("Ubicación no disponible:", err);
    return null;
  }
}

export async function resolveAddress(loc: LocationInfo): Promise<string | undefined> {
  try {
    const result = await withTimeout(
      Location.reverseGeocodeAsync({ latitude: loc.latitude, longitude: loc.longitude }),
      6_000
    );
    const g = result?.[0];
    if (!g) return undefined;
    const street = [g.street, g.streetNumber].filter(Boolean).join(" ");
    return [street || g.name, g.city || g.subregion, g.region].filter(Boolean).join(", ") || undefined;
  } catch {
    return undefined;
  }
}
