import React, { useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";
import * as Clipboard from "expo-clipboard";
import * as Linking from "expo-linking";
import { saveScan } from "../utils/storage";
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
  danger: { 50: "#fef2f2", 500: "#ef4444", 600: "#dc2626" },
  neutral: {
    50: "#f8fafc",
    100: "#f1f5f9",
    200: "#e2e8f0",
    400: "#94a3b8",
    500: "#64748b",
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

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type Props = NativeStackScreenProps<RootStackParamList, "Result">;

/**
 * 📄 ResultScreen - Pantalla de resultado del escaneo QR
 * Diseño premium con jerarquía visual clara
 */
export default function ResultScreen({ route, navigation }: Readonly<Props>) {
  const { data, location } = route.params;

  useEffect(() => {
    const save = async () => {
      if (route.params.fromScanner) {
        console.log("Guardando scan:", data, route.params.type, location);
        if (data && route.params.type) {
          await saveScan(data, route.params.type, location);
          console.log("Scan guardado correctamente con ubicación");
        }
      }
    };
    save();
  }, []);

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
    Alert.alert("✓ Copiado", "Contenido copiado al portapapeles");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header Premium */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Text style={styles.headerIconText}>✓</Text>
          </View>
          <Text style={styles.headerTitle}>Escaneo exitoso</Text>
          <Text style={styles.headerSubtitle}>
            {new Date().toLocaleString()}
          </Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Tarjeta de datos raw */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>📝 CONTENIDO</Text>
            <View style={styles.card}>
              <Text style={styles.cardData} selectable>
                {data}
              </Text>
              {isUrl && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>🔗 URL detectada</Text>
                </View>
              )}
            </View>
          </View>

          {/* Tarjeta JSON si aplica */}
          {parsed && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>📦 DATOS JSON</Text>
              <View style={styles.cardCode}>
                <Text style={styles.codeText} selectable>
                  {JSON.stringify(parsed, null, 2)}
                </Text>
              </View>
            </View>
          )}

          {/* Tarjeta de ubicación */}
          {location && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>📍 UBICACIÓN DEL ESCANEO</Text>
              <View style={styles.cardLocation}>
                <View style={styles.locationRow}>
                  <View style={styles.locationCoord}>
                    <Text style={styles.locationLabel}>Latitud</Text>
                    <Text style={styles.locationValue}>
                      {location.latitude.toFixed(6)}
                    </Text>
                  </View>
                  <View style={styles.locationDivider} />
                  <View style={styles.locationCoord}>
                    <Text style={styles.locationLabel}>Longitud</Text>
                    <Text style={styles.locationValue}>
                      {location.longitude.toFixed(6)}
                    </Text>
                  </View>
                </View>
                {location.address && (
                  <View style={styles.addressContainer}>
                    <Text style={styles.addressText}>
                      📍 {location.address}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Acciones principales */}
          <View style={styles.actionsSection}>
            {isUrl && (
              <TouchableOpacity
                style={styles.buttonPrimary}
                onPress={handleOpen}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonIcon}>🌐</Text>
                <Text style={styles.buttonText}>Abrir URL</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.buttonSecondary}
              onPress={handleCopy}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonIcon}>📋</Text>
              <Text style={styles.buttonText}>Copiar contenido</Text>
            </TouchableOpacity>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.buttonAccent}
                onPress={() =>
                  navigation.navigate("Map", { filterQrData: data })
                }
                activeOpacity={0.8}
              >
                <Text style={styles.buttonSmallIcon}>🗺️</Text>
                <Text style={styles.buttonSmallText}>Ver ruta</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.buttonAccentLight}
                onPress={() => navigation.navigate("Map", {})}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonSmallIcon}>🌍</Text>
                <Text style={styles.buttonSmallTextDark}>Todos</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.buttonSuccess}
              onPress={() => navigation.replace("Scanner")}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonIcon}>📷</Text>
              <Text style={styles.buttonText}>Escanear de nuevo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.buttonGhost}
              onPress={() => navigation.navigate("History")}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonGhostText}>
                📋 Ver historial completo
              </Text>
            </TouchableOpacity>
          </View>
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

  // ═══════════════════════════════════════════════════════════════
  // HEADER
  // ═══════════════════════════════════════════════════════════════
  header: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: Colors.background.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.secondary[50],
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  headerIconText: {
    fontSize: 28,
    color: Colors.secondary[500],
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.text.primary,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.text.muted,
    marginTop: 4,
  },

  // ═══════════════════════════════════════════════════════════════
  // CONTENIDO
  // ═══════════════════════════════════════════════════════════════
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.text.muted,
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },

  // ═══════════════════════════════════════════════════════════════
  // TARJETAS
  // ═══════════════════════════════════════════════════════════════
  card: {
    backgroundColor: Colors.background.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border.light,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardData: {
    fontSize: 15,
    color: Colors.text.primary,
    lineHeight: 22,
  },
  cardCode: {
    backgroundColor: Colors.neutral[800],
    borderRadius: 12,
    padding: 16,
  },
  codeText: {
    fontSize: 13,
    color: Colors.secondary[400],
    fontFamily: "monospace",
    lineHeight: 20,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: Colors.primary[50],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 12,
  },
  badgeText: {
    fontSize: 12,
    color: Colors.primary[600],
    fontWeight: "600",
  },

  // ═══════════════════════════════════════════════════════════════
  // UBICACIÓN
  // ═══════════════════════════════════════════════════════════════
  cardLocation: {
    backgroundColor: Colors.primary[50],
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.primary[100],
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationCoord: {
    flex: 1,
    alignItems: "center",
  },
  locationDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.primary[200],
  },
  locationLabel: {
    fontSize: 11,
    color: Colors.primary[600],
    fontWeight: "600",
    marginBottom: 4,
  },
  locationValue: {
    fontSize: 14,
    color: Colors.primary[700],
    fontWeight: "700",
    fontFamily: "monospace",
  },
  addressContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.primary[200],
  },
  addressText: {
    fontSize: 13,
    color: Colors.primary[700],
    textAlign: "center",
  },

  // ═══════════════════════════════════════════════════════════════
  // BOTONES
  // ═══════════════════════════════════════════════════════════════
  actionsSection: {
    marginTop: 8,
    gap: 12,
  },
  buttonPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary[600],
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: Colors.primary[600],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonSecondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.neutral[600],
    paddingVertical: 16,
    borderRadius: 12,
  },
  buttonSuccess: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.secondary[500],
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: Colors.secondary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
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
  buttonAccentLight: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.accent[50],
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.accent[500],
  },
  buttonGhost: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  buttonIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  buttonText: {
    color: Colors.text.inverse,
    fontSize: 15,
    fontWeight: "600",
  },
  buttonSmallIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  buttonSmallText: {
    color: Colors.text.inverse,
    fontSize: 14,
    fontWeight: "600",
  },
  buttonSmallTextDark: {
    color: Colors.accent[600],
    fontSize: 14,
    fontWeight: "600",
  },
  buttonGhostText: {
    color: Colors.text.secondary,
    fontSize: 14,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border.light,
    marginVertical: 8,
  },
});
