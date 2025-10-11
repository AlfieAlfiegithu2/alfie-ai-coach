import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const AdminVocabManager: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [progress, setProgress] = useState<{ completed?: number; total?: number; last_term?: string; last_error?: string } | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('vocab_cards')
      .select('id, term, translation, pos, ipa, context_sentence, frequency_rank, created_at')
      .order('created_at', { ascending: false })
      .limit(500);
    if (!error) setRows(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const check = async () => {
      const { data } = await (supabase as any).rpc('is_admin');
      setIsAdmin(!!data);
    };
    check();
    const id = setInterval(async () => {
      const { data, error } = await supabase.functions.invoke('vocab-bulk-status');
      if (data?.success) setProgress(data.job || {});
    }, 3000);
    return () => clearInterval(id);
  }, []);

  const seed = async () => {
    setSeeding(true);
    try {
      const { data, error } = await supabase.functions.invoke('vocab-admin-seed', {
        body: { total: 5000, language: 'en', translateTo: 'ko' }
      });
      if (error || !data?.success) alert(data?.error || error?.message || 'Failed to start');
    } finally {
      setSeeding(false);
    }
  };

  const del = async (id: string) => {
    await supabase.from('vocab_cards').delete().eq('id', id);
    setRows((r) => r.filter((x) => x.id !== id));
  };

  const update = async (id: string, patch: any) => {
    await supabase.from('vocab_cards').update(patch).eq('id', id);
    setRows((r) => r.map((x) => x.id === id ? { ...x, ...patch } : x));
  };

  const exportCsv = () => {
    const header = ['id','term','translation','pos','ipa','context','frequency_rank'];
    const lines = [header.join(',')].concat(rows.map(r => [r.id, r.term, r.translation, r.pos || '', r.ipa || '', (r.context_sentence||'').replace(/\n/g,' '), r.frequency_rank||''].map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'vocab_export.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = rows.filter(r => r.term.toLowerCase().includes(q.toLowerCase()) || (r.translation||'').toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Admin • Vocabulary</h1>
        <div className="flex gap-2">
          <button className="border rounded px-3 py-2" onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</button>
          <button className="border rounded px-3 py-2" onClick={exportCsv}>Export CSV</button>
          {isAdmin && (
            <button className="border rounded px-3 py-2 bg-black text-white" onClick={seed} disabled={seeding}>
              {seeding ? 'Starting…' : 'Seed 5,000 EN→KO (public)'}
            </button>
          )}
        </div>
      </div>
      {progress && (
        <div className="mb-3 text-xs text-slate-600">Progress: {progress.completed||0} / {progress.total||0} {progress.last_term ? `• Last: ${progress.last_term}` : ''} {progress.last_error ? `• Error: ${progress.last_error}` : ''}</div>
      )}
      <div className="mb-3">
        <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search…" className="border rounded px-3 py-2 w-full" />
      </div>
      <div className="overflow-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="text-left p-2">Term</th>
              <th className="text-left p-2">Translation</th>
              <th className="text-left p-2">POS</th>
              <th className="text-left p-2">IPA</th>
              <th className="text-left p-2">Context</th>
              <th className="text-left p-2">Freq</th>
              <th className="text-left p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} className="border-t">
                <td className="p-2 font-medium">{r.term}</td>
                <td className="p-2"><input className="border rounded px-2 py-1 w-48" defaultValue={r.translation||''} onBlur={(e)=>update(r.id,{ translation: e.target.value })} /></td>
                <td className="p-2"><input className="border rounded px-2 py-1 w-24" defaultValue={r.pos||''} onBlur={(e)=>update(r.id,{ pos: e.target.value })} /></td>
                <td className="p-2"><input className="border rounded px-2 py-1 w-28" defaultValue={r.ipa||''} onBlur={(e)=>update(r.id,{ ipa: e.target.value })} /></td>
                <td className="p-2 max-w-[320px]"><textarea className="border rounded px-2 py-1 w-full" defaultValue={r.context_sentence||''} onBlur={(e)=>update(r.id,{ context_sentence: e.target.value })} /></td>
                <td className="p-2 w-16 text-center">{r.frequency_rank||''}</td>
                <td className="p-2">
                  <button className="text-red-600 underline" onClick={()=>del(r.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td className="p-3 text-slate-500" colSpan={7}>No items</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminVocabManager;


