# QR Scanner Pro

<p align="center">
  <img src="./assets/icon-app.png" alt="QR Scanner Pro" width="120" height="120" />
</p>

<p align="center">
  Escáner de códigos QR y de barras que <strong>verifica la seguridad</strong> de cada código antes de abrirlo,
  guarda dónde lo escaneaste y permite generar los tuyos.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Expo-54-blue?style=flat-square&logo=expo" alt="Expo" />
  <img src="https://img.shields.io/badge/React%20Native-0.81-61DAFB?style=flat-square&logo=react" alt="React Native" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Platform-Android%20%7C%20iOS-green?style=flat-square" alt="Platform" />
</p>

---

## Qué hace

- **Escanea cualquier código**: QR, Data Matrix, PDF417, Aztec, EAN‑13/8, UPC‑A/E, Code 128/39/93, ITF‑14 y Codabar. Desde la cámara o desde una imagen de la galería.
- **Acepta todos los orígenes y los valida**: no hay lista blanca de dominios. Cada código recibe un veredicto (**Seguro**, **Precaución** o **Peligroso**) con el detalle de cada chequeo.
- **Entiende el contenido** y ofrece la acción correcta: abrir enlace, conectarse a Wi‑Fi (copiar clave), llamar, enviar SMS o email, abrir en mapas, ver un contacto o un evento, buscar un producto, etc.
- **Historial** con búsqueda, filtros por tipo, favoritos, deslizar para borrar con *Deshacer* y exportación a CSV.
- **Mapa** de dónde escaneaste cada código y ruta cronológica de un mismo QR (Leaflet + OpenStreetMap/CARTO, sin API key).
- **Generador de QR** para enlaces, texto, Wi‑Fi, contactos (vCard), email y teléfono, validado con el mismo analizador y compartible como imagen.
- **Modo claro y oscuro**, vibración háptica y animaciones respetuosas de *Reducir movimiento*.

## Validación de seguridad

El analizador vive en [`src/lib/qr/`](src/lib/qr/) y no depende de React Native, así que se puede probar en Node.

| Tipo | Qué se verifica |
| --- | --- |
| Enlaces | HTTPS vs HTTP, credenciales embebidas (`banco.com@malicioso.com`), IP en lugar de dominio, red local, dominio y TLD válidos, homógrafos IDN/punycode y mezcla de alfabetos, TLDs de alto abuso, dominios que imitan a otro (`paypal.com.cuenta.top`), marcas usadas fuera de su dominio, acortadores, redirecciones en parámetros, descargas ejecutables (`.apk`, `.exe`…), palabras de phishing y dominios gubernamentales |
| Wi‑Fi | SSID presente, red abierta, WEP obsoleto, largo de clave WPA |
| Email / teléfono / SMS | Formato de dirección y número, números de tarifa especial |
| Productos | Dígito de control GS1 (EAN/UPC/ITF) y país de registro |
| Cripto | Formato de dirección Bitcoin/Ethereum y advertencia de pago irreversible |
| 2FA (`otpauth://`) | Aviso de secreto sensible |
| Esquemas | `javascript:`, `data:`, `file:` y similares se **bloquean** |
| Texto | Caracteres de control y de dirección ocultos (bidi) |

Además, **“Ver destino real”** sigue las redirecciones de un enlace (bajo demanda) y la vista previa web sólo se carga si el usuario la pide.

## Estructura

```
App.tsx                     Navegación (pestañas + stack) y proveedores
src/
├── lib/
│   ├── qr/
│   │   ├── url.ts          Parser de URLs propio (el URL de RN está incompleto)
│   │   ├── parse.ts        Detección de tipo de contenido y campos
│   │   └── analyze.ts      Veredicto de seguridad por tipo
│   ├── actions.ts          Acciones por tipo y apertura segura de enlaces
│   ├── storage.ts          Historial (cola de escritura, suscripciones) y ajustes
│   ├── scan.ts             Guarda el escaneo y completa la ubicación en segundo plano
│   ├── location.ts         Ubicación rápida sin bloquear ni mostrar diálogos del sistema
│   ├── haptics.ts · format.ts
├── components/
│   ├── ui.tsx              Botones, tarjetas, chips, encabezados, filas de ajustes
│   ├── motion.tsx          Animaciones (Reanimated): visor, sello, esqueleto, puntos
│   ├── Toast.tsx           Avisos y patrón “Deshacer” con anillo de cuenta regresiva
│   └── KindIcon.tsx
├── screens/                Scanner · Result · History · Create · Settings · Map · DeviceInfo
├── state/AppContext.tsx    Ajustes y tema (claro/oscuro/sistema)
└── theme/index.ts          Tokens de diseño
```

## Desarrollo

```bash
npm install
npm start            # Expo Dev Server (abrir con Expo Go SDK 54)
npm run android      # o iOS
npm run typecheck    # TypeScript
```

> El escaneo con cámara y la vibración se prueban mejor en un dispositivo real. En el emulador de Android se puede usar **Desde galería** con imágenes QR.

## Build

```bash
eas build --platform android --profile preview      # APK
eas build --platform android --profile production   # AAB
eas build --platform ios --profile production
```

## Permisos

| Permiso | Uso |
| --- | --- |
| Cámara | Leer códigos. No se graba ni se envía nada. |
| Ubicación (opcional) | Registrar dónde se escaneó. Se puede desactivar en Ajustes. |
| Fotos | Elegir una imagen para leer el código que contiene. |

Todo el historial se guarda únicamente en el dispositivo.

## Créditos

- Animaciones del visor, el sello de veredicto, el esqueleto de carga, los puntos que respiran y el aviso de *Deshacer* inspiradas en los recursos de [moxen.cl](https://moxen.cl/recursos.html) (*Escáner*, *Sello*, *Esqueleto*, *Respiro* y *Deshacer*), reimplementadas para React Native con Reanimated.
- [Expo](https://expo.dev/), [React Native](https://reactnative.dev/), [Leaflet](https://leafletjs.com/), [OpenStreetMap](https://www.openstreetmap.org/) y [CARTO](https://carto.com/).

## Autor

**Matías F. González** — [@matiasfgonzalez](https://github.com/matiasfgonzalez)

Licencia MIT.
