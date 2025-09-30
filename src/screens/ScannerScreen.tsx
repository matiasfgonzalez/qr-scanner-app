import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
import {
  CameraView,
  useCameraPermissions,
  BarcodeScanningResult,
  FlashMode,
} from "expo-camera";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = NativeStackScreenProps<RootStackParamList, "Scanner">;

export default function ScannerScreen({ navigation }: Readonly<Props>) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [type, setType] = useState<"front" | "back">("back");

  const [flash, setFlash] = useState<FlashMode>("off");

  // pedir permisos en el primer render
  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, []);

  const handleBarCodeScanned = (result: BarcodeScanningResult) => {
    if (scanned) return; // evita múltiples lecturas rápidas
    setScanned(true);
    navigation.navigate("Result", {
      data: result.data,
      type: result.type || "unknown",
      fromScanner: true, // 👈 nuevo
    });
  };

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text>Solicitando permiso de cámara...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text>
          No se ha concedido permiso de cámara. Activa el permiso en ajustes.
        </Text>
        <TouchableOpacity onPress={requestPermission} style={styles.button}>
          <Text style={styles.buttonText}>Dar permiso</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <View style={styles.container}>
        <CameraView
          style={styles.camera}
          facing={type}
          flash={flash}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
        >
          <View style={styles.overlayTop}>
            <Text style={styles.instruction}>Apunta la cámara hacia el QR</Text>
          </View>

          <View style={styles.centerBox}>
            <View style={styles.frame} />
          </View>

          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => setType((t) => (t === "back" ? "front" : "back"))}
            >
              <Text style={styles.buttonText}>Cambiar cámara</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.button}
              onPress={() => navigation.navigate("History")}
            >
              <Text style={styles.buttonText}>Historial</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.button}
              onPress={() =>
                setFlash((prev) => (prev === "off" ? "on" : "off"))
              }
            >
              <Text style={styles.buttonText}>
                {flash === "off" ? "Encender flash" : "Apagar flash"}
              </Text>
            </TouchableOpacity>

            {scanned && (
              <TouchableOpacity
                style={[styles.button, { backgroundColor: "#3b82f6" }]}
                onPress={() => setScanned(false)}
              >
                <Text style={styles.buttonText}>Volver a escanear</Text>
              </TouchableOpacity>
            )}
          </View>
        </CameraView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
  overlayTop: {
    position: "absolute",
    top: 40,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  instruction: {
    color: "#fff",
    fontSize: 16,
    backgroundColor: "rgba(0,0,0,0.4)",
    padding: 8,
    borderRadius: 6,
  },
  centerBox: { flex: 1, justifyContent: "center", alignItems: "center" },
  frame: {
    width: 260,
    height: 260,
    borderWidth: 2,
    borderColor: "#00FF00",
    borderRadius: 12,
    backgroundColor: "transparent",
    opacity: 0.9,
  },
  bottomBar: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 40 : 20,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  button: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#111827",
    borderRadius: 8,
  },
  buttonText: { color: "#fff", fontSize: 14 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});
