import { createHash, randomUUID } from 'node:crypto';
import { queryDatabase, withDatabaseTransaction } from '@/lib/postgres';
import { getEntitlements } from '@/lib/entitlements';
import { normalizeGenerationModel } from '@/lib/sunoModels';
import { cacheSunoTrackMedia } from '@/lib/suno-media-cache';
import { STUDIO_TOOLS, approvedToolPrices, StudioInputError, type StudioJobView, type StudioToolInput, type StudioTool, type StudioResult, type StudioJobState } from './tools';
import { buildStudioPayload, normalizeStudioResult, studioProviderRequest, StudioProviderRejected, STUDIO_ENDPOINTS, type StudioSource } from './provider';

export class StudioHttpError extends Error { status: number; constructor(status: number, message: string) { super(message); this.status = status; } }
type Job = { id: string; user_id: string; request_hash: string; input: StudioToolInput; action: StudioTool; model: string; title: string; status: StudioJobState; credits: number; refunded: boolean; provider_task_id: string | null; result: StudioResult; created_at: string; generation_id?: string };
export function publicStudioJob(job: Job): StudioJobView {
  return { id: job.id, action: job.action, title: job.title, status: job.status, credits: job.credits, refunded: job.refunded, createdAt: job.created_at, result: job.result, sourceIds: [job.input.sourceId, job.input.secondSourceId].filter((id): id is string => !!id), workspace: job.input.workspace,
    ...(job.status === 'uncertain' ? { message: 'Réponse fournisseur incertaine. Ne relancez pas : cette demande doit être réconciliée.' } : job.status === 'failed' ? { message: job.result.warning || 'La demande a échoué sans motif précisé par le fournisseur.' } : {}) };
}
export async function studioToolsReady() {
  const { rows } = await queryDatabase('SELECT to_regclass($1) IS NOT NULL AS ready', ['public.studio_tool_jobs']);
  return !!rows[0]?.ready;
}
async function requireReady() { if (!await studioToolsReady()) throw new StudioHttpError(503, 'Les outils sont en préparation. Aucun crédit débité.'); }
async function ownSource(user: string, id?: string): Promise<StudioSource | undefined> {
  if (!id) return undefined;
  const { rows } = await queryDatabase(`SELECT t.id::text, t.suno_id AS "audioId", g.task_id AS "taskId", t.audio_url AS "audioUrl", t.duration, g.model, t.title, g.metadata, t.source_links
    FROM public.ai_tracks t JOIN public.ai_generations g ON g.id=t.generation_id
    WHERE g.user_id=$1 AND (t.id::text=$2 OR t.suno_id=$2) AND NOT COALESCE(g.is_trashed,false)
    ORDER BY (t.id::text=$2) DESC LIMIT 1`, [user, id]);
  if (!rows[0]) throw new StudioHttpError(404, 'Morceau source introuvable dans votre collection.');
  try {
    const links = rows[0].source_links;
    const folder = (typeof links === 'string' ? JSON.parse(links) : links)?.library_folder;
    if (typeof folder === 'string' && folder.length <= 120) rows[0].workspace = folder;
  } catch { /* Legacy malformed links do not invalidate an otherwise owned source. */ }
  return rows[0];
}
async function ownDependency(user: string, id: string | undefined, actions: string[]) {
  if (!id) return undefined;
  if (!/^[\da-f-]{36}$/i.test(id)) throw new StudioInputError('Identifiant de tâche invalide.');
  const { rows } = await queryDatabase('SELECT * FROM public.studio_tool_jobs WHERE user_id=$1 AND id=$2 AND status=$3 AND action=ANY($4::text[])', [user, id, 'completed', actions]);
  if (!rows[0]) throw new StudioHttpError(404, 'Résultat source introuvable dans votre atelier.');
  return rows[0] as Job;
}
export async function listStudioJobs(user: string) {
  await requireReady();
  // An interrupted worker must not appear to be running forever or be re-submitted.
  await queryDatabase(`UPDATE public.studio_tool_jobs SET status='uncertain',updated_at=now() WHERE user_id=$1 AND status='submitting' AND created_at<now()-interval '2 minutes'`, [user]);
  const { rows } = await queryDatabase('SELECT * FROM public.studio_tool_jobs WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50', [user]);
  return rows.map(row => publicStudioJob(row as Job));
}
export async function createStudioJob(user: string, key: string, input: StudioToolInput, callbackFor: (id: string) => string, expectedCredits?: number) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key)) throw new StudioInputError('Clé de demande invalide.');
  const credits = approvedToolPrices(process.env)[input.action];
  if (credits == null) throw new StudioHttpError(409, 'Tarif en attente de validation. Aucun crédit débité.');
  if (!process.env.SUNO_API_KEY) throw new StudioHttpError(503, 'Fournisseur indisponible. Aucun crédit débité.');
  await requireReady();
  const hash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
  const existing = await queryDatabase('SELECT * FROM public.studio_tool_jobs WHERE user_id=$1 AND request_key=$2', [user, key]);
  if (existing.rows[0]) {
    if (existing.rows[0].request_hash !== hash) throw new StudioHttpError(409, 'Cette demande existe avec d’autres paramètres.');
    return publicStudioJob(existing.rows[0]);
  }
  // Return accepted retries at their original price, but never debit a fresh intent
  // for a different amount than the authenticated client explicitly confirmed.
  if (expectedCredits !== undefined && expectedCredits !== credits) {
    throw new StudioHttpError(409, 'Le tarif a changé. Actualisez les outils puis confirmez le nouveau montant. Aucun crédit débité.');
  }
  const [source, second, stem, persona, profile] = await Promise.all([
    ownSource(user, input.sourceId), ownSource(user, input.secondSourceId),
    ownDependency(user, input.stemJobId, ['stems', 'stems_multi', 'stems_instrument']),
    ownDependency(user, input.personaJobId, ['persona']),
    queryDatabase('SELECT plan FROM public.profiles WHERE id=$1', [user]),
  ]);
  const models = getEntitlements(profile.rows[0]?.plan || 'free').ai.availableModels;
  // Do not launder a restricted remix into an unrestricted original via a new tool.
  if ((STUDIO_TOOLS.find(tool => tool.id === input.action)?.music || input.action === 'persona') && [source, second].some(item => item?.metadata?.remixSource?.sourceTrackId)) {
    throw new StudioHttpError(409, 'Cette source est un remix soumis à des droits hérités. Utilisez son parcours de remix existant.');
  }
  const model = normalizeGenerationModel(input.model, models);
  if (input.model && model !== input.model) throw new StudioHttpError(403, 'Ce modèle n’est pas disponible avec votre formule.');
  const id = randomUUID();
  const payload = buildStudioPayload(input, model, callbackFor(id), source, second, stem?.provider_task_id || undefined, persona?.result.personaId);
  const title = input.title?.trim() || source?.title || STUDIO_TOOLS.find(tool => tool.id === input.action)!.label;
  const persistedInput = { ...input, sourceId: source?.id || input.sourceId, secondSourceId: second?.id || input.secondSourceId, workspace: input.workspace?.trim() ?? source?.workspace ?? '' };
  const reserved = await withDatabaseTransaction(async client => {
    const insert = await client.query(`INSERT INTO public.studio_tool_jobs(id,user_id,request_key,request_hash,action,input,model,title,credits)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(user_id,request_key) DO NOTHING RETURNING *`, [id, user, key, hash, input.action, persistedInput, model, title, credits]);
    if (!insert.rows[0]) {
      const found = await client.query('SELECT * FROM public.studio_tool_jobs WHERE user_id=$1 AND request_key=$2', [user, key]);
      if (found.rows[0]?.request_hash !== hash) throw new StudioHttpError(409, 'Demande déjà utilisée.');
      return { fresh: false, job: found.rows[0] as Job };
    }
    if (credits > 0) {
      const debit = await client.query('SELECT public.ai_debit_credits($1::uuid,$2::integer,$3::text,$4::text) AS ok', [user, credits, 'action_spend', `Studio ${input.action} · ${id}`]);
      if (debit.rows[0]?.ok !== true) throw new StudioHttpError(402, 'Crédits insuffisants.');
    }
    return { fresh: true, job: insert.rows[0] as Job };
  });
  if (!reserved.fresh) return publicStudioJob(reserved.job);
  // Never hold a credit/DB lock over a network request. Only the reserving request submits.
  try {
    const response = await studioProviderRequest(STUDIO_ENDPOINTS[input.action].create, payload);
    if (!STUDIO_ENDPOINTS[input.action].poll) {
      const outcome = normalizeStudioResult(input.action, response);
      if (outcome.state === 'pending') throw new Error('Ambiguous synchronous response');
      await settleStudioJob(id, outcome.state, outcome.result);
    } else {
      const task = response?.data?.taskId || response?.data?.task_id;
      if (typeof task !== 'string' || !task || task.length > 255) throw new Error('Ambiguous acceptance');
      await bindProviderTask(id, task);
    }
  } catch (error) {
    if (error instanceof StudioProviderRejected) await settleStudioJob(id, 'failed', { assets: [], warning: error.message });
    else await queryDatabase("UPDATE public.studio_tool_jobs SET status='uncertain',updated_at=now() WHERE id=$1 AND status='submitting'", [id]);
  }
  const { rows } = await queryDatabase('SELECT * FROM public.studio_tool_jobs WHERE id=$1 AND user_id=$2', [id, user]);
  return publicStudioJob(rows[0]);
}
export async function bindProviderTask(id: string, task: string) {
  const result = await queryDatabase(`UPDATE public.studio_tool_jobs SET provider_task_id=$2,
    status=CASE WHEN status IN ('submitting','uncertain') THEN 'pending' ELSE status END,updated_at=now()
    WHERE id=$1 AND (provider_task_id IS NULL OR provider_task_id=$2) RETURNING id`, [id, task]);
  if (!result.rowCount) throw new StudioHttpError(409, 'La tâche fournisseur ne correspond pas.');
}
export async function settleStudioJob(id: string, status: 'completed' | 'failed', result: StudioResult) {
  return withDatabaseTransaction(async client => {
    const found = await client.query('SELECT * FROM public.studio_tool_jobs WHERE id=$1 FOR UPDATE', [id]);
    const job = found.rows[0] as Job | undefined;
    if (!job || ['completed', 'failed'].includes(job.status)) return;
    let generationId = job.generation_id || null;
    if (status === 'failed' && !job.refunded && job.credits > 0) await client.query('SELECT public.ai_add_credits($1::uuid,$2::integer,$3::text,$4::text)', [job.user_id, job.credits, 'refund', `Studio ${job.action} · ${id}`]);
    if (status === 'completed' && STUDIO_TOOLS.find(tool => tool.id === job.action)?.music) {
      generationId = randomUUID();
      await client.query(`INSERT INTO public.ai_generations(id,user_id,task_id,prompt,model,status,is_public,metadata)
        VALUES($1,$2,$3,$4,$5,'completed',false,$6)`, [generationId, job.user_id, job.provider_task_id, job.input.lyrics || job.input.prompt || '', job.model, { studioJobId: id, studioAction: job.action, title: job.title, style: job.input.style || '', instrumental: !!job.input.instrumental, sourceIds: [job.input.sourceId, job.input.secondSourceId].filter(Boolean) }]);
      for (const asset of result.assets.filter(asset => asset.kind === 'audio')) {
        asset.trackId = randomUUID();
        await client.query(`INSERT INTO public.ai_tracks(id,generation_id,suno_id,title,audio_url,duration,prompt,model_name,style,lyrics,is_public,image_url,source_links)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,false,$11,$12)`, [asset.trackId, generationId, asset.providerAudioId || null, asset.label || job.title, asset.url, Math.round(asset.duration || 0), job.input.lyrics || '', job.model, job.input.style || '', job.input.lyrics || '', asset.imageUrl || null, JSON.stringify({ library_folder: job.input.workspace || null })]);
      }
    }
    await client.query(`UPDATE public.studio_tool_jobs SET status=$2,result=$3,generation_id=$4,refunded=$5,updated_at=now() WHERE id=$1`, [id, status, result, generationId, status === 'failed' && job.credits > 0]);
  });
}
export async function refreshStudioJob(id: string, user?: string) {
  const { rows } = await queryDatabase('SELECT * FROM public.studio_tool_jobs WHERE id=$1 AND ($2::uuid IS NULL OR user_id=$2)', [id, user || null]);
  const job = rows[0] as Job | undefined;
  if (!job) throw new StudioHttpError(404, 'Tâche introuvable.');
  const poll = STUDIO_ENDPOINTS[job.action].poll;
  if (poll && job.provider_task_id && ['pending', 'uncertain', 'submitting'].includes(job.status)) {
    const lease = await queryDatabase(`UPDATE public.studio_tool_jobs SET last_polled_at=now() WHERE id=$1 AND (last_polled_at IS NULL OR last_polled_at<now()-interval '8 seconds') RETURNING id`, [id]);
    if (lease.rowCount) {
      try {
        const response = await studioProviderRequest(`${poll}?taskId=${encodeURIComponent(job.provider_task_id)}`);
        const outcome = normalizeStudioResult(job.action, response);
        // 401/404/5xx when polling are not evidence of a failed generation.
        if (outcome.state === 'completed') {
          if (STUDIO_TOOLS.find(tool => tool.id === job.action)?.music) {
            // Media I/O stays outside the short settlement transaction. Reuse the
            // application's validated storage pipeline, including image covers.
            for (const asset of outcome.result.assets) {
              const original = asset.url;
              const media = await cacheSunoTrackMedia({ generationId: id, sunoId: asset.providerAudioId || id, audioUrl: asset.url, imageUrl: asset.imageUrl });
              asset.url = media.audioUrl || original; asset.imageUrl = media.imageUrl || asset.imageUrl;
              if (asset.url === original) outcome.result.warning = 'Copie durable non confirmée. Conservez vos fichiers : les liens fournisseur sont temporaires.';
            }
          } else if (outcome.result.assets.length) outcome.result.warning = 'Liens fournisseur temporaires : téléchargez les exports que vous souhaitez conserver.';
        }
        if (outcome.state !== 'pending') await settleStudioJob(id, outcome.state, outcome.result);
      } catch { /* Keep persisted state; next authenticated poll/callback can reconcile. */ }
    }
  }
  await queryDatabase(`UPDATE public.studio_tool_jobs SET status='uncertain',updated_at=now() WHERE id=$1 AND status IN ('submitting','pending') AND created_at<now()-interval '30 minutes'`, [id]);
  const latest = await queryDatabase('SELECT * FROM public.studio_tool_jobs WHERE id=$1', [id]);
  return publicStudioJob(latest.rows[0]);
}
