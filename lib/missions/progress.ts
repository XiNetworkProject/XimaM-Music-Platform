import { withDatabaseTransaction } from '@/lib/postgres';
import { progressMissions } from '@/lib/boosters/service';

/** Serialized with reward claims: no lost increments or stale cooldown resets. */
export async function applyMissionProgress(opts: {
  userId: string;
  inc: Partial<Record<'plays' | 'likes' | 'shares' | 'boosts', number>>;
}) {
  if (
    !opts.userId ||
    !Object.values(opts.inc).some((value) => Number(value) > 0)
  )
    return;
  await withDatabaseTransaction((db) =>
    progressMissions(db, opts.userId, opts.inc)
  );
}
