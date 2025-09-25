import { useEffect, useMemo, useState } from "react";
import StudentLayout from "@/components/StudentLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface VocabRow { id: string; word: string; language_code: string; translation: string }

export default function VocabularyBook() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [words, setWords] = useState<VocabRow[]>([]);
  const [filter, setFilter] = useState("");
  const [lang, setLang] = useState("ko");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      // Pull up to 5,000 entries for selected language
      const { data } = await (supabase as any)
        .from("vocabulary_words")
        .select("id,word,language_code,translation")
        .eq("language_code", lang)
        .order("usage_count", { ascending: false })
        .limit(5000);
      setWords((data as any) || []);
      setLoading(false);
    };
    load();
  }, [lang]);

  const filtered = useMemo(() => {
    const q = filter.toLowerCase();
    return !q ? words : words.filter((w) => w.word.toLowerCase().includes(q) || w.translation.toLowerCase().includes(q));
  }, [words, filter]);

  const saveWord = async (row: VocabRow) => {
    if (!user) return;
    await (supabase as any).from("user_vocabulary").upsert({ user_id: user.id, vocabulary_word_id: row.id }, { onConflict: "user_id,vocabulary_word_id" });
  };

  const progress = 0; // future: compute from user_vocabulary count

  return (
    <StudentLayout title="Vocabulary Book" showBackButton>
      <div className="space-y-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Input placeholder="Search word or translation" value={filter} onChange={(e) => setFilter(e.target.value)} />
            <select className="border rounded-md px-2 py-2" value={lang} onChange={(e) => setLang(e.target.value)}>
              <option value="ko">Korean (ko)</option>
              <option value="ja">Japanese (ja)</option>
              <option value="vi">Vietnamese (vi)</option>
              <option value="zh">Chinese (zh)</option>
              <option value="es">Spanish (es)</option>
            </select>
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
                {filtered.map((w) => (
                  <div key={w.id} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-foreground">{w.word}</div>
                      <div className="text-xs text-muted-foreground">{w.translation}</div>
                    </div>
                    <Button size="sm" onClick={() => saveWord(w)}>Save</Button>
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


