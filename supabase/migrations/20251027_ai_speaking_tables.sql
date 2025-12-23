-- AI Speaking Tutor Tables

-- Prompts catalog managed by admin
create table if not exists public.voice_tutor_prompts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  system_prompt text not null,
  language text default 'en',
  voice text default 'default',
  model_config jsonb default '{}'::jsonb,
  is_default boolean default false,
  created_at timestamptz default now(),
  created_by uuid default auth.uid()
);

-- Sessions log per user
create table if not exists public.voice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  prompt_id uuid references public.voice_tutor_prompts(id) on delete set null,
  model text default 'gemini-2.5-flash',
  started_at timestamptz default now(),
  ended_at timestamptz,
  duration_s integer,
  transcript jsonb,
  tokens_in integer,
  tokens_out integer,
  cost_usd_estimate numeric(10,4),
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.voice_tutor_prompts enable row level security;
alter table public.voice_sessions enable row level security;

-- Policies for prompts: public read defaults; admins full CRUD, users read-only
do $$ begin
  if not exists (
    select 1 from pg_policies where policyname = 'prompt_read_default' and tablename = 'voice_tutor_prompts'
  ) then
    create policy prompt_read_default on public.voice_tutor_prompts
      for select using (true);
  end if;
end $$;

-- Policies for sessions: user can manage own rows
do $$ begin
  if not exists (
    select 1 from pg_policies where policyname = 'voice_sessions_select_own' and tablename = 'voice_sessions'
  ) then
    create policy voice_sessions_select_own on public.voice_sessions
      for select using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where policyname = 'voice_sessions_insert_own' and tablename = 'voice_sessions'
  ) then
    create policy voice_sessions_insert_own on public.voice_sessions
      for insert with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where policyname = 'voice_sessions_update_own' and tablename = 'voice_sessions'
  ) then
    create policy voice_sessions_update_own on public.voice_sessions
      for update using (auth.uid() = user_id);
  end if;
end $$;

-- Helpful indexes
create index if not exists idx_voice_sessions_user_id on public.voice_sessions(user_id);
create index if not exists idx_voice_sessions_created_at on public.voice_sessions(created_at desc);


