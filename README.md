# MealHelper

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
MealHelper/
├── app/                    # Expo Router — écrans
│   ├── _layout.tsx         # Layout racine + provider
│   └── (tabs)/
│       ├── index.tsx       # Planificateur semainier
│       ├── edit.tsx        # Mode édition (catégories/plats/ingrédients)
│       └── shopping.tsx    # Liste de courses + mode Clean
├── components/             # Composants UI réutilisables
├── context/                # État global + persistance AsyncStorage
├── constants/              # Couleurs, jours, styles
├── types/                  # Modèles TypeScript
└── utils/                  # Stockage et logique métier
```

## Fonctionnalités

### 1. Mode Édition
- Créer / modifier / supprimer des **catégories** (Pâtes, Riz…)
- Ajouter des **plats** par catégorie
- Ajouter des **ingrédients** par plat
- Données d'exemple préchargées au premier lancement

### 2. Planificateur
- 7 jours (Lundi → Dimanche)
- Sélection en cascade : **Catégorie** → **Plat**
- Validation par jour

### 3. Liste de courses
- Bouton **Générer** : agrège les ingrédients de la semaine
- **Dédoublonnage** automatique (ex. « Crème » une seule fois)

### 4. Mode Clean (inventaire)
- Parcourt chaque ingrédient un par un
- « Oui, j'en ai » → retiré de la liste
- « Non, à acheter » → conservé
- Liste finale avec **cases à cocher** pour le supermarché

## Stockage local

Les données sont persistées via `@react-native-async-storage/async-storage` entre chaque ouverture de l'app.

## Stack technique

- React Native 0.76 + Expo SDK 52
- Expo Router (navigation par onglets)
- TypeScript
- Composants natifs + `@react-native-picker/picker`
- AsyncStorage pour la persistance

## Prochaines étapes possibles

- Quantités et unités par ingrédient
- Export / partage de la liste
- Thème sombre
- Notifications de rappel courses
