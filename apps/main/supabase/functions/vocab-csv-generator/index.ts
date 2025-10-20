import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY');

// Global user variable to be set in the main function
let currentUser: any = null;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Unauthorized');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false, autoRefreshToken: false } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    // Set global user variable
    currentUser = user;

    const body = await req.json().catch(() => ({}));
    const total = Math.min(Number(body?.total || 1000), 10000);
    const languages = body?.languages || ['en', 'ko', 'ja', 'zh', 'es', 'fr', 'de'];

    console.log(`Starting CSV generation for ${total} words in ${languages.length} languages`);

    // Generate vocabulary data using AI
    const csvData = await generateVocabularyCSV(total, languages);

    // Insert directly into vocab_cards
    const importResult = await insertVocabularyCards(csvData, supabase);

    return new Response(JSON.stringify({
      success: true,
      message: `Generated and imported ${total} vocabulary words`,
      importedCount: importResult,
      csvPreview: convertToCSV(csvData).substring(0, 500) + '...'
    }), { headers: { ...cors, 'Content-Type': 'application/json' } });

  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: String((e as any).message || e) }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' }
    });
  }
});

async function generateVocabularyCSV(total: number, languages: string[]) {
  const wordsPerBatch = 50;
  const batches = Math.ceil(total / wordsPerBatch);
  const allWords: any[] = [];

  for (let batch = 0; batch < batches; batch++) {
    const batchSize = Math.min(wordsPerBatch, total - batch * wordsPerBatch);
    console.log(`Generating batch ${batch + 1}/${batches} (${batchSize} words)`);

    // Generate English words with frequency data
    const englishWords = await generateEnglishWords(batchSize);

    for (const word of englishWords) {
      const wordData: any = {
        word: word.term,
        pos: word.pos || 'noun',
        ipa: word.ipa || '',
        frequency_rank: word.frequencyRank || 0,
        level: word.level || 1,
        context_sentence: word.examples?.[0] || '',
        example_1: word.examples?.[0] || '',
        example_2: word.examples?.[1] || '',
        example_3: word.examples?.[2] || '',
      };

      // Generate translations for each language
      for (const lang of languages) {
        if (lang === 'en') {
          wordData[lang] = word.term;
        } else {
          try {
            const translation = await translateWord(word.term, lang);
            wordData[lang] = translation;
          } catch (error) {
            console.log(`Translation failed for ${word.term} -> ${lang}:`, error);
            wordData[lang] = `[${lang.toUpperCase()}] ${word.term}`;
          }
        }
      }

      allWords.push(wordData);
    }

    // Small delay between batches to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  return allWords;
}

async function generateEnglishWords(count: number) {
  const prompt = `Generate ${count} common English vocabulary words suitable for language learning.
  Return a JSON array of objects with this exact format:
  [{"term": "word1", "pos": "noun", "ipa": "/wɜːrd/", "frequencyRank": 100, "level": 1, "examples": ["Example sentence 1.", "Example sentence 2.", "Example sentence 3."]}, ...]

  Rules:
  - Include diverse parts of speech (nouns, verbs, adjectives, adverbs)
  - Provide accurate IPA pronunciation
  - Use realistic frequency ranks (1-10000)
  - Assign appropriate CEFR levels (1-5)
  - Include exactly 3 natural, useful example sentences for each word (8-15 words each)
  - Focus on useful, everyday vocabulary
  - No duplicates, no proper nouns
  - Examples should demonstrate the word in context`;

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 4000  // Increased for examples
    })
  });

  if (!response.ok) throw new Error('Failed to generate words');

  const data = await response.json();
  const content = data.choices[0].message.content;

  // Extract JSON from response
  const jsonMatch = content.match(/\[.*\]/s);
  if (!jsonMatch) throw new Error('Invalid response format');

  const words = JSON.parse(jsonMatch[0]);

  // Ensure each word has examples array
  return words.map((word: any) => ({
    ...word,
    examples: Array.isArray(word.examples) ? word.examples.slice(0, 3) : []
  }));
}

async function translateWord(text: string, targetLang: string) {
  const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/translation-service`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      targetLang,
      sourceLang: 'en',
      includeContext: false
    })
  });

  if (!response.ok) throw new Error(`Translation API error: ${response.status}`);

  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Translation failed');

  return data.result?.translation || text;
}

function convertToCSV(data: any[]) {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','), // Header row
    ...data.map(row =>
      headers.map(header => {
        const value = row[header] || '';
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ];

  return csvRows.join('\n');
}

async function insertVocabularyCards(csvData: any[], supabase: any) {
  let inserted = 0;
  const batchSize = 50; // Insert in smaller batches to avoid timeouts

  for (let i = 0; i < csvData.length; i += batchSize) {
    const batch = csvData.slice(i, i + batchSize);

    // Create deck if needed
    const { data: deck } = await supabase
      .from('vocab_decks')
      .insert({ user_id: currentUser.id, name: `CSV Import ${new Date().toISOString().slice(0, 10)}`, is_public: true })
      .select('id')
      .single();

    if (!deck?.id) throw new Error('Failed to create deck');

    // Prepare cards for insertion
    const cardsToInsert = batch.map((wordData: any) => ({
      user_id: currentUser.id,
      deck_id: deck.id,
      term: wordData.word,
      translation: wordData.en || '',
      pos: wordData.pos,
      ipa: wordData.ipa,
      context_sentence: wordData.context_sentence,
      examples_json: [
        wordData.example_1,
        wordData.example_2,
        wordData.example_3
      ].filter(Boolean),
      frequency_rank: wordData.frequency_rank,
      language: 'en',
      level: wordData.level,
      is_public: true
    }));

    // Insert cards and get IDs
    const { data: insertedCards, error: cardError } = await supabase
      .from('vocab_cards')
      .insert(cardsToInsert)
      .select('id, term');

    if (cardError) {
      console.error('Card insertion error:', cardError);
      throw new Error(`Failed to insert cards: ${cardError.message}`);
    }

    inserted += batch.length;

    // Queue translations for each card
    if (insertedCards && insertedCards.length > 0) {
      const cardIds = insertedCards.map((c: any) => c.id);
      const terms = insertedCards.map((c: any) => c.term);
      await queueTranslations(cardIds, terms);
    }

    // Small delay between batches
    if (i + batchSize < csvData.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return inserted;
}

// Simplified translation queueing - just queue a few key languages to avoid overwhelming
async function queueTranslations(cardIds: string[], terms: string[]) {
  if (!currentUser) {
    console.log('No current user available for translation queueing');
    return;
  }

  console.log(`vocab-csv-generator: queuing ${cardIds.length} cards for background translation`);

  const translationJobs = [];
  // Only queue translations for a few key languages to avoid overwhelming the system
  const keyLangs = ['ko', 'ja', 'zh', 'es', 'fr', 'de'];

  for (let i = 0; i < cardIds.length; i++) {
    const cardId = cardIds[i];
    const term = terms[i];

    for (const lang of keyLangs) {
      translationJobs.push({
        user_id: currentUser.id,
        card_id: cardId,
        term: term,
        target_lang: lang,
        status: 'pending',
        created_at: new Date().toISOString()
      });
    }
  }

  if (translationJobs.length > 0) {
    try {
      const { error: queueError } = await supabase.from('vocab_translation_queue').insert(translationJobs as any);
      if (queueError) {
        console.log(`vocab-csv-generator: failed to queue translations: ${queueError.message}`);
      } else {
        console.log(`vocab-csv-generator: queued ${translationJobs.length} translation jobs`);
      }
    } catch (error) {
      console.log(`vocab-csv-generator: translation queue error:`, error);
    }
  }
}
