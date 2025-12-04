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

        // Build a map of card_id -> first translation
        const translationMap: Record<string, string> = {};
        result.results.forEach((row: any) => {
          const translations = JSON.parse(row.translations || '[]');
          translationMap[row.card_id] = translations[0] || '';
        });

        return jsonResponse({ 
          success: true, 
          data: translationMap,
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

      // GET /stats - Get database statistics
      if (path === '/stats' && request.method === 'GET') {
        const [translationsCount, enrichmentsCount, cacheCount] = await Promise.all([
          env.DB.prepare('SELECT COUNT(*) as count FROM vocab_translations').first(),
          env.DB.prepare('SELECT COUNT(*) as count FROM vocab_translation_enrichments').first(),
          env.DB.prepare('SELECT COUNT(*) as count FROM translation_cache').first(),
        ]);

        return jsonResponse({
          success: true,
          stats: {
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

