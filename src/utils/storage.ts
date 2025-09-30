import AsyncStorage from "@react-native-async-storage/async-storage";
import "react-native-get-random-values";
import uuid from "react-native-uuid";

export type ScanItem = {
  id: string;
  data: string;
  type: string;
  date: string;
};

const STORAGE_KEY = "scan_history";

export async function saveScan(data: string, type: string) {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    const current: ScanItem[] = json ? JSON.parse(json) : [];
    const newItem: ScanItem = {
      id: uuid.v4(),
      data,
      type,
      date: new Date().toISOString(),
    };
    current.unshift(newItem);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    console.log("Scan guardado en AsyncStorage:", newItem);
  } catch (err) {
    console.error("Error guardando historial:", err);
  }
}

export async function getScans(): Promise<ScanItem[]> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}

export async function clearScans() {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
