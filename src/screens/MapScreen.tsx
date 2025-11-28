import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
} from "react-native";
import MapView, { Marker, Callout } from "react-native-maps";
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
    100: "#dbeafe",
    500: "#3b82f6",
    600: "#2563eb",
    700: "#1d4ed8",
  },
  secondary: { 50: "#ecfdf5", 500: "#10b981", 600: "#059669" },
  accent: { 50: "#f5f3ff", 500: "#8b5cf6", 600: "#7c3aed" },
  neutral: {
    50: "#f8fafc",
    100: "#f1f5f9",
    200: "#e2e8f0",
    400: "#94a3b8",
    600: "#475569",
    800: "#1e293b",
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

// Colores vibrantes para los marcadores
const MARKER_COLORS = [
  "#ef4444", // rojo
  "#3b82f6", // azul
  "#10b981", // verde
  "#f59e0b", // amarillo
  "#8b5cf6", // violeta
  "#ec4899", // rosa
  "#06b6d4", // cyan
  "#f97316", // naranja
];

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type Props = NativeStackScreenProps<RootStackParamList, "Map">;

/**
 * 🗺️ MapScreen - Visualización de escaneos en mapa
 * Diseño premium con leyenda interactiva
 */
export default function MapScreen({ navigation, route }: Readonly<Props>) {
  const [scans, setScans] = useState<ScanItem[]>([]);
  const { filterQrData } = route.params || {};

  useEffect(() => {
    const load = async () => {
      const data = await getScans();
      let scansWithLocation = data.filter((scan) => scan.location);

      if (filterQrData) {
        scansWithLocation = scansWithLocation.filter(
          (scan) => scan.data === filterQrData
        );
      }

      setScans(scansWithLocation);
    };
    load();
  }, [filterQrData]);

  // Calcular la región inicial del mapa
  const getInitialRegion = () => {
    if (scans.length === 0) {
      return {
        latitude: 0,
        longitude: 0,
        latitudeDelta: 100,
        longitudeDelta: 100,
      };
    }

    const lats = scans.map((s) => s.location!.latitude);
    const lngs = scans.map((s) => s.location!.longitude);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(0.01, (maxLat - minLat) * 1.5),
      longitudeDelta: Math.max(0.01, (maxLng - minLng) * 1.5),
    };
  };

  // Agrupar escaneos por código QR
  const groupedByQr = scans.reduce((acc, scan) => {
    if (!acc[scan.data]) {
      acc[scan.data] = [];
    }
    acc[scan.data].push(scan);
    return acc;
  }, {} as Record<string, ScanItem[]>);

  // Asignar colores a cada QR
  const qrColors: Record<string, string> = {};
  Object.keys(groupedByQr).forEach((qr, index) => {
    qrColors[qr] = MARKER_COLORS[index % MARKER_COLORS.length];
  });

  // Estado vacío
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Text style={styles.emptyIconText}>🗺️</Text>
      </View>
      <Text style={styles.emptyTitle}>Sin ubicaciones</Text>
      <Text style={styles.emptyDescription}>
        {filterQrData
          ? "Este código QR no tiene escaneos con ubicación."
          : "Aún no hay escaneos con ubicación registrada."}
        {"\n\n"}
        Escanea códigos QR para ver su ubicación en el mapa.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header Premium */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>
              {filterQrData ? "📍 Ruta del QR" : "🌍 Mapa de Escaneos"}
            </Text>
            <View style={styles.headerStats}>
              <View style={styles.statBadge}>
                <Text style={styles.statNumber}>{scans.length}</Text>
                <Text style={styles.statLabel}>escaneos</Text>
              </View>
              {!filterQrData && (
                <View style={[styles.statBadge, styles.statBadgeSecondary]}>
                  <Text style={styles.statNumberSecondary}>
                    {Object.keys(groupedByQr).length}
                  </Text>
                  <Text style={styles.statLabelSecondary}>QR únicos</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Mapa o estado vacío */}
        {scans.length === 0 ? (
          renderEmptyState()
        ) : (
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              initialRegion={getInitialRegion()}
              showsUserLocation={true}
              showsMyLocationButton={true}
            >
              {scans.map((scan, index) => (
                <Marker
                  key={scan.id}
                  coordinate={{
                    latitude: scan.location!.latitude,
                    longitude: scan.location!.longitude,
                  }}
                  pinColor={qrColors[scan.data]}
                >
                  <Callout>
                    <View style={styles.callout}>
                      <View style={styles.calloutHeader}>
                        <View
                          style={[
                            styles.calloutDot,
                            { backgroundColor: qrColors[scan.data] },
                          ]}
                        />
                        <Text style={styles.calloutIndex}>
                          #{scans.length - index}
                        </Text>
                      </View>
                      <Text style={styles.calloutTitle} numberOfLines={2}>
                        {scan.data.substring(0, 50)}
                        {scan.data.length > 50 ? "..." : ""}
                      </Text>
                      <Text style={styles.calloutDate}>
                        🕐 {new Date(scan.date).toLocaleString()}
                      </Text>
                      {scan.location?.address && (
                        <Text style={styles.calloutAddress} numberOfLines={2}>
                          📍 {scan.location.address}
                        </Text>
                      )}
                    </View>
                  </Callout>
                </Marker>
              ))}
            </MapView>

            {/* Leyenda flotante */}
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
                        {qr.substring(0, 18)}...
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
          </View>
        )}

        {/* Barra de acciones inferior */}
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

  // ═══════════════════════════════════════════════════════════════
  // HEADER
  // ═══════════════════════════════════════════════════════════════
  header: {
    backgroundColor: Colors.background.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text.primary,
    letterSpacing: -0.3,
  },
  headerStats: {
    flexDirection: "row",
    gap: 8,
  },
  statBadge: {
    backgroundColor: Colors.primary[50],
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statBadgeSecondary: {
    backgroundColor: Colors.secondary[50],
  },
  statNumber: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.primary[600],
  },
  statNumberSecondary: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.secondary[600],
  },
  statLabel: {
    fontSize: 11,
    color: Colors.primary[600],
  },
  statLabelSecondary: {
    fontSize: 11,
    color: Colors.secondary[600],
  },

  // ═══════════════════════════════════════════════════════════════
  // MAPA
  // ═══════════════════════════════════════════════════════════════
  mapContainer: {
    flex: 1,
    position: "relative",
  },
  map: {
    flex: 1,
  },

  // ═══════════════════════════════════════════════════════════════
  // CALLOUT
  // ═══════════════════════════════════════════════════════════════
  callout: {
    padding: 10,
    minWidth: 180,
    maxWidth: 220,
  },
  calloutHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  calloutDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  calloutIndex: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.text.muted,
  },
  calloutTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text.primary,
    marginBottom: 6,
    lineHeight: 18,
  },
  calloutDate: {
    fontSize: 11,
    color: Colors.text.muted,
    marginBottom: 4,
  },
  calloutAddress: {
    fontSize: 11,
    color: Colors.primary[600],
    lineHeight: 16,
  },

  // ═══════════════════════════════════════════════════════════════
  // LEYENDA
  // ═══════════════════════════════════════════════════════════════
  legend: {
    position: "absolute",
    bottom: 90,
    left: 16,
    backgroundColor: Colors.background.card,
    padding: 14,
    borderRadius: 12,
    maxWidth: 200,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.text.primary,
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  legendText: {
    flex: 1,
    fontSize: 11,
    color: Colors.text.secondary,
  },
  legendCount: {
    fontSize: 10,
    color: Colors.text.muted,
    fontWeight: "600",
  },
  legendMore: {
    fontSize: 11,
    color: Colors.text.muted,
    marginTop: 4,
    fontStyle: "italic",
  },

  // ═══════════════════════════════════════════════════════════════
  // ESTADO VACÍO
  // ═══════════════════════════════════════════════════════════════
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.neutral[100],
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyIconText: {
    fontSize: 36,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.text.primary,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 15,
    color: Colors.text.muted,
    textAlign: "center",
    lineHeight: 24,
  },

  // ═══════════════════════════════════════════════════════════════
  // BARRA INFERIOR
  // ═══════════════════════════════════════════════════════════════
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    padding: 16,
    gap: 12,
    backgroundColor: Colors.background.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonPrimary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.secondary[500],
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: Colors.secondary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonSecondary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.neutral[600],
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonAccent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.accent[500],
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  buttonText: {
    color: Colors.text.inverse,
    fontSize: 14,
    fontWeight: "600",
  },
});
