import { useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { REPORT_THRESHOLD } from '@/utils/recipes';

/**
 * Charte de la communaute. Google Play impose que les utilisateurs acceptent
 * des conditions avant de publier du contenu visible par les autres : elle
 * est donc presentee avant la premiere publication, et reste consultable
 * depuis les parametres.
 */
export const COMMUNITY_RULES: { icon: string; text: string }[] = [
  { icon: 'restaurant-outline', text: "Partagez de vraies recettes de cuisine, que vous avez le droit de publier : pas de copie d'un livre ou d'un site sans autorisation." },
  { icon: 'heart-outline', text: 'Restez respectueux : aucun propos injurieux, haineux, discriminatoire, violent ou à caractère sexuel.' },
  { icon: 'megaphone-outline', text: 'Pas de publicité, de spam ni de liens commerciaux.' },
  { icon: 'lock-closed-outline', text: "N'indiquez aucune information personnelle (adresse, téléphone, e-mail) dans vos recettes." },
  { icon: 'eye-outline', text: "Vos recettes sont visibles par tous les utilisateurs d'iWeekeat, avec votre prénom." },
  { icon: 'flag-outline', text: `Chacun peut signaler une recette. Après ${REPORT_THRESHOLD} signalements, elle est masquée en attendant une vérification. Un contenu ou un compte qui ne respecte pas cette charte peut être supprimé.` },
  { icon: 'ban-outline', text: "Vous pouvez bloquer un auteur : ses recettes ne vous sont plus montrées. Les auteurs bloqués se gèrent dans les paramètres." },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Absent : simple consultation, sans bouton d'acceptation. */
  onAccept?: () => Promise<void>;
}

export function CommunityRules({ visible, onClose, onAccept }: Props) {
  const { background, text, subText, card, border } = useThemeColors();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = async () => {
    if (!onAccept) return;
    setBusy(true);
    setError(null);
    try {
      await onAccept();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: background }]}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>Communauté</Text>
            <Text style={[styles.title, { color: text }]}>Charte de partage</Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="close-circle" size={32} color="#cbd5e1" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {onAccept && (
            <Text style={[styles.intro, { color: subText }]}>
              Avant de publier votre première recette, merci de lire et d&apos;accepter ces quelques règles.
            </Text>
          )}

          {COMMUNITY_RULES.map((rule) => (
            <View key={rule.text} style={[styles.rule, { backgroundColor: card, borderColor: border }]}>
              <Ionicons name={rule.icon as any} size={20} color="#FF7A41" />
              <Text style={[styles.ruleText, { color: text }]}>{rule.text}</Text>
            </View>
          ))}

          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color="#ef4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {onAccept && (
            <TouchableOpacity style={styles.acceptBtn} onPress={accept} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Ionicons name="checkmark-circle" size={20} color="#fff" />}
              <Text style={styles.acceptText}>J&apos;accepte la charte</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, paddingTop: 14, paddingBottom: 8 },
  eyebrow: { fontSize: 13, color: '#FF7A41', fontWeight: '700' },
  title: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5, marginTop: 2 },
  scroll: { paddingHorizontal: 22, paddingBottom: 60, paddingTop: 8 },
  intro: { fontSize: 15, lineHeight: 22, marginBottom: 16 },
  rule: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  ruleText: { flex: 1, fontSize: 14, lineHeight: 20 },
  errorBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#fef2f2', borderColor: '#fecaca', borderWidth: 1, borderRadius: 14, padding: 12, marginTop: 8 },
  errorText: { flex: 1, color: '#b91c1c', fontSize: 14, lineHeight: 19, fontWeight: '600' },
  acceptBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#10B981', borderRadius: 16, paddingVertical: 16, marginTop: 18 },
  acceptText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
