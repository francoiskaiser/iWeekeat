import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useRecipes } from '@/context/RecipesContext';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { categoryIcon, categoryLabel } from '@/constants/recipes';
import { averageStars } from '@/utils/recipes';
import type { Recipe } from '@/types';
import { RatingSummary, StarInput } from './StarRating';
import { PRIMARY, SUCCESS, DANGER } from '@/constants/theme';

const REPORT_REASONS = [
  'Contenu inapproprié ou offensant',
  'Spam ou publicité',
  "Ce n'est pas une recette",
  'Recette copiée sans autorisation',
];

interface Props {
  recipe: Recipe | null;
  onClose: () => void;
  onEdit: (recipe: Recipe) => void;
}

export function RecipeDetail({ recipe, onClose, onEdit }: Props) {
  const { accent } = useThemeColors();
  const { isDarkMode, background, text, subText, card, border } = useThemeColors();
  const { stats, myRatings, loadMyRating, rate, report, block, remove } = useRecipes();
  const { data, addRecipeToPantry, toggleFavoriteRecipe } = useApp();
  const { user } = useAuth();

  const [ratingBusy, setRatingBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [reporting, setReporting] = useState(false);
  const [reportBusy, setReportBusy] = useState(false);

  const recipeId = recipe?.id;
  useEffect(() => {
    setMessage(null);
    setReporting(false);
    if (recipeId) loadMyRating(recipeId);
    // loadMyRating change quand une note arrive : on ne recharge qu'au changement de recette.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipeId]);

  if (!recipe) return null;

  const isMine = recipe.source === 'community' && recipe.authorUid === user?.uid;
  const isCommunity = recipe.source === 'community';
  const recipeStats = stats[recipe.id];
  const myStars = myRatings[recipe.id] ?? null;
  const inPantry = data.dishes.some((d) => d.recipeId === recipe.id);
  const isFavorite = (data.favoriteRecipeIds ?? []).includes(recipe.id);

  const onRate = async (stars: number) => {
    setRatingBusy(true);
    setMessage(null);
    try {
      await rate(recipe.id, stars);
      setMessage({ kind: 'ok', text: 'Merci pour ta note !' });
    } catch (e) {
      setMessage({ kind: 'error', text: (e as Error).message });
    } finally {
      setRatingBusy(false);
    }
  };

  const onAdd = () => {
    const { alreadyThere } = addRecipeToPantry(recipe);
    setMessage({
      kind: 'ok',
      text: alreadyThere
        ? 'Ce plat est déjà dans tes plats.'
        : `Ajouté à tes plats (${categoryLabel(recipe.category)}). Tu peux le choisir dans le semainier.`,
    });
  };

  const onReport = async (reason: string) => {
    setReportBusy(true);
    try {
      const done = await report(recipe.id, reason);
      setReporting(false);
      Alert.alert(
        done ? 'Merci pour ton signalement' : 'Déjà signalée',
        done
          ? "La recette ne t'est plus montrée. Elle sera vérifiée et retirée si elle ne respecte pas la charte."
          : 'Tu avais déjà signalé cette recette.',
      );
      onClose();
    } catch (e) {
      setMessage({ kind: 'error', text: (e as Error).message });
    } finally {
      setReportBusy(false);
    }
  };

  const onBlock = () => {
    if (!recipe.authorUid) return;
    Alert.alert(
      `Bloquer ${recipe.authorName ?? 'cet auteur'} ?`,
      'Ses recettes ne te seront plus montrées. Tu pourras le débloquer depuis les paramètres.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Bloquer',
          style: 'destructive',
          onPress: async () => {
            try {
              await block(recipe.authorUid!);
              onClose();
            } catch (e) {
              setMessage({ kind: 'error', text: (e as Error).message });
            }
          },
        },
      ],
    );
  };

  const onDelete = () => {
    Alert.alert('Supprimer la recette ?', "Elle disparaîtra du catalogue pour tout le monde. Les foyers qui l'ont ajoutée gardent leur plat.", [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await remove(recipe.id);
            onClose();
          } catch (e) {
            setMessage({ kind: 'error', text: (e as Error).message });
          }
        },
      },
    ]);
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: background }]}>
        <View style={styles.header}>
          <View style={styles.eyebrowRow}>
            <Ionicons name={categoryIcon(recipe.category) as any} size={14} color={accent} />
            <Text style={[styles.eyebrow, { color: accent }]}>{categoryLabel(recipe.category)}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => toggleFavoriteRecipe(recipe.id)}
              style={styles.iconBtn}
              accessibilityRole="button"
              accessibilityLabel={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              accessibilityState={{ selected: isFavorite }}
            >
              <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={28} color={isFavorite ? '#E11D48' : '#94a3b8'} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Fermer">
              <Ionicons name="close-circle" size={32} color="#cbd5e1" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={[styles.title, { color: text }]}>{recipe.title}</Text>

          <View style={styles.metaRow}>
            <Meta icon="time-outline" label={`${recipe.minutes} min`} color={subText} />
            <Meta icon="people-outline" label={`${recipe.servings} pers.`} color={subText} />
            <RatingSummary average={averageStars(recipeStats)} count={recipeStats?.count ?? 0} color={subText} />
          </View>
          <Text style={[styles.author, { color: subText }]}>
            {isCommunity ? `Proposée par ${isMine ? 'toi' : recipe.authorName ?? 'un membre'}` : "Recette iWeekeat"}
          </Text>

          {isMine && recipe.hidden && (
            <View style={styles.warnBox}>
              <Ionicons name="eye-off-outline" size={18} color="#b45309" />
              <Text style={styles.warnText}>
                Cette recette a été signalée plusieurs fois : elle est masquée pour les autres en attendant une vérification.
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.addBtn, inPantry && styles.addBtnDone]}
            onPress={onAdd}
            disabled={inPantry}
          >
            <Ionicons name={inPantry ? 'checkmark-circle' : 'add-circle'} size={20} color="#fff" />
            <Text style={styles.addBtnText}>{inPantry ? 'Dans mes plats' : 'Ajouter à mes plats'}</Text>
          </TouchableOpacity>

          {message && (
            <View style={[styles.messageBox, message.kind === 'error' ? styles.messageError : styles.messageOk]}>
              <Ionicons
                name={message.kind === 'error' ? 'alert-circle' : 'checkmark-circle'}
                size={18}
                color={message.kind === 'error' ? DANGER : '#059669'}
              />
              <Text style={[styles.messageText, { color: message.kind === 'error' ? '#b91c1c' : '#047857' }]}>{message.text}</Text>
            </View>
          )}

          <Text style={[styles.section, { color: text }]}>Ingrédients</Text>
          <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
            {recipe.ingredients.map((ing, i) => (
              <View key={`${ing.name}-${i}`} style={[styles.ingRow, i > 0 && { borderTopColor: border, borderTopWidth: 1 }]}>
                <Text style={[styles.ingName, { color: text }]}>{ing.name}</Text>
                {ing.quantity ? <Text style={[styles.ingQty, { color: subText }]}>{ing.quantity}</Text> : null}
              </View>
            ))}
          </View>

          <Text style={[styles.section, { color: text }]}>Préparation</Text>
          {recipe.steps.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>{i + 1}</Text></View>
              <Text style={[styles.stepText, { color: text }]}>{step}</Text>
            </View>
          ))}

          {!isMine && (
            <>
              <Text style={[styles.section, { color: text }]}>Ta note</Text>
              <View style={[styles.card, styles.rateCard, { backgroundColor: card, borderColor: border }]}>
                <StarInput value={myStars} onChange={onRate} disabled={ratingBusy} />
                <Text style={[styles.rateHelp, { color: subText }]}>
                  {myStars ? 'Touche une étoile pour changer ta note.' : 'Les recettes les mieux notées remontent en tête du catalogue.'}
                </Text>
              </View>
            </>
          )}

          {isMine && (
            <View style={styles.ownerRow}>
              <TouchableOpacity style={[styles.ghostBtn, { borderColor: border }]} onPress={() => onEdit(recipe)}>
                <Ionicons name="pencil" size={17} color={accent} />
                <Text style={[styles.ghostText, { color: text }]}>Modifier</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.ghostBtn, styles.dangerBorder]} onPress={onDelete}>
                <Ionicons name="trash-outline" size={17} color={DANGER} />
                <Text style={styles.dangerText}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          )}

          {isCommunity && !isMine && (
            <View style={styles.moderation}>
              {!reporting ? (
                <View style={styles.ownerRow}>
                  <TouchableOpacity style={[styles.ghostBtn, styles.dangerBorder]} onPress={() => setReporting(true)}>
                    <Ionicons name="flag-outline" size={17} color={DANGER} />
                    <Text style={styles.dangerText}>Signaler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.ghostBtn, { borderColor: border }]} onPress={onBlock}>
                    <Ionicons name="ban-outline" size={17} color={subText} />
                    <Text style={[styles.ghostText, { color: subText }]}>Bloquer l&apos;auteur</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={[styles.card, { backgroundColor: card, borderColor: border, padding: 14, marginTop: 24 }]}>
                  <Text style={[styles.reportTitle, { color: text }]}>Pourquoi signales-tu cette recette ?</Text>
                  {REPORT_REASONS.map((reason) => (
                    <TouchableOpacity
                      key={reason}
                      style={[styles.reasonBtn, { borderColor: border, backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc' }]}
                      onPress={() => onReport(reason)}
                      disabled={reportBusy}
                    >
                      <Text style={[styles.reasonText, { color: text }]}>{reason}</Text>
                      <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
                    </TouchableOpacity>
                  ))}
                  {reportBusy ? (
                    <ActivityIndicator color={accent} style={{ marginTop: 10 }} />
                  ) : (
                    <TouchableOpacity onPress={() => setReporting(false)} style={styles.cancelLink}>
                      <Text style={[styles.cancelText, { color: subText }]}>Annuler</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function Meta({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <View style={styles.meta}>
      <Ionicons name={icon as any} size={14} color={color} />
      <Text style={[styles.metaText, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingTop: 14, paddingBottom: 4 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 13, color: PRIMARY, fontWeight: '700' },
  scroll: { paddingHorizontal: 22, paddingBottom: 80 },
  title: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5, marginTop: 4 },

  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginTop: 10 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13, fontWeight: '600' },
  author: { fontSize: 13, marginTop: 6 },

  warnBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#fffbeb', borderColor: '#fde68a', borderWidth: 1, borderRadius: 14, padding: 12, marginTop: 14 },
  warnText: { flex: 1, color: '#92400e', fontSize: 13, lineHeight: 18, fontWeight: '600' },

  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: SUCCESS, borderRadius: 16, paddingVertical: 15, marginTop: 18 },
  addBtnDone: { backgroundColor: '#94a3b8' },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  messageBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderWidth: 1, borderRadius: 14, padding: 12, marginTop: 12 },
  messageOk: { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' },
  messageError: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  messageText: { flex: 1, fontSize: 14, lineHeight: 19, fontWeight: '600' },

  section: { fontSize: 13, fontWeight: '800', marginTop: 24, marginBottom: 10, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  ingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  ingName: { flex: 1, fontSize: 15, fontWeight: '600' },
  ingQty: { fontSize: 14, fontWeight: '600' },

  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  stepNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  stepText: { flex: 1, fontSize: 15, lineHeight: 22, paddingTop: 3 },

  rateCard: { alignItems: 'center', paddingVertical: 18, paddingHorizontal: 16 },
  rateHelp: { fontSize: 12, marginTop: 10, textAlign: 'center' },

  ownerRow: { flexDirection: 'row', gap: 10, marginTop: 24 },
  ghostBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderRadius: 14, paddingVertical: 13 },
  ghostText: { fontSize: 14, fontWeight: '700' },
  dangerBorder: { borderColor: '#fecaca' },
  dangerText: { color: DANGER, fontSize: 14, fontWeight: '700' },

  moderation: { marginTop: 4 },
  reportTitle: { fontSize: 15, fontWeight: '800', marginBottom: 10 },
  reasonBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8 },
  reasonText: { flex: 1, fontSize: 14, fontWeight: '600' },
  cancelLink: { alignItems: 'center', paddingVertical: 10 },
  cancelText: { fontSize: 14, fontWeight: '700' },
});
