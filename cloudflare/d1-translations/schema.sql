-- Cloudflare D1 Schema for Vocabulary Translations
-- This replaces Supabase tables: vocab_translations, vocab_translation_enrichments, translation_cache

-- Main translations table
CREATE TABLE IF NOT EXISTS vocab_translations (
    id TEXT PRIMARY KEY,
    card_id TEXT NOT NULL,
    lang TEXT NOT NULL,
    translations TEXT NOT NULL,  -- JSON array stored as text
    provider TEXT DEFAULT 'gemini',
    quality INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Create unique index for upserts
CREATE UNIQUE INDEX IF NOT EXISTS idx_translations_card_lang ON vocab_translations(card_id, lang);

-- Index for fast lookups by language
CREATE INDEX IF NOT EXISTS idx_translations_lang ON vocab_translations(lang);

-- Index for fast lookups by card
CREATE INDEX IF NOT EXISTS idx_translations_card ON vocab_translations(card_id);

-- Enrichments table (IPA, context sentences)
CREATE TABLE IF NOT EXISTS vocab_translation_enrichments (
    id TEXT PRIMARY KEY,
    card_id TEXT NOT NULL,
    lang TEXT NOT NULL,
    translation TEXT,
    ipa TEXT,
    context TEXT,
    provider TEXT DEFAULT 'gemini',
    quality INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Create unique index for upserts
CREATE UNIQUE INDEX IF NOT EXISTS idx_enrichments_card_lang ON vocab_translation_enrichments(card_id, lang);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_enrichments_lang ON vocab_translation_enrichments(lang);
CREATE INDEX IF NOT EXISTS idx_enrichments_card ON vocab_translation_enrichments(card_id);

-- Translation cache (for general translations, not vocab-specific)
CREATE TABLE IF NOT EXISTS translation_cache (
    id TEXT PRIMARY KEY,
    word TEXT NOT NULL,
    source_lang TEXT NOT NULL,
    target_lang TEXT NOT NULL,
    translation TEXT NOT NULL,
    hit_count INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT
);

-- Unique index for cache lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_cache_word_langs ON translation_cache(word, source_lang, target_lang);

