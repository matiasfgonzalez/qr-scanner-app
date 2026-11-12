import { Platform } from "react-native";
import type { Level } from "../lib/qr/analyze";

/**
 * Sistema de diseño: tokens únicos para toda la app, con variante clara y oscura.
 * Escala de espaciado de 4pt, radios suaves y una sola tinta de acento.
 */

export type Palette = {
  bg: string;
  surface: string;
  surfaceAlt: string;
  elevated: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textFaint: string;
  accent: string;
  accentPressed: string;
  accentSoft: string;
  onAccent: string;
  safe: string;
  safeSoft: string;
  info: string;
  infoSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  star: string;
  overlay: string;
  scrim: string;
  skeleton: string;
  skeletonHighlight: string;
};

const light: Palette = {
  bg: "#F4F5F7",
  surface: "#FFFFFF",
  surfaceAlt: "#EEF0F3",
  elevated: "#FFFFFF",
  border: "#E3E6EB",
  borderStrong: "#CDD2DA",
  text: "#0C0E13",
  textMuted: "#565D6B",
  textFaint: "#8B93A1",
  accent: "#2E5BFF",
  accentPressed: "#2448D1",
  accentSoft: "#E8EDFF",
  onAccent: "#FFFFFF",
  safe: "#12844A",
  safeSoft: "#E3F5EA",
  info: "#2E5BFF",
  infoSoft: "#E8EDFF",
  warning: "#B45309",
  warningSoft: "#FDF1DE",
  danger: "#D12C2C",
  dangerSoft: "#FCE6E6",
  star: "#E9A100",
  overlay: "rgba(12,14,19,0.45)",
  scrim: "rgba(5,6,9,0.62)",
  skeleton: "#E6E8EC",
  skeletonHighlight: "rgba(255,255,255,0.7)",
};

const dark: Palette = {
  bg: "#0A0B0E",
  surface: "#14161B",
  surfaceAlt: "#1C1F26",
  elevated: "#1E2129",
  border: "#252932",
  borderStrong: "#353A45",
  text: "#F1F3F7",
  textMuted: "#A2AAB8",
  textFaint: "#6D7584",
  accent: "#6A8CFF",
  accentPressed: "#5576F0",
  accentSoft: "#1B2340",
  onAccent: "#FFFFFF",
  safe: "#3DD68C",
  safeSoft: "#11281D",
  info: "#6A8CFF",
  infoSoft: "#1B2340",
  warning: "#F5B94A",
  warningSoft: "#2E2211",
  danger: "#FF6B6B",
  dangerSoft: "#341617",
  star: "#F5C04A",
  overlay: "rgba(0,0,0,0.6)",
  scrim: "rgba(0,0,0,0.62)",
  skeleton: "#1C1F26",
  skeletonHighlight: "rgba(255,255,255,0.06)",
};

export const palettes = { light, dark };

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, xl: 22, full: 999 } as const;

export const font = {
  mono: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
  size: { xs: 12, sm: 13, md: 15, lg: 17, xl: 20, xxl: 26, display: 32 },
  weight: { regular: "400", medium: "500", semibold: "600", bold: "700", heavy: "800" },
} as const;

export function levelColors(p: Palette, level: Level) {
  switch (level) {
    case "danger":
      return { fg: p.danger, bg: p.dangerSoft };
    case "warning":
      return { fg: p.warning, bg: p.warningSoft };
    case "info":
      return { fg: p.info, bg: p.infoSoft };
    default:
      return { fg: p.safe, bg: p.safeSoft };
  }
}

export function shadow(p: Palette, scheme: "light" | "dark", depth: 1 | 2 = 1) {
  if (scheme === "dark") return { borderWidth: 1, borderColor: p.border };
  return Platform.select({
    ios: {
      shadowColor: "#0C0E13",
      shadowOpacity: depth === 1 ? 0.06 : 0.12,
      shadowRadius: depth === 1 ? 8 : 18,
      shadowOffset: { width: 0, height: depth === 1 ? 2 : 8 },
    },
    default: { elevation: depth === 1 ? 1 : 4 },
  })!;
}

// Easing de Emil Kowalski (ver skill animate-expo)
export const EASE_OUT = [0.23, 1, 0.32, 1] as const;
export const EASE_IN_OUT = [0.77, 0, 0.175, 1] as const;
