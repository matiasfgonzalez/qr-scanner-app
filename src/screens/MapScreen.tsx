import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import MapView, { Marker, Callout } from "react-native-maps";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";
import { getScans, ScanItem } from "../utils/storage";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = NativeStackScreenProps<RootStackParamList, "Map">;

export default function MapScreen({ navigation, route }: Readonly<Props>) {
  const [scans, setScans] = useState<ScanItem[]>([]);
  const { filterQrData } = route.params || {};

  useEffect(() => {
    const load = async () => {
      const data = await getScans();
      // Filtrar solo los escaneos que tienen ubicación
      let scansWithLocation = data.filter((scan) => scan.location);

      // Si hay un filtro de QR específico, mostrar solo ese
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

  // Agrupar escaneos por código QR para tracking
  const groupedByQr = scans.reduce((acc, scan) => {
    if (!acc[scan.data]) {
      acc[scan.data] = [];
    }
    acc[scan.data].push(scan);
    return acc;
  }, {} as Record<string, ScanItem[]>);

  // Generar colores únicos para cada QR
  const qrColors: Record<string, string> = {};
  const colors = [
    "#e63946",
    "#2a9d8f",
    "#e9c46a",
    "#264653",
    "#f4a261",
    "#a8dadc",
    "#457b9d",
    "#1d3557",
    "#f77f00",
    "#d62828",
  ];
  Object.keys(groupedByQr).forEach((qr, index) => {
    qrColors[qr] = colors[index % colors.length];
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {filterQrData ? "Ruta del QR" : "Mapa de Escaneos"}
          </Text>
          <Text style={styles.subtitle}>
            {scans.length} escaneo{scans.length !== 1 ? "s" : ""} con ubicación
          </Text>
        </View>

        {scans.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No hay escaneos con ubicación registrada.
            </Text>
            <Text style={styles.emptySubtext}>
              Escanea códigos QR para ver su ubicación en el mapa.
            </Text>
          </View>
        ) : (
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
                    <Text style={styles.calloutTitle} numberOfLines={1}>
                      QR: {scan.data.substring(0, 30)}
                      {scan.data.length > 30 ? "..." : ""}
                    </Text>
                    <Text style={styles.calloutDate}>
                      {new Date(scan.date).toLocaleString()}
                    </Text>
                    {scan.location?.address && (
                      <Text style={styles.calloutAddress} numberOfLines={2}>
                        📍 {scan.location.address}
                      </Text>
                    )}
                    <Text style={styles.calloutOrder}>
                      Escaneo #{scans.length - index} de este QR
                    </Text>
                  </View>
                </Callout>
              </Marker>
            ))}
          </MapView>
        )}

        {/* Leyenda de colores */}
        {!filterQrData && Object.keys(groupedByQr).length > 1 && (
          <View style={styles.legend}>
            <Text style={styles.legendTitle}>Códigos QR:</Text>
            {Object.entries(groupedByQr)
              .slice(0, 5)
              .map(([qr, items]) => (
                <View key={qr} style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendColor,
                      { backgroundColor: qrColors[qr] },
                    ]}
                  />
                  <Text style={styles.legendText} numberOfLines={1}>
                    {qr.substring(0, 20)}... ({items.length} escaneos)
                  </Text>
                </View>
              ))}
            {Object.keys(groupedByQr).length > 5 && (
              <Text style={styles.legendMore}>
                +{Object.keys(groupedByQr).length - 5} más
              </Text>
            )}
          </View>
        )}

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#10b981" }]}
            onPress={() => navigation.replace("Scanner")}
          >
            <Text style={styles.buttonText}>Escanear</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#6b7280" }]}
            onPress={() => navigation.navigate("History")}
          >
            <Text style={styles.buttonText}>Historial</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 4,
  },
  map: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 8,
  },
  callout: {
    padding: 8,
    maxWidth: 200,
  },
  calloutTitle: {
    fontWeight: "600",
    marginBottom: 4,
  },
  calloutDate: {
    fontSize: 12,
    color: "#6b7280",
  },
  calloutAddress: {
    fontSize: 11,
    color: "#374151",
    marginTop: 4,
  },
  calloutOrder: {
    fontSize: 11,
    color: "#2563eb",
    marginTop: 4,
    fontWeight: "500",
  },
  legend: {
    position: "absolute",
    bottom: 80,
    left: 16,
    backgroundColor: "rgba(255,255,255,0.95)",
    padding: 12,
    borderRadius: 8,
    maxWidth: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  legendTitle: {
    fontWeight: "700",
    marginBottom: 8,
    fontSize: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 11,
    flex: 1,
  },
  legendMore: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
});
