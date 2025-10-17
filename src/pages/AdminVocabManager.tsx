import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TranslationProgressModal } from '@/components/TranslationProgressModal';
import { useToast } from '@/hooks/use-toast';

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
  const [shuffleEnabled, setShuffleEnabled] = useState(false);
  
  // Translation progress state
  const [translationProgress, setTranslationProgress] = useState({
    current: 0,
    total: 0,
    currentCard: '',
    currentLang: '',
    errors: 0
  });
  const [isTranslating, setIsTranslating] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [lastProcessedCard, setLastProcessedCard] = useState<string | null>(null);
  const [lastProcessedLang, setLastProcessedLang] = useState<string | null>(null);
  const [autoRetryEnabled, setAutoRetryEnabled] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [showTranslationViewer, setShowTranslationViewer] = useState(false);
  const [translationViewerData, setTranslationViewerData] = useState<any[]>([]);
  const [selectedLang, setSelectedLang] = useState<string>('all');
  const [translationStats, setTranslationStats] = useState<{total: number, unique_cards: number, last_translation: string} | null>(null);
  const { toast } = useToast();

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
      let finalData = data || [];
      
      // Apply shuffle if enabled
      if (shuffleEnabled) {
        finalData = [...finalData].sort(() => Math.random() - 0.5);
      }
      
      setRows(finalData);
      setTotalCount(count || 0);
    }
    setLoading(false);
  };

  const loadTranslations = async () => {
    // Only load translations for currently visible cards to avoid memory issues
    if (rows.length === 0) return;
    
    const cardIds = rows.map(r => r.id);
    const { data } = await (supabase as any)
      .from('vocab_translations')
      .select('card_id, lang, translations')
      .in('card_id', cardIds)
      .eq('is_system', true);

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
    // Load translations after cards are loaded
    await new Promise(resolve => setTimeout(resolve, 100));
    await loadTranslations();
  };

  useEffect(() => {
    load();
    loadCounts();

    // Auto-queue and start translation processing in background
    (async () => {
      try {
        // If there are pending jobs, always kick the runner again
        const { count: pending } = await (supabase as any)
          .from('vocab_translation_queue')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');

        const already = localStorage.getItem('vocabRunnerStarted');
        if ((pending && pending > 0)) {
          await supabase.functions.invoke('process-translations', { body: { reason: 'resume-pending' } });
          setIsTranslating(true);
          setShowProgressModal(true);
        } else if (!already) {
          // First time: queue + kick
          const { data: qData } = await supabase.functions.invoke('vocab-queue-translations', { body: { onlyMissing: true } });
          await supabase.functions.invoke('process-translations', { body: { reason: 'auto-start' } });
          localStorage.setItem('vocabRunnerStarted', new Date().toISOString());
          toast({ title: 'Auto-translation started', description: 'Processing queued translations in background.' });
          setIsTranslating(true);
          setShowProgressModal(true);
        }
      } catch (e) {
        // ignore start failures
      }
    })();
  }, []);
  
  // Reload when filters, page, or shuffle changes
  useEffect(() => {
    load();
  }, [selectedLevel, page, q, shuffleEnabled]);
  
  const toggleShuffle = () => {
    setShuffleEnabled(!shuffleEnabled);
  };

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
        
        // If translating, also check translation progress
        if (isTranslating) {
          const { data: statsData } = await supabase.rpc('get_translation_stats') as any;
          if (statsData && statsData.length > 0) {
            const stats = statsData[0];
            setTranslationProgress(prev => ({
              ...prev,
              current: stats.total_translations || 0,
              total: 7821 * 23, // Total cards * languages
            }));
            
            // Check if translation is complete
            const totalTarget = 7821 * 23;
            if (stats.total_translations >= totalTarget) {
              setIsTranslating(false);
              localStorage.removeItem('vocabTranslationActive');
              toast({
                title: 'Translation Complete! 🎉',
                description: `All ${stats.total_translations} translations completed across ${stats.unique_cards} words.`,
              });
            }
          }
        }
      } catch (e) {
        // Silent poll failures to avoid user-facing errors while function deploys
      }
    }, 3000);
    return () => clearInterval(id);
  }, [isTranslating]);

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

  const startBatchTranslation = async (
    options?: { offset?: number },
    isAutoRetry = false
  ) => {
    const languages = ['ar','bn','de','es','fa','fr','hi','id','ja','kk','ko','ms','ne','pt','ru','ta','th','tr','ur','vi','yue','zh','zh-TW'];
    const offset = options?.offset ?? 0;

    try {
      if (!isAutoRetry) {
        setIsTranslating(true);
        setShowProgressModal(true);
        setRetryCount(0);
      }

      localStorage.setItem('vocabTranslationActive', 'true');
      localStorage.setItem('vocabTranslationStartTime', String(Date.now()));

      // Call the optimized runner (it auto-chains in background)
      const { data, error } = await supabase.functions.invoke('vocab-translate-runner', {
        body: {
          languages,
          offset,
          limit: 20
        }
      });

      if (error || !data?.success) {
        const errorMsg = data?.error || error?.message || 'Unknown error';
        toast({ 
          title: 'Translation Started with Warning', 
          description: errorMsg,
          variant: 'default'
        });
      } else {
        toast({ 
          title: 'Translation Started!', 
          description: `Processing ${languages.length} languages. Check logs for progress. This will run in the background and auto-chain.`,
        });
      }
      
      // Start polling for progress
      setIsTranslating(true);
    } catch (e: any) {
      const errorMsg = e?.message || 'Unknown error';
      toast({ title: 'Translation Error', description: errorMsg, variant: 'destructive' });
    }
  };

  const handleResumeTranslation = () => {
    startBatchTranslation({ offset: 0 });
  };

  const viewTranslations = async () => {
    setLoading(true);
    try {
      // Get translation stats
      const { data: statsData } = await supabase.rpc('get_translation_stats') as any;
      if (statsData && statsData.length > 0) {
        setTranslationStats({
          total: statsData[0].total_translations || 0,
          unique_cards: statsData[0].unique_cards || 0,
          last_translation: statsData[0].last_translation || ''
        });
      }

      let query = supabase
        .from('vocab_translations')
        .select(`
          id,
          card_id,
          lang,
          translations,
          created_at,
          vocab_cards!inner(term, translation)
        `)
        .eq('is_system', true)
        .order('created_at', { ascending: false })
        .limit(100);

      if (selectedLang !== 'all') {
        query = query.eq('lang', selectedLang);
      }

      const { data, error } = await query;
      if (error) throw error;

      setTranslationViewerData(data || []);
      setShowTranslationViewer(true);
    } catch (e: any) {
      toast({
        title: 'Failed to load translations',
        description: e?.message || 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
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
           <button 
             className="border rounded px-3 py-2 bg-indigo-600 text-white font-medium" 
             onClick={viewTranslations}
             disabled={loading}
           >
             {loading ? '⏳ Loading…' : '👁️ View Translations'}
           </button>
           <button 
             className="border rounded px-3 py-2 bg-purple-600 text-white font-medium" 
             onClick={async () => {
               console.log('📊 Checking translation status...');
               
               // Count total words
               const { count: totalWords } = await supabase
                 .from('vocab_cards')
                 .select('*', { count: 'exact', head: true })
                 .eq('is_public', true)
                 .eq('language', 'en');
               
               // Count total translations
               const { count: totalTranslations } = await supabase
                 .from('vocab_translations')
                 .select('*', { count: 'exact', head: true });
               
               // Count by language
               const { data: allTrans } = await supabase
                 .from('vocab_translations')
                 .select('lang');
               
               const langCounts: Record<string, number> = {};
               (allTrans || []).forEach((t: any) => {
                 langCounts[t.lang] = (langCounts[t.lang] || 0) + 1;
               });
               
               const langReport = Object.entries(langCounts)
                 .sort((a, b) => b[1] - a[1])
                 .map(([lang, count]) => `${lang}: ${count}`)
                 .join('\n');
               
               const expectedTotal = (totalWords || 0) * 23;
               const coverage = totalTranslations && expectedTotal 
                 ? ((totalTranslations / expectedTotal) * 100).toFixed(2)
                 : '0';
               
               console.log('Translation Status:', {
                 totalWords,
                 totalTranslations,
                 expectedTotal,
                 coverage: `${coverage}%`,
                 byLanguage: langCounts
               });
               
               alert(`📊 Translation Status\n\nTotal English words: ${totalWords}\nTotal translations: ${totalTranslations}\nExpected: ${expectedTotal}\nCoverage: ${coverage}%\n\nBy language:\n${langReport}`);
             }}
           >
             📊 Check Status
           </button>
          <button className="border rounded px-3 py-2 bg-green-600 text-white font-medium" onClick={async()=>{
            const confirmed = window.confirm(`Translate all words into 23 languages with POS, IPA, and context?\n\nThis will create translation jobs for all missing translations.`);
            if (!confirmed) return;

            setSeeding(true);
            try {
              const SUPPORTED_LANGS = ['ar','bn','de','es','fa','fr','hi','id','ja','kk','ko','ms','ne','pt','ru','ta','th','tr','ur','vi','yue','zh','zh-TW'];
              
              // Queue translation jobs securely via edge function (service role)
              const { data: queueData, error: queueError } = await supabase.functions.invoke('vocab-queue-translations', {
                body: { languages: SUPPORTED_LANGS }
              });

              if (queueError || !queueData?.success) {
                console.error('❌ Failed to queue translation jobs', queueError || queueData);
                alert(queueData?.error || queueError?.message || 'Failed to queue translation jobs');
                return;
              }

              console.log(`📝 Queued jobs via edge function:`, queueData);

              // Check how many jobs are actually pending
              const { count: pendingCount } = await supabase
                .from('vocab_translation_queue')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending');
              
              const actualPendingJobs = pendingCount || 0;
              
              alert(`✅ Queued translation jobs!\n\n📊 Total pending: ${actualPendingJobs} jobs\n\n⚠️ IMPORTANT: Keep this tab open!\nTranslations will process automatically.\nDo not close or refresh the page.`);

              // Step 2: Process translations in batches with progress tracking
              let processed = 0;
              const totalJobs = actualPendingJobs;
              let consecutiveErrors = 0;
              const maxConsecutiveErrors = 5;
              let emptyBatchCount = 0;
              const maxEmptyBatches = 3;
              
              console.log(`🚀 Starting translation processing: ${totalJobs} jobs`);
              console.log(`⚠️ Keep this tab open - closing it will stop translations!`);
              
              while (processed < totalJobs && consecutiveErrors < maxConsecutiveErrors && emptyBatchCount < maxEmptyBatches) {
                try {
                  console.log(`🔄 Calling process-translations... (${processed}/${totalJobs})`);
                  const startTime = Date.now();
                  const { data, error } = await supabase.functions.invoke('process-translations', { body: {} });
                  const duration = Date.now() - startTime;
                  
                  console.log(`📦 Response (${duration}ms):`, JSON.stringify({ data, error }, null, 2));
                  
                  // Check remaining pending jobs
                  const { count: remainingCount } = await supabase
                    .from('vocab_translation_queue')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', 'pending');
                  
                  const remainingJobs = remainingCount || 0;
                  console.log(`📊 Remaining pending jobs: ${remainingJobs}`);
                  
                  if (error) {
                    console.error(`❌ Edge Function Error:`, {
                      message: error.message,
                      status: error.status,
                      statusText: error.statusText,
                      details: error
                    });
                    consecutiveErrors++;
                  } else if (!data?.success) {
                    console.error(`❌ Translation batch failed:`, { data });
                    consecutiveErrors++;
                    
                    if (consecutiveErrors >= maxConsecutiveErrors) {
                      alert(`❌ Translation stopped after ${maxConsecutiveErrors} consecutive failures.\n\nProcessed: ${processed}/${totalJobs} translations\n\nYou can click the button again to resume from where it left off.`);
                      break;
                    }
                    
                    // Wait longer before retry
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    continue;
                  }
                  
                  // Reset error counter on success
                  consecutiveErrors = 0;
                  
                  // Check if batch was empty (no jobs processed)
                  if (remainingJobs === totalJobs - processed) {
                    emptyBatchCount++;
                    console.log(`⚠️ Empty batch detected (${emptyBatchCount}/${maxEmptyBatches})`);
                    if (emptyBatchCount >= maxEmptyBatches) {
                      console.log(`✅ All jobs completed (no more pending jobs)`);
                      processed = totalJobs;
                      break;
                    }
                  } else {
                    emptyBatchCount = 0;
                  }
                  
                  // Update processed count based on remaining jobs
                  const actualProcessed = totalJobs - remainingJobs;
                  processed = actualProcessed;
                  
                  // Update progress
                  const progress = Math.round((processed / totalJobs) * 100);
                  console.log(`📊 Translation progress: ${progress}% (${processed}/${totalJobs})`);
                  
                  // Update UI with progress
                  if (processed % 500 === 0 || processed === totalJobs || remainingJobs === 0) {
                    console.log(`✅ Processed ${processed}/${totalJobs} translations (${remainingJobs} remaining)`);
                  }
                  
                  // Exit if no jobs remaining
                  if (remainingJobs === 0) {
                    console.log(`🎉 All translations completed!`);
                    processed = totalJobs;
                    break;
                  }
                  
                  // Small delay to avoid overwhelming the system
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  
                } catch (batchError) {
                  console.error('Batch processing error:', batchError);
                  consecutiveErrors++;
                  
                  if (consecutiveErrors >= maxConsecutiveErrors) {
                    alert(`❌ Translation stopped due to errors.\n\nProcessed: ${processed}/${totalJobs} translations\n\nError: ${batchError.message}`);
                    break;
                  }
                  
                  // Wait before retry
                  await new Promise(resolve => setTimeout(resolve, 3000));
                }
              }

              // Final check for remaining jobs
              const { count: finalPendingCount } = await supabase
                .from('vocab_translation_queue')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending');
              
              const finalRemaining = finalPendingCount || 0;
              
              if (finalRemaining === 0 || processed >= totalJobs) {
                alert(`🎉 Translation completed successfully!\n\n✅ Processed: ${processed} translations\n🌍 Languages: 23\n✅ No pending jobs remaining\n\nAll translations are now available!`);
              } else {
                const { count: stillPendingCount } = await supabase
                  .from('vocab_translation_queue')
                  .select('*', { count: 'exact', head: true })
                  .eq('status', 'pending');
                
                const stillPending = stillPendingCount || 0;
                alert(`⚠️ Translation incomplete\n\n✅ Processed: ${processed}/${totalJobs}\n⏸️ Still pending: ${stillPending} jobs\n\n${consecutiveErrors >= maxConsecutiveErrors ? '❌ Stopped due to errors' : '⏸️ Processing paused'}\n\nClick "🌍 Translate All" again to resume.`);
              }
              loadTranslations();
              refresh();
            } catch (e: any) {
              alert(`Failed: ${e?.message || 'Unknown error'}`);
            } finally {
              setSeeding(false);
            }
          }} disabled={seeding}>
            {seeding ? '⏳ Translating All…' : '🌍 Translate All to 23 Languages'}
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
        <button
          onClick={toggleShuffle}
          className={`border rounded px-4 py-2 whitespace-nowrap ${shuffleEnabled ? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-50'}`}
        >
          🔀 {shuffleEnabled ? 'Shuffled' : 'Shuffle'}
        </button>
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
                        ✅ {Object.keys(translations[r.id]).length}/23 languages translated
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
      
      <TranslationProgressModal
        open={showProgressModal}
        onOpenChange={setShowProgressModal}
        progress={translationProgress}
        isRunning={isTranslating}
        onResume={handleResumeTranslation}
        canResume={!isTranslating && lastProcessedCard !== null && translationProgress.errors > 0}
      />

      {/* Translation Viewer Modal */}
      {showTranslationViewer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Translation Viewer</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {translationStats ? (
                    <>
                      <span className="font-medium text-green-600">{translationStats.total} total translations</span> across{' '}
                      <span className="font-medium">{translationStats.unique_cards} words</span> • Last: {new Date(translationStats.last_translation).toLocaleString()}
                    </>
                  ) : (
                    'Loading stats...'
                  )}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Showing latest 100 • Auto-retry: {autoRetryEnabled ? '✅ ON' : '❌ OFF'} • Retry count: {retryCount}/10
                </p>
              </div>
              <div className="flex gap-2">
                <label className="flex items-center gap-2 px-3 py-2 border rounded cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={autoRetryEnabled}
                    onChange={(e) => setAutoRetryEnabled(e.target.checked)}
                  />
                  <span className="text-sm">Auto-retry</span>
                </label>
                <button
                  onClick={() => setShowTranslationViewer(false)}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="overflow-auto flex-1 p-4">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-100">
                  <tr>
                    <th className="text-left p-2 border">English Term</th>
                    <th className="text-left p-2 border">Language</th>
                    <th className="text-left p-2 border">Translations</th>
                    <th className="text-left p-2 border">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {translationViewerData.map((item: any) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="p-2 border">
                        <div className="font-medium">{item.vocab_cards?.term}</div>
                        <div className="text-xs text-gray-500">{item.vocab_cards?.translation}</div>
                      </td>
                      <td className="p-2 border">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                          {item.lang}
                        </span>
                      </td>
                      <td className="p-2 border">
                        {Array.isArray(item.translations) ? (
                          <div className="flex flex-wrap gap-1">
                            {item.translations.slice(0, 5).map((t: string, i: number) => (
                              <span key={i} className="px-2 py-1 bg-green-50 text-green-800 rounded text-xs">
                                {t}
                              </span>
                            ))}
                            {item.translations.length > 5 && (
                              <span className="text-xs text-gray-500">+{item.translations.length - 5} more</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-red-600 text-xs">Invalid format</span>
                        )}
                      </td>
                      <td className="p-2 border text-xs text-gray-500">
                        {new Date(item.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {translationViewerData.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No translations found
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminVocabManager;


