import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useRecipes } from '@/context/RecipesContext';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { RECIPE_CATEGORIES, categoryIcon, categoryLabel } from '@/constants/recipes';
import { averageStars, rankingScore } from '@/utils/recipes';
import type { Recipe, RecipeCategory } from '@/types';
import { RatingSummary } from './StarRating';

type Filter = 'all' | 'mine' | RecipeCategory;
type Sort = 'top' | 'new' | 'quick';

const SORTS: { id: Sort; label: string; icon: string }[] = [
  { id: 'top', label: 'Mieux notées', icon: 'star' },
  { id: 'new', label: 'Nouveautés', icon: 'sparkles' },
  { id: 'quick', label: 'Plus rapides', icon: 'timer' },
];

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

interface Props {
  onOpen: (recipe: Recipe) => void;
  onCreate: () => void;
}

export function RecipeCatalog({ onOpen, onCreate }: Props) {
  const { isDarkMode, text, subText, card, border } = useThemeColors();
  const searchBg = isDarkMode ? '#0f172a' : '#f8fafc';
  const { recipes, stats, loading, error, ensureLoaded, refresh } = useRecipes();
  const { data } = useApp();
  const { user } = useAuth();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('top');

  useEffect(() => { ensureLoaded(); }, [ensureLoaded]);

  const inPantry = useMemo(
    () => new Set(data.dishes.map((d) => d.recipeId).filter(Boolean) as string[]),
    [data.dishes],
  );

  const shown = useMemo(() => {
    const q = normalize(search.trim());
    const list = recipes.filter((r) => {
      if (filter === 'mine' && r.authorUid !== user?.uid) return false;
      if (filter !== 'all' && filter !== 'mine' && r.category !== filter) return false;
      if (!q) return true;
      // On cherche aussi dans les ingredients : "courgette" trouve la ratatouille.
      return normalize(r.title).includes(q) || r.ingredients.some((i) => normalize(i.name).includes(q));
    });

    return list.sort((a, b) => {
      if (sort === 'quick') return a.minutes - b.minutes || a.title.localeCompare(b.title, 'fr');
      if (sort === 'new') {
        // Les recettes par defaut n'ont pas de date : elles passent apres la communaute.
        return (b.createdAt ?? 0) - (a.createdAt ?? 0) || a.title.localeCompare(b.title, 'fr');
      }
      return rankingScore(stats[b.id]) - rankingScore(stats[a.id]) || a.title.localeCompare(b.title, 'fr');
    });
  }, [recipes, stats, search, filter, sort, user?.uid]);

  const filters: { id: Filter; label: string }[] = [
    { id: 'all', label: 'Toutes' },
    ...RECIPE_CATEGORIES.map((c) => ({ id: c.id as Filter, label: c.label })),
    { id: 'mine', label: 'Mes recettes' },
  ];

  const header = (
    <View>
      <View style={[styles.searchBar, { backgroundColor: searchBg }]}>
        <Ionicons name="search" size={18} color="#94a3b8" />
        <TextInput
          style={[styles.searchInput, { color: text }]}
          placeholder="Rechercher une recette ou un ingrédient…"
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color="#cbd5e1" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        {filters.map((f) => {
          const active = f.id === filter;
          return (
            <TouchableOpacity
              key={f.id}
              onPress={() => setFilter(f.id)}
              style={[styles.chip, { backgroundColor: card, borderColor: border }, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, { color: active ? '#fff' : text }]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.sortRow}>
        {SORTS.map((s) => {
          const active = s.id === sort;
          return (
            <TouchableOpacity key={s.id} onPress={() => setSort(s.id)} style={styles.sortBtn}>
              <Ionicons name={s.icon as any} size={13} color={active ? '#FF7A41' : subText} />
              <Text style={[styles.sortText, { color: active ? '#FF7A41' : subText }]}>{s.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity style={styles.createBtn} onPress={onCreate}>
        <Ionicons name="add-circle" size={20} color="#fff" />
        <Text style={styles.createText}>Proposer une recette</Text>
      </TouchableOpacity>

      {error && (
        <TouchableOpacity style={styles.errorBox} onPress={refresh}>
          <Ionicons name="cloud-offline-outline" size={18} color="#b45309" />
          <Text style={styles.errorText}>
            {error} Les recettes iWeekeat restent disponibles. Toucher pour réessayer.
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.listHeader}>
        <Text style={[styles.count, { color: text }]}>{shown.length} recette(s)</Text>
        {loading && <ActivityIndicator size="small" color="#FF7A41" />}
      </View>
    </View>
  );

  return (
    <FlatList
      data={shown}
      keyExtractor={(r) => r.id}
      ListHeaderComponent={header}
      contentContainerStyle={styles.list}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} tintColor="#FF7A41" />}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name={filter === 'mine' ? 'create-outline' : 'search-outline'} size={40} color={subText} />
          <Text style={[styles.emptyText, { color: subText }]}>
            {filter === 'mine' ? "Vous n'avez pas encore publié de recette." : 'Aucune recette ne correspond.'}
          </Text>
        </View>
      }
      renderItem={({ item }) => {
        const s = stats[item.id];
        const added = inPantry.has(item.id);
        return (
          <TouchableOpacity style={[styles.row, { backgroundColor: card }]} onPress={() => onOpen(item)} activeOpacity={0.75}>
            <View style={styles.rowIcon}>
              <Ionicons name={categoryIcon(item.category) as any} size={20} color="#FF7A41" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: text }]} numberOfLines={2}>{item.title}</Text>
              <View style={styles.rowMeta}>
                <Text style={[styles.rowSub, { color: subText }]}>
                  {item.minutes} min · {categoryLabel(item.category)}
                </Text>
                <RatingSummary average={averageStars(s)} count={s?.count ?? 0} color={subText} />
              </View>
              <Text style={[styles.rowAuthor, { color: subText }]} numberOfLines={1}>
                {item.source === 'default'
                  ? 'Recette iWeekeat'
                  : item.authorUid === user?.uid
                    ? item.hidden ? 'Par vous · masquée (signalée)' : 'Par vous'
                    : `Par ${item.authorName ?? 'un membre'}`}
              </Text>
            </View>
            {added
              ? <Ionicons name="checkmark-circle" size={22} color="#10B981" accessibilityLabel="Dans mes plats" />
              : <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />}
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 20, paddingBottom: 240 },

  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, paddingHorizontal: 14, height: 46, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '600' },

  chipsRow: { gap: 8, paddingBottom: 4, paddingRight: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipActive: { backgroundColor: '#FF7A41', borderColor: '#FF7A41' },
  chipText: { fontSize: 13, fontWeight: '700' },

  sortRow: { flexDirection: 'row', gap: 16, marginTop: 12, marginBottom: 14, paddingHorizontal: 4 },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sortText: { fontSize: 12, fontWeight: '800' },

  createBtn: { backgroundColor: '#10B981', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 13, borderRadius: 16, gap: 8 },
  createText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  errorBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#fffbeb', borderColor: '#fde68a', borderWidth: 1, borderRadius: 14, padding: 12, marginTop: 12 },
  errorText: { flex: 1, color: '#92400e', fontSize: 13, lineHeight: 18, fontWeight: '600' },

  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 12, paddingHorizontal: 4 },
  count: { fontSize: 15, fontWeight: '800' },

  row: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 16, padding: 14, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
  rowIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF7A4115' },
  rowTitle: { fontSize: 16, fontWeight: '800' },
  rowMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginTop: 3 },
  rowSub: { fontSize: 12, fontWeight: '500' },
  rowAuthor: { fontSize: 11, fontWeight: '600', marginTop: 3 },

  empty: { padding: 40, alignItems: 'center' },
  emptyText: { marginTop: 10, fontSize: 15, textAlign: 'center' },
});
