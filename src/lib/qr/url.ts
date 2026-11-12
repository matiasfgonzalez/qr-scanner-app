/**
 * Parser de URLs propio.
 * El `URL` de React Native está incompleto (hostname, pathname, etc. lanzan
 * "not implemented"), así que parseamos con una gramática acotada a RFC 3986.
 */

export type ParsedUrl = {
  href: string;
  scheme: string; // en minúsculas, sin ":"
  userinfo: string | null;
  host: string; // en minúsculas
  port: number | null;
  path: string;
  query: string;
  fragment: string;
  /** true si el texto original no tenía esquema y lo completamos con https */
  assumedScheme: boolean;
};

// esquema://[userinfo@]host[:puerto][/ruta][?query][#fragmento]
const URL_RE =
  /^([a-z][a-z0-9+.-]*):\/\/(?:([^@/?#\s]*)@)?(\[[0-9a-f:.]+\]|[^:/?#\s]+)(?::(\d{1,5}))?([^?#\s]*)(?:\?([^#\s]*))?(?:#(\S*))?$/i;

const LABEL_RE = /^[a-z0-9\u00a1-\uffff-]{1,63}$/i;
const TLD_RE = /^[a-z\u00a1-\uffff]{2,63}$/i;

/** Dominio "desnudo" tipo www.ejemplo.com/ruta (sin esquema). Validación lineal, sin backtracking. */
function looksLikeBareDomain(text: string): boolean {
  if (text.length > 2048 || /\s/.test(text)) return false;
  const end = text.search(/[/?#]/);
  const authority = end === -1 ? text : text.slice(0, end);
  const [host, port, ...extra] = authority.split(":");
  if (extra.length || (port !== undefined && !/^\d{1,5}$/.test(port))) return false;
  const labels = host.split(".");
  if (labels.length < 2) return false;
  const tld = labels[labels.length - 1];
  return (
    TLD_RE.test(tld) &&
    labels.every((l) => LABEL_RE.test(l) && !l.startsWith("-") && !l.endsWith("-"))
  );
}

export function parseUrl(input: string): ParsedUrl | null {
  const text = input.trim();
  let assumedScheme = false;
  let candidate = text;

  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) {
    if (!looksLikeBareDomain(text)) return null;
    candidate = `https://${text}`;
    assumedScheme = true;
  }

  const m = URL_RE.exec(candidate);
  if (!m) return null;

  const [, scheme, userinfo, host, port, path, query, fragment] = m;
  const portNum = port ? Number(port) : null;
  if (portNum !== null && (portNum < 1 || portNum > 65535)) return null;

  return {
    href: candidate,
    scheme: scheme.toLowerCase(),
    userinfo: userinfo ?? null,
    host: host.toLowerCase().replace(/\.$/, ""),
    port: portNum,
    path: path || "/",
    query: query ?? "",
    fragment: fragment ?? "",
    assumedScheme,
  };
}

// Sufijos de segundo nivel habituales (subset práctico de la Public Suffix List)
const SECOND_LEVEL = new Set([
  "com.ar", "gob.ar", "gov.ar", "org.ar", "net.ar", "edu.ar", "int.ar", "mil.ar", "tur.ar",
  "com.br", "gov.br", "org.br", "net.br", "edu.br",
  "com.mx", "gob.mx", "org.mx", "edu.mx", "net.mx",
  "gob.cl", "co.cl",
  "com.uy", "gub.uy", "org.uy", "edu.uy",
  "com.py", "gov.py", "com.pe", "gob.pe", "com.co", "gov.co", "com.ve", "gob.ve",
  "com.ec", "gob.ec", "com.bo", "gob.bo",
  "co.uk", "org.uk", "gov.uk", "ac.uk",
  "com.au", "gov.au", "org.au", "net.au", "edu.au",
  "co.jp", "or.jp", "ne.jp", "co.nz", "co.za", "com.es", "gob.es", "com.cn", "com.tw",
]);

/** Devuelve el dominio registrable (p. ej. portal.ater.gob.ar → ater.gob.ar). */
export function registrableDomain(host: string): string {
  if (isIpAddress(host)) return host;
  const labels = host.split(".");
  if (labels.length <= 2) return host;
  const lastTwo = labels.slice(-2).join(".");
  if (SECOND_LEVEL.has(lastTwo) && labels.length >= 3) {
    return labels.slice(-3).join(".");
  }
  return lastTwo;
}

export function isIpAddress(host: string): boolean {
  if (/^\[[0-9a-f:.]+\]$/i.test(host)) return true; // IPv6
  const parts = host.split(".");
  if (parts.length !== 4) return false;
  return parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255);
}

export function isPrivateHost(host: string): boolean {
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".localhost")) return true;
  if (/^\[(::1|f[cd][0-9a-f]{2}:|fe80:)/i.test(host)) return true;
  if (!isIpAddress(host)) return false;
  const [a, b] = host.split(".").map(Number);
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

/** Decodifica percent-encoding sin lanzar si la secuencia es inválida. */
export function safeDecode(value: string, plusAsSpace = false): string {
  try {
    return decodeURIComponent(plusAsSpace ? value.replace(/\+/g, " ") : value);
  } catch {
    return value;
  }
}

export function parseQuery(query: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!query) return out;
  for (const pair of query.split("&")) {
    if (!pair) continue;
    const idx = pair.indexOf("=");
    const key = safeDecode(idx === -1 ? pair : pair.slice(0, idx), true).toLowerCase();
    const value = idx === -1 ? "" : safeDecode(pair.slice(idx + 1), true);
    if (!(key in out)) out[key] = value;
  }
  return out;
}
