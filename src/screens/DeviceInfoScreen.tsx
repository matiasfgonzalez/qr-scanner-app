import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Share,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";
import * as Device from "expo-device";
import * as Application from "expo-application";
import Constants from "expo-constants";
import * as Network from "expo-network";
import * as Battery from "expo-battery";
import * as Clipboard from "expo-clipboard";

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
  accent: { 50: "#f5f3ff", 500: "#8b5cf6", 600: "#7c3aed" },
  warning: { 50: "#fffbeb", 500: "#f59e0b", 600: "#d97706" },
  danger: { 50: "#fef2f2", 500: "#ef4444", 600: "#dc2626" },
  neutral: {
    50: "#f8fafc",
    100: "#f1f5f9",
    200: "#e2e8f0",
    300: "#cbd5e1",
    400: "#94a3b8",
    600: "#475569",
    700: "#334155",
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

type Props = NativeStackScreenProps<RootStackParamList, "DeviceInfo">;

interface DeviceData {
  // Identificación única
  uniqueId: string;
  androidId: string | null;
  iosVendorId: string | null;
  installationId: string | null;

  // Dispositivo
  brand: string | null;
  manufacturer: string | null;
  modelName: string | null;
  modelId: string | null;
  designName: string | null;
  productName: string | null;
  deviceYearClass: number | null;
  deviceName: string | null;
  deviceType: string;
  isDevice: boolean;

  // Sistema Operativo
  osName: string | null;
  osVersion: string | null;
  osBuildId: string | null;
  osInternalBuildId: string | null;
  platformApiLevel: number | null;

  // Hardware
  totalMemory: number | null;
  supportedCpuArchitectures: string[] | null;

  // Aplicación
  appName: string | null;
  appVersion: string | null;
  appBuildVersion: string | null;
  nativeAppVersion: string | null;
  nativeBuildVersion: string | null;

  // Red
  ipAddress: string | null;
  networkState: string | null;
  networkType: string | null;
  isConnected: boolean;
  isInternetReachable: boolean | null;

  // Batería
  batteryLevel: number | null;
  batteryState: string;
  lowPowerMode: boolean;

  // Expo
  expoVersion: string | null;
  sdkVersion: string | undefined;
}

const getDeviceTypeName = (type: Device.DeviceType): string => {
  switch (type) {
    case Device.DeviceType.PHONE:
      return "📱 Teléfono";
    case Device.DeviceType.TABLET:
      return "📲 Tablet";
    case Device.DeviceType.DESKTOP:
      return "🖥️ Desktop";
    case Device.DeviceType.TV:
      return "📺 TV";
    default:
      return "❓ Desconocido";
  }
};

const getBatteryStateName = (state: Battery.BatteryState): string => {
  switch (state) {
    case Battery.BatteryState.CHARGING:
      return "🔌 Cargando";
    case Battery.BatteryState.FULL:
      return "✅ Completa";
    case Battery.BatteryState.UNPLUGGED:
      return "🔋 Desconectada";
    default:
      return "❓ Desconocido";
  }
};

const formatBytes = (bytes: number | null): string => {
  if (bytes === null) return "N/A";
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb.toFixed(2)} GB`;
};

// Obtener el ID único real del dispositivo
const getDeviceUniqueId = async (): Promise<{
  androidId: string | null;
  iosVendorId: string | null;
}> => {
  let androidId: string | null = null;
  let iosVendorId: string | null = null;

  if (Platform.OS === "android") {
    // Android ID: único por dispositivo, se resetea con factory reset
    // No requiere permisos especiales
    androidId = Application.getAndroidId();
  } else if (Platform.OS === "ios") {
    // iOS Vendor ID: único por vendor (desarrollador) por dispositivo
    // Persiste mientras haya al menos una app del vendor instalada
    iosVendorId = await Application.getIosIdForVendorAsync();
  }

  return { androidId, iosVendorId };
};

export default function DeviceInfoScreen({ navigation }: Readonly<Props>) {
  const [deviceData, setDeviceData] = useState<DeviceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDeviceInfo();
  }, []);

  const loadDeviceInfo = async () => {
    try {
      setIsLoading(true);

      // Información de red
      const networkState = await Network.getNetworkStateAsync();
      const ipAddress = await Network.getIpAddressAsync();

      // Información de batería
      const batteryLevel = await Battery.getBatteryLevelAsync();
      const batteryState = await Battery.getBatteryStateAsync();
      const lowPowerMode = await Battery.isLowPowerModeEnabledAsync();

      // ID de instalación (persiste mientras la app esté instalada)
      const installationTime = await Application.getInstallationTimeAsync();

      // Obtener ID único real del dispositivo
      const { androidId, iosVendorId } = await getDeviceUniqueId();

      // El ID único real del dispositivo
      const realDeviceId = androidId || iosVendorId || "N/A";

      const data: DeviceData = {
        // Identificación
        uniqueId: realDeviceId,
        androidId,
        iosVendorId,
        installationId: installationTime?.toISOString() || null,

        // Dispositivo
        brand: Device.brand,
        manufacturer: Device.manufacturer,
        modelName: Device.modelName,
        modelId: Device.modelId,
        designName: Device.designName,
        productName: Device.productName,
        deviceYearClass: Device.deviceYearClass,
        deviceName: Device.deviceName,
        deviceType: getDeviceTypeName(
          Device.deviceType || Device.DeviceType.UNKNOWN
        ),
        isDevice: Device.isDevice,

        // Sistema Operativo
        osName: Device.osName,
        osVersion: Device.osVersion,
        osBuildId: Device.osBuildId,
        osInternalBuildId: Device.osInternalBuildId,
        platformApiLevel: Device.platformApiLevel,

        // Hardware
        totalMemory: Device.totalMemory,
        supportedCpuArchitectures: Device.supportedCpuArchitectures,

        // Aplicación
        appName: Application.applicationName,
        appVersion: Application.nativeApplicationVersion,
        appBuildVersion: Application.nativeBuildVersion,
        nativeAppVersion: Application.nativeApplicationVersion,
        nativeBuildVersion: Application.nativeBuildVersion,

        // Red
        ipAddress,
        networkState: networkState.type ?? null,
        networkType: networkState.type ?? null,
        isConnected: networkState.isConnected || false,
        isInternetReachable: networkState.isInternetReachable ?? null,

        // Batería
        batteryLevel: batteryLevel,
        batteryState: getBatteryStateName(batteryState),
        lowPowerMode,

        // Expo
        expoVersion: Constants.expoVersion,
        sdkVersion: Constants.expoConfig?.sdkVersion,
      };

      setDeviceData(data);
    } catch (error) {
      console.error("Error loading device info:", error);
      Alert.alert("Error", "No se pudo cargar la información del dispositivo");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert("✅ Copiado", `${label} copiado al portapapeles`);
  };

  const shareDeviceInfo = async () => {
    if (!deviceData) return;

    const info = `
📱 INFORMACIÓN DEL DISPOSITIVO
════════════════════════════

🔑 ID ÚNICO: ${deviceData.uniqueId}

📱 DISPOSITIVO
• Marca: ${deviceData.brand || "N/A"}
• Fabricante: ${deviceData.manufacturer || "N/A"}
• Modelo: ${deviceData.modelName || "N/A"}
• Tipo: ${deviceData.deviceType}
• Nombre: ${deviceData.deviceName || "N/A"}

💻 SISTEMA OPERATIVO
• OS: ${deviceData.osName || "N/A"} ${deviceData.osVersion || ""}
• Build: ${deviceData.osBuildId || "N/A"}
• API Level: ${deviceData.platformApiLevel || "N/A"}

🔧 HARDWARE
• RAM: ${formatBytes(deviceData.totalMemory)}
• Arquitectura: ${deviceData.supportedCpuArchitectures?.join(", ") || "N/A"}

📦 APLICACIÓN
• Nombre: ${deviceData.appName || "N/A"}
• Versión: ${deviceData.appVersion || "N/A"}
• Build: ${deviceData.appBuildVersion || "N/A"}

🌐 RED
• IP: ${deviceData.ipAddress || "N/A"}
• Tipo: ${deviceData.networkType || "N/A"}
• Conectado: ${deviceData.isConnected ? "Sí" : "No"}

🔋 BATERÍA
• Nivel: ${
      deviceData.batteryLevel
        ? Math.round(deviceData.batteryLevel * 100) + "%"
        : "N/A"
    }
• Estado: ${deviceData.batteryState}

Generado por QR Scanner Pro
    `.trim();

    try {
      await Share.share({ message: info });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const InfoSection = ({
    title,
    icon,
    children,
  }: {
    title: string;
    icon: string;
    children: React.ReactNode;
  }) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionIcon}>{icon}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );

  const InfoRow = ({
    label,
    value,
    copyable = false,
    highlight = false,
  }: {
    label: string;
    value: string | null | undefined;
    copyable?: boolean;
    highlight?: boolean;
  }) => (
    <TouchableOpacity
      style={[styles.infoRow, highlight && styles.infoRowHighlight]}
      onPress={
        copyable && value ? () => copyToClipboard(value, label) : undefined
      }
      activeOpacity={copyable ? 0.7 : 1}
    >
      <Text style={styles.infoLabel}>{label}</Text>
      <View style={styles.infoValueContainer}>
        <Text
          style={[styles.infoValue, highlight && styles.infoValueHighlight]}
          numberOfLines={2}
        >
          {value || "N/A"}
        </Text>
        {copyable && value && <Text style={styles.copyIcon}>📋</Text>}
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary[600]} />
          <Text style={styles.loadingText}>Recopilando información...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!deviceData) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>❌</Text>
          <Text style={styles.errorText}>Error al cargar información</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadDeviceInfo}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>📱 Info del Dispositivo</Text>
          <TouchableOpacity
            style={styles.shareButton}
            onPress={shareDeviceInfo}
          >
            <Text style={styles.shareButtonText}>📤</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ID Único - Destacado */}
          <View style={styles.uniqueIdCard}>
            <Text style={styles.uniqueIdLabel}>
              🔑 {Platform.OS === "android" ? "Android ID" : "iOS Vendor ID"}
            </Text>
            <TouchableOpacity
              onPress={() =>
                copyToClipboard(deviceData.uniqueId, "ID Único del Dispositivo")
              }
              activeOpacity={0.7}
            >
              <Text style={styles.uniqueIdValue}>{deviceData.uniqueId}</Text>
            </TouchableOpacity>
            <Text style={styles.uniqueIdHint}>
              {Platform.OS === "android"
                ? "ID único del dispositivo (se resetea solo con factory reset)"
                : "ID único por vendor/desarrollador"}
            </Text>
            <Text style={styles.uniqueIdSubHint}>Toca para copiar</Text>
          </View>

          {/* IDs Adicionales */}
          <InfoSection title="Identificadores del Dispositivo" icon="🆔">
            {Platform.OS === "android" && (
              <InfoRow
                label="Android ID"
                value={deviceData.androidId}
                copyable
              />
            )}
            {Platform.OS === "ios" && (
              <InfoRow
                label="iOS Vendor ID"
                value={deviceData.iosVendorId}
                copyable
              />
            )}
            <InfoRow
              label="Fecha Instalación App"
              value={
                deviceData.installationId
                  ? new Date(deviceData.installationId).toLocaleString()
                  : null
              }
            />
          </InfoSection>

          {/* Dispositivo */}
          <InfoSection title="Dispositivo" icon="📱">
            <InfoRow label="Marca" value={deviceData.brand} />
            <InfoRow label="Fabricante" value={deviceData.manufacturer} />
            <InfoRow label="Modelo" value={deviceData.modelName} copyable />
            <InfoRow label="ID Modelo" value={deviceData.modelId} />
            <InfoRow label="Nombre Diseño" value={deviceData.designName} />
            <InfoRow label="Nombre Producto" value={deviceData.productName} />
            <InfoRow label="Tipo" value={deviceData.deviceType} />
            <InfoRow label="Nombre Dispositivo" value={deviceData.deviceName} />
            <InfoRow
              label="Año Clase"
              value={deviceData.deviceYearClass?.toString()}
            />
            <InfoRow
              label="Dispositivo Físico"
              value={deviceData.isDevice ? "✅ Sí" : "❌ No (Emulador)"}
            />
          </InfoSection>

          {/* Sistema Operativo */}
          <InfoSection title="Sistema Operativo" icon="💻">
            <InfoRow label="OS" value={deviceData.osName} />
            <InfoRow label="Versión" value={deviceData.osVersion} copyable />
            <InfoRow label="Build ID" value={deviceData.osBuildId} copyable />
            <InfoRow
              label="Build Interno"
              value={deviceData.osInternalBuildId}
            />
            {Platform.OS === "android" && (
              <InfoRow
                label="API Level"
                value={deviceData.platformApiLevel?.toString()}
              />
            )}
          </InfoSection>

          {/* Hardware */}
          <InfoSection title="Hardware" icon="🔧">
            <InfoRow
              label="Memoria RAM"
              value={formatBytes(deviceData.totalMemory)}
            />
            <InfoRow
              label="Arquitectura CPU"
              value={deviceData.supportedCpuArchitectures?.join(", ")}
            />
          </InfoSection>

          {/* Aplicación */}
          <InfoSection title="Aplicación" icon="📦">
            <InfoRow label="Nombre" value={deviceData.appName} />
            <InfoRow label="Versión" value={deviceData.nativeAppVersion} />
            <InfoRow label="Build" value={deviceData.nativeBuildVersion} />
            <InfoRow label="Expo Version" value={deviceData.expoVersion} />
            <InfoRow label="SDK Version" value={deviceData.sdkVersion} />
            <InfoRow
              label="Fecha Instalación"
              value={
                deviceData.installationId
                  ? new Date(deviceData.installationId).toLocaleDateString()
                  : null
              }
            />
          </InfoSection>

          {/* Red */}
          <InfoSection title="Red" icon="🌐">
            <InfoRow
              label="Dirección IP"
              value={deviceData.ipAddress}
              copyable
            />
            <InfoRow label="Tipo de Red" value={deviceData.networkType} />
            <InfoRow
              label="Conectado"
              value={deviceData.isConnected ? "✅ Sí" : "❌ No"}
            />
            <InfoRow
              label="Internet Alcanzable"
              value={
                deviceData.isInternetReachable === null
                  ? "⏳ Verificando..."
                  : deviceData.isInternetReachable
                  ? "✅ Sí"
                  : "❌ No"
              }
            />
          </InfoSection>

          {/* Batería */}
          <InfoSection title="Batería" icon="🔋">
            <InfoRow
              label="Nivel"
              value={
                deviceData.batteryLevel
                  ? `${Math.round(deviceData.batteryLevel * 100)}%`
                  : null
              }
              highlight={
                deviceData.batteryLevel !== null &&
                deviceData.batteryLevel < 0.2
              }
            />
            <InfoRow label="Estado" value={deviceData.batteryState} />
            <InfoRow
              label="Modo Ahorro"
              value={deviceData.lowPowerMode ? "⚡ Activado" : "Desactivado"}
            />
          </InfoSection>

          {/* Botón Refrescar */}
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={loadDeviceInfo}
            activeOpacity={0.8}
          >
            <Text style={styles.refreshButtonIcon}>🔄</Text>
            <Text style={styles.refreshButtonText}>Actualizar Información</Text>
          </TouchableOpacity>

          <View style={styles.bottomPadding} />
        </ScrollView>
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

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.background.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.neutral[100],
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonText: {
    fontSize: 20,
    color: Colors.text.primary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text.primary,
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary[50],
    justifyContent: "center",
    alignItems: "center",
  },
  shareButtonText: {
    fontSize: 18,
  },

  // Loading & Error
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 18,
    color: Colors.text.secondary,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: Colors.primary[600],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryButtonText: {
    color: Colors.text.inverse,
    fontSize: 16,
    fontWeight: "600",
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },

  // Unique ID Card
  uniqueIdCard: {
    backgroundColor: Colors.primary[600],
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    alignItems: "center",
    shadowColor: Colors.primary[600],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  uniqueIdLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 8,
    fontWeight: "600",
  },
  uniqueIdValue: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.text.inverse,
    letterSpacing: 2,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  uniqueIdHint: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    marginTop: 8,
    textAlign: "center",
  },
  uniqueIdSubHint: {
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
    marginTop: 4,
    fontStyle: "italic",
  },

  // Sections
  section: {
    backgroundColor: Colors.background.card,
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.neutral[50],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  sectionIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text.primary,
  },
  sectionContent: {
    paddingVertical: 4,
  },

  // Info Rows
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[100],
  },
  infoRowHighlight: {
    backgroundColor: Colors.danger[50],
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
    flex: 1,
  },
  infoValueContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1.5,
    justifyContent: "flex-end",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text.primary,
    textAlign: "right",
  },
  infoValueHighlight: {
    color: Colors.danger[600],
  },
  copyIcon: {
    fontSize: 14,
    marginLeft: 8,
    opacity: 0.6,
  },

  // Refresh Button
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.neutral[100],
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  refreshButtonIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  refreshButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text.secondary,
  },

  bottomPadding: {
    height: 40,
  },
});
