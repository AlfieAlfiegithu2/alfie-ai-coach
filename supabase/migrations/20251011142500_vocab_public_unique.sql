create unique index if not exists uniq_public_vocab on vocab_cards (language, lower(term)) where is_public = true;

