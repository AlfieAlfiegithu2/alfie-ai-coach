alter table if exists vocab_cards add column if not exists level smallint;
create index if not exists idx_vocab_cards_level on vocab_cards(level);

