# 📱 Plan de Release: QR Scanner App

## Visión General

Como ingeniero DevOps senior, te presento un plan completo para generar un **APK de producción firmado** usando **EAS Build** (Expo Application Services), la forma más profesional y eficiente para proyectos Expo.

---

## 🔍 Fase 0: Diagnóstico del Proyecto

Primero verifico la configuración actual:

Read [](file:///e%3A/Aplicaciones/qr-scanner-app/app.json)

Read [](file:///e%3A/Aplicaciones/qr-scanner-app/package.json)

Excelente. Ahora verifico si existe configuración EAS:

Searched for files matching `**/eas.json`, no matches

---

## 📋 PLAN DE EJECUCIÓN COMPLETO

### **Fase 1: Preparación (Checklist Pre-compilación)**

#### 1.1 Actualizar app.json con configuración de producción

Using "Replace String in File"

```

```

#### 1.2 Crear archivo de configuración EAS Build

Created [](file:///e%3A/Aplicaciones/qr-scanner-app/eas.json)

#### 1.3 Actualizar .gitignore para archivos sensibles

Searched for files matching `**/.gitignore`, 1 match

Read [](file:///e%3A/Aplicaciones/qr-scanner-app/.gitignore#1-1), lines 1 to 40

Read [](file:///e%3A/Aplicaciones/qr-scanner-app/.gitignore#38-38), lines 38 to 42

Using "Replace String in File"

```

```

---

### **Fase 2: Compilación (Comandos paso a paso)**

Ahora te proporciono los comandos exactos a ejecutar:

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                    🚀 GUÍA DE COMPILACIÓN - ANDROID APK                       ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  PASO 1: Instalar EAS CLI globalmente                                        ║
║  ─────────────────────────────────────                                        ║
║  > npm install -g eas-cli                                                     ║
║                                                                               ║
║  PASO 2: Iniciar sesión en Expo                                               ║
║  ─────────────────────────────────                                            ║
║  > eas login                                                                  ║
║  (Crear cuenta gratis en https://expo.dev si no tienes)                       ║
║                                                                               ║
║  PASO 3: Configurar el proyecto en EAS                                        ║
║  ─────────────────────────────────────                                        ║
║  > eas build:configure                                                        ║
║  (Esto actualizará app.json con tu projectId real)                            ║
║                                                                               ║
║  PASO 4: Generar APK de PREVIEW (para testing)                                ║
║  ─────────────────────────────────────────────                                ║
║  > eas build --platform android --profile preview                             ║
║                                                                               ║
║  ⏱️ Tiempo estimado: 10-20 minutos (build en la nube)                         ║
║  📦 Resultado: APK firmado automáticamente por EAS                            ║
║                                                                               ║
║  ALTERNATIVA: APK de PRODUCCIÓN (para Play Store)                             ║
║  ─────────────────────────────────────────────────                            ║
║  > eas build --platform android --profile production                          ║
║  (Genera .aab para subir a Google Play)                                       ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

### **Fase 3: Distribución (Métodos para compartir)**

#### 🏆 **Opción Recomendada: EAS Internal Distribution**

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                    📲 DISTRIBUCIÓN INTERNA CON EAS                            ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  MÉTODO 1: Link directo de descarga                                           ║
║  ───────────────────────────────────                                          ║
║  Después del build, EAS proporciona un link:                                  ║
║  https://expo.dev/artifacts/eas/XXXXX.apk                                     ║
║                                                                               ║
║  → Compartir este link por WhatsApp/Email                                     ║
║  → El usuario abre el link en su Android                                      ║
║  → Descarga e instala el APK                                                  ║
║                                                                               ║
║  MÉTODO 2: QR Code de instalación                                             ║
║  ─────────────────────────────────                                            ║
║  > eas build:list                                                             ║
║  (Ver builds anteriores y obtener QR para escanear)                           ║
║                                                                               ║
║  MÉTODO 3: Expo Dashboard                                                     ║
║  ────────────────────────                                                     ║
║  1. Ir a https://expo.dev                                                     ║
║  2. Navegar a tu proyecto → Builds                                            ║
║  3. Click en "Install" junto al build                                         ║
║  4. Escanear QR o copiar link                                                 ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

#### Alternativas de distribución:

| Plataforma                    | Ventajas                      | Uso                             |
| ----------------------------- | ----------------------------- | ------------------------------- |
| **Firebase App Distribution** | Grupos de testers, analytics  | `eas submit --platform android` |
| **Diawi** (diawi.com)         | Simple, gratis, link temporal | Subir APK manualmente           |
| **Google Drive**              | Familiar para usuarios        | Subir y compartir link          |

---

### **📱 Instrucciones para el Usuario Final**

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                    📲 GUÍA PARA EL USUARIO (ANDROID)                          ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  1. Recibir el link de descarga del APK                                       ║
║                                                                               ║
║  2. Antes de instalar, habilitar "Orígenes desconocidos":                     ║
║     → Configuración → Seguridad → "Instalar apps desconocidas"               ║
║     → Permitir para Chrome o la app desde donde descargues                   ║
║                                                                               ║
║  3. Abrir el link y descargar el archivo .apk                                 ║
║                                                                               ║
║  4. Tocar el archivo descargado para instalar                                 ║
║                                                                               ║
║  5. Abrir "QR Scanner Pro" desde el menú de aplicaciones                      ║
║                                                                               ║
║  6. Conceder permisos de cámara y ubicación cuando se soliciten               ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

### **🔐 Notas sobre Firma de APK**

| Tipo de Build | Firma                       | Uso             |
| ------------- | --------------------------- | --------------- |
| `preview`     | Auto-firmado por EAS        | Testing interno |
| `production`  | Keystore gestionado por EAS | Play Store      |

> **Ventaja de EAS:** Gestiona automáticamente el keystore de firma, eliminando el riesgo de perder las claves.

---

### **📊 Resumen Ejecutivo**

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUJO DE RELEASE COMPLETO                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   [Código] ──→ [EAS Build] ──→ [APK Firmado] ──→ [Usuario]     │
│                    │                                            │
│                    ↓                                            │
│             ┌─────────────┐                                     │
│             │  Expo Cloud │                                     │
│             │   Servers   │                                     │
│             └─────────────┘                                     │
│                                                                 │
│   Tiempo total: ~15-25 minutos                                  │
│   Costo: GRATIS (30 builds/mes en plan gratuito)               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### **▶️ ¿Quieres que ejecute el primer comando?**

Puedo ejecutar ahora:

1. `npm install -g eas-cli` - Instalar EAS CLI
2. Después harías `eas login` para autenticarte
3. Finalmente `eas build --platform android --profile preview` para generar el APK

¿Procedemos?

Made changes.
