import { getUserPreferences } from '@/api/client';

const ONBOARDING_CHECK_TIMEOUT_MS = 1800;

/**
 * Verifie si l'onboarding V1 est termine pour l'utilisateur courant (token deja
 * pose sur le client API). Fail-open : une erreur reseau ne doit jamais bloquer
 * l'acces a l'app, seule une reponse explicite onboardingCompleted !== true la
 * declenche.
 */
export async function isOnboardingCompleted(): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (completed: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve(completed);
    };
    const timeout = setTimeout(() => finish(true), ONBOARDING_CHECK_TIMEOUT_MS);

    void getUserPreferences()
      .then((preferences) => {
        finish(Boolean((preferences as any)?.onboarding?.onboardingCompleted));
      })
      .catch(() => finish(true));
  });
}
