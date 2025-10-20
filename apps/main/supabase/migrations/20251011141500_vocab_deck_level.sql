alter table if exists vocab_decks add column if not exists level int;
create index if not exists idx_vocab_decks_user_level on vocab_decks(user_id, level);

