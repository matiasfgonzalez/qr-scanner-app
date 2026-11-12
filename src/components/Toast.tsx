import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, FadeOutDown, SlideInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../state/AppContext";
import { EASE_OUT, font, radius, space } from "../theme";
import { CountdownRing } from "./motion";
import { haptic } from "../lib/haptics";

/**
 * Avisos no bloqueantes. Con `action` se convierte en el patrón "Deshacer"
 * (inspirado en moxen.cl/recursos/deshacer): aviso flotante con anillo de
 * cuenta regresiva; al vencer se confirma, al tocar se revierte.
 */

type ToastOptions = {
  message: string;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  action?: { label: string; onPress: () => void };
  duration?: number;
  /** se llama si el aviso vence sin que se toque la acción */
  onExpire?: () => void;
};

type ToastState = ToastOptions & { id: number };

const ToastContext = createContext<{ show: (o: ToastOptions | string) => void } | null>(null);

// Por encima de la barra de pestañas
const TAB_CLEARANCE = 64;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const current = useRef<ToastState | null>(null);
  const insets = useSafeAreaInsets();
  const { colors, scheme } = useTheme();

  const dismiss = useCallback((expired: boolean) => {
    if (timer.current) clearTimeout(timer.current);
    const t = current.current;
    current.current = null;
    setToast(null);
    if (expired) t?.onExpire?.();
  }, []);

  const show = useCallback(
    (o: ToastOptions | string) => {
      const opts = typeof o === "string" ? { message: o } : o;
      // Si había un "Deshacer" pendiente, se confirma antes de mostrar el nuevo
      if (current.current) dismiss(true);
      const next: ToastState = { duration: opts.action ? 5000 : 2200, ...opts, id: Date.now() };
      current.current = next;
      setToast(next);
      timer.current = setTimeout(() => dismiss(true), next.duration);
    },
    [dismiss]
  );

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const value = useMemo(() => ({ show }), [show]);
  const bg = scheme === "dark" ? "#2A2E37" : "#16181D";

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
        <Animated.View
          key={toast.id}
          entering={SlideInDown.duration(260).easing(Easing.bezier(...EASE_OUT))}
          exiting={FadeOutDown.duration(160)}
          style={[styles.wrap, { bottom: insets.bottom + TAB_CLEARANCE + space.sm }]}
          pointerEvents="box-none"
        >
          <View style={[styles.toast, { backgroundColor: bg }]} accessibilityLiveRegion="polite" accessibilityRole="alert">
            {toast.action ? (
              <CountdownRing duration={toast.duration!} color="#FFFFFF" track="rgba(255,255,255,0.18)" runKey={toast.id} />
            ) : (
              <Ionicons name={toast.icon ?? "checkmark-circle"} size={20} color={colors.safe} />
            )}
            <Text style={styles.message} numberOfLines={2}>
              {toast.message}
            </Text>
            {toast.action && (
              <Pressable
                onPress={() => {
                  haptic.light();
                  toast.action!.onPress();
                  dismiss(false);
                }}
                hitSlop={10}
                accessibilityRole="button"
                style={({ pressed }) => [styles.action, pressed && { opacity: 0.6 }]}
              >
                <Text style={[styles.actionLabel, { color: "#8DA6FF" }]}>{toast.action.label}</Text>
              </Pressable>
            )}
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de <ToastProvider>");
  return ctx;
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: space.lg, right: space.lg, alignItems: "center" },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingVertical: 12,
    paddingLeft: 14,
    paddingRight: 8,
    borderRadius: radius.lg,
    minHeight: 52,
    maxWidth: 520,
    width: "100%",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  message: { flex: 1, color: "#FFFFFF", fontSize: font.size.md, fontWeight: font.weight.medium },
  action: { paddingHorizontal: 12, paddingVertical: 8 },
  actionLabel: { fontSize: font.size.md, fontWeight: font.weight.bold },
});
