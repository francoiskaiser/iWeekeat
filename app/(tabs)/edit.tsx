import { useMemo, useRef, useState } from "react";
import { ScrollView, Text, View, StyleSheet, TouchableOpacity, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from '@expo/vector-icons';
import { useApp } from "@/context/AppContext";
import { useTheme } from '@/context/ThemeContext';

type EditLevel = "categories" | "dishes" | "ingredients";

export default function EditScreen() {
  const { isDarkMode } = useTheme();

  const bgColor = isDarkMode ? '#1e293b' : '#FFFBF5';
  const textColor = isDarkMode ? '#f8fafc' : '#1e293b';
  const cardBgColor = isDarkMode ? '#334155' : '#fff';
  const subTextColor = isDarkMode ? '#94a3b8' : '#64748b';
  const borderColor = isDarkMode ? '#475569' : '#f1f5f9';
  const searchBg = isDarkMode ? '#0f172a' : '#f8fafc';

  const { data, addCategory, updateCategory, deleteCategory, addDish, updateDish, deleteDish, addIngredient, updateIngredient, deleteIngredient } = useApp();

  const [level, setLevel] = useState<EditLevel>("categories");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedDishId, setSelectedDishId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const inputRef = useRef<TextInput>(null);

  const selectedCategory = data.categories.find((c) => c.id === selectedCategoryId);
  const selectedDish = data.dishes.find((d) => d.id === selectedDishId);
  const dishesInCategory = useMemo(() => data.dishes.filter((d) => d.categoryId === selectedCategoryId), [data.dishes, selectedCategoryId]);
  const ingredientsInDish = useMemo(() => data.ingredients.filter((i) => i.dishId === selectedDishId), [data.ingredients, selectedDishId]);

  const q = search.trim().toLowerCase();
  const shownCategories = useMemo(() => data.categories.filter((c) => c.name.toLowerCase().includes(q)), [data.categories, q]);
  const shownDishes = useMemo(() => dishesInCategory.filter((d) => d.name.toLowerCase().includes(q)), [dishesInCategory, q]);
  const shownIngredients = useMemo(() => ingredientsInDish.filter((i) => i.name.toLowerCase().includes(q)), [ingredientsInDish, q]);

  const resetInput = () => { setInputValue(""); setEditingId(null); };
  const focusInput = () => { inputRef.current?.focus(); };

  const handleSubmit = () => {
    const value = inputValue.trim();
    if (!value) return;
    if (level === "categories") { if (editingId) updateCategory(editingId, value); else addCategory(value); }
    else if (level === "dishes" && selectedCategoryId) { if (editingId) updateDish(editingId, value); else addDish(selectedCategoryId, value); }
    else if (level === "ingredients" && selectedDishId) { if (editingId) updateIngredient(editingId, value); else addIngredient(selectedDishId, value); }
    resetInput();
  };

  const startEdit = (id: string, name: string) => { setEditingId(id); setInputValue(name); focusInput(); };
  const goToCategories = () => { setLevel("categories"); setSelectedCategoryId(null); setSelectedDishId(null); resetInput(); setSearch(""); };
  const goToDishes = (categoryId: string) => { setLevel("dishes"); setSelectedCategoryId(categoryId); setSelectedDishId(null); resetInput(); setSearch(""); };
  const goToIngredients = (dishId: string) => { setLevel("ingredients"); setSelectedDishId(dishId); resetInput(); setSearch(""); };

  const getTitle = () => level === "categories" ? "Mes plats" : level === "dishes" ? (selectedCategory?.name ?? "Plats") : (selectedDish?.name ?? "Ingrédients");
  const getPlaceholder = () => level === "categories" ? "Ex: Pâtes, Riz, Soupes…" : level === "dishes" ? "Ex: Carbonara, Bolognaise…" : "Ex: Lardons, Crème, Riz…";
  const getSearchPlaceholder = () => level === "categories" ? "Rechercher une catégorie…" : level === "dishes" ? "Rechercher un plat…" : "Rechercher un ingrédient…";
  const getAddLabel = () => {
    if (editingId) return "Enregistrer";
    if (level === "categories") return "Nouvelle catégorie";
    if (level === "dishes") return "Nouveau plat";
    return "Nouvel ingrédient";
  };
  const levelIcon = level === "categories" ? "grid" : level === "dishes" ? "restaurant" : "leaf";

  const Breadcrumb = () => (
    <View style={styles.breadcrumb}>
      <TouchableOpacity onPress={goToCategories} style={styles.crumb}>
        <Ionicons name="grid" size={13} color={level === "categories" ? "#FF7A41" : subTextColor} />
        <Text style={[styles.crumbText, { color: level === "categories" ? "#FF7A41" : subTextColor }]}>Catégories</Text>
      </TouchableOpacity>
      {selectedCategoryId && (<>
        <Ionicons name="chevron-forward" size={13} color="#cbd5e1" />
        <TouchableOpacity onPress={() => goToDishes(selectedCategoryId)} style={styles.crumb}>
          <Text style={[styles.crumbText, { color: level === "dishes" ? "#FF7A41" : subTextColor }]}>{selectedCategory?.name ?? "Plats"}</Text>
        </TouchableOpacity>
      </>)}
      {selectedDishId && level === "ingredients" && (<>
        <Ionicons name="chevron-forward" size={13} color="#cbd5e1" />
        <Text style={[styles.crumbText, { color: "#FF7A41" }]}>{selectedDish?.name ?? "Ingr."}</Text>
      </>)}
    </View>
  );

  const RowCard = ({ icon, title, subtitle, onPress, onDelete, chevron }: any) => (
    <View style={[styles.rowCard, { backgroundColor: cardBgColor }]}>
      <TouchableOpacity style={styles.rowMain} onPress={onPress} activeOpacity={0.7}>
        <View style={[styles.rowIcon, { backgroundColor: '#FF7A4115' }]}><Ionicons name={icon} size={20} color="#FF7A41" /></View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowTitle, { color: textColor }]}>{title}</Text>
          <Text style={[styles.rowSub, { color: subTextColor }]}>{subtitle}</Text>
        </View>
        {chevron && <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />}
      </TouchableOpacity>
      <TouchableOpacity onPress={onDelete} style={styles.deleteBtn}>
        <Ionicons name="trash-outline" size={18} color="#ef4444" />
      </TouchableOpacity>
    </View>
  );

  const count = level === "categories" ? shownCategories.length : level === "dishes" ? shownDishes.length : shownIngredients.length;
  const countLabel = level === "categories" ? "catégorie(s)" : level === "dishes" ? "plat(s)" : "ingrédient(s)";

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Garde-manger</Text>
          <Text style={[styles.title, { color: textColor }]}>{getTitle()}</Text>
        </View>
        <View style={[styles.profileBadge, { backgroundColor: cardBgColor }]}>
          <Ionicons name={levelIcon as any} size={22} color="#FF7A41" />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Breadcrumb />

        {/* Recherche */}
        <View style={[styles.searchBar, { backgroundColor: searchBg }]}>
          <Ionicons name="search" size={18} color="#94a3b8" />
          <TextInput style={[styles.searchInput, { color: textColor }]} placeholder={getSearchPlaceholder()} placeholderTextColor="#94a3b8" value={search} onChangeText={setSearch} />
          {search.length > 0 && <TouchableOpacity onPress={() => setSearch("")}><Ionicons name="close-circle" size={18} color="#cbd5e1" /></TouchableOpacity>}
        </View>

        {/* Champ d'ajout / édition */}
        <View style={[styles.addRow, { backgroundColor: cardBgColor, borderColor: editingId ? '#FF7A41' : borderColor }]}>
          <Ionicons name={editingId ? "pencil" : "add"} size={20} color={editingId ? "#FF7A41" : "#94a3b8"} />
          <TextInput ref={inputRef} style={[styles.addInput, { color: textColor }]} placeholder={getPlaceholder()} placeholderTextColor="#94a3b8" value={inputValue} onChangeText={setInputValue} onSubmitEditing={handleSubmit} returnKeyType="done" />
        </View>
        <TouchableOpacity style={[styles.addBtn, !inputValue.trim() && styles.addBtnDisabled]} onPress={handleSubmit} disabled={!inputValue.trim()}>
          <Ionicons name={editingId ? "save-outline" : "add-circle"} size={20} color="#fff" />
          <Text style={styles.addBtnText}>{getAddLabel()}</Text>
        </TouchableOpacity>
        {editingId && (
          <TouchableOpacity style={styles.cancelBtn} onPress={resetInput}>
            <Text style={styles.cancelBtnText}>Annuler la modification</Text>
          </TouchableOpacity>
        )}

        {/* Compteur + retour */}
        <View style={styles.listHeader}>
          <Text style={[styles.listCount, { color: textColor }]}>{count} {countLabel}</Text>
          {level !== "categories" && (
            <TouchableOpacity onPress={() => { if (level === "ingredients" && selectedCategoryId) goToDishes(selectedCategoryId); else goToCategories(); }} style={styles.backLink}>
              <Ionicons name="arrow-back" size={15} color={subTextColor} />
              <Text style={[styles.backLinkText, { color: subTextColor }]}>Retour</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Listes */}
        {level === "categories" && (shownCategories.length === 0 ? (
          <EmptyState icon="folder-open-outline" text={q ? "Aucun résultat." : "Aucune catégorie."} color={subTextColor} />
        ) : shownCategories.map((cat) => {
          const dishes = data.dishes.filter((d) => d.categoryId === cat.id);
          const ingCount = data.ingredients.filter((i) => dishes.some((d) => d.id === i.dishId)).length;
          return <RowCard key={cat.id} icon="restaurant" title={cat.name} subtitle={`${dishes.length} plats · ${ingCount} ingrédients`} onPress={() => goToDishes(cat.id)} onDelete={() => deleteCategory(cat.id)} chevron />;
        }))}

        {level === "dishes" && (shownDishes.length === 0 ? (
          <EmptyState icon="restaurant-outline" text={q ? "Aucun résultat." : "Aucun plat dans cette catégorie."} color={subTextColor} />
        ) : shownDishes.map((dish) => (
          <RowCard key={dish.id} icon="fast-food" title={dish.name} subtitle={`${data.ingredients.filter((i) => i.dishId === dish.id).length} ingrédient(s)`} onPress={() => goToIngredients(dish.id)} onDelete={() => deleteDish(dish.id)} chevron />
        )))}

        {level === "ingredients" && (shownIngredients.length === 0 ? (
          <EmptyState icon="nutrition-outline" text={q ? "Aucun résultat." : "Aucun ingrédient pour ce plat."} color={subTextColor} />
        ) : shownIngredients.map((ing) => (
          <RowCard key={ing.id} icon="leaf" title={ing.name} subtitle="Toucher pour modifier" onPress={() => startEdit(ing.id, ing.name)} onDelete={() => deleteIngredient(ing.id)} chevron={false} />
        )))}
      </ScrollView>
    </SafeAreaView>
  );
}

function EmptyState({ icon, text, color }: { icon: any; text: string; color: string }) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name={icon} size={40} color={color} />
      <Text style={[styles.emptyText, { color }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25, paddingVertical: 20 },
  welcomeText: { fontSize: 15, color: '#64748b', fontWeight: '600' },
  title: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5, marginTop: 2 },
  profileBadge: { padding: 11, borderRadius: 15, elevation: 2, shadowColor: '#FF7A41', shadowOpacity: 0.1, shadowRadius: 10 },
  scrollContainer: { paddingHorizontal: 20, paddingBottom: 120 },

  breadcrumb: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 14, paddingHorizontal: 4 },
  crumb: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  crumbText: { fontSize: 12, fontWeight: '700' },

  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, paddingHorizontal: 14, height: 46, marginBottom: 14 },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '600' },

  addRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, paddingHorizontal: 15, height: 52, borderWidth: 1, marginBottom: 10 },
  addInput: { flex: 1, fontSize: 16 },
  addBtn: { backgroundColor: '#10B981', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 14, borderRadius: 16, gap: 10, elevation: 4, shadowColor: '#10B981', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  addBtnDisabled: { backgroundColor: '#cbd5e1', shadowOpacity: 0, elevation: 0 },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  cancelBtn: { paddingVertical: 12, alignItems: 'center', marginTop: 6 },
  cancelBtnText: { color: '#ef4444', fontSize: 14, fontWeight: '700' },

  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 22, marginBottom: 12, paddingHorizontal: 4 },
  listCount: { fontSize: 15, fontWeight: '800' },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backLinkText: { fontSize: 13, fontWeight: '700' },

  rowCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, paddingRight: 12, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
  rowIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 16, fontWeight: '800' },
  rowSub: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  deleteBtn: { backgroundColor: '#fef2f2', padding: 9, borderRadius: 11 },

  emptyState: { padding: 40, alignItems: 'center', justifyContent: 'center' },
  emptyText: { marginTop: 10, fontSize: 15, textAlign: 'center' },
});
