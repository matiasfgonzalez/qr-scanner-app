import React from "react";
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import Constants from "expo-constants";
import * as Location from "expo-location";

import { TabScreenProps } from "../navigation/types";
import { useApp } from "../state/AppContext";
import { Card, Divider, ScreenHeader, Segmented, SectionLabel, SettingRow } from "../components/ui";
import { useToast } from "../components/Toast";
import { clearScans, restoreAll, ThemePreference } from "../lib/storage";
import { haptic } from "../lib/haptics";
import { font, space } from "../theme";

export default function SettingsScreen({ navigation }: TabScreenProps<"Settings">) {
  const { colors, settings, updateSettings } = useApp();
  const toast = useToast();

  const toggleLocation = async (value: boolean) => {
    if (value) {
      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permiso de ubicación",
          canAskAgain ? "Sin permiso no se puede registrar dónde escaneás." : "Activá la ubicación para esta app desde los ajustes del sistema.",
          canAskAgain ? [{ text: "OK" }] : [{ text: "Cancelar", style: "cancel" }, { text: "Abrir ajustes", onPress: () => Linking.openSettings() }]
        );
        return;
      }
    }
    updateSettings({ saveLocation: value });
  };

  const clearHistory = () => {
    Alert.alert("Borrar historial", "Se eliminarán todos los escaneos guardados.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Borrar",
        style: "destructive",
        onPress: async () => {
          const previous = await clearScans();
          haptic.medium();
          toast.show({ message: "Historial borrado", action: { label: "Deshacer", onPress: () => restoreAll(previous) } });
        },
      },
    ]);
  };

  const version = Constants.expoConfig?.version ?? "—";

  return (
    <View style={[styles.fill, { backgroundColor: colors.bg }]}>
      <ScreenHeader title="Ajustes" />
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingTop: 0, gap: space.xl, paddingBottom: 120 }}>
        <View>
          <SectionLabel>Apariencia</SectionLabel>
          <Card>
            <Segmented<ThemePreference>
              value={settings.theme}
              onChange={(theme) => {
                haptic.selection();
                updateSettings({ theme });
              }}
              options={[
                { value: "system", label: "Sistema", icon: "phone-portrait-outline" },
                { value: "light", label: "Claro", icon: "sunny-outline" },
                { value: "dark", label: "Oscuro", icon: "moon-outline" },
              ]}
            />
          </Card>
        </View>

        <View>
          <SectionLabel>Escaneo</SectionLabel>
          <Card padded={false}>
            <SettingRow
              icon="barcode-outline"
              label="Todos los formatos"
              description="QR, Data Matrix, PDF417, Aztec y códigos de barras (EAN, UPC, Code 128…)"
              value={settings.allFormats}
              onValueChange={(v) => updateSettings({ allFormats: v })}
            />
            <Divider inset={60} />
            <SettingRow icon="location-outline" label="Guardar ubicación" description="Registra dónde escaneaste cada código para verlo en el mapa" value={settings.saveLocation} onValueChange={toggleLocation} />
            <Divider inset={60} />
            <SettingRow icon="pulse-outline" label="Vibración" description="Confirmación háptica al leer un código" value={settings.haptics} onValueChange={(v) => updateSettings({ haptics: v })} />
          </Card>
        </View>

        <View>
          <SectionLabel>Enlaces</SectionLabel>
          <Card padded={false}>
            <SettingRow
              icon="shield-checkmark-outline"
              label="Confirmar antes de abrir"
              description="Los enlaces con advertencias siempre piden confirmación"
              value={settings.confirmOpen}
              onValueChange={(v) => updateSettings({ confirmOpen: v })}
            />
            <Divider inset={60} />
            <SettingRow icon="browsers-outline" label="Navegador integrado" description="Abre los sitios dentro de la app en lugar del navegador" value={settings.inAppBrowser} onValueChange={(v) => updateSettings({ inAppBrowser: v })} />
          </Card>
        </View>

        <View>
          <SectionLabel>Datos</SectionLabel>
          <Card padded={false}>
            <SettingRow icon="map-outline" label="Mapa de escaneos" onPress={() => navigation.navigate("Map")} />
            <Divider inset={60} />
            <SettingRow icon="hardware-chip-outline" label="Información del dispositivo" onPress={() => navigation.navigate("DeviceInfo")} />
            <Divider inset={60} />
            <SettingRow icon="trash-outline" label="Borrar historial" destructive onPress={clearHistory} />
          </Card>
        </View>

        <Text style={[styles.footer, { color: colors.textFaint }]}>
          QR Scanner Pro · v{version}
          {"\n"}Todo el historial se guarda sólo en este dispositivo.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  footer: { textAlign: "center", fontSize: font.size.xs, lineHeight: 18 },
});
