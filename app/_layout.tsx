import { useEffect } from "react";
import { Stack, useGlobalSearchParams, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { RecipesProvider } from "@/context/RecipesContext";
import { useThemeColors } from "@/hooks/useThemeColors";

function RootLayoutNav() {
  const { accent } = useThemeColors();
  const { configured, user, groupId, initialized } = useAuth();
  const { isDarkMode, background, text, subText } = useThemeColors();
  const segments = useSegments();
  // useLocalSearchParams ne verrait pas les parametres de la route enfant
  // depuis ce layout racine : il faut la version globale.
  const params = useGlobalSearchParams<{ change?: string }>();
  const router = useRouter();

  useEffect(() => {
    if (!configured || !initialized) return;

    const onLogin = segments[0] === 'login';
    const onGroup = segments[0] === 'group';
    // Visite volontaire depuis les parametres pour changer de foyer : sans ce
    // drapeau, la garde renverrait aussitot vers l'accueil.
    const changingGroup = onGroup && params.change === '1';

    if (!user) {
      if (!onLogin) router.replace('/login');
    } else if (!groupId) {
      // Connecte mais sans foyer : on ne peut pas encore afficher de donnees.
      if (!onGroup) router.replace('/group');
    } else if (onLogin || (onGroup && !changingGroup)) {
      router.replace('/');
    }
  }, [configured, initialized, user, groupId, segments, params.change, router]);

  if (!configured) {
    return (
      <View style={[styles.center, { backgroundColor: background }]}>
        <Text style={[styles.title, { color: text }]}>Firebase non configuré</Text>
        <Text style={[styles.body, { color: subText }]}>
          Renseignez la section extra.firebase du fichier app.json avec la
          configuration de votre projet Firebase, puis relancez l&apos;application.
        </Text>
      </View>
    );
  }

  if (!initialized) {
    return (
      <View style={[styles.center, { backgroundColor: background }]}>
        <ActivityIndicator size="large" color={accent} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" options={{ animation: 'fade' }} />
        <Stack.Screen name="group" options={{ animation: 'fade' }} />
        <Stack.Screen name="settings" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider>
        {/* Au-dessus des onglets : les parametres gerent aussi les auteurs bloques. */}
        <RecipesProvider>
          <RootLayoutNav />
        </RecipesProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 10, textAlign: 'center' },
  body: { fontSize: 15, lineHeight: 22, textAlign: 'center' },
});
