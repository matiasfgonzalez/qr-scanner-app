import { Alert, Linking, Platform, Share } from "react-native";
import * as Clipboard from "expo-clipboard";
import * as WebBrowser from "expo-web-browser";
import type { ComponentProps } from "react";
import type { Ionicons } from "@expo/vector-icons";
import { ParsedContent } from "./qr/parse";
import { Verdict } from "./qr/analyze";
import { Settings } from "./storage";
import { haptic } from "./haptics";

export type IconName = ComponentProps<typeof Ionicons>["name"];

export type ContentAction = {
  id: string;
  label: string;
  icon: IconName;
  primary?: boolean;
  run: () => Promise<void> | void;
};

type Ctx = {
  content: ParsedContent;
  verdict: Verdict;
  settings: Settings;
  /** feedback no bloqueante (toast) */
  notify: (message: string) => void;
};

export async function copyText(text: string, notify: Ctx["notify"], label = "Copiado") {
  await Clipboard.setStringAsync(text);
  haptic.light();
  notify(label);
}

function confirm(title: string, message: string, cta: string, destructive = false): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: "Cancelar", style: "cancel", onPress: () => resolve(false) },
        { text: cta, style: destructive ? "destructive" : "default", onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}

async function openExternal(url: string) {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert("No se pudo abrir", "No hay ninguna app instalada que pueda abrir este contenido.");
  }
}

/** Abre una URL respetando el veredicto de seguridad y los ajustes. */
export async function openUrlSafely(href: string, verdict: Verdict, settings: Settings) {
  if (verdict.blocked) {
    haptic.error();
    Alert.alert("Bloqueado", "Este contenido puede ser malicioso y no se abrirá.");
    return;
  }
  if (verdict.level === "danger") {
    const reasons = verdict.checks
      .filter((c) => c.level === "danger")
      .map((c) => `• ${c.title}`)
      .join("\n");
    haptic.warning();
    const ok = await confirm("Enlace peligroso", `${reasons}\n\n${href}\n\n¿Abrirlo de todas formas?`, "Abrir igual", true);
    if (!ok) return;
  } else if (settings.confirmOpen || verdict.level === "warning") {
    const note = verdict.level === "warning" ? `\n\n⚠︎ ${verdict.summary}` : "";
    const ok = await confirm("¿Abrir enlace?", `${href}${note}`, "Abrir");
    if (!ok) return;
  }

  if (settings.inAppBrowser) {
    try {
      await WebBrowser.openBrowserAsync(href, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
        enableBarCollapsing: true,
        showTitle: true,
      });
      return;
    } catch {
      // cae al navegador externo
    }
  }
  await openExternal(href);
}

/**
 * Sigue redirecciones para revelar el destino real de un enlace acortado.
 * Lo dispara el usuario (contacta al servidor).
 */
export async function resolveFinalUrl(href: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    let res = await fetch(href, { method: "HEAD", redirect: "follow", signal: controller.signal });
    if (res.status === 405 || res.status === 403) {
      res = await fetch(href, { method: "GET", redirect: "follow", signal: controller.signal });
    }
    return res.url || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function mapsUrl(lat: number, lng: number, label?: string) {
  const q = encodeURIComponent(label ?? `${lat},${lng}`);
  if (Platform.OS === "ios") return `http://maps.apple.com/?ll=${lat},${lng}&q=${q}`;
  return `geo:${lat},${lng}?q=${lat},${lng}(${q})`;
}

export function buildActions({ content: c, verdict, settings, notify }: Ctx): ContentAction[] {
  const copyRaw: ContentAction = {
    id: "copy",
    label: "Copiar",
    icon: "copy-outline",
    run: () => copyText(c.raw, notify, "Contenido copiado"),
  };
  const share: ContentAction = {
    id: "share",
    label: "Compartir",
    icon: "share-outline",
    run: async () => {
      await Share.share({ message: c.raw });
    },
  };

  switch (c.kind) {
    case "url":
      return [
        { id: "open", label: "Abrir enlace", icon: "open-outline", primary: true, run: () => openUrlSafely(c.url.href, verdict, settings) },
        copyRaw,
        share,
      ];

    case "wifi": {
      const actions: ContentAction[] = [];
      if (c.wifi.password) {
        actions.push({
          id: "copy-pass",
          label: "Copiar contraseña",
          icon: "key-outline",
          primary: true,
          run: () => copyText(c.wifi.password, notify, "Contraseña copiada"),
        });
      }
      actions.push({
        id: "wifi-settings",
        label: "Ajustes de Wi‑Fi",
        icon: "wifi-outline",
        primary: !c.wifi.password,
        run: async () => {
          if (Platform.OS === "android") {
            try {
              await Linking.sendIntent("android.settings.WIFI_SETTINGS");
              return;
            } catch {
              /* sigue */
            }
          }
          await Linking.openSettings();
        },
      });
      actions.push(share);
      return actions;
    }

    case "email": {
      const params = [c.subject && `subject=${encodeURIComponent(c.subject)}`, c.body && `body=${encodeURIComponent(c.body)}`]
        .filter(Boolean)
        .join("&");
      return [
        { id: "mail", label: "Escribir email", icon: "mail-outline", primary: true, run: () => openExternal(`mailto:${c.to}${params ? `?${params}` : ""}`) },
        { id: "copy-mail", label: "Copiar dirección", icon: "copy-outline", run: () => copyText(c.to, notify, "Email copiado") },
        share,
      ];
    }

    case "phone":
      return [
        { id: "call", label: "Llamar", icon: "call-outline", primary: true, run: () => openExternal(`tel:${c.number}`) },
        { id: "copy-num", label: "Copiar número", icon: "copy-outline", run: () => copyText(c.number, notify, "Número copiado") },
        share,
      ];

    case "sms": {
      const sep = Platform.OS === "ios" ? "&" : "?";
      const body = c.body ? `${sep}body=${encodeURIComponent(c.body)}` : "";
      return [
        { id: "sms", label: "Enviar SMS", icon: "chatbubble-outline", primary: true, run: () => openExternal(`sms:${c.number}${body}`) },
        copyRaw,
        share,
      ];
    }

    case "contact": {
      const ct = c.contact;
      const actions: ContentAction[] = [];
      if (ct.phones[0]) actions.push({ id: "call", label: "Llamar", icon: "call-outline", primary: true, run: () => openExternal(`tel:${ct.phones[0]}`) });
      if (ct.emails[0]) actions.push({ id: "mail", label: "Email", icon: "mail-outline", primary: !ct.phones[0], run: () => openExternal(`mailto:${ct.emails[0]}`) });
      actions.push({ id: "share-card", label: "Compartir contacto", icon: "person-add-outline", run: share.run });
      actions.push(copyRaw);
      return actions;
    }

    case "geo":
      return [
        { id: "maps", label: "Abrir en mapas", icon: "navigate-outline", primary: true, run: () => openExternal(mapsUrl(c.lat, c.lng, c.label)) },
        { id: "copy-coords", label: "Copiar coordenadas", icon: "copy-outline", run: () => copyText(`${c.lat}, ${c.lng}`, notify, "Coordenadas copiadas") },
        share,
      ];

    case "crypto":
      return [
        { id: "copy-addr", label: "Copiar dirección", icon: "wallet-outline", primary: true, run: () => copyText(c.address, notify, "Dirección copiada") },
        {
          id: "open-wallet",
          label: "Abrir billetera",
          icon: "open-outline",
          run: async () => {
            const ok = await confirm("Abrir billetera", "Revisá la dirección y el monto en tu billetera antes de confirmar. Los pagos no se pueden revertir.", "Continuar");
            if (ok) await openExternal(c.raw);
          },
        },
        copyRaw,
      ];

    case "otp":
      return [
        {
          id: "open-auth",
          label: "Abrir en autenticador",
          icon: "shield-checkmark-outline",
          primary: true,
          run: () => openExternal(c.raw),
        },
      ];

    case "deeplink":
      return verdict.blocked
        ? [copyRaw]
        : [
            {
              id: "open-app",
              label: "Abrir app",
              icon: "apps-outline",
              primary: true,
              run: async () => {
                const ok = await confirm("Abrir otra app", `Se abrirá la app asociada a “${c.scheme}://”.`, "Abrir");
                if (ok) await openExternal(c.raw);
              },
            },
            copyRaw,
          ];

    case "product":
      return [
        {
          id: "search",
          label: "Buscar producto",
          icon: "search-outline",
          primary: true,
          run: () => openUrlSafely(`https://www.google.com/search?q=${encodeURIComponent(c.code)}`, { ...verdict, level: "safe", blocked: false }, { ...settings, confirmOpen: false }),
        },
        copyRaw,
        share,
      ];

    case "event":
    case "json":
    case "text":
    default:
      return [
        { ...copyRaw, primary: true },
        share,
        {
          id: "search",
          label: "Buscar en la web",
          icon: "search-outline",
          run: () =>
            openUrlSafely(
              `https://www.google.com/search?q=${encodeURIComponent(c.raw.slice(0, 500))}`,
              { ...verdict, level: "safe", blocked: false },
              { ...settings, confirmOpen: false }
            ),
        },
      ];
  }
}
