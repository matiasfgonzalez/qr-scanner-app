import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RootScreenProps } from "../navigation/types";
import { useApp } from "../state/AppContext";
import { Button, EmptyState, ScreenHeader } from "../components/ui";
import { BreathingDots } from "../components/motion";
import { kindTint } from "../components/KindIcon";
import { contentTitle, KIND_LABEL, parseContent } from "../lib/qr/parse";
import { getScans, ScanItem, subscribeScans } from "../lib/storage";
import { formatDateTime } from "../lib/format";
import { font, radius, space } from "../theme";

/**
 * Mapa con Leaflet + teselas CARTO/OpenStreetMap (sin API key).
 * Los datos se inyectan como JSON escapado y los popups se arman con
 * textContent: el contenido de un QR nunca se interpreta como HTML.
 */

type Point = { id: string; lat: number; lng: number; title: string; kind: string; date: string; address: string; color: string; n: number };

/** JSON seguro para incrustar dentro de <script> */
function jsonForScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}

function buildHtml(points: Point[], opts: { dark: boolean; route: boolean; focusId?: string; accent: string }) {
  const tiles = opts.dark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body,#map{width:100%;height:100%;background:${opts.dark ? "#0A0B0E" : "#F4F5F7"}}
  body{-webkit-tap-highlight-color:transparent;font-family:-apple-system,system-ui,Roboto,sans-serif}
  .leaflet-popup-content-wrapper{border-radius:14px;box-shadow:0 8px 24px rgba(0,0,0,.18);background:${opts.dark ? "#1E2129" : "#fff"};color:${opts.dark ? "#F1F3F7" : "#0C0E13"}}
  .leaflet-popup-tip{background:${opts.dark ? "#1E2129" : "#fff"}}
  .leaflet-popup-content{margin:12px 14px;min-width:190px}
  .k{font-size:11px;font-weight:600;opacity:.6;text-transform:uppercase;letter-spacing:.5px}
  .t{font-size:14px;font-weight:700;margin:4px 0;word-break:break-word}
  .m{font-size:12px;opacity:.7;margin-top:2px}
  .b{margin-top:10px;width:100%;border:0;border-radius:10px;padding:9px;font-weight:600;font-size:13px;background:${opts.accent};color:#fff}
  .pin{width:30px;height:30px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;color:#fff;font:700 11px system-ui}
  .leaflet-control-attribution{font-size:9px}
</style>
</head><body><div id="map"></div>
<script>
  var points = ${jsonForScript(points)};
  var route = ${opts.route ? "true" : "false"};
  var focusId = ${jsonForScript(opts.focusId ?? null)};
  var map = L.map('map', { zoomControl: false, attributionControl: false });
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  // Atribución sin enlaces: nada navega dentro del WebView
  L.control.attribution({ prefix: false }).addTo(map);
  L.tileLayer('${tiles}', { maxZoom: 19, subdomains: 'abcd', attribution: '© OpenStreetMap © CARTO' }).addTo(map);

  function popup(p) {
    var el = document.createElement('div');
    var k = document.createElement('div'); k.className = 'k'; k.textContent = p.kind + (route ? ' · #' + p.n : ''); el.appendChild(k);
    var t = document.createElement('div'); t.className = 't'; t.textContent = p.title; el.appendChild(t);
    var d = document.createElement('div'); d.className = 'm'; d.textContent = p.date; el.appendChild(d);
    if (p.address) { var a = document.createElement('div'); a.className = 'm'; a.textContent = p.address; el.appendChild(a); }
    var b = document.createElement('button'); b.className = 'b'; b.textContent = 'Ver detalle';
    b.onclick = function () { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'open', id: p.id })); };
    el.appendChild(b);
    return el;
  }

  var latlngs = [], focused = null;
  points.forEach(function (p) {
    var html = '<div class="pin" style="background:' + p.color + '">' + (route ? p.n : '') + '</div>';
    var icon = L.divIcon({ html: html, className: '', iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -14] });
    var m = L.marker([p.lat, p.lng], { icon: icon }).addTo(map).bindPopup(popup(p));
    latlngs.push([p.lat, p.lng]);
    if (p.id === focusId) focused = m;
  });

  if (route && latlngs.length > 1) {
    L.polyline(latlngs, { color: '${opts.accent}', weight: 4, opacity: .8, dashArray: '8 8', lineCap: 'round' }).addTo(map);
  }

  if (focused) { map.setView(focused.getLatLng(), 17); focused.openPopup(); }
  else if (latlngs.length === 1) map.setView(latlngs[0], 16);
  else if (latlngs.length > 1) map.fitBounds(latlngs, { padding: [48, 48], maxZoom: 17 });
  else map.setView([-34.6037, -58.3816], 11);
</script></body></html>`;
}

export default function MapScreen({ navigation, route }: RootScreenProps<"Map">) {
  const { filterQrData, focusId } = route.params ?? {};
  const { colors, scheme } = useApp();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<ScanItem[] | null>(null);

  useEffect(() => {
    getScans().then(setItems);
    return subscribeScans(setItems);
  }, []);

  const points = useMemo<Point[]>(() => {
    let list = (items ?? []).filter((s) => s.location && Number.isFinite(s.location.latitude) && Number.isFinite(s.location.longitude));
    if (filterQrData) list = list.filter((s) => s.data === filterQrData).reverse(); // orden cronológico para la ruta
    return list.map((s, i) => {
      const c = parseContent(s.data, s.type);
      return {
        id: s.id,
        lat: s.location!.latitude,
        lng: s.location!.longitude,
        title: contentTitle(c),
        kind: KIND_LABEL[c.kind],
        date: formatDateTime(s.date),
        address: s.location!.address ?? "",
        color: kindTint(c.kind, "light"),
        n: i + 1,
      };
    });
  }, [items, filterQrData]);

  // El HTML sólo se regenera si cambian los puntos (no en cada render)
  const html = useMemo(
    () => buildHtml(points, { dark: scheme === "dark", route: !!filterQrData, focusId, accent: colors.accent }),
    [points, scheme, filterQrData, focusId, colors.accent]
  );

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg?.type === "open" && typeof msg.id === "string") navigation.navigate("Result", { scanId: msg.id });
    } catch {
      /* mensaje ajeno */
    }
  };

  const title = filterQrData ? "Ruta del código" : "Mapa";
  const subtitle = items === null ? " " : `${points.length} ubicaci${points.length === 1 ? "ón" : "ones"}`;

  return (
    <View style={[styles.fill, { backgroundColor: colors.bg }]}>
      <ScreenHeader title={title} onBack={navigation.goBack} large={false} right={<Text style={[styles.count, { color: colors.textMuted }]}>{subtitle}</Text>} />
      {items === null ? (
        <View style={[styles.fill, styles.center]}>
          <BreathingDots label="Cargando mapa…" />
        </View>
      ) : points.length === 0 ? (
        <EmptyState
          icon="map-outline"
          title="Sin ubicaciones"
          description={filterQrData ? "Este código no tiene escaneos con ubicación." : "Activá “Guardar ubicación” en Ajustes y tus escaneos aparecerán acá."}
          action={<Button label="Volver" variant="secondary" onPress={navigation.goBack} />}
        />
      ) : (
        <View style={styles.fill}>
          <WebView
            source={{ html }}
            originWhitelist={["*"]}
            onMessage={onMessage}
            javaScriptEnabled
            domStorageEnabled
            setSupportMultipleWindows={false}
            startInLoadingState
            renderLoading={() => (
              <View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: colors.bg }]}>
                <BreathingDots label="Cargando mapa…" />
              </View>
            )}
            style={{ backgroundColor: colors.bg }}
          />
          {filterQrData && (
            <View style={[styles.floating, { bottom: insets.bottom + space.lg }]}>
              <Button label="Ver todos los escaneos" icon="earth-outline" variant="secondary" onPress={() => navigation.setParams({ filterQrData: undefined })} style={styles.floatingBtn} />
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
  count: { fontSize: font.size.sm, fontWeight: font.weight.medium },
  floating: { position: "absolute", left: space.lg, right: space.lg, alignItems: "center" },
  floatingBtn: { borderRadius: radius.full, paddingHorizontal: space.xxl, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
});
