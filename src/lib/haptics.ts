import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

/**
 * Haptics centralizados: una sola llamada por acción del usuario, siempre
 * acompañada de feedback visual. Se respetan los ajustes del usuario.
 */
let enabled = true;

export function setHapticsEnabled(value: boolean) {
  enabled = value;
}

function run(fn: () => Promise<void>) {
  if (!enabled || Platform.OS === "web") return;
  fn().catch(() => undefined);
}

export const haptic = {
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
  light: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  medium: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  selection: () => run(() => Haptics.selectionAsync()),
};
