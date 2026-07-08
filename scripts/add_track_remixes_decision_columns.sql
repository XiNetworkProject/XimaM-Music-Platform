-- Trace de la decision (approve/reject) prise par le proprietaire du morceau
-- source sur une variation IA en attente d'approbation. Additif uniquement :
-- ne modifie aucune colonne existante de track_remixes ni des modeles track/ai_track.
alter table if exists public.track_remixes
  add column if not exists decided_by uuid,
  add column if not exists decided_at timestamptz;

create index if not exists track_remixes_pending_lookup_idx
  on public.track_remixes (source_track_type, source_track_id, status)
  where status = 'pending_approval';
