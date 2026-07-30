import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppProvider } from "@/context/AppContext";
import { useTheme } from "@/context/ThemeContext";

const ACCENT = "#FF7A41";

// Config des onglets : nom de route -> icône + libellé
const TABS: Record<string, { icon: any; label: string }> = {
  index: { icon: "home", label: "Accueil" },
  calendar: { icon: "calendar", label: "Agenda" },
  planner: { icon: "restaurant", label: "Semainier" },
  edit: { icon: "list", label: "Plats" },
  shopping: { icon: "cart", label: "Courses" },
};

// Barre de navigation personnalisée — style "pastille active extensible"
function CustomTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();
  const barBg = isDarkMode ? "#334155" : "#ffffff";
  const inactive = isDarkMode ? "#64748b" : "#94a3b8";

  return (
    <View style={[styles.wrapper, { bottom: insets.bottom > 0 ? insets.bottom + 4 : 18 }]} pointerEvents="box-none">
      <View style={[styles.bar, { backgroundColor: barBg }]}>
        {state.routes
          .filter((route: any) => TABS[route.name])
          .map((route: any) => {
            const cfg = TABS[route.name];
            const routeIndex = state.routes.findIndex((r: any) => r.key === route.key);
            const isFocused = state.index === routeIndex;

            const onPress = () => {
              const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
              if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
            };

            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={cfg.label}
                onPress={onPress}
                activeOpacity={0.8}
                style={[styles.item, isFocused && styles.itemActive]}
              >
                <Ionicons name={isFocused ? cfg.icon : `${cfg.icon}-outline`} size={22} color={isFocused ? "#fff" : inactive} />
                {isFocused && <Text style={styles.label}>{cfg.label}</Text>}
              </TouchableOpacity>
            );
          })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <AppProvider>
      <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <CustomTabBar {...props} />}>
        <Tabs.Screen name="index" />
        <Tabs.Screen name="calendar" />
        <Tabs.Screen name="planner" />
        <Tabs.Screen name="edit" />
        <Tabs.Screen name="shopping" />
      </Tabs>
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: "absolute", left: 16, right: 16 },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 62,
    borderRadius: 22,
    paddingHorizontal: 10,
    elevation: 10,
    shadowColor: ACCENT,
    shadowOpacity: 0.16,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  // Espacements resserres : avec cinq onglets, la pastille active plus quatre
  // icones doivent tenir sur un ecran de 360 px de large.
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 9,
    gap: 0,
  },
  itemActive: {
    backgroundColor: ACCENT,
    paddingHorizontal: 13,
    gap: 6,
  },
  label: { color: "#fff", fontWeight: "800", fontSize: 12 },
});
