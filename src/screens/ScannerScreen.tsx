import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
  Dimensions,
  Alert,
} from "react-native";
import {
  CameraView,
  useCameraPermissions,
  BarcodeScanningResult,
} from "expo-camera";
import * as Location from "expo-location";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";
import { SafeAreaView } from "react-native-safe-area-context";
import { LocationInfo } from "../utils/storage";

// ═══════════════════════════════════════════════════════════════
// 🎨 SISTEMA DE COLORES PREMIUM
// ═══════════════════════════════════════════════════════════════
const Colors = {
  primary: { 500: "#3b82f6", 600: "#2563eb" },
  secondary: { 400: "#34d399", 500: "#10b981" },
  neutral: { 400: "#94a3b8", 900: "#0f172a", 950: "#020617" },
  danger: { 500: "#ef4444" },
  warning: "#f59e0b",
  text: { inverse: "#ffffff" },
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const FRAME_SIZE = Math.min(SCREEN_WIDTH * 0.7, 280);

type Props = NativeStackScreenProps<RootStackParamList, "Scanner">;

/**
 * 📷 ScannerScreen - Pantalla principal de escaneo QR
 * Diseño premium con animaciones sutiles y UX optimizada
 */
export default function ScannerScreen({ navigation }: Readonly<Props>) {
  const [permission, requestPermission] = useCameraPermissions();
  const [locationPermission, setLocationPermission] = useState<boolean | null>(
    null
  );
  const [scanned, setScanned] = useState(false);
  const [type, setType] = useState<"front" | "back">("back");

  // ═══════════════════════════════════════════════════════════════
  // 🔦 CONTROL DE FLASH/TORCH - Modo antorcha para iluminación continua
  // En expo-camera v17+, usamos enableTorch para modo antorcha constante
  // ═══════════════════════════════════════════════════════════════
  const [torchEnabled, setTorchEnabled] = useState<boolean>(false);
  const [flashError, setFlashError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  // Animaciones
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  /**
   * 🔦 Toggle del flash/torch con manejo de errores robusto
   * Usa el modo "torch" para iluminación constante (mejor para escaneo QR)
   */
  const handleToggleFlash = useCallback(() => {
    try {
      // Validar que estamos usando la cámara trasera (el flash frontal no existe)
      if (type === "front") {
        setFlashError("El flash solo funciona con la cámara trasera");
        Alert.alert(
          "Flash no disponible",
          "El flash solo está disponible cuando usas la cámara trasera.",
          [{ text: "Entendido", onPress: () => setFlashError(null) }]
        );
        return;
      }

      // Toggle del estado del torch
      setTorchEnabled((prev) => {
        const newState = !prev;
        console.log(`🔦 Flash ${newState ? "ENCENDIDO" : "APAGADO"}`);
        setFlashError(null); // Limpiar errores previos
        return newState;
      });
    } catch (error) {
      console.error("Error al cambiar estado del flash:", error);
      setFlashError("Error al controlar el flash");
      Alert.alert(
        "Error de Flash",
        "No se pudo controlar el flash. Verifica que tu dispositivo tenga flash disponible.",
        [{ text: "OK" }]
      );
    }
  }, [type]);

  /**
   * 🔄 Cambio de cámara con desactivación automática del flash
   */
  const handleToggleCamera = useCallback(() => {
    setType((prev) => {
      const newType = prev === "back" ? "front" : "back";
      // Apagar el flash si cambiamos a cámara frontal
      if (newType === "front" && torchEnabled) {
        setTorchEnabled(false);
        console.log("🔦 Flash desactivado automáticamente (cámara frontal)");
      }
      return newType;
    });
  }, [torchEnabled]);

  // Animación de pulso del frame
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.02,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Animación de línea de escaneo
  useEffect(() => {
    const scanLine = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    scanLine.start();
    return () => scanLine.stop();
  }, []);

  // Pedir permisos en el primer render
  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === "granted");
    })();
  }, []);

  const getCurrentLocation = async (): Promise<LocationInfo | undefined> => {
    try {
      if (!locationPermission) {
        console.log("No hay permiso de ubicación");
        return undefined;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      let address: string | undefined;
      try {
        const [geocode] = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        if (geocode) {
          address = [
            geocode.street,
            geocode.streetNumber,
            geocode.city,
            geocode.region,
            geocode.country,
          ]
            .filter(Boolean)
            .join(", ");
        }
      } catch (geocodeError) {
        console.log("Error obteniendo dirección:", geocodeError);
      }

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address,
      };
    } catch (error) {
      console.error("Error obteniendo ubicación:", error);
      return undefined;
    }
  };

  const handleBarCodeScanned = async (result: BarcodeScanningResult) => {
    if (scanned || isLoading) return;
    setScanned(true);
    setIsLoading(true);

    const location = await getCurrentLocation();

    navigation.navigate("Result", {
      data: result.data,
      type: result.type || "unknown",
      fromScanner: true,
      location,
    });

    setIsLoading(false);
  };

  // Pantalla de carga de permisos
  if (!permission) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <View style={styles.permissionContent}>
          <View style={styles.iconContainer}>
            <Text style={styles.iconEmoji}>📷</Text>
          </View>
          <Text style={styles.permissionTitle}>Acceso a cámara</Text>
          <Text style={styles.permissionText}>
            Solicitando permiso de cámara...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Pantalla sin permisos
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <View style={styles.permissionContent}>
          <View style={styles.iconContainerWarning}>
            <Text style={styles.iconEmoji}>🔒</Text>
          </View>
          <Text style={styles.permissionTitle}>Permiso requerido</Text>
          <Text style={styles.permissionText}>
            Para escanear códigos QR necesitamos acceso a tu cámara.
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}
            activeOpacity={0.8}
          >
            <Text style={styles.permissionButtonText}>Permitir acceso</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const scanLineTranslate = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, FRAME_SIZE - 4],
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <CameraView
          style={styles.camera}
          facing={type}
          enableTorch={torchEnabled}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        >
          {/* Overlay con estructura */}
          <View style={styles.overlay}>
            {/* Header con instrucciones */}
            <View style={styles.headerOverlay}>
              <View style={styles.instructionBadge}>
                <Text style={styles.instructionText}>
                  {isLoading
                    ? "⏳ Obteniendo ubicación..."
                    : "📱 Apunta al código QR"}
                </Text>
              </View>
              {/* Badges de estado */}
              <View style={styles.statusBadges}>
                {locationPermission && (
                  <View style={styles.locationBadge}>
                    <Text style={styles.locationBadgeText}>📍 GPS</Text>
                  </View>
                )}
                {torchEnabled && (
                  <View style={styles.flashBadge}>
                    <Text style={styles.flashBadgeText}>💡 Flash ON</Text>
                  </View>
                )}
              </View>
              {/* Mensaje de error del flash */}
              {flashError && (
                <View style={styles.errorBadge}>
                  <Text style={styles.errorBadgeText}>⚠️ {flashError}</Text>
                </View>
              )}
            </View>

            {/* Frame de escaneo animado */}
            <View style={styles.frameContainer}>
              <Animated.View
                style={[styles.frame, { transform: [{ scale: pulseAnim }] }]}
              >
                {/* Esquinas decorativas */}
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />

                {/* Línea de escaneo animada */}
                <Animated.View
                  style={[
                    styles.scanLine,
                    { transform: [{ translateY: scanLineTranslate }] },
                  ]}
                />
              </Animated.View>
            </View>

            {/* Barra de acciones inferior */}
            <View style={styles.bottomActions}>
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    type === "front" && styles.actionButtonActive,
                  ]}
                  onPress={handleToggleCamera}
                  activeOpacity={0.7}
                >
                  <Text style={styles.actionIcon}>🔄</Text>
                  <Text style={styles.actionLabel}>
                    {type === "back" ? "Frontal" : "Trasera"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    torchEnabled && styles.actionButtonFlashActive,
                    type === "front" && styles.actionButtonDisabled,
                  ]}
                  onPress={handleToggleFlash}
                  activeOpacity={0.7}
                  disabled={false}
                >
                  <Text style={styles.actionIcon}>
                    {torchEnabled ? "💡" : "🔦"}
                  </Text>
                  <Text
                    style={[
                      styles.actionLabel,
                      type === "front" && styles.actionLabelDisabled,
                    ]}
                  >
                    {torchEnabled ? "Apagar" : "Flash"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => navigation.navigate("History")}
                  activeOpacity={0.7}
                >
                  <Text style={styles.actionIcon}>📋</Text>
                  <Text style={styles.actionLabel}>Historial</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => navigation.navigate("Map", {})}
                  activeOpacity={0.7}
                >
                  <Text style={styles.actionIcon}>🗺️</Text>
                  <Text style={styles.actionLabel}>Mapa</Text>
                </TouchableOpacity>
              </View>

              {scanned && (
                <TouchableOpacity
                  style={styles.rescanButton}
                  onPress={() => setScanned(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.rescanButtonText}>
                    ↻ Escanear de nuevo
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </CameraView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.neutral[950],
  },
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },

  // ═══════════════════════════════════════════════════════════════
  // OVERLAY Y ESTRUCTURA
  // ═══════════════════════════════════════════════════════════════
  overlay: {
    flex: 1,
    backgroundColor: "transparent",
  },
  headerOverlay: {
    paddingTop: Platform.OS === "ios" ? 20 : 40,
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 8,
  },
  instructionBadge: {
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  instructionText: {
    color: Colors.text.inverse,
    fontSize: 15,
    fontWeight: "500",
  },
  locationBadge: {
    backgroundColor: Colors.secondary[500] + "CC",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  locationBadgeText: {
    color: Colors.text.inverse,
    fontSize: 11,
    fontWeight: "600",
  },
  statusBadges: {
    flexDirection: "row",
    gap: 6,
  },
  flashBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.warning + "CC",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
    gap: 4,
  },
  flashBadgeText: {
    color: Colors.neutral[900],
    fontSize: 11,
    fontWeight: "600",
  },
  errorBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.danger[500] + "CC",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
    gap: 4,
  },
  errorBadgeText: {
    color: Colors.text.inverse,
    fontSize: 11,
    fontWeight: "600",
  },

  // ═══════════════════════════════════════════════════════════════
  // FRAME DE ESCANEO
  // ═══════════════════════════════════════════════════════════════
  frameContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  frame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    backgroundColor: "transparent",
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 28,
    height: 28,
    borderColor: Colors.secondary[400],
    borderWidth: 4,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 8,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 8,
  },
  scanLine: {
    position: "absolute",
    left: 10,
    right: 10,
    height: 3,
    backgroundColor: Colors.secondary[400],
    borderRadius: 2,
    shadowColor: Colors.secondary[400],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },

  // ═══════════════════════════════════════════════════════════════
  // ACCIONES INFERIORES
  // ═══════════════════════════════════════════════════════════════
  bottomActions: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === "ios" ? 32 : 24,
    gap: 16,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  actionButton: {
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 65,
  },
  actionButtonActive: {
    backgroundColor: Colors.secondary[500] + "40",
  },
  actionButtonFlashActive: {
    backgroundColor: Colors.warning + "40",
  },
  actionButtonDisabled: {
    opacity: 0.4,
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  actionLabel: {
    color: Colors.text.inverse,
    fontSize: 11,
    fontWeight: "500",
  },
  actionLabelDisabled: {
    color: Colors.neutral[400],
  },
  rescanButton: {
    backgroundColor: Colors.primary[600],
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: Colors.primary[600],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  rescanButtonText: {
    color: Colors.text.inverse,
    fontSize: 15,
    fontWeight: "600",
  },

  // ═══════════════════════════════════════════════════════════════
  // PANTALLAS DE PERMISOS
  // ═══════════════════════════════════════════════════════════════
  permissionContainer: {
    flex: 1,
    backgroundColor: Colors.neutral[900],
  },
  permissionContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary[600] + "20",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  iconContainerWarning: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.danger[500] + "20",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  iconEmoji: {
    fontSize: 48,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.text.inverse,
    marginBottom: 8,
    textAlign: "center",
  },
  permissionText: {
    fontSize: 15,
    color: Colors.neutral[400],
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: Colors.primary[600],
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    shadowColor: Colors.primary[600],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  permissionButtonText: {
    color: Colors.text.inverse,
    fontSize: 15,
    fontWeight: "600",
  },
});
