import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const AdminVocabManager: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [translations, setTranslations] = useState<Record<string, any>>({});
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [auditResults, setAuditResults] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Pagination and filtering
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(100);
  const [totalCount, setTotalCount] = useState(0);

  const load = async () => {
    setLoading(true);
    
    // Build query
    let query = supabase
      .from('vocab_cards')
      .select('id, term, translation, pos, ipa, context_sentence, frequency_rank, level, created_at', { count: 'exact' });
    
    // Apply level filter
    if (selectedLevel !== null) {
      query = query.eq('level', selectedLevel);
    }
    
    // Apply search filter (server-side)
    if (q.trim()) {
      query = query.or(`term.ilike.%${q}%,translation.ilike.%${q}%`);
    }
    
    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    
    query = query
      .order('created_at', { ascending: false })
      .range(from, to);
    
    const { data, error, count } = await query;
    
    if (!error) {
      setRows(data || []);
      setTotalCount(count || 0);
    }
    setLoading(false);
  };

  const loadTranslations = async () => {
    const { data } = await (supabase as any)
      .from('vocab_translations')
      .select('card_id, lang, translations');

    const transMap: Record<string, any> = {};
    (data as any[])?.forEach((t: any) => {
      if (!transMap[t.card_id]) transMap[t.card_id] = {};
      transMap[t.card_id][t.lang] = t.translations?.[0] || '';
    });
    setTranslations(transMap);
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
    await loadTranslations();
  };

  useEffect(() => {
    load();
    loadCounts();
    loadTranslations();
  }, []);
  
  // Reload when filters or page changes
  useEffect(() => {
    load();
  }, [q, selectedLevel, page]);

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

  const seed = async (total: number = 5000, enOnly: boolean = false) => {
    setSeeding(true);
    try {
      console.log(`Starting optimized seeding: ${total} words ${enOnly ? '(EN-only)' : '(with translations)'}`);

      // Use the optimized vocab-admin-seed function directly
      const { data, error } = await (supabase as any).functions.invoke('vocab-admin-seed', {
        body: {
          total,
          language: 'en',
          translateTo: enOnly ? 'none' : 'all',
          enOnly: enOnly
        }
      });

      if (error || !data?.success) {
        alert(data?.error || error?.message || 'Failed to start seeding job');
        return;
      }

      // The optimized function handles batching internally and returns progress
      alert(`Seeding job started! ${data.completed || 0}/${total} words processed. Check progress below.`);

    } catch (e: any) {
      alert(e?.message || 'Failed to start seeding');
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

  const handleCsvImport = async (file: File) => {
    try {
      const text = await file.text();
      const { data, error } = await (supabase as any).functions.invoke('vocab-import', {
        body: { csvText: text }
      });

      if (error || !data?.success) {
        alert(`Import failed: ${data?.error || error?.message || 'Unknown error'}`);
      } else {
        alert(`✅ Successfully imported ${data.inserted} vocabulary words!`);
        refresh(); // Refresh the list
      }
    } catch (e: any) {
      alert(`Import failed: ${e?.message || 'Unknown error'}`);
    }
  };

  const handleRemoveDuplicates = async () => {
    if (!confirm('This will remove all duplicate words, keeping only the first occurrence of each. Continue?')) return;
    
    setLoading(true);
    try {
      const { data, error } = await (supabase as any).functions.invoke('vocab-admin-seed', {
        body: { action: 'remove_duplicates' }
      });
      
      if (error || !data?.success) {
        alert(data?.error || error?.message || 'Failed to remove duplicates');
      } else {
        alert(`✅ Removed ${data.removedCount} duplicate words!`);
        await refresh();
      }
    } catch (e: any) {
      alert(e?.message || 'Failed to remove duplicates');
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePlurals = async () => {
    if (!confirm('This will remove words ending in "s" if their singular form exists. Continue?')) return;
    
    setLoading(true);
    try {
      const { data, error } = await (supabase as any).functions.invoke('vocab-admin-seed', {
        body: { action: 'remove_plurals' }
      });
      
      if (error || !data?.success) {
        alert(data?.error || error?.message || 'Failed to remove plurals');
      } else {
        alert(`✅ Removed ${data.removedCount} plural forms!`);
        await refresh();
      }
    } catch (e: any) {
      alert(e?.message || 'Failed to remove plurals');
    } finally {
      setLoading(false);
    }
  };

  const handleAuditLevels = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any).functions.invoke('vocab-admin-seed', {
        body: { action: 'audit_levels' }
      });
      
      if (error || !data?.success) {
        alert(data?.error || error?.message || 'Failed to audit levels');
      } else {
        setAuditResults({ type: 'levels', data });
        alert(`Level Audit Results:\nTotal words: ${data.totalWords}\nInvalid levels: ${data.invalidLevels}\nLevel distribution: ${JSON.stringify(data.levelStats)}`);
      }
    } catch (e: any) {
      alert(e?.message || 'Failed to audit levels');
    } finally {
      setLoading(false);
    }
  };

  const handleAuditTranslations = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any).functions.invoke('vocab-admin-seed', {
        body: { action: 'audit_translations' }
      });
      
      if (error || !data?.success) {
        alert(data?.error || error?.message || 'Failed to audit translations');
      } else {
        setAuditResults({ type: 'translations', data });
        alert(`Translation Audit Results:\nNo translations: ${data.noTranslations}\nPartial translations: ${data.partialTranslations}\nFull translations: ${data.fullTranslations}\nQueue status: ${JSON.stringify(data.queueCounts)}`);
      }
    } catch (e: any) {
      alert(e?.message || 'Failed to audit translations');
    } finally {
      setLoading(false);
    }
  };

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

  const generateAdvancedWords = async () => {
    // Auto-generate CEFR vocabulary from CSV via edge function
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('vocab-cefr-seed', {
        body: {
          total: 8000
        }
      });
      
      if (error || !data?.success) {
        alert(`Generation failed: ${data?.error || error?.message || 'Unknown error'}`);
      } else {
        const resumeInfo = data.isResume ? `\n\n📍 Resumed from rank ${data.startedFromRank}` : '';
        alert(`✅ Successfully generated ${data.importedCount} CEFR-graded words!${resumeInfo}\n\n💡 Click again to continue generating more words automatically.`);
        refresh();
      }
    } catch (e: any) {
      alert(`Generation failed: ${e?.message || 'Unknown error'}`);
    } finally {
      setGenerating(false);
    }
  };

  const importIELTSWords = async () => {
    // Import IELTS-style lists (CSV or TXT) by URL using the CEFR importer
    const defaultUrl = 'https://raw.githubusercontent.com/anig1scur/CEFR-Vocabulary-List/slave/B2.txt';
    const url = window.prompt('Enter RAW URL for IELTS/AWL wordlist (CSV or TXT)', defaultUrl);
    if (!url) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('vocab-cefr-seed', {
        body: {
          total: 10000,
          csvUrl: url.trim()
        }
      });

      if (error || !data?.success) {
        alert(`Import failed: ${data?.error || error?.message || 'Unknown error'}`);
      } else {
        const resumeInfo = data.isResume ? `\n\n📍 Resumed from rank ${data.startedFromRank}` : '';
        alert(`✅ Imported ${data.importedCount} IELTS/AWL words!${resumeInfo}`);
        refresh();
      }
    } catch (e: any) {
      alert(`Import failed: ${e?.message || 'Unknown error'}`);
    } finally {
      setGenerating(false);
    }
  };

  const generateFrequencyVocab = async (minLevel?: number, maxLevel?: number) => {
    const levelText = minLevel && maxLevel ? ` (Level ${minLevel}-${maxLevel})` : '';
    const total = prompt(`How many words to generate${levelText}? (max 1000 per batch, function will auto-resume)`, '500');
    if (!total) return;
    const count = Math.min(parseInt(total), 1000);
    if (isNaN(count) || count < 1) { alert('Invalid number'); return; }
    
    setGenerating(true);
    try {
      // Don't pass startRank - let the function auto-resume from where it left off
      const { data, error } = await supabase.functions.invoke('vocab-frequency-seed', {
        body: {
          total: count,
          // startRank: not provided - function will auto-resume
          minLevel: minLevel || 1,
          maxLevel: maxLevel || 4,
          languages: ['en', 'ko', 'ja', 'zh', 'es', 'fr', 'de']
        }
      });
      
      if (error || !data?.success) {
        alert(`Generation failed: ${data?.error || error?.message || 'Unknown error'}`);
      } else {
        const resumeInfo = data.isResume 
          ? `\n\n📍 Resumed from rank ${data.startedFromRank} (continuing from where you left off)`
          : '';
        const skipInfo = data.skippedCount > 0 
          ? `\n⏭️ Skipped ${data.skippedCount} words outside level range`
          : '';
        
        alert(`✅ Successfully generated ${data.importedCount} real English words${levelText}!${resumeInfo}${skipInfo}\n\n💡 Click again to generate more advanced words automatically.`);
        refresh();
      }
    } catch (e: any) {
      alert(`Generation failed: ${e?.message || 'Unknown error'}`);
    } finally {
      setGenerating(false);
    }
  };

  const classifyWithAI = async () => {
    if (!window.confirm('This will use AI to classify all level 1 words by difficulty. Continue?')) return;
    
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('vocab-level-classifier');
      
      if (error || !data?.success) {
        alert(`Classification failed: ${data?.error || error?.message || 'Unknown error'}`);
      } else {
        alert(`✅ Classified ${data.classified} words using AI!`);
        refresh();
      }
    } catch (e: any) {
      alert(`Classification failed: ${e?.message || 'Unknown error'}`);
    } finally {
      setGenerating(false);
    }
  };

  const cleanupJunk = async () => {
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('vocab-cleanup-junk');
      
      if (error || !data?.success) {
        alert(`Cleanup failed: ${data?.error || error?.message || 'Unknown error'}`);
      } else {
        alert(`✅ Cleaned up ${data.deleted} junk entries (single letters, abbreviations)`);
        refresh();
      }
    } catch (e: any) {
      alert(`Cleanup failed: ${e?.message || 'Unknown error'}`);
    } finally {
      setDeleting(false);
    }
  };

  const deleteAllWords = async () => {
    const confirm = window.confirm('⚠️ Are you sure you want to DELETE ALL vocabulary words? This cannot be undone!');
    if (!confirm) return;
    
    const doubleConfirm = window.confirm('⚠️⚠️ FINAL WARNING: This will permanently delete ALL words and translations. Type YES to confirm.');
    if (!doubleConfirm) return;
    
    setDeleting(true);
    try {
      // Delete all vocab cards (cascading will handle translations)
      const { error } = await supabase.from('vocab_cards').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (error) {
        alert(`Delete failed: ${error.message}`);
      } else {
        alert('✅ All vocabulary words deleted successfully');
        setRows([]);
        setTranslations({});
        await loadCounts();
      }
    } catch (e: any) {
      alert(`Delete failed: ${e?.message || 'Unknown error'}`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Admin • Vocabulary</h1>
        <div className="flex gap-2 flex-wrap">
          <button className="border rounded px-3 py-2" onClick={refresh} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</button>
          <button 
            className="border rounded px-3 py-2 bg-purple-600 text-white font-medium" 
            onClick={() => generateFrequencyVocab()} 
            disabled={generating}
          >
            {generating ? '⏳ Generating…' : '📚 Generate All Levels'}
          </button>
          <button 
            className="border rounded px-3 py-2 bg-blue-600 text-white font-medium" 
            onClick={generateAdvancedWords} 
            disabled={generating}
          >
            {generating ? '⏳ Generating…' : '📚 Generate CEFR (A1-B2)'}
          </button>
          <button
            className="border rounded px-3 py-2 bg-blue-500 text-white font-medium" 
            onClick={importIELTSWords} 
            disabled={generating}
          >
            {generating ? '⏳ Importing…' : '📥 Import IELTS/AWL by URL'}
          </button>
          <button 
            className="border rounded px-3 py-2 bg-orange-600 text-white font-medium" 
            onClick={cleanupJunk} 
            disabled={deleting}
          >
            {deleting ? '⏳ Cleaning…' : '🧹 Clean Junk & Plurals'}
          </button>
          <button 
            className="border rounded px-3 py-2 bg-red-600 text-white font-medium" 
            onClick={deleteAllWords} 
            disabled={deleting}
          >
            {deleting ? '⏳ Deleting…' : '🗑️ Delete All'}
          </button>
          <button className="border rounded px-3 py-2 bg-green-600 text-white" onClick={async()=>{
            try {
              setSeeding(true);
              const { data, error } = await (supabase as any).functions.invoke('process-translations', { body: {} });
              if (error || !data?.success) {
                alert(data?.error || error?.message || 'Failed to process translations');
              } else {
                alert('✅ Translation processing completed!');
                loadTranslations();
              }
            } catch (e: any) {
              alert(e?.message || 'Failed to process translations');
            } finally {
              setSeeding(false);
            }
          }} disabled={seeding}>
            {seeding ? 'Processing…' : '🔄 Process Translations'}
          </button>
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
      {auditResults && (
        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
          <div className="text-sm font-medium text-blue-800 mb-2">
            Last Audit Results ({auditResults.type})
          </div>
          <div className="text-xs text-blue-700">
            {auditResults.type === 'levels' && (
              <div>
                Total words: {auditResults.data.totalWords} • 
                Invalid levels: {auditResults.data.invalidLevels} • 
                Level distribution: {JSON.stringify(auditResults.data.levelStats)}
              </div>
            )}
            {auditResults.type === 'translations' && (
              <div>
                No translations: {auditResults.data.noTranslations} • 
                Partial: {auditResults.data.partialTranslations} • 
                Full: {auditResults.data.fullTranslations} • 
                Queue: {JSON.stringify(auditResults.data.queueCounts)}
              </div>
            )}
          </div>
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
      
      {/* Filters and Search */}
      <div className="mb-3 flex gap-3 items-center flex-wrap">
        <input 
          value={q} 
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1); // Reset to page 1 on search
          }} 
          placeholder="Search terms or translations…" 
          className="border rounded px-3 py-2 flex-1 min-w-[200px]" 
        />
        <select
          value={selectedLevel || ''}
          onChange={(e) => {
            setSelectedLevel(e.target.value ? parseInt(e.target.value) : null);
            setPage(1); // Reset to page 1 on filter change
          }}
          className="border rounded px-3 py-2 bg-white"
        >
          <option value="">All Levels</option>
          <option value="1">A1</option>
          <option value="2">A2</option>
          <option value="3">B1</option>
          <option value="4">B2</option>
        </select>
        <div className="text-sm text-slate-600">
          Showing {rows.length} of {totalCount} words
        </div>
      </div>
      
      {/* Pagination */}
      <div className="mb-3 flex gap-2 items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1 || loading}
            className="border rounded px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page * pageSize >= totalCount || loading}
            className="border rounded px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
        <div className="text-sm text-slate-600">
          Page {page} of {Math.ceil(totalCount / pageSize)}
        </div>
      </div>
      
      <div className="overflow-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="text-left p-2">Term</th>
              <th className="text-left p-2">Translations</th>
              <th className="text-left p-2">POS</th>
              <th className="text-left p-2">IPA</th>
              <th className="text-left p-2">Context</th>
              <th className="text-left p-2">Level</th>
              <th className="text-left p-2">Freq</th>
              <th className="text-left p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t">
                <td className="p-2 font-medium">{r.term}</td>
                <td className="p-2">
                  <div className="space-y-1">
                    {Object.entries(translations[r.id] || {}).map(([lang, trans]) => (
                      <div key={lang} className="text-xs">
                        <span className="font-medium text-blue-600">{lang.toUpperCase()}:</span> {String(trans)}
                      </div>
                    ))}
                    {(!translations[r.id] || Object.keys(translations[r.id]).length === 0) && (
                      <span className="text-gray-400 text-xs">No translations yet</span>
                    )}
                    {Object.keys(translations[r.id] || {}).length > 0 && (
                      <div className="text-xs text-green-600 mt-1">
                        ✅ {Object.keys(translations[r.id]).length}/22 languages translated
                      </div>
                    )}
                  </div>
                </td>
                <td className="p-2"><input className="border rounded px-2 py-1 w-24" defaultValue={r.pos||''} onBlur={(e)=>update(r.id,{ pos: e.target.value })} /></td>
                <td className="p-2"><input className="border rounded px-2 py-1 w-28" defaultValue={r.ipa||''} onBlur={(e)=>update(r.id,{ ipa: e.target.value })} /></td>
                <td className="p-2 max-w-[320px]"><textarea className="border rounded px-2 py-1 w-full" defaultValue={r.context_sentence||''} onBlur={(e)=>update(r.id,{ context_sentence: e.target.value })} /></td>
                <td className="p-2 w-16 text-center">
                  <select
                    className="border rounded px-2 py-1 w-full"
                    defaultValue={r.level || 1}
                    onChange={(e)=>update(r.id,{ level: parseInt(e.target.value) })}
                  >
                    <option value={1}>A1</option>
                    <option value={2}>A2</option>
                    <option value={3}>B1</option>
                    <option value={4}>B2</option>
                  </select>
                </td>
                <td className="p-2 w-16 text-center">{r.frequency_rank||''}</td>
                <td className="p-2">
                  <button className="text-red-600 underline" onClick={()=>del(r.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td className="p-3 text-slate-500" colSpan={8}>No items</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminVocabManager;


