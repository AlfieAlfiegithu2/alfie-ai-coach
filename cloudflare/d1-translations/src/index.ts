/**
 * Cloudflare Worker - D1 Translations API
 * 
 * This worker serves vocabulary translations from Cloudflare D1,
 * reducing load on Supabase and providing edge-cached responses.
 */

export interface Env {
  DB: D1Database;
  ALLOWED_ORIGINS: string;
}

// CORS headers
function corsHeaders(origin: string, allowedOrigins: string): HeadersInit {
  const origins = allowedOrigins.split(',');
  const allowedOrigin = origins.includes(origin) ? origin : origins[0];
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

// JSON response helper
function jsonResponse(data: any, status: number, origin: string, allowedOrigins: string): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin, allowedOrigins),
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders(origin, env.ALLOWED_ORIGINS),
      });
    }

    try {
      // Route handling
      const path = url.pathname;

      // GET /translations?lang=ko&card_ids=id1,id2,id3
      if (path === '/translations' && request.method === 'GET') {
        const lang = url.searchParams.get('lang');
        const cardIds = url.searchParams.get('card_ids')?.split(',').filter(Boolean);

        if (!lang) {
          return jsonResponse({ error: 'lang parameter required' }, 400, origin, env.ALLOWED_ORIGINS);
        }

        let query = 'SELECT card_id, lang, translations FROM vocab_translations WHERE lang = ?';
        const params: any[] = [lang];

        if (cardIds && cardIds.length > 0) {
          const placeholders = cardIds.map(() => '?').join(',');
          query += ` AND card_id IN (${placeholders})`;
          params.push(...cardIds);
        }

        const result = await env.DB.prepare(query).bind(...params).all();
        
        // Parse translations JSON
        const translations = result.results.map((row: any) => ({
          card_id: row.card_id,
          lang: row.lang,
          translations: JSON.parse(row.translations || '[]'),
        }));

        return jsonResponse({ 
          success: true, 
          data: translations,
          count: translations.length 
        }, 200, origin, env.ALLOWED_ORIGINS);
      }

      // GET /enrichments?lang=ko&card_ids=id1,id2,id3
      if (path === '/enrichments' && request.method === 'GET') {
        const lang = url.searchParams.get('lang');
        const cardIds = url.searchParams.get('card_ids')?.split(',').filter(Boolean);

        if (!lang) {
          return jsonResponse({ error: 'lang parameter required' }, 400, origin, env.ALLOWED_ORIGINS);
        }

        let query = 'SELECT card_id, lang, ipa, context FROM vocab_translation_enrichments WHERE lang = ?';
        const params: any[] = [lang];

        if (cardIds && cardIds.length > 0) {
          const placeholders = cardIds.map(() => '?').join(',');
          query += ` AND card_id IN (${placeholders})`;
          params.push(...cardIds);
        }

        const result = await env.DB.prepare(query).bind(...params).all();

        return jsonResponse({ 
          success: true, 
          data: result.results,
          count: result.results.length 
        }, 200, origin, env.ALLOWED_ORIGINS);
      }

      // GET /translations/all?lang=ko (for VocabularyBook - all translations for a language)
      if (path === '/translations/all' && request.method === 'GET') {
        const lang = url.searchParams.get('lang');

        if (!lang) {
          return jsonResponse({ error: 'lang parameter required' }, 400, origin, env.ALLOWED_ORIGINS);
        }

        const result = await env.DB.prepare(
          'SELECT card_id, translations FROM vocab_translations WHERE lang = ?'
        ).bind(lang).all();

        // Build a map of card_id -> all translations (array)
        const translationMap: Record<string, string[]> = {};
        // Also keep first translation for backwards compatibility
        const firstTranslationMap: Record<string, string> = {};
        result.results.forEach((row: any) => {
          const translations = JSON.parse(row.translations || '[]');
          translationMap[row.card_id] = translations;
          firstTranslationMap[row.card_id] = translations[0] || '';
        });

        return jsonResponse({ 
          success: true, 
          data: firstTranslationMap, // Keep for backwards compatibility
          allTranslations: translationMap, // New: all translations
          count: result.results.length 
        }, 200, origin, env.ALLOWED_ORIGINS);
      }

      // POST /translations/batch - Batch upsert translations
      if (path === '/translations/batch' && request.method === 'POST') {
        const body = await request.json() as { translations: any[] };
        
        if (!body.translations || !Array.isArray(body.translations)) {
          return jsonResponse({ error: 'translations array required' }, 400, origin, env.ALLOWED_ORIGINS);
        }

        const stmt = env.DB.prepare(`
          INSERT INTO vocab_translations (id, card_id, lang, translations, provider, updated_at)
          VALUES (?, ?, ?, ?, ?, datetime('now'))
          ON CONFLICT(card_id, lang) DO UPDATE SET
            translations = excluded.translations,
            provider = excluded.provider,
            updated_at = datetime('now')
        `);

        const batch = body.translations.map((t: any) => 
          stmt.bind(
            t.id || crypto.randomUUID(),
            t.card_id,
            t.lang,
            JSON.stringify(t.translations),
            t.provider || 'gemini'
          )
        );

        await env.DB.batch(batch);

        return jsonResponse({ 
          success: true, 
          inserted: body.translations.length 
        }, 200, origin, env.ALLOWED_ORIGINS);
      }

      // POST /enrichments/batch - Batch upsert enrichments
      if (path === '/enrichments/batch' && request.method === 'POST') {
        const body = await request.json() as { enrichments: any[] };
        
        if (!body.enrichments || !Array.isArray(body.enrichments)) {
          return jsonResponse({ error: 'enrichments array required' }, 400, origin, env.ALLOWED_ORIGINS);
        }

        const stmt = env.DB.prepare(`
          INSERT INTO vocab_translation_enrichments (id, card_id, lang, translation, ipa, context, provider, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
          ON CONFLICT(card_id, lang) DO UPDATE SET
            translation = excluded.translation,
            ipa = excluded.ipa,
            context = excluded.context,
            provider = excluded.provider,
            updated_at = datetime('now')
        `);

        const batch = body.enrichments.map((e: any) => 
          stmt.bind(
            e.id || crypto.randomUUID(),
            e.card_id,
            e.lang,
            e.translation,
            e.ipa,
            e.context,
            e.provider || 'gemini'
          )
        );

        await env.DB.batch(batch);

        return jsonResponse({ 
          success: true, 
          inserted: body.enrichments.length 
        }, 200, origin, env.ALLOWED_ORIGINS);
      }

      // GET /cards - Get vocab cards with example sentences
      if (path === '/cards' && request.method === 'GET') {
        const cardIds = url.searchParams.get('ids')?.split(',').filter(Boolean);
        const term = url.searchParams.get('term');
        const limit = parseInt(url.searchParams.get('limit') || '100');
        const offset = parseInt(url.searchParams.get('offset') || '0');

        let query = 'SELECT id, term, pos, ipa, context_sentence, examples_json, frequency_rank, level, audio_url FROM vocab_cards';
        const params: any[] = [];
        const conditions: string[] = [];

        if (cardIds && cardIds.length > 0) {
          const placeholders = cardIds.map(() => '?').join(',');
          conditions.push(`id IN (${placeholders})`);
          params.push(...cardIds);
        }

        if (term) {
          conditions.push('term = ?');
          params.push(term);
        }

        if (conditions.length > 0) {
          query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ` ORDER BY term ASC LIMIT ${limit} OFFSET ${offset}`;

        const result = await env.DB.prepare(query).bind(...params).all();
        
        // Parse examples_json
        const cards = result.results.map((row: any) => ({
          ...row,
          examples_json: row.examples_json ? JSON.parse(row.examples_json) : [],
        }));

        return jsonResponse({ 
          success: true, 
          data: cards,
          count: cards.length 
        }, 200, origin, env.ALLOWED_ORIGINS);
      }

      // GET /cards/all - Get all vocab cards (for bulk loading)
      if (path === '/cards/all' && request.method === 'GET') {
        const result = await env.DB.prepare(
          'SELECT id, term, context_sentence, examples_json, audio_url FROM vocab_cards ORDER BY term ASC'
        ).all();

        // Build a map of card_id -> { term, sentence, audio_url }
        const cardsMap: Record<string, { term: string; sentence: string; examples: string[]; audio_url?: string }> = {};
        result.results.forEach((row: any) => {
          const examples = row.examples_json ? JSON.parse(row.examples_json) : [];
          cardsMap[row.id] = {
            term: row.term,
            sentence: row.context_sentence || examples[0] || '',
            examples,
            audio_url: row.audio_url || undefined
          };
        });

        return jsonResponse({ 
          success: true, 
          data: cardsMap,
          count: result.results.length 
        }, 200, origin, env.ALLOWED_ORIGINS);
      }

      // POST /cards/batch - Batch upsert vocab cards
      if (path === '/cards/batch' && request.method === 'POST') {
        const body = await request.json() as { cards: any[] };
        
        if (!body.cards || !Array.isArray(body.cards)) {
          return jsonResponse({ error: 'cards array required' }, 400, origin, env.ALLOWED_ORIGINS);
        }

        const stmt = env.DB.prepare(`
          INSERT INTO vocab_cards (id, term, pos, ipa, context_sentence, examples_json, frequency_rank, level, audio_url, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
          ON CONFLICT(id) DO UPDATE SET
            term = excluded.term,
            pos = excluded.pos,
            ipa = excluded.ipa,
            context_sentence = excluded.context_sentence,
            examples_json = excluded.examples_json,
            frequency_rank = excluded.frequency_rank,
            level = excluded.level,
            audio_url = excluded.audio_url,
            updated_at = datetime('now')
        `);

        const batch = body.cards.map((c: any) => 
          stmt.bind(
            c.id,
            c.term,
            c.pos || null,
            c.ipa || null,
            c.context_sentence || null,
            c.examples_json ? JSON.stringify(c.examples_json) : null,
            c.frequency_rank || null,
            c.level || 1,
            c.audio_url || null
          )
        );

        await env.DB.batch(batch);

        return jsonResponse({ 
          success: true, 
          inserted: body.cards.length 
        }, 200, origin, env.ALLOWED_ORIGINS);
      }

      // GET /cards/without-sentences - Get cards missing context_sentence
      if (path === '/cards/without-sentences' && request.method === 'GET') {
        const limit = parseInt(url.searchParams.get('limit') || '100');
        const offset = parseInt(url.searchParams.get('offset') || '0');

        // Get total count first
        const countResult = await env.DB.prepare(
          'SELECT COUNT(*) as total FROM vocab_cards WHERE context_sentence IS NULL'
        ).first();
        const total = (countResult as any)?.total || 0;

        // Get cards
        const result = await env.DB.prepare(
          'SELECT id, term, pos FROM vocab_cards WHERE context_sentence IS NULL ORDER BY term ASC LIMIT ? OFFSET ?'
        ).bind(limit, offset).all();

        return jsonResponse({ 
          success: true, 
          data: result.results,
          total,
          count: result.results.length 
        }, 200, origin, env.ALLOWED_ORIGINS);
      }

      // POST /cards/update-sentences - Batch update context_sentence
      if (path === '/cards/update-sentences' && request.method === 'POST') {
        const body = await request.json() as { sentences: { id: string; sentence: string }[] };
        
        if (!body.sentences || !Array.isArray(body.sentences)) {
          return jsonResponse({ error: 'sentences array required' }, 400, origin, env.ALLOWED_ORIGINS);
        }

        const stmt = env.DB.prepare(
          'UPDATE vocab_cards SET context_sentence = ?, updated_at = datetime(\'now\') WHERE id = ?'
        );

        const batch = body.sentences.map((s: any) => 
          stmt.bind(s.sentence, s.id)
        );

        await env.DB.batch(batch);

        return jsonResponse({ 
          success: true, 
          updated: body.sentences.length 
        }, 200, origin, env.ALLOWED_ORIGINS);
      }

      // GET /stats - Get database statistics
      if (path === '/stats' && request.method === 'GET') {
        const [cardsCount, translationsCount, enrichmentsCount, cacheCount] = await Promise.all([
          env.DB.prepare('SELECT COUNT(*) as count FROM vocab_cards').first().catch(() => ({ count: 0 })),
          env.DB.prepare('SELECT COUNT(*) as count FROM vocab_translations').first(),
          env.DB.prepare('SELECT COUNT(*) as count FROM vocab_translation_enrichments').first(),
          env.DB.prepare('SELECT COUNT(*) as count FROM translation_cache').first().catch(() => ({ count: 0 })),
        ]);

        return jsonResponse({
          success: true,
          stats: {
            vocab_cards: (cardsCount as any)?.count || 0,
            vocab_translations: (translationsCount as any)?.count || 0,
            vocab_translation_enrichments: (enrichmentsCount as any)?.count || 0,
            translation_cache: (cacheCount as any)?.count || 0,
          }
        }, 200, origin, env.ALLOWED_ORIGINS);
      }

      // Health check
      if (path === '/health') {
        return jsonResponse({ status: 'ok', timestamp: new Date().toISOString() }, 200, origin, env.ALLOWED_ORIGINS);
      }

      return jsonResponse({ error: 'Not found' }, 404, origin, env.ALLOWED_ORIGINS);

    } catch (error: any) {
      console.error('D1 API Error:', error);
      return jsonResponse({ 
        error: 'Internal server error', 
        message: error.message 
      }, 500, origin, env.ALLOWED_ORIGINS);
    }
  },
};

