import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useThemeColors } from '@/hooks/useThemeColors';
import { normalizeCode } from '@/utils/groups';
import { PRIMARY, DANGER } from '@/constants/theme';

type Mode = 'create' | 'join';

export default function GroupScreen() {
  const { accent } = useThemeColors();
  const { displayName, groupId, groupName: currentGroupName, createGroup, joinGroup, signOut } = useAuth();
  const { isDarkMode, background, text, subText, card, border } = useThemeColors();
  const params = useLocalSearchParams<{ change?: string }>();
  const router = useRouter();

  // Depuis les parametres, on arrive ici en ayant deja un foyer : l'ecran
  // devient un changement de foyer, et non une premiere adhesion.
  const changing = params.change === '1' && Boolean(groupId);

  const [mode, setMode] = useState<Mode>(params.change === '1' ? 'join' : 'create');
  const [groupName, setGroupName] = useState(`Foyer de ${displayName}`);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputBg = isDarkMode ? '#0f172a' : '#fff';

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
  };

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      if (mode === 'create') {
        const created = await createGroup(groupName);
        Alert.alert(
          'Foyer créé',
          `Ton code de partage est ${created}.\n\nCommunique-le à ton conjoint pour qu'il rejoigne le même foyer. Tu le retrouveras dans Paramètres.`,
        );
      } else {
        await joinGroup(code);
      }
      // En premiere adhesion, la garde de navigation redirige d elle-meme ;
      // en changement de foyer elle nous laisserait sur cet ecran.
      if (changing) router.replace('/');
    } catch (e) {
      const raw = (e as { code?: string; message?: string });
      setError(
        raw.code === 'permission-denied'
          ? "Accès refusé par Firestore. Les règles de sécurité du projet Firebase n'ont pas encore été publiées."
          : raw.message ?? 'Une erreur est survenue.',
      );
    } finally {
      setLoading(false);
    }
  };

  const disabled = loading || (mode === 'create' ? !groupName.trim() : normalizeCode(code).length !== 6);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {changing && (
            <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={20} color={accent} />
              <Text style={[styles.backLinkText, { color: accent }]}>Retour</Text>
            </TouchableOpacity>
          )}

          <View style={styles.header}>
            <View style={styles.iconWrapper}>
              <Ionicons name="people" size={44} color="#fff" />
            </View>
            <Text style={[styles.title, { color: text }]}>
              {changing ? 'Changer de foyer' : 'Ton foyer'}
            </Text>
            <Text style={[styles.subtitle, { color: subText }]}>
              {changing
                ? `Tu fais actuellement partie de « ${currentGroupName ?? 'ton foyer'} ». En rejoindre un autre t'en fera sortir.`
                : "Les membres d'un même foyer partagent leurs plats, leur semainier et leur liste de courses."}
            </Text>
          </View>

          {changing && (
            <View style={styles.warnBox}>
              <Ionicons name="alert-circle" size={18} color="#b45309" />
              <Text style={styles.warnText}>
                Les plats, le semainier, les courses et l&apos;agenda appartiennent au
                foyer : ils resteront dans l&apos;actuel et vous verrez ceux du nouveau.
              </Text>
            </View>
          )}

          <View style={[styles.tabs, { backgroundColor: card, borderColor: border }]}>
            <TouchableOpacity
              style={[styles.tab, mode === 'create' && styles.tabActive]}
              onPress={() => switchMode('create')}
            >
              <Text style={[styles.tabText, { color: mode === 'create' ? '#fff' : subText }]}>Créer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, mode === 'join' && styles.tabActive]}
              onPress={() => switchMode('join')}
            >
              <Text style={[styles.tabText, { color: mode === 'join' ? '#fff' : subText }]}>Rejoindre</Text>
            </TouchableOpacity>
          </View>

          {mode === 'create' ? (
            <>
              <Text style={[styles.label, { color: text }]}>Nom du foyer</Text>
              <View style={[styles.inputGroup, { backgroundColor: inputBg, borderColor: border }]}>
                <Ionicons name="home-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: text }]}
                  placeholder="Ex : Chez nous"
                  placeholderTextColor="#94a3b8"
                  value={groupName}
                  onChangeText={setGroupName}
                />
              </View>
              <Text style={[styles.helper, { color: subText }]}>
                Un code de partage a 6 caracteres sera genere : transmettez-le a votre
                conjoint pour qu&apos;il vous rejoigne.
              </Text>
            </>
          ) : (
            <>
              <Text style={[styles.label, { color: text }]}>Code du foyer</Text>
              <View style={[styles.inputGroup, { backgroundColor: inputBg, borderColor: border }]}>
                <Ionicons name="key-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.codeInput, { color: text }]}
                  placeholder="K7M2QP"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={8}
                  value={code}
                  onChangeText={setCode}
                />
              </View>
              <Text style={[styles.helper, { color: subText }]}>
                Demandez le code affiche sur l&apos;autre telephone, dans Parametres.
              </Text>
            </>
          )}

          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={DANGER} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.mainButton, disabled && styles.mainButtonDisabled]}
            onPress={submit}
            disabled={disabled}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.mainButtonText}>{mode === 'create' ? 'Créer mon foyer' : 'Rejoindre le foyer'}</Text>}
          </TouchableOpacity>

          {!changing && (
            <TouchableOpacity style={styles.signOut} onPress={signOut}>
              <Text style={[styles.signOutText, { color: subText }]}>Se déconnecter</Text>
            </TouchableOpacity>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 40 },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 8 },
  backLinkText: { color: PRIMARY, fontSize: 15, fontWeight: '700' },
  warnBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, backgroundColor: '#fffbeb', borderColor: '#fde68a', borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 20 },
  warnText: { flex: 1, color: '#b45309', fontSize: 13, lineHeight: 18, fontWeight: '600' },
  header: { alignItems: 'center', marginBottom: 30 },
  iconWrapper: { width: 84, height: 84, borderRadius: 28, backgroundColor: PRIMARY, justifyContent: 'center', alignItems: 'center', marginBottom: 18, elevation: 6, shadowColor: PRIMARY, shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
  title: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, textAlign: 'center', lineHeight: 21, marginTop: 8 },

  tabs: { flexDirection: 'row', borderRadius: 16, padding: 5, gap: 5, marginBottom: 24, borderWidth: 1 },
  tab: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  tabActive: { backgroundColor: PRIMARY },
  tabText: { fontSize: 15, fontWeight: '800' },

  label: { fontSize: 14, fontWeight: '800', marginBottom: 8, marginLeft: 4 },
  inputGroup: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, paddingHorizontal: 15, height: 55, borderWidth: 1 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16 },
  codeInput: { fontSize: 22, fontWeight: '800', letterSpacing: 4 },
  helper: { fontSize: 13, lineHeight: 19, marginTop: 10, marginHorizontal: 4 },

  errorBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#fef2f2', borderColor: '#fecaca', borderWidth: 1, borderRadius: 14, padding: 12, marginTop: 18 },
  errorText: { flex: 1, color: '#b91c1c', fontSize: 14, lineHeight: 19, fontWeight: '600' },
  mainButton: { backgroundColor: PRIMARY, borderRadius: 16, height: 55, justifyContent: 'center', alignItems: 'center', marginTop: 28, elevation: 4, shadowColor: PRIMARY, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 5 } },
  mainButtonDisabled: { opacity: 0.5, elevation: 0 },
  mainButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },

  signOut: { marginTop: 22, alignItems: 'center' },
  signOutText: { fontSize: 14, fontWeight: '600' },
});
