// D1 Translation API Client
// This fetches vocab data from Cloudflare D1 instead of Supabase
// to reduce database size and egress costs

const D1_API_URL = import.meta.env.DEV ? '/translations-api' : 'https://alfie-translations-api.ryanbigbang15.workers.dev';

export interface D1VocabCard {
  id: string;
  term: string;
  pos?: string | null;
  ipa?: string | null;
  context_sentence?: string | null;
  examples_json?: string[];
  frequency_rank?: number | null;
  level?: number;
  audio_url?: string | null;
}

/**
 * Deterministic shuffle using Fisher-Yates and Math.sin
 * to ensure consistent level/set assignment across sessions
 */
export function getDeterministicShuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    // Seeded random based on index
    const j = Math.floor(Math.abs(Math.sin(i * 9999) * 10000) % (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export interface D1Translation {
  card_id: string;
  lang: string;
  translations: string[]; // Array of translations
}

export interface D1Enrichment {
  card_id: string;
  lang: string;
  ipa?: string;
}

// Global cache to avoid redundant large fetches
let cardsCache: D1VocabCard[] | null = null;
let translationsCache: Record<string, { first: Record<string, string>; all: Record<string, string[]> }> = {};

/**
 * Fetch all vocab cards (for VocabularyBook, VocabTest)
 * Supports pagination
 */
export async function fetchVocabCards(options?: {
  limit?: number;
  offset?: number;
  ids?: string[];
  term?: string;
  forceRefresh?: boolean;
}): Promise<D1VocabCard[]> {
  // Use cache only if fetching "the big batch" (limit >= 5000) and no other filters
  const isBigBatch = (options?.limit || 0) >= 5000 && !options?.offset && !options?.ids && !options?.term;

  if (isBigBatch && cardsCache && !options?.forceRefresh) {
    console.log('D1Client: Returning cached cards batch');
    return cardsCache;
  }

  try {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', options.limit.toString());
    if (options?.offset) params.set('offset', options.offset.toString());
    if (options?.ids?.length) params.set('ids', options.ids.join(','));
    if (options?.term) params.set('term', options.term);

    const url = `${D1_API_URL}/cards${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error('D1 cards fetch failed:', response.status);
      return [];
    }
    const data = await response.json();
    const result = data.data || [];

    // Cache the big batch
    if (isBigBatch) {
      cardsCache = result;
      console.log('D1Client: Cached new cards batch');
    }

    return result;
  } catch (error) {
    console.error('Error fetching cards from D1:', error);
    return [];
  }
}

/**
 * Fetch all vocab cards as a map (for bulk loading)
 * Returns map of card_id -> { term, sentence, examples, audio_url }
 */
export async function fetchAllVocabCardsMap(): Promise<Record<string, {
  term: string;
  sentence: string;
  examples: string[];
  audio_url?: string;
}>> {
  try {
    const response = await fetch(`${D1_API_URL}/cards/all`);
    if (!response.ok) {
      console.error('D1 cards/all fetch failed:', response.status);
      return {};
    }
    const data = await response.json();
    return data.data || {};
  } catch (error) {
    console.error('Error fetching all cards from D1:', error);
    return {};
  }
}

/**
 * Fetch vocab cards with translations for a specific language
 * Combined query for efficiency
 */
export async function fetchVocabCardsWithTranslations(
  lang: string,
  options?: { limit?: number; offset?: number }
): Promise<Array<D1VocabCard & { translation?: string; translations?: string[] }>> {
  try {
    // Fetch cards and translations in parallel
    const [cardsRes, translationsRes] = await Promise.all([
      fetch(`${D1_API_URL}/cards?limit=${options?.limit || 1000}`),
      fetchAllTranslationsForLanguage(lang)
    ]);

    const cards: D1VocabCard[] = (await (cardsRes as any).json()).data || [];
    const translationData = translationsRes;

    // Merge translations into cards
    return cards.map(card => ({
      ...card,
      translation: translationData.first[card.id] || card.term
    }));
  } catch (error) {
    console.error('Error fetching cards with translations from D1:', error);
    return [];
  }
}

/**
 * Fetch all translations for a specific language (for VocabularyBook)
 * Returns both first translation map and all translations map
 */
export async function fetchAllTranslationsForLanguage(
  lang: string,
  forceRefresh = false
): Promise<{
  first: Record<string, string>;
  all: Record<string, string[]>;
}> {
  if (translationsCache[lang] && !forceRefresh) {
    console.log(`D1Client: Returning cached translations for ${lang}`);
    return translationsCache[lang];
  }

  try {
    const response = await fetch(`${D1_API_URL}/translations/all?lang=${encodeURIComponent(lang)}`);
    if (!response.ok) {
      console.error('D1 translations fetch failed:', response.status);
      return { first: {}, all: {} };
    }
    const data = await response.json();
    const result = {
      first: data.data || {},
      all: data.allTranslations || {}
    };

    translationsCache[lang] = result;
    console.log(`D1Client: Cached translations for ${lang}`);

    return result;
  } catch (error) {
    console.error('Error fetching translations from D1:', error);
    return { first: {}, all: {} };
  }
}

/**
 * Fetch translations for specific card IDs and language
 */
export async function fetchTranslationsForCards(
  cardIds: string[],
  lang: string
): Promise<D1Translation[]> {
  if (cardIds.length === 0) return [];

  try {
    const cardIdsParam = cardIds.join(',');
    const response = await fetch(
      `${D1_API_URL}/translations?lang=${encodeURIComponent(lang)}&card_ids=${encodeURIComponent(cardIdsParam)}`
    );
    if (!response.ok) {
      console.error('D1 translations fetch failed:', response.status);
      return [];
    }
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching translations from D1:', error);
    return [];
  }
}

/**
 * Fetch enrichments for specific card IDs and language
 */
export async function fetchEnrichmentsForCards(
  cardIds: string[],
  lang: string
): Promise<D1Enrichment[]> {
  if (cardIds.length === 0) return [];

  try {
    const cardIdsParam = cardIds.join(',');
    const response = await fetch(
      `${D1_API_URL}/enrichments?lang=${encodeURIComponent(lang)}&card_ids=${encodeURIComponent(cardIdsParam)}`
    );
    if (!response.ok) {
      console.error('D1 enrichments fetch failed:', response.status);
      return [];
    }
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching enrichments from D1:', error);
    return [];
  }
}

export interface D1DictationTranslation {
  sentence_id: string;
  lang: string;
  translation: string;
}

/**
 * Fetch dictation translations for specific sentence IDs and language
 */
export async function fetchDictationTranslations(
  sentenceIds: string[],
  lang: string
): Promise<D1DictationTranslation[]> {
  if (sentenceIds.length === 0) return [];

  try {
    const sentenceIdsParam = sentenceIds.join(',');
    const response = await fetch(
      `${D1_API_URL}/dictation-translations?lang=${encodeURIComponent(lang)}&sentence_ids=${encodeURIComponent(sentenceIdsParam)}`
    );
    if (!response.ok) {
      console.error('D1 dictation translations fetch failed:', response.status);
      return [];
    }
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching dictation translations from D1:', error);
    return [];
  }
}

/**
 * Get D1 stats (Updated to include dictation)
 */
export async function getD1Stats(): Promise<{
  vocab_translations: number;
  vocab_translation_enrichments: number;
  dictation_translations: number;
} | null> {
  try {
    const response = await fetch(`${D1_API_URL}/stats`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.stats;
  } catch (error) {
    console.error('Error fetching D1 stats:', error);
    return null;
  }
}


