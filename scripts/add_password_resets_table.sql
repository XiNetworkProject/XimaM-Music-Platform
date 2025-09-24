-- Table pour gérer les codes/lien de réinitialisation de mot de passe
create table if not exists public.password_resets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  token text not null,
  code text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_password_resets_email on public.password_resets(email);
create index if not exists idx_password_resets_token on public.password_resets(token);
create index if not exists idx_password_resets_code on public.password_resets(code);

comment on table public.password_resets is 'Tokens et codes de réinitialisation de mot de passe';

