import { useEffect, useMemo, useState } from "react";
import StudentLayout from "@/components/StudentLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface CardRow { id: string; term: string; translation: string; pos?: string | null; ipa?: string | null; context_sentence?: string | null }

export default function VocabularyBook() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<CardRow[]>([]);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      if (!user) { setCards([]); setLoading(false); return; }
      const { data } = await (supabase as any)
        .from("vocab_cards")
        .select("id, term, translation, pos, ipa, context_sentence")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5000);
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
          }));
          await (supabase as any).from('vocab_cards').insert(payload);
          const { data: seeded } = await (supabase as any)
            .from('vocab_cards')
            .select('id, term, translation, pos, ipa, context_sentence')
            .eq('user_id', user.id)
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

  const filtered = useMemo(() => {
    const q = filter.toLowerCase();
    return !q ? cards : cards.filter((c) => c.term.toLowerCase().includes(q) || (c.translation||'').toLowerCase().includes(q));
  }, [cards, filter]);

  const removeCard = async (row: CardRow) => {
    if (!user) return;
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
                {filtered.map((c) => (
                  <div key={c.id} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-foreground">{c.term} {c.pos ? <span className="text-xs text-muted-foreground">({c.pos})</span> : null}</div>
                      <div className="text-xs text-muted-foreground">{c.translation}</div>
                      {c.context_sentence && <div className="text-xs text-muted-foreground italic">“{c.context_sentence}”</div>}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => removeCard(c)}>Remove</Button>
                  </div>
                ))}
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


