import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Linking, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { BarcodeScanningResult, BarcodeType, CameraView, scanFromURLAsync, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { TabScreenProps } from "../navigation/types";
import { useApp } from "../state/AppContext";
import { ScannerFrame, ScanState } from "../components/motion";
import { Button, IconButton, PressableScale } from "../components/ui";
import { useToast } from "../components/Toast";
import { recordScan } from "../lib/scan";
import { haptic } from "../lib/haptics";
import { requestLocationPermission } from "../lib/location";
import { font, radius, space } from "../theme";

const ALL_TYPES: BarcodeType[] = ["qr", "datamatrix", "aztec", "pdf417", "ean13", "ean8", "upc_a", "upc_e", "code128", "code39", "code93", "itf14", "codabar"];
const QR_ONLY: BarcodeType[] = ["qr"];

/** Ignora relecturas del mismo código durante este lapso */
const DUPLICATE_WINDOW_MS = 3000;
/** Tiempo para que se vea el check antes de navegar */
const SUCCESS_HOLD_MS = 520;

export default function ScannerScreen({ navigation }: TabScreenProps<"Scan">) {
  const { settings, colors } = useApp();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const focused = useIsFocused();

  const [permission, requestPermission] = useCameraPermissions();
  const [appActive, setAppActive] = useState(AppState.currentState === "active");
  const [facing, setFacing] = useState<"back" | "front">("back");
  const [torch, setTorch] = useState(false);
  const [state, setState] = useState<ScanState>("idle");
  const [hasLocation, setHasLocation] = useState<boolean | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [gpsOn, setGpsOn] = useState(true);

  const locked = useRef(false);
  const last = useRef<{ data: string; at: number } | null>(null);
  const navTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const frameSize = Math.min(width * 0.68, 300);

  // ── Ciclo de vida ──────────────────────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => setAppActive(s === "active"));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain && permission.status === "undetermined") {
      requestPermission();
    }
  }, [permission, requestPermission]);

  useEffect(() => {
    if (!settings.saveLocation) {
      setHasLocation(false);
      return;
    }
    (async () => {
      const current = await Location.getForegroundPermissionsAsync();
      if (current.status === "undetermined") setHasLocation(await requestLocationPermission());
      else setHasLocation(current.status === "granted");
    })();
  }, [settings.saveLocation]);

  // Al volver a la pestaña: reiniciar el visor
  useFocusEffect(
    useCallback(() => {
      locked.current = false;
      setState("idle");
      // Si el mismo código sigue frente a la cámara al volver, no relanzarlo enseguida
      if (last.current) last.current.at = Date.now();
      Location.hasServicesEnabledAsync().then(setGpsOn).catch(() => undefined);
      return () => {
        if (navTimer.current) clearTimeout(navTimer.current);
        setTorch(false);
      };
    }, [])
  );

  // ── Manejo de lecturas ─────────────────────────────────────
  const handleDetected = useCallback(
    async (data: string, format: string | undefined, source: "camera" | "image") => {
      if (locked.current) return;
      const now = Date.now();
      if (source === "camera" && last.current && last.current.data === data && now - last.current.at < DUPLICATE_WINDOW_MS) return;
      locked.current = true;
      last.current = { data, at: now };

      setState("success");
      haptic.success();

      let params: { scanId?: string; data?: string; format?: string; justScanned: boolean };
      try {
        const item = await recordScan({ data, format, source, withLocation: settings.saveLocation && !!hasLocation });
        params = { scanId: item.id, justScanned: true };
      } catch (err) {
        // Si falla el guardado, igual mostramos el resultado (sin historial)
        console.warn("No se pudo guardar el escaneo:", err);
        params = { data, format, justScanned: true };
      }
      navTimer.current = setTimeout(() => navigation.navigate("Result", params), SUCCESS_HOLD_MS);
    },
    [navigation, settings.saveLocation, hasLocation]
  );

  const onBarcodeScanned = useCallback(
    (result: BarcodeScanningResult) => {
      // En Android `data` es el valor "para mostrar" de ML Kit (p. ej. un Wi‑Fi
      // llega como "Red clave"); `raw` conserva el contenido original.
      const value = result?.raw || result?.data;
      if (!value) return;
      handleDetected(value, result.type, "camera");
    },
    [handleDetected]
  );

  const scanFromGallery = useCallback(async () => {
    if (locked.current) return;
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
    if (picked.canceled || !picked.assets?.[0]) return;
    try {
      const results = await scanFromURLAsync(picked.assets[0].uri, settings.allFormats ? ALL_TYPES : QR_ONLY);
      const first = results.find((r) => r.raw || r.data);
      if (first) {
        handleDetected(first.raw || first.data, first.type, "image");
        return;
      }
    } catch (err) {
      console.warn("Error leyendo imagen:", err);
    }
    setState("error");
    haptic.error();
    toast.show({ message: "No se encontró ningún código en la imagen", icon: "alert-circle" });
    setTimeout(() => setState("idle"), 900);
  }, [handleDetected, settings.allFormats, toast]);

  const toggleTorch = () => {
    if (facing === "front") {
      toast.show({ message: "La linterna sólo funciona con la cámara trasera", icon: "flash-off" });
      return;
    }
    haptic.selection();
    setTorch((t) => !t);
  };

  const flipCamera = () => {
    haptic.selection();
    setTorch(false);
    setFacing((f) => (f === "back" ? "front" : "back"));
  };

  // ── Permisos ───────────────────────────────────────────────
  if (!permission) {
    return <View style={[styles.fill, { backgroundColor: "#000" }]} />;
  }

  if (!permission.granted) {
    const blocked = !permission.canAskAgain;
    return (
      <View style={[styles.fill, styles.permission, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
        <View style={[styles.permIcon, { backgroundColor: colors.accentSoft }]}>
          <Ionicons name="camera-outline" size={34} color={colors.accent} />
        </View>
        <Text style={[styles.permTitle, { color: colors.text }]}>Necesitamos la cámara</Text>
        <Text style={[styles.permText, { color: colors.textMuted }]}>
          {blocked
            ? "El acceso a la cámara está desactivado. Activalo desde los ajustes del sistema para escanear."
            : "La usamos sólo para leer códigos QR y de barras. Nada se graba ni se envía."}
        </Text>
        <Button
          label={blocked ? "Abrir ajustes" : "Permitir cámara"}
          icon={blocked ? "settings-outline" : "camera"}
          size="lg"
          onPress={blocked ? () => Linking.openSettings() : requestPermission}
          style={{ alignSelf: "stretch", marginTop: space.xxl }}
        />
        <Button label="Escanear desde una imagen" icon="image-outline" variant="ghost" onPress={scanFromGallery} style={{ marginTop: space.sm }} />
      </View>
    );
  }

  // ── Visor ──────────────────────────────────────────────────
  const cameraActive = focused && appActive;
  const locOn = !!hasLocation && gpsOn;
  const locLabel = !settings.saveLocation || !hasLocation ? "Sin ubicación" : gpsOn ? "Ubicación activa" : "GPS apagado";
  const frameTop = Math.max(insets.top + 96, (height - frameSize) / 2 - 70);
  const frameLeft = (width - frameSize) / 2;

  return (
    <View style={[styles.fill, { backgroundColor: "#000" }]}>
      {focused && <StatusBar style="light" />}
      {cameraActive && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing={facing}
          enableTorch={torch && facing === "back"}
          onCameraReady={() => setCameraReady(true)}
          onBarcodeScanned={state === "idle" ? onBarcodeScanned : undefined}
          barcodeScannerSettings={{ barcodeTypes: settings.allFormats ? ALL_TYPES : QR_ONLY }}
        />
      )}

      {/* Máscara con recorte: enfoca la atención en el visor */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={[styles.mask, { height: frameTop }]} />
        <View style={{ flexDirection: "row", height: frameSize }}>
          <View style={[styles.mask, { width: frameLeft }]} />
          <View style={{ width: frameSize }} />
          <View style={[styles.mask, { flex: 1 }]} />
        </View>
        <View style={[styles.mask, { flex: 1 }]} />
      </View>

      {/* Visor animado (moxen · Escáner) */}
      <View style={{ position: "absolute", top: frameTop, left: frameLeft }} pointerEvents="none">
        <ScannerFrame size={frameSize} state={state} successColor="#22C55E" errorColor="#FF5A5A" />
      </View>

      {/* Barra superior */}
      <View style={[styles.topBar, { paddingTop: insets.top + space.sm }]}>
        <PressableScale
          onPress={async () => {
            if (!settings.saveLocation) {
              navigation.navigate("Settings");
              return;
            }
            if (!hasLocation) setHasLocation(await requestLocationPermission());
          }}
          accessibilityRole="button"
          accessibilityLabel={locLabel}
          style={styles.pill}
        >
          <Ionicons name={locOn ? "location" : "location-outline"} size={14} color={locOn ? "#4ADE80" : "#C9CED6"} />
          <Text style={styles.pillText}>{locLabel}</Text>
        </PressableScale>
        <View style={styles.topActions}>
          <IconButton tone="glass" icon={torch ? "flash" : "flash-outline"} label={torch ? "Apagar linterna" : "Encender linterna"} active={torch} onPress={toggleTorch} />
          <IconButton tone="glass" icon="camera-reverse-outline" label="Cambiar cámara" onPress={flipCamera} />
        </View>
      </View>

      {/* Indicaciones */}
      <View style={[styles.hintWrap, { top: frameTop + frameSize + space.xxl }]} pointerEvents="none">
        {state === "idle" ? (
          <Animated.View key="idle" entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)} style={{ alignItems: "center" }}>
            <Text style={styles.hint}>{cameraReady ? "Apuntá a un código" : "Iniciando cámara…"}</Text>
            <Text style={styles.subHint}>{settings.allFormats ? "QR, Data Matrix, PDF417 y códigos de barras" : "Sólo códigos QR"}</Text>
          </Animated.View>
        ) : state === "success" ? (
          <Animated.View key="ok" entering={FadeIn.duration(140)}>
            <Text style={styles.hint}>¡Código leído!</Text>
          </Animated.View>
        ) : null}
      </View>

      {/* Acción secundaria */}
      <View style={[styles.bottom, { bottom: space.xl }]}>
        <PressableScale onPress={scanFromGallery} accessibilityRole="button" accessibilityLabel="Escanear desde una imagen de la galería" style={styles.galleryBtn}>
          <Ionicons name="images-outline" size={18} color="#FFFFFF" />
          <Text style={styles.galleryText}>Desde galería</Text>
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  mask: { backgroundColor: "rgba(0,0,0,0.55)" },
  topBar: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: space.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topActions: { flexDirection: "row", gap: space.sm },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(20,22,27,0.55)",
    paddingHorizontal: 12,
    height: 36,
    borderRadius: radius.full,
  },
  pillText: { color: "#FFFFFF", fontSize: font.size.sm, fontWeight: font.weight.semibold },
  hintWrap: { position: "absolute", left: space.xl, right: space.xl, alignItems: "center" },
  hint: { color: "#FFFFFF", fontSize: font.size.xl, fontWeight: font.weight.bold, letterSpacing: -0.3, textAlign: "center" },
  subHint: { color: "rgba(255,255,255,0.7)", fontSize: font.size.sm, marginTop: 6, textAlign: "center" },
  bottom: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  galleryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 48,
    paddingHorizontal: space.xl,
    borderRadius: radius.full,
    backgroundColor: "rgba(20,22,27,0.6)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.25)",
  },
  galleryText: { color: "#FFFFFF", fontSize: font.size.md, fontWeight: font.weight.semibold },
  permission: { alignItems: "center", justifyContent: "center", paddingHorizontal: space.xxxl },
  permIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: space.xl },
  permTitle: { fontSize: font.size.xxl, fontWeight: font.weight.heavy, letterSpacing: -0.5, textAlign: "center" },
  permText: { fontSize: font.size.md, lineHeight: 22, textAlign: "center", marginTop: space.sm },
});
