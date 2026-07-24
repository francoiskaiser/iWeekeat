import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useThemeColors } from '@/hooks/useThemeColors';

export default function SettingsScreen() {
  const { toggleTheme } = useTheme();
  const { isDarkMode, text: textColor, background: backgroundColor } = useThemeColors();

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Text style={[styles.title, { color: textColor }]}>Paramètres</Text>

      <View style={styles.row}>
        <Text style={[styles.label, { color: textColor }]}>Mode sombre</Text>
        <Switch value={isDarkMode} onValueChange={toggleTheme} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, marginTop: 40 },
  label: { fontSize: 16, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }
});
