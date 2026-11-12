import { ParsedContent } from "./parse";
import { isIpAddress, isPrivateHost, ParsedUrl, registrableDomain, safeDecode } from "./url";

/**
 * Validación de seguridad y formato del contenido escaneado.
 * Reemplaza la vieja lista blanca de dominios ATER: ahora se acepta todo y
 * cada código se evalúa por sus propias señales.
 */

export type Level = "safe" | "info" | "warning" | "danger";

export type Check = {
  id: string;
  level: Level;
  title: string;
  detail: string;
};

export type Verdict = {
  level: Level;
  label: string;
  summary: string;
  checks: Check[];
  /** Si true, la app no debe abrir el contenido (p. ej. javascript:). */
  blocked: boolean;
};

const RANK: Record<Level, number> = { safe: 0, info: 1, warning: 2, danger: 3 };

const SHORTENERS = new Set([
  "bit.ly", "bitly.com", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly",
  "cutt.ly", "rebrand.ly", "shorturl.at", "tiny.cc", "rb.gy", "s.id", "t.ly", "v.gd",
  "qrco.de", "qr.codes", "l.ead.me", "linktr.ee", "short.io", "bl.ink", "lnkd.in",
  "surl.li", "u.to", "clck.ru", "shorturl.asia", "tinu.be", "me-qr.com", "qr1.be",
]);

// TLDs con alta tasa de abuso o confundibles con extensiones de archivo
const RISKY_TLDS = new Set([
  "zip", "mov", "tk", "ml", "ga", "cf", "gq", "top", "click", "rest", "cyou", "sbs",
  "icu", "buzz", "xin", "loan", "work", "country", "kim", "support", "bond", "cfd",
]);

const TLD_LIKE_LABELS = new Set(["com", "net", "org", "gob", "gov", "edu", "mil", "bank"]);

const PHISHING_WORDS = [
  "login", "signin", "sign-in", "verify", "verificar", "verification", "account", "cuenta",
  "secure", "seguro", "update", "actualizar", "password", "contrasena", "wallet",
  "banco", "bank", "homebanking", "suspend", "unlock", "confirm", "token", "clave",
];

// Marcas muy suplantadas en phishing regional
const BRANDS = [
  "paypal", "mercadopago", "mercadolibre", "galicia", "santander", "bbva", "macro",
  "nacion", "bancoprovincia", "afip", "arca", "anses", "netflix", "apple", "icloud",
  "google", "microsoft", "outlook", "whatsapp", "instagram", "facebook", "binance",
  "amazon", "uala", "naranjax", "brubank",
];

const DANGEROUS_SCHEMES = new Set(["javascript", "data", "vbscript", "file", "blob", "about", "content", "intent"]);

function mk(id: string, level: Level, title: string, detail: string): Check {
  return { id, level, title, detail };
}

// ─────────────────────────────────────────────────────────────
// URL
// ─────────────────────────────────────────────────────────────
export function analyzeUrl(url: ParsedUrl): Check[] {
  const checks: Check[] = [];
  const host = url.host;
  const labels = host.split(".");
  const tld = labels[labels.length - 1];
  const domain = registrableDomain(host);
  const decodedHref = safeDecode(url.href).toLowerCase();

  // Protocolo
  if (url.scheme === "https") {
    checks.push(mk("https", "safe", "Conexión cifrada (HTTPS)", "Los datos viajan cifrados entre tu teléfono y el sitio."));
  } else {
    checks.push(mk("http", "warning", "Conexión sin cifrar (HTTP)", "Cualquiera en la red podría ver o alterar lo que envíes. No ingreses contraseñas ni datos personales."));
  }
  if (url.assumedScheme) {
    checks.push(mk("scheme", "info", "Sin protocolo", "El código no indicaba http/https; se abrirá con HTTPS."));
  }

  // Credenciales embebidas: https://banco.com@malicioso.com
  if (url.userinfo !== null) {
    checks.push(mk("userinfo", "danger", "Dirección engañosa con “@”", `Todo lo que está antes de “@” se ignora: el sitio real es ${host}. Es un truco clásico de phishing.`));
  }

  // Host
  if (isIpAddress(host)) {
    checks.push(
      isPrivateHost(host)
        ? mk("ip-private", "info", "Dirección de red local", "Apunta a un equipo de tu red (router, impresora, servidor interno).")
        : mk("ip", "warning", "Usa una IP en lugar de un dominio", "Los sitios legítimos casi siempre usan un nombre de dominio. Desconfiá si te pide datos.")
    );
  } else if (isPrivateHost(host)) {
    checks.push(mk("local", "info", "Dirección local", "Apunta a un equipo de tu red local."));
  } else {
    if (!/^[a-z¡-￿]{2,63}$/i.test(tld) && !/^xn--[a-z0-9-]+$/.test(tld)) {
      checks.push(mk("tld-invalid", "danger", "Dominio inválido", `“.${tld}” no es una extensión de dominio válida.`));
    }
    if (labels.some((l) => l.length > 63 || l.startsWith("-") || l.endsWith("-") || l === "")) {
      checks.push(mk("label-invalid", "danger", "Dominio mal formado", "El nombre del sitio no cumple el formato de un dominio real."));
    }
    if (host.includes("%")) {
      checks.push(mk("host-encoded", "danger", "Dominio codificado", "El nombre del sitio está ofuscado con caracteres codificados."));
    }

    // Homógrafos / IDN
    const hasPunycode = labels.some((l) => l.startsWith("xn--"));
    const hasNonAscii = /[^\x00-\x7f]/.test(host);
    if (hasPunycode || hasNonAscii) {
      const mixed = hasNonAscii && /[a-z]/.test(host) && /[\u0400-\u04ff\u0370-\u03ff]/.test(host);
      checks.push(
        mk(
          "idn",
          mixed ? "danger" : "warning",
          mixed ? "Letras de otro alfabeto mezcladas" : "Dominio internacional (IDN)",
          mixed
            ? "Mezcla letras latinas con cirílicas/griegas que se ven idénticas. Típico de sitios que imitan a otros."
            : "Contiene caracteres especiales que pueden imitar a un sitio conocido. Revisá el nombre con cuidado."
        )
      );
    }

    if (RISKY_TLDS.has(tld)) {
      checks.push(mk("tld-risky", "warning", `Extensión “.${tld}” poco confiable`, "Esta extensión se usa con frecuencia en estafas o se confunde con nombres de archivo."));
    }

    // paypal.com.cuenta-segura.xyz → "com" en medio del dominio
    const sub = labels.slice(0, -domain.split(".").length);
    if (sub.some((l) => TLD_LIKE_LABELS.has(l))) {
      checks.push(mk("nested-tld", "danger", "Dominio que imita a otro", `Parece “${sub.join(".")}”, pero el sitio real es ${domain}.`));
    }

    // Marca conocida fuera del dominio registrable
    const domainCore = domain.split(".")[0];
    const brandInSub = BRANDS.find((b) => sub.join(".").includes(b) && !domainCore.includes(b));
    const brandLookalike = BRANDS.find((b) => domainCore !== b && domainCore.includes(b) && domainCore.length > b.length);
    if (brandInSub) {
      checks.push(mk("brand-sub", "danger", `Usa el nombre “${brandInSub}” sin ser su sitio`, `El dominio real es ${domain}. Las marcas legítimas usan su propio dominio.`));
    } else if (brandLookalike) {
      checks.push(mk("brand-like", "warning", `Nombre parecido a “${brandLookalike}”`, `El dominio ${domain} contiene una marca conocida. Verificá que sea el sitio oficial.`));
    }

    if (labels.length > 5) {
      checks.push(mk("deep-sub", "warning", "Demasiados subdominios", "Las direcciones muy largas suelen esconder el dominio real."));
    }

    if (SHORTENERS.has(host) || SHORTENERS.has(domain)) {
      checks.push(mk("shortener", "warning", "Enlace acortado", "El destino real está oculto. Usá “Ver destino real” antes de abrirlo."));
    }

    if (/\.(gob|gov|gub|mil)(\.[a-z]{2})?$/.test(host) || tld === "gov" || tld === "mil") {
      checks.push(mk("gov", "safe", "Dominio gubernamental", `${domain} pertenece a un organismo público.`));
    }
  }

  if (url.port !== null && url.port !== 80 && url.port !== 443) {
    checks.push(mk("port", "info", `Puerto no estándar (${url.port})`, "Poco común en sitios públicos. Puede ser un servicio interno o de prueba."));
  }

  const words = PHISHING_WORDS.filter((w) => decodedHref.includes(w));
  if (words.length >= 2 || (words.length >= 1 && url.scheme !== "https")) {
    checks.push(mk("keywords", "warning", "Pide acciones sensibles", `La dirección contiene “${words.slice(0, 3).join("”, “")}”. Si te pide claves o datos bancarios, no los ingreses.`));
  }

  if (/\.(apk|exe|msi|bat|scr|dmg|pkg|ipa|jar|cmd|ps1|vbs)(\?|#|$)/i.test(url.path)) {
    checks.push(mk("download", "danger", "Descarga un archivo ejecutable", "Instalar apps fuera de las tiendas oficiales es la forma más común de infectar un teléfono."));
  }

  if (/(redirect|redir|url|next|return|goto|dest|target)=https?(:|%3a)/i.test(url.query)) {
    checks.push(mk("redirect", "warning", "Redirige a otro sitio", "El enlace incluye otra dirección como parámetro y puede llevarte a un sitio distinto."));
  }

  if (url.href.length > 2000) {
    checks.push(mk("long", "info", "Dirección muy larga", `${url.href.length} caracteres. Puede contener datos de seguimiento.`));
  }

  return checks;
}

// ─────────────────────────────────────────────────────────────
// Checksums de códigos de barras (GS1)
// ─────────────────────────────────────────────────────────────
export function gs1ChecksumValid(code: string): boolean {
  if (!/^\d+$/.test(code)) return false;
  const digits = code.split("").map(Number);
  const check = digits.pop()!;
  const sum = digits
    .reverse()
    .reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

function expandUpcE(code: string): string | null {
  if (!/^[01]\d{7}$/.test(code)) return null;
  const [ns, d1, d2, d3, d4, d5, d6, check] = code.split("");
  let body: string;
  if ("012".includes(d6)) body = `${d1}${d2}${d6}0000${d3}${d4}${d5}`;
  else if (d6 === "3") body = `${d1}${d2}${d3}00000${d4}${d5}`;
  else if (d6 === "4") body = `${d1}${d2}${d3}${d4}00000${d5}`;
  else body = `${d1}${d2}${d3}${d4}${d5}0000${d6}`;
  return `${ns}${body}${check}`;
}

const GS1_PREFIX_COUNTRY: [number, number, string][] = [
  [0, 139, "EE.UU. / Canadá"], [300, 379, "Francia"], [400, 440, "Alemania"], [450, 459, "Japón"],
  [490, 499, "Japón"], [500, 509, "Reino Unido"], [690, 699, "China"], [740, 745, "Centroamérica"],
  [750, 750, "México"], [759, 759, "Venezuela"], [770, 771, "Colombia"], [773, 773, "Uruguay"],
  [775, 775, "Perú"], [777, 777, "Bolivia"], [778, 779, "Argentina"], [780, 780, "Chile"],
  [784, 784, "Paraguay"], [786, 786, "Ecuador"], [789, 790, "Brasil"], [800, 839, "Italia"],
  [840, 849, "España"], [870, 879, "Países Bajos"], [880, 880, "Corea del Sur"], [890, 890, "India"],
  [930, 939, "Australia"],
];

export function gs1Country(code: string): string | null {
  if (code.length !== 13) return null;
  const p = Number(code.slice(0, 3));
  return GS1_PREFIX_COUNTRY.find(([a, b]) => p >= a && p <= b)?.[2] ?? null;
}

// ─────────────────────────────────────────────────────────────
// Análisis por tipo
// ─────────────────────────────────────────────────────────────
function isValidEmail(addr: string): boolean {
  return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z]{2,63}$/i.test(addr.trim());
}

function phoneDigits(n: string): string {
  return n.replace(/[^\d]/g, "");
}

export function analyzeContent(c: ParsedContent): Verdict {
  const checks: Check[] = [];
  let blocked = false;

  switch (c.kind) {
    case "url":
      checks.push(...analyzeUrl(c.url));
      break;

    case "wifi": {
      const { ssid, password, security } = c.wifi;
      if (!ssid) checks.push(mk("ssid", "danger", "Falta el nombre de la red", "El código no indica a qué red conectarse."));
      if (security === "nopass") {
        checks.push(mk("open", "warning", "Red abierta", "Sin contraseña: cualquiera conectado puede ver tu tráfico no cifrado."));
      } else if (security === "WEP") {
        checks.push(mk("wep", "warning", "Seguridad WEP obsoleta", "WEP se rompe en minutos. Evitá enviar datos sensibles por esta red."));
      } else if (/WPA|SAE/.test(security)) {
        if (password.length < 8 || password.length > 63) {
          checks.push(mk("psk", "danger", "Contraseña inválida para WPA", "Las claves WPA deben tener entre 8 y 63 caracteres; la conexión va a fallar."));
        } else {
          checks.push(mk("wpa", "safe", `Red protegida (${security})`, "La conexión está cifrada."));
        }
      }
      break;
    }

    case "email":
      if (!c.to) checks.push(mk("to", "warning", "Sin destinatario", "El correo no tiene dirección de destino."));
      else if (!isValidEmail(c.to.split(",")[0])) checks.push(mk("email", "danger", "Dirección inválida", `“${c.to}” no es un email válido.`));
      else checks.push(mk("email-ok", "safe", "Dirección válida", "El formato del correo es correcto."));
      break;

    case "phone":
    case "sms": {
      const digits = phoneDigits(c.number);
      if (digits.length < 3 || digits.length > 15) {
        checks.push(mk("phone", "danger", "Número inválido", "Un teléfono debe tener entre 3 y 15 dígitos."));
      } else {
        checks.push(mk("phone-ok", "safe", "Número con formato válido", c.number.startsWith("+") ? "Incluye código de país." : "Sin código de país: se marcará como número local."));
      }
      // Tarifa especial: 0600/0609 en Argentina, 1‑900 en NANP
      if (/^(54)?0?60[09]\d{6,}$/.test(digits) || /^1900\d{7}$/.test(digits)) {
        checks.push(mk("premium", "warning", "Posible número de tarifa especial", "Llamar o enviar SMS puede tener un costo elevado."));
      }
      if (c.kind === "sms") checks.push(mk("sms", "info", "Se enviará un SMS", "Revisá el mensaje antes de enviarlo; puede tener costo."));
      break;
    }

    case "contact":
      if (!c.contact.name && c.contact.phones.length === 0 && c.contact.emails.length === 0) {
        checks.push(mk("empty", "warning", "Contacto incompleto", "No tiene nombre, teléfono ni email."));
      } else {
        checks.push(mk("contact-ok", "safe", "Tarjeta de contacto válida", `${c.contact.phones.length} teléfono(s), ${c.contact.emails.length} email(s).`));
      }
      c.contact.emails.filter((e) => !isValidEmail(e)).forEach((e, i) => checks.push(mk(`bad-email-${i}`, "warning", "Email inválido", e)));
      break;

    case "geo":
      if (Math.abs(c.lat) > 90 || Math.abs(c.lng) > 180) {
        checks.push(mk("geo", "danger", "Coordenadas fuera de rango", "Latitud debe estar entre ±90 y longitud entre ±180."));
      } else {
        checks.push(mk("geo-ok", "safe", "Coordenadas válidas", "Se pueden abrir en tu app de mapas."));
      }
      break;

    case "event":
      if (!c.event.start) checks.push(mk("start", "warning", "Sin fecha de inicio", "El evento no indica cuándo empieza."));
      else if (c.event.end && c.event.end < c.event.start) checks.push(mk("range", "warning", "Fechas inconsistentes", "Termina antes de empezar."));
      else checks.push(mk("event-ok", "safe", "Evento válido", c.event.start.toLocaleString()));
      break;

    case "crypto": {
      const a = c.address;
      const btcOk = /^(bc1[02-9ac-hj-np-z]{11,71}|[13][1-9A-HJ-NP-Za-km-z]{25,34})$/.test(a);
      const ethOk = /^0x[0-9a-fA-F]{40}$/.test(a);
      const looksValid = c.currency === "Bitcoin" ? btcOk : c.currency === "Ethereum" ? ethOk : a.length >= 20;
      checks.push(
        looksValid
          ? mk("addr", "info", "Dirección con formato válido", "El formato es correcto, pero eso no garantiza a quién pertenece.")
          : mk("addr-bad", "danger", "Dirección con formato inválido", "No coincide con el formato de esta moneda. No envíes fondos.")
      );
      checks.push(mk("irreversible", "warning", "Los pagos cripto son irreversibles", "Confirmá la dirección con el destinatario por otro medio antes de pagar."));
      break;
    }

    case "otp":
      checks.push(mk("otp", "warning", "Contiene una clave de 2FA", "Sólo escanealo con tu app autenticadora. Quien tenga este código puede generar tus códigos de acceso."));
      if (!c.secretPresent) checks.push(mk("otp-secret", "danger", "Falta el secreto", "El código no incluye la clave necesaria; no va a funcionar."));
      break;

    case "deeplink":
      if (DANGEROUS_SCHEMES.has(c.scheme)) {
        blocked = true;
        checks.push(mk("scheme-danger", "danger", `Esquema “${c.scheme}:” bloqueado`, "Puede ejecutar código o acceder a archivos. La app no lo va a abrir."));
      } else {
        checks.push(mk("deeplink", "warning", "Abre otra aplicación", `Intentará abrir una app que maneje “${c.scheme}://”. Asegurate de reconocerla.`));
      }
      break;

    case "product": {
      const code = c.code;
      let valid: boolean | null = null;
      if (/^\d{13}$/.test(code) || /^\d{8}$/.test(code) || /^\d{12}$/.test(code) || /^\d{14}$/.test(code)) {
        valid = gs1ChecksumValid(code);
        if (!valid && c.format === "upc_e") {
          const expanded = expandUpcE(code);
          valid = expanded ? gs1ChecksumValid(expanded) : false;
        }
      }
      if (valid === true) {
        const country = gs1Country(code);
        checks.push(mk("checksum", "safe", "Dígito de control correcto", country ? `Código registrado en ${country} (prefijo GS1).` : "El código es consistente."));
      } else if (valid === false) {
        checks.push(mk("checksum-bad", "danger", "Dígito de control incorrecto", "El número no es un código de producto válido o se leyó mal. Volvé a escanear."));
      } else {
        checks.push(mk("format", "info", "Código de barras", "Formato sin dígito de control verificable."));
      }
      break;
    }

    case "json":
      checks.push(mk("json", "safe", "JSON válido", "El contenido es un objeto de datos bien formado."));
      break;

    case "text": {
      const t = c.raw;
      if (/[\u202a-\u202e\u2066-\u2069]/.test(t)) {
        checks.push(mk("bidi", "warning", "Caracteres de dirección ocultos", "Contiene caracteres invisibles que pueden alterar cómo se lee el texto."));
      }
      if (/[\u0000-\u0008\u000e-\u001f]/.test(t)) {
        checks.push(mk("control", "info", "Caracteres de control", "Contiene bytes no imprimibles; puede ser un dato binario."));
      }
      const embedded = t.match(/https?:\/\/\S+/gi);
      if (embedded?.length) {
        checks.push(mk("embedded-url", "info", "Contiene enlaces", `${embedded.length} enlace(s) dentro del texto. Revisalos antes de abrir.`));
      }
      if (checks.length === 0) checks.push(mk("text", "safe", "Texto plano", "No ejecuta ninguna acción por sí mismo."));
      break;
    }
  }

  return buildVerdict(checks, blocked);
}

function buildVerdict(checks: Check[], blocked: boolean): Verdict {
  const sorted = [...checks].sort((a, b) => RANK[b.level] - RANK[a.level]);
  const worst = sorted[0]?.level ?? "safe";
  const level: Level = blocked ? "danger" : worst === "info" ? "safe" : worst;
  const issues = sorted.filter((ch) => ch.level === "warning" || ch.level === "danger").length;

  const label = level === "danger" ? "Peligroso" : level === "warning" ? "Precaución" : "Seguro";
  const summary =
    level === "danger"
      ? blocked
        ? "Bloqueado por seguridad."
        : `${issues} señal${issues === 1 ? "" : "es"} de riesgo. No lo abras si no confiás en el origen.`
      : level === "warning"
        ? `${issues} punto${issues === 1 ? "" : "s"} a revisar antes de continuar.`
        : "No se detectaron riesgos.";

  return { level, label, summary, checks: sorted, blocked };
}
