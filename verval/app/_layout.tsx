// app/_layout.tsx
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import "react-native-reanimated";

import { ColorSchemeProvider, useColorScheme } from "@/components/useColorScheme";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

export { ErrorBoundary } from "expo-router";

SplashScreen.preventAutoHideAsync();
export const unstable_settings = { initialRouteName: "(tabs)" };

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    ...FontAwesome.font,
  });

  useEffect(() => { if (error) throw error; }, [error]);
  if (!loaded) return null;

  return (
    <AuthProvider>
      <ColorSchemeProvider>
        <RootLayoutNav fontsLoaded={loaded} />
      </ColorSchemeProvider>
    </AuthProvider>
  );
}


function RootLayoutNav({ fontsLoaded }: { fontsLoaded: boolean }) {
  const scheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const { usuario, isLoading } = useAuth();

  useEffect(() => { console.log('[theme] scheme=', scheme); }, [scheme]);

  useEffect(() => { if (fontsLoaded && !isLoading) SplashScreen.hideAsync(); }, [fontsLoaded, isLoading]);

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === "(auth)";
    if (!usuario && !inAuthGroup) router.replace("/(auth)/login");
    else if (usuario && inAuthGroup) router.replace("/(tabs)");
  }, [usuario, isLoading, segments, router]);

  if (isLoading) return null;

  return (
    <ThemeProvider value={scheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="modal" options={{ presentation: "modal" }} />
      </Stack>
    </ThemeProvider>
  );
}
