import "react-native-gesture-handler";
import React from "react";
import { Platform } from "react-native";
import { DarkTheme, DefaultTheme, NavigationContainer, Theme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";

import { AppProvider, useApp } from "./src/state/AppContext";
import { ToastProvider } from "./src/components/Toast";
import { RootStackParamList, TabParamList } from "./src/navigation/types";
import ScannerScreen from "./src/screens/ScannerScreen";
import HistoryScreen from "./src/screens/HistoryScreen";
import CreateScreen from "./src/screens/CreateScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import ResultScreen from "./src/screens/ResultScreen";
import MapScreen from "./src/screens/MapScreen";
import DeviceInfoScreen from "./src/screens/DeviceInfoScreen";

export type { RootStackParamList } from "./src/navigation/types";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const TAB_ICONS: Record<keyof TabParamList, [React.ComponentProps<typeof Ionicons>["name"], React.ComponentProps<typeof Ionicons>["name"]]> = {
  Scan: ["scan", "scan-outline"],
  History: ["time", "time-outline"],
  Create: ["qr-code", "qr-code-outline"],
  Settings: ["settings", "settings-outline"],
};

function Tabs() {
  const { colors } = useApp();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        // Las pestañas son pares: sin animación de transición
        animation: "none",
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarIcon: ({ focused, color, size }) => (
          <Ionicons name={TAB_ICONS[route.name][focused ? 0 : 1]} size={size - 2} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Scan" component={ScannerScreen} options={{ title: "Escanear" }} />
      <Tab.Screen name="History" component={HistoryScreen} options={{ title: "Historial" }} />
      <Tab.Screen name="Create" component={CreateScreen} options={{ title: "Crear" }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: "Ajustes" }} />
    </Tab.Navigator>
  );
}

function Root() {
  const { colors, scheme, ready } = useApp();
  if (!ready) return null;

  const base = scheme === "dark" ? DarkTheme : DefaultTheme;
  const navTheme: Theme = {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.accent,
      background: colors.bg,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      notification: colors.danger,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <ToastProvider>
        <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
          <Stack.Screen name="Tabs" component={Tabs} />
          <Stack.Screen
            name="Result"
            component={ResultScreen}
            options={{ animation: Platform.OS === "android" ? "fade_from_bottom" : "default" }}
          />
          <Stack.Screen name="Map" component={MapScreen} />
          <Stack.Screen name="DeviceInfo" component={DeviceInfoScreen} />
        </Stack.Navigator>
      </ToastProvider>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <Root />
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
