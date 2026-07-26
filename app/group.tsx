import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useThemeColors } from '@/hooks/useThemeColors';
import { normalizeCode } from '@/utils/groups';

type Mode = 'create' | 'join';

export default function GroupScreen() {
  const { displayName, createGroup, joinGroup, signOut } = useAuth();
  const { isDarkMode, background, text, subText, card, border } = useThemeColors();

  const [mode, setMode] = useState<Mode>('create');
  const [groupName, setGroupName] = useState(`Foyer de ${displayName}`);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const inputBg = isDarkMode ? '#0f172a' : '#fff';

  const submit = async () => {
    setLoading(true);
    try {
      if (mode === 'create') {
        const created = await createGroup(groupName);
        Alert.alert(
          'Foyer cree',
          `Votre code de partage est ${created}.\n\nCommuniquez-le a votre conjoint pour qu'il rejoigne le meme foyer.`,
        );
      } else {
        await joinGroup(code);
      }
    } catch (e) {
      Alert.alert('Operation impossible', (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const disabled = loading || (mode === 'create' ? !groupName.trim() : normalizeCode(code).length !== 6);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <View style={styles.header}>
            <View style={styles.iconWrapper}>
              <Ionicons name="people" size={44} color="#fff" />
            </View>
            <Text style={[styles.title, { color: text }]}>Votre foyer</Text>
            <Text style={[styles.subtitle, { color: subText }]}>
              Les membres d&apos;un meme foyer partagent leurs plats, leur semainier
              et leur liste de courses.
            </Text>
          </View>

          <View style={[styles.tabs, { backgroundColor: card, borderColor: border }]}>
            <TouchableOpacity
              style={[styles.tab, mode === 'create' && styles.tabActive]}
              onPress={() => setMode('create')}
            >
              <Text style={[styles.tabText, { color: mode === 'create' ? '#fff' : subText }]}>Creer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, mode === 'join' && styles.tabActive]}
              onPress={() => setMode('join')}
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

          <TouchableOpacity
            style={[styles.mainButton, disabled && styles.mainButtonDisabled]}
            onPress={submit}
            disabled={disabled}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.mainButtonText}>{mode === 'create' ? 'Creer mon foyer' : 'Rejoindre le foyer'}</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.signOut} onPress={signOut}>
            <Text style={[styles.signOutText, { color: subText }]}>Se deconnecter</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 40 },
  header: { alignItems: 'center', marginBottom: 30 },
  iconWrapper: { width: 84, height: 84, borderRadius: 28, backgroundColor: '#FF7A41', justifyContent: 'center', alignItems: 'center', marginBottom: 18, elevation: 6, shadowColor: '#FF7A41', shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
  title: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, textAlign: 'center', lineHeight: 21, marginTop: 8 },

  tabs: { flexDirection: 'row', borderRadius: 16, padding: 5, gap: 5, marginBottom: 24, borderWidth: 1 },
  tab: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  tabActive: { backgroundColor: '#FF7A41' },
  tabText: { fontSize: 15, fontWeight: '800' },

  label: { fontSize: 14, fontWeight: '800', marginBottom: 8, marginLeft: 4 },
  inputGroup: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, paddingHorizontal: 15, height: 55, borderWidth: 1 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16 },
  codeInput: { fontSize: 22, fontWeight: '800', letterSpacing: 4 },
  helper: { fontSize: 13, lineHeight: 19, marginTop: 10, marginHorizontal: 4 },

  mainButton: { backgroundColor: '#FF7A41', borderRadius: 16, height: 55, justifyContent: 'center', alignItems: 'center', marginTop: 28, elevation: 4, shadowColor: '#FF7A41', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 5 } },
  mainButtonDisabled: { opacity: 0.5, elevation: 0 },
  mainButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },

  signOut: { marginTop: 22, alignItems: 'center' },
  signOutText: { fontSize: 14, fontWeight: '600' },
});
