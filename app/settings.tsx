import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert, Share, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuth } from '@/context/AuthContext';
import { fetchGroupInfo, type GroupInfo } from '@/utils/groups';

export default function SettingsScreen() {
  const { toggleTheme } = useTheme();
  const { isDarkMode, text: textColor, subText, background, card, border } = useThemeColors();
  const { displayName, user, groupId, signOut } = useAuth();

  const [group, setGroup] = useState<GroupInfo | null>(null);

  useEffect(() => {
    if (!groupId) return;
    let cancelled = false;
    fetchGroupInfo(groupId)
      .then((info) => { if (!cancelled) setGroup(info); })
      .catch(() => { /* hors ligne : on affiche le code seul */ });
    return () => { cancelled = true; };
  }, [groupId]);

  const shareCode = () => {
    if (!groupId) return;
    Share.share({
      message: `Rejoins notre foyer sur MealHelper avec le code ${groupId} !`,
    }).catch(() => { /* partage annule */ });
  };

  const confirmSignOut = () => {
    Alert.alert('Se deconnecter', 'Vos donnees resteront disponibles apres reconnexion.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se deconnecter', style: 'destructive', onPress: () => { signOut(); } },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.title, { color: textColor }]}>Parametres</Text>

        <Text style={[styles.sectionLabel, { color: subText }]}>MON FOYER</Text>
        <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
          <Text style={[styles.groupName, { color: textColor }]}>{group?.name ?? 'Mon foyer'}</Text>
          <Text style={[styles.groupMeta, { color: subText }]}>
            {group ? `${group.memberCount} membre(s)` : 'Chargement...'}
          </Text>

          <Text style={[styles.codeLabel, { color: subText }]}>Code de partage</Text>
          <View style={[styles.codeBox, { borderColor: border }]}>
            <Text style={styles.codeText}>{groupId}</Text>
          </View>
          <Text style={[styles.codeHelp, { color: subText }]}>
            Transmettez ce code pour qu&apos;un proche rejoigne le foyer et partage
            vos plats, votre semainier et vos courses.
          </Text>

          <TouchableOpacity style={styles.shareBtn} onPress={shareCode}>
            <Ionicons name="share-social-outline" size={18} color="#fff" />
            <Text style={styles.shareBtnText}>Partager le code</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionLabel, { color: subText }]}>AFFICHAGE</Text>
        <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: textColor }]}>Mode sombre</Text>
            <Switch value={isDarkMode} onValueChange={toggleTheme} />
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: subText }]}>COMPTE</Text>
        <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
          <Text style={[styles.rowLabel, { color: textColor }]}>{displayName}</Text>
          <Text style={[styles.groupMeta, { color: subText }]}>{user?.email}</Text>
          <TouchableOpacity style={styles.signOutBtn} onPress={confirmSignOut}>
            <Ionicons name="log-out-outline" size={18} color="#ef4444" />
            <Text style={styles.signOutText}>Se deconnecter</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5, marginBottom: 24, marginTop: 8 },

  sectionLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8, marginBottom: 8, marginLeft: 4 },
  card: { borderRadius: 18, padding: 18, marginBottom: 24, borderWidth: 1 },

  groupName: { fontSize: 18, fontWeight: '800' },
  groupMeta: { fontSize: 13, marginTop: 2 },

  codeLabel: { fontSize: 12, fontWeight: '700', marginTop: 18, marginBottom: 6 },
  codeBox: { borderWidth: 2, borderStyle: 'dashed', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  codeText: { fontSize: 28, fontWeight: '900', letterSpacing: 6, color: '#FF7A41' },
  codeHelp: { fontSize: 13, lineHeight: 19, marginTop: 10 },

  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FF7A41', borderRadius: 14, paddingVertical: 13, marginTop: 14 },
  shareBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { fontSize: 16, fontWeight: '600' },

  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 13, marginTop: 16, borderWidth: 1, borderColor: '#fecaca' },
  signOutText: { color: '#ef4444', fontWeight: '700', fontSize: 15 },
});
