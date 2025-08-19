import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import StudentLayout from "@/components/StudentLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getSkillBySlug } from "@/lib/skills";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import PronunciationPracticeItem from "@/components/PronunciationPracticeItem";
import PenguinClapAnimation from "@/components/animations/PenguinClapAnimation";
import VocabularyMapView from "@/components/VocabularyMapView";
import GrammarMapView from "@/components/GrammarMapView";
import ParaphrasingMapView from "@/components/ParaphrasingMapView";
import SentenceScrambleMapView from "@/components/SentenceScrambleMapView";
import ListeningMapView from "@/components/ListeningMapView";
import SynonymMapView from "@/components/SynonymMapView";
import CollocationMapView from "@/components/CollocationMapView";
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
const [pronTestId, setPronTestId] = useState<string>("");
const [pronIndex, setPronIndex] = useState(0);
const [pronAnalyzed, setPronAnalyzed] = useState(false);
const [pronFinished, setPronFinished] = useState(false);
const [overallAvg, setOverallAvg] = useState<number | null>(null);
const [overallSummary, setOverallSummary] = useState<string>("");
  useEffect(() => {
    if (skill) {
      document.title = `${skill.label} | Practice`;
      if (slug === "vocabulary-builder" || slug === "grammar-fix-it" || slug === "paraphrasing-challenge" || slug === "sentence-structure-scramble" || slug === "listening-for-details") {
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
          if (slug === "vocabulary-builder" || slug === "grammar-fix-it" || slug === "paraphrasing-challenge" || slug === "sentence-structure-scramble") {
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
      setPronTestId("");
      setPronIndex(0);
      setPronFinished(false);
      setPronAnalyzed(false);
      return;
    }
    setPronTitle(test.title);
    setPronTestId(test.id);
    const { data: items, error: itemsErr } = await db
      .from("pronunciation_items")
      .select("id, reference_text, audio_url, order_index")
      .eq("test_id", test.id)
      .order("order_index", { ascending: true });
    if (!itemsErr) {
      setPronItems(((items ?? []) as PronItem[]));
      setPronIndex(0);
      setPronFinished(false);
      setPronAnalyzed(false);
    }
  };

  useEffect(() => {
    const loadOverall = async () => {
      if (!pronFinished || !pronTestId) return;
      const { data: userResp } = await supabase.auth.getUser();
      const uid = userResp?.user?.id;
      if (!uid) return;
      const { data, error } = await (supabase as any)
        .from('pronunciation_results')
        .select('overall_score, analysis_json, created_at')
        .eq('user_id', uid)
        .eq('test_id', pronTestId)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) return;
      const rows = (data ?? []) as any[];
      const scores = rows.map(r => r.overall_score).filter((n: any) => typeof n === 'number');
      if (scores.length) {
        setOverallAvg(Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length));
      } else {
        setOverallAvg(null);
      }
      const summary = rows[0]?.analysis_json?.overallSummary;
      setOverallSummary(typeof summary === 'string' ? summary : '');
    };
    loadOverall();
  }, [pronFinished, pronTestId]);

  if (slug === "pronunciation-repeat-after-me") {
    const total = Math.min(10, pronItems.length || 10);
    const progress = total ? (pronIndex / total) * 100 : 0;
    const current = pronItems.slice(0, 10)[pronIndex];

    return (
      <StudentLayout title={skill.label} showBackButton backPath="/ielts-portal">
        <section className="mx-auto px-4">
          <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
            <div className="w-full max-w-3xl md:max-w-4xl lg:max-w-5xl">
              <div className="relative">
                <div
                  className="absolute -top-10 h-10 flex items-center justify-center -translate-x-1/2 transition-[left] duration-300 ease-out"
                  style={{ left: `${progress}%` }}
                  aria-label="Progress mascot"
                  title="Keep going!"
                >
                  <img
                    src="/lovable-uploads/27e74cd0-58d8-4b55-b31a-fdb162f21e8b.png"
                    alt="Pronunciation progress turtle mascot"
                    className="w-12 h-12 object-contain drop-shadow animate-[turtle-legs_900ms_ease-in-out_infinite]"
                    loading="lazy"
                  />
                </div>
                <style>{`@keyframes turtle-legs { 0% { transform: translateY(0) rotate(0deg) } 25% { transform: translateY(-1px) rotate(-2deg) } 50% { transform: translateY(0) rotate(0deg) } 75% { transform: translateY(-1px) rotate(2deg) } 100% { transform: translateY(0) rotate(0deg) } }`}</style>
                <Progress value={progress} />
              </div>
            </div>

            {pronItems.length === 0 ? (
              <Card className="border-light-border">
                <CardContent className="p-4">
                  <p className="text-muted-foreground text-sm">No pronunciation set is available yet. Please check back soon.</p>
                </CardContent>
              </Card>
            ) : pronFinished ? (
              <Card className="w-full max-w-3xl md:max-w-4xl lg:max-w-5xl">
                <CardContent className="p-6 space-y-6">
                  <div className="flex justify-center">
                    <PenguinClapAnimation />
                  </div>
                  <div className="space-y-2 text-center">
                    <div className="text-2xl font-semibold">Great job!</div>
                    <div className="text-muted-foreground">You completed {pronTitle || "this set"}.</div>
                  </div>
                  <div className="text-center space-y-1 animate-fade-in">
                    <p className="text-xs font-medium">Overall Pronunciation Score</p>
                    <p className="text-4xl font-bold text-primary">{overallAvg ?? "-"} / 100</p>
                    {overallSummary && (
                      <p className="text-sm text-muted-foreground max-w-2xl mx-auto">{overallSummary}</p>
                    )}
                  </div>
                  <div className="flex gap-2 justify-center">
                    <Button onClick={() => { setPronIndex(0); setPronFinished(false); setPronAnalyzed(false); setOverallAvg(null); setOverallSummary(""); }}>Retry</Button>
                    <Button variant="secondary" onClick={() => navigate("/ielts-portal")}>Back</Button>
                  </div>
                </CardContent>
              </Card>
            ) : current ? (
              <Card className="w-full max-w-3xl md:max-w-4xl lg:max-w-5xl border-light-border">
                <CardContent className="p-6 space-y-4">
                  {pronTitle && (
                    <div className="text-sm text-muted-foreground">{pronTitle} — Question {pronIndex + 1} of {total}</div>
                  )}
                  <PronunciationPracticeItem
                    item={{ ...current, order_index: pronIndex + 1 }}
                    testId={pronTestId}
                    onAnalyzed={() => setPronAnalyzed(true)}
                  />
                  <div className="pt-2">
                    <Button
                      onClick={() => {
                        if (pronIndex + 1 >= total) {
                          setPronFinished(true);
                        } else {
                          setPronIndex((i) => i + 1);
                          setPronAnalyzed(false);
                        }
                      }}
                      disabled={!pronAnalyzed}
                    >
                      Continue
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <p className="text-sm text-muted-foreground">Loading...</p>
            )}
          </div>
        </section>
      </StudentLayout>
    );
  }
  if (slug === "vocabulary-builder") {
    return <VocabularyMapView />;
  }
  
  if (slug === "grammar-fix-it") {
    return <GrammarMapView />;
  }
  
  if (slug === "paraphrasing-challenge") {
    return <ParaphrasingMapView />;
  }
  
  if (slug === "sentence-structure-scramble") {
    return <SentenceScrambleMapView />;
  }
  
  if (slug === "listening-for-details") {
    return <ListeningMapView />;
  }
  
  if (slug === "synonym-match") {
    return <SynonymMapView />;
  }
  
  if (slug === "collocation-connect") {
    return <CollocationMapView />;
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
