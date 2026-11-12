import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown, FadeOut, FadeOutDown } from "react-native-reanimated";

import { RootScreenProps } from "../navigation/types";
import { useApp } from "../state/AppContext";
import { Button, EmptyState, IconButton } from "../components/ui";
import { BreathingDots } from "../components/motion";
import { KindIcon, kindTint } from "../components/KindIcon";
import { ContentKind, contentTitle, KIND_LABEL, parseContent } from "../lib/qr/parse";
import { getScans, ScanItem, subscribeScans } from "../lib/storage";
import { formatDateTime } from "../lib/format";
import { mapsUrl } from "../lib/actions";
import { haptic } from "../lib/haptics";
import { font, radius, shadow, space } from "../theme";

/**
 * Mapa vectorial con MapLibre GL + OpenFreeMap (gratis, sin API key, sin
 * límites de uso; datos © OpenStreetMap).
 *
 * Seguridad: los datos entran como JSON escapado y nunca se interpretan como
 * HTML; la comunicación con React Native es por mensajes con forma fija.
 */

const MAPLIBRE = "https://unpkg.com/maplibre-gl@4.7.1/dist";
const MAPLIBRE_JS_SRI = "sha384-SYKAG6cglRMN0RVvhNeBY0r3FYKNOJtznwA0v7B5Vp9tr31xAHsZC0DqkQ/pZDmj";
const MAPLIBRE_CSS_SRI = "sha384-MinO0mNliZ3vwppuPOUnGa+iq619pfMhLVUXfC4LHwSCvF9H+6P/KO4Q7qBOYV5V";
const STYLE_LIGHT = "https://tiles.openfreemap.org/styles/positron";
const STYLE_DARK = "https://tiles.openfreemap.org/styles/dark";

type Point = {
  id: string;
  lat: number;
  lng: number;
  kind: ContentKind;
  title: string;
  date: string;
  address?: string;
  color: string;
  n: number;
};

/** JSON seguro para incrustar dentro de <script> */
function jsonForScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}

function buildHtml(points: Point[], opts: { dark: boolean; route: boolean; accent: string; bg: string }) {
  const features = points.map((p) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [p.lng, p.lat] },
    properties: { id: p.id, color: p.color, n: p.n },
  }));

  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="${MAPLIBRE}/maplibre-gl.css" integrity="${MAPLIBRE_CSS_SRI}" crossorigin="anonymous">
<script src="${MAPLIBRE}/maplibre-gl.js" integrity="${MAPLIBRE_JS_SRI}" crossorigin="anonymous"></script>
<style>
  html,body,#map{margin:0;width:100%;height:100%;background:${opts.bg}}
  body{-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none}
  .maplibregl-ctrl-top-right{top:var(--top,72px);right:6px}
  .maplibregl-ctrl-attrib{font:11px -apple-system,system-ui,Roboto,sans-serif}
  .maplibregl-ctrl-attrib.maplibregl-compact{background:${opts.dark ? "rgba(30,33,41,.9)" : "rgba(255,255,255,.9)"};color:${opts.dark ? "#A2AAB8" : "#565D6B"}}
  .maplibregl-ctrl-attrib a{color:inherit}
  ${opts.dark ? ".maplibregl-ctrl-attrib-button{filter:invert(1)}" : ""}
</style>
</head><body><div id="map"></div>
<script>
(function () {
  function send(msg) { window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(msg)); }
  if (!window.maplibregl) { send({ type: 'error' }); return; }

  var data = { type: 'FeatureCollection', features: ${jsonForScript(features)} };
  var route = ${opts.route ? "true" : "false"};
  var accent = ${jsonForScript(opts.accent)};
  var ready = false;
  var padding = { top: 120, bottom: 230, left: 48, right: 48 };

  var map = new maplibregl.Map({
    container: 'map',
    style: ${jsonForScript(opts.dark ? STYLE_DARK : STYLE_LIGHT)},
    center: [-58.3816, -34.6037],
    zoom: 3,
    attributionControl: false,
    dragRotate: false,
    pitchWithRotate: false,
    touchPitch: false,
    fadeDuration: 150
  });
  map.touchZoomRotate.disableRotation();
  map.addControl(new maplibregl.AttributionControl({ compact: true }), 'top-right');

  // Si el estilo no carga (sin conexión), avisar en vez de quedar en blanco
  var failTimer = setTimeout(function () { if (!ready) send({ type: 'error' }); }, 20000);
  map.on('error', function (e) { if (!ready && e && e.error && /style|Failed to fetch/i.test(String(e.error.message))) send({ type: 'error' }); });

  function bounds() {
    var b = new maplibregl.LngLatBounds();
    data.features.forEach(function (f) { b.extend(f.geometry.coordinates); });
    return b;
  }

  window.__fit = function (animate) {
    if (!data.features.length) return;
    if (data.features.length === 1) {
      map.easeTo({ center: data.features[0].geometry.coordinates, zoom: 16, padding: padding, duration: animate ? 600 : 0 });
    } else {
      map.fitBounds(bounds(), { padding: padding, maxZoom: 16, duration: animate ? 600 : 0 });
    }
  };

  window.__select = function (id, fly) {
    if (!ready) return;
    map.setFilter('selected-halo', ['all', ['!', ['has', 'point_count']], ['==', ['get', 'id'], id || '']]);
    if (!id || !fly) return;
    var f = data.features.find(function (x) { return x.properties.id === id; });
    if (f) map.easeTo({ center: f.geometry.coordinates, zoom: Math.max(map.getZoom(), 16), padding: padding, duration: 600 });
  };

  window.__setInsets = function (top, bottom) {
    padding = { top: top, bottom: bottom, left: 48, right: 48 };
    document.documentElement.style.setProperty('--top', (top - 4) + 'px');
  };

  map.on('load', function () {
    map.addSource('scans', {
      type: 'geojson',
      data: data,
      cluster: !route,
      clusterRadius: 44,
      clusterMaxZoom: 16
    });

    if (route && data.features.length > 1) {
      map.addSource('route', {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'LineString', coordinates: data.features.map(function (f) { return f.geometry.coordinates; }) } }
      });
      map.addLayer({ id: 'route-casing', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': 8, 'line-opacity': ${opts.dark ? 0.15 : 0.9} } });
      map.addLayer({ id: 'route-line', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': accent, 'line-width': 4, 'line-dasharray': [1.6, 1.4] } });
    }

    map.addLayer({
      id: 'clusters', type: 'circle', source: 'scans', filter: ['has', 'point_count'],
      paint: {
        'circle-color': accent,
        'circle-radius': ['step', ['get', 'point_count'], 18, 10, 22, 50, 28],
        'circle-stroke-width': 3,
        'circle-stroke-color': '#ffffff'
      }
    });
    map.addLayer({
      id: 'cluster-count', type: 'symbol', source: 'scans', filter: ['has', 'point_count'],
      layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-font': ['Noto Sans Bold'], 'text-size': 13, 'text-allow-overlap': true },
      paint: { 'text-color': '#ffffff' }
    });
    map.addLayer({
      id: 'selected-halo', type: 'circle', source: 'scans', filter: ['==', ['get', 'id'], '__none__'],
      paint: { 'circle-radius': 24, 'circle-color': ['get', 'color'], 'circle-opacity': 0.22, 'circle-stroke-width': 2, 'circle-stroke-color': ['get', 'color'], 'circle-stroke-opacity': 0.6 }
    });
    map.addLayer({
      id: 'points', type: 'circle', source: 'scans', filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': ['get', 'color'],
        'circle-radius': route ? 12 : 9,
        'circle-stroke-width': 3,
        'circle-stroke-color': '#ffffff'
      }
    });
    if (route) {
      map.addLayer({
        id: 'point-number', type: 'symbol', source: 'scans', filter: ['!', ['has', 'point_count']],
        layout: { 'text-field': ['to-string', ['get', 'n']], 'text-font': ['Noto Sans Bold'], 'text-size': 11, 'text-allow-overlap': true, 'text-ignore-placement': true },
        paint: { 'text-color': '#ffffff' }
      });
    }

    map.on('click', 'clusters', function (e) {
      var f = e.features && e.features[0];
      if (!f) return;
      map.getSource('scans').getClusterExpansionZoom(f.properties.cluster_id).then(function (z) {
        map.easeTo({ center: f.geometry.coordinates, zoom: z + 0.5, padding: padding, duration: 500 });
      });
    });
    map.on('click', 'points', function (e) {
      var f = e.features && e.features[0];
      if (!f) return;
      window.__select(f.properties.id, true);
      send({ type: 'select', id: f.properties.id });
    });
    map.on('click', function (e) {
      var hits = map.queryRenderedFeatures(e.point, { layers: ['points', 'clusters'] });
      if (!hits.length) { window.__select(null); send({ type: 'select', id: null }); }
    });

    // Atribución plegada en el botón ⓘ (sigue visible y accesible)
    var attrib = document.querySelector('.maplibregl-ctrl-attrib');
    if (attrib) attrib.classList.remove('maplibregl-compact-show');

    window.__fit(false);
    ready = true;
    clearTimeout(failTimer);
    send({ type: 'ready' });
  });
})();
</script></body></html>`;
}

export default function MapScreen({ navigation, route }: RootScreenProps<"Map">) {
  const { filterQrData, focusId } = route.params ?? {};
  const { colors, scheme } = useApp();
  const insets = useSafeAreaInsets();
  const web = useRef<WebView>(null);

  const [items, setItems] = useState<ScanItem[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(focusId ?? null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    getScans().then(setItems);
    return subscribeScans(setItems);
  }, []);

  const isRoute = !!filterQrData;

  const points = useMemo<Point[]>(() => {
    let list = (items ?? []).filter((s) => s.location && Number.isFinite(s.location.latitude) && Number.isFinite(s.location.longitude));
    // Ruta: orden cronológico (el historial viene del más nuevo al más viejo)
    if (filterQrData) list = list.filter((s) => s.data === filterQrData).reverse();
    return list.map((s, i) => {
      const c = parseContent(s.data, s.type);
      return {
        id: s.id,
        lat: s.location!.latitude,
        lng: s.location!.longitude,
        kind: c.kind,
        title: contentTitle(c),
        date: s.date,
        address: s.location!.address,
        color: kindTint(c.kind, "light"),
        n: i + 1,
      };
    });
  }, [items, filterQrData]);

  // La "firma" sólo cambia cuando cambian los puntos: así el mapa no se recarga
  // cuando el historial se actualiza por otros motivos (favoritos, direcciones…)
  const signature = points.map((p) => `${p.id}:${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join("|");
  const html = useMemo(
    () => buildHtml(points, { dark: scheme === "dark", route: isRoute, accent: colors.accent, bg: colors.bg }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [signature, scheme, isRoute, colors.accent, colors.bg]
  );

  useEffect(() => setStatus("loading"), [html, reloadKey]);

  const selected = points.find((p) => p.id === selectedId) ?? null;
  const uniquePlaces = useMemo(() => new Set(points.map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`)).size, [points]);

  const run = useCallback((js: string) => web.current?.injectJavaScript(`${js};true;`), []);

  const onMessage = (e: WebViewMessageEvent) => {
    let msg: { type?: string; id?: unknown };
    try {
      msg = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    if (msg.type === "ready") {
      setStatus("ready");
      run(`window.__setInsets(${insets.top + 72}, ${insets.bottom + 200})`);
      if (selectedId) run(`window.__select(${JSON.stringify(selectedId)}, true)`);
      else run("window.__fit(false)");
    } else if (msg.type === "error") {
      setStatus("error");
    } else if (msg.type === "select") {
      const id = typeof msg.id === "string" ? msg.id : null;
      if (id) haptic.selection();
      setSelectedId(id);
    }
  };

  const fitAll = () => {
    haptic.selection();
    setSelectedId(null);
    run("window.__select(null); window.__fit(true)");
  };

  const title = isRoute ? "Ruta del código" : "Mapa de escaneos";
  const subtitle = isRoute
    ? `${points.length} escaneo${points.length === 1 ? "" : "s"} en orden`
    : `${points.length} escaneo${points.length === 1 ? "" : "s"} · ${uniquePlaces} lugar${uniquePlaces === 1 ? "" : "es"}`;

  // ── Estados sin mapa ───────────────────────────────────────
  if (items === null || points.length === 0) {
    return (
      <View style={[styles.fill, { backgroundColor: colors.bg }]}>
        <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
          <IconButton icon="chevron-back" label="Volver" onPress={navigation.goBack} size={44} />
        </View>
        {items === null ? (
          <View style={[styles.fill, styles.center]}>
            <BreathingDots label="Cargando…" />
          </View>
        ) : (
          <EmptyState
            icon="map-outline"
            title="Todavía no hay lugares"
            description={
              isRoute
                ? "Este código no tiene escaneos con ubicación."
                : "Con “Guardar ubicación” activado en Ajustes y el GPS encendido, cada escaneo aparecerá en este mapa."
            }
            action={<Button label="Volver" variant="secondary" onPress={navigation.goBack} />}
          />
        )}
      </View>
    );
  }

  return (
    <View style={[styles.fill, { backgroundColor: colors.bg }]}>
      <WebView
        key={reloadKey}
        ref={web}
        source={{ html }}
        originWhitelist={["*"]}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        overScrollMode="never"
        bounces={false}
        // Los enlaces de atribución se abren en el navegador, no dentro del mapa
        onShouldStartLoadWithRequest={(req) => {
          if (/^https?:\/\//i.test(req.url)) {
            Linking.openURL(req.url).catch(() => undefined);
            return false;
          }
          return true;
        }}
        onError={() => setStatus("error")}
        style={[styles.fill, { backgroundColor: colors.bg }]}
        containerStyle={{ backgroundColor: colors.bg }}
      />

      {/* Carga / error */}
      {status !== "ready" && (
        <Animated.View exiting={FadeOut.duration(220)} style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: colors.bg }]}>
          {status === "loading" ? (
            <BreathingDots label="Cargando mapa…" />
          ) : (
            <View style={{ alignItems: "center", paddingHorizontal: space.xxxl, gap: space.md }}>
              <Ionicons name="cloud-offline-outline" size={40} color={colors.textMuted} />
              <Text style={[styles.errorTitle, { color: colors.text }]}>No se pudo cargar el mapa</Text>
              <Text style={[styles.errorText, { color: colors.textMuted }]}>Revisá tu conexión a internet e intentá de nuevo.</Text>
              <Button label="Reintentar" icon="refresh" variant="secondary" onPress={() => setReloadKey((k) => k + 1)} />
            </View>
          )}
        </Animated.View>
      )}

      {/* Velo bajo la barra de estado para que se lea sobre el mapa */}
      <View pointerEvents="none" style={[styles.statusScrim, { height: insets.top, backgroundColor: colors.bg, opacity: 0.82 }]} />

      {/* Encabezado flotante */}
      <View style={[styles.header, { paddingTop: insets.top + space.sm }]} pointerEvents="box-none">
        <IconButton icon="chevron-back" label="Volver" onPress={navigation.goBack} size={44} style={[{ backgroundColor: colors.surface }, shadow(colors, scheme, 2)]} />
        <View style={[styles.titlePill, { backgroundColor: colors.surface }, shadow(colors, scheme, 2)]}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        <IconButton icon="scan-outline" label="Ver todos los puntos" onPress={fitAll} size={44} style={[{ backgroundColor: colors.surface }, shadow(colors, scheme, 2)]} />
      </View>

      {/* Tarjeta inferior */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + space.lg }]} pointerEvents="box-none">
        {selected ? (
          <Animated.View
            key={selected.id}
            entering={FadeInDown.duration(220)}
            exiting={FadeOutDown.duration(140)}
            style={[styles.card, { backgroundColor: colors.surface }, shadow(colors, scheme, 2)]}
          >
            <View style={styles.cardRow}>
              <KindIcon kind={selected.kind} size={44} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.cardKind, { color: colors.textMuted }]} numberOfLines={1}>
                  {KIND_LABEL[selected.kind]}
                  {isRoute ? ` · #${selected.n}` : ""} · {formatDateTime(selected.date)}
                </Text>
                <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                  {selected.title}
                </Text>
              </View>
              <IconButton
                icon="close"
                label="Cerrar"
                size={32}
                onPress={() => {
                  setSelectedId(null);
                  run("window.__select(null)");
                }}
              />
            </View>
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={14} color={colors.textMuted} />
              <Text style={[styles.address, { color: colors.textMuted }]} numberOfLines={2}>
                {selected.address ?? `${selected.lat.toFixed(5)}, ${selected.lng.toFixed(5)}`}
              </Text>
            </View>
            <View style={styles.actions}>
              <Button label="Ver detalle" icon="document-text-outline" style={{ flex: 1 }} onPress={() => navigation.navigate("Result", { scanId: selected.id })} />
              <Button
                label="Cómo llegar"
                icon="navigate-outline"
                variant="secondary"
                style={{ flex: 1 }}
                onPress={() => Linking.openURL(mapsUrl(selected.lat, selected.lng, selected.title)).catch(() => undefined)}
              />
            </View>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeIn.duration(200)} style={[styles.hint, { backgroundColor: colors.surface }, shadow(colors, scheme, 2)]}>
            <Ionicons name="hand-left-outline" size={17} color={colors.textMuted} />
            <Text style={[styles.hintText, { color: colors.textMuted }]}>Tocá un punto para ver el escaneo</Text>
            {isRoute && (
              <Button label="Ver todos" variant="ghost" onPress={() => navigation.setParams({ filterQrData: undefined, focusId: undefined })} style={{ minHeight: 36, paddingHorizontal: space.sm }} />
            )}
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  statusScrim: { position: "absolute", top: 0, left: 0, right: 0 },
  center: { alignItems: "center", justifyContent: "center" },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingHorizontal: space.lg,
  },
  titlePill: { flex: 1, height: 52, borderRadius: radius.lg, paddingHorizontal: space.lg, justifyContent: "center" },
  title: { fontSize: font.size.md, fontWeight: font.weight.bold },
  subtitle: { fontSize: font.size.xs, marginTop: 1 },
  bottom: { position: "absolute", left: space.lg, right: space.lg, bottom: 0 },
  card: { borderRadius: radius.xl, padding: space.lg, gap: space.md },
  cardRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  cardKind: { fontSize: font.size.xs, fontWeight: font.weight.semibold },
  cardTitle: { fontSize: font.size.lg, fontWeight: font.weight.bold, marginTop: 2 },
  addressRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  address: { flex: 1, fontSize: font.size.sm, lineHeight: 18 },
  actions: { flexDirection: "row", gap: space.sm },
  hint: { flexDirection: "row", alignItems: "center", gap: space.sm, borderRadius: radius.full, paddingLeft: space.lg, paddingRight: space.sm, minHeight: 48, alignSelf: "center" },
  hintText: { fontSize: font.size.sm, fontWeight: font.weight.medium, paddingVertical: space.md, paddingRight: space.sm },
  errorTitle: { fontSize: font.size.lg, fontWeight: font.weight.bold, textAlign: "center" },
  errorText: { fontSize: font.size.sm, textAlign: "center", lineHeight: 19 },
});
