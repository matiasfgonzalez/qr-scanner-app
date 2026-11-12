import React, { useCallback, useEffect, useState } from "react";
import { Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import * as Device from "expo-device";
import * as Application from "expo-application";
import Constants from "expo-constants";
import * as Network from "expo-network";
import * as Battery from "expo-battery";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RootScreenProps } from "../navigation/types";
import { useApp } from "../state/AppContext";
import { Bone } from "../components/motion";
import { Button, Card, IconButton, ScreenHeader, SectionLabel } from "../components/ui";
import { useToast } from "../components/Toast";
import { copyText, IconName } from "../lib/actions";
import { formatDateTime } from "../lib/format";
import { font, palettes, radius, space } from "../theme";

type Row = { label: string; value: string | null | undefined; copy?: boolean };
type Section = { title: string; icon: IconName; rows: Row[] };
type Info = { deviceId: string; idLabel: string; idHint: string; sections: Section[] };

const DEVICE_TYPE: Record<number, string> = {
  [Device.DeviceType.PHONE]: "Teléfono",
  [Device.DeviceType.TABLET]: "Tablet",
  [Device.DeviceType.DESKTOP]: "Escritorio",
  [Device.DeviceType.TV]: "TV",
};

const BATTERY_STATE: Record<number, string> = {
  [Battery.BatteryState.CHARGING]: "Cargando",
  [Battery.BatteryState.FULL]: "Completa",
  [Battery.BatteryState.UNPLUGGED]: "Desconectada",
};

const yesNo = (v: boolean | null | undefined) => (v === null || v === undefined ? null : v ? "Sí" : "No");
const gb = (bytes: number | null) => (bytes ? `${(bytes / 1024 ** 3).toFixed(1)} GB` : null);

/** Cada fuente se consulta por separado: si una falla, el resto se muestra igual. */
async function safe<T>(fn: () => Promise<T> | T, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

async function collect(): Promise<Info> {
  const [net, ip, level, bstate, lowPower, installed, iosId] = await Promise.all([
    safe(() => Network.getNetworkStateAsync(), null),
    safe(() => Network.getIpAddressAsync(), null),
    safe(() => Battery.getBatteryLevelAsync(), -1),
    safe(() => Battery.getBatteryStateAsync(), Battery.BatteryState.UNKNOWN),
    safe(() => Battery.isLowPowerModeEnabledAsync(), false),
    safe(() => Application.getInstallationTimeAsync(), null),
    Platform.OS === "ios" ? safe(() => Application.getIosIdForVendorAsync(), null) : Promise.resolve(null),
  ]);
  const androidId = Platform.OS === "android" ? await safe(() => Application.getAndroidId(), null) : null;

  return {
    deviceId: androidId ?? iosId ?? "No disponible",
    idLabel: Platform.OS === "android" ? "Android ID" : Platform.OS === "ios" ? "iOS Vendor ID" : "ID del dispositivo",
    idHint: Platform.OS === "android" ? "Único por dispositivo y firma de app. Cambia con un restablecimiento de fábrica." : "Único por desarrollador. Cambia si se desinstalan todas sus apps.",
    sections: [
      {
        title: "Dispositivo",
        icon: "phone-portrait-outline",
        rows: [
          { label: "Marca", value: Device.brand },
          { label: "Fabricante", value: Device.manufacturer },
          { label: "Modelo", value: Device.modelName, copy: true },
          { label: "ID de modelo", value: Device.modelId },
          { label: "Diseño", value: Device.designName },
          { label: "Producto", value: Device.productName },
          { label: "Tipo", value: DEVICE_TYPE[Device.deviceType ?? -1] ?? "Desconocido" },
          { label: "Nombre", value: Device.deviceName },
          { label: "Año de clase", value: Device.deviceYearClass?.toString() },
          { label: "Dispositivo físico", value: yesNo(Device.isDevice) },
        ],
      },
      {
        title: "Sistema operativo",
        icon: "logo-android",
        rows: [
          { label: "Sistema", value: [Device.osName, Device.osVersion].filter(Boolean).join(" ") },
          { label: "Build", value: Device.osBuildId, copy: true },
          { label: "Build interno", value: Device.osInternalBuildId },
          { label: "Nivel de API", value: Device.platformApiLevel?.toString() },
        ],
      },
      {
        title: "Hardware",
        icon: "hardware-chip-outline",
        rows: [
          { label: "Memoria RAM", value: gb(Device.totalMemory) },
          { label: "Arquitectura", value: Device.supportedCpuArchitectures?.join(", ") },
        ],
      },
      {
        title: "Red",
        icon: "wifi-outline",
        rows: [
          { label: "Dirección IP", value: ip && ip !== "0.0.0.0" ? ip : null, copy: true },
          { label: "Tipo", value: net?.type ?? null },
          { label: "Conectado", value: yesNo(net?.isConnected) },
          { label: "Internet", value: yesNo(net?.isInternetReachable) },
        ],
      },
      {
        title: "Batería",
        icon: "battery-half-outline",
        rows: [
          { label: "Nivel", value: level >= 0 ? `${Math.round(level * 100)}%` : null },
          { label: "Estado", value: BATTERY_STATE[bstate] ?? "Desconocido" },
          { label: "Ahorro de energía", value: yesNo(lowPower) },
        ],
      },
      {
        title: "Aplicación",
        icon: "cube-outline",
        rows: [
          { label: "Nombre", value: Application.applicationName },
          { label: "Versión", value: Application.nativeApplicationVersion ?? Constants.expoConfig?.version },
          { label: "Build", value: Application.nativeBuildVersion },
          { label: "Instalada", value: installed ? formatDateTime(installed) : null },
          { label: "Expo SDK", value: Constants.expoConfig?.sdkVersion },
        ],
      },
    ],
  };
}

export default function DeviceInfoScreen({ navigation }: RootScreenProps<"DeviceInfo">) {
  const { colors } = useApp();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [info, setInfo] = useState<Info | null>(null);

  const load = useCallback(() => {
    setInfo(null);
    collect().then(setInfo);
  }, []);

  useEffect(load, [load]);

  const share = async () => {
    if (!info) return;
    const text = [
      `${info.idLabel}: ${info.deviceId}`,
      ...info.sections.flatMap((s) => ["", s.title.toUpperCase(), ...s.rows.filter((r) => r.value).map((r) => `• ${r.label}: ${r.value}`)]),
      "",
      "Generado por QR Scanner Pro",
    ].join("\n");
    await Share.share({ message: text });
  };

  return (
    <View style={[styles.fill, { backgroundColor: colors.bg }]}>
      <ScreenHeader
        title="Dispositivo"
        large={false}
        onBack={navigation.goBack}
        right={
          <>
            <IconButton icon="refresh" label="Actualizar" onPress={load} size={40} />
            <IconButton icon="share-outline" label="Compartir información" onPress={share} size={40} />
          </>
        }
      />
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.xl, paddingBottom: insets.bottom + space.xxxl }}>
        {/* ID destacado */}
        {/* Azul profundo en ambos temas: texto blanco con contraste AA */}
        <Card style={{ backgroundColor: palettes.light.accent }}>
          <Text style={styles.idLabel}>{info?.idLabel ?? "ID del dispositivo"}</Text>
          {info ? (
            <Pressable onPress={() => copyText(info.deviceId, toast.show, "ID copiado")} accessibilityRole="button" accessibilityLabel={`${info.idLabel} ${info.deviceId}. Tocá para copiar`}>
              <Text style={styles.idValue} selectable>
                {info.deviceId}
              </Text>
            </Pressable>
          ) : (
            <Bone width="80%" height={22} style={{ marginVertical: 8, backgroundColor: "rgba(255,255,255,0.2)" }} />
          )}
          <Text style={styles.idHint}>{info?.idHint ?? " "}</Text>
          {info && (
            <View style={styles.idCopy}>
              <Ionicons name="copy-outline" size={13} color="rgba(255,255,255,0.85)" />
              <Text style={styles.idCopyText}>Tocá para copiar</Text>
            </View>
          )}
        </Card>

        {info
          ? info.sections.map((s) => {
              const rows = s.rows.filter((r) => r.value);
              if (!rows.length) return null;
              return (
                <View key={s.title}>
                  <SectionLabel>{s.title}</SectionLabel>
                  <Card padded={false}>
                    {rows.map((r, i) => (
                      <Pressable
                        key={r.label}
                        disabled={!r.copy}
                        onPress={() => copyText(r.value!, toast.show, `${r.label} copiado`)}
                        style={({ pressed }) => [styles.row, i < rows.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }, pressed && { backgroundColor: colors.surfaceAlt }]}
                      >
                        <Text style={[styles.rowLabel, { color: colors.textMuted }]}>{r.label}</Text>
                        <Text style={[styles.rowValue, { color: colors.text }]} numberOfLines={2} selectable>
                          {r.value}
                        </Text>
                        {r.copy && <Ionicons name="copy-outline" size={14} color={colors.textFaint} />}
                      </Pressable>
                    ))}
                  </Card>
                </View>
              );
            })
          : [0, 1, 2].map((i) => (
              <Card key={i} style={{ gap: 14 }}>
                <Bone width="40%" />
                <Bone width="90%" />
                <Bone width="70%" />
              </Card>
            ))}

        {info && <Button label="Compartir información" icon="share-outline" variant="secondary" onPress={share} />}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  idLabel: { color: "rgba(255,255,255,0.8)", fontSize: font.size.xs, fontWeight: font.weight.bold, textTransform: "uppercase", letterSpacing: 0.8 },
  idValue: { color: "#FFFFFF", fontFamily: font.mono, fontSize: font.size.xl, fontWeight: font.weight.bold, marginVertical: space.sm },
  idHint: { color: "rgba(255,255,255,0.8)", fontSize: font.size.sm, lineHeight: 18 },
  idCopy: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: space.md, alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.16)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full },
  idCopyText: { color: "#FFFFFF", fontSize: font.size.xs, fontWeight: font.weight.semibold },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: 13, paddingHorizontal: space.lg },
  rowLabel: { width: 120, fontSize: font.size.sm },
  rowValue: { flex: 1, fontSize: font.size.md, fontWeight: font.weight.medium, textAlign: "right" },
});
