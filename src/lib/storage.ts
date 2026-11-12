import AsyncStorage from "@react-native-async-storage/async-storage";
import "react-native-get-random-values";
import uuid from "react-native-uuid";
import { normalizeFormat } from "./qr/parse";

/**
 * Persistencia del historial y de los ajustes.
 * - Las escrituras se serializan en una cola para que actualizar la ubicación
 *   de un escaneo no pise un guardado concurrente.
 * - Los cambios se emiten a los suscriptores (historial, resultado, mapa).
 * - Compatible con el formato anterior (`scan_history` v1).
 */

export type LocationInfo = {
  latitude: number;
  longitude: number;
  accuracy?: number;
  address?: string;
};

export type ScanSource = "camera" | "image" | "generated";

export type ScanItem = {
  id: string;
  data: string;
  /** formato del código: qr, ean13, code128... */
  type: string;
  date: string;
  location?: LocationInfo;
  favorite?: boolean;
  source?: ScanSource;
  /** true mientras se obtiene la ubicación en segundo plano */
  locating?: boolean;
};

const HISTORY_KEY = "scan_history";
const SETTINGS_KEY = "app_settings_v2";
const MAX_ITEMS = 2000;

// ─────────────────────────────────────────────────────────────
// Cola de escritura + caché en memoria
// ─────────────────────────────────────────────────────────────
let cache: ScanItem[] | null = null;
let queue: Promise<unknown> = Promise.resolve();
const listeners = new Set<(items: ScanItem[]) => void>();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

function sanitize(raw: unknown): ScanItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is ScanItem => !!x && typeof x.data === "string" && typeof x.date === "string")
    .map((x) => ({
      ...x,
      id: typeof x.id === "string" && x.id ? x.id : String(uuid.v4()),
      type: normalizeFormat(x.type === "unknown" ? undefined : x.type),
      // Un escaneo que quedó "localizando" al cerrar la app no debe girar para siempre
      locating: false,
      location:
        x.location && Number.isFinite(x.location.latitude) && Number.isFinite(x.location.longitude)
          ? x.location
          : undefined,
    }));
}

async function load(): Promise<ScanItem[]> {
  if (cache) return cache;
  try {
    const json = await AsyncStorage.getItem(HISTORY_KEY);
    cache = sanitize(json ? JSON.parse(json) : []);
  } catch (err) {
    console.warn("Historial ilegible, se reinicia:", err);
    cache = [];
  }
  return cache;
}

async function persist(items: ScanItem[]) {
  cache = items;
  listeners.forEach((l) => l(items));
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(items));
}

export function subscribeScans(listener: (items: ScanItem[]) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getScans(): Promise<ScanItem[]> {
  return enqueue(load);
}

export async function getScan(id: string): Promise<ScanItem | undefined> {
  return (await getScans()).find((s) => s.id === id);
}

export function saveScan(input: Omit<ScanItem, "id" | "date"> & { date?: string }): Promise<ScanItem> {
  return enqueue(async () => {
    const current = await load();
    const item: ScanItem = { ...input, id: String(uuid.v4()), date: input.date ?? new Date().toISOString() };
    await persist([item, ...current].slice(0, MAX_ITEMS));
    return item;
  });
}

export function updateScan(id: string, patch: Partial<Omit<ScanItem, "id">>): Promise<void> {
  return enqueue(async () => {
    const current = await load();
    if (!current.some((s) => s.id === id)) return;
    await persist(current.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  });
}

export function deleteScan(id: string): Promise<{ item: ScanItem; index: number } | null> {
  return enqueue(async () => {
    const current = await load();
    const index = current.findIndex((s) => s.id === id);
    if (index === -1) return null;
    const item = current[index];
    await persist(current.filter((s) => s.id !== id));
    return { item, index };
  });
}

/** Reinserta un escaneo borrado en su posición original (para "Deshacer"). */
export function restoreScan(item: ScanItem, index: number): Promise<void> {
  return enqueue(async () => {
    const current = await load();
    if (current.some((s) => s.id === item.id)) return;
    const next = [...current];
    next.splice(Math.min(index, next.length), 0, item);
    await persist(next);
  });
}

export function clearScans(): Promise<ScanItem[]> {
  return enqueue(async () => {
    const previous = await load();
    await persist([]);
    return previous;
  });
}

export function restoreAll(items: ScanItem[]): Promise<void> {
  return enqueue(async () => {
    const current = await load();
    const ids = new Set(current.map((s) => s.id));
    await persist([...current, ...items.filter((s) => !ids.has(s.id))].sort((a, b) => b.date.localeCompare(a.date)));
  });
}

// ─────────────────────────────────────────────────────────────
// Ajustes
// ─────────────────────────────────────────────────────────────
export type ThemePreference = "system" | "light" | "dark";

export type Settings = {
  theme: ThemePreference;
  haptics: boolean;
  saveLocation: boolean;
  inAppBrowser: boolean;
  confirmOpen: boolean;
  allFormats: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  haptics: true,
  saveLocation: true,
  inAppBrowser: true,
  confirmOpen: true,
  allFormats: true,
};

export async function loadSettings(): Promise<Settings> {
  try {
    const json = await AsyncStorage.getItem(SETTINGS_KEY);
    return { ...DEFAULT_SETTINGS, ...(json ? JSON.parse(json) : {}) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
