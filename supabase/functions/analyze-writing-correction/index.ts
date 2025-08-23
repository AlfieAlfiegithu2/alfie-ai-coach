import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

// Types for spans and corrections
export type Span = {
  text: string;
  status: "error" | "improvement" | "neutral";
};

export type EnhancedCorrection = {
  type: string;
  category: string;
  severity: "high" | "medium" | "low";
  original: string;
  corrected: string;
  explanation: string;
  position: { start: number; end: number };
};

export type EnhancedCorrectionResult = {
  originalSpans: Span[];
  correctedSpans: Span[];
  corrections: EnhancedCorrection[];
  summary: {
    totalErrors: number;
    errorsByCategory: Record<string, number>;
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
): Promise<EnhancedCorrectionResult | null> {
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
    return data.analysis_result as EnhancedCorrectionResult;
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
  result: EnhancedCorrectionResult
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

// Generate guaranteed corrections with ultra-aggressive AI analysis
async function generateGuaranteedCorrections(
  userSubmission: string,
  questionPrompt?: string
): Promise<EnhancedCorrectionResult> {

  // Phase 1: Ultra-aggressive AI analysis with quality enforcement
  if (deepSeekApiKey) {
    try {
      console.log(`🔍 Calling DeepSeek API for ultra-aggressive writing analysis...`);
      
      const ultraAggressivePrompt = `🚨 CRITICAL ANALYSIS MISSION: You are the most thorough IELTS examiner conducting detailed correction analysis. You MUST find at least 8-12 specific errors and improvements in ANY text, even if it appears well-written.

**ABSOLUTE MANDATES - NO EXCEPTIONS:**
1. ALWAYS mark 8-12+ specific words/phrases with "error" or "improvement" status
2. Even perfect writing has vocabulary upgrades and style enhancements  
3. Find issues in: grammar, vocabulary choice, academic tone, clarity, IELTS criteria
4. NO TEXT IS EXEMPT - all writing can be improved
5. Be hyper-critical about even minor imperfections

**GUARANTEED ERROR PATTERNS TO FIND:**
✅ Vocabulary: Replace basic words with advanced alternatives (shows→illustrates, good→beneficial)
✅ Grammar: Articles (a/an/the), prepositions, verb forms, subject-verb agreement
✅ Academic tone: Formal vs informal language (I think→It can be argued)
✅ Clarity: Wordy phrases, unclear references (this shows→this demonstrates)
✅ IELTS style: Task-specific language, band score improvements
✅ Style: Repetitive words, sentence variety, transitions

**CONCRETE EXAMPLES OF MANDATORY CORRECTIONS:**
"The chart shows information about population" → 
- "shows" (error) → "illustrates" (improvement)
- "information about" (error) → "data on" (improvement)

"It is important to note that people think" →
- "It is important to note that" (error) → "Notably," (improvement) 
- "people think" (error) → "individuals believe" (improvement)

"Technology has many advantage in modern world" →
- "advantage" (error) → "advantages" (improvement)
- "modern world" (error) → "the modern world" (improvement)

**ULTRA-STRICT OUTPUT FORMAT (MANDATORY):**
{
  "original_spans": [
    {"text": "The chart ", "status": "neutral"},
    {"text": "shows", "status": "error"},
    {"text": " information about population.", "status": "neutral"}
  ],
  "corrected_spans": [
    {"text": "The chart ", "status": "neutral"},
    {"text": "illustrates", "status": "improvement"}, 
    {"text": " data on population.", "status": "neutral"}
  ],
  "corrections": [
    {
      "type": "vocabulary_enhancement",
      "category": "Academic Writing",
      "severity": "medium",
      "original": "shows",
      "corrected": "illustrates",
      "explanation": "Academic writing prefers 'illustrates' for data presentation",
      "position": {"start": 10, "end": 15}
    }
  ],
  "summary": {
    "totalErrors": 8,
    "errorsByCategory": {"Grammar": 3, "Vocabulary": 4, "Style": 1},
    "overallFeedback": "Multiple improvements identified for enhanced academic writing."
  }
}

**TEXT TO ANALYZE:**
"${userSubmission}"

CRITICAL REQUIREMENT: Find exactly 8-12+ errors/improvements. Mark spans accordingly. Be maximally thorough and critical. FAILURE TO PROVIDE SUFFICIENT CORRECTIONS WILL RESULT IN REJECTION.`;

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
              content: ultraAggressivePrompt
            }
          ],
          max_tokens: 6000, // Maximum tokens for thorough analysis
          temperature: 0.1 // Very low temperature for consistent results
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

      // Strict quality validation - enforce minimum corrections
      const errorSpans = aiResult.original_spans?.filter(s => s.status === 'error')?.length || 0;
      const improvementSpans = aiResult.corrected_spans?.filter(s => s.status === 'improvement')?.length || 0;
      const totalCorrections = aiResult.corrections?.length || 0;

      console.log(`🔍 AI Quality Metrics: { errorSpans: ${errorSpans}, improvementSpans: ${improvementSpans}, totalCorrections: ${totalCorrections} }`);

      // Enforce quality standards - must have substantial corrections
      if (errorSpans < 5 || improvementSpans < 5 || totalCorrections < 6) {
        console.log(`⚠️ AI analysis insufficient (needs 5+ error spans, 5+ improvement spans, 6+ corrections). Generating guaranteed fallback...`);
        return generateRuleBasedCorrections(userSubmission, questionPrompt);
      }

      // Transform and validate result
      const result: EnhancedCorrectionResult = {
        originalSpans: aiResult.original_spans || [],
        correctedSpans: aiResult.corrected_spans || [],
        corrections: aiResult.corrections || [],
        summary: aiResult.summary || {
          totalErrors: totalCorrections,
          errorsByCategory: {"Grammar": 2, "Vocabulary": 3, "Style": 1},
          overallFeedback: "Comprehensive analysis completed with multiple improvements identified."
        }
      };

      console.log(`✅ High-quality AI analysis: ${errorSpans} error spans, ${improvementSpans} improvement spans, ${totalCorrections} corrections`);
      return result;

    } catch (error) {
      console.error(`❌ AI analysis failed: ${error.message}. Falling back to rule-based system.`);
    }
  }

  // Guaranteed fallback system
  console.log(`🔧 Generating rule-based corrections with guaranteed highlighting...`);
  return generateRuleBasedCorrections(userSubmission, questionPrompt);
}

// Rule-based fallback system with guaranteed visual corrections
function generateRuleBasedCorrections(
  userSubmission: string,
  questionPrompt?: string
): EnhancedCorrectionResult {
  console.log(`🔧 Generating rule-based corrections with GUARANTEED visual highlighting...`);
  
  const corrections: EnhancedCorrection[] = [];
  
  // Ultra-comprehensive error patterns - guaranteed to find issues in any text
  const errorPatterns = [
    // Vocabulary upgrades (guaranteed hits)
    { pattern: /\bshows?\b/gi, replacement: "illustrates", type: "vocabulary_enhancement", category: "Academic Writing", explanation: "Academic preference for 'illustrates' in data description" },
    { pattern: /\bgives?\b/gi, replacement: "provides", type: "vocabulary_enhancement", category: "Academic Writing", explanation: "More formal alternative to 'gives'" },
    { pattern: /\bgets?\b/gi, replacement: "obtains", type: "formality", category: "Academic Writing", explanation: "Formal alternative to 'gets'" },
    { pattern: /\bbig\b/gi, replacement: "substantial", type: "vocabulary_enhancement", category: "Academic Writing", explanation: "More precise academic vocabulary" },
    { pattern: /\bgood\b/gi, replacement: "beneficial", type: "vocabulary_enhancement", category: "Academic Writing", explanation: "More sophisticated vocabulary choice" },
    { pattern: /\bbad\b/gi, replacement: "detrimental", type: "vocabulary_enhancement", category: "Academic Writing", explanation: "Academic alternative to 'bad'" },
    { pattern: /\ba lot of\b/gi, replacement: "numerous", type: "formality", category: "Academic Writing", explanation: "Formal alternative to informal expression" },
    { pattern: /\bthings?\b/gi, replacement: "aspects", type: "vocabulary_enhancement", category: "Academic Writing", explanation: "More specific vocabulary choice" },
    
    // Grammar and preposition corrections
    { pattern: /\binformation about\b/gi, replacement: "data on", type: "preposition_correction", category: "Grammar", explanation: "Correct preposition usage with 'data'" },
    { pattern: /\bdifferent than\b/gi, replacement: "different from", type: "grammar_correction", category: "Grammar", explanation: "Correct preposition with 'different'" },
    { pattern: /\bcompare to\b/gi, replacement: "compare with", type: "preposition_correction", category: "Grammar", explanation: "Precise preposition usage" },
    
    // Style and clarity improvements
    { pattern: /\bit is clear that\b/gi, replacement: "evidently", type: "conciseness", category: "Style", explanation: "More concise expression" },
    { pattern: /\bin conclusion\b/gi, replacement: "in summary", type: "variety", category: "Style", explanation: "Alternative concluding phrase" },
    { pattern: /\bthis shows\b/gi, replacement: "this demonstrates", type: "vocabulary_enhancement", category: "Academic Writing", explanation: "Stronger verb choice" },
    { pattern: /\bpeople think\b/gi, replacement: "individuals believe", type: "formality", category: "Academic Writing", explanation: "More formal and precise" },
    { pattern: /\bwe can see\b/gi, replacement: "it is evident", type: "formality", category: "Academic Writing", explanation: "Removes informal first person" },
    
    // Always-applicable improvements
    { pattern: /\bthe graph\b/gi, replacement: "the chart", type: "vocabulary_variety", category: "Vocabulary", explanation: "Lexical variety in data description" },
    { pattern: /\bthere are\b/gi, replacement: "there exist", type: "formality", category: "Academic Writing", explanation: "More formal construction" },
    { pattern: /\bvery\b/gi, replacement: "particularly", type: "adverb_enhancement", category: "Style", explanation: "More sophisticated intensifier" },
    { pattern: /\breally\b/gi, replacement: "significantly", type: "formality", category: "Academic Writing", explanation: "Academic alternative to informal intensifier" }
  ];

  let correctedText = userSubmission;
  let totalReplacements = 0;

  // Apply corrections and track changes
  errorPatterns.forEach((pattern) => {
    const matches = [...userSubmission.matchAll(pattern.pattern)];
    matches.forEach(match => {
      if (match.index !== undefined && totalReplacements < 12) {
        const original = match[0];
        const startPos = match.index;
        const endPos = match.index + original.length;
        
        corrections.push({
          type: pattern.type,
          category: pattern.category,
          severity: "medium",
          original,
          corrected: pattern.replacement,
          explanation: pattern.explanation,
          position: { start: startPos, end: endPos }
        });
        
        // Replace in corrected text
        correctedText = correctedText.replace(original, pattern.replacement);
        totalReplacements++;
      }
    });
  });

  // Force minimum corrections if not enough found
  if (corrections.length < 6) {
    console.log(`🔧 Adding guaranteed style improvements to meet minimum threshold...`);
    
    // Add guaranteed improvements by targeting common words
    const forcedImprovements = [
      { word: "use", replacement: "utilize", explanation: "Formal vocabulary enhancement" },
      { word: "help", replacement: "assist", explanation: "More formal alternative" },
      { word: "start", replacement: "commence", explanation: "Academic vocabulary choice" },
      { word: "end", replacement: "conclude", explanation: "More sophisticated terminology" },
      { word: "change", replacement: "transform", explanation: "Stronger verb choice" },
      { word: "important", replacement: "significant", explanation: "More precise academic term" }
    ];

    forcedImprovements.forEach(improvement => {
      const regex = new RegExp(`\\b${improvement.word}\\b`, 'gi');
      const matches = [...userSubmission.matchAll(regex)];
      
      matches.forEach(match => {
        if (match.index !== undefined && corrections.length < 8) {
          corrections.push({
            type: "vocabulary_enhancement",
            category: "Academic Writing",
            severity: "medium",
            original: match[0],
            corrected: improvement.replacement,
            explanation: improvement.explanation,
            position: { start: match.index, end: match.index + match[0].length }
          });
          
          correctedText = correctedText.replace(match[0], improvement.replacement);
        }
      });
    });
  }

  // Build spans with GUARANTEED highlighting
  const originalSpans: Span[] = [];
  const correctedSpans: Span[] = [];

  // Split text into words and spaces
  const originalTokens = userSubmission.split(/(\s+|[.,;:!?()"])/);
  const correctedTokens = correctedText.split(/(\s+|[.,;:!?()"])/);

  // Mark original spans
  originalTokens.forEach((token, index) => {
    const hasError = corrections.some(c => {
      const tokenLower = token.toLowerCase().trim();
      const originalLower = c.original.toLowerCase().trim();
      return tokenLower === originalLower || (tokenLower.length > 2 && originalLower.includes(tokenLower));
    });

    originalSpans.push({
      text: token,
      status: hasError ? "error" : "neutral"
    });
  });

  // Mark corrected spans  
  correctedTokens.forEach((token, index) => {
    const hasImprovement = corrections.some(c => {
      const tokenLower = token.toLowerCase().trim();
      const correctedLower = c.corrected.toLowerCase().trim();
      return tokenLower === correctedLower || (tokenLower.length > 2 && correctedLower.includes(tokenLower));
    });

    correctedSpans.push({
      text: token,
      status: hasImprovement ? "improvement" : "neutral"
    });
  });

  const errorSpanCount = originalSpans.filter(s => s.status === 'error').length;
  const improvementSpanCount = correctedSpans.filter(s => s.status === 'improvement').length;

  console.log(`✅ Rule-based corrections generated: {
    originalSpans: ${originalSpans.length},
    correctedSpans: ${correctedSpans.length},
    corrections: ${corrections.length},
    errorSpans: ${errorSpanCount},
    improvementSpans: ${improvementSpanCount}
  }`);

  // Guarantee minimum visual feedback
  if (errorSpanCount === 0 && corrections.length > 0) {
    console.log(`🔧 Force-marking first correction as error span for guaranteed visibility...`);
    const firstCorrection = corrections[0];
    const targetIndex = originalSpans.findIndex(span => 
      span.text.toLowerCase().trim() === firstCorrection.original.toLowerCase().trim()
    );
    if (targetIndex >= 0) {
      originalSpans[targetIndex].status = "error";
    }
  }

  if (improvementSpanCount === 0 && corrections.length > 0) {
    console.log(`🔧 Force-marking first improvement as improvement span for guaranteed visibility...`);
    const firstCorrection = corrections[0];
    const targetIndex = correctedSpans.findIndex(span => 
      span.text.toLowerCase().trim() === firstCorrection.corrected.toLowerCase().trim()
    );
    if (targetIndex >= 0) {
      correctedSpans[targetIndex].status = "improvement";
    }
  }

  return {
    originalSpans,
    correctedSpans,
    corrections,
    summary: {
      totalErrors: corrections.length,
      errorsByCategory: corrections.reduce((acc, c) => {
        acc[c.category] = (acc[c.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      overallFeedback: `Comprehensive analysis completed with ${corrections.length} specific improvements identified for enhanced academic writing quality.`
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

    console.log('🔍 Starting writing correction analysis...', {
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

    // Generate new analysis with guaranteed corrections
    const result = await generateGuaranteedCorrections(userSubmission, questionPrompt);

    // Cache the result
    await cacheAnalysis(contentHash, userSubmission, questionPrompt, result);

    console.log('✅ Writing correction analysis completed:', {
      originalSpans: result.originalSpans.length,
      correctedSpans: result.correctedSpans.length,
      corrections: result.corrections.length,
      errorSpans: result.originalSpans.filter(s => s.status === 'error').length,
      improvementSpans: result.correctedSpans.filter(s => s.status === 'improvement').length
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in writing correction analysis:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: 'Failed to analyze writing submission'
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});