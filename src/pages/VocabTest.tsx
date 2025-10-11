import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import StudentLayout from "@/components/StudentLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

type Row = {
  id: string;
  term: string;
  translation: string | null;
  pos: string | null;
  ipa: string | null;
  context_sentence: string | null;
  examples_json: string[] | null;
  synonyms_json: string[] | null;
};

export default function VocabTest() {
  const { deckId } = useParams();
  const [name, setName] = useState<string>("Deck Test");
  const [rows, setRows] = useState<Row[]>([]);
  const [index, setIndex] = useState(0);
  const total = rows.length;
  const current = rows[index] || null;

  useEffect(() => {
    const load = async () => {
      if (!deckId) return;
      // Ensure auth is resolved before RLS-sensitive queries
      await (supabase as any).auth.getSession();
      const safeDeckId = decodeURIComponent(String(deckId)).trim();
      const [cardsRes, deckNameViaJoin] = await Promise.all([
        (supabase as any)
          .from('vocab_cards')
          .select('id, term, translation, pos, ipa, context_sentence, examples_json, synonyms_json')
          .eq('deck_id', safeDeckId)
          .order('created_at', { ascending: true })
          .limit(1000),
        (supabase as any)
          .from('vocab_cards')
          .select('vocab_decks!inner(name)')
          .eq('deck_id', safeDeckId)
          .limit(1)
      ]);
      const deckJoinRows = ((deckNameViaJoin as any)?.data as any[]) || [];
      const joinedName = deckJoinRows[0]?.vocab_decks?.name;
      setName(joinedName || 'Deck Test');
      let rows: any[] = ((cardsRes as any)?.data as any[]) || [];
      // Fallback 1: explicitly restrict to public if first query returned none
      if (rows.length === 0) {
        const { data: pubRows } = await (supabase as any)
          .from('vocab_cards')
          .select('id, term, translation, pos, ipa, context_sentence, examples_json, synonyms_json')
          .eq('deck_id', safeDeckId)
          .eq('is_public', true)
          .order('created_at', { ascending: true })
          .limit(1000);
        rows = (pubRows as any) || [];
      }
      // Fallback 2: inner join decks and filter by deck id via join
      if (rows.length === 0) {
        const { data: viaJoin } = await (supabase as any)
          .from('vocab_cards')
          .select('id, term, translation, pos, ipa, context_sentence, examples_json, synonyms_json, vocab_decks!inner(id)')
          .eq('vocab_decks.id', safeDeckId)
          .order('created_at', { ascending: true })
          .limit(1000);
        rows = ((viaJoin as any) || []).map((r: any) => ({
          id: r.id,
          term: r.term,
          translation: r.translation,
          pos: r.pos,
          ipa: r.ipa,
          context_sentence: r.context_sentence,
          examples_json: r.examples_json,
          synonyms_json: r.synonyms_json
        }));
      }
      setRows(rows);
      setIndex(0);
    };
    load();
  }, [deckId]);

  const sentence = useMemo(() => {
    if (!current) return '';
    if (Array.isArray(current.examples_json) && current.examples_json[0]) return current.examples_json[0];
    return current.context_sentence || '';
  }, [current]);

  const next = () => setIndex((i) => Math.min(i + 1, Math.max(0, total - 1)));
  const prev = () => setIndex((i) => Math.max(i - 1, 0));

  return (
    <StudentLayout title={name} showBackButton>
      <div className="space-y-4">
        <div className="text-xs text-muted-foreground">{total ? `${index + 1} / ${total}` : '0 / 0'}</div>
        {current ? (
          <Card className="border-light-border">
            <CardContent className="p-0">
              {/* Image section (placeholder gradient) */}
              <div className="h-40 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                <div className="text-5xl font-semibold text-slate-500 select-none">
                  {current.term?.slice(0,1)?.toUpperCase() || 'A'}
                </div>
              </div>
              <div className="p-5 space-y-3">
                <div className="text-2xl font-semibold">
                  {current.term} {current.pos ? <span className="text-xs text-muted-foreground">({current.pos})</span> : null}
                </div>
                {current.ipa && <div className="text-xs text-muted-foreground">/{current.ipa}/</div>}
                {current.translation && (
                  <div className="text-sm"><span className="font-medium">Translation:</span> {current.translation}</div>
                )}
                {Array.isArray(current.synonyms_json) && current.synonyms_json.length > 0 && (
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-xs text-muted-foreground">Synonyms:</span>
                    {current.synonyms_json.slice(0,6).map((s, i) => (
                      <Badge key={i} variant="secondary">{s}</Badge>
                    ))}
                  </div>
                )}
                {sentence && (
                  <div className="text-sm text-muted-foreground italic">“{sentence}”</div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <Button variant="outline" onClick={prev} disabled={index === 0}>Previous</Button>
                  <div className="flex items-center gap-2">
                    <Button asChild variant="secondary"><Link to={`/vocabulary/deck/${deckId}`}>Back to Deck</Link></Button>
                    <Button onClick={next} disabled={index + 1 >= total}>Next</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              Loading… {total === 0 ? 'No cards found for this deck.' : ''}
            </CardContent>
          </Card>
        )}
      </div>
    </StudentLayout>
  );
}


