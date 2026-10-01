import { boosterMutation } from '@/lib/boosters/http';
import { openDaily } from '@/lib/boosters/service';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST() {
  return boosterMutation(openDaily);
}
