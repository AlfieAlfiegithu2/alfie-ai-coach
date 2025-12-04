// D1 Translation API Client
// This fetches vocab data from Cloudflare D1 instead of Supabase
// to reduce database size and egress costs

const D1_API_URL = 'https://alfie-translations-api.ryanbigbang15.workers.dev';

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

/**
 * Fetch all vocab cards (for VocabularyBook, VocabTest)
 * Supports pagination
 */
export async function fetchVocabCards(options?: {
  limit?: number;
  offset?: number;
  ids?: string[];
  term?: string;
}): Promise<D1VocabCard[]> {
  try {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', options.limit.toString());
    if (options?.ids?.length) params.set('ids', options.ids.join(','));
    if (options?.term) params.set('term', options.term);
    
    const url = `${D1_API_URL}/cards${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('D1 cards fetch failed:', response.status);
      return [];
    }
    const data = await response.json();
    return data.data || [];
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
      fetch(`${D1_API_URL}/translations/all?lang=${encodeURIComponent(lang)}`)
    ]);
    
    if (!cardsRes.ok || !translationsRes.ok) {
      console.error('D1 fetch failed');
      return [];
    }
    
    const [cardsData, transData] = await Promise.all([
      cardsRes.json(),
      translationsRes.json()
    ]);
    
    const cards: D1VocabCard[] = cardsData.data || [];
    const translationMap: Record<string, string> = transData.data || {};
    
    // Merge translations into cards
    return cards.map(card => ({
      ...card,
      translation: translationMap[card.id] || card.term
    }));
  } catch (error) {
    console.error('Error fetching cards with translations from D1:', error);
    return [];
  }
}

/**
 * Fetch all translations for a specific language (for VocabularyBook)
 * Returns a map of card_id -> first translation
 */
export async function fetchAllTranslationsForLanguage(lang: string): Promise<Record<string, string>> {
  try {
    const response = await fetch(`${D1_API_URL}/translations/all?lang=${encodeURIComponent(lang)}`);
    if (!response.ok) {
      console.error('D1 translations fetch failed:', response.status);
      return {};
    }
    const data = await response.json();
    return data.data || {};
  } catch (error) {
    console.error('Error fetching translations from D1:', error);
    return {};
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

/**
 * Get D1 stats
 */
export async function getD1Stats(): Promise<{
  vocab_translations: number;
  vocab_translation_enrichments: number;
  translation_cache: number;
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

