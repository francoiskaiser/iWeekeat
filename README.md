# iWeekeat

Application mobile React Native / Expo pour planifier vos repas de la semaine et générer une liste de courses optimisée.

## Prérequis

- [Node.js](https://nodejs.org/) LTS (v18 ou v20 recommandé)
- npm (inclus avec Node.js)
- [Expo Go](https://expo.dev/go) sur votre téléphone (Android ou iOS)
- Optionnel : Android Studio ou Xcode pour émulateur

## Installation et lancement

Ouvrez un terminal PowerShell dans le dossier du projet :

```powershell
cd C:\Users\franc\Documents\MealHelper
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
npm install
npx expo start
```

> **Important :** n'exécutez **pas** `npm audit fix --force` sur un projet Expo. Cette commande mélange des versions incompatibles (ex. Expo 46 + Expo 56) et casse le démarrage. Les alertes `npm audit` concernent surtout des outils de build (`@expo/cli`), pas votre app en production sur le téléphone.

Ensuite :

- Scannez le QR code avec **Expo Go** (Android) ou l'appareil photo (iOS)
- Ou appuyez sur `a` pour Android (émulateur)
- Ou appuyez sur `i` pour iOS (simulateur Mac uniquement)

Commandes utiles :

```powershell
npm run android
npm run ios
npm run web
```

## Structure du projet

```
iWeekeat/
├── app/                    # Expo Router — écrans
│   ├── _layout.tsx         # Layout racine + providers (Auth, Theme)
│   ├── login.tsx           # Connexion / inscription
│   ├── group.tsx           # Créer ou rejoindre un foyer
│   ├── settings.tsx        # Foyer, code de partage, mode sombre
│   └── (tabs)/
│       ├── index.tsx       # Accueil / tableau de bord
│       ├── calendar.tsx    # Agenda partagé du foyer
│       ├── planner.tsx     # Semainier (repas de la semaine)
│       ├── edit.tsx        # Garde-manger (catégories/plats/ingrédients)
│       └── shopping.tsx    # Liste de courses + mode Clean
├── components/             # Composants UI réutilisables
├── context/                # État global, authentification, synchronisation
├── constants/              # Jours de la semaine
├── hooks/                  # Hooks partagés (couleurs de thème)
├── types/                  # Modèles TypeScript
├── utils/                  # Firebase, synchro, dates, logique métier
└── firestore.rules         # Règles de sécurité (à publier dans la console)
```

## Fonctionnalités

### 1. Garde-manger (édition)
- Créer / modifier / supprimer des **catégories** (Pâtes, Riz…)
- Ajouter des **plats** par catégorie
- Ajouter des **ingrédients** par plat
- Données d'exemple préchargées au premier lancement

### 2. Planificateur
- 7 jours (Lundi → Dimanche)
- Sélection en cascade : **Catégorie** → **Plat**
- Menu aléatoire, partage du menu par message

### 3. Liste de courses
- Bouton **Générer** : agrège les ingrédients de la semaine
- **Dédoublonnage** automatique (ex. « Crème » une seule fois)
- Rayon « Côté Maison » pour les indispensables non alimentaires

### 4. Mode Clean (inventaire)
- Parcourt chaque ingrédient un par un
- « Oui, j'en ai » → retiré de la liste
- « Non, à acheter » → conservé
- Liste finale avec **cases à cocher** pour le supermarché

### 5. Agenda partagé
- Vue mensuelle, événements datés avec horaires ou journée entière
- Attribution à un ou plusieurs membres du foyer
- Récurrence hebdomadaire, mensuelle ou annuelle
- Le repas prévu au semainier s'affiche dans la même case
- Rappels locaux avant l'événement (notification sur chaque téléphone)

### 6. Recettes et communauté
- Onglet **Plats** à deux volets : **Mes plats** (le garde-manger du foyer) et **Recettes** (le catalogue)
- **80 recettes par défaut** (`constants/recipes.ts`), en 8 catégories : Classiques, Pâtes, Viande, Poisson, Végétarien, Soupes, Riz et céréales, Plats rapides. Elles sont embarquées dans l'app et restent consultables hors ligne
- Recherche par nom ou par ingrédient, filtres par catégorie, tri par note, nouveauté ou temps
- **Ajouter à mes plats** : la recette devient un plat du foyer, utilisable dans le semainier et la liste de courses ; « Voir la recette » reste accessible depuis le plat
- Chacun peut **proposer une recette** ou **partager un de ses plats**
- **Notes de 1 à 5 étoiles**, une par personne, modifiable. Le classement utilise une moyenne bayésienne : une seule note de 5 ne passe pas devant une recette notée 4,8 par cinquante personnes
- Modération (exigence Google Play) : charte à accepter avant la première publication, bouton **Signaler**, **Bloquer l'auteur** (gestion des auteurs bloqués dans les paramètres). Après 3 signalements, une recette est masquée automatiquement

### 7. Réglages
- Nom du foyer, membres, code de partage
- Charte de la communauté, auteurs bloqués
- Mode sombre

## Comptes et foyers

Chaque utilisateur crée un compte (e-mail + mot de passe, Firebase Auth), puis **crée un foyer** ou **rejoint** celui d'un proche avec un code à 6 caractères. Toutes les données — plats, semainier, courses, agenda — appartiennent au foyer et sont partagées entre ses membres.

## Stockage et synchronisation

L'affichage se fait toujours depuis un cache local (`@react-native-async-storage/async-storage`) : l'app s'ouvre instantanément et **reste utilisable sans réseau**, ce qui compte au supermarché.

La synchronisation avec Firestore se fait à l'ouverture de l'app, au retour au premier plan, et après chaque modification. Si le téléphone a des changements non envoyés (saisie hors ligne), ils sont poussés en priorité ; sinon le foyer fait autorité.

## Modération des recettes

Les recettes masquées après signalements attendent une vérification dans la console Firebase :

1. *Firestore Database* → collection `recipes` → filtrer sur `hidden == true`.
2. Les motifs sont dans la sous-collection `reports` de chaque recette.
3. Recette acceptable : remettre `hidden` à `false` et `reportCount` à `0`. Sinon, supprimer le document.

Les notes vivent dans `recipeStats/{idRecette}` (`count`, `sum`) et `recipeStats/{idRecette}/ratings/{uid}`. Les règles de sécurité empêchent de voter deux fois ou de modifier un compteur à la main.

> Ne jamais changer l'identifiant (`id`) d'une recette par défaut : ses notes y sont rattachées.

## Configuration Firebase

La configuration client vit dans `app.json` (`extra.firebase`). Elle est **publique par conception** — la sécurité repose entièrement sur `firestore.rules`, qui doit être publié dans la console Firebase (*Firestore Database → Règles*).

## Stack technique

- React Native 0.81 + Expo SDK 54
- Expo Router (navigation par onglets)
- TypeScript
- AsyncStorage pour la persistance

## Prochaines étapes possibles

- Quantités et unités par ingrédient
- Export / partage de la liste
- Thème sombre
- Notifications de rappel courses
