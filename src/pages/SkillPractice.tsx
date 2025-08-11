import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import StudentLayout from "@/components/StudentLayout";
import { Card, CardContent } from "@/components/ui/card";
import { getSkillBySlug } from "@/lib/skills";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
const db = supabase as any;

interface Question {
  id: string;
  content: string;
}

interface SkillTest { id: string; title: string }

interface PronItem { id: string; reference_text: string; audio_url: string; order_index: number }
const SkillPractice = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
const skill = useMemo(() => (slug ? getSkillBySlug(slug) : undefined), [slug]);
const [questions, setQuestions] = useState<Question[]>([]);
const [tests, setTests] = useState<SkillTest[]>([]);
const [pronItems, setPronItems] = useState<PronItem[]>([]);
const [pronTitle, setPronTitle] = useState<string>("");
  useEffect(() => {
    if (skill) {
      document.title = `${skill.label} | Practice`;
      if (slug === "vocabulary-builder" || slug === "grammar-fix-it" || slug === "paraphrasing-challenge") {
        loadTests();
      } else if (slug === "pronunciation-repeat-after-me") {
        loadPronunciation();
      } else {
        loadQuestions();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skill?.label]);

  // Realtime updates so students see admin changes instantly
  useEffect(() => {
    if (!skill) return;
    const channel = supabase
      .channel('realtime-skill-questions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'skill_practice_questions' }, (payload) => {
        const st = (payload as any)?.new?.skill_type ?? (payload as any)?.old?.skill_type;
        if (st === skill.label) {
          if (slug === "vocabulary-builder" || slug === "grammar-fix-it") {
            loadTests();
          } else {
            loadQuestions();
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [skill?.label]);

  const loadQuestions = async () => {
    if (!skill) return;
    const { data, error } = await db
      .from("skill_practice_questions")
      .select("id, content")
      .eq("skill_type", skill.label)
      .order("created_at", { ascending: false });
    if (!error) setQuestions(((data ?? []) as Question[]));
  };

  const loadTests = async () => {
    if (!slug) return;
    const { data, error } = await db
      .from("skill_tests")
      .select("id,title")
      .eq("skill_slug", slug)
      .order("created_at", { ascending: false });
    if (!error) setTests(((data ?? []) as SkillTest[]));
  };

  const loadPronunciation = async () => {
    const { data: test, error: testErr } = await db
      .from("pronunciation_tests")
      .select("id,title")
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (testErr) return;
    if (!test?.id) {
      setPronItems([]);
      setPronTitle("");
      return;
    }
    setPronTitle(test.title);
    const { data: items, error: itemsErr } = await db
      .from("pronunciation_items")
      .select("id, reference_text, audio_url, order_index")
      .eq("test_id", test.id)
      .order("order_index", { ascending: true });
    if (!itemsErr) setPronItems(((items ?? []) as PronItem[]));
  };

  if (!skill) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Button onClick={() => navigate("/ielts-portal")}>Back</Button>
      </div>
    );
  }

  if (slug === "pronunciation-repeat-after-me") {
    return (
      <StudentLayout title={skill.label} showBackButton backPath="/ielts-portal">
        <section className="max-w-3xl mx-auto space-y-4">
          {pronItems.length === 0 ? (
            <Card className="border-light-border">
              <CardContent className="p-4">
                <p className="text-muted-foreground text-sm">No pronunciation set is available yet. Please check back soon.</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-light-border">
              <CardContent className="p-4 space-y-4">
                {pronTitle && (
                  <p className="font-medium">{pronTitle} — 10 items</p>
                )}
                {pronItems.slice(0, 10).map((item, idx) => (
                  <div key={item.id} className="space-y-2">
                    <p className="text-sm"><span className="font-medium">{idx + 1}.</span> {item.reference_text}</p>
                    <audio controls preload="none" className="w-full">
                      <source src={item.audio_url} />
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </section>
      </StudentLayout>
    );
  }

  if (slug === "vocabulary-builder" || slug === "grammar-fix-it" || slug === "paraphrasing-challenge") {
    return (
      <StudentLayout title={skill.label} showBackButton backPath="/ielts-portal">
          <section className="max-w-3xl mx-auto">
            {tests.length === 0 ? (
              <Card className="border-light-border">
                <CardContent className="p-4">
                  <p className="text-muted-foreground text-sm">No tests yet. Please check back soon.</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-light-border">
                <CardContent className="p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {tests.map((t) => {
                      const path = slug === "vocabulary-builder"
                        ? `/skills/vocabulary-builder/test/${t.id}`
                        : slug === "grammar-fix-it"
                          ? `/skills/grammar-fix-it/test/${t.id}`
                          : `/skills/paraphrasing-challenge/test/${t.id}`;
                      return (
                        <Card key={t.id} className="border-light-border h-full">
                          <CardContent className="p-4 flex flex-col items-start gap-3">
                            <p className="font-medium whitespace-normal break-words">{t.title}</p>
                            <Button size="sm" onClick={() => navigate(path)}>Start</Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </section>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout title={skill.label} showBackButton backPath="/ielts-portal">
      <section className="space-y-4 max-w-3xl mx-auto">
        {questions.length === 0 ? (
          <p className="text-muted-foreground text-sm">No questions yet. Please check back soon.</p>
        ) : (
          questions.map((q) => (
            <Card key={q.id} className="border-light-border">
              <CardContent className="p-4">
                <p className="whitespace-pre-wrap leading-relaxed">{q.content}</p>
              </CardContent>
            </Card>
          ))
        )}
      </section>
    </StudentLayout>
  );
};

export default SkillPractice;
