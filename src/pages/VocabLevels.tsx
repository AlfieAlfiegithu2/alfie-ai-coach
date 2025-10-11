import { useEffect, useState } from "react";
import StudentLayout from "@/components/StudentLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

type DeckRow = { id: string; name: string; count: number };

export default function VocabLevels() {
  const levels = [1, 2, 3, 4, 5];
  const [active, setActive] = useState<string>("1");
  const [decks, setDecks] = useState<DeckRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async (level: number) => {
    setLoading(true);
    // Step 1: find deck ids that have cards at this level (prefer user's decks, fallback to public)
    const { data: mine } = await (supabase as any)
      .from('vocab_cards')
      .select('deck_id')
      .eq('level', level)
      .order('created_at', { ascending: true })
      .limit(500);
    let deckIds: string[] = Array.from(new Set(((mine as any) || []).map((r: any) => r.deck_id).filter(Boolean)));
    if (deckIds.length === 0) {
      const { data: pub } = await (supabase as any)
        .from('vocab_cards')
        .select('deck_id')
        .eq('level', level)
        .eq('is_public', true)
        .order('created_at', { ascending: true })
        .limit(500);
      deckIds = Array.from(new Set(((pub as any) || []).map((r: any) => r.deck_id).filter(Boolean)));
    }

    if (deckIds.length === 0) { setDecks([]); setLoading(false); return; }

    // Step 2: fetch names
    const { data: deckRows } = await (supabase as any)
      .from('vocab_decks')
      .select('id, name')
      .in('id', deckIds);

    // Step 3: counts per deck (words in that deck at the level)
    const counts: Record<string, number> = {};
    for (const id of deckIds) {
      const { count } = await (supabase as any)
        .from('vocab_cards')
        .select('id', { count: 'exact', head: true })
        .eq('deck_id', id)
        .eq('level', level);
      counts[id] = count || 0;
    }

    const out: DeckRow[] = (deckRows as any || []).map((d: any) => ({ id: d.id, name: d.name, count: counts[d.id] || 0 }));
    // Sort newest first, keep only those with at least 1 word
    setDecks(out.filter(d => d.count > 0));
    setLoading(false);
  };

  useEffect(() => { load(Number(active)); }, [active]);

  return (
    <StudentLayout title="Vocabulary • Levels" showBackButton backPath="/vocabulary">
      <div className="space-y-4">
        <Card>
          <CardContent className="p-3">
            <Tabs value={active} onValueChange={setActive}>
              <TabsList>
                {levels.map((l) => (
                  <TabsTrigger key={l} value={String(l)}>Level {l}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-sm text-muted-foreground p-4">Loading...</div>
        ) : decks.length === 0 ? (
          <div className="text-sm text-muted-foreground p-4">No decks at this level yet.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {decks.map((d) => (
              <Card key={d.id} className="border-light-border">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{d.name}</div>
                    <div className="text-xs text-muted-foreground">Level {active}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{d.count}/20</Badge>
                    <Button size="sm" asChild>
                      <Link to={`/vocabulary/test/${d.id}`}>Start Test</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </StudentLayout>
  );
}


