import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { DEFAULT_SETTINGS, loadSettings, saveSettings, Settings } from "../lib/storage";
import { setHapticsEnabled } from "../lib/haptics";
import { Palette, palettes } from "../theme";

type AppContextValue = {
  settings: Settings;
  ready: boolean;
  updateSettings: (patch: Partial<Settings>) => void;
  scheme: "light" | "dark";
  colors: Palette;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadSettings().then((s) => {
      setSettings(s);
      setHapticsEnabled(s.haptics);
      setReady(true);
    });
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      setHapticsEnabled(next.haptics);
      saveSettings(next).catch((e) => console.warn("No se pudieron guardar los ajustes", e));
      return next;
    });
  }, []);

  const scheme: "light" | "dark" =
    settings.theme === "system" ? (system === "dark" ? "dark" : "light") : settings.theme;

  const value = useMemo(
    () => ({ settings, ready, updateSettings, scheme, colors: palettes[scheme] }),
    [settings, ready, updateSettings, scheme]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp debe usarse dentro de <AppProvider>");
  return ctx;
}

export function useTheme() {
  const { colors, scheme } = useApp();
  return { colors, scheme };
}
