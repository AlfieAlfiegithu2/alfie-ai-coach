create index if not exists idx_vocab_cards_deck on vocab_cards(deck_id);
create index if not exists idx_vocab_cards_level_deck on vocab_cards(level, deck_id);


