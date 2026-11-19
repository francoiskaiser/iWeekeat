import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { authErrorMessage, useAuth } from '@/context/AuthContext';
import { useThemeColors } from '@/hooks/useThemeColors';
import { PRIMARY, DANGER } from '@/constants/theme';

export default function LoginScreen() {
  const { accent, successText } = useThemeColors();
  const { signIn, signUp, resetPassword } = useAuth();
  const { isDarkMode, background, text, subText, card, border } = useThemeColors();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const inputBg = isDarkMode ? '#0f172a' : '#fff';

  const switchMode = () => {
    setIsLogin((v) => !v);
    setError(null);
    setNotice(null);
  };

  const handleAuth = async () => {
    setNotice(null);
    if (!email.trim() || !password) {
      setError('Renseigne ton e-mail et ton mot de passe.');
      return;
    }
    if (!isLogin && !username.trim()) {
      setError('Indique ton prénom.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      if (isLogin) await signIn(email, password);
      else await signUp(email, password, username);
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async () => {
    setNotice(null);
    if (!email.trim()) {
      setError('Saisis ton e-mail, puis touche de nouveau « Mot de passe oublié ».');
      return;
    }
    setError(null);
    try {
      await resetPassword(email);
      setNotice('E-mail envoyé : consulte ta boîte mail pour choisir un nouveau mot de passe.');
    } catch (e) {
      setError(authErrorMessage(e));
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <View style={styles.logoContainer}>
            <View style={styles.iconWrapper}>
              <Ionicons name="restaurant" size={50} color="#fff" />
            </View>
            <Text style={[styles.title, { color: text }]}>iWeekeat</Text>
            <Text style={[styles.subtitle, { color: subText }]}>Ta cuisine, ton organisation.</Text>
          </View>

          <View style={styles.formContainer}>
            {!isLogin && (
              <View style={[styles.inputGroup, { backgroundColor: inputBg, borderColor: border }]}>
                <Ionicons name="person-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: text }]}
                  placeholder="Ton prénom"
                  placeholderTextColor="#94a3b8"
                  value={username}
                  onChangeText={setUsername}
                />
              </View>
            )}

            <View style={[styles.inputGroup, { backgroundColor: inputBg, borderColor: border }]}>
              <Ionicons name="mail-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: text }]}
                placeholder="Adresse e-mail"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={[styles.inputGroup, { backgroundColor: inputBg, borderColor: border }]}>
              <Ionicons name="lock-closed-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: text }]}
                placeholder="Mot de passe"
                placeholderTextColor="#94a3b8"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color={DANGER} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {notice && (
              <View style={styles.noticeBox}>
                <Ionicons name="checkmark-circle" size={18} color={successText} />
                <Text style={styles.noticeText}>{notice}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.mainButton, loading && styles.mainButtonDisabled]}
              onPress={handleAuth}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.mainButtonText}>{isLogin ? 'Se connecter' : 'Créer mon compte'}</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.switchButton} onPress={switchMode}>
              <Text style={[styles.switchButtonText, { color: subText }]}>
                {isLogin ? "Pas encore de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
              </Text>
            </TouchableOpacity>

            {isLogin && (
              <TouchableOpacity style={styles.forgotButton} onPress={handleForgot}>
                <Text style={[styles.forgotText, { color: subText }]}>Mot de passe oublié ?</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={[styles.hintCard, { backgroundColor: card, borderColor: border }]}>
            <Ionicons name="people-outline" size={18} color={accent} />
            <Text style={[styles.hintText, { color: subText }]}>
              Apres la connexion, vous pourrez creer un foyer ou rejoindre celui de votre conjoint
              pour partager les memes plats et la meme liste de courses.
            </Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 30, paddingVertical: 40 },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  iconWrapper: { width: 90, height: 90, borderRadius: 30, backgroundColor: PRIMARY, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: PRIMARY, shadowOpacity: 0.4, shadowRadius: 15, shadowOffset: { width: 0, height: 8 }, marginBottom: 20 },
  title: { fontSize: 32, fontWeight: '900', letterSpacing: -0.5 },
  subtitle: { fontSize: 16, marginTop: 5 },
  formContainer: { width: '100%' },
  inputGroup: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, marginBottom: 15, paddingHorizontal: 15, height: 55, borderWidth: 1, elevation: 2, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16 },
  errorBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#fef2f2', borderColor: '#fecaca', borderWidth: 1, borderRadius: 14, padding: 12, marginTop: 4 },
  errorText: { flex: 1, color: '#b91c1c', fontSize: 14, lineHeight: 19, fontWeight: '600' },
  noticeBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', borderWidth: 1, borderRadius: 14, padding: 12, marginTop: 4 },
  noticeText: { flex: 1, color: '#047857', fontSize: 14, lineHeight: 19, fontWeight: '600' },
  mainButton: { backgroundColor: PRIMARY, borderRadius: 16, height: 55, justifyContent: 'center', alignItems: 'center', marginTop: 10, elevation: 4, shadowColor: PRIMARY, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 5 } },
  mainButtonDisabled: { opacity: 0.7 },
  mainButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  switchButton: { marginTop: 20, alignItems: 'center' },
  switchButtonText: { fontSize: 15, fontWeight: '600' },
  forgotButton: { marginTop: 12, alignItems: 'center' },
  forgotText: { fontSize: 14 },
  hintCard: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginTop: 30, padding: 16, borderRadius: 16, borderWidth: 1 },
  hintText: { flex: 1, fontSize: 13, lineHeight: 19 },
});
