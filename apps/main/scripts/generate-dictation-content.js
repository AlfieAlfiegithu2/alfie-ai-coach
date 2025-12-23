#!/usr/bin/env node

/**
 * Dictation Content Generator
 * 
 * Generates 20 sentences per topic using DeepSeek API
 * Each sentence is appropriate for the level and topic context
 * 
 * Usage:
 *   node scripts/generate-dictation-content.js [--level beginner|intermediate|advanced] [--topic topic-slug]
 *   
 * Examples:
 *   node scripts/generate-dictation-content.js                          # Generate all
 *   node scripts/generate-dictation-content.js --level beginner         # Generate beginner level only
 *   node scripts/generate-dictation-content.js --level beginner --topic weather  # Generate specific topic
 */

import { createClient } from '@supabase/supabase-js';

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ SUPABASE_URL and SUPABASE_KEY are required environment variables.');
    process.exit(1);
}

if (!GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY is required environment variable.');
    process.exit(1);
}

console.log(`📡 Using Supabase URL: ${SUPABASE_URL}`);
console.log(`🔑 Using Key (prefix): ${SUPABASE_KEY.substring(0, 20)}...`);

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Parse command line arguments
const args = process.argv.slice(2);
const levelFilter = args.includes('--level') ? args[args.indexOf('--level') + 1] : null;
const topicFilter = args.includes('--topic') ? args[args.indexOf('--topic') + 1] : null;

// Level-specific prompts
const LEVEL_PROMPTS = {
    beginner: `Generate 20 simple English sentences suitable for absolute beginners learning English.
The sentences should be:
- Short (5-10 words each)
- Use only common, everyday vocabulary
- Have clear pronunciation with no tricky words
- Be grammatically simple (present tense, basic structures)
- Be practical and useful for daily life

Topic: {topic}
Context: {description}

Return ONLY a JSON array of 20 sentence strings, nothing else.
Example format: ["The weather is nice today.", "I like sunny days."]`,

    intermediate: `Generate 20 English sentences suitable for intermediate learners preparing for TOEIC or business English.
The sentences should be:
- Medium length (10-18 words each)
- Use professional/business vocabulary
- Include some compound sentences
- Cover workplace, travel, or formal situations
- Sound natural and conversational

Topic: {topic}
Context: {description}

Return ONLY a JSON array of 20 sentence strings, nothing else.
Example format: ["The meeting has been rescheduled to 3 PM tomorrow.", "Please confirm your attendance by Friday."]`,

    advanced: `Generate 20 English sentences suitable for advanced learners preparing for IELTS Academic listening.
The sentences should be:
- Longer and more complex (15-25 words each)
- Use academic vocabulary and formal register
- Include complex grammatical structures
- Cover academic, scientific, or university contexts
- Feature connected speech patterns (contractions, linking)

Topic: {topic}  
Context: {description}

Return ONLY a JSON array of 20 sentence strings, nothing else.
Example format: ["The research methodology employed qualitative analysis techniques.", "Registration for the semester closes on September 5th."]`,
};

async function generateSentences(level, topic) {
    const promptTemplate = LEVEL_PROMPTS[level.slug];
    if (!promptTemplate) {
        console.error(`❌ Unknown level: ${level.slug}`);
        return [];
    }

    const prompt = promptTemplate
        .replace('{topic}', topic.title)
        .replace('{description}', topic.description || topic.title);

    console.log(`\n📝 Generating sentences for "${topic.title}" (${level.name})...`);

    try {
        const geminiKey = process.env.GEMINI_API_KEY;
        if (!geminiKey) {
            console.error('❌ GEMINI_API_KEY is missing in environment');
            return [];
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${geminiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: `You are an expert English language teacher creating dictation exercises. Follow the instructions below and return ONLY valid JSON.\n\n${prompt}` }]
                }],
                generationConfig: {
                    temperature: 0.8,
                    maxOutputTokens: 4000,
                    response_mime_type: "application/json"
                }
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Gemini API Error: ${response.status} - ${errText}`);
        }

        const aiData = await response.json();
        let content = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Clean markdown code blocks if present
        if (content.includes('```')) {
            content = content.replace(/```json/g, '').replace(/```/g, '');
        }

        // Parse JSON response
        let sentences;
        try {
            sentences = JSON.parse(content.trim());
        } catch (parseError) {
            console.error(`❌ Failed to parse response for ${topic.title}:`, content?.substring(0, 200));
            return [];
        }

        if (!Array.isArray(sentences)) {
            console.error(`❌ Response is not an array for ${topic.title}`);
            return [];
        }

        console.log(`   ✅ Generated ${sentences.length} sentences`);
        return sentences.slice(0, 20); // Ensure max 20
    } catch (error) {
        console.error(`❌ API error for ${topic.title}:`, error.message);
        return [];
    }
}

async function saveSentences(topicId, sentences) {
    if (sentences.length === 0) return 0;

    // Check existing sentences
    const { data: existing } = await supabase
        .from('dictation_sentences')
        .select('id')
        .eq('topic_id', topicId);

    if (existing && existing.length > 0) {
        console.log(`   ⚠️  Topic already has ${existing.length} sentences, skipping...`);
        return 0;
    }

    // Insert new sentences
    const records = sentences.map((text, idx) => ({
        topic_id: topicId,
        sentence_text: text.trim(),
        order_index: idx + 1,
    }));

    const { error } = await supabase.from('dictation_sentences').insert(records);

    if (error) {
        console.error(`   ❌ Failed to save sentences:`, error.message);
        return 0;
    }

    console.log(`   ✅ Saved ${records.length} sentences to database`);
    return records.length;
}

async function main() {
    console.log('🎧 Dictation Content Generator\n');
    console.log('Filters:', { level: levelFilter || 'all', topic: topicFilter || 'all' });

    // Get all levels
    let levelsQuery = supabase.from('dictation_levels').select('*').order('order_index');
    if (levelFilter) {
        levelsQuery = levelsQuery.eq('slug', levelFilter);
    }

    const { data: levels, error: levelsError } = await levelsQuery;

    if (levelsError) {
        console.error('❌ Failed to load levels:', levelsError.message);
        process.exit(1);
    }

    if (!levels || levels.length === 0) {
        console.error('❌ No levels found');
        process.exit(1);
    }

    let totalGenerated = 0;
    let totalTopics = 0;

    for (const level of levels) {
        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`${level.icon} ${level.name} Level`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

        // Get topics for this level
        let topicsQuery = supabase
            .from('dictation_topics')
            .select('*')
            .eq('level_id', level.id)
            .order('order_index');

        if (topicFilter) {
            topicsQuery = topicsQuery.eq('slug', topicFilter);
        }

        const { data: topics, error: topicsError } = await topicsQuery;

        if (topicsError) {
            console.error('❌ Failed to load topics:', topicsError.message);
            continue;
        }

        if (!topics || topics.length === 0) {
            console.log('   No topics found for this level');
            continue;
        }

        for (const topic of topics) {
            totalTopics++;

            // 🟢 Check existing sentences FIRST before calling AI
            const { data: existing } = await supabase
                .from('dictation_sentences')
                .select('id')
                .eq('topic_id', topic.id)
                .limit(1);

            if (existing && existing.length > 0) {
                console.log(`\n⏭️  Skipping "${topic.title}" - already has content.`);
                continue;
            }

            // Retry logic
            let attempts = 0;
            let success = false;
            while (attempts < 3 && !success) {
                attempts++;
                if (attempts > 1) console.log(`   🔄 Retry attempt ${attempts}...`);

                const sentences = await generateSentences(level, topic);
                if (sentences.length > 0) {
                    const saved = await saveSentences(topic.id, sentences);
                    if (saved > 0) {
                        totalGenerated += saved;
                        success = true;
                    }
                }

                if (!success && attempts < 3) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }

            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Generation Complete');
    console.log(`   Topics processed: ${totalTopics}`);
    console.log(`   Sentences generated: ${totalGenerated}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch(console.error);
