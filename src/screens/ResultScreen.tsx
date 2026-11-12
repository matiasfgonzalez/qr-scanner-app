import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

import { RootScreenProps } from "../navigation/types";
import { useApp } from "../state/AppContext";
import { Button, Card, IconButton, ScreenHeader, SectionLabel } from "../components/ui";
import { KindIcon } from "../components/KindIcon";
import { BreathingDots, VerdictStamp } from "../components/motion";
import { useToast } from "../components/Toast";
import { contentFields, contentTitle, FORMAT_LABEL, KIND_LABEL, parseContent, Field } from "../lib/qr/parse";
import { analyzeContent, analyzeUrl, Check } from "../lib/qr/analyze";
import { parseUrl } from "../lib/qr/url";
import { buildActions, copyText, openUrlSafely, resolveFinalUrl } from "../lib/actions";
import { deleteScan, getScan, getScans, restoreScan, ScanItem, subscribeScans, updateScan } from "../lib/storage";
import { formatDateTime } from "../lib/format";
import { haptic } from "../lib/haptics";
import { font, levelColors, radius, space } from "../theme";

export default function ResultScreen({ route, navigation }: RootScreenProps<"Result">) {
  const { scanId, data, format, justScanned } = route.params;
  const { colors, settings } = useApp();
  const toast = useToast();
  const insets = useSafeAreaInsets();

  const [item, setItem] = useState<ScanItem | null>(
    data !== undefined ? { id: "preview", data, type: format ?? "qr", date: new Date().toISOString() } : null
  );
  const [timesScanned, setTimesScanned] = useState(1);
  const [missing, setMissing] = useState(false);

  // Carga + suscripción: la ubicación llega en segundo plano
  useEffect(() => {
    if (!scanId) return;
    let alive = true;
    getScan(scanId).then((s) => {
      if (!alive) return;
      if (s) setItem(s);
      else setMissing(true);
    });
    const unsub = subscribeScans((items) => {
      const s = items.find((x) => x.id === scanId);
      if (s) setItem(s);
    });
    return () => {
      alive = false;
      unsub();
    };
  }, [scanId]);

  useEffect(() => {
    if (!item) return;
    getScans().then((all) => setTimesScanned(all.filter((s) => s.data === item.data).length || 1));
  }, [item?.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const content = useMemo(() => (item ? parseContent(item.data, item.type) : null), [item?.data, item?.type]); // eslint-disable-line react-hooks/exhaustive-deps
  const verdict = useMemo(() => (content ? analyzeContent(content) : null), [content]);

  const notify = (message: string) => toast.show(message);

  if (missing) {
    return (
      <View style={[styles.fill, { backgroundColor: colors.bg }]}>
        <ScreenHeader title="Resultado" onBack={navigation.goBack} large={false} />
        <View style={[styles.fill, styles.center]}>
          <Text style={{ color: colors.textMuted }}>Este escaneo ya no existe.</Text>
        </View>
      </View>
    );
  }

  if (!item || !content || !verdict) {
    return (
      <View style={[styles.fill, styles.center, { backgroundColor: colors.bg }]}>
        <BreathingDots />
      </View>
    );
  }

  const saved = item.id !== "preview";
  const actions = buildActions({ content, verdict, settings, notify });
  const primary = actions.find((a) => a.primary) ?? actions[0];
  const secondary = actions.filter((a) => a !== primary);
  const fields = contentFields(content);

  const toggleFavorite = async () => {
    haptic.selection();
    await updateScan(item.id, { favorite: !item.favorite });
    toast.show({ message: item.favorite ? "Quitado de favoritos" : "Agregado a favoritos", icon: item.favorite ? "star-outline" : "star" });
  };

  const remove = async () => {
    const removed = await deleteScan(item.id);
    haptic.medium();
    navigation.goBack();
    if (removed) {
      toast.show({ message: "Escaneo eliminado", action: { label: "Deshacer", onPress: () => restoreScan(removed.item, removed.index) } });
    }
  };

  return (
    <View style={[styles.fill, { backgroundColor: colors.bg }]}>
      <ScreenHeader
        title="Resultado"
        large={false}
        onBack={navigation.goBack}
        right={
          saved ? (
            <>
              <IconButton icon={item.favorite ? "star" : "star-outline"} label={item.favorite ? "Quitar de favoritos" : "Agregar a favoritos"} onPress={toggleFavorite} size={40} tone={item.favorite ? "accent" : "default"} />
              <IconButton icon="trash-outline" label="Eliminar" onPress={remove} size={40} />
            </>
          ) : undefined
        }
      />

      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: insets.bottom + 120, gap: space.xl }} showsVerticalScrollIndicator={false}>
        {/* ── Encabezado del contenido ── */}
        <Animated.View entering={FadeInDown.duration(260)}>
          <Card>
            <View style={styles.heroTop}>
              <KindIcon kind={content.kind} size={48} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.kindLabel, { color: colors.textMuted }]}>
                  {KIND_LABEL[content.kind]} · {FORMAT_LABEL[item.type] ?? item.type.toUpperCase()}
                </Text>
                <Text style={[styles.time, { color: colors.textFaint }]}>
                  {formatDateTime(item.date)}
                  {item.source === "image" ? " · desde imagen" : ""}
                </Text>
              </View>
              {item.favorite && <Ionicons name="star" size={18} color={colors.star} />}
            </View>
            <Text style={[styles.title, { color: colors.text }]} selectable numberOfLines={3}>
              {contentTitle(content)}
            </Text>
            <View style={{ marginTop: space.md }}>
              <VerdictStamp level={verdict.level} label={verdict.label} />
            </View>
            <Text style={[styles.summary, { color: colors.textMuted }]}>{verdict.summary}</Text>
          </Card>
        </Animated.View>

        {/* ── Acciones ── */}
        <View style={{ gap: space.sm }}>
          <Button label={primary.label} icon={primary.icon} size="lg" onPress={primary.run} variant={verdict.level === "danger" && primary.id === "open" ? "danger" : "primary"} />
          {secondary.length > 0 && (
            <View style={styles.secondaryRow}>
              {secondary.map((a) => (
                <Button key={a.id} label={a.label} icon={a.icon} variant="secondary" onPress={a.run} style={{ flexGrow: 1, flexBasis: secondary.length > 2 ? "30%" : "45%", paddingHorizontal: space.md }} />
              ))}
            </View>
          )}
        </View>

        {/* ── Chequeos de seguridad ── */}
        <View>
          <SectionLabel>Verificación</SectionLabel>
          <Card padded={false}>
            {verdict.checks.map((c, i) => (
              <CheckRow key={c.id} check={c} last={i === verdict.checks.length - 1} />
            ))}
          </Card>
        </View>

        {content.kind === "url" && <UrlTools href={content.url.href} verdictBlocked={verdict.blocked} danger={verdict.level === "danger"} />}

        {/* ── Detalles ── */}
        {fields.length > 0 && (
          <View>
            <SectionLabel>Detalles</SectionLabel>
            <Card padded={false}>
              {fields.map((f, i) => (
                <FieldRow key={`${f.label}-${i}`} field={f} last={i === fields.length - 1} onCopy={(v) => copyText(v, notify, `${f.label} copiado`)} />
              ))}
            </Card>
          </View>
        )}

        {/* ── Contenido crudo ── */}
        <RawContent raw={content.kind === "json" ? JSON.stringify(content.value, null, 2) : item.data} onCopy={() => copyText(item.data, notify, "Contenido copiado")} />

        {/* ── Ubicación ── */}
        {saved && (item.locating || item.location) && (
          <View>
            <SectionLabel>Dónde se escaneó</SectionLabel>
            <Card>
              {item.locating && !item.location ? (
                <BreathingDots label="Obteniendo ubicación…" />
              ) : item.location ? (
                <>
                  <View style={styles.locRow}>
                    <View style={[styles.locIcon, { backgroundColor: colors.dangerSoft }]}>
                      <Ionicons name="location" size={18} color={colors.danger} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.locAddress, { color: colors.text }]} numberOfLines={2}>
                        {item.location.address ?? "Dirección no disponible"}
                      </Text>
                      <Text style={[styles.locCoords, { color: colors.textMuted }]}>
                        {item.location.latitude.toFixed(5)}, {item.location.longitude.toFixed(5)}
                        {item.location.accuracy ? ` · ±${Math.round(item.location.accuracy)} m` : ""}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.secondaryRow, { marginTop: space.md }]}>
                    <Button label="Ver en mapa" icon="map-outline" variant="secondary" style={{ flex: 1 }} onPress={() => navigation.navigate("Map", { focusId: item.id })} />
                    {timesScanned > 1 && (
                      <Button label={`Ruta (${timesScanned})`} icon="git-commit-outline" variant="secondary" style={{ flex: 1 }} onPress={() => navigation.navigate("Map", { filterQrData: item.data })} />
                    )}
                  </View>
                </>
              ) : null}
            </Card>
          </View>
        )}

        {!saved && (
          <Text style={[styles.note, { color: colors.textFaint }]}>
            <Ionicons name="information-circle-outline" size={13} /> Este resultado no se guardó en el historial.
          </Text>
        )}
      </ScrollView>

      {justScanned && (
        <Animated.View entering={FadeIn.delay(300)} style={[styles.footer, { paddingBottom: insets.bottom + space.md, backgroundColor: colors.bg, borderTopColor: colors.border }]}>
          <Button label="Escanear otro" icon="scan-outline" variant="secondary" size="lg" onPress={navigation.goBack} />
        </Animated.View>
      )}

      {/* Accesibilidad: el veredicto se anuncia como región viva */}
      <View accessible accessibilityLiveRegion="polite" accessibilityLabel={`${verdict.label}. ${verdict.summary}`} style={styles.srOnly} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
function CheckRow({ check, last }: { check: Check; last: boolean }) {
  const { colors } = useApp();
  const { fg, bg } = levelColors(colors, check.level);
  const icon = check.level === "danger" ? "close" : check.level === "warning" ? "alert" : check.level === "info" ? "information" : "checkmark";
  return (
    <View style={[styles.checkRow, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
      <View style={[styles.checkIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={14} color={fg} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.checkTitle, { color: colors.text }]}>{check.title}</Text>
        <Text style={[styles.checkDetail, { color: colors.textMuted }]}>{check.detail}</Text>
      </View>
    </View>
  );
}

function FieldRow({ field, last, onCopy }: { field: Field; last: boolean; onCopy: (v: string) => void }) {
  const { colors } = useApp();
  const [revealed, setRevealed] = useState(false);
  const hidden = field.secret && !revealed;
  return (
    <Pressable
      onPress={() => onCopy(field.value)}
      onLongPress={() => onCopy(field.value)}
      accessibilityRole="button"
      accessibilityLabel={`${field.label}: ${hidden ? "oculto" : field.value}. Tocá para copiar`}
      style={({ pressed }) => [styles.fieldRow, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }, pressed && { backgroundColor: colors.surfaceAlt }]}
    >
      <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{field.label}</Text>
      <View style={styles.fieldValueWrap}>
        <Text style={[styles.fieldValue, { color: colors.text }, field.mono && { fontFamily: font.mono, fontSize: font.size.sm }]} selectable={!hidden}>
          {hidden ? "••••••••" : field.value}
        </Text>
        {field.secret && (
          <Pressable onPress={() => setRevealed((r) => !r)} hitSlop={12} accessibilityRole="button" accessibilityLabel={revealed ? "Ocultar" : "Mostrar"}>
            <Ionicons name={revealed ? "eye-off-outline" : "eye-outline"} size={18} color={colors.textMuted} />
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

function RawContent({ raw, onCopy }: { raw: string; onCopy: () => void }) {
  const { colors } = useApp();
  const long = raw.length > 280 || raw.split("\n").length > 8;
  const [expanded, setExpanded] = useState(!long);
  return (
    <View>
      <View style={styles.rawHeader}>
        <SectionLabel style={{ marginBottom: 0 }}>Contenido original</SectionLabel>
        <Pressable onPress={onCopy} hitSlop={10} accessibilityRole="button" accessibilityLabel="Copiar contenido original">
          <Text style={[styles.link, { color: colors.accent }]}>Copiar</Text>
        </Pressable>
      </View>
      <View style={[styles.raw, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
        <Text style={[styles.rawText, { color: colors.text }]} selectable numberOfLines={expanded ? undefined : 8}>
          {raw}
        </Text>
        {long && (
          <Pressable onPress={() => setExpanded((e) => !e)} hitSlop={8} style={{ marginTop: space.sm }}>
            <Text style={[styles.link, { color: colors.accent }]}>{expanded ? "Ver menos" : `Ver todo (${raw.length} caracteres)`}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function UrlTools({ href, verdictBlocked, danger }: { href: string; verdictBlocked: boolean; danger: boolean }) {
  const { colors, settings } = useApp();
  const [resolving, setResolving] = useState(false);
  const [finalUrl, setFinalUrl] = useState<string | null | undefined>(undefined);
  const [preview, setPreview] = useState(false);

  const final = finalUrl ? parseUrl(finalUrl) : null;
  const redirected = !!final && final.href.replace(/\/$/, "") !== href.replace(/\/$/, "");
  const finalChecks = final && redirected ? analyzeUrl(final).filter((c) => c.level === "warning" || c.level === "danger") : [];

  const resolve = async () => {
    setResolving(true);
    const result = await resolveFinalUrl(href);
    setFinalUrl(result);
    setResolving(false);
    haptic.light();
  };

  const startPreview = () => {
    if (danger) {
      Alert.alert("Vista previa de un sitio peligroso", "Cargar la página puede exponer tu dispositivo. ¿Continuar?", [
        { text: "Cancelar", style: "cancel" },
        { text: "Cargar", style: "destructive", onPress: () => setPreview(true) },
      ]);
    } else setPreview(true);
  };

  if (verdictBlocked) return null;

  return (
    <View>
      <SectionLabel>Herramientas del enlace</SectionLabel>
      <Card style={{ gap: space.md }}>
        {finalUrl === undefined ? (
          <Button label={resolving ? "Siguiendo redirecciones…" : "Ver destino real"} icon="git-branch-outline" variant="secondary" onPress={resolve} loading={resolving} accessibilityHint="Contacta al servidor para ver a dónde redirige el enlace" />
        ) : finalUrl === null ? (
          <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>No se pudo contactar al sitio para verificar el destino.</Text>
        ) : (
          <View style={{ gap: 6 }}>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{redirected ? "Redirige a" : "Destino final"}</Text>
            <Text style={[styles.finalUrl, { color: colors.text }]} selectable numberOfLines={3}>
              {finalUrl}
            </Text>
            {!redirected && <Text style={{ color: colors.safe, fontSize: font.size.sm }}>No hay redirecciones ocultas.</Text>}
            {finalChecks.map((c) => (
              <Text key={c.id} style={{ color: levelColors(colors, c.level).fg, fontSize: font.size.sm }}>
                • {c.title}
              </Text>
            ))}
            {redirected && final && (
              <Button
                label={`Abrir ${final.host}`}
                icon="open-outline"
                variant="secondary"
                onPress={() => openUrlSafely(final.href, { level: finalChecks.length ? "warning" : "safe", label: "", summary: "Revisá el destino.", checks: [], blocked: false }, settings)}
              />
            )}
          </View>
        )}

        {!preview ? (
          <Button label="Vista previa del sitio" icon="eye-outline" variant="ghost" onPress={startPreview} />
        ) : (
          <View style={[styles.webview, { borderColor: colors.border }]}>
            <WebView
              source={{ uri: finalUrl && final ? final.href : href }}
              startInLoadingState
              renderLoading={() => (
                <View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: colors.surface }]}>
                  <BreathingDots label="Cargando vista previa…" />
                </View>
              )}
              setSupportMultipleWindows={false}
              allowsLinkPreview={false}
              javaScriptCanOpenWindowsAutomatically={false}
              // Sólo navegación web dentro de la vista previa
              onShouldStartLoadWithRequest={(req) => /^https?:\/\//i.test(req.url)}
              style={{ flex: 1, backgroundColor: colors.surface }}
            />
          </View>
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
  heroTop: { flexDirection: "row", alignItems: "center", gap: space.md },
  kindLabel: { fontSize: font.size.sm, fontWeight: font.weight.semibold },
  time: { fontSize: font.size.xs, marginTop: 2, fontVariant: ["tabular-nums"] },
  title: { fontSize: font.size.xxl, fontWeight: font.weight.heavy, letterSpacing: -0.6, marginTop: space.lg, lineHeight: 32 },
  summary: { fontSize: font.size.sm, marginTop: space.sm, lineHeight: 19 },
  secondaryRow: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  checkRow: { flexDirection: "row", gap: space.md, paddingVertical: 14, paddingHorizontal: space.lg },
  checkIcon: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 1 },
  checkTitle: { fontSize: font.size.md, fontWeight: font.weight.semibold },
  checkDetail: { fontSize: font.size.sm, marginTop: 3, lineHeight: 19 },
  fieldRow: { paddingVertical: 12, paddingHorizontal: space.lg, gap: 3 },
  fieldLabel: { fontSize: font.size.xs, fontWeight: font.weight.semibold, textTransform: "uppercase", letterSpacing: 0.6 },
  fieldValueWrap: { flexDirection: "row", alignItems: "center", gap: space.sm },
  fieldValue: { flex: 1, fontSize: font.size.md, lineHeight: 21 },
  rawHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: space.sm, paddingRight: space.xs },
  raw: { borderRadius: radius.md, padding: space.lg, borderWidth: StyleSheet.hairlineWidth },
  rawText: { fontFamily: font.mono, fontSize: font.size.sm, lineHeight: 20 },
  link: { fontSize: font.size.sm, fontWeight: font.weight.semibold },
  locRow: { flexDirection: "row", gap: space.md, alignItems: "center" },
  locIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  locAddress: { fontSize: font.size.md, fontWeight: font.weight.semibold },
  locCoords: { fontSize: font.size.xs, marginTop: 2, fontFamily: font.mono },
  finalUrl: { fontFamily: font.mono, fontSize: font.size.sm, lineHeight: 19 },
  webview: { height: 420, borderRadius: radius.md, overflow: "hidden", borderWidth: StyleSheet.hairlineWidth },
  note: { fontSize: font.size.xs, textAlign: "center" },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: space.lg, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth },
  srOnly: { position: "absolute", width: 1, height: 1, opacity: 0 },
});
