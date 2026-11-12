import React, { useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TextInputProps, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Ionicons } from "@expo/vector-icons";

import { TabScreenProps } from "../navigation/types";
import { useApp } from "../state/AppContext";
import { Button, Card, Chip, ScreenHeader, Segmented, SectionLabel } from "../components/ui";
import { useToast } from "../components/Toast";
import { parseContent } from "../lib/qr/parse";
import { analyzeContent } from "../lib/qr/analyze";
import { parseUrl } from "../lib/qr/url";
import { copyText } from "../lib/actions";
import { recordScan } from "../lib/scan";
import { haptic } from "../lib/haptics";
import { font, levelColors, radius, space } from "../theme";

type Kind = "text" | "url" | "wifi" | "contact" | "email" | "phone";

const KINDS: { id: Kind; label: string; icon: React.ComponentProps<typeof Ionicons>["name"] }[] = [
  { id: "url", label: "Enlace", icon: "globe-outline" },
  { id: "text", label: "Texto", icon: "document-text-outline" },
  { id: "wifi", label: "Wi‑Fi", icon: "wifi" },
  { id: "contact", label: "Contacto", icon: "person-outline" },
  { id: "email", label: "Email", icon: "mail-outline" },
  { id: "phone", label: "Teléfono", icon: "call-outline" },
];

// Capacidad aproximada de un QR versión 40 con corrección M (bytes)
const MAX_BYTES = 2331;

/** Escapa valores para WIFI:/MECARD: (\ ; , : ") */
const escMe = (v: string) => v.replace(/([\\;,:"])/g, "\\$1");
/** Escapa valores vCard (RFC 6350) */
const escV = (v: string) => v.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");

type Form = {
  text: string;
  url: string;
  ssid: string;
  password: string;
  security: "WPA" | "WEP" | "nopass";
  hidden: boolean;
  firstName: string;
  lastName: string;
  org: string;
  phone: string;
  email: string;
  web: string;
  to: string;
  subject: string;
  body: string;
  tel: string;
};

const EMPTY: Form = {
  text: "",
  url: "",
  ssid: "",
  password: "",
  security: "WPA",
  hidden: false,
  firstName: "",
  lastName: "",
  org: "",
  phone: "",
  email: "",
  web: "",
  to: "",
  subject: "",
  body: "",
  tel: "",
};

function buildPayload(kind: Kind, f: Form): string {
  switch (kind) {
    case "text":
      return f.text;
    case "url": {
      const t = f.url.trim();
      if (!t) return "";
      return /^[a-z][a-z0-9+.-]*:\/\//i.test(t) ? t : `https://${t}`;
    }
    case "wifi":
      if (!f.ssid) return "";
      return `WIFI:T:${f.security};S:${escMe(f.ssid)};${f.security !== "nopass" ? `P:${escMe(f.password)};` : ""}${f.hidden ? "H:true;" : ""};`;
    case "contact": {
      if (!f.firstName && !f.lastName && !f.phone && !f.email) return "";
      const fn = [f.firstName, f.lastName].filter(Boolean).join(" ");
      return [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `N:${escV(f.lastName)};${escV(f.firstName)};;;`,
        `FN:${escV(fn || f.org)}`,
        f.org && `ORG:${escV(f.org)}`,
        f.phone && `TEL;TYPE=CELL:${escV(f.phone)}`,
        f.email && `EMAIL:${escV(f.email)}`,
        f.web && `URL:${escV(f.web)}`,
        "END:VCARD",
      ]
        .filter(Boolean)
        .join("\n");
    }
    case "email": {
      if (!f.to) return "";
      const q = [f.subject && `subject=${encodeURIComponent(f.subject)}`, f.body && `body=${encodeURIComponent(f.body)}`].filter(Boolean).join("&");
      return `mailto:${f.to.trim()}${q ? `?${q}` : ""}`;
    }
    case "phone":
      return f.tel ? `tel:${f.tel.replace(/[^\d+]/g, "")}` : "";
  }
}

function utf8Length(s: string) {
  let n = 0;
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    n += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
  }
  return n;
}

export default function CreateScreen(_: TabScreenProps<"Create">) {
  const { colors } = useApp();
  const toast = useToast();
  const [kind, setKind] = useState<Kind>("url");
  const [form, setForm] = useState<Form>(EMPTY);
  const [busy, setBusy] = useState(false);
  const qrRef = useRef<{ toDataURL: (cb: (data: string) => void) => void } | null>(null);

  const set = <K extends keyof Form>(key: K) => (value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));

  const payload = useMemo(() => buildPayload(kind, form), [kind, form]);
  const bytes = utf8Length(payload);
  const tooLong = bytes > MAX_BYTES;

  // Validamos lo generado con el mismo analizador que el escáner
  const validation = useMemo(() => {
    if (!payload) return null;
    if (kind === "url" && !parseUrl(payload)) return { level: "danger" as const, text: "La dirección no es válida." };
    const v = analyzeContent(parseContent(payload));
    const issue = v.checks.find((c) => c.level === "danger" || c.level === "warning");
    if (kind === "text" && !issue) return null;
    return issue ? { level: issue.level, text: issue.title } : { level: "safe" as const, text: "Formato válido" };
  }, [payload, kind]);

  const canUse = !!payload && !tooLong && validation?.level !== "danger";

  const shareImage = () => {
    if (!qrRef.current || !canUse) return;
    setBusy(true);
    qrRef.current.toDataURL(async (base64) => {
      try {
        const file = new File(Paths.cache, `qr-${Date.now()}.png`);
        file.create();
        file.write(base64.replace(/^data:image\/png;base64,/, ""), { encoding: "base64" });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(file.uri, { mimeType: "image/png", dialogTitle: "Compartir código QR", UTI: "public.png" });
        } else {
          toast.show({ message: "Compartir no está disponible", icon: "alert-circle" });
        }
      } catch (err) {
        console.warn(err);
        toast.show({ message: "No se pudo generar la imagen", icon: "alert-circle" });
      } finally {
        setBusy(false);
      }
    });
  };

  const saveToHistory = async () => {
    if (!canUse) return;
    await recordScan({ data: payload, format: "qr", source: "generated", withLocation: false });
    haptic.success();
    toast.show({ message: "Guardado en el historial", icon: "checkmark-circle" });
  };

  const field = (key: keyof Form, label: string, props: TextInputProps = {}) => (
    <Input label={label} value={form[key] as string} onChangeText={set(key) as (v: string) => void} {...props} />
  );

  return (
    <KeyboardAvoidingView style={[styles.fill, { backgroundColor: colors.bg }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScreenHeader title="Crear código" subtitle="Generá un QR para compartir" />
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kinds}>
          {KINDS.map((k) => (
            <Chip
              key={k.id}
              label={k.label}
              icon={k.icon}
              active={kind === k.id}
              onPress={() => {
                haptic.selection();
                setKind(k.id);
              }}
            />
          ))}
        </ScrollView>

        <View style={{ paddingHorizontal: space.lg, gap: space.xl }}>
          {/* Vista previa: siempre negro sobre blanco para máxima legibilidad */}
          <Card style={styles.previewCard}>
            <View style={styles.qrBox}>
              {payload && !tooLong ? (
                <QRCode value={payload} size={208} ecl="M" quietZone={12} color="#0C0E13" backgroundColor="#FFFFFF" getRef={(c) => (qrRef.current = c)} />
              ) : (
                <View style={styles.qrPlaceholder}>
                  <Ionicons name={tooLong ? "alert-circle-outline" : "qr-code-outline"} size={56} color="#C3C8D0" />
                  <Text style={styles.qrPlaceholderText}>{tooLong ? "Demasiado contenido para un QR" : "Completá los datos para ver tu código"}</Text>
                </View>
              )}
            </View>
            {validation && (
              <View style={[styles.validation, { backgroundColor: levelColors(colors, validation.level).bg }]}>
                <Ionicons name={validation.level === "safe" ? "checkmark-circle" : validation.level === "danger" ? "close-circle" : "warning"} size={15} color={levelColors(colors, validation.level).fg} />
                <Text style={[styles.validationText, { color: levelColors(colors, validation.level).fg }]}>{validation.text}</Text>
              </View>
            )}
            {payload ? (
              <Text style={[styles.bytes, { color: tooLong ? colors.danger : colors.textFaint }]}>
                {bytes} / {MAX_BYTES} bytes
              </Text>
            ) : null}
          </Card>

          <View>
            <SectionLabel>Datos</SectionLabel>
            <Card style={{ gap: space.md }}>
              {kind === "text" && field("text", "Texto", { multiline: true, placeholder: "Escribí cualquier texto", style: { minHeight: 96, textAlignVertical: "top" } })}
              {kind === "url" && field("url", "Dirección web", { placeholder: "ejemplo.com", keyboardType: "url", autoCapitalize: "none", autoCorrect: false })}
              {kind === "wifi" && (
                <>
                  {field("ssid", "Nombre de la red (SSID)", { placeholder: "MiCasa", autoCapitalize: "none", autoCorrect: false })}
                  <View>
                    <Text style={[styles.label, { color: colors.textMuted }]}>Seguridad</Text>
                    <Segmented
                      value={form.security}
                      onChange={set("security")}
                      options={[
                        { value: "WPA", label: "WPA/WPA2" },
                        { value: "WEP", label: "WEP" },
                        { value: "nopass", label: "Abierta" },
                      ]}
                    />
                  </View>
                  {form.security !== "nopass" && field("password", "Contraseña", { autoCapitalize: "none", autoCorrect: false, secureTextEntry: false })}
                  <View style={styles.switchRow}>
                    <Text style={[styles.switchLabel, { color: colors.text }]}>Red oculta</Text>
                    <Switch value={form.hidden} onValueChange={set("hidden")} trackColor={{ true: colors.accent, false: colors.borderStrong }} thumbColor="#FFFFFF" />
                  </View>
                </>
              )}
              {kind === "contact" && (
                <>
                  <View style={styles.row2}>
                    <View style={{ flex: 1 }}>{field("firstName", "Nombre", { textContentType: "givenName" })}</View>
                    <View style={{ flex: 1 }}>{field("lastName", "Apellido", { textContentType: "familyName" })}</View>
                  </View>
                  {field("org", "Empresa", { textContentType: "organizationName" })}
                  {field("phone", "Teléfono", { keyboardType: "phone-pad", textContentType: "telephoneNumber" })}
                  {field("email", "Email", { keyboardType: "email-address", autoCapitalize: "none", textContentType: "emailAddress" })}
                  {field("web", "Sitio web", { keyboardType: "url", autoCapitalize: "none" })}
                </>
              )}
              {kind === "email" && (
                <>
                  {field("to", "Para", { keyboardType: "email-address", autoCapitalize: "none", placeholder: "nombre@ejemplo.com" })}
                  {field("subject", "Asunto")}
                  {field("body", "Mensaje", { multiline: true, style: { minHeight: 80, textAlignVertical: "top" } })}
                </>
              )}
              {kind === "phone" && field("tel", "Número", { keyboardType: "phone-pad", placeholder: "+54 9 343 555 1234" })}
            </Card>
          </View>

          <View style={{ gap: space.sm }}>
            <Button label="Compartir imagen" icon="share-outline" size="lg" disabled={!canUse} loading={busy} onPress={shareImage} />
            <View style={styles.row2}>
              <Button label="Copiar texto" icon="copy-outline" variant="secondary" style={{ flex: 1 }} disabled={!payload} onPress={() => copyText(payload, toast.show, "Contenido copiado")} />
              <Button label="Guardar" icon="bookmark-outline" variant="secondary" style={{ flex: 1 }} disabled={!canUse} onPress={saveToHistory} />
            </View>
            {payload ? (
              <Button
                label="Limpiar"
                variant="ghost"
                onPress={() => {
                  setForm(EMPTY);
                }}
              />
            ) : null}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Input({ label, style, ...props }: TextInputProps & { label: string }) {
  const { colors } = useApp();
  const [focused, setFocused] = useState(false);
  return (
    <View>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={label}
        placeholderTextColor={colors.textFaint}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        style={[
          styles.input,
          { backgroundColor: colors.surfaceAlt, color: colors.text, borderColor: focused ? colors.accent : "transparent" },
          style,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  kinds: { paddingHorizontal: space.lg, gap: space.sm, paddingBottom: space.lg },
  previewCard: { alignItems: "center", gap: space.md },
  qrBox: { width: 232, height: 232, borderRadius: radius.md, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  qrPlaceholder: { alignItems: "center", gap: space.md, paddingHorizontal: space.xl },
  qrPlaceholderText: { color: "#8B93A1", fontSize: font.size.sm, textAlign: "center", lineHeight: 18 },
  validation: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full },
  validationText: { fontSize: font.size.sm, fontWeight: font.weight.semibold },
  bytes: { fontSize: font.size.xs, fontVariant: ["tabular-nums"] },
  label: { fontSize: font.size.xs, fontWeight: font.weight.semibold, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 },
  // 16px: evita el zoom de iOS al enfocar
  input: { fontSize: 16, minHeight: 46, paddingHorizontal: space.md, paddingVertical: 11, borderRadius: radius.md, borderWidth: 1.5 },
  row2: { flexDirection: "row", gap: space.sm },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  switchLabel: { fontSize: font.size.md, fontWeight: font.weight.medium },
});
