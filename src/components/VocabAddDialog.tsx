import React, { useEffect, useState } from 'react';
import { extractTerms, enrichTerm } from '@/lib/deepseek';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  selectedText: string;
  targetLanguage: string;
  nativeLanguage: string;
}

export const VocabAddDialog: React.FC<Props> = ({ open, onOpenChange, selectedText, targetLanguage, nativeLanguage }) => {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    (async () => {
      try {
        setLoading(true);
        const terms = await extractTerms({ text: selectedText, targetLanguage, nativeLanguage });
        const top = terms[0] || { term: selectedText.trim(), context: selectedText.trim(), level: 3 };
        const card = await enrichTerm({ term: top.term, context: top.context, targetLanguage, nativeLanguage });
        setPreview({ term: top.term, context: top.context, level: (top as any).level ?? null, ...card });
      } catch (e: any) {
        setError(e?.message || 'Failed to generate');
      } finally {
        setLoading(false);
      }
    })();
  }, [open, selectedText, targetLanguage, nativeLanguage]);

  const save = async () => {
    if (!preview) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Please sign in'); return; }
      const { error } = await supabase.from('vocab_cards').insert({
      user_id: user.id,
      term: preview.term,
      translation: preview.translation,
      pos: preview.pos,
      ipa: preview.ipa,
      context_sentence: preview.context,
      examples_json: preview.examples || [],
      frequency_rank: preview.frequencyRank || null,
        language: targetLanguage,
        level: preview.level ?? null
    });
    if (error) { setError(error.message); return; }
    onOpenChange(false);
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => onOpenChange(false)}>
      <div className="bg-white rounded-2xl shadow-xl w-[90%] max-w-xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-semibold">Add to Vocabulary</div>
          <button className="text-slate-500" onClick={() => onOpenChange(false)}>Close</button>
        </div>
        {loading && <div className="text-slate-600">Generating…</div>}
        {error && <div className="text-red-600 text-sm">{error}</div>}
        {preview && (
          <div className="space-y-3">
            <div className="text-2xl font-semibold">{preview.term}</div>
            {preview.ipa && <div className="text-sm text-slate-500">/{preview.ipa}/</div>}
            <div className="text-slate-800">{preview.translation}</div>
            {preview.pos && <div className="text-sm text-slate-600">{preview.pos}</div>}
            {preview.context && <div className="text-sm text-slate-700 italic">“{preview.context}”</div>}
            {Array.isArray(preview.examples) && preview.examples.length > 0 && (
              <ul className="list-disc pl-5 text-sm text-slate-800">
                {preview.examples.slice(0,3).map((e: string, i: number) => (<li key={i}>{e}</li>))}
              </ul>
            )}
            <div className="flex justify-end gap-2">
              <button className="px-3 py-2 rounded-md border" onClick={() => onOpenChange(false)}>Cancel</button>
              <button className="px-3 py-2 rounded-md bg-black text-white" onClick={save}>Save</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VocabAddDialog;


