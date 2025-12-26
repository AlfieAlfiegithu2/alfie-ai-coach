
-- D1 Schema for Dictation Translations
CREATE TABLE IF NOT EXISTS dictation_translations (
  id TEXT PRIMARY KEY,
  sentence_id TEXT NOT NULL,
  lang TEXT NOT NULL,
  translation TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(sentence_id, lang)
);

CREATE INDEX IF NOT EXISTS idx_dictation_sentence_id ON dictation_translations(sentence_id);
CREATE INDEX IF NOT EXISTS idx_dictation_lang ON dictation_translations(lang);
