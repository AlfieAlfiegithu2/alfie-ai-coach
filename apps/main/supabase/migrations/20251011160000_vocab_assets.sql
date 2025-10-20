-- Additional vocab asset tables for translations, pronunciations, images, and examples

create table if not exists vocab_translations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  card_id uuid references vocab_cards on delete cascade,
  lang text not null,
  translations jsonb not null default '[]'::jsonb,
  provider text,
  quality int,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(card_id, lang)
);

create table if not exists vocab_pronunciations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  card_id uuid references vocab_cards on delete cascade,
  provider text,
  voice_id text,
  accent text,
  gender text,
  url text not null,
  duration_ms int,
  format text default 'mp3',
  created_at timestamptz default now(),
  unique(card_id, voice_id)
);

create table if not exists vocab_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  card_id uuid references vocab_cards on delete cascade,
  provider text,
  url text not null,
  width int,
  height int,
  format text default 'webp',
  prompt text,
  style text,
  created_at timestamptz default now()
);

create table if not exists vocab_examples (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  card_id uuid references vocab_cards on delete cascade,
  lang text default 'en',
  sentence text not null,
  translation text,
  source text,
  cefr text,
  quality int,
  created_at timestamptz default now()
);

-- RLS
alter table vocab_translations enable row level security;
alter table vocab_pronunciations enable row level security;
alter table vocab_images enable row level security;
alter table vocab_examples enable row level security;

create policy if not exists "vocab_translations_user" on vocab_translations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy if not exists "vocab_pronunciations_user" on vocab_pronunciations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy if not exists "vocab_images_user" on vocab_images for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy if not exists "vocab_examples_user" on vocab_examples for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


