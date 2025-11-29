import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { WebView } from "react-native-webview";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";
import { getScans, ScanItem } from "../utils/storage";
import { SafeAreaView } from "react-native-safe-area-context";

// ═══════════════════════════════════════════════════════════════
// 🎨 SISTEMA DE COLORES PREMIUM
// ═══════════════════════════════════════════════════════════════
const Colors = {
  primary: {
    50: "#eff6ff",
    500: "#3b82f6",
    600: "#2563eb",
  },
  secondary: { 50: "#ecfdf5", 500: "#10b981", 600: "#059669" },
  accent: { 50: "#f5f3ff", 500: "#8b5cf6" },
  neutral: {
    50: "#f8fafc",
    100: "#f1f5f9",
    600: "#475569",
    900: "#0f172a",
  },
  text: {
    primary: "#0f172a",
    secondary: "#475569",
    muted: "#94a3b8",
    inverse: "#ffffff",
  },
  background: { primary: "#f8fafc", card: "#ffffff" },
  border: { light: "#e2e8f0" },
};

// Colores para marcadores
const MARKER_COLORS = [
  "#ef4444",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
];

type Props = NativeStackScreenProps<RootStackParamList, "Map">;

/**
 * 🗺️ MapScreen - OpenStreetMap + Leaflet (Sin API Key)
 */
export default function MapScreen({ navigation, route }: Readonly<Props>) {
  const [scans, setScans] = useState<ScanItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { filterQrData } = route.params || {};

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const data = await getScans();
        let scansWithLocation = data.filter(
          (scan) =>
            scan.location &&
            typeof scan.location.latitude === "number" &&
            typeof scan.location.longitude === "number" &&
            !isNaN(scan.location.latitude) &&
            !isNaN(scan.location.longitude)
        );

        if (filterQrData) {
          scansWithLocation = scansWithLocation.filter(
            (scan) => scan.data === filterQrData
          );
        }

        setScans(scansWithLocation);
      } catch (error) {
        console.error("Error loading scans:", error);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [filterQrData]);

  // Asignar colores por QR
  const qrColors = useMemo(() => {
    const unique = [...new Set(scans.map((s) => s.data))];
    const colors: Record<string, string> = {};
    unique.forEach((qr, i) => {
      colors[qr] = MARKER_COLORS[i % MARKER_COLORS.length];
    });
    return colors;
  }, [scans]);

  // Calcular centro del mapa
  const mapConfig = useMemo(() => {
    if (scans.length === 0) {
      return { lat: -34.6037, lng: -58.3816, zoom: 12 };
    }

    const lats = scans.map((s) => s.location!.latitude);
    const lngs = scans.map((s) => s.location!.longitude);

    const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;

    const maxDiff = Math.max(
      Math.max(...lats) - Math.min(...lats),
      Math.max(...lngs) - Math.min(...lngs)
    );

    let zoom = 15;
    if (maxDiff > 0.5) zoom = 10;
    else if (maxDiff > 0.1) zoom = 12;
    else if (maxDiff > 0.01) zoom = 14;

    return { lat: centerLat, lng: centerLng, zoom };
  }, [scans]);

  // HTML con Leaflet + OpenStreetMap
  const mapHtml = useMemo(() => {
    const markers = scans
      .map((scan, index) => {
        const color = qrColors[scan.data];
        const date = new Date(scan.date).toLocaleString();
        const addr = scan.location?.address || "Sin dirección";
        const qrText =
          scan.data.length > 35
            ? scan.data.substring(0, 35) + "..."
            : scan.data;

        return `
          L.circleMarker([${scan.location!.latitude}, ${
          scan.location!.longitude
        }], {
            radius: 12,
            fillColor: '${color}',
            color: '#fff',
            weight: 3,
            fillOpacity: 0.9
          }).addTo(map).bindPopup(\`
            <div style="font-family: system-ui, sans-serif; min-width: 180px;">
              <div style="display:flex;align-items:center;margin-bottom:6px;">
                <div style="width:10px;height:10px;border-radius:50%;background:${color};margin-right:6px;"></div>
                <span style="font-size:11px;color:#64748b;font-weight:600;">#${
                  scans.length - index
                }</span>
              </div>
              <div style="font-size:12px;font-weight:600;color:#0f172a;margin-bottom:4px;word-break:break-all;">
                ${qrText}
              </div>
              <div style="font-size:10px;color:#64748b;margin-bottom:2px;">🕐 ${date}</div>
              <div style="font-size:10px;color:#3b82f6;">📍 ${addr}</div>
            </div>
          \`);
        `;
      })
      .join("\n");

    const boundsCode =
      scans.length > 1
        ? `map.fitBounds([${scans
            .map((s) => `[${s.location!.latitude},${s.location!.longitude}]`)
            .join(",")}], {padding:[30,30]});`
        : "";

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    html,body,#map{width:100%;height:100%;}
    .leaflet-popup-content-wrapper{border-radius:10px;box-shadow:0 4px 12px rgba(0,0,0,0.15);}
    .leaflet-popup-content{margin:10px;}
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map').setView([${mapConfig.lat},${mapConfig.lng}],${mapConfig.zoom});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
      maxZoom:19,
      attribution:'© OpenStreetMap'
    }).addTo(map);
    ${markers}
    ${boundsCode}
  </script>
</body>
</html>`;
  }, [scans, qrColors, mapConfig]);

  // Agrupar para leyenda
  const groupedByQr = useMemo(() => {
    return scans.reduce((acc, scan) => {
      if (!acc[scan.data]) acc[scan.data] = [];
      acc[scan.data].push(scan);
      return acc;
    }, {} as Record<string, ScanItem[]>);
  }, [scans]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={Colors.primary[600]} />
          <Text style={styles.loadingText}>Cargando mapa...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {filterQrData ? "📍 Ruta del QR" : "🌍 Mapa de Escaneos"}
          </Text>
          <View style={styles.headerStats}>
            <View style={styles.statBadge}>
              <Text style={styles.statNumber}>{scans.length}</Text>
              <Text style={styles.statLabel}>escaneos</Text>
            </View>
            {!filterQrData && Object.keys(groupedByQr).length > 0 && (
              <View style={[styles.statBadge, styles.statBadgeSecondary]}>
                <Text style={styles.statNumberSecondary}>
                  {Object.keys(groupedByQr).length}
                </Text>
                <Text style={styles.statLabelSecondary}>QRs</Text>
              </View>
            )}
          </View>
        </View>

        {/* Mapa o estado vacío */}
        {scans.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyIconText}>🗺️</Text>
            </View>
            <Text style={styles.emptyTitle}>Sin ubicaciones</Text>
            <Text style={styles.emptyDescription}>
              {filterQrData
                ? "Este QR no tiene escaneos con ubicación."
                : "Aún no hay escaneos con ubicación."}
              {"\n\n"}Escanea códigos QR para ver su ubicación.
            </Text>
          </View>
        ) : (
          <View style={styles.mapContainer}>
            <WebView
              source={{ html: mapHtml }}
              style={styles.map}
              originWhitelist={["*"]}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
              renderLoading={() => (
                <View style={styles.webviewLoading}>
                  <ActivityIndicator size="large" color={Colors.primary[600]} />
                </View>
              )}
            />

            {/* Leyenda */}
            {!filterQrData && Object.keys(groupedByQr).length > 1 && (
              <View style={styles.legend}>
                <Text style={styles.legendTitle}>Códigos QR</Text>
                {Object.entries(groupedByQr)
                  .slice(0, 4)
                  .map(([qr, items]) => (
                    <View key={qr} style={styles.legendItem}>
                      <View
                        style={[
                          styles.legendDot,
                          { backgroundColor: qrColors[qr] },
                        ]}
                      />
                      <Text style={styles.legendText} numberOfLines={1}>
                        {qr.substring(0, 16)}...
                      </Text>
                      <Text style={styles.legendCount}>({items.length})</Text>
                    </View>
                  ))}
                {Object.keys(groupedByQr).length > 4 && (
                  <Text style={styles.legendMore}>
                    +{Object.keys(groupedByQr).length - 4} más
                  </Text>
                )}
              </View>
            )}

            {/* Badge OSM */}
            <View style={styles.osmBadge}>
              <Text style={styles.osmBadgeText}>🗺️ OpenStreetMap</Text>
            </View>
          </View>
        )}

        {/* Bottom bar */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.buttonPrimary}
            onPress={() => navigation.replace("Scanner")}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonIcon}>📷</Text>
            <Text style={styles.buttonText}>Escanear</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.buttonSecondary}
            onPress={() => navigation.navigate("History")}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonIcon}>📋</Text>
            <Text style={styles.buttonText}>Historial</Text>
          </TouchableOpacity>

          {filterQrData && (
            <TouchableOpacity
              style={styles.buttonAccent}
              onPress={() => navigation.setParams({ filterQrData: undefined })}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonIcon}>🌍</Text>
              <Text style={styles.buttonText}>Todos</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: Colors.background.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text.primary,
  },
  headerStats: {
    flexDirection: "row",
    gap: 8,
  },
  statBadge: {
    backgroundColor: Colors.primary[50],
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statBadgeSecondary: {
    backgroundColor: Colors.secondary[50],
  },
  statNumber: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.primary[600],
  },
  statNumberSecondary: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.secondary[600],
  },
  statLabel: {
    fontSize: 10,
    color: Colors.primary[600],
  },
  statLabelSecondary: {
    fontSize: 10,
    color: Colors.secondary[600],
  },
  mapContainer: {
    flex: 1,
    position: "relative",
  },
  map: {
    flex: 1,
  },
  webviewLoading: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background.primary,
  },
  legend: {
    position: "absolute",
    bottom: 90,
    left: 12,
    backgroundColor: Colors.background.card,
    padding: 12,
    borderRadius: 10,
    maxWidth: 180,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  legendTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.text.primary,
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    flex: 1,
    fontSize: 10,
    color: Colors.text.secondary,
  },
  legendCount: {
    fontSize: 9,
    color: Colors.text.muted,
    fontWeight: "600",
  },
  legendMore: {
    fontSize: 10,
    color: Colors.text.muted,
    marginTop: 4,
    fontStyle: "italic",
  },
  osmBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  osmBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.text.secondary,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.neutral[100],
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyIconText: {
    fontSize: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text.primary,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: Colors.text.muted,
    textAlign: "center",
    lineHeight: 22,
  },
  loadingState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: Colors.text.secondary,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    padding: 14,
    gap: 10,
    backgroundColor: Colors.background.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonPrimary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.secondary[500],
    paddingVertical: 12,
    borderRadius: 10,
  },
  buttonSecondary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.neutral[600],
    paddingVertical: 12,
    borderRadius: 10,
  },
  buttonAccent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.accent[500],
    paddingVertical: 12,
    borderRadius: 10,
  },
  buttonIcon: {
    fontSize: 14,
    marginRight: 5,
  },
  buttonText: {
    color: Colors.text.inverse,
    fontSize: 13,
    fontWeight: "600",
  },
});
