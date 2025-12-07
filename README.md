# 📱 QR Scanner Pro

<p align="center">
  <img src="./assets/icon-app.png" alt="QR Scanner Pro Logo" width="120" height="120" />
</p>

<p align="center">
  <strong>Aplicación profesional de escaneo de códigos QR con geolocalización y diseño premium</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Expo-54.0-blue?style=flat-square&logo=expo" alt="Expo" />
  <img src="https://img.shields.io/badge/React%20Native-0.81.5-61DAFB?style=flat-square&logo=react" alt="React Native" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Platform-Android%20%7C%20iOS-green?style=flat-square" alt="Platform" />
</p>

---

## 📋 Descripción

**QR Scanner Pro** es una aplicación móvil desarrollada con React Native y Expo que permite escanear códigos QR de manera rápida y eficiente. La aplicación incluye características avanzadas como:

- 📷 **Escaneo de códigos QR** con la cámara del dispositivo
- 🔦 **Flash/Linterna** integrada para escaneo en condiciones de poca luz
- 🗺️ **Geolocalización** para registrar dónde se escaneó cada código
- 📍 **Mapa interactivo** con OpenStreetMap (sin necesidad de API key)
- 📜 **Historial de escaneos** con búsqueda y filtrado
- 📱 **Información del dispositivo** con identificador único
- 🎨 **Diseño premium** con UI/UX profesional y animaciones

---

## ✨ Características Principales

### 🔍 Escáner QR

- Escaneo en tiempo real con expo-camera v17
- Soporte para flash/linterna con `enableTorch`
- Detección automática de tipos de contenido (URLs, texto, etc.)
- Vibración al detectar código

### 🗺️ Geolocalización

- Captura automática de ubicación al escanear
- Mapa interactivo con marcadores de ubicaciones escaneadas
- Geocodificación inversa para obtener direcciones
- Implementado con OpenStreetMap + Leaflet (sin API key necesaria)

### 📜 Historial

- Lista de todos los códigos escaneados
- Información de fecha, hora y ubicación
- Búsqueda por contenido
- Opción de eliminar entradas individuales o limpiar todo

### 📱 Info del Dispositivo

- **Android ID** / **iOS Vendor ID** - Identificador único real del dispositivo
- Información completa de hardware y software
- Datos de red y conectividad
- Estado de batería
- Función de copiar y compartir información

---

## 🛠️ Tecnologías Utilizadas

| Categoría      | Tecnología                     | Versión |
| -------------- | ------------------------------ | ------- |
| Framework      | React Native                   | 0.81.5  |
| Plataforma     | Expo SDK                       | 54.0    |
| Lenguaje       | TypeScript                     | 5.9.2   |
| Navegación     | React Navigation               | 7.x     |
| Cámara         | expo-camera                    | 17.0    |
| Ubicación      | expo-location                  | 19.0    |
| Mapas          | react-native-webview + Leaflet | -       |
| Almacenamiento | AsyncStorage                   | 2.2.0   |
| Device Info    | expo-device, expo-application  | 8.x     |

---

## 📁 Estructura del Proyecto

```
qr-scanner-app/
├── App.tsx                 # Componente raíz con navegación
├── index.ts                # Entry point
├── app.json                # Configuración de Expo
├── eas.json                # Configuración de EAS Build
├── package.json            # Dependencias
├── tsconfig.json           # Configuración TypeScript
├── assets/
│   ├── icon-app.png        # Icono de la aplicación
│   ├── adaptive-icon.png   # Icono adaptativo Android
│   ├── splash-icon.png     # Splash screen
│   └── favicon.png         # Favicon web
└── src/
    ├── screens/
    │   ├── ScannerScreen.tsx     # Pantalla principal del escáner
    │   ├── ResultScreen.tsx      # Resultado del escaneo
    │   ├── HistoryScreen.tsx     # Historial de escaneos
    │   ├── MapScreen.tsx         # Mapa con ubicaciones
    │   └── DeviceInfoScreen.tsx  # Info del dispositivo
    ├── theme/
    │   ├── colors.ts        # Sistema de colores
    │   └── index.ts         # Exportaciones del tema
    └── utils/
        └── storage.ts       # Utilidades de almacenamiento
```

---

## 🚀 Instalación

### Prerrequisitos

- Node.js 18+
- npm o yarn
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI (`npm install -g eas-cli`)
- Android Studio (para emulador Android)
- Xcode (para simulador iOS - solo macOS)

### Pasos de Instalación

1. **Clonar el repositorio**

   ```bash
   git clone https://github.com/matiasfgonzalez/qr-scanner-app.git
   cd qr-scanner-app
   ```

2. **Instalar dependencias**

   ```bash
   npm install
   ```

3. **Iniciar el proyecto**

   ```bash
   npx expo start
   ```

4. **Ejecutar en dispositivo/emulador**
   - Presiona `a` para Android
   - Presiona `i` para iOS
   - Escanea el QR con la app Expo Go

---

## 📦 Build y Distribución

### Generar APK (Android)

```bash
# Build de preview (APK para testing)
eas build --platform android --profile preview

# Build de producción (AAB para Play Store)
eas build --platform android --profile production
```

### Generar IPA (iOS)

```bash
# Build de preview
eas build --platform ios --profile preview

# Build de producción
eas build --platform ios --profile production
```

### Configuración de EAS

El proyecto está configurado con los siguientes perfiles:

- **development**: Cliente de desarrollo con debug
- **preview**: APK/IPA para testing interno
- **production**: Build optimizado para tiendas

---

## 📱 Pantallas de la Aplicación

### 1. Scanner (Pantalla Principal)

- Visor de cámara en tiempo real
- Botón de flash/linterna
- Botones de acceso rápido: Historial, Mapa, Info

### 2. Result (Resultado)

- Muestra el contenido del QR escaneado
- Detección automática de tipo (URL, texto, etc.)
- Opciones: Copiar, Abrir link, Compartir
- Muestra ubicación del escaneo

### 3. History (Historial)

- Lista cronológica de escaneos
- Búsqueda por contenido
- Información de fecha y ubicación
- Eliminar entradas

### 4. Map (Mapa)

- Mapa OpenStreetMap interactivo
- Marcadores de todas las ubicaciones escaneadas
- Popups con información del escaneo

### 5. Device Info (Información)

- Identificador único del dispositivo
- Información de hardware
- Datos del sistema operativo
- Estado de red y batería

---

## 🔐 Permisos Requeridos

### Android

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.FLASHLIGHT" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

### iOS

```xml
NSCameraUsageDescription: "La aplicación necesita acceso a la cámara para escanear códigos QR."
NSLocationWhenInUseUsageDescription: "La aplicación necesita acceso a tu ubicación para registrar dónde escaneas los códigos QR."
```

---

## 🆔 Identificadores del Dispositivo

La aplicación utiliza identificadores únicos reales del dispositivo:

| Plataforma | Identificador   | Descripción                                                                      |
| ---------- | --------------- | -------------------------------------------------------------------------------- |
| Android    | `Android ID`    | ID único de 64 bits. Se resetea solo con factory reset.                          |
| iOS        | `iOS Vendor ID` | ID único por desarrollador. Persiste mientras haya una app del vendor instalada. |

> ⚠️ **Nota**: El IMEI no está disponible en aplicaciones modernas debido a restricciones de privacidad de Google (Android 10+) y Apple.

---

## 🎨 Sistema de Diseño

La aplicación utiliza un sistema de colores premium consistente:

```typescript
const Colors = {
  primary: "#3b82f6", // Azul principal
  secondary: "#10b981", // Verde secundario
  accent: "#8b5cf6", // Violeta de acento
  warning: "#f59e0b", // Amarillo de advertencia
  danger: "#ef4444", // Rojo de error
  background: "#f8fafc", // Fondo claro
  text: "#0f172a", // Texto oscuro
};
```

---

## 📝 Scripts Disponibles

```bash
# Iniciar servidor de desarrollo
npm start

# Iniciar con Android
npm run android

# Iniciar con iOS
npm run ios

# Iniciar versión web
npm run web
```

---

## 🔧 Configuración Adicional

### Cambiar el ID de la aplicación

Editar `app.json`:

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.tuempresa.qrscannerpro"
    },
    "android": {
      "package": "com.tuempresa.qrscannerpro"
    }
  }
}
```

### Configurar EAS Project ID

El proyecto ya tiene configurado el ID de EAS:

```json
{
  "extra": {
    "eas": {
      "projectId": "ff1bb635-e946-4c30-8954-fc9485bc0648"
    }
  }
}
```

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

---

## 👨‍💻 Autor

**Matías F. González**

- GitHub: [@matiasfgonzalez](https://github.com/matiasfgonzalez)

---

## 🙏 Agradecimientos

- [Expo](https://expo.dev/) - Plataforma de desarrollo
- [React Native](https://reactnative.dev/) - Framework móvil
- [OpenStreetMap](https://www.openstreetmap.org/) - Mapas gratuitos
- [Leaflet](https://leafletjs.com/) - Librería de mapas

---

<p align="center">
  Hecho con ❤️ usando React Native y Expo
</p>
