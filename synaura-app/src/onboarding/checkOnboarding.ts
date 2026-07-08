import { getUserPreferences } from '@/api/client';

/**
 * Verifie si l'onboarding V1 est termine pour l'utilisateur courant (token deja
 * pose sur le client API). Fail-open : une erreur reseau ne doit jamais bloquer
 * l'acces a l'app, seule une reponse explicite onboardingCompleted !== true la
 * declenche.
 */
export async function isOnboardingCompleted(): Promise<boolean> {
  try {
    const preferences = await getUserPreferences();
    return Boolean((preferences as any)?.onboarding?.onboardingCompleted);
  } catch {
    return true;
  }
}
