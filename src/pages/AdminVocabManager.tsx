import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const AdminVocabManager: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [progress, setProgress] = useState<{ completed?: number; total?: number; last_term?: string; last_error?: string } | null>(null);
  const [counts, setCounts] = useState<{ total: number; publicTotal: number }>({ total: 0, publicTotal: 0 });
  const [newTerm, setNewTerm] = useState('');
  const [newTranslation, setNewTranslation] = useState('');
  const [newPos, setNewPos] = useState('');
  const [newIpa, setNewIpa] = useState('');
  const [newContext, setNewContext] = useState('');

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

  const loadCounts = async () => {
    const totalRes = await (supabase as any)
      .from('vocab_cards')
      .select('id', { count: 'exact', head: true });
    const publicRes = await (supabase as any)
      .from('vocab_cards')
      .select('id', { count: 'exact', head: true })
      .eq('is_public', true);
    setCounts({ total: totalRes.count || 0, publicTotal: publicRes.count || 0 });
  };

  const refresh = async () => {
    await load();
    await loadCounts();
  };

  useEffect(() => { load(); loadCounts(); }, []);

  useEffect(() => {
    const check = async () => {
      const { data } = await (supabase as any).rpc('is_admin');
      setIsAdmin(!!data);
    };
    check();
    const id = setInterval(async () => {
      try {
        const { data } = await supabase.functions.invoke('vocab-bulk-status');
        if (data?.success) setProgress(data.job || {});
      } catch (e) {
        // Silent poll failures to avoid user-facing errors while function deploys
      }
    }, 3000);
    return () => clearInterval(id);
  }, []);

  const seed = async (total: number = 5000) => {
    setSeeding(true);
    try {
      let completed = 0;
      let batchCount = 0;
      const maxBatches = Math.ceil(total / 5); // 5 words per batch (reduced to prevent timeouts)
      
      console.log(`Starting seeding process: ${total} words in ${maxBatches} batches`);
      
      while (completed < total && batchCount < maxBatches) {
        batchCount++;
        console.log(`Processing batch ${batchCount}/${maxBatches}`);
        
        // Try admin-only function first; if forbidden, fall back to user bulk seeding
        let data: any, error: any;
        const adminAttempt = await supabase.functions.invoke('vocab-admin-seed', { body: { total, language: 'en', translateTo: 'all' } });
        data = adminAttempt.data; error = adminAttempt.error;
        if (error || adminAttempt?.data?.error || adminAttempt?.error?.status === 403) {
          const userAttempt = await supabase.functions.invoke('vocab-bulk-seed', { body: { total, language: 'en', translateTo: 'all', asPublic: false } });
          data = userAttempt.data; error = userAttempt.error;
        }
        
        if (error || !data?.success) {
          alert(`Batch ${batchCount} failed: ${data?.error || error?.message || 'Failed to process batch'}`);
          break;
        }
        
        completed = data.completed || completed;
        console.log(`Batch ${batchCount} completed: ${completed}/${total} words`);
        
        // If all words are done, break
        if (data.status === 'done' || completed >= total) {
          console.log('All words completed!');
          break;
        }
        
        // Wait 2 seconds between batches to avoid overwhelming the system
        if (batchCount < maxBatches) {
          console.log('Waiting 2 seconds before next batch...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      if (completed >= total) {
        alert(`Seeding completed! Processed ${completed} words with translations for all languages.`);
      } else {
        alert(`Seeding stopped after ${batchCount} batches. Processed ${completed}/${total} words.`);
      }
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

  const addWord = async () => {
    if (!newTerm.trim()) { alert('Enter a term'); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { alert('You must be signed in'); return; }
    const insert: any = {
      user_id: user.id,
      term: newTerm.trim(),
      translation: newTranslation.trim() || null,
      pos: newPos.trim() || null,
      ipa: newIpa.trim() || null,
      context_sentence: newContext.trim() || null,
      language: 'en'
    };
    const { data, error } = await supabase
      .from('vocab_cards')
      .insert(insert)
      .select('id, term, translation, pos, ipa, context_sentence, frequency_rank, created_at')
      .single();
    if (error) { alert(error.message); return; }
    setRows(r => [data as any, ...r]);
    setNewTerm(''); setNewTranslation(''); setNewPos(''); setNewIpa(''); setNewContext('');
    await loadCounts();
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Admin • Vocabulary</h1>
        <div className="flex gap-2">
          <button className="border rounded px-3 py-2" onClick={refresh} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</button>
          <button className="border rounded px-3 py-2" onClick={exportCsv}>Export CSV</button>
          <>
            {/* Updated button text for 8K words with all languages */}
            <button className="border rounded px-3 py-2 bg-black text-white" onClick={()=>seed(8000)} disabled={seeding}>
              {seeding ? 'Starting…' : 'Seed 8,000 EN→ALL LANGS'}
            </button>
            <button className="border rounded px-3 py-2" onClick={async()=>{
              try {
                // English-only fast mode (no translations), ideal for overnight generation
                const { data, error } = await (supabase as any).functions.invoke('vocab-admin-seed', { body: { total: 8000, language: 'en', translateTo: 'all', enOnly: true } });
                if (error || !data?.success) alert(data?.error || error?.message || 'Failed to start EN-only job');
              } catch (e:any) { alert(e?.message || 'Failed'); }
            }} disabled={seeding}>
              {seeding ? 'Starting…' : 'Seed 8,000 EN only (fast)'}
            </button>
            <button className="border rounded px-3 py-2" onClick={()=>seed(20)} disabled={seeding}>
              {seeding ? 'Starting…' : 'Seed 20 (test)'}
            </button>
            <button className="border rounded px-3 py-2" onClick={async()=>{
              const { data, error } = await (supabase as any).functions.invoke('vocab-orchestrator', { body: { total: 20 } });
              if (error || !data?.success) alert(data?.error || error?.message || 'Failed');
            }}>Run 20-word pipeline</button>
          </>
        </div>
      </div>
      {(progress || counts.total || counts.publicTotal) && (
        <div className="mb-3 text-xs text-slate-600 flex flex-wrap gap-4">
          {progress && (
            <div>Progress: {progress.completed||0} / {progress.total||0} {progress.last_term ? `• Last: ${progress.last_term}` : ''} {progress.last_error ? `• Error: ${progress.last_error}` : ''}</div>
          )}
          <div>Totals: {counts.total} total • {counts.publicTotal} public</div>
        </div>
      )}
      {/* Add Word */}
      <div className="mb-4 border rounded p-3 bg-white/50">
        <div className="text-sm font-medium mb-2">Add Word</div>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-center">
          <input className="border rounded px-2 py-2" placeholder="Term (required)" value={newTerm} onChange={(e)=>setNewTerm(e.target.value)} />
          <input className="border rounded px-2 py-2" placeholder="Translation" value={newTranslation} onChange={(e)=>setNewTranslation(e.target.value)} />
          <input className="border rounded px-2 py-2" placeholder="POS" value={newPos} onChange={(e)=>setNewPos(e.target.value)} />
          <input className="border rounded px-2 py-2" placeholder="IPA" value={newIpa} onChange={(e)=>setNewIpa(e.target.value)} />
          <input className="border rounded px-2 py-2" placeholder="Context sentence" value={newContext} onChange={(e)=>setNewContext(e.target.value)} />
          <button className="border rounded px-3 py-2 bg-black text-white" onClick={addWord}>Create</button>
        </div>
      </div>
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


