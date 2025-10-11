import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import StudentLayout from "@/components/StudentLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { saveReview, loadDue, Rating } from "@/hooks/useSRS";
import { supabase } from "@/integrations/supabase/client";

interface ReviewCard { id: string; term: string; translation: string; pos?: string|null; examples_json?: string[]; }

export default function VocabReview() {
  const { deckId } = useParams();
  const [queue, setQueue] = useState<ReviewCard[]>([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const load = async () => {
      if (!deckId) { setQueue([]); return; }
      const { data } = await (supabase as any)
        .from('vocab_cards')
        .select('id, term, translation, pos, examples_json, suspended')
        .eq('deck_id', deckId)
        .order('created_at', { ascending: true })
        .limit(50);
      const due = (data as any[] || []).filter(c => !c.suspended);
      setQueue(due);
      setIdx(0);
    };
    load();
  }, [deckId]);

  const current = queue[idx];
  const reveal = useMemo(() => (!!current), [current]);

  const rate = async (rating: Rating) => {
    if (!current) return;
    await saveReview(current.id, rating);
    setIdx((i) => Math.min(queue.length - 1, i + 1));
  };

  return (
    <StudentLayout title="Review" showBackButton>
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6 text-center">
            {current ? (
              <div className="space-y-3">
                <div className="text-2xl font-semibold">{current.term} {current.pos ? <span className="text-sm text-muted-foreground">({current.pos})</span> : null}</div>
                <div className="text-sm text-muted-foreground">{current.translation}</div>
                {Array.isArray(current.examples_json) && current.examples_json[0] && (
                  <div className="text-sm italic text-muted-foreground">“{current.examples_json[0]}”</div>
                )}
                <div className="pt-4 flex justify-center gap-2">
                  <Button variant="destructive" onClick={() => rate(1)}>Again</Button>
                  <Button variant="secondary" onClick={() => rate(2)}>Hard</Button>
                  <Button variant="default" onClick={() => rate(3)}>Good</Button>
                  <Button variant="outline" onClick={() => rate(4)}>Easy</Button>
                </div>
                <div className="text-xs text-muted-foreground pt-2">{idx + 1} / {queue.length}</div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No due cards.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  );
}


