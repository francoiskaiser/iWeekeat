import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Recipe, RecipeStats } from '@/types';
import { DEFAULT_RECIPES } from '@/constants/recipes';
import {
  acceptCommunityRules,
  blockAuthor,
  deleteRecipe,
  fetchAllStats,
  fetchCommunityProfile,
  fetchCommunityRecipes,
  fetchMyRating,
  loadCommunityCache,
  publishRecipe,
  rateRecipe,
  RecipeDraft,
  reportRecipe,
  saveCommunityCache,
  unblockAuthor,
  updateRecipe,
} from '@/utils/recipes';
import { useAuth } from './AuthContext';

interface RecipesContextValue {
  /** Recettes par defaut + communaute, sans les auteurs bloques. */
  recipes: Recipe[];
  stats: Record<string, RecipeStats>;
  /** Notes deja donnees par l'utilisateur pendant la session. */
  myRatings: Record<string, number>;
  loading: boolean;
  error: string | null;
  blockedUids: string[];
  /** Auteurs bloques avec leur prenom quand on le connait (pour les debloquer). */
  blockedAuthors: { uid: string; name: string }[];
  rulesAccepted: boolean;
  /** Charge le catalogue au premier affichage, sans rien refaire ensuite. */
  ensureLoaded: () => void;
  refresh: () => Promise<void>;
  getRecipe: (id: string) => Recipe | undefined;
  loadMyRating: (recipeId: string) => Promise<number | null>;
  rate: (recipeId: string, stars: number) => Promise<void>;
  publish: (draft: RecipeDraft) => Promise<Recipe>;
  edit: (recipeId: string, draft: RecipeDraft) => Promise<void>;
  remove: (recipeId: string) => Promise<void>;
  report: (recipeId: string, reason: string) => Promise<boolean>;
  block: (authorUid: string) => Promise<void>;
  unblock: (authorUid: string) => Promise<void>;
  acceptRules: () => Promise<void>;
}

const RecipesContext = createContext<RecipesContextValue | null>(null);

function networkMessage(error: unknown): string {
  const code = (error as { code?: string })?.code ?? '';
  if (code === 'permission-denied') return "Action refusée. Vérifie que l'application est à jour.";
  return 'Impossible de joindre le serveur (hors ligne ?)';
}

export function RecipesProvider({ children }: { children: React.ReactNode }) {
  const { user, displayName } = useAuth();
  const uid = user?.uid;

  const [community, setCommunity] = useState<Recipe[]>([]);
  const [stats, setStats] = useState<Record<string, RecipeStats>>({});
  const [myRatings, setMyRatings] = useState<Record<string, number>>({});
  const [blockedUids, setBlockedUids] = useState<string[]>([]);
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  // Changement de compte sur le meme telephone : on repart de zero.
  useEffect(() => {
    started.current = false;
    setCommunity([]);
    setStats({});
    setMyRatings({});
    setBlockedUids([]);
    setRulesAccepted(false);
    setError(null);
  }, [uid]);

  const refresh = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const [recipes, allStats, profile] = await Promise.all([
        fetchCommunityRecipes(uid),
        fetchAllStats(),
        fetchCommunityProfile(uid),
      ]);
      setCommunity(recipes);
      setStats(allStats);
      setBlockedUids(profile.blockedUids);
      setRulesAccepted(profile.rulesAccepted);
      setError(null);
      saveCommunityCache(uid, { recipes, stats: allStats, profile });
    } catch (e) {
      setError(networkMessage(e));
    } finally {
      setLoading(false);
    }
  }, [uid]);

  // Le catalogue n'est charge qu'a la premiere visite du volet Recettes :
  // inutile de payer ces lectures a chaque ouverture de l'application.
  // Le cache s'affiche d'abord, le reseau met a jour ensuite.
  const ensureLoaded = useCallback(() => {
    if (started.current || !uid) return;
    started.current = true;
    loadCommunityCache(uid).then((cache) => {
      if (cache) {
        setCommunity(cache.recipes);
        setStats(cache.stats);
        setBlockedUids(cache.profile.blockedUids);
        setRulesAccepted(cache.profile.rulesAccepted);
      }
      refresh();
    });
  }, [uid, refresh]);

  const recipes = useMemo(() => {
    const visible = community.filter(
      (r) => r.authorUid === uid || (!r.hidden && !blockedUids.includes(r.authorUid ?? '')),
    );
    return [...DEFAULT_RECIPES, ...visible];
  }, [community, blockedUids, uid]);

  const blockedAuthors = useMemo(() => blockedUids.map((id) => ({
    uid: id,
    name: community.find((r) => r.authorUid === id)?.authorName ?? 'Auteur inconnu',
  })), [blockedUids, community]);

  const getRecipe = useCallback(
    (id: string) => DEFAULT_RECIPES.find((r) => r.id === id) ?? community.find((r) => r.id === id),
    [community],
  );

  const loadMyRating = useCallback(async (recipeId: string) => {
    if (!uid) return null;
    if (myRatings[recipeId] !== undefined) return myRatings[recipeId];
    try {
      const stars = await fetchMyRating(recipeId, uid);
      if (stars !== null) setMyRatings((prev) => ({ ...prev, [recipeId]: stars }));
      return stars;
    } catch {
      return null;
    }
  }, [uid, myRatings]);

  const rate = useCallback(async (recipeId: string, stars: number) => {
    if (!uid) return;
    const before = { stats: stats[recipeId], mine: myRatings[recipeId] };

    // Affichage immediat ; on corrige avec la reponse du serveur.
    setMyRatings((prev) => ({ ...prev, [recipeId]: stars }));
    setStats((prev) => {
      const cur = prev[recipeId] ?? { count: 0, sum: 0 };
      const next = before.mine === undefined
        ? { count: cur.count + 1, sum: cur.sum + stars }
        : { count: cur.count, sum: cur.sum - before.mine + stars };
      return { ...prev, [recipeId]: next };
    });

    try {
      const confirmed = await rateRecipe(recipeId, uid, stars);
      setStats((prev) => ({ ...prev, [recipeId]: confirmed }));
    } catch (e) {
      setMyRatings((prev) => {
        const copy = { ...prev };
        if (before.mine === undefined) delete copy[recipeId];
        else copy[recipeId] = before.mine;
        return copy;
      });
      setStats((prev) => {
        const copy = { ...prev };
        if (before.stats) copy[recipeId] = before.stats;
        else delete copy[recipeId];
        return copy;
      });
      throw new Error(networkMessage(e));
    }
  }, [uid, stats, myRatings]);

  const publish = useCallback(async (draft: RecipeDraft) => {
    if (!uid) throw new Error('Tu dois être connecté.');
    try {
      const created = await publishRecipe(uid, displayName, draft);
      setCommunity((prev) => [created, ...prev]);
      return created;
    } catch (e) {
      throw new Error(networkMessage(e));
    }
  }, [uid, displayName]);

  const edit = useCallback(async (recipeId: string, draft: RecipeDraft) => {
    try {
      await updateRecipe(recipeId, draft);
      setCommunity((prev) => prev.map((r) => (r.id === recipeId ? { ...r, ...draft } : r)));
    } catch (e) {
      throw new Error(networkMessage(e));
    }
  }, []);

  const remove = useCallback(async (recipeId: string) => {
    try {
      await deleteRecipe(recipeId);
      setCommunity((prev) => prev.filter((r) => r.id !== recipeId));
    } catch (e) {
      throw new Error(networkMessage(e));
    }
  }, []);

  const report = useCallback(async (recipeId: string, reason: string) => {
    if (!uid) return false;
    try {
      const done = await reportRecipe(recipeId, uid, reason);
      // Une recette signalee disparait aussitot pour celui qui l'a signalee.
      setCommunity((prev) => prev.filter((r) => r.id !== recipeId));
      return done;
    } catch (e) {
      throw new Error(networkMessage(e));
    }
  }, [uid]);

  const block = useCallback(async (authorUid: string) => {
    if (!uid) return;
    try {
      await blockAuthor(uid, authorUid);
      setBlockedUids((prev) => (prev.includes(authorUid) ? prev : [...prev, authorUid]));
    } catch (e) {
      throw new Error(networkMessage(e));
    }
  }, [uid]);

  const unblock = useCallback(async (authorUid: string) => {
    if (!uid) return;
    try {
      await unblockAuthor(uid, authorUid);
      setBlockedUids((prev) => prev.filter((u) => u !== authorUid));
    } catch (e) {
      throw new Error(networkMessage(e));
    }
  }, [uid]);

  const acceptRules = useCallback(async () => {
    if (!uid) return;
    try {
      await acceptCommunityRules(uid);
      setRulesAccepted(true);
    } catch (e) {
      throw new Error(networkMessage(e));
    }
  }, [uid]);

  const value = useMemo<RecipesContextValue>(() => ({
    recipes, stats, myRatings, loading, error, blockedUids, blockedAuthors, rulesAccepted,
    ensureLoaded, refresh, getRecipe, loadMyRating, rate, publish, edit, remove, report, block, unblock, acceptRules,
  }), [
    recipes, stats, myRatings, loading, error, blockedUids, blockedAuthors, rulesAccepted,
    ensureLoaded, refresh, getRecipe, loadMyRating, rate, publish, edit, remove, report, block, unblock, acceptRules,
  ]);

  return <RecipesContext.Provider value={value}>{children}</RecipesContext.Provider>;
}

export function useRecipes(): RecipesContextValue {
  const ctx = useContext(RecipesContext);
  if (!ctx) throw new Error('useRecipes must be used within RecipesProvider');
  return ctx;
}
