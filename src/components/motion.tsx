/**
 * Animaciones inspiradas en los recursos de moxen.cl, reimplementadas en
 * React Native con Reanimated (todas corren en el hilo de UI):
 *  - Respiro   → BreathingDots: puntos que respiran con resorte, en turnos.
 *  - Esqueleto → Skeleton: huesos con un único barrido de luz sincronizado.
 *  - Sello     → VerdictStamp: el veredicto se "estampa" con impulso y asiento.
 *  - Escáner   → ScannerFrame: esquinas que se cierran, línea de luz, check
 *                que se dibuja al acertar y sacudida al fallar.
 */
import React, { useEffect } from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../state/AppContext";
import { EASE_IN_OUT, EASE_OUT, font, levelColors, radius } from "../theme";
import type { Level } from "../lib/qr/analyze";

const easeOut = Easing.bezier(...EASE_OUT);
const easeInOut = Easing.bezier(...EASE_IN_OUT);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ─────────────────────────────────────────────────────────────
// Respiro
// ─────────────────────────────────────────────────────────────
function Dot({ index, color, size }: { index: number; color: string; size: number }) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(
      withDelay(
        index * 160,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 360, easing: easeOut }),
            withSpring(0, { duration: 600, dampingRatio: 0.45 }),
            withTiming(0, { duration: 260 })
          ),
          -1
        )
      )
    );
    return () => cancelAnimation(t);
  }, [index, t]);
  const style = useAnimatedStyle(() => {
    const v = t.get();
    return reduced
      ? { opacity: interpolate(v, [0, 1], [0.35, 1]) }
      : {
          opacity: interpolate(v, [-0.2, 0, 1], [0.5, 0.45, 1]),
          transform: [{ translateY: interpolate(v, [0, 1], [0, -size * 0.35]) }, { scaleY: interpolate(v, [-0.3, 0, 1], [0.85, 1, 1.18]) }, { scaleX: interpolate(v, [0, 1], [1, 0.92]) }],
        };
  });
  return <Animated.View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style]} />;
}

export function BreathingDots({ color, size = 7, label }: { color?: string; size?: number; label?: string }) {
  const { colors } = useTheme();
  const c = color ?? colors.textMuted;
  return (
    <View style={styles.dotsRow} accessibilityRole="progressbar" accessibilityLabel={label ?? "Cargando"}>
      <View style={[styles.dots, { gap: size * 0.7, height: size * 2 }]}>
        {[0, 1, 2].map((i) => (
          <Dot key={i} index={i} color={c} size={size} />
        ))}
      </View>
      {label ? <Text style={[styles.dotsLabel, { color: colors.textMuted }]}>{label}</Text> : null}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Esqueleto
// ─────────────────────────────────────────────────────────────
const SWEEP_MS = 1300;

export function Bone({ width, height = 12, radius: r = 6, style }: { width: number | `${number}%`; height?: number; radius?: number; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const x = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    // Los huesos se montan juntos y comparten duración → un único barrido visual
    x.set(withRepeat(withTiming(1, { duration: SWEEP_MS, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(x);
  }, [reduced, x]);
  const sweep = useAnimatedStyle(() => ({ transform: [{ translateX: `${interpolate(x.get(), [0, 1], [-100, 220])}%` }, { skewX: "-18deg" }] }));
  return (
    <View style={[{ width, height, borderRadius: r, backgroundColor: colors.skeleton, overflow: "hidden" }, style]}>
      {!reduced && <Animated.View style={[StyleSheet.absoluteFill, { width: "45%", backgroundColor: colors.skeletonHighlight }, sweep]} />}
    </View>
  );
}

export function SkeletonRow() {
  const { colors } = useTheme();
  return (
    <View style={[styles.skelRow, { backgroundColor: colors.surface }]}>
      <Bone width={44} height={44} radius={13} />
      <View style={{ flex: 1, gap: 8 }}>
        <Bone width="62%" height={13} />
        <Bone width="88%" height={11} />
      </View>
      <Bone width={34} height={11} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Sello
// ─────────────────────────────────────────────────────────────
export function VerdictStamp({ level, label }: { level: Level; label: string }) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const { fg, bg } = levelColors(colors, level);
  const t = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) return;
    // impulso hacia arriba → cae girando → se aplasta → asienta
    t.set(withDelay(180, withSpring(1, { duration: 520, dampingRatio: 0.55 })));
  }, [reduced, t]);

  const style = useAnimatedStyle(() => {
    const v = t.get();
    return {
      opacity: interpolate(v, [0, 0.35], [0, 1], "clamp"),
      transform: [
        { translateY: interpolate(v, [0, 1], [-10, 0]) },
        { rotate: `${interpolate(v, [0, 1], [-16, -4])}deg` },
        { scale: interpolate(v, [0, 0.8, 1], [1.3, 0.95, 1]) },
      ],
    };
  });

  const icon = level === "danger" ? "alert-circle" : level === "warning" ? "warning" : "shield-checkmark";
  return (
    <Animated.View style={[styles.stamp, { borderColor: fg, backgroundColor: bg }, style]} accessibilityRole="text" accessibilityLabel={`Veredicto: ${label}`}>
      <Ionicons name={icon} size={16} color={fg} />
      <Text style={[styles.stampLabel, { color: fg }]}>{label.toUpperCase()}</Text>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────
// Escáner
// ─────────────────────────────────────────────────────────────
export type ScanState = "idle" | "success" | "error";

const CHECK_LEN = 64;

function Corner({ enter, dx, dy, size, style }: { enter: SharedValue<number>; dx: number; dy: number; size: number; style: StyleProp<ViewStyle> }) {
  const animated = useAnimatedStyle(() => {
    const gap = interpolate(enter.get(), [0, 1], [size * 0.14, 0]);
    return {
      opacity: interpolate(enter.get(), [0, 0.4], [0, 1], "clamp"),
      transform: [{ translateX: dx * gap }, { translateY: dy * gap }],
    };
  });
  return <Animated.View style={[style, animated]} />;
}

export function ScannerFrame({ size, state, idleColor = "#FFFFFF", successColor, errorColor }: { size: number; state: ScanState; idleColor?: string; successColor: string; errorColor: string }) {
  const reduced = useReducedMotion();
  const enter = useSharedValue(reduced ? 1 : 0);
  const line = useSharedValue(0);
  const lineOpacity = useSharedValue(1);
  const success = useSharedValue(0);
  const shake = useSharedValue(0);

  useEffect(() => {
    if (!reduced) enter.set(withSpring(1, { duration: 520, dampingRatio: 0.75 }));
  }, [enter, reduced]);

  useEffect(() => {
    if (state === "idle") {
      success.set(withTiming(0, { duration: 160 }));
      lineOpacity.set(withTiming(1, { duration: 200 }));
      if (!reduced) {
        line.set(0);
        line.set(withRepeat(withTiming(1, { duration: 1900, easing: easeInOut }), -1, true));
      }
    } else {
      lineOpacity.set(withTiming(0, { duration: 120 }));
      cancelAnimation(line);
    }
    if (state === "success") {
      success.set(withTiming(1, { duration: 360, easing: easeOut }));
    }
    if (state === "error" && !reduced) {
      shake.set(
        withSequence(
          withTiming(-10, { duration: 50 }),
          withTiming(9, { duration: 70 }),
          withTiming(-6, { duration: 70 }),
          withTiming(4, { duration: 60 }),
          withSpring(0, { duration: 300, dampingRatio: 0.6 })
        )
      );
    }
  }, [state, line, lineOpacity, success, shake, reduced]);

  const frameStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.get() }, { scale: interpolate(success.get(), [0, 0.5, 1], [1, 0.9, 0.94]) }],
  }));

  const color = state === "success" ? successColor : state === "error" ? errorColor : idleColor;
  const corner = Math.round(size * 0.16);

  const lineStyle = useAnimatedStyle(() => ({
    opacity: lineOpacity.get() * interpolate(line.get(), [0, 0.06, 0.94, 1], [0.3, 1, 1, 0.3]),
    transform: [{ translateY: interpolate(line.get(), [0, 1], [size * 0.08, size * 0.92]) }],
  }));

  const checkProps = useAnimatedProps(() => ({ strokeDashoffset: CHECK_LEN * (1 - success.get()) }));
  const checkWrap = useAnimatedStyle(() => ({ opacity: success.get(), transform: [{ scale: interpolate(success.get(), [0, 1], [0.8, 1]) }] }));

  const c = { width: corner, height: corner, borderColor: color, position: "absolute" as const };
  return (
    <Animated.View style={[{ width: size, height: size }, frameStyle]} pointerEvents="none">
      <Corner enter={enter} size={size} dx={-1} dy={-1} style={[c, styles.tl]} />
      <Corner enter={enter} size={size} dx={1} dy={-1} style={[c, styles.tr]} />
      <Corner enter={enter} size={size} dx={-1} dy={1} style={[c, styles.bl]} />
      <Corner enter={enter} size={size} dx={1} dy={1} style={[c, styles.br]} />

      {!reduced && <Animated.View style={[styles.scanLine, { backgroundColor: idleColor, shadowColor: idleColor }, lineStyle]} />}

      <Animated.View style={[StyleSheet.absoluteFill, styles.center, checkWrap]}>
        <View style={[styles.checkBadge, { backgroundColor: successColor }]}>
          <Svg width={40} height={40} viewBox="0 0 40 40">
            <AnimatedPath d="M10 21 L17 28 L31 13" stroke="#FFFFFF" strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" fill="none" strokeDasharray={CHECK_LEN} animatedProps={checkProps} />
          </Svg>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────
// Anillo de cuenta regresiva (Deshacer)
// ─────────────────────────────────────────────────────────────
export function CountdownRing({ duration, size = 26, color, track, runKey }: { duration: number; size?: number; color: string; track: string; runKey: string | number }) {
  const p = useSharedValue(1);
  const r = (size - 4) / 2;
  const circ = 2 * Math.PI * r;
  useEffect(() => {
    p.set(1);
    p.set(withTiming(0, { duration, easing: Easing.linear }));
    return () => cancelAnimation(p);
  }, [duration, runKey, p]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: circ * (1 - p.get()) }));
  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={2.5} fill="none" />
      <AnimatedCircle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={2.5} fill="none" strokeDasharray={circ} strokeLinecap="round" animatedProps={props} />
    </Svg>
  );
}

const B = 4;
const styles = StyleSheet.create({
  dotsRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  dots: { flexDirection: "row", alignItems: "center" },
  dotsLabel: { fontSize: font.size.sm, fontWeight: font.weight.medium },
  skelRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: radius.lg },
  stamp: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    borderWidth: 2,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  stampLabel: { fontSize: font.size.sm, fontWeight: font.weight.heavy, letterSpacing: 1.4 },
  tl: { top: 0, left: 0, borderTopWidth: B, borderLeftWidth: B, borderTopLeftRadius: 18 },
  tr: { top: 0, right: 0, borderTopWidth: B, borderRightWidth: B, borderTopRightRadius: 18 },
  bl: { bottom: 0, left: 0, borderBottomWidth: B, borderLeftWidth: B, borderBottomLeftRadius: 18 },
  br: { bottom: 0, right: 0, borderBottomWidth: B, borderRightWidth: B, borderBottomRightRadius: 18 },
  scanLine: {
    position: "absolute",
    left: "8%",
    right: "8%",
    top: 0,
    height: 2,
    borderRadius: 1,
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  center: { alignItems: "center", justifyContent: "center" },
  checkBadge: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
});
