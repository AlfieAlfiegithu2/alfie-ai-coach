-- Vocab core schema
create table if not exists vocab_decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  created_at timestamptz default now()
);

create table if not exists vocab_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  deck_id uuid references vocab_decks,
  term text not null,
  lemma text,
  language text not null,
  translation text,
  pos text,
  ipa text,
  audio_url text,
  source_text text,
  source_url text,
  context_sentence text,
  examples_json jsonb default '[]'::jsonb,
  conjugation_json jsonb,
  frequency_rank int,
  tags text[],
  is_known boolean default false,
  suspended boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_vocab_cards_user on vocab_cards(user_id);
create index if not exists idx_vocab_cards_next_due on vocab_cards(created_at);

create table if not exists vocab_srs_state (
  card_id uuid primary key references vocab_cards on delete cascade,
  user_id uuid references auth.users not null,
  ease double precision default 2.5,
  interval_days double precision default 0,
  stability double precision,
  difficulty double precision,
  last_reviewed_at timestamptz,
  next_due_at timestamptz
);

create index if not exists idx_vocab_srs_due on vocab_srs_state(user_id, next_due_at);

create table if not exists vocab_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  card_id uuid references vocab_cards on delete cascade,
  reviewed_at timestamptz default now(),
  rating smallint not null,
  elapsed_ms int,
  next_due_at_before timestamptz,
  next_due_at_after timestamptz,
  interval_days_before double precision,
  interval_days_after double precision,
  ease_before double precision,
  ease_after double precision
);

-- Optional frequency table (empty by default)
create table if not exists vocab_frequency (
  language text not null,
  lemma text not null,
  rank int not null,
  primary key(language, lemma)
);

-- RLS
alter table vocab_decks enable row level security;
alter table vocab_cards enable row level security;
alter table vocab_srs_state enable row level security;
alter table vocab_reviews enable row level security;

create policy "vocab_decks_user" on vocab_decks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "vocab_cards_user" on vocab_cards for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "vocab_srs_user" on vocab_srs_state for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "vocab_reviews_user" on vocab_reviews for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


