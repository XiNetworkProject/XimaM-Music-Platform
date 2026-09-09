import 'server-only';

import { dbAdmin } from '@/lib/database';
import { parseOnboardingPreferences } from '@/lib/onboardingOptions';

export async function memberHasCompletedOnboarding(userId: string) {
  try {
    const { data, error } = await dbAdmin
      .from('profiles')
      .select('preferences')
      .eq('id', userId)
      .single();

    if (error) return null;
    return parseOnboardingPreferences(data?.preferences?.onboarding).onboardingCompleted;
  } catch {
    return null;
  }
}
