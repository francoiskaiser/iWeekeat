# MealHelper — Pages améliorées (code)

Voici les 5 fichiers correspondant aux visuels validés. Toute la **logique existante
est conservée** (mêmes appels `useApp`, mêmes actions) — seul l'affichage change.

## Où coller les fichiers

Écrase les fichiers correspondants dans ton projet :

| Fichier fourni | À coller dans |
|---|---|
| `app/(tabs)/index.tsx`    | `MealHelper/app/(tabs)/index.tsx`    |
| `app/(tabs)/planner.tsx`  | `MealHelper/app/(tabs)/planner.tsx`  |
| `app/(tabs)/edit.tsx`     | `MealHelper/app/(tabs)/edit.tsx`     |
| `app/(tabs)/shopping.tsx` | `MealHelper/app/(tabs)/shopping.tsx` |
| `app/(tabs)/_layout.tsx`  | `MealHelper/app/(tabs)/_layout.tsx`  |

Puis relance : `npx expo start -c`

## Ce qui change, écran par écran

**Accueil** — carte « Ce soir » (repas du jour + actions rapides), carte progression
de la semaine (X/7 + barre), 2 raccourcis avec badges. Le menu profil (Paramètres /
Déconnexion) est inchangé.

**Semainier** — barre de progression en tête ; chaque jour a un badge date (jour +
numéro), une puce couleur = type de plat, et le **jour du jour** est mis en avant
(bordure orange, libellé « Aujourd'hui »). Les jours vides sont une zone pointillée
« + Ajouter ». L'édition inline (catégorie → plat), le menu aléatoire (dé) et la
réinitialisation fonctionnent comme avant.

**Édition** — barre de **recherche**, bouton « Nouvelle catégorie/plat/ingrédient »
bien visible, lignes avec icône + double compteur (plats · ingrédients). Le fil
d'Ariane (Catégories → Plats → Ingrédients) et l'édition/suppression sont conservés.

**Courses** — barre d'avancement du caddie (X/Y), boutons Générer + Placards compacts
sur une ligne, articles « à prendre » en haut et **articles cochés repliés** en bas
(« Déjà pris »). Section Côté Maison + réserve + assistant « Vérifier les placards »
inchangés.

**Navigation** — barre à pastille active extensible (style validé 1c), icône
« restaurant » pour Plats.

## Notes

- **Regroupement par rayon** (courses) : je l'ai remplacé par le repli des articles
  déjà cochés, car l'app n'a pas de donnée « rayon » par ingrédient. Si tu veux un vrai
  classement par rayon, il faut ajouter un champ « rayon » aux ingrédients — dis-le moi
  et je l'ajoute (modèle + écran d'édition).
- Aucune nouvelle dépendance n'est requise (pas de SVG ni de lib externe ajoutée).
- Le mode sombre reste géré partout (via `useTheme`).
- Si tu avais retiré `@supabase/supabase-js`, garde le stub `utils/supabase.ts` : le
  menu de l'accueil l'utilise encore pour la déconnexion.
