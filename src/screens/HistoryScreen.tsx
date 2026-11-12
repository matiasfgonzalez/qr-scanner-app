import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, SectionList, StyleSheet, Text, TextInput, View } from "react-native";
import ReanimatedSwipeable, { SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import Animated, { FadeIn, interpolate, SharedValue, useAnimatedStyle } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import { TabScreenProps } from "../navigation/types";
import { useApp } from "../state/AppContext";
import { Button, Chip, EmptyState, IconButton, ScreenHeader } from "../components/ui";
import { KindIcon } from "../components/KindIcon";
import { SkeletonRow } from "../components/motion";
import { useToast } from "../components/Toast";
import { ContentKind, contentSubtitle, contentTitle, parseContent, ParsedContent } from "../lib/qr/parse";
import { analyzeContent, Level } from "../lib/qr/analyze";
import { clearScans, deleteScan, getScans, restoreAll, restoreScan, ScanItem, subscribeScans, updateScan } from "../lib/storage";
import { csvEscape, dayLabel, formatTime } from "../lib/format";
import { haptic } from "../lib/haptics";
import { font, levelColors, radius, space } from "../theme";

type Filter = "all" | "favorites" | "url" | "wifi" | "contact" | "product" | "other";

const FILTERS: { id: Filter; label: string; icon?: React.ComponentProps<typeof Ionicons>["name"] }[] = [
  { id: "all", label: "Todos" },
  { id: "favorites", label: "Favoritos", icon: "star" },
  { id: "url", label: "Enlaces", icon: "globe-outline" },
  { id: "wifi", label: "Wi‑Fi", icon: "wifi" },
  { id: "contact", label: "Contactos", icon: "person-outline" },
  { id: "product", label: "Productos", icon: "barcode-outline" },
  { id: "other", label: "Otros" },
];

type Row = { item: ScanItem; content: ParsedContent; level: Level };

function matchesFilter(r: Row, f: Filter): boolean {
  switch (f) {
    case "all":
      return true;
    case "favorites":
      return !!r.item.favorite;
    case "url":
    case "wifi":
    case "product":
      return r.content.kind === f;
    case "contact":
      return r.content.kind === "contact" || r.content.kind === "email" || r.content.kind === "phone";
    case "other":
      return !(["url", "wifi", "product", "contact", "email", "phone"] as ContentKind[]).includes(r.content.kind);
  }
}

export default function HistoryScreen({ navigation }: TabScreenProps<"History">) {
  const { colors } = useApp();
  const toast = useToast();
  const [items, setItems] = useState<ScanItem[] | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const openRow = useRef<SwipeableMethods | null>(null);

  useEffect(() => {
    getScans().then(setItems);
    return subscribeScans(setItems);
  }, []);

  // Parseo y análisis una sola vez por ítem
  const rows = useMemo<Row[]>(
    () =>
      (items ?? []).map((item) => {
        const content = parseContent(item.data, item.type);
        return { item, content, level: analyzeContent(content).level };
      }),
    [items]
  );

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: 0, favorites: 0, url: 0, wifi: 0, contact: 0, product: 0, other: 0 };
    rows.forEach((r) => FILTERS.forEach((f) => matchesFilter(r, f.id) && c[f.id]++));
    return c;
  }, [rows]);

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = rows.filter(
      (r) =>
        matchesFilter(r, filter) &&
        (!q || r.item.data.toLowerCase().includes(q) || contentTitle(r.content).toLowerCase().includes(q) || r.item.location?.address?.toLowerCase().includes(q))
    );
    const groups: { title: string; data: Row[] }[] = [];
    for (const r of filtered) {
      const title = dayLabel(r.item.date);
      const g = groups[groups.length - 1];
      if (g && g.title === title) g.data.push(r);
      else groups.push({ title, data: [r] });
    }
    return groups;
  }, [rows, filter, query]);

  const remove = useCallback(
    async (id: string) => {
      const removed = await deleteScan(id);
      haptic.medium();
      if (removed) {
        toast.show({ message: "Escaneo eliminado", action: { label: "Deshacer", onPress: () => restoreScan(removed.item, removed.index) } });
      }
    },
    [toast]
  );

  const toggleFavorite = useCallback(async (item: ScanItem) => {
    haptic.selection();
    await updateScan(item.id, { favorite: !item.favorite });
  }, []);

  const clearAll = () => {
    Alert.alert("Borrar historial", `Se eliminarán ${rows.length} escaneos.`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Borrar todo",
        style: "destructive",
        onPress: async () => {
          const previous = await clearScans();
          haptic.medium();
          toast.show({ message: "Historial borrado", action: { label: "Deshacer", onPress: () => restoreAll(previous) } });
        },
      },
    ]);
  };

  const exportCsv = async () => {
    try {
      const header = ["fecha", "tipo", "formato", "contenido", "latitud", "longitud", "direccion", "favorito"].join(",");
      const lines = rows.map(({ item, content }) =>
        [item.date, content.kind, item.type, item.data, item.location?.latitude, item.location?.longitude, item.location?.address, item.favorite ? "si" : "no"]
          .map(csvEscape)
          .join(",")
      );
      const stamp = new Date().toISOString().slice(0, 10);
      const file = new File(Paths.cache, `historial-qr-${stamp}.csv`);
      if (file.exists) file.delete();
      file.create();
      file.write("\ufeff" + [header, ...lines].join("\n"));
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: "text/csv", dialogTitle: "Exportar historial", UTI: "public.comma-separated-values-text" });
      } else {
        toast.show({ message: "Compartir no está disponible en este dispositivo", icon: "alert-circle" });
      }
    } catch (err) {
      console.warn(err);
      toast.show({ message: "No se pudo exportar el historial", icon: "alert-circle" });
    }
  };

  const total = rows.length;
  const subtitle = items === null ? " " : total === 0 ? "Todavía no escaneaste nada" : `${total} escaneo${total === 1 ? "" : "s"}`;

  return (
    <View style={[styles.fill, { backgroundColor: colors.bg }]}>
      <ScreenHeader
        title="Historial"
        subtitle={subtitle}
        right={
          total > 0 ? (
            <>
              <IconButton icon="map-outline" label="Ver mapa de escaneos" onPress={() => navigation.navigate("Map")} size={40} />
              <IconButton icon="share-outline" label="Exportar CSV" onPress={exportCsv} size={40} />
              <IconButton icon="trash-outline" label="Borrar historial" onPress={clearAll} size={40} />
            </>
          ) : undefined
        }
      />

      {items === null ? (
        <View style={{ padding: space.lg, gap: space.sm }}>
          {Array.from({ length: 6 }, (_, i) => (
            <SkeletonRow key={i} />
          ))}
        </View>
      ) : total === 0 ? (
        <EmptyState
          icon="scan-outline"
          title="Sin escaneos"
          description="Los códigos que escanees aparecerán acá, con fecha, verificación de seguridad y ubicación."
          action={<Button label="Escanear ahora" icon="scan" onPress={() => navigation.navigate("Scan")} />}
        />
      ) : (
        <>
          <View style={{ paddingHorizontal: space.lg, gap: space.md, paddingBottom: space.sm }}>
            <View style={[styles.search, { backgroundColor: colors.surfaceAlt }]}>
              <Ionicons name="search" size={18} color={colors.textFaint} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Buscar por contenido o lugar"
                placeholderTextColor={colors.textFaint}
                style={[styles.searchInput, { color: colors.text }]}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
                clearButtonMode="while-editing"
                accessibilityLabel="Buscar en el historial"
              />
              {query.length > 0 && (
                <Pressable onPress={() => setQuery("")} hitSlop={10} accessibilityLabel="Limpiar búsqueda">
                  <Ionicons name="close-circle" size={18} color={colors.textFaint} />
                </Pressable>
              )}
            </View>
          </View>
          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
              {FILTERS.filter((f) => f.id === "all" || counts[f.id] > 0).map((f) => (
                <Chip key={f.id} label={f.label} icon={f.icon} active={filter === f.id} count={counts[f.id]} onPress={() => setFilter(f.id)} />
              ))}
            </ScrollView>
          </View>

          <SectionList
            sections={sections}
            keyExtractor={(r) => r.item.id}
            stickySectionHeadersEnabled={false}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: 120 }}
            renderSectionHeader={({ section }) => <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>{section.title}</Text>}
            ItemSeparatorComponent={() => <View style={{ height: space.sm }} />}
            renderItem={({ item: r }) => (
              <HistoryRow
                row={r}
                onPress={() => navigation.navigate("Result", { scanId: r.item.id })}
                onDelete={() => remove(r.item.id)}
                onFavorite={() => toggleFavorite(r.item)}
                onOpenSwipe={(m) => {
                  if (openRow.current && openRow.current !== m) openRow.current.close();
                  openRow.current = m;
                }}
              />
            )}
            ListEmptyComponent={
              <Animated.View entering={FadeIn}>
                <EmptyState icon="search-outline" title="Sin resultados" description="Probá con otra búsqueda o filtro." />
              </Animated.View>
            }
          />
        </>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
const ACTION_W = 76;

function RightActions({ progress, onDelete, onFavorite, favorite }: { progress: SharedValue<number>; onDelete: () => void; onFavorite: () => void; favorite?: boolean }) {
  const { colors } = useApp();
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0, 0.6, 1], [0, 0.8, 1]),
    transform: [{ scale: interpolate(progress.get(), [0, 1], [0.85, 1], "clamp") }],
  }));
  return (
    <Animated.View style={[styles.actions, style]}>
      <Pressable onPress={onFavorite} style={[styles.action, { backgroundColor: colors.warningSoft }]} accessibilityRole="button" accessibilityLabel={favorite ? "Quitar de favoritos" : "Agregar a favoritos"}>
        <Ionicons name={favorite ? "star" : "star-outline"} size={22} color={colors.star} />
      </Pressable>
      <Pressable onPress={onDelete} style={[styles.action, { backgroundColor: colors.danger }]} accessibilityRole="button" accessibilityLabel="Eliminar">
        <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
      </Pressable>
    </Animated.View>
  );
}

const HistoryRow = memo(function HistoryRow({
  row,
  onPress,
  onDelete,
  onFavorite,
  onOpenSwipe,
}: {
  row: Row;
  onPress: () => void;
  onDelete: () => void;
  onFavorite: () => void;
  onOpenSwipe: (m: SwipeableMethods) => void;
}) {
  const { colors } = useApp();
  const ref = useRef<SwipeableMethods>(null);
  const { item, content, level } = row;
  const risk = level === "warning" || level === "danger";
  const lc = levelColors(colors, level);

  return (
    <ReanimatedSwipeable
      ref={ref}
      friction={1.6}
      rightThreshold={ACTION_W}
      overshootRight={false}
      onSwipeableWillOpen={() => ref.current && onOpenSwipe(ref.current)}
      renderRightActions={(progress) => (
        <RightActions
          progress={progress}
          favorite={item.favorite}
          onDelete={() => {
            ref.current?.close();
            onDelete();
          }}
          onFavorite={() => {
            ref.current?.close();
            onFavorite();
          }}
        />
      )}
    >
      <Pressable
        onPress={onPress}
        onLongPress={onFavorite}
        accessibilityRole="button"
        accessibilityLabel={`${contentTitle(content)}. ${risk ? "Con advertencias. " : ""}${formatTime(item.date)}`}
        accessibilityHint="Deslizá a la izquierda para eliminar"
        style={({ pressed }) => [styles.row, { backgroundColor: pressed ? colors.surfaceAlt : colors.surface, borderColor: colors.border }]}
      >
        <KindIcon kind={content.kind} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={styles.rowTitleLine}>
            <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
              {contentTitle(content)}
            </Text>
            {item.favorite && <Ionicons name="star" size={13} color={colors.star} />}
          </View>
          <Text style={[styles.rowSub, { color: colors.textMuted }]} numberOfLines={1}>
            {contentSubtitle(content)}
          </Text>
          {item.location?.address ? (
            <View style={styles.rowMeta}>
              <Ionicons name="location-outline" size={11} color={colors.textFaint} />
              <Text style={[styles.rowMetaText, { color: colors.textFaint }]} numberOfLines={1}>
                {item.location.address}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={styles.rowRight}>
          <Text style={[styles.rowTime, { color: colors.textFaint }]}>{formatTime(item.date)}</Text>
          {risk && (
            <View style={[styles.riskDot, { backgroundColor: lc.bg }]}>
              <Ionicons name={level === "danger" ? "alert-circle" : "warning"} size={13} color={lc.fg} />
            </View>
          )}
        </View>
      </Pressable>
    </ReanimatedSwipeable>
  );
});

const styles = StyleSheet.create({
  fill: { flex: 1 },
  search: { flexDirection: "row", alignItems: "center", gap: space.sm, height: 44, borderRadius: radius.md, paddingHorizontal: space.md },
  // 16px evita el zoom automático del input en iOS
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 0 },
  filters: { paddingHorizontal: space.lg, gap: space.sm, paddingBottom: space.md },
  sectionHeader: { fontSize: font.size.sm, fontWeight: font.weight.bold, marginTop: space.lg, marginBottom: space.sm, marginLeft: space.xs },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, padding: 14, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth },
  rowTitleLine: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowTitle: { fontSize: font.size.md, fontWeight: font.weight.semibold, flexShrink: 1 },
  rowSub: { fontSize: font.size.sm, marginTop: 2 },
  rowMeta: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 4 },
  rowMetaText: { fontSize: font.size.xs, flexShrink: 1 },
  rowRight: { alignItems: "flex-end", gap: 6, alignSelf: "stretch", justifyContent: "space-between" },
  rowTime: { fontSize: font.size.xs, fontVariant: ["tabular-nums"] },
  riskDot: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  actions: { flexDirection: "row", gap: space.sm, paddingLeft: space.sm },
  action: { width: ACTION_W - space.sm, borderRadius: radius.lg, alignItems: "center", justifyContent: "center" },
});
