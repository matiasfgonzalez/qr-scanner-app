import React, { useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";
import * as Clipboard from "expo-clipboard";
import * as Linking from "expo-linking";
import { saveScan } from "../utils/storage";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = NativeStackScreenProps<RootStackParamList, "Result">;

export default function ResultScreen({ route, navigation }: Readonly<Props>) {
  const { data, location } = route.params;

  useEffect(() => {
    const save = async () => {
      // solo guardar si viene del scanner
      if (route.params.fromScanner) {
        console.log(
          "Intentando guardar scan:",
          data,
          route.params.type,
          location
        );
        if (data && route.params.type) {
          await saveScan(data, route.params.type, location);
          console.log("Scan guardado correctamente con ubicación");
        }
      }
    };
    save();
  }, []);

  // intenta parsear JSON si corresponde
  const parsed = useMemo(() => {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }, [data]);

  const isUrl = useMemo(() => {
    const regexp = /^(https?:\/\/)/i;
    return regexp.test(data);
  }, [data]);

  const handleOpen = async () => {
    if (!isUrl) {
      Alert.alert("No es un URL válido", data);
      return;
    }
    const proceed = await new Promise<boolean>((resolve) => {
      Alert.alert(
        "Abrir URL",
        `¿Deseas abrir:\n\n${data}`,
        [
          { text: "Cancelar", onPress: () => resolve(false), style: "cancel" },
          { text: "Abrir", onPress: () => resolve(true) },
        ],
        { cancelable: true }
      );
    });
    if (proceed) {
      try {
        await Linking.openURL(data);
      } catch (err) {
        Alert.alert("Error abriendo URL", String(err));
      }
    }
  };

  const handleCopy = async () => {
    await Clipboard.setStringAsync(data);
    Alert.alert("Copiado", "Contenido copiado al portapapeles");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <View style={styles.container}>
        <Text style={styles.title}>Resultado del QR</Text>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.label}>Raw:</Text>
          <View style={styles.card}>
            <Text selectable>{data}</Text>
          </View>

          {parsed && (
            <>
              <Text style={styles.label}>JSON:</Text>
              <View style={styles.card}>
                <Text selectable>{JSON.stringify(parsed, null, 2)}</Text>
              </View>
            </>
          )}

          {location && (
            <>
              <Text style={styles.label}>📍 Ubicación del escaneo:</Text>
              <View style={styles.card}>
                <Text selectable>
                  Lat: {location.latitude.toFixed(6)}, Lng:{" "}
                  {location.longitude.toFixed(6)}
                </Text>
                {location.address && (
                  <Text style={styles.addressText}>{location.address}</Text>
                )}
              </View>
            </>
          )}

          <View style={styles.actions}>
            {isUrl && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.primary]}
                onPress={handleOpen}
              >
                <Text style={styles.btnText}>Abrir URL</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionBtn, styles.secondary]}
              onPress={handleCopy}
            >
              <Text style={styles.btnText}>Copiar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: "#2563eb" }]}
              onPress={() => navigation.navigate("Map", { filterQrData: data })}
            >
              <Text style={styles.btnText}>🗺️ Ver ruta de este QR</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: "#8b5cf6" }]}
              onPress={() => navigation.navigate("Map", {})}
            >
              <Text style={styles.btnText}>🗺️ Ver todos los escaneos</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: "#10b981" }]}
              onPress={() => navigation.replace("Scanner")}
            >
              <Text style={styles.btnText}>Escanear de nuevo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: "#6b7280" }]}
              onPress={() => navigation.navigate("History")}
            >
              <Text style={styles.btnText}>Ver historial</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 40, backgroundColor: "#f8fafc" },
  header: { paddingHorizontal: 16 },
  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
  },
  link: { color: "#3b82f6" },
  content: { padding: 16, gap: 12 },
  label: { fontWeight: "600", marginBottom: 6 },
  card: {
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  actions: { marginTop: 16, flexDirection: "column", gap: 10 },
  actionBtn: {
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 8,
  },
  primary: { backgroundColor: "#2563eb" },
  secondary: { backgroundColor: "#6b7280" },
  btnText: { color: "#fff", fontWeight: "600" },
  addressText: {
    color: "#6b7280",
    marginTop: 4,
    fontSize: 13,
  },
});
