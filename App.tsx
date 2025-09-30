import "react-native-gesture-handler"; // necesario para react-navigation con expo
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ScannerScreen from "./src/screens/ScannerScreen";
import ResultScreen from "./src/screens/ResultScreen";
import HistoryScreen from "./src/screens/HistoryScreen";

export type RootStackParamList = {
  Scanner: undefined;
  Result: { data: string; type?: string; fromScanner?: boolean };
  History: undefined; // 👈 nuevo
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Scanner"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Scanner" component={ScannerScreen} />
        <Stack.Screen name="Result" component={ResultScreen} />
        <Stack.Screen name="History" component={HistoryScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
