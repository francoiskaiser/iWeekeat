import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, initializeAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import Constants from 'expo-constants';

// La configuration Firebase d'une app cliente n'est pas un secret : elle est
// forcement embarquee dans le bundle. La securite repose sur les regles
// Firestore (voir firestore.rules), pas sur le fait de la cacher.
const config = (Constants.expoConfig?.extra as { firebase?: FirebaseOptions } | undefined)?.firebase;

export const isFirebaseConfigured = Boolean(config?.apiKey && config?.projectId);

function createAuth(): Auth {
  const app = getApps().length ? getApp() : initializeApp(config as FirebaseOptions);

  if (Platform.OS === 'web') {
    // Sur le web, getAuth persiste deja la session dans localStorage.
    return getAuth(app);
  }

  // Sur mobile, sans persistance explicite Firebase retombe en memoire :
  // on serait deconnecte a chaque redemarrage de l'app. getReactNativePersistence
  // n'existe que dans le build react-native du SDK, absent des types web.
  try {
    const { getReactNativePersistence } = require('firebase/auth') as {
      getReactNativePersistence?: (storage: unknown) => NonNullable<Parameters<typeof initializeAuth>[1]>['persistence'];
    };

    if (!getReactNativePersistence) {
      // Ne devrait pas arriver : signifie que Metro a resolu le build web du SDK.
      console.warn('[firebase] Persistance React Native indisponible, session non conservee.');
      return getAuth(app);
    }

    return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch {
    // initializeAuth ne peut etre appele qu'une fois (rechargement a chaud).
    return getAuth(app);
  }
}

let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

export function getFirebaseAuth(): Auth {
  if (!isFirebaseConfigured) throw new Error('Firebase non configure (app.json > extra.firebase)');
  if (!authInstance) authInstance = createAuth();
  return authInstance;
}

export function getDb(): Firestore {
  if (!isFirebaseConfigured) throw new Error('Firebase non configure (app.json > extra.firebase)');
  if (!dbInstance) {
    const app = getApps().length ? getApp() : initializeApp(config as FirebaseOptions);
    dbInstance = getFirestore(app);
  }
  return dbInstance;
}
