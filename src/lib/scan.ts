import { normalizeFormat } from "./qr/parse";
import { getFastLocation, resolveAddress } from "./location";
import { saveScan, ScanItem, ScanSource, updateScan } from "./storage";

/**
 * Registra un escaneo sin bloquear la navegación: se guarda al instante y la
 * ubicación/dirección se completan en segundo plano.
 */
export async function recordScan(opts: {
  data: string;
  format?: string;
  source: ScanSource;
  withLocation: boolean;
}): Promise<ScanItem> {
  const item = await saveScan({
    data: opts.data,
    type: normalizeFormat(opts.format),
    source: opts.source,
    locating: opts.withLocation,
  });

  if (opts.withLocation) {
    (async () => {
      const loc = await getFastLocation();
      if (!loc) {
        await updateScan(item.id, { locating: false });
        return;
      }
      await updateScan(item.id, { location: loc, locating: false });
      const address = await resolveAddress(loc);
      if (address) await updateScan(item.id, { location: { ...loc, address } });
    })().catch(() => updateScan(item.id, { locating: false }));
  }

  return item;
}
