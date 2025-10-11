import { supabase } from '@/integrations/supabase/client';

export async function extractTerms({ text, targetLanguage, nativeLanguage }: { text: string; targetLanguage: string; nativeLanguage: string; }) {
  const { data, error } = await supabase.functions.invoke('vocab-extract', {
    body: { text, targetLanguage, nativeLanguage }
  });
  if (error || !data?.success) throw new Error(data?.error || error?.message || 'vocab-extract failed');
  return data.terms as Array<{ term: string; phrase?: string | null; context: string; lemma?: string | null; pos?: string | null }>;
}

export async function enrichTerm({ term, context, targetLanguage, nativeLanguage }: { term: string; context?: string; targetLanguage: string; nativeLanguage: string; }) {
  const { data, error } = await supabase.functions.invoke('vocab-enrich', {
    body: { term, context: context || '', targetLanguage, nativeLanguage }
  });
  if (error || !data?.success) throw new Error(data?.error || error?.message || 'vocab-enrich failed');
  return data.card as {
    translation: string;
    ipa?: string | null;
    pos?: string | null;
    examples: string[];
    conjugation?: any;
    synonyms?: string[];
    frequencyRank?: number | null;
  };
}


