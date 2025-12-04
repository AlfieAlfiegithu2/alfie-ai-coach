// D1 Translation API Client
// This fetches translations from Cloudflare D1 instead of Supabase
// to reduce database size and egress costs

const D1_API_URL = 'https://alfie-translations-api.ryanbigbang15.workers.dev';

export interface D1Translation {
  card_id: string;
  lang: string;
  translations: string[]; // Array of translations
}

export interface D1Enrichment {
  card_id: string;
  lang: string;
  ipa?: string;
  context?: string;
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

