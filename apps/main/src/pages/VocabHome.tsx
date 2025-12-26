import { useEffect, useMemo, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import LoadingOverlay from '@/components/transitions/LoadingOverlay';
import StudentLayout from "@/components/StudentLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

interface DeckRow { id: string; name: string; level: number | null; count: number }

export default function VocabHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isPending, startTransition] = useTransition();
  const [active, setActive] = useState<string>("all");
  const [decks, setDecks] = useState<DeckRow[]>([]);
  const levels = [1, 2, 3, 4];

  useEffect(() => {
    const load = async () => {
      if (!user) { setDecks([]); return; }
      const { data } = await (supabase as any)
        .from('vocab_decks')
        .select('id, name, level')
        .order('created_at', { ascending: false })
        .limit(200);
      const rows = (data as any) || [];
      const withCounts = await Promise.all(rows.map(async (d: any) => {
        const { count } = await (supabase as any)
          .from('vocab_cards')
          .select('id', { count: 'exact', head: true })
          .eq('deck_id', d.id);
        return { id: d.id, name: d.name, level: d.level ?? null, count: count || 0 };
      }));
      setDecks(withCounts);
    };
    load();
  }, [user]);

  const filtered = useMemo(() => {
    if (active === 'all') return decks;
    return decks.filter(d => (d.level ?? 0) === Number(active));
  }, [decks, active]);

  return (
    <StudentLayout title="Vocabulary Book" showBackButton>
      <div className="space-y-4">
        <Card>
          <CardContent className="p-3">
            <Tabs value={active} onValueChange={setActive}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                {levels.map(l => (
                  <TabsTrigger key={l} value={String(l)}>L{l}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(d => (
            <Card key={d.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium">{d.name}</div>
                  <div className="text-xs text-muted-foreground">{d.level ? `Level ${d.level}` : 'No level'}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{d.count}/20</Badge>
                  <Button
                    size="sm"
                    onClick={() => {
                      startTransition(() => {
                        navigate(`/vocabulary/deck/${d.id}`);
                      });
                    }}
                  >
                    Open
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <div className="text-sm text-muted-foreground p-4">No decks yet. They will appear here after generation.</div>
          )}
        </div>
      </div>
      <AnimatePresence>
        {isPending && <LoadingOverlay />}
      </AnimatePresence>
    </StudentLayout >
  );
}


