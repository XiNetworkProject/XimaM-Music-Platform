-- Referral system for Synaura
-- Run this in Supabase SQL Editor

-- Add referral_code column to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES public.profiles(id);

-- Create referrals table (tracks each successful referral)
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES public.profiles(id),
  referred_id uuid NOT NULL REFERENCES public.profiles(id),
  referrer_credits_granted integer NOT NULL DEFAULT 50,
  referred_credits_granted integer NOT NULL DEFAULT 50,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE(referred_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_created ON public.referrals(created_at DESC);

-- RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY read_own_referrals ON public.referrals
  FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- Generate referral codes for existing users
UPDATE public.profiles
  SET referral_code = 'SYN-' || UPPER(SUBSTRING(username FROM 1 FOR 12)) || '-' || SUBSTRING(id::text FROM 1 FOR 4)
  WHERE referral_code IS NULL AND username IS NOT NULL;

-- Trigger to auto-generate referral_code on new profile
CREATE OR REPLACE FUNCTION public.auto_generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL AND NEW.username IS NOT NULL THEN
    NEW.referral_code := 'SYN-' || UPPER(SUBSTRING(NEW.username FROM 1 FOR 12)) || '-' || SUBSTRING(NEW.id::text FROM 1 FOR 4);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_referral_code ON public.profiles;
CREATE TRIGGER trg_auto_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_referral_code();
