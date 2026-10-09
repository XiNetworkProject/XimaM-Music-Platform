import assert from 'node:assert/strict';

// The October Community completion deliberately changes behavior. These targeted
// contracts replace only its obsolete visual-freeze hashes. Executable route,
// stale-response and PostgreSQL tests live in community-completion and the gate.
const contracts = {
  'app/community/[club]/page.tsx': ['new AbortController()', 'signal: controller.signal', '&limit=30&sort=recent&page=${page}', 'json.pagination?.totalPages', 'postsError', 'Réessayer', 'Voir plus de discussions'],
  'app/community/forum/[id]/page.tsx': ['useCommunityThread(id, viewerId)', 'useAudioPlayer()', '/api/community/posts/replies/likes', 'community-reply:${id}', 'showModal()', 'htmlFor="thread-reply"', 'Remixer dans le Studio'],
  'app/community/forum/new/page.tsx': ['if (submitLock.current) return', '<DraftRecovery', 'new AbortController()', 'signal: controller.signal', 'maxLength={255}', 'maxLength={20000}'],
  'app/community/faq/page.tsx': ['new AbortController()', '/api/community/faq?limit=100&page=${page}', 'signal: controller.signal', 'page <= totalPages', 'Réessayer', 'aria-expanded={isOpen}'],
};

export function assertCommunityCompletion(path, source) {
  const markers = contracts[path];
  if (!markers) return false;
  for (const marker of markers) assert.ok(source.includes(marker), `${path}: ${marker}`);
  return true;
}
