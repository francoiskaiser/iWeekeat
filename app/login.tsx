import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState(''); 
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [groupCode, setGroupCode] = useState(''); 

  // VERSION LOCALE : plus de connexion en ligne. Cet écran n'est
  // normalement jamais affiché (auto-connexion locale dans AuthContext).
  const handleAuth = async () => {
    Alert.alert('Mode local', "L'application fonctionne hors-ligne, aucune connexion n'est nécessaire.");
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        
        <View style={styles.logoContainer}>
          <View style={styles.iconWrapper}>
            <Ionicons name="restaurant" size={50} color="#fff" />
          </View>
          <Text style={styles.title}>MealHelper</Text>
          <Text style={styles.subtitle}>Votre cuisine, votre organisation.</Text>
        </View>

        <View style={styles.formContainer}>
          
          {/* CHAMP PRÉNOM & CODE (Visibles uniquement à l'inscription) */}
          {!isLogin && (
            <>
              <View style={styles.inputGroup}>
                <Ionicons name="person-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Votre prénom"
                  placeholderTextColor="#94a3b8"
                  value={username}
                  onChangeText={setUsername}
                />
              </View>

              <View style={styles.inputGroup}>
                <Ionicons name="people-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Code de famille (optionnel)"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="characters"
                  value={groupCode}
                  onChangeText={setGroupCode}
                />
              </View>
            </>
          )}

          <View style={styles.inputGroup}>
            <Ionicons name="mail-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Adresse email"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.inputGroup}>
            <Ionicons name="lock-closed-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Mot de passe"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity 
            style={[styles.mainButton, loading && styles.mainButtonDisabled]} 
            onPress={handleAuth}
            disabled={loading}
          >
            <Text style={styles.mainButtonText}>
              {loading ? "Chargement..." : (isLogin ? "Se connecter" : "Créer mon compte")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.switchButton} onPress={() => setIsLogin(!isLogin)}>
            <Text style={styles.switchButtonText}>
              {isLogin ? "Pas encore de compte ? S'inscrire" : "Déjà un compte ? Se connecter"}
            </Text>
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFBF5' },
  keyboardView: { flex: 1, justifyContent: 'center', paddingHorizontal: 30 },
  logoContainer: { alignItems: 'center', marginBottom: 50 },
  iconWrapper: { width: 90, height: 90, borderRadius: 30, backgroundColor: '#FF7A41', justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#FF7A41', shadowOpacity: 0.4, shadowRadius: 15, shadowOffset: { width: 0, height: 8 }, marginBottom: 20 },
  title: { fontSize: 32, fontWeight: '900', color: '#1e293b', letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: '#64748b', marginTop: 5 },
  formContainer: { width: '100%' },
  inputGroup: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, marginBottom: 15, paddingHorizontal: 15, height: 55, borderWidth: 1, borderColor: '#f1f5f9', elevation: 2, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: '#1e293b' },
  mainButton: { backgroundColor: '#FF7A41', borderRadius: 16, height: 55, justifyContent: 'center', alignItems: 'center', marginTop: 10, elevation: 4, shadowColor: '#FF7A41', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 5 } },
  mainButtonDisabled: { opacity: 0.7 },
  mainButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  switchButton: { marginTop: 20, alignItems: 'center' },
  switchButtonText: { color: '#64748b', fontSize: 15, fontWeight: '600' },
});