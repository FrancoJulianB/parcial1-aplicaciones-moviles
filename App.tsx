import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useAppStore } from "./src/store/useAppStore";
import { RootStackParamList } from "./src/types";
import { colors } from "./src/theme";
import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import HomeScreen from "./src/screens/HomeScreen";
import AddProductScreen from "./src/screens/AddProductScreen";
import ProductDetailScreen from "./src/screens/ProductDetailScreen";
const Stack = createNativeStackNavigator<RootStackParamList>();
function Navigation() {
  const username = useAppStore((state) => state.username);
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.light },
          headerTintColor: colors.ink,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.light },
        }}
      >
        {username ? (
          <Stack.Group navigationKey="authenticated">
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{ title: "Mi lista" }}
            />
            <Stack.Screen
              name="Alta"
              component={AddProductScreen}
              options={{ title: "Nuevo producto" }}
            />
            <Stack.Screen
              name="Detalle"
              component={ProductDetailScreen}
              options={{ title: "Detalle del producto" }}
            />
          </Stack.Group>
        ) : (
          <Stack.Group navigationKey="guest">
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ title: "Bienvenido" }}
            />
            <Stack.Screen
              name="Registro"
              component={RegisterScreen}
              options={{ title: "Registro" }}
            />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Navigation />
    </SafeAreaProvider>
  );
}
