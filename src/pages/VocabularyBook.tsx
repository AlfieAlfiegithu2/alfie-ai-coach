import { useEffect, useMemo, useState } from "react";
import StudentLayout from "@/components/StudentLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface CardRow { id: string; term: string; translation: string; pos?: string | null; ipa?: string | null; context_sentence?: string | null; user_id?: string }

export default function VocabularyBook() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<CardRow[]>([]);
  const [translations, setTranslations] = useState<Record<string, any>>({});
  const [preferredLanguage, setPreferredLanguage] = useState<string>('ko'); // Default to Korean
  const [filter, setFilter] = useState("");

  // Load user's preferred language
  useEffect(() => {
    const loadUserPreferences = async () => {
      if (!user) return;

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('native_language')
          .eq('id', user.id)
          .single();

        if (profile?.native_language) {
          setPreferredLanguage(profile.native_language);
        }
      } catch (error) {
        console.error('Error loading user preferences:', error);
      }
    };

    loadUserPreferences();
  }, [user]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      if (!user) { setCards([]); setLoading(false); return; }

      // Load cards with basic info (including system imports)
      const { data } = await (supabase as any)
        .from("vocab_cards")
        .select("id, term, translation, pos, ipa, context_sentence, user_id")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(5000);

      // Load translations for all cards (including system imports)
      const { data: transData } = await (supabase as any)
        .from("vocab_translations")
        .select("card_id, lang, translations");

      const transMap: Record<string, any> = {};
      transData?.forEach(t => {
        if (!transMap[t.card_id]) transMap[t.card_id] = {};
        transMap[t.card_id][t.lang] = t.translations?.[0] || '';
      });
      setTranslations(transMap);

      const rows = (data as any) || [];
      if (!rows.length) {
        // Seed a demo deck with 20 words so the UI is not empty
        try {
          const demo = [
            { term: 'local', translation: '지역의', pos: 'adj', level: 1 },
            { term: 'update', translation: '업데이트하다', pos: 'verb', level: 1 },
            { term: 'issue', translation: '문제', pos: 'noun', level: 1 },
            { term: 'cause', translation: '원인', pos: 'noun', level: 1 },
            { term: 'supply', translation: '공급', pos: 'noun', level: 2 },
            { term: 'demand', translation: '수요', pos: 'noun', level: 2 },
            { term: 'policy', translation: '정책', pos: 'noun', level: 2 },
            { term: 'climate', translation: '기후', pos: 'noun', level: 2 },
            { term: 'shortage', translation: '부족', pos: 'noun', level: 3 },
            { term: 'expand', translation: '확장하다', pos: 'verb', level: 3 },
            { term: 'negotiate', translation: '협상하다', pos: 'verb', level: 3 },
            { term: 'impact', translation: '영향', pos: 'noun', level: 3 },
            { term: 'infrastructure', translation: '사회 기반 시설', pos: 'noun', level: 4 },
            { term: 'regulation', translation: '규제', pos: 'noun', level: 4 },
            { term: 'forecast', translation: '전망, 예보', pos: 'noun', level: 4 },
            { term: 'initiative', translation: '주도권/계획', pos: 'noun', level: 4 },
            { term: 'sustainable', translation: '지속 가능한', pos: 'adj', level: 5 },
            { term: 'emissions', translation: '배출', pos: 'noun', level: 5 },
            { term: 'innovation', translation: '혁신', pos: 'noun', level: 5 },
            { term: 'resilience', translation: '회복 탄력성', pos: 'noun', level: 5 },
          ];
          const { data: deck } = await (supabase as any)
            .from('vocab_decks')
            .insert({ user_id: user.id, name: 'Demo: General News (20 words)' })
            .select('id')
            .single();
          const deckId = deck?.id || null;
          const payload = demo.map((d) => ({
            user_id: user.id,
            deck_id: deckId,
            language: 'en',
            term: d.term,
            translation: d.translation,
            pos: d.pos,
            level: (d as any).level,
            is_public: true,
          }));
          await (supabase as any).from('vocab_cards').insert(payload);
          const { data: seeded } = await (supabase as any)
            .from('vocab_cards')
            .select('id, term, translation, pos, ipa, context_sentence, user_id')
            .eq('is_public', true)
            .order('created_at', { ascending: false })
            .limit(5000);
          setCards((seeded as any) || []);
        } catch {
          setCards([]);
        }
      } else {
        setCards(rows);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const handleLanguageChange = async (newLanguage: string) => {
    setPreferredLanguage(newLanguage);

    // Save to user profile
    if (user) {
      try {
        await supabase
          .from('profiles')
          .update({ native_language: newLanguage })
          .eq('id', user.id);
      } catch (error) {
        console.error('Error saving language preference:', error);
      }
    }
  };

  const filtered = useMemo(() => {
    const q = filter.toLowerCase();
    return !q ? cards : cards.filter((c) => c.term.toLowerCase().includes(q) || (c.translation||'').toLowerCase().includes(q));
  }, [cards, filter]);

  const removeCard = async (row: CardRow) => {
    if (!user || !row.user_id || row.user_id !== user.id) return;
    // Only allow removal of user's own cards, not public system cards
    await (supabase as any).from("vocab_cards").delete().eq("id", row.id).eq("user_id", user.id);
    setCards((prev) => prev.filter((x) => x.id !== row.id));
  };

  const progress = 0; // future: compute from user_vocabulary count

  return (
    <StudentLayout title="Vocabulary Book" showBackButton>
      <div className="space-y-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Input placeholder="Search word or translation" value={filter} onChange={(e) => setFilter(e.target.value)} />
            <div className="ml-auto flex items-center gap-2">
              <Select value={preferredLanguage} onValueChange={handleLanguageChange}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ko">한국어</SelectItem>
                  <SelectItem value="ja">日本語</SelectItem>
                  <SelectItem value="zh">中文</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
              <Badge variant="secondary">{filtered.length} words</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 text-sm text-muted-foreground">Loading words…</div>
            ) : (
              <div className="divide-y">
                {filtered.map((c) => {
                  // Get the translation for the preferred language
                  const preferredTranslation = translations[c.id]?.[preferredLanguage] || c.translation || '';
                  return (
                    <div key={c.id} className="p-4 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-foreground">{c.term} {c.pos ? <span className="text-xs text-muted-foreground">({c.pos})</span> : null}</div>
                        <div className="text-sm text-blue-600 font-medium">{preferredTranslation}</div>
                        {c.context_sentence && <div className="text-xs text-muted-foreground italic">"{c.context_sentence}"</div>}
                        {/* Show other available translations */}
                        {Object.keys(translations[c.id] || {}).length > 1 && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {Object.entries(translations[c.id] || {})
                              .filter(([lang]) => lang !== preferredLanguage)
                              .slice(0, 2)
                              .map(([lang, trans]) => (
                                <span key={lang} className="mr-2">{lang.toUpperCase()}: {String(trans)}</span>
                              ))}
                          </div>
                        )}
                      </div>
                      {c.user_id === user.id && (
                        <Button size="sm" variant="outline" onClick={() => removeCard(c)}>Remove</Button>
                      )}
                    </div>
                  );
                })}
                {filtered.length === 0 && <div className="p-6 text-sm text-muted-foreground">No words match your search.</div>}
              </div>
            )}
          </CardContent>
        </Card>

        <div>
          <div className="text-xs text-muted-foreground mb-1">Memorization Progress (coming soon)</div>
          <Progress value={progress} />
        </div>
      </div>
    </StudentLayout>
  );
}


