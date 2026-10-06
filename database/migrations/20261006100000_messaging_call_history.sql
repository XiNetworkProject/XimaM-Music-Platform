-- Durable call metadata only: never audio, RTC tokens or microphone recordings.
-- Apply with the canonical runner after isolated validation and verified backup.
-- Rollback: revert application readers/writers; retain tables and user history.
SET LOCAL lock_timeout = '3s';
CREATE TABLE public.voice_call_history (
  id uuid PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  caller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  is_group boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL,
  connected_at timestamptz,
  ended_at timestamptz,
  last_activity_at timestamptz NOT NULL,
  end_reason text,
  CHECK (connected_at IS NULL OR connected_at >= created_at),
  CHECK (ended_at IS NULL OR ended_at >= created_at)
);
CREATE TABLE public.voice_call_members (
  call_id uuid NOT NULL REFERENCES public.voice_call_history(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  state text NOT NULL CHECK (state IN ('invited','joined','declined','left')),
  joined_at timestamptz,
  left_at timestamptz,
  PRIMARY KEY (call_id,user_id)
);
CREATE INDEX voice_call_members_user_call_idx ON public.voice_call_members(user_id,call_id);
CREATE INDEX voice_call_history_created_idx ON public.voice_call_history(created_at DESC,id DESC);
CREATE INDEX voice_call_history_conversation_idx ON public.voice_call_history(conversation_id,created_at DESC);
CREATE INDEX voice_call_history_caller_idx ON public.voice_call_history(caller_id);
ALTER TABLE public.voice_call_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_call_members ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.voice_call_history, public.voice_call_members FROM PUBLIC, anon, authenticated;
-- Canonical backend role already BYPASSRLS; routes MUST bind the authenticated user.
GRANT SELECT, INSERT, UPDATE ON public.voice_call_history, public.voice_call_members TO synaura_app;
CREATE TABLE public.messaging_presence (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  device_id uuid NOT NULL,
  last_active_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  PRIMARY KEY(user_id,device_id)
);
ALTER TABLE public.messaging_presence ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.messaging_presence FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.messaging_presence TO synaura_app;
-- Per-recipient receipts: one reader in a group must not clear everybody's inbox.
CREATE TABLE public.message_read_receipts (
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);
CREATE INDEX message_read_receipts_user_idx ON public.message_read_receipts(user_id, message_id);
ALTER TABLE public.message_read_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.message_read_receipts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.message_read_receipts TO synaura_app;
-- Preserve recorded historical watermarks, not the shared is_read flag.
INSERT INTO public.message_read_receipts(message_id,user_id,read_at)
SELECT m.id,p.user_id,p.last_read_at FROM public.messages m
JOIN public.conversation_participants p ON p.conversation_id=m.conversation_id
WHERE p.user_id<>m.sender_id AND p.last_read_at>=m.created_at
ON CONFLICT DO NOTHING;
