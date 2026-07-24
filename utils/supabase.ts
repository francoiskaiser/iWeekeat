// === STUB LOCAL (remplace l'ancienne connexion Supabase) ===
// L'application fonctionne désormais 100% hors-ligne. Ce fichier ne se
// connecte plus à aucun serveur : il fournit juste des fonctions "vides"
// pour que les anciens écrans qui appelaient encore `supabase` ne plantent pas.
// Aucune donnée n'est envoyée nulle part.

const noop = async () => ({ data: null, error: null });

export const supabase = {
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: (_cb: any) => ({
      data: { subscription: { unsubscribe: () => {} } },
    }),
    signInWithPassword: noop,
    signUp: noop,
    signOut: noop,
    updateUser: noop,
    resetPasswordForEmail: noop,
  },
  // Les anciens appels type supabase.from('...').select()... ne font plus rien
  from: (_table: string) => {
    const result = Promise.resolve({ data: null, error: null });
    const chain: any = {
      select: () => chain,
      eq: () => chain,
      single: () => result,
      upsert: () => result,
      insert: () => result,
      update: () => chain,
      delete: () => chain,
      then: (res: any, rej: any) => result.then(res, rej),
    };
    return chain;
  },
};
