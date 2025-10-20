-- Public visibility for shared decks/cards
alter table if exists vocab_decks add column if not exists is_public boolean not null default false;
alter table if exists vocab_cards add column if not exists is_public boolean not null default false;

-- RLS: allow anyone to select public decks/cards
create policy if not exists "vocab_decks_public_read" on vocab_decks for select using (is_public = true);
create policy if not exists "vocab_cards_public_read" on vocab_cards for select using (is_public = true);

