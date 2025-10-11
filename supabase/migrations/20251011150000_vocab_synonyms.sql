alter table if exists vocab_cards add column if not exists synonyms_json jsonb default '[]'::jsonb;


