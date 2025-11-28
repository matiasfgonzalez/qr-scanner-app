import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";
import { getScans, ScanItem, clearScans } from "../utils/storage";
import { SafeAreaView } from "react-native-safe-area-context";

// ═══════════════════════════════════════════════════════════════
// 🎨 SISTEMA DE COLORES PREMIUM
// ═══════════════════════════════════════════════════════════════
const Colors = {
  primary: { 50: "#eff6ff", 100: "#dbeafe", 500: "#3b82f6", 600: "#2563eb" },
  secondary: { 50: "#ecfdf5", 500: "#10b981", 600: "#059669" },
  danger: { 50: "#fef2f2", 500: "#ef4444", 600: "#dc2626" },
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

type Props = NativeStackScreenProps<RootStackParamList, "History">;

/**
 * 📋 HistoryScreen - Historial de escaneos con diseño premium
 */
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

  const handleClearHistory = () => {
    Alert.alert(
      "Borrar historial",
      "¿Estás seguro de que quieres borrar todo el historial de escaneos?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Borrar",
          style: "destructive",
          onPress: async () => {
            await clearScans();
            setScans([]);
          },
        },
      ]
    );
  };

  const renderItem = ({ item, index }: { item: ScanItem; index: number }) => (
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
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardIndex}>
          <Text style={styles.cardIndexText}>#{scans.length - index}</Text>
        </View>
        <View style={styles.cardBadge}>
          <Text style={styles.cardBadgeText}>{item.type}</Text>
        </View>
      </View>

      <Text style={styles.cardData} numberOfLines={2}>
        {item.data}
      </Text>

      <View style={styles.cardFooter}>
        <Text style={styles.cardDate}>
          🕐 {new Date(item.date).toLocaleString()}
        </Text>
        {item.location && (
          <Text style={styles.cardLocation} numberOfLines={1}>
            📍{" "}
            {item.location.address ||
              `${item.location.latitude.toFixed(
                4
              )}, ${item.location.longitude.toFixed(4)}`}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Text style={styles.emptyIconText}>📋</Text>
      </View>
      <Text style={styles.emptyTitle}>Sin escaneos</Text>
      <Text style={styles.emptyDescription}>
        Aún no has escaneado ningún código QR.{"\n"}
        ¡Comienza escaneando tu primer código!
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => navigation.replace("Scanner")}
        activeOpacity={0.8}
      >
        <Text style={styles.emptyButtonText}>📷 Escanear ahora</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header Premium */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Historial</Text>
          <Text style={styles.headerSubtitle}>
            {scans.length} escaneo{scans.length !== 1 ? "s" : ""} registrado
            {scans.length !== 1 ? "s" : ""}
          </Text>
        </View>

        {/* Lista o estado vacío */}
        {scans.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={scans}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
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
            onPress={() => navigation.navigate("Map", {})}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonIcon}>🗺️</Text>
            <Text style={styles.buttonText}>Mapa</Text>
          </TouchableOpacity>

          {scans.length > 0 && (
            <TouchableOpacity
              style={styles.buttonDanger}
              onPress={handleClearHistory}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonIcon}>🗑️</Text>
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
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: Colors.background.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.text.primary,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.text.muted,
    marginTop: 4,
  },

  // ═══════════════════════════════════════════════════════════════
  // LISTA
  // ═══════════════════════════════════════════════════════════════
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },

  // ═══════════════════════════════════════════════════════════════
  // TARJETAS
  // ═══════════════════════════════════════════════════════════════
  card: {
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  cardIndex: {
    backgroundColor: Colors.primary[50],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginRight: 8,
  },
  cardIndexText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.primary[600],
  },
  cardBadge: {
    backgroundColor: Colors.neutral[100],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cardBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.neutral[600],
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cardData: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text.primary,
    lineHeight: 22,
    marginBottom: 12,
  },
  cardFooter: {
    gap: 4,
  },
  cardDate: {
    fontSize: 12,
    color: Colors.text.muted,
  },
  cardLocation: {
    fontSize: 12,
    color: Colors.primary[600],
    fontWeight: "500",
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
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: Colors.primary[600],
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    shadowColor: Colors.primary[600],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyButtonText: {
    color: Colors.text.inverse,
    fontSize: 15,
    fontWeight: "600",
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
    backgroundColor: Colors.primary[600],
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonDanger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.danger[500],
    paddingVertical: 14,
    paddingHorizontal: 16,
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
