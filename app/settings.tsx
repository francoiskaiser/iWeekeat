import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert, TextInput } from 'react-native';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext'; // 1. L'import magique

export default function SettingsScreen() {
  const { user } = useAuth();
  const [newGroupCode, setNewGroupCode] = useState(user?.user_metadata?.group_id || '');
  
  // 2. On récupère isDarkMode ET toggleTheme
  const { isDarkMode, toggleTheme } = useTheme();

  // 3. On prépare les couleurs dynamiques
  const backgroundColor = isDarkMode ? '#1e293b' : '#FFFBF5';
  const textColor = isDarkMode ? '#f8fafc' : '#1e293b';
  const inputBgColor = isDarkMode ? '#334155' : '#fff';
  const inputBorderColor = isDarkMode ? '#475569' : '#ddd';

  const updateGroupCode = async () => {
    const codeToSave = newGroupCode.trim().toUpperCase(); 
    if (!codeToSave) return;

    Alert.alert(
      "Changer de famille",
      "Attention : en changeant de code, vous rejoindrez un nouvel espace familial. Continuer ?",
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "Changer", 
          onPress: async () => {
            const { error } = await supabase.auth.updateUser({
              data: { group_id: codeToSave }
            });
            if (error) Alert.alert("Erreur", error.message);
            else Alert.alert("Succès", "Code de groupe mis à jour !");
          }
        }
      ]
    );
  };

  const updatePassword = () => {
    supabase.auth.resetPasswordForEmail(user?.email || '');
    Alert.alert("Email envoyé", "Vérifiez vos emails pour changer votre mot de passe.");
  };

  return (
    // 4. On applique la couleur de fond dynamique au conteneur principal
    <View style={[styles.container, { backgroundColor }]}>
      
      {/* 5. On applique la couleur du texte dynamique */}
      <Text style={[styles.title, { color: textColor }]}>Paramètres</Text>

      <View style={styles.section}>
        <Text style={[styles.label, { color: textColor }]}>Code de groupe</Text>
        <TextInput 
          style={[
            styles.input, 
            { backgroundColor: inputBgColor, borderColor: inputBorderColor, color: textColor }
          ]} 
          value={newGroupCode} 
          onChangeText={setNewGroupCode}
          autoCapitalize="characters" 
          placeholderTextColor={isDarkMode ? '#94a3b8' : '#999'}
        />
        <TouchableOpacity style={styles.button} onPress={updateGroupCode}>
          <Text style={styles.buttonText}>Enregistrer le code</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={[styles.label, { color: textColor }]}>Sécurité</Text>
        <TouchableOpacity style={styles.button} onPress={updatePassword}>
          <Text style={styles.buttonText}>Changer mon mot de passe</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <Text style={[styles.label, { color: textColor }]}>Mode sombre</Text>
        {/* L'interrupteur est maintenant connecté à toggleTheme */}
        <Switch value={isDarkMode} onValueChange={toggleTheme} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 }, // J'ai retiré le backgroundColor fixe ici
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, marginTop: 40 },
  section: { marginBottom: 30 },
  label: { fontSize: 16, marginBottom: 10 },
  input: { padding: 15, borderRadius: 10, borderWidth: 1 }, // Retiré les couleurs fixes
  button: { backgroundColor: '#FF7A41', padding: 15, borderRadius: 10, marginTop: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }
});