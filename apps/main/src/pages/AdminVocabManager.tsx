import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TranslationProgressModal } from '@/components/TranslationProgressModal';
import { useToast } from '@/hooks/use-toast';
import { Book, Languages, Search, Plus, Trash2, RefreshCw, Sparkles, Download, Upload, BarChart3, Globe, Zap, AlertCircle, CheckCircle } from 'lucide-react';

// Note theme colors
const noteTheme = {
  bg: 'bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50',
  card: 'bg-white/80 backdrop-blur-sm border border-amber-200/50 shadow-lg shadow-amber-100/20',
  cardHover: 'hover:shadow-xl hover:shadow-amber-200/30 hover:border-amber-300/60',
  primary: 'bg-amber-500 hover:bg-amber-600 text-white',
  secondary: 'bg-orange-100 hover:bg-orange-200 text-orange-800 border border-orange-200',
  accent: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white',
  danger: 'bg-red-500 hover:bg-red-600 text-white',
  success: 'bg-emerald-500 hover:bg-emerald-600 text-white',
  text: 'text-amber-900',
  textMuted: 'text-amber-700/70',
  input: 'bg-white/90 border-amber-200 focus:border-amber-400 focus:ring-amber-400/20',
  badge: 'bg-amber-100 text-amber-800 border border-amber-200',
};

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
          // Extra kick to ensure background chaining keeps going even if a previous run stalled
          await supabase.functions.invoke('kick-translations', { body: { cycles: 12, parallel: 3 } });
          setIsTranslating(true);
          setShowProgressModal(true);
        } else if (!already) {
          // First time: queue + kick
          const { data: qData } = await supabase.functions.invoke('vocab-queue-translations', { body: { onlyMissing: true } });
          await supabase.functions.invoke('process-translations', { body: { reason: 'auto-start' } });
          await supabase.functions.invoke('kick-translations', { body: { cycles: 12, parallel: 3 } });
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

  const startBatchTranslation = async (
    options?: { offset?: number },
    isAutoRetry = false
  ) => {
    // All supported languages from getSupportedLanguages() - excluding 'en' (source language)
    const languages = [
      // Top tier languages
      'zh', 'hi', 'es', 'fr', 'ar', 'bn', 'pt', 'ru', 'ja',
      // Second tier
      'ur', 'id', 'de', 'vi', 'tr', 'it', 'ko', 'fa', 'ta', 'th', 'yue', 'ms',
      // Indian languages
      'te', 'mr', 'gu', 'kn', 'ml', 'pa', 'or', 'as',
      // African languages
      'sw', 'ha', 'yo', 'ig', 'am', 'zu', 'af',
      // European languages
      'pl', 'uk', 'ro', 'nl', 'el', 'cs', 'hu', 'sv', 'bg', 'sr', 'hr', 'sk', 'no', 'da', 'fi', 'sq', 'sl', 'et', 'lv', 'lt',
      // Central Asian
      'uz', 'kk', 'az', 'mn',
      // Middle Eastern & Other
      'he', 'ps', 'ka', 'hy',
      // Southeast Asian
      'tl', 'my', 'km', 'si', 'ne',
      // Traditional Chinese
      'zh-TW'
    ];
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
    <div className={`min-h-screen ${noteTheme.bg} p-6`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className={`${noteTheme.card} rounded-2xl p-6 mb-6`}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg">
                <Book className="w-6 h-6" />
              </div>
              <div>
                <h1 className={`text-2xl font-bold ${noteTheme.text}`}>Vocabulary Manager</h1>
                <p className={noteTheme.textMuted}>Manage vocabulary cards and translations</p>
              </div>
            </div>
          <button 
              className={`flex items-center gap-2 px-4 py-2 rounded-xl ${noteTheme.secondary} transition-all duration-200`}
              onClick={refresh} 
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Loading…' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className={`${noteTheme.card} ${noteTheme.cardHover} rounded-xl p-4 transition-all duration-200`}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <Book className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className={`text-sm ${noteTheme.textMuted}`}>Total Words</p>
                <p className={`text-xl font-bold ${noteTheme.text}`}>{counts.total.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className={`${noteTheme.card} ${noteTheme.cardHover} rounded-xl p-4 transition-all duration-200`}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className={`text-sm ${noteTheme.textMuted}`}>Public Words</p>
                <p className={`text-xl font-bold ${noteTheme.text}`}>{counts.publicTotal.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className={`${noteTheme.card} ${noteTheme.cardHover} rounded-xl p-4 transition-all duration-200`}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Languages className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className={`text-sm ${noteTheme.textMuted}`}>Languages</p>
                <p className={`text-xl font-bold ${noteTheme.text}`}>69</p>
              </div>
            </div>
          </div>
          <div className={`${noteTheme.card} ${noteTheme.cardHover} rounded-xl p-4 transition-all duration-200`}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <BarChart3 className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className={`text-sm ${noteTheme.textMuted}`}>Current Page</p>
                <p className={`text-xl font-bold ${noteTheme.text}`}>{page} / {Math.ceil(totalCount / pageSize) || 1}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className={`${noteTheme.card} rounded-xl p-5 mb-6`}>
          <h2 className={`text-lg font-semibold ${noteTheme.text} mb-4 flex items-center gap-2`}>
            <Zap className="w-5 h-5 text-amber-500" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <button 
              className={`flex flex-col items-center gap-2 p-4 rounded-xl ${noteTheme.secondary} transition-all duration-200 ${noteTheme.cardHover}`}
            onClick={() => generateFrequencyVocab()} 
            disabled={generating}
          >
              <Sparkles className="w-5 h-5" />
              <span className="text-xs font-medium text-center">{generating ? 'Generating…' : 'Generate Words'}</span>
          </button>
          <button 
              className={`flex flex-col items-center gap-2 p-4 rounded-xl ${noteTheme.secondary} transition-all duration-200 ${noteTheme.cardHover}`}
            onClick={generateAdvancedWords} 
            disabled={generating}
          >
              <Book className="w-5 h-5" />
              <span className="text-xs font-medium text-center">{generating ? 'Generating…' : 'CEFR Words'}</span>
          </button>
          <button
              className={`flex flex-col items-center gap-2 p-4 rounded-xl ${noteTheme.secondary} transition-all duration-200 ${noteTheme.cardHover}`}
            onClick={importIELTSWords} 
            disabled={generating}
          >
              <Download className="w-5 h-5" />
              <span className="text-xs font-medium text-center">{generating ? 'Importing…' : 'Import IELTS'}</span>
          </button>
          <button 
              className={`flex flex-col items-center gap-2 p-4 rounded-xl bg-orange-100 hover:bg-orange-200 text-orange-800 border border-orange-200 transition-all duration-200`}
            onClick={cleanupJunk} 
            disabled={deleting}
          >
              <Trash2 className="w-5 h-5" />
              <span className="text-xs font-medium text-center">{deleting ? 'Cleaning…' : 'Clean Junk'}</span>
          </button>
          <button 
              className={`flex flex-col items-center gap-2 p-4 rounded-xl bg-red-100 hover:bg-red-200 text-red-800 border border-red-200 transition-all duration-200`}
            onClick={deleteAllWords} 
            disabled={deleting}
          >
              <AlertCircle className="w-5 h-5" />
              <span className="text-xs font-medium text-center">{deleting ? 'Deleting…' : 'Delete All'}</span>
          </button>
           <button 
              className={`flex flex-col items-center gap-2 p-4 rounded-xl bg-indigo-100 hover:bg-indigo-200 text-indigo-800 border border-indigo-200 transition-all duration-200`}
             onClick={viewTranslations}
             disabled={loading}
           >
              <Globe className="w-5 h-5" />
              <span className="text-xs font-medium text-center">{loading ? 'Loading…' : 'View Translations'}</span>
           </button>
          </div>
        </div>

        {/* Translation Section */}
        <div className={`${noteTheme.card} rounded-xl p-5 mb-6`}>
          <h2 className={`text-lg font-semibold ${noteTheme.text} mb-4 flex items-center gap-2`}>
            <Languages className="w-5 h-5 text-amber-500" />
            Translation Tools
          </h2>
          <div className="flex flex-wrap gap-3">
           <button 
              className={`flex items-center gap-2 px-4 py-3 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-800 border border-purple-200 transition-all duration-200 font-medium`}
             onClick={async () => {
               console.log('📊 Checking translation status...');
               
               const { count: totalWords } = await supabase
                 .from('vocab_cards')
                 .select('*', { count: 'exact', head: true })
                 .eq('is_public', true)
                 .eq('language', 'en');
               
               const { count: totalTranslations } = await supabase
                 .from('vocab_translations')
                 .select('*', { count: 'exact', head: true });
               
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
               
                const expectedTotal = (totalWords || 0) * 69;
               const coverage = totalTranslations && expectedTotal 
                 ? ((totalTranslations / expectedTotal) * 100).toFixed(2)
                 : '0';
               
                alert(`📊 Translation Status\n\nTotal English words: ${totalWords}\nTotal translations: ${totalTranslations}\nExpected (69 langs): ${expectedTotal}\nCoverage: ${coverage}%\n\nBy language:\n${langReport}`);
              }}
            >
              <BarChart3 className="w-4 h-4" />
              Check Status
           </button>
            <button 
              className={`flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-200 transition-all duration-200 font-medium`}
              onClick={async()=>{
            const confirmed = window.confirm(`Queue translation jobs for 69 languages?\n\nThis uses the queue-based system.\nFor faster results, use "Smart Translate" instead.`);
            if (!confirmed) return;

            setSeeding(true);
            try {
              // All supported languages from getSupportedLanguages() - excluding 'en' (source language)
              const SUPPORTED_LANGS = [
                // Top tier languages
                'zh', 'hi', 'es', 'fr', 'ar', 'bn', 'pt', 'ru', 'ja',
                // Second tier
                'ur', 'id', 'de', 'vi', 'tr', 'it', 'ko', 'fa', 'ta', 'th', 'yue', 'ms',
                // Indian languages
                'te', 'mr', 'gu', 'kn', 'ml', 'pa', 'or', 'as',
                // African languages
                'sw', 'ha', 'yo', 'ig', 'am', 'zu', 'af',
                // European languages
                'pl', 'uk', 'ro', 'nl', 'el', 'cs', 'hu', 'sv', 'bg', 'sr', 'hr', 'sk', 'no', 'da', 'fi', 'sq', 'sl', 'et', 'lv', 'lt',
                // Central Asian
                'uz', 'kk', 'az', 'mn',
                // Middle Eastern & Other
                'he', 'ps', 'ka', 'hy',
                // Southeast Asian
                'tl', 'my', 'km', 'si', 'ne',
                // Traditional Chinese
                'zh-TW'
              ];
              
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
              <Globe className="w-4 h-4" />
              {seeding ? 'Queuing…' : 'Queue Translations'}
            </button>
            <button 
              className={`flex items-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-200/50 transition-all duration-200 font-semibold`}
              onClick={async () => {
                const confirmed = window.confirm(
                `🚀 Smart Batch Translation\n\n` +
                `This will translate vocabulary words to 69 languages with example sentences.\n\n` +
                `Features:\n` +
                `• Translates 5 cards × 69 languages per batch\n` +
                  `• Includes example sentences\n` +
                  `• Auto-resumes from where it left off\n` +
                  `• Safe (won't timeout)\n\n` +
                  `Continue?`
                );
                if (!confirmed) return;

                setSeeding(true);
                let continueFrom: string | null = null;
                let totalTranslations = 0;
                let totalCards = 0;
                let batchCount = 0;
                let consecutiveErrors = 0;
                const maxBatches = 500; // Higher limit for continuous processing
                const maxConsecutiveErrors = 3;
                
                try {
                  while (batchCount < maxBatches && consecutiveErrors < maxConsecutiveErrors) {
                    batchCount++;
                    console.log(`📦 Processing batch ${batchCount}...`);
                    
                    let data, error;
                    try {
                      const result = await supabase.functions.invoke('vocab-batch-translate-v2', {
                        body: {
                          cardsPerRun: 10,        // Increased for efficiency
                          parallelLanguages: 5,   // Process 5 languages in parallel
                          batchSize: 15,
                          continueFrom
                        }
                      });
                      data = result.data;
                      error = result.error;
                      consecutiveErrors = 0; // Reset on success
                    } catch (fetchError: any) {
                      console.error('Fetch error (will retry):', fetchError);
                      consecutiveErrors++;
                      
                      if (consecutiveErrors < maxConsecutiveErrors) {
                        toast({
                          title: `Retry ${consecutiveErrors}/${maxConsecutiveErrors}`,
                          description: 'Connection issue, retrying in 3 seconds...',
                        });
                        await new Promise(r => setTimeout(r, 3000));
                        continue; // Retry with same continueFrom
                      } else {
                        toast({
                          title: 'Translation Paused',
                          description: `Completed ${totalTranslations} translations. Click again to continue.`,
                          variant: 'destructive'
                        });
                        break;
                      }
                    }

                    if (error) {
                      console.error('Batch error (will retry):', error);
                      consecutiveErrors++;
                      
                      if (consecutiveErrors < maxConsecutiveErrors) {
                        toast({
                          title: `Retry ${consecutiveErrors}/${maxConsecutiveErrors}`,
                          description: 'API error, retrying in 3 seconds...',
                        });
                        await new Promise(r => setTimeout(r, 3000));
                        continue;
                      } else {
                        toast({
                          title: 'Translation Paused',
                          description: `Completed ${totalTranslations} translations. Click again to continue.`,
                          variant: 'destructive'
                        });
                        break;
                      }
                    }

                    if (!data?.success) {
                      console.error('Batch failed:', data);
                      consecutiveErrors++;
                      if (consecutiveErrors >= maxConsecutiveErrors) break;
                      continue;
                    }

                    totalTranslations += data.stats?.translations || 0;
                    totalCards += data.stats?.cardsProcessed || 0;
                    
                    console.log(`✅ Batch ${batchCount}: ${data.stats?.translations} translations, ${data.stats?.cardsProcessed} cards (${data.stats?.duration}ms)`);
                    
                    // Update progress every 10 batches to reduce toast spam
                    if (batchCount % 10 === 0) {
                      const eta = Math.round((7972 - totalCards) / 10 * 30 / 60); // rough estimate in minutes
                      toast({
                        title: `Progress: ${batchCount} batches`,
                        description: `${totalTranslations.toLocaleString()} translations (${totalCards} cards) ~${eta}min remaining`,
                      });
                    }

                    if (data.completed || !data.hasMore) {
                      console.log('🎉 All cards translated!');
                      toast({
                        title: '🎉 Translation Complete!',
                        description: `${totalTranslations.toLocaleString()} translations across ${totalCards} cards`,
                      });
                      break;
                    }

                    continueFrom = data.continueFrom;
                    
                    // Small delay between batches (reduced since parallel processing is efficient)
                    await new Promise(r => setTimeout(r, 500));
                  }

                  if (batchCount >= maxBatches) {
                    toast({
                      title: 'Batch Limit Reached',
                      description: `Processed ${totalTranslations} translations. Click again to continue.`,
                    });
                  }
                  
                  refresh();
                } catch (e: any) {
                  toast({
                    title: 'Translation Error',
                    description: `Completed ${totalTranslations} translations before error. Click again to continue.`,
                    variant: 'destructive'
                  });
                } finally {
                  setSeeding(false);
                }
              }}
              disabled={seeding}
            >
              <Zap className="w-4 h-4" />
              {seeding ? 'Translating…' : 'Smart Translate ⚡'}
          </button>
        </div>
      </div>

        {/* Progress & Audit Results */}
        {(progress || auditResults) && (
          <div className={`${noteTheme.card} rounded-xl p-4 mb-6`}>
          {progress && (
              <div className={`text-sm ${noteTheme.textMuted} mb-2`}>
                Progress: {progress.completed||0} / {progress.total||0} 
                {progress.last_term && ` • Last: ${progress.last_term}`}
                {progress.last_error && <span className="text-red-500"> • Error: {progress.last_error}</span>}
        </div>
      )}
      {auditResults && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm font-medium text-blue-800 mb-1">
                  Audit Results ({auditResults.type})
          </div>
          <div className="text-xs text-blue-700">
            {auditResults.type === 'levels' && (
                    <span>Words: {auditResults.data.totalWords} • Invalid: {auditResults.data.invalidLevels}</span>
            )}
            {auditResults.type === 'translations' && (
                    <span>No trans: {auditResults.data.noTranslations} • Partial: {auditResults.data.partialTranslations} • Full: {auditResults.data.fullTranslations}</span>
            )}
          </div>
              </div>
            )}
        </div>
      )}
      {/* Add Word */}
        <div className={`${noteTheme.card} rounded-xl p-5 mb-6`}>
          <h2 className={`text-lg font-semibold ${noteTheme.text} mb-4 flex items-center gap-2`}>
            <Plus className="w-5 h-5 text-amber-500" />
            Add New Word
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
            <div>
              <label className={`text-xs font-medium ${noteTheme.textMuted} mb-1 block`}>Term *</label>
              <input 
                className={`w-full px-3 py-2 rounded-lg ${noteTheme.input} border focus:ring-2 transition-all`}
                placeholder="e.g., serendipity" 
                value={newTerm} 
                onChange={(e)=>setNewTerm(e.target.value)} 
              />
            </div>
            <div>
              <label className={`text-xs font-medium ${noteTheme.textMuted} mb-1 block`}>Translation</label>
              <input 
                className={`w-full px-3 py-2 rounded-lg ${noteTheme.input} border focus:ring-2 transition-all`}
                placeholder="Translation" 
                value={newTranslation} 
                onChange={(e)=>setNewTranslation(e.target.value)} 
              />
            </div>
            <div>
              <label className={`text-xs font-medium ${noteTheme.textMuted} mb-1 block`}>POS</label>
              <input 
                className={`w-full px-3 py-2 rounded-lg ${noteTheme.input} border focus:ring-2 transition-all`}
                placeholder="noun, verb..." 
                value={newPos} 
                onChange={(e)=>setNewPos(e.target.value)} 
              />
            </div>
            <div>
              <label className={`text-xs font-medium ${noteTheme.textMuted} mb-1 block`}>IPA</label>
              <input 
                className={`w-full px-3 py-2 rounded-lg ${noteTheme.input} border focus:ring-2 transition-all`}
                placeholder="/ˌserənˈdɪpəti/" 
                value={newIpa} 
                onChange={(e)=>setNewIpa(e.target.value)} 
              />
            </div>
            <div>
              <label className={`text-xs font-medium ${noteTheme.textMuted} mb-1 block`}>Context</label>
              <input 
                className={`w-full px-3 py-2 rounded-lg ${noteTheme.input} border focus:ring-2 transition-all`}
                placeholder="Example sentence" 
                value={newContext} 
                onChange={(e)=>setNewContext(e.target.value)} 
              />
            </div>
            <button 
              className={`px-4 py-2 rounded-lg ${noteTheme.primary} font-medium transition-all duration-200 flex items-center justify-center gap-2`}
              onClick={addWord}
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
        </div>
      </div>
      
      {/* Filters and Search */}
        <div className={`${noteTheme.card} rounded-xl p-5 mb-6`}>
          <div className="flex gap-3 items-center flex-wrap">
            <div className="flex-1 min-w-[250px] relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${noteTheme.textMuted}`} />
        <input 
          value={q} 
          onChange={(e) => {
            setQ(e.target.value);
                  setPage(1);
          }} 
          placeholder="Search terms or translations…" 
                className={`w-full pl-10 pr-4 py-2.5 rounded-lg ${noteTheme.input} border focus:ring-2 transition-all`}
        />
            </div>
        <button
          onClick={toggleShuffle}
              className={`px-4 py-2.5 rounded-lg font-medium transition-all duration-200 ${shuffleEnabled ? 'bg-amber-500 text-white' : noteTheme.secondary}`}
        >
          🔀 {shuffleEnabled ? 'Shuffled' : 'Shuffle'}
        </button>
        <select
          value={selectedLevel || ''}
          onChange={(e) => {
            setSelectedLevel(e.target.value ? parseInt(e.target.value) : null);
                setPage(1);
          }}
              className={`px-4 py-2.5 rounded-lg ${noteTheme.input} border focus:ring-2 transition-all`}
        >
          <option value="">All Levels</option>
              <option value="1">A1 - Beginner</option>
              <option value="2">A2 - Elementary</option>
              <option value="3">B1 - Intermediate</option>
              <option value="4">B2 - Upper Intermediate</option>
        </select>
            <div className={`text-sm ${noteTheme.textMuted} px-3 py-2 rounded-lg bg-amber-50`}>
              Showing <span className="font-semibold text-amber-700">{rows.length}</span> of <span className="font-semibold text-amber-700">{totalCount.toLocaleString()}</span> words
            </div>
        </div>
      </div>
      
        {/* Vocabulary Table */}
        <div className={`${noteTheme.card} rounded-xl overflow-hidden mb-6`}>
          {/* Pagination Header */}
          <div className="flex gap-3 items-center justify-between p-4 border-b border-amber-100">
        <div className="flex gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1 || loading}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${noteTheme.secondary} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            ← Previous
          </button>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page * pageSize >= totalCount || loading}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${noteTheme.secondary} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Next →
          </button>
        </div>
            <div className={`text-sm ${noteTheme.textMuted}`}>
              Page <span className="font-semibold">{page}</span> of <span className="font-semibold">{Math.ceil(totalCount / pageSize) || 1}</span>
        </div>
      </div>
      
          <div className="overflow-auto">
        <table className="min-w-full text-sm">
              <thead className="bg-gradient-to-r from-amber-50 to-orange-50">
                <tr>
                  <th className={`text-left p-3 font-semibold ${noteTheme.text}`}>Term</th>
                  <th className={`text-left p-3 font-semibold ${noteTheme.text}`}>Translations</th>
                  <th className={`text-left p-3 font-semibold ${noteTheme.text}`}>POS</th>
                  <th className={`text-left p-3 font-semibold ${noteTheme.text}`}>IPA</th>
                  <th className={`text-left p-3 font-semibold ${noteTheme.text}`}>Context</th>
                  <th className={`text-left p-3 font-semibold ${noteTheme.text}`}>Level</th>
                  <th className={`text-left p-3 font-semibold ${noteTheme.text}`}>Freq</th>
                  <th className={`text-left p-3 font-semibold ${noteTheme.text}`}>Actions</th>
            </tr>
          </thead>
          <tbody>
                {rows.map((r, idx) => (
                  <tr key={r.id} className={`border-t border-amber-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-amber-50/30'} hover:bg-amber-100/50 transition-colors`}>
                    <td className={`p-3 font-semibold ${noteTheme.text}`}>{r.term}</td>
                    <td className="p-3">
                      <div className="space-y-1 max-w-xs">
                        {Object.entries(translations[r.id] || {}).slice(0, 3).map(([lang, trans]) => (
                      <div key={lang} className="text-xs">
                            <span className="font-medium text-amber-600">{lang.toUpperCase()}:</span> <span className={noteTheme.textMuted}>{String(trans)}</span>
                      </div>
                    ))}
                        {Object.keys(translations[r.id] || {}).length > 3 && (
                          <div className="text-xs text-amber-500">+{Object.keys(translations[r.id]).length - 3} more</div>
                        )}
                    {(!translations[r.id] || Object.keys(translations[r.id]).length === 0) && (
                          <span className="text-gray-400 text-xs italic">No translations</span>
                    )}
                    {Object.keys(translations[r.id] || {}).length > 0 && (
                          <div className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            {Object.keys(translations[r.id]).length}/69 languages
                      </div>
                    )}
                  </div>
                </td>
                    <td className="p-3">
                      <input 
                        className={`px-2 py-1.5 rounded-lg ${noteTheme.input} border w-24 text-xs`}
                        defaultValue={r.pos||''} 
                        onBlur={(e)=>update(r.id,{ pos: e.target.value })} 
                      />
                    </td>
                    <td className="p-3">
                      <input 
                        className={`px-2 py-1.5 rounded-lg ${noteTheme.input} border w-28 text-xs font-mono`}
                        defaultValue={r.ipa||''} 
                        onBlur={(e)=>update(r.id,{ ipa: e.target.value })} 
                      />
                    </td>
                    <td className="p-3 max-w-[280px]">
                      <textarea 
                        className={`px-2 py-1.5 rounded-lg ${noteTheme.input} border w-full text-xs resize-none`}
                        rows={2}
                        defaultValue={r.context_sentence||''} 
                        onBlur={(e)=>update(r.id,{ context_sentence: e.target.value })} 
                      />
                    </td>
                    <td className="p-3 w-20 text-center">
                  <select
                        className={`px-2 py-1.5 rounded-lg ${noteTheme.input} border w-full text-xs`}
                    defaultValue={r.level || 1}
                    onChange={(e)=>update(r.id,{ level: parseInt(e.target.value) })}
                  >
                    <option value={1}>A1</option>
                    <option value={2}>A2</option>
                    <option value={3}>B1</option>
                    <option value={4}>B2</option>
                  </select>
                </td>
                    <td className={`p-3 w-16 text-center ${noteTheme.textMuted} text-xs`}>{r.frequency_rank||'-'}</td>
                    <td className="p-3">
                      <button 
                        className="px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 text-xs font-medium transition-all flex items-center gap-1"
                        onClick={()=>del(r.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
                  <tr>
                    <td className={`p-8 text-center ${noteTheme.textMuted}`} colSpan={8}>
                      <div className="flex flex-col items-center gap-2">
                        <Book className="w-8 h-8 opacity-50" />
                        <span>No vocabulary items found</span>
                      </div>
                    </td>
                  </tr>
            )}
          </tbody>
        </table>
          </div>
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`${noteTheme.card} rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col`}>
              <div className="p-5 border-b border-amber-100 flex items-center justify-between">
              <div>
                  <h2 className={`text-xl font-bold ${noteTheme.text} flex items-center gap-2`}>
                    <Globe className="w-5 h-5 text-amber-500" />
                    Translation Viewer
                  </h2>
                  <p className={`text-sm ${noteTheme.textMuted} mt-1`}>
                  {translationStats ? (
                    <>
                        <span className="font-semibold text-emerald-600">{translationStats.total.toLocaleString()} translations</span> across{' '}
                        <span className="font-semibold">{translationStats.unique_cards.toLocaleString()} words</span>
                    </>
                  ) : (
                    'Loading stats...'
                  )}
                </p>
              </div>
                <div className="flex gap-3">
                  <label className={`flex items-center gap-2 px-4 py-2 rounded-lg ${noteTheme.secondary} cursor-pointer transition-all`}>
                  <input
                    type="checkbox"
                    checked={autoRetryEnabled}
                    onChange={(e) => setAutoRetryEnabled(e.target.checked)}
                      className="rounded border-amber-300"
                  />
                    <span className="text-sm font-medium">Auto-retry</span>
                </label>
                <button
                  onClick={() => setShowTranslationViewer(false)}
                    className={`px-4 py-2 rounded-lg ${noteTheme.primary} font-medium transition-all`}
                >
                  Close
                </button>
              </div>
            </div>
            <div className="overflow-auto flex-1 p-4">
              <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gradient-to-r from-amber-50 to-orange-50">
                    <tr>
                      <th className={`text-left p-3 font-semibold ${noteTheme.text}`}>English Term</th>
                      <th className={`text-left p-3 font-semibold ${noteTheme.text}`}>Language</th>
                      <th className={`text-left p-3 font-semibold ${noteTheme.text}`}>Translations</th>
                      <th className={`text-left p-3 font-semibold ${noteTheme.text}`}>Created</th>
                  </tr>
                </thead>
                <tbody>
                    {translationViewerData.map((item: any, idx: number) => (
                      <tr key={item.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-amber-50/30'} hover:bg-amber-100/50 transition-colors`}>
                        <td className="p-3 border-b border-amber-100">
                          <div className={`font-semibold ${noteTheme.text}`}>{item.vocab_cards?.term}</div>
                          <div className={`text-xs ${noteTheme.textMuted}`}>{item.vocab_cards?.translation}</div>
                      </td>
                        <td className="p-3 border-b border-amber-100">
                          <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded-lg text-xs font-medium">
                            {item.lang?.toUpperCase()}
                        </span>
                      </td>
                        <td className="p-3 border-b border-amber-100">
                        {Array.isArray(item.translations) ? (
                          <div className="flex flex-wrap gap-1">
                            {item.translations.slice(0, 5).map((t: string, i: number) => (
                                <span key={i} className="px-2 py-1 bg-emerald-50 text-emerald-800 rounded-lg text-xs">
                                {t}
                              </span>
                            ))}
                            {item.translations.length > 5 && (
                                <span className={`text-xs ${noteTheme.textMuted}`}>+{item.translations.length - 5} more</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-red-600 text-xs">Invalid format</span>
                        )}
                      </td>
                        <td className={`p-3 border-b border-amber-100 text-xs ${noteTheme.textMuted}`}>
                        {new Date(item.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {translationViewerData.length === 0 && (
                  <div className={`text-center py-12 ${noteTheme.textMuted}`}>
                    <Globe className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No translations found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default AdminVocabManager;


