import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Profil local créé au premier lancement, stocké dans AsyncStorage — pas de compte distant.
type LocalUser = {
  id: string;
  user_metadata: {
    username: string;
    group_id: string;
  };
};

type AuthContextType = {
  user: LocalUser | null;
  initialized: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  initialized: false,
});

const LOCAL_USER_KEY = '@meal_helper_local_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(LOCAL_USER_KEY);
        if (stored) {
          setUser(JSON.parse(stored));
        } else {
          // Création du profil local par défaut
          const newUser: LocalUser = {
            id: 'local-user',
            user_metadata: {
              username: 'Moi',
              group_id: 'LOCAL', // un seul "coffre" local
            },
          };
          await AsyncStorage.setItem(LOCAL_USER_KEY, JSON.stringify(newUser));
          setUser(newUser);
        }
      } catch (e) {
        // En cas d'erreur on retombe sur un profil local minimal
        setUser({
          id: 'local-user',
          user_metadata: { username: 'Moi', group_id: 'LOCAL' },
        });
      } finally {
        setInitialized(true);
      }
    })();
  }, []);

  return (
    <AuthContext.Provider value={{ user, initialized }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
