import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { getFirebaseAuth, isFirebaseConfigured } from '@/utils/firebase';
import {
  createGroup as createGroupDoc,
  ensureMemberName,
  fetchGroupInfo,
  fetchUserGroupId,
  joinGroup as joinGroupDoc,
} from '@/utils/groups';

type AuthContextType = {
  configured: boolean;
  user: User | null;
  displayName: string;
  groupId: string | null;
  groupName: string | null;
  /** uid -> prenom des membres du foyer. */
  members: Record<string, string>;
  refreshGroup: () => void;
  initialized: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  createGroup: (name: string) => Promise<string>;
  joinGroup: (code: string) => Promise<string>;
};

const AuthContext = createContext<AuthContextType | null>(null);

// Firebase renvoie des codes techniques : on les traduit pour l'utilisateur.
export function authErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/invalid-email':
      return "Cette adresse e-mail n'est pas valide.";
    case 'auth/email-already-in-use':
      return 'Un compte existe deja avec cette adresse.';
    case 'auth/weak-password':
      return 'Le mot de passe doit contenir au moins 6 caracteres.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Adresse e-mail ou mot de passe incorrect.';
    case 'auth/too-many-requests':
      return 'Trop de tentatives. Reessayez dans quelques minutes.';
    case 'auth/network-request-failed':
      return 'Pas de connexion internet.';
    default:
      return (error as { message?: string })?.message ?? 'Une erreur est survenue.';
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState<string | null>(null);
  const [members, setMembers] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(!isFirebaseConfigured);

  // Nom du foyer et prenoms des membres, necessaires pour afficher qui est
  // concerne par un evenement du calendrier.
  const loadGroupInfo = useCallback(async (group: string | null, uid?: string, who?: string) => {
    if (!group) {
      setGroupName(null);
      setMembers({});
      return;
    }
    try {
      // Inscrit ou corrige son propre prenom avant lecture, sinon les foyers
      // crees avant cette fonctionnalite afficheraient "Membre du foyer".
      if (uid && who) await ensureMemberName(group, uid, who);
      const info = await fetchGroupInfo(group);
      setGroupName(info?.name ?? null);
      setMembers(info?.members ?? {});
    } catch {
      // Hors ligne : on garde ce qu'on avait deja.
    }
  }, []);

  useEffect(() => {
    loadGroupInfo(groupId, user?.uid, user?.displayName?.trim() || undefined);
  }, [groupId, user, loadGroupInfo]);

  useEffect(() => {
    if (!isFirebaseConfigured) return;

    return onAuthStateChanged(getFirebaseAuth(), async (nextUser) => {
      setUser(nextUser);
      if (nextUser) {
        try {
          setGroupId(await fetchUserGroupId(nextUser.uid));
        } catch {
          // Hors ligne au demarrage : on laissera l'ecran foyer reessayer.
          setGroupId(null);
        }
      } else {
        setGroupId(null);
      }
      setInitialized(true);
    });
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    const credential = await createUserWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
    const trimmed = name.trim();
    if (trimmed) await updateProfile(credential.user, { displayName: trimmed });
    setUser({ ...credential.user, displayName: trimmed || credential.user.displayName } as User);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
  }, []);

  const signOut = useCallback(async () => {
    await fbSignOut(getFirebaseAuth());
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(getFirebaseAuth(), email.trim());
  }, []);

  const createGroup = useCallback(async (name: string) => {
    if (!user) throw new Error('Vous devez etre connecte.');
    const who = user.displayName?.trim() || 'Chef';
    const code = await createGroupDoc(user.uid, name, who);
    setGroupId(code);
    return code;
  }, [user]);

  const joinGroup = useCallback(async (code: string) => {
    if (!user) throw new Error('Vous devez etre connecte.');
    const who = user.displayName?.trim() || 'Chef';
    const joined = await joinGroupDoc(user.uid, code, who);
    setGroupId(joined);
    return joined;
  }, [user]);

  const refreshGroup = useCallback(() => {
    loadGroupInfo(groupId, user?.uid, user?.displayName?.trim() || undefined);
  }, [groupId, user, loadGroupInfo]);

  const value = useMemo<AuthContextType>(() => ({
    configured: isFirebaseConfigured,
    user,
    displayName: user?.displayName?.trim() || 'Chef',
    groupId,
    groupName,
    members,
    refreshGroup,
    initialized,
    signUp,
    signIn,
    signOut,
    resetPassword,
    createGroup,
    joinGroup,
  }), [user, groupId, groupName, members, refreshGroup, initialized, signUp, signIn, signOut, resetPassword, createGroup, joinGroup]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
