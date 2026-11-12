import React from "react";
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  Switch,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../state/AppContext";
import { EASE_OUT, font, radius, shadow, space } from "../theme";
import type { IconName } from "../lib/actions";

const easeOut = Easing.bezier(...EASE_OUT);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ─────────────────────────────────────────────────────────────
// PressableScale: feedback al apoyar el dedo (no al soltar), 120ms ease-out
// ─────────────────────────────────────────────────────────────
type PressableScaleProps = Omit<PressableProps, "style"> & {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  children?: React.ReactNode;
};

export function PressableScale({ style, scaleTo = 0.97, onPressIn, onPressOut, disabled, children, ...rest }: PressableScaleProps) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      pressRetentionOffset={{ top: 16, bottom: 16, left: 16, right: 16 }}
      onPressIn={(e) => {
        scale.set(withTiming(scaleTo, { duration: 110, easing: easeOut }));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(withTiming(1, { duration: 160, easing: easeOut }));
        onPressOut?.(e);
      }}
      style={[style, animated, disabled && { opacity: 0.45 }]}
    >
      {children}
    </AnimatedPressable>
  );
}

// ─────────────────────────────────────────────────────────────
// Botones
// ─────────────────────────────────────────────────────────────
type ButtonProps = {
  label: string;
  icon?: IconName;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
};

export function Button({ label, icon, onPress, variant = "primary", size = "md", loading, disabled, style, accessibilityHint }: ButtonProps) {
  const { colors } = useTheme();
  const bg =
    variant === "primary" ? colors.accent : variant === "danger" ? colors.dangerSoft : variant === "secondary" ? colors.surfaceAlt : "transparent";
  const fg = variant === "primary" ? colors.onAccent : variant === "danger" ? colors.danger : variant === "secondary" ? colors.text : colors.accent;
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      style={[styles.button, { backgroundColor: bg, minHeight: size === "lg" ? 54 : 46 }, style]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={size === "lg" ? 20 : 18} color={fg} />}
          <Text style={[styles.buttonLabel, { color: fg, fontSize: size === "lg" ? font.size.lg : font.size.md }]} numberOfLines={1}>
            {label}
          </Text>
        </>
      )}
    </PressableScale>
  );
}

export function IconButton({
  icon,
  onPress,
  label,
  tone = "default",
  size = 44,
  active,
  style,
}: {
  icon: IconName;
  onPress?: () => void;
  label: string;
  tone?: "default" | "glass" | "accent";
  size?: number;
  active?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const bg =
    tone === "glass" ? (active ? "rgba(255,255,255,0.92)" : "rgba(20,22,27,0.55)") : tone === "accent" ? colors.accentSoft : colors.surfaceAlt;
  const fg = tone === "glass" ? (active ? "#0C0E13" : "#FFFFFF") : tone === "accent" ? colors.accent : colors.text;
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={active !== undefined ? { selected: active } : undefined}
      hitSlop={8}
      scaleTo={0.92}
      style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: "center", justifyContent: "center" }, style]}
    >
      <Ionicons name={icon} size={Math.round(size * 0.48)} color={fg} />
    </PressableScale>
  );
}

// ─────────────────────────────────────────────────────────────
// Superficies y texto
// ─────────────────────────────────────────────────────────────
export function Card({ children, style, padded = true }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; padded?: boolean }) {
  const { colors, scheme } = useTheme();
  return (
    <View style={[{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: padded ? space.lg : 0 }, shadow(colors, scheme), style]}>
      {children}
    </View>
  );
}

export function SectionLabel({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  const { colors } = useTheme();
  return <Text style={[styles.sectionLabel, { color: colors.textMuted }, style]}>{children}</Text>;
}

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  right,
  large = true,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  large?: boolean;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top + space.sm, paddingHorizontal: space.lg, paddingBottom: space.md, backgroundColor: colors.bg }}>
      <View style={styles.headerRow}>
        {onBack ? <IconButton icon="chevron-back" label="Volver" onPress={onBack} size={40} /> : <View />}
        {!large && (
          <Text style={[styles.headerSmallTitle, { color: colors.text }]} numberOfLines={1} accessibilityRole="header">
            {title}
          </Text>
        )}
        <View style={styles.headerRight}>{right}</View>
      </View>
      {large && (
        <View style={{ marginTop: onBack ? space.md : 0 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]} accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>{subtitle}</Text> : null}
        </View>
      )}
    </View>
  );
}

export function Chip({ label, active, onPress, icon, count }: { label: string; active?: boolean; onPress?: () => void; icon?: IconName; count?: number }) {
  const { colors } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      style={[
        styles.chip,
        { backgroundColor: active ? colors.text : colors.surface, borderColor: active ? colors.text : colors.border },
      ]}
    >
      {icon && <Ionicons name={icon} size={14} color={active ? colors.bg : colors.textMuted} />}
      <Text style={[styles.chipLabel, { color: active ? colors.bg : colors.text }]}>{label}</Text>
      {count !== undefined && <Text style={[styles.chipCount, { color: active ? colors.bg : colors.textFaint }]}>{count}</Text>}
    </PressableScale>
  );
}

export function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: string; icon?: IconName }[]; value: T; onChange: (v: T) => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.segmented, { backgroundColor: colors.surfaceAlt }]} accessibilityRole="tablist">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[styles.segment, active && { backgroundColor: colors.surface, ...styles.segmentActive }]}
          >
            {o.icon && <Ionicons name={o.icon} size={15} color={active ? colors.text : colors.textMuted} />}
            <Text style={[styles.segmentLabel, { color: active ? colors.text : colors.textMuted }]} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SettingRow({
  icon,
  label,
  description,
  value,
  onValueChange,
  onPress,
  destructive,
  trailing,
}: {
  icon: IconName;
  label: string;
  description?: string;
  value?: boolean;
  onValueChange?: (v: boolean) => void;
  onPress?: () => void;
  destructive?: boolean;
  trailing?: string;
}) {
  const { colors } = useTheme();
  const tint = destructive ? colors.danger : colors.text;
  const content = (
    <View style={styles.settingRow}>
      <View style={[styles.settingIcon, { backgroundColor: destructive ? colors.dangerSoft : colors.surfaceAlt }]}>
        <Ionicons name={icon} size={18} color={destructive ? colors.danger : colors.textMuted} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.settingLabel, { color: tint }]}>{label}</Text>
        {description ? <Text style={[styles.settingDesc, { color: colors.textMuted }]}>{description}</Text> : null}
      </View>
      {onValueChange ? (
        <Switch
          value={!!value}
          onValueChange={onValueChange}
          trackColor={{ true: colors.accent, false: colors.borderStrong }}
          thumbColor="#FFFFFF"
          accessibilityLabel={label}
        />
      ) : (
        <>
          {trailing ? <Text style={[styles.settingTrailing, { color: colors.textMuted }]}>{trailing}</Text> : null}
          {onPress && <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />}
        </>
      )}
    </View>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => pressed && { opacity: 0.6 }}>
        {content}
      </Pressable>
    );
  }
  return content;
}

export function Divider({ inset = 0 }: { inset?: number }) {
  const { colors } = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: inset }} />;
}

export function EmptyState({ icon, title, description, action }: { icon: IconName; title: string; description: string; action?: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceAlt }]}>
        <Ionicons name={icon} size={30} color={colors.textMuted} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>{description}</Text>
      {action ? <View style={{ marginTop: space.xl }}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
    paddingHorizontal: space.xl,
    borderRadius: radius.md,
  },
  buttonLabel: { fontWeight: font.weight.semibold, letterSpacing: -0.1 },
  sectionLabel: {
    fontSize: font.size.xs,
    fontWeight: font.weight.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: space.sm,
    marginLeft: space.xs,
  },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 40 },
  headerRight: { flexDirection: "row", gap: space.sm, alignItems: "center" },
  headerTitle: { fontSize: font.size.display, fontWeight: font.weight.heavy, letterSpacing: -0.8 },
  headerSmallTitle: { position: "absolute", left: 56, right: 56, textAlign: "center", fontSize: font.size.lg, fontWeight: font.weight.semibold },
  headerSubtitle: { fontSize: font.size.md, marginTop: 2 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  chipLabel: { fontSize: font.size.sm, fontWeight: font.weight.semibold },
  chipCount: { fontSize: font.size.xs, fontWeight: font.weight.semibold, fontVariant: ["tabular-nums"] },
  segmented: { flexDirection: "row", padding: 3, borderRadius: radius.md, gap: 2 },
  segment: { flex: 1, flexDirection: "row", gap: 5, alignItems: "center", justifyContent: "center", height: 36, borderRadius: 9, paddingHorizontal: 6 },
  segmentActive: { shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  segmentLabel: { fontSize: font.size.sm, fontWeight: font.weight.semibold },
  settingRow: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.md, paddingHorizontal: space.lg, minHeight: 56 },
  settingIcon: { width: 32, height: 32, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  settingLabel: { fontSize: font.size.md, fontWeight: font.weight.medium },
  settingDesc: { fontSize: font.size.sm, marginTop: 2, lineHeight: 18 },
  settingTrailing: { fontSize: font.size.sm },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: space.xxxl, paddingVertical: 64 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: space.lg },
  emptyTitle: { fontSize: font.size.xl, fontWeight: font.weight.bold, textAlign: "center", letterSpacing: -0.3 },
  emptyDesc: { fontSize: font.size.md, textAlign: "center", lineHeight: 22, marginTop: space.sm },
});
