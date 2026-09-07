-- Objectif: supprimer l'execution publique et figer la resolution des 11 fonctions
-- SECURITY DEFINER publiques identifiees en Phase 1A.
-- Preconditions: signatures et owners identiques a la baseline 20260907000000.
-- Verrou/volume: modifications de catalogue uniquement; aucun parcours de table.
-- Validation: proconfig, ACL, appels RPC sous synaura_app et refus sous anon.
-- Retour: RESET search_path et regrant EXECUTE aux roles historiques (deconseille).

ALTER FUNCTION public.ai_add_credits(uuid, integer)
  SET search_path TO pg_catalog, public;
ALTER FUNCTION public.ai_add_credits(uuid, integer, text, text)
  SET search_path TO pg_catalog, public;
ALTER FUNCTION public.ai_debit_credits(uuid, integer)
  SET search_path TO pg_catalog, public;
ALTER FUNCTION public.ai_debit_credits(uuid, integer, text, text)
  SET search_path TO pg_catalog, public;
ALTER FUNCTION public.check_user_quota(uuid)
  SET search_path TO pg_catalog, public;
ALTER FUNCTION public.get_monthly_generations_count(uuid)
  SET search_path TO pg_catalog, public;
ALTER FUNCTION public.get_user_ai_stats(uuid)
  SET search_path TO pg_catalog, public;
ALTER FUNCTION public.get_user_quota_remaining(uuid)
  SET search_path TO pg_catalog, public;
ALTER FUNCTION public.increment_ai_usage(uuid)
  SET search_path TO pg_catalog, public;
ALTER FUNCTION public.record_track_view(text, uuid, inet, text)
  SET search_path TO pg_catalog, public;
ALTER FUNCTION public.toggle_track_like(text, uuid)
  SET search_path TO pg_catalog, public;

REVOKE EXECUTE ON FUNCTION public.ai_add_credits(uuid, integer)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ai_add_credits(uuid, integer, text, text)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ai_debit_credits(uuid, integer)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ai_debit_credits(uuid, integer, text, text)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_user_quota(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_monthly_generations_count(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_ai_stats(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_quota_remaining(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_ai_usage(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.record_track_view(text, uuid, inet, text)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.toggle_track_like(text, uuid)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.ai_add_credits(uuid, integer)
  TO synaura_app, service_role;
GRANT EXECUTE ON FUNCTION public.ai_add_credits(uuid, integer, text, text)
  TO synaura_app, service_role;
GRANT EXECUTE ON FUNCTION public.ai_debit_credits(uuid, integer)
  TO synaura_app, service_role;
GRANT EXECUTE ON FUNCTION public.ai_debit_credits(uuid, integer, text, text)
  TO synaura_app, service_role;
GRANT EXECUTE ON FUNCTION public.check_user_quota(uuid)
  TO synaura_app, service_role;
GRANT EXECUTE ON FUNCTION public.get_monthly_generations_count(uuid)
  TO synaura_app, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_ai_stats(uuid)
  TO synaura_app, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_quota_remaining(uuid)
  TO synaura_app, service_role;
GRANT EXECUTE ON FUNCTION public.increment_ai_usage(uuid)
  TO synaura_app, service_role;
GRANT EXECUTE ON FUNCTION public.record_track_view(text, uuid, inet, text)
  TO synaura_app, service_role;
GRANT EXECUTE ON FUNCTION public.toggle_track_like(text, uuid)
  TO synaura_app, service_role;
