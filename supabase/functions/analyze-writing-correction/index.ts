import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

// Types for spans and enhancements
export type Span = {
  text: string;
  status: "suggestion" | "enhancement" | "neutral";
};

export type EnhancementSuggestion = {
  type: string;
  category: string;
  severity: "high" | "medium" | "low";
  original: string;
  suggested: string;
  explanation: string;
  position: { start: number; end: number };
};

export type EnhancementAnalysisResult = {
  originalSpans: Span[];
  enhancedSpans: Span[];
  suggestions: EnhancementSuggestion[];
  summary: {
    totalSuggestions: number;
    suggestionsByCategory: Record<string, number>;
    overallFeedback: string;
  };
};

export interface AnalyzeRequest {
  userSubmission: string;
  questionPrompt?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const deepSeekApiKey = Deno.env.get('DEEPSEEK_API_KEY');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper function to generate content hash for caching
function generateContentHash(userSubmission: string, questionPrompt?: string): string {
  const content = `${userSubmission}${questionPrompt || ''}`;
  const hash = Array.from(content)
    .reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) & 0xffffffff, 0)
    .toString(36)
    .slice(-6);
  return hash;
}

// Get cached analysis result from Supabase
async function getCachedAnalysis(
  contentHash: string
): Promise<EnhancementAnalysisResult | null> {
  try {
    console.log(`🔍 Checking cache for hash: ${contentHash}`);
    
    const { data, error } = await supabase
      .from('writing_analysis_cache')
      .select('analysis_result, access_count')
      .eq('content_hash', contentHash)
      .single();

    if (error || !data) {
      console.log(`❌ No cache found: ${error?.message || 'No data'}`);
      return null;
    }

    // Update access count
    await supabase
      .from('writing_analysis_cache')
      .update({ 
        access_count: data.access_count + 1,
        last_accessed: new Date().toISOString()
      })
      .eq('content_hash', contentHash);

    console.log(`✅ Found cached analysis result`);
    return data.analysis_result as EnhancementAnalysisResult;
  } catch (error) {
    console.error(`❌ Error fetching cache: ${error.message}`);
    return null;
  }
}

// Cache analysis result in Supabase
async function cacheAnalysis(
  contentHash: string,
  userSubmission: string,
  questionPrompt: string | undefined,
  result: EnhancementAnalysisResult
): Promise<void> {
  try {
    const { error } = await supabase
      .from('writing_analysis_cache')
      .insert({
        content_hash: contentHash,
        user_submission: userSubmission,
        question_prompt: questionPrompt,
        analysis_result: result,
        access_count: 1,
        created_at: new Date().toISOString(),
        last_accessed: new Date().toISOString()
      });

    if (error) {
      console.error(`❌ Error caching analysis: ${error.message}`);
    } else {
      console.log(`✅ Analysis cached successfully`);
    }
  } catch (error) {
    console.error(`❌ Error in cacheAnalysis: ${error.message}`);
  }
}

// Generate thoughtful enhancement suggestions focusing on Band 9 quality
async function generateEnhancementAnalysis(
  userSubmission: string,
  questionPrompt?: string
): Promise<EnhancementAnalysisResult> {

  // Phase 1: Thoughtful AI analysis focusing on enhancement opportunities
  if (deepSeekApiKey) {
    try {
      console.log(`🎯 Calling DeepSeek API for thoughtful enhancement analysis...`);
      
      const enhancementPrompt = `You are an expert IELTS writing instructor analyzing student writing to provide constructive enhancement suggestions toward Band 9 quality.

**YOUR MISSION:**
Identify 3-6 specific enhancement opportunities that would elevate this writing toward Band 9 excellence. Focus on genuine improvements, not arbitrary corrections.

**ENHANCEMENT PHILOSOPHY:**
- Look for ways to enhance vocabulary, style, and academic tone
- Suggest improvements that demonstrate higher-level English proficiency
- Only mark genuine enhancement opportunities, not trivial changes
- Quality over quantity - fewer, meaningful suggestions are better
- Consider the writing quality - excellent writing needs fewer suggestions

**AREAS TO CONSIDER:**
1. **Vocabulary Enhancement**: Replace basic words with more sophisticated alternatives
2. **Academic Tone**: Improve formality and precision
3. **Sentence Structure**: Enhance complexity and variety
4. **Clarity & Precision**: Make ideas more precise and well-expressed
5. **IELTS Criteria**: Task achievement, coherence, lexical resource, grammar

**RESPONSE FORMAT:**
{
  "original_spans": [
    {"text": "The chart ", "status": "neutral"},
    {"text": "shows", "status": "suggestion"},
    {"text": " information about population.", "status": "neutral"}
  ],
  "enhanced_spans": [
    {"text": "The chart ", "status": "neutral"},
    {"text": "illustrates", "status": "enhancement"}, 
    {"text": " data on population.", "status": "neutral"}
  ],
  "suggestions": [
    {
      "type": "vocabulary_enhancement",
      "category": "Academic Writing",
      "severity": "medium",
      "original": "shows",
      "suggested": "illustrates",
      "explanation": "Using 'illustrates' demonstrates more sophisticated vocabulary and is preferred in academic data description",
      "position": {"start": 10, "end": 15}
    }
  ],
  "summary": {
    "totalSuggestions": 4,
    "suggestionsByCategory": {"Vocabulary": 2, "Style": 1, "Clarity": 1},
    "overallFeedback": "Well-written with several opportunities to demonstrate Band 9 level vocabulary and style."
  }
}

**TEXT TO ANALYZE:**
"${userSubmission}"

Provide thoughtful, educational enhancement suggestions that help the student reach Band 9 quality. Be constructive and focus on genuine improvement opportunities.`;

      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${deepSeekApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: enhancementPrompt
            }
          ],
          max_tokens: 3500, // Adequate tokens for thoughtful analysis
          temperature: 0.3 // Balanced creativity for suggestions
        }),
      });

      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.status} - ${await response.text()}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      
      if (!content) {
        throw new Error('No content in DeepSeek response');
      }

      console.log(`🔍 Raw AI response preview: ${content.substring(0, 300)}...`);

      // Parse JSON response with multiple extraction attempts
      let aiResult;
      try {
        // Try multiple JSON extraction patterns
        const patterns = [
          /```(?:json)?\s*(\{[\s\S]*?\})\s*```/,
          /(\{[\s\S]*"summary"[\s\S]*?\})/,
          /(\{[\s\S]*?\})/
        ];
        
        let jsonStr = content;
        for (const pattern of patterns) {
          const match = content.match(pattern);
          if (match) {
            jsonStr = match[1];
            break;
          }
        }
        
        aiResult = JSON.parse(jsonStr);
      } catch (e) {
        console.error(`❌ Failed to parse AI response: ${e.message}`);
        console.log(`Raw response: ${content}`);
        throw new Error('Invalid JSON from AI - falling back to rule-based');
      }

      // Quality validation - ensure meaningful suggestions
      const suggestionSpans = aiResult.original_spans?.filter(s => s.status === 'suggestion')?.length || 0;
      const enhancementSpans = aiResult.enhanced_spans?.filter(s => s.status === 'enhancement')?.length || 0;
      const totalSuggestions = aiResult.suggestions?.length || 0;

      console.log(`🎯 AI Enhancement Metrics: { suggestionSpans: ${suggestionSpans}, enhancementSpans: ${enhancementSpans}, totalSuggestions: ${totalSuggestions} }`);

      // Accept AI result if it has meaningful suggestions (flexible approach)
      if (totalSuggestions >= 2 && suggestionSpans >= 2) {
        // Transform and validate result
        const result: EnhancementAnalysisResult = {
          originalSpans: aiResult.original_spans || [],
          enhancedSpans: aiResult.enhanced_spans || [],
          suggestions: aiResult.suggestions || [],
          summary: aiResult.summary || {
            totalSuggestions: totalSuggestions,
            suggestionsByCategory: {"Vocabulary": 2, "Style": 1},
            overallFeedback: "Enhancement opportunities identified for Band 9 progression."
          }
        };

        console.log(`✅ Quality AI enhancement analysis: ${suggestionSpans} suggestion spans, ${enhancementSpans} enhancement spans, ${totalSuggestions} suggestions`);
        return result;
      } else {
        console.log(`⚠️ AI analysis insufficient (needs 2+ suggestions). Generating thoughtful fallback...`);
        return generateThoughtfulSuggestions(userSubmission, questionPrompt);
      }

    } catch (error) {
      console.error(`❌ AI analysis failed: ${error.message}. Falling back to thoughtful suggestions.`);
    }
  }

  // Thoughtful fallback system
  console.log(`🎯 Generating thoughtful enhancement suggestions...`);
  return generateThoughtfulSuggestions(userSubmission, questionPrompt);
}

// Thoughtful fallback system focusing on genuine improvements
function generateThoughtfulSuggestions(
  userSubmission: string,
  questionPrompt?: string
): EnhancementAnalysisResult {
  console.log(`🎯 Generating thoughtful enhancement suggestions focused on genuine improvements...`);
  
  const suggestions: EnhancementSuggestion[] = [];
  
  // Thoughtful enhancement patterns - focus on meaningful improvements
  const enhancementPatterns = [
    // High-impact vocabulary enhancements
    { pattern: /\bshows?\b/gi, replacement: "illustrates", type: "vocabulary_enhancement", category: "Academic Writing", explanation: "Demonstrates more sophisticated academic vocabulary for data presentation", priority: "high" },
    { pattern: /\bgives?\b/gi, replacement: "provides", type: "vocabulary_enhancement", category: "Academic Writing", explanation: "More formal and precise verb choice", priority: "medium" },
    { pattern: /\bbig\b/gi, replacement: "substantial", type: "vocabulary_enhancement", category: "Academic Writing", explanation: "More precise and academic adjective", priority: "medium" },
    { pattern: /\ba lot of\b/gi, replacement: "numerous", type: "formality", category: "Academic Writing", explanation: "Replaces informal expression with academic alternative", priority: "high" },
    { pattern: /\bthings?\b/gi, replacement: "aspects", type: "vocabulary_enhancement", category: "Academic Writing", explanation: "More specific and academic vocabulary", priority: "medium" },
    
    // Academic tone improvements
    { pattern: /\bpeople think\b/gi, replacement: "individuals believe", type: "formality", category: "Academic Writing", explanation: "More formal and precise expression", priority: "high" },
    { pattern: /\bwe can see\b/gi, replacement: "it is evident", type: "formality", category: "Academic Writing", explanation: "Removes informal first person perspective", priority: "medium" },
    
    // Style and clarity enhancements
    { pattern: /\bthis shows\b/gi, replacement: "this demonstrates", type: "vocabulary_enhancement", category: "Academic Writing", explanation: "Stronger, more academic verb choice", priority: "medium" },
    { pattern: /\bvery\b/gi, replacement: "particularly", type: "adverb_enhancement", category: "Style", explanation: "More sophisticated intensifier", priority: "low" }
  ];

  let enhancedText = userSubmission;
  let totalSuggestions = 0;

  // Apply enhancement suggestions thoughtfully
  enhancementPatterns.forEach((pattern) => {
    const matches = [...userSubmission.matchAll(pattern.pattern)];
    matches.forEach(match => {
      // Limit suggestions to 6 for quality focus
      if (match.index !== undefined && totalSuggestions < 6) {
        const original = match[0];
        const startPos = match.index;
        const endPos = match.index + original.length;
        
        suggestions.push({
          type: pattern.type,
          category: pattern.category,
          severity: pattern.priority === "high" ? "high" : "medium",
          original,
          suggested: pattern.replacement,
          explanation: pattern.explanation,
          position: { start: startPos, end: endPos }
        });
        
        // Replace in enhanced text
        enhancedText = enhancedText.replace(original, pattern.replacement);
        totalSuggestions++;
      }
    });
  });

  // Add thoughtful additional suggestions if writing quality allows
  if (suggestions.length < 3 && userSubmission.length > 100) {
    console.log(`🎯 Adding thoughtful vocabulary enhancements...`);
    
    // Additional meaningful improvements
    const additionalEnhancements = [
      { word: "important", replacement: "significant", explanation: "More precise and academic terminology" },
      { word: "help", replacement: "facilitate", explanation: "Demonstrates advanced vocabulary" },
      { word: "change", replacement: "transform", explanation: "Stronger, more impactful verb choice" }
    ];

    additionalEnhancements.forEach(improvement => {
      const regex = new RegExp(`\\b${improvement.word}\\b`, 'gi');
      const matches = [...userSubmission.matchAll(regex)];
      
      matches.forEach(match => {
        if (match.index !== undefined && suggestions.length < 5) {
          suggestions.push({
            type: "vocabulary_enhancement",
            category: "Academic Writing",
            severity: "medium",
            original: match[0],
            suggested: improvement.replacement,
            explanation: improvement.explanation,
            position: { start: match.index, end: match.index + match[0].length }
          });
          
          enhancedText = enhancedText.replace(match[0], improvement.replacement);
        }
      });
    });
  }

  // Build spans with meaningful highlighting
  const originalSpans: Span[] = [];
  const enhancedSpans: Span[] = [];

  // Split text into words and spaces
  const originalTokens = userSubmission.split(/(\s+|[.,;:!?()"])/);
  const enhancedTokens = enhancedText.split(/(\s+|[.,;:!?()"])/);

  // Mark original spans with suggestions
  originalTokens.forEach((token, index) => {
    const hasSuggestion = suggestions.some(s => {
      const tokenLower = token.toLowerCase().trim();
      const originalLower = s.original.toLowerCase().trim();
      return tokenLower === originalLower || (tokenLower.length > 2 && originalLower.includes(tokenLower));
    });

    originalSpans.push({
      text: token,
      status: hasSuggestion ? "suggestion" : "neutral"
    });
  });

  // Mark enhanced spans with improvements  
  enhancedTokens.forEach((token, index) => {
    const hasEnhancement = suggestions.some(s => {
      const tokenLower = token.toLowerCase().trim();
      const suggestedLower = s.suggested.toLowerCase().trim();
      return tokenLower === suggestedLower || (tokenLower.length > 2 && suggestedLower.includes(tokenLower));
    });

    enhancedSpans.push({
      text: token,
      status: hasEnhancement ? "enhancement" : "neutral"
    });
  });

  const suggestionSpanCount = originalSpans.filter(s => s.status === 'suggestion').length;
  const enhancementSpanCount = enhancedSpans.filter(s => s.status === 'enhancement').length;

  console.log(`✅ Thoughtful suggestions generated: {
    originalSpans: ${originalSpans.length},
    enhancedSpans: ${enhancedSpans.length},
    suggestions: ${suggestions.length},
    suggestionSpans: ${suggestionSpanCount},
    enhancementSpans: ${enhancementSpanCount}
  }`);

  return {
    originalSpans,
    enhancedSpans,
    suggestions,
    summary: {
      totalSuggestions: suggestions.length,
      suggestionsByCategory: suggestions.reduce((acc, s) => {
        acc[s.category] = (acc[s.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      overallFeedback: `Thoughtful analysis completed with ${suggestions.length} enhancement opportunities identified to help reach Band 9 quality.`
    }
  };
}

// Main server handler
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userSubmission, questionPrompt } = (await req.json()) as AnalyzeRequest;

    if (!userSubmission || typeof userSubmission !== 'string') {
      throw new Error('userSubmission is required and must be a string');
    }

    console.log('🎯 Starting enhancement analysis...', {
      submissionLength: userSubmission.length,
      hasPrompt: !!questionPrompt
    });

    // Generate content hash for caching
    const contentHash = generateContentHash(userSubmission, questionPrompt);
    console.log('🔑 Generated content hash:', contentHash);

    // Check cache first
    const cachedResult = await getCachedAnalysis(contentHash);
    if (cachedResult) {
      console.log('🚀 Returning cached analysis result');
      return new Response(JSON.stringify(cachedResult), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate new analysis with thoughtful enhancement suggestions
    const result = await generateEnhancementAnalysis(userSubmission, questionPrompt);

    // Cache the result
    await cacheAnalysis(contentHash, userSubmission, questionPrompt, result);

    console.log('✅ Enhancement analysis completed:', {
      originalSpans: result.originalSpans.length,
      enhancedSpans: result.enhancedSpans.length,
      suggestions: result.suggestions.length,
      suggestionSpans: result.originalSpans.filter(s => s.status === 'suggestion').length,
      enhancementSpans: result.enhancedSpans.filter(s => s.status === 'enhancement').length
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Enhancement analysis error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: 'Failed to analyze writing submission for enhancements'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});