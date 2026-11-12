import React from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ContentKind } from "../lib/qr/parse";
import type { IconName } from "../lib/actions";
import { useTheme } from "../state/AppContext";

export const KIND_ICON: Record<ContentKind, IconName> = {
  url: "globe-outline",
  wifi: "wifi",
  email: "mail-outline",
  phone: "call-outline",
  sms: "chatbubble-ellipses-outline",
  contact: "person-outline",
  geo: "location-outline",
  event: "calendar-outline",
  crypto: "logo-bitcoin",
  otp: "key-outline",
  deeplink: "apps-outline",
  product: "barcode-outline",
  json: "code-slash-outline",
  text: "document-text-outline",
};

// Tintes por tipo (claro / oscuro) — distinguibles sin depender sólo del color
const TINTS: Record<ContentKind, [string, string]> = {
  url: ["#2E5BFF", "#6A8CFF"],
  wifi: ["#0E8A7E", "#3CCFBF"],
  email: ["#C2410C", "#FB923C"],
  phone: ["#15803D", "#4ADE80"],
  sms: ["#15803D", "#4ADE80"],
  contact: ["#7C3AED", "#A78BFA"],
  geo: ["#DC2626", "#F87171"],
  event: ["#B45309", "#FBBF24"],
  crypto: ["#B45309", "#FBBF24"],
  otp: ["#BE185D", "#F472B6"],
  deeplink: ["#4B5563", "#9CA3AF"],
  product: ["#0C0E13", "#E5E7EB"],
  json: ["#4B5563", "#9CA3AF"],
  text: ["#4B5563", "#9CA3AF"],
};

export function kindTint(kind: ContentKind, scheme: "light" | "dark") {
  return TINTS[kind][scheme === "dark" ? 1 : 0];
}

export function KindIcon({ kind, size = 44 }: { kind: ContentKind; size?: number }) {
  const { scheme } = useTheme();
  const tint = kindTint(kind, scheme);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        backgroundColor: tint + (scheme === "dark" ? "26" : "14"),
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name={KIND_ICON[kind]} size={Math.round(size * 0.48)} color={tint} />
    </View>
  );
}
