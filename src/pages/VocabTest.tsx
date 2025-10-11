import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import StudentLayout from "@/components/StudentLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import "./VocabTest.css";

type Row = {
  id: string;
  term: string;
  translation: string | null;
  pos: string | null;
  ipa: string | null;
  context_sentence: string | null;
  examples_json: string[] | null;
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
      if (!deckId) {
        console.log('VocabTest: No deckId provided');
        return;
      }
      console.log('VocabTest: Loading deckId:', deckId);
      // Ensure auth is resolved before RLS-sensitive queries
      await (supabase as any).auth.getSession();
      const safeDeckId = decodeURIComponent(String(deckId)).trim();
      console.log('VocabTest: Safe deckId:', safeDeckId);
      // Get user ID first
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes?.user?.id;
      
      // First try to get cards with explicit OR condition for user-owned OR public cards
      const [cardsRes, deckNameViaJoin] = await Promise.all([
        (supabase as any)
          .from('vocab_cards')
          .select('id, term, translation, pos, ipa, context_sentence, examples_json')
          .eq('deck_id', safeDeckId)
          .or(`user_id.eq.${userId || 'null'},is_public.eq.true`)
          .order('created_at', { ascending: true })
          .limit(1000),
        (supabase as any)
          .from('vocab_cards')
          .select('vocab_decks!inner(name)')
          .eq('deck_id', safeDeckId)
          .limit(1)
      ]);
      console.log('VocabTest: Cards query result:', cardsRes);
      console.log('VocabTest: Deck name query result:', deckNameViaJoin);
      const deckJoinRows = ((deckNameViaJoin as any)?.data as any[]) || [];
      const joinedName = deckJoinRows[0]?.vocab_decks?.name;
      setName(joinedName || 'Deck Test');
      let rows: any[] = ((cardsRes as any)?.data as any[]) || [];
      console.log('VocabTest: Initial rows count:', rows.length);
      // Fallback 1: explicitly restrict to public if first query returned none
      if (rows.length === 0) {
        const { data: pubRows } = await (supabase as any)
          .from('vocab_cards')
          .select('id, term, translation, pos, ipa, context_sentence, examples_json')
          .eq('deck_id', safeDeckId)
          .eq('is_public', true)
          .order('created_at', { ascending: true })
          .limit(1000);
        rows = (pubRows as any) || [];
        console.log('VocabTest: Public fallback rows count:', rows.length);
      }
      // Fallback 2: inner join decks and filter by deck id via join
      if (rows.length === 0) {
        const { data: viaJoin } = await (supabase as any)
          .from('vocab_cards')
          .select('id, term, translation, pos, ipa, context_sentence, examples_json, vocab_decks!inner(id)')
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
          examples_json: r.examples_json
        }));
        console.log('VocabTest: Join fallback rows count:', rows.length);
      }
      console.log('VocabTest: Final rows count:', rows.length);
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
          <div className="flex justify-center">
            <div 
              className="vocab-card-wrapper"
              style={{
                '--behind-gradient': 'radial-gradient(farthest-side circle at 50% 50%, hsla(220,15%,70%,0.1) 4%, hsla(220,10%,60%,0.05) 10%, hsla(220,5%,50%,0.02) 50%, hsla(220,0%,40%,0) 100%), radial-gradient(35% 52% at 55% 20%, hsla(210,20%,60%,0.1) 0%, hsla(210,15%,50%,0) 100%), radial-gradient(100% 100% at 50% 50%, hsla(200,25%,55%,0.05) 1%, hsla(200,20%,45%,0) 76%), conic-gradient(from 124deg at 50% 50%, hsla(215,20%,65%,0.1) 0%, hsla(215,15%,55%,0.08) 40%, hsla(215,15%,55%,0.08) 60%, hsla(215,20%,65%,0.1) 100%)',
                '--inner-gradient': 'linear-gradient(145deg, hsla(220,10%,15%,0.6) 0%, hsla(210,15%,20%,0.4) 100%)'
              }}
            >
              <section className="vocab-card">
                <div className="vocab-inside">
                  {/* Shine and glare effects */}
                  <div className="vocab-shine" />
                  <div className="vocab-glare" />
                  
                  {/* Image section - placeholder for word-related image */}
                  <div className="vocab-image-content">
                    <div className="word-image-placeholder">
                      <div className="text-6xl font-bold text-white/80 select-none">
                        {current.term?.slice(0,1)?.toUpperCase() || 'A'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Main content */}
                  <div className="vocab-content">
                    <div className="vocab-details">
                      <h3 className="vocab-term">{current.term}</h3>
                      <p className="vocab-pos">{current.pos || 'word'}</p>
                      {current.ipa && (
                        <p className="vocab-ipa">/{current.ipa}/</p>
                      )}
                    </div>
                    
                    {/* Example sentence */}
                    {sentence && (
                      <div className="vocab-example">
                        <div className="example-label">Example</div>
                        <div className="example-text">"{sentence}"</div>
                      </div>
                    )}
                  </div>
                </div>
              </section>
              
              {/* Navigation buttons outside the card */}
              <div className="vocab-navigation">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={prev} 
                  disabled={index === 0}
                  className="nav-btn"
                >
                  Previous
                </Button>
                <div className="nav-center">
                  <Button 
                    asChild 
                    variant="secondary" 
                    size="sm"
                    className="nav-btn"
                  >
                    <Link to={`/vocabulary/deck/${deckId}`}>Back</Link>
                  </Button>
                  <Button 
                    onClick={next} 
                    disabled={index + 1 >= total}
                    size="sm"
                    className="nav-btn nav-btn-primary"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          </div>
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


