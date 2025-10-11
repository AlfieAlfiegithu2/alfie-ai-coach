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
    // Single query: join decks with cards filtered by level and aggregate counts
    const { data, error } = await (supabase as any)
      .from('vocab_cards')
      .select('deck_id, vocab_decks!inner(id,name)', { count: 'exact', head: false })
      .eq('level', level)
      .limit(1000);
    if (error) { setDecks([]); setLoading(false); return; }
    const byDeck: Record<string, DeckRow> = {};
    (data as any[]).forEach((row: any) => {
      const d = row.vocab_decks;
      if (!d?.id) return;
      if (!byDeck[d.id]) byDeck[d.id] = { id: d.id, name: d.name, count: 0 };
      byDeck[d.id].count += 1;
    });
    const list = Object.values(byDeck).filter(d => d.count > 0);
    setDecks(list);
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


