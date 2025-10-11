import React from 'react';

interface VocabCardProps {
  term: string;
  translation?: string;
  context?: string;
  ipa?: string | null;
  pos?: string | null;
  examples?: string[];
  frequencyRank?: number | null;
}

export const VocabCard: React.FC<VocabCardProps> = ({ term, translation, context, ipa, pos, examples, frequencyRank }) => {
  return (
    <div className="rounded-xl border p-4 bg-white/80">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-2xl font-semibold text-slate-900">{term}</div>
          {ipa && <div className="text-sm text-slate-500">/{ipa}/</div>}
        </div>
        {typeof frequencyRank === 'number' && <div className="text-xs text-slate-500">#{frequencyRank}</div>}
      </div>
      {pos && <div className="mt-1 text-sm text-slate-600">{pos}</div>}
      {translation && <div className="mt-2 text-slate-800">{translation}</div>}
      {context && <div className="mt-3 text-sm text-slate-700 italic">“{context}”</div>}
      {examples && examples.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-slate-800 list-disc pl-5">
          {examples.slice(0, 3).map((e, i) => (<li key={i}>{e}</li>))}
        </ul>
      )}
      <div className="mt-3 text-xs text-slate-500">Audio coming soon</div>
    </div>
  );
}

export default VocabCard;


