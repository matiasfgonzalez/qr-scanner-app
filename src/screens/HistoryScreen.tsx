import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";
import { getScans, ScanItem, clearScans } from "../utils/storage";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = NativeStackScreenProps<RootStackParamList, "History">;

export default function HistoryScreen({ navigation }: Readonly<Props>) {
  const [scans, setScans] = useState<ScanItem[]>([]);

  useEffect(() => {
    const load = async () => {
      const data = await getScans();
      setScans(data);
    };
    const unsubscribe = navigation.addListener("focus", load);
    return unsubscribe;
  }, [navigation]);

  const renderItem = ({ item }: { item: ScanItem }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        navigation.navigate("Result", {
          data: item.data,
          type: item.type,
          fromScanner: false,
          location: item.location,
        })
      }
    >
      <Text style={styles.data} numberOfLines={1}>
        {item.data}
      </Text>
      <Text style={styles.meta}>
        {item.type} • {new Date(item.date).toLocaleString()}
      </Text>
      {item.location && (
        <Text style={styles.locationText}>
          📍{" "}
          {item.location.address ||
            `${item.location.latitude.toFixed(
              4
            )}, ${item.location.longitude.toFixed(4)}`}
        </Text>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <View style={styles.container}>
        <Text style={styles.title}>Historial de escaneos</Text>
        {scans.length === 0 ? (
          <Text style={styles.empty}>No hay escaneos guardados aún.</Text>
        ) : (
          <FlatList
            data={scans}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16 }}
          />
        )}

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: "#10b981" }]}
          onPress={() => navigation.replace("Scanner")}
        >
          <Text style={styles.btnText}>Escanear de nuevo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: "#2563eb" }]}
          onPress={() => navigation.navigate("Map", {})}
        >
          <Text style={styles.btnText}>🗺️ Ver mapa de escaneos</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.clearBtn}
          onPress={async () => {
            await clearScans();
            setScans([]);
          }}
        >
          <Text style={styles.clearText}>Borrar historial</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", paddingTop: 40 },
  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  data: { fontWeight: "600" },
  meta: { fontSize: 12, color: "#6b7280", marginTop: 4 },
  locationText: {
    fontSize: 11,
    color: "#2563eb",
    marginTop: 4,
  },
  empty: { textAlign: "center", marginTop: 40, color: "#6b7280" },
  clearBtn: {
    backgroundColor: "#ef4444",
    padding: 12,
    margin: 16,
    borderRadius: 8,
  },
  clearText: { color: "#fff", textAlign: "center", fontWeight: "600" },
  actionBtn: {
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 0,
    padding: 12,
    margin: 16,
  },
  btnText: { color: "#fff", fontWeight: "600" },
});
