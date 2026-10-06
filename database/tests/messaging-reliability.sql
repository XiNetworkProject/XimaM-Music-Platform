\set ON_ERROR_STOP on
-- Run ONLY in a newly created synaura_messaging_test_* database.
DO $$ BEGIN IF current_database() NOT LIKE 'synaura_messaging_test_%' THEN RAISE EXCEPTION 'Isolated database required'; END IF; END $$;
CREATE TABLE public.profiles(id uuid PRIMARY KEY);
CREATE TABLE public.conversations(id text PRIMARY KEY);
CREATE TABLE public.messages(id text PRIMARY KEY,conversation_id text REFERENCES public.conversations(id),sender_id uuid REFERENCES public.profiles(id),created_at timestamptz,deleted_at timestamptz);
CREATE TABLE public.conversation_participants(conversation_id text,user_id uuid,last_read_at timestamptz);
INSERT INTO public.profiles VALUES ('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002'),('00000000-0000-4000-8000-000000000003');
INSERT INTO public.conversations VALUES ('00000000-0000-4000-8000-000000000010');
INSERT INTO public.messages VALUES ('00000000-0000-4000-8000-000000000100','00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000001','2026-10-06T00:00:00Z',NULL);
INSERT INTO public.conversation_participants VALUES ('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000002','2026-10-06T00:01:00Z'),('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000003',NULL);
BEGIN;
\ir 20261006100000_messaging_call_history.sql
COMMIT;
PREPARE receipt_lookup(text[]) AS SELECT message_id,user_id FROM public.message_read_receipts WHERE message_id=ANY($1);
EXECUTE receipt_lookup(ARRAY['00000000-0000-4000-8000-000000000100','legacy_message_123']);
PREPARE receipt_write(text,uuid,timestamptz,text[]) AS INSERT INTO public.message_read_receipts(message_id,user_id,read_at)
  SELECT id,$2,$3 FROM public.messages WHERE conversation_id=$1 AND sender_id<>$2
  AND created_at<=$3 AND ($4 IS NULL OR id=ANY($4)) ON CONFLICT DO NOTHING;
EXECUTE receipt_write('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000002',now(),ARRAY['00000000-0000-4000-8000-000000000100']);
DO $$ BEGIN
  IF (SELECT count(*) FROM public.message_read_receipts)<>1 THEN RAISE EXCEPTION 'Historical receipt not preserved'; END IF;
  IF EXISTS(SELECT 1 FROM public.message_read_receipts WHERE user_id='00000000-0000-4000-8000-000000000003') THEN RAISE EXCEPTION 'Group falsely read'; END IF;
  IF has_table_privilege('anon','public.voice_call_history','SELECT') OR has_table_privilege('authenticated','public.message_read_receipts','SELECT') THEN RAISE EXCEPTION 'Private data exposed'; END IF;
  IF NOT has_table_privilege('synaura_app','public.voice_call_history','INSERT') THEN RAISE EXCEPTION 'Backend grant missing'; END IF;
END $$;
INSERT INTO public.voice_call_history(id,conversation_id,caller_id,title,is_group,created_at,last_activity_at)
VALUES ('00000000-0000-4000-8000-000000000200','00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000001','Fixture',false,'2026-10-06T00:00:00Z','2026-10-06T00:00:05Z');
INSERT INTO public.voice_call_members(call_id,user_id,name,state) VALUES ('00000000-0000-4000-8000-000000000200','00000000-0000-4000-8000-000000000001','Fixture','joined');
DO $$ BEGIN
  BEGIN UPDATE public.voice_call_history SET connected_at='2026-10-05T00:00:00Z'; RAISE EXCEPTION 'Invalid time accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN UPDATE public.voice_call_members SET state='invalid'; RAISE EXCEPTION 'Invalid state accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
  IF EXISTS(SELECT 1 FROM public.voice_call_history h JOIN public.voice_call_members m ON m.call_id=h.id AND m.user_id='00000000-0000-4000-8000-000000000003') THEN RAISE EXCEPTION 'Call history leaked'; END IF;
END $$;
UPDATE public.voice_call_history SET ended_at=GREATEST(created_at,last_activity_at,connected_at),end_reason='server-restarted' WHERE ended_at IS NULL;
DO $$ BEGIN IF (SELECT ended_at-created_at FROM public.voice_call_history)<>interval '5 seconds' THEN RAISE EXCEPTION 'Restart counted offline time'; END IF; END $$;
SELECT 'MESSAGING ISOLATED SQL PASS' AS result;
