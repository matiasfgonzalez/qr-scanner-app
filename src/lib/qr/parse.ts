import { parseQuery, parseUrl, ParsedUrl, safeDecode } from "./url";

/**
 * Clasifica el contenido crudo de un código (QR o de barras) en un tipo
 * estructurado. Acepta cualquier origen: no hay listas de dominios permitidos.
 */

export type ContentKind =
  | "url"
  | "wifi"
  | "email"
  | "phone"
  | "sms"
  | "contact"
  | "geo"
  | "event"
  | "crypto"
  | "otp"
  | "deeplink"
  | "product"
  | "json"
  | "text";

export type Field = { label: string; value: string; secret?: boolean; mono?: boolean };

export type WifiData = {
  ssid: string;
  password: string;
  security: "WPA" | "WEP" | "nopass" | "SAE" | string;
  hidden: boolean;
};

export type ContactData = {
  name: string;
  org?: string;
  title?: string;
  phones: string[];
  emails: string[];
  urls: string[];
  address?: string;
  note?: string;
};

export type EventData = {
  summary: string;
  start?: Date;
  end?: Date;
  location?: string;
  description?: string;
};

export type ParsedContent =
  | { kind: "url"; raw: string; url: ParsedUrl }
  | { kind: "wifi"; raw: string; wifi: WifiData }
  | { kind: "email"; raw: string; to: string; subject?: string; body?: string }
  | { kind: "phone"; raw: string; number: string }
  | { kind: "sms"; raw: string; number: string; body?: string }
  | { kind: "contact"; raw: string; contact: ContactData }
  | { kind: "geo"; raw: string; lat: number; lng: number; label?: string }
  | { kind: "event"; raw: string; event: EventData }
  | { kind: "crypto"; raw: string; currency: string; address: string; amount?: string; label?: string }
  | { kind: "otp"; raw: string; issuer?: string; account?: string; otpType: string; secretPresent: boolean }
  | { kind: "deeplink"; raw: string; scheme: string; target: string }
  | { kind: "product"; raw: string; code: string; format: string }
  | { kind: "json"; raw: string; value: unknown }
  | { kind: "text"; raw: string };

export const KIND_LABEL: Record<ContentKind, string> = {
  url: "Enlace",
  wifi: "Red Wi‑Fi",
  email: "Email",
  phone: "Teléfono",
  sms: "SMS",
  contact: "Contacto",
  geo: "Ubicación",
  event: "Evento",
  crypto: "Pago cripto",
  otp: "Autenticación 2FA",
  deeplink: "Enlace a app",
  product: "Producto",
  json: "Datos JSON",
  text: "Texto",
};

// Formatos de código de barras lineales (expo-camera BarcodeType)
const PRODUCT_FORMATS = new Set(["ean13", "ean8", "upc_a", "upc_e", "itf14"]);
const LINEAR_FORMATS = new Set([...PRODUCT_FORMATS, "code39", "code93", "code128", "codabar"]);

export function isLinearBarcode(format?: unknown): boolean {
  return !!format && LINEAR_FORMATS.has(normalizeFormat(format));
}

// Constantes numéricas de ML Kit (Android puede reportar el tipo como número)
const MLKIT_FORMATS: Record<number, string> = {
  1: "code128", 2: "code39", 4: "code93", 8: "codabar", 16: "datamatrix", 32: "ean13",
  64: "ean8", 128: "itf14", 256: "qr", 512: "upc_a", 1024: "upc_e", 2048: "pdf417", 4096: "aztec",
};

export function normalizeFormat(format?: unknown): string {
  if (format === undefined || format === null || format === "") return "qr";
  if (typeof format === "number" || /^\d+$/.test(String(format))) return MLKIT_FORMATS[Number(format)] ?? "qr";
  const f = String(format).toLowerCase().replace(/[^a-z0-9]/g, "");
  // Android/iOS reportan nombres distintos (org.iso.QRCode, 256, "qr"...)
  if (f.includes("qr")) return "qr";
  if (f.includes("ean13")) return "ean13";
  if (f.includes("ean8")) return "ean8";
  if (f.includes("upca")) return "upc_a";
  if (f.includes("upce")) return "upc_e";
  if (f.includes("itf14") || f === "itf") return "itf14";
  if (f.includes("code128")) return "code128";
  if (f.includes("code39")) return "code39";
  if (f.includes("code93")) return "code93";
  if (f.includes("codabar")) return "codabar";
  if (f.includes("datamatrix")) return "datamatrix";
  if (f.includes("pdf417")) return "pdf417";
  if (f.includes("aztec")) return "aztec";
  return f || "qr";
}

export const FORMAT_LABEL: Record<string, string> = {
  qr: "QR",
  ean13: "EAN‑13",
  ean8: "EAN‑8",
  upc_a: "UPC‑A",
  upc_e: "UPC‑E",
  itf14: "ITF‑14",
  code128: "Code 128",
  code39: "Code 39",
  code93: "Code 93",
  codabar: "Codabar",
  datamatrix: "Data Matrix",
  pdf417: "PDF417",
  aztec: "Aztec",
};

// ─────────────────────────────────────────────────────────────
// Helpers de formatos tipo "CLAVE:valor;CLAVE:valor;;" (WIFI, MECARD, MATMSG)
// con escapes \; \, \: \\ \"
// ─────────────────────────────────────────────────────────────
function splitEscaped(body: string, sep: string): string[] {
  const out: string[] = [];
  let current = "";
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === "\\" && i + 1 < body.length) {
      current += body[i + 1];
      i++;
    } else if (ch === sep) {
      out.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current) out.push(current);
  return out;
}

function parseKeyValueRecord(body: string): Record<string, string[]> {
  const rec: Record<string, string[]> = {};
  // Hay que dividir respetando escapes, pero conservar los ":" escapados en el valor.
  const parts: string[] = [];
  let current = "";
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === "\\" && i + 1 < body.length) {
      current += ch + body[i + 1];
      i++;
    } else if (ch === ";") {
      parts.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current) parts.push(current);

  for (const part of parts) {
    const idx = findUnescaped(part, ":");
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim().toUpperCase();
    const value = unescapeValue(part.slice(idx + 1));
    (rec[key] ??= []).push(value);
  }
  return rec;
}

function findUnescaped(text: string, ch: string): number {
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\\") {
      i++;
      continue;
    }
    if (text[i] === ch) return i;
  }
  return -1;
}

function unescapeValue(value: string): string {
  let v = splitEscaped(value, "\u0000").join("");
  // Algunos generadores encierran SSID/clave en comillas
  if (v.length >= 2 && v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
  return v;
}

// ─────────────────────────────────────────────────────────────
// Parsers individuales
// ─────────────────────────────────────────────────────────────
function parseWifi(raw: string): ParsedContent | null {
  if (!/^WIFI:/i.test(raw)) return null;
  const rec = parseKeyValueRecord(raw.slice(5));
  const security = (rec.T?.[0] || "nopass").toUpperCase();
  return {
    kind: "wifi",
    raw,
    wifi: {
      ssid: rec.S?.[0] ?? "",
      password: rec.P?.[0] ?? "",
      security: security === "NOPASS" || security === "" ? "nopass" : security,
      hidden: (rec.H?.[0] || "").toLowerCase() === "true",
    },
  };
}

function parseMailto(raw: string): ParsedContent | null {
  if (/^mailto:/i.test(raw)) {
    const rest = raw.slice(7);
    const [addr, query = ""] = rest.split("?");
    const q = parseQuery(query);
    return { kind: "email", raw, to: safeDecode(addr), subject: q.subject, body: q.body };
  }
  if (/^MATMSG:/i.test(raw)) {
    const rec = parseKeyValueRecord(raw.slice(7));
    return { kind: "email", raw, to: rec.TO?.[0] ?? "", subject: rec.SUB?.[0], body: rec.BODY?.[0] };
  }
  if (/^SMTP:/i.test(raw)) {
    const [, to = "", subject, body] = raw.split(":");
    return { kind: "email", raw, to, subject, body };
  }
  return null;
}

function parsePhone(raw: string): ParsedContent | null {
  const m = /^tel:(.+)$/i.exec(raw);
  if (!m) return null;
  return { kind: "phone", raw, number: safeDecode(m[1]).trim() };
}

function parseSms(raw: string): ParsedContent | null {
  let m = /^smsto:([^:]*)(?::([\s\S]*))?$/i.exec(raw);
  if (m) return { kind: "sms", raw, number: m[1].trim(), body: m[2] };
  m = /^sms:([^?]*)(?:\?(.*))?$/i.exec(raw);
  if (m) {
    const q = parseQuery(m[2] ?? "");
    return { kind: "sms", raw, number: safeDecode(m[1]).trim(), body: q.body };
  }
  return null;
}

function parseGeo(raw: string): ParsedContent | null {
  const m = /^geo:(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:,[-\d.]+)?(?:;[^?]*)?(?:\?(.*))?$/i.exec(raw);
  if (!m) return null;
  const q = parseQuery(m[3] ?? "");
  const label = q.q && !/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(q.q) ? q.q : undefined;
  return { kind: "geo", raw, lat: Number(m[1]), lng: Number(m[2]), label };
}

/** Desdobla líneas plegadas de vCard/iCal (RFC 6350 §3.2). */
function unfold(text: string): string[] {
  return text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "").split("\n").map((l) => l.trim()).filter(Boolean);
}

function vValue(line: string): { key: string; params: string; value: string } {
  const idx = line.indexOf(":");
  if (idx === -1) return { key: line.toUpperCase(), params: "", value: "" };
  const head = line.slice(0, idx);
  const [key, ...params] = head.split(";");
  const value = line
    .slice(idx + 1)
    .replace(/\\n/gi, "\n")
    .replace(/\\([,;\\])/g, "$1");
  // Quitar prefijo de grupo (item1.TEL)
  const cleanKey = key.includes(".") ? key.split(".").pop()! : key;
  return { key: cleanKey.toUpperCase(), params: params.join(";").toUpperCase(), value };
}

function parseVCard(raw: string): ParsedContent | null {
  if (!/^BEGIN:VCARD/i.test(raw)) return null;
  const contact: ContactData = { name: "", phones: [], emails: [], urls: [] };
  let structuredName = "";
  for (const line of unfold(raw)) {
    const { key, value } = vValue(line);
    switch (key) {
      case "FN":
        contact.name = value;
        break;
      case "N": {
        const [last = "", first = "", middle = "", prefix = "", suffix = ""] = value.split(";");
        structuredName = [prefix, first, middle, last, suffix].filter(Boolean).join(" ");
        break;
      }
      case "ORG":
        contact.org = value.replace(/;/g, " · ");
        break;
      case "TITLE":
        contact.title = value;
        break;
      case "TEL":
        if (value) contact.phones.push(value.replace(/^tel:/i, ""));
        break;
      case "EMAIL":
        if (value) contact.emails.push(value);
        break;
      case "URL":
        if (value) contact.urls.push(value);
        break;
      case "ADR":
        contact.address = value.split(";").filter(Boolean).join(", ");
        break;
      case "NOTE":
        contact.note = value;
        break;
    }
  }
  if (!contact.name) contact.name = structuredName;
  return { kind: "contact", raw, contact };
}

function parseMeCard(raw: string): ParsedContent | null {
  if (!/^MECARD:/i.test(raw)) return null;
  const rec = parseKeyValueRecord(raw.slice(7));
  const nameRaw = rec.N?.[0] ?? "";
  // MECARD usa "Apellido,Nombre"
  const name = nameRaw.includes(",") ? nameRaw.split(",").reverse().join(" ").trim() : nameRaw;
  return {
    kind: "contact",
    raw,
    contact: {
      name,
      org: rec.ORG?.[0],
      phones: rec.TEL ?? [],
      emails: rec.EMAIL ?? [],
      urls: rec.URL ?? [],
      address: rec.ADR?.[0],
      note: rec.NOTE?.[0],
    },
  };
}

function parseIcalDate(value: string): Date | undefined {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(value.trim());
  if (!m) return undefined;
  const [, y, mo, d, h = "0", mi = "0", s = "0", z] = m;
  const args = [Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s)] as const;
  const date = z ? new Date(Date.UTC(...args)) : new Date(...args);
  return isNaN(date.getTime()) ? undefined : date;
}

function parseEvent(raw: string): ParsedContent | null {
  if (!/BEGIN:VEVENT/i.test(raw)) return null;
  const event: EventData = { summary: "" };
  let inEvent = false;
  for (const line of unfold(raw)) {
    const { key, value } = vValue(line);
    if (key === "BEGIN" && value.toUpperCase() === "VEVENT") inEvent = true;
    else if (key === "END" && value.toUpperCase() === "VEVENT") inEvent = false;
    if (!inEvent) continue;
    if (key === "SUMMARY") event.summary = value;
    else if (key === "DTSTART") event.start = parseIcalDate(value);
    else if (key === "DTEND") event.end = parseIcalDate(value);
    else if (key === "LOCATION") event.location = value;
    else if (key === "DESCRIPTION") event.description = value;
  }
  return { kind: "event", raw, event };
}

const CRYPTO_SCHEMES: Record<string, string> = {
  bitcoin: "Bitcoin",
  ethereum: "Ethereum",
  litecoin: "Litecoin",
  bitcoincash: "Bitcoin Cash",
  dogecoin: "Dogecoin",
  monero: "Monero",
  solana: "Solana",
  tron: "Tron",
};

function parseCrypto(raw: string): ParsedContent | null {
  const m = /^([a-z]+):(?:\/\/)?([^?]+)(?:\?(.*))?$/i.exec(raw);
  if (!m) return null;
  const scheme = m[1].toLowerCase();
  const currency = CRYPTO_SCHEMES[scheme];
  if (!currency) return null;
  const q = parseQuery(m[3] ?? "");
  return {
    kind: "crypto",
    raw,
    currency,
    address: m[2].split("@")[0],
    amount: q.amount || q.value,
    label: q.label || q.message,
  };
}

function parseOtp(raw: string): ParsedContent | null {
  const m = /^otpauth(?:-migration)?:\/\/([^/]+)\/([^?]*)(?:\?(.*))?$/i.exec(raw);
  if (!m) return null;
  const q = parseQuery(m[3] ?? "");
  const label = safeDecode(m[2]);
  const [labelIssuer, account] = label.includes(":") ? label.split(":") : [undefined, label];
  return {
    kind: "otp",
    raw,
    otpType: m[1].toUpperCase(),
    issuer: q.issuer || labelIssuer,
    account: account?.trim(),
    secretPresent: !!q.secret || !!q.data,
  };
}

function parseDeepLink(raw: string): ParsedContent | null {
  const m = /^([a-z][a-z0-9+.-]*):(\/\/)?(\S*)$/i.exec(raw.trim());
  if (!m) return null;
  const scheme = m[1].toLowerCase();
  if (scheme === "http" || scheme === "https") return null;
  return { kind: "deeplink", raw, scheme, target: m[3] };
}

function parseJson(raw: string): ParsedContent | null {
  const t = raw.trim();
  if (!(t.startsWith("{") && t.endsWith("}")) && !(t.startsWith("[") && t.endsWith("]"))) return null;
  try {
    return { kind: "json", raw, value: JSON.parse(t) };
  } catch {
    return null;
  }
}

function parseProduct(raw: string, format: string): ParsedContent | null {
  const code = raw.trim();
  if (PRODUCT_FORMATS.has(format) || (/^\d{8}$|^\d{12,14}$/.test(code) && format !== "qr")) {
    return { kind: "product", raw, code, format };
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// API pública
// ─────────────────────────────────────────────────────────────
export function parseContent(rawInput: string, barcodeFormat?: unknown): ParsedContent {
  const raw = rawInput ?? "";
  const trimmed = raw.trim();
  const format = normalizeFormat(barcodeFormat);

  if (!trimmed) return { kind: "text", raw };

  // Códigos de barras de producto: el contenido es el número
  const product = parseProduct(trimmed, format);
  if (product) return product;

  const parsers = [
    parseWifi,
    parseMailto,
    parsePhone,
    parseSms,
    parseGeo,
    parseVCard,
    parseMeCard,
    parseEvent,
    parseOtp,
    parseCrypto,
    parseJson,
  ];
  for (const p of parsers) {
    const r = p(trimmed);
    if (r) return r;
  }

  const url = parseUrl(trimmed);
  if (url && (url.scheme === "http" || url.scheme === "https")) {
    return { kind: "url", raw, url };
  }

  // Un email suelto (sin mailto:)
  if (/^[^\s@]+@[^\s@]+\.[a-z]{2,63}$/i.test(trimmed)) {
    return { kind: "email", raw, to: trimmed };
  }

  const deep = parseDeepLink(trimmed);
  if (deep) return deep;

  return { kind: "text", raw };
}

/** Título legible para listas y encabezados. */
export function contentTitle(c: ParsedContent): string {
  switch (c.kind) {
    case "url":
      return c.url.host.replace(/^www\./, "");
    case "wifi":
      return c.wifi.ssid || "Red sin nombre";
    case "email":
      return c.to || c.subject || "Email";
    case "phone":
      return c.number;
    case "sms":
      return c.number || "SMS";
    case "contact":
      return c.contact.name || c.contact.org || c.contact.phones[0] || "Contacto";
    case "geo":
      return c.label || `${c.lat.toFixed(5)}, ${c.lng.toFixed(5)}`;
    case "event":
      return c.event.summary || "Evento";
    case "crypto":
      return `${c.currency}${c.amount ? ` · ${c.amount}` : ""}`;
    case "otp":
      return [c.issuer, c.account].filter(Boolean).join(" · ") || "Código 2FA";
    case "deeplink":
      return `${c.scheme}://`;
    case "product":
      return c.code;
    case "json":
      return "Objeto JSON";
    case "text": {
      const firstLine = c.raw.trim().split("\n")[0];
      return firstLine.length > 80 ? firstLine.slice(0, 80) + "…" : firstLine || "Texto vacío";
    }
  }
}

/** Subtítulo corto que acompaña al título. */
export function contentSubtitle(c: ParsedContent): string {
  switch (c.kind) {
    case "url":
      return c.url.href;
    case "wifi":
      return c.wifi.security === "nopass" ? "Red abierta" : `Seguridad ${c.wifi.security}`;
    case "email":
      return c.subject || "Correo electrónico";
    case "contact":
      return [c.contact.org, c.contact.phones[0], c.contact.emails[0]].filter(Boolean).join(" · ");
    case "event":
      return c.event.start ? c.event.start.toLocaleString() : "Sin fecha";
    case "crypto":
      return c.address;
    case "product":
      return FORMAT_LABEL[c.format] ?? "Código de barras";
    case "text":
      return `${c.raw.length} caracteres`;
    default:
      return KIND_LABEL[c.kind];
  }
}

/** Campos detallados para la pantalla de resultado. */
export function contentFields(c: ParsedContent): Field[] {
  switch (c.kind) {
    case "url": {
      const f: Field[] = [
        { label: "Dominio", value: c.url.host },
        { label: "Protocolo", value: c.url.scheme.toUpperCase() },
      ];
      if (c.url.path && c.url.path !== "/") f.push({ label: "Ruta", value: safeDecode(c.url.path), mono: true });
      if (c.url.query) {
        const params = parseQuery(c.url.query);
        const keys = Object.keys(params);
        f.push({ label: "Parámetros", value: keys.length > 6 ? `${keys.slice(0, 6).join(", ")}…` : keys.join(", "), mono: true });
      }
      return f;
    }
    case "wifi":
      return [
        { label: "Red (SSID)", value: c.wifi.ssid || "—" },
        { label: "Seguridad", value: c.wifi.security === "nopass" ? "Abierta" : c.wifi.security },
        ...(c.wifi.password ? [{ label: "Contraseña", value: c.wifi.password, secret: true, mono: true }] : []),
        ...(c.wifi.hidden ? [{ label: "Oculta", value: "Sí" }] : []),
      ];
    case "email":
      return [
        { label: "Para", value: c.to || "—" },
        ...(c.subject ? [{ label: "Asunto", value: c.subject }] : []),
        ...(c.body ? [{ label: "Mensaje", value: c.body }] : []),
      ];
    case "phone":
      return [{ label: "Número", value: c.number, mono: true }];
    case "sms":
      return [
        { label: "Número", value: c.number || "—", mono: true },
        ...(c.body ? [{ label: "Mensaje", value: c.body }] : []),
      ];
    case "contact": {
      const ct = c.contact;
      return [
        ...(ct.name ? [{ label: "Nombre", value: ct.name }] : []),
        ...(ct.org ? [{ label: "Empresa", value: ct.org }] : []),
        ...(ct.title ? [{ label: "Cargo", value: ct.title }] : []),
        ...ct.phones.map((p) => ({ label: "Teléfono", value: p, mono: true })),
        ...ct.emails.map((e) => ({ label: "Email", value: e })),
        ...ct.urls.map((u) => ({ label: "Web", value: u })),
        ...(ct.address ? [{ label: "Dirección", value: ct.address }] : []),
        ...(ct.note ? [{ label: "Nota", value: ct.note }] : []),
      ];
    }
    case "geo":
      return [
        { label: "Latitud", value: c.lat.toFixed(6), mono: true },
        { label: "Longitud", value: c.lng.toFixed(6), mono: true },
        ...(c.label ? [{ label: "Lugar", value: c.label }] : []),
      ];
    case "event":
      return [
        { label: "Título", value: c.event.summary || "—" },
        ...(c.event.start ? [{ label: "Inicio", value: c.event.start.toLocaleString() }] : []),
        ...(c.event.end ? [{ label: "Fin", value: c.event.end.toLocaleString() }] : []),
        ...(c.event.location ? [{ label: "Lugar", value: c.event.location }] : []),
        ...(c.event.description ? [{ label: "Detalle", value: c.event.description }] : []),
      ];
    case "crypto":
      return [
        { label: "Moneda", value: c.currency },
        { label: "Dirección", value: c.address, mono: true },
        ...(c.amount ? [{ label: "Monto", value: c.amount, mono: true }] : []),
        ...(c.label ? [{ label: "Concepto", value: c.label }] : []),
      ];
    case "otp":
      return [
        { label: "Tipo", value: c.otpType },
        ...(c.issuer ? [{ label: "Servicio", value: c.issuer }] : []),
        ...(c.account ? [{ label: "Cuenta", value: c.account }] : []),
      ];
    case "deeplink":
      return [
        { label: "Esquema", value: `${c.scheme}://`, mono: true },
        ...(c.target ? [{ label: "Destino", value: c.target, mono: true }] : []),
      ];
    case "product":
      return [
        { label: "Código", value: c.code, mono: true },
        { label: "Formato", value: FORMAT_LABEL[c.format] ?? c.format },
      ];
    default:
      return [];
  }
}
