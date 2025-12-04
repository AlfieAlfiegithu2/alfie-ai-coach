import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import StudentLayout from "@/components/StudentLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";

interface CardRow { id: string; term: string; translation: string; pos?: string|null; examples_json?: string[]; is_known?: boolean }
interface ImageData { [cardId: string]: string }

export default function VocabDeck() {
  const { deckId } = useParams();
  const [name, setName] = useState<string>("Deck");
  const [cards, setCards] = useState<CardRow[]>([]);
  const [images, setImages] = useState<ImageData>({});
  const [shuffleEnabled, setShuffleEnabled] = useState(() => {
    const saved = localStorage.getItem('vocab-deck-shuffle-enabled');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    const load = async () => {
      if (!deckId) return;
      const { data: deck } = await (supabase as any).from('vocab_decks').select('name').eq('id', deckId).maybeSingle();
      setName(deck?.name || 'Deck');
      const { data } = await (supabase as any)
        .from('vocab_cards')
        .select('id, term, translation, pos, examples_json, is_known')
        .eq('deck_id', deckId)
        .order('created_at', { ascending: true })
        .limit(50);
      
      let cards = (data as any) || [];
      
      // Apply shuffle if enabled
      if (shuffleEnabled) {
        cards = cards.sort(() => Math.random() - 0.5);
      }
      
      setCards(cards);

      // Load images for these cards
      if (cards.length > 0) {
        const cardIds = cards.map((c: CardRow) => c.id);
        const { data: imgData } = await supabase
          .from('vocab_images')
          .select('card_id, url')
          .in('card_id', cardIds);
        
        const imgMap: ImageData = {};
        imgData?.forEach((img: any) => {
          imgMap[img.card_id] = img.url;
        });
        setImages(imgMap);
      }
    };
    load();
  }, [deckId, shuffleEnabled]);

  const toggleKnown = async (c: CardRow) => {
    const next = !c.is_known;
    await (supabase as any).from('vocab_cards').update({ is_known: next }).eq('id', c.id);
    setCards(prev => prev.map(x => x.id === c.id ? { ...x, is_known: next } : x));
  };

  const toggleShuffle = () => {
    const newValue = !shuffleEnabled;
    setShuffleEnabled(newValue);
    localStorage.setItem('vocab-deck-shuffle-enabled', JSON.stringify(newValue));
  };

  return (
    <StudentLayout title={name} showBackButton>
      <div className="space-y-4">
        <div className="flex justify-end mb-2">
          <Button
            variant={shuffleEnabled ? "default" : "outline"}
            size="sm"
            onClick={toggleShuffle}
          >
            🔀 {shuffleEnabled ? 'Shuffled' : 'Shuffle'}
          </Button>
        </div>
        <Card>
          <CardContent className="p-0 divide-y">
            {cards.map((c) => (
              <div key={c.id} className="p-4 flex items-center gap-4">
                {/* Image thumbnail */}
                {images[c.id] ? (
                  <div className="w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-white border border-gray-200">
                    <img 
                      src={images[c.id]} 
                      alt={c.term}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 flex-shrink-0 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center border border-gray-200">
                    <span className="text-lg font-medium text-gray-500">{c.term.charAt(0).toUpperCase()}</span>
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{c.term} {c.pos ? <span className="text-xs text-muted-foreground">({c.pos})</span> : null}</div>
                  <div className="text-xs text-muted-foreground">{c.translation}</div>
                  {Array.isArray(c.examples_json) && c.examples_json[0] && (
                    <div className="text-xs text-muted-foreground italic truncate">"{c.examples_json[0]}"</div>
                  )}
                </div>
                
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="flex items-center gap-2"><Checkbox checked={!!c.is_known} onCheckedChange={() => toggleKnown(c)} /> <span className="text-xs">Known</span></div>
                </div>
              </div>
            ))}
            {cards.length === 0 && <div className="p-6 text-sm text-muted-foreground">No cards in this deck yet.</div>}
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button asChild><Link to={`/vocabulary/test/${deckId}`}>Start Test</Link></Button>
          <Button variant="outline" asChild><Link to="/vocabulary">All Decks</Link></Button>
        </div>
      </div>
    </StudentLayout>
  );
}


