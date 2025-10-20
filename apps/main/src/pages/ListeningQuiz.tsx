import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import StudentLayout from "@/components/StudentLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import CelebrationLottieAnimation from "@/components/animations/CelebrationLottieAnimation";
import PenguinClapAnimation from "@/components/animations/PenguinClapAnimation";

interface Question {
  id: string;
  content: string; // instruction or question
  question_format: "Listening_Dictation" | "Listening_MultipleChoice" | string;
  correct_answer: string;
  incorrect_answers: string[];
  explanation?: string;
  original_sentence?: string | null;
  audio_url?: string; // bucket path
}

function shuffle<T>(arr: T[]): T[] { const a = [...arr]; for (let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]];} return a; }
function sanitizeExplanation(text: string): string { if (!text) return ""; let t=text.trim(); t=t.replace(/^[\-•]\s*/, ""); t=t.replace(/\*\*(.*?)\*\*/g, "$1"); t=t.replace(/\*(.*?)\*/g, "$1"); t=t.replace(/_(.*?)_/g, "$1"); t=t.replace(/`(.*?)`/g, "$1"); return t; }
function cleanAnswer(s: string): string { return (s||"").toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim(); }

const ListeningQuiz = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [typed, setTyped] = useState<string>("");
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [showCelebrate, setShowCelebrate] = useState(false);
  const [attempts, setAttempts] = useState<Array<{ id: string; question: string; chosen: string; correct: string; isCorrect: boolean }>>([]);

  useEffect(() => {
    const load = async () => {
      if (!testId) return;
      const { data, error } = await (supabase as any)
        .from("skill_practice_questions")
        .select("id,content,question_format,correct_answer,incorrect_answers,explanation,original_sentence,audio_url")
        .eq("skill_test_id", testId);
      if (!error) {
        setQuestions(shuffle((data ?? []) as Question[]));
      }
    };
    load();
  }, [testId]);

  const current = questions[idx];
  const mcOptions = useMemo(() => (current && current.question_format === "Listening_MultipleChoice" ? shuffle([current.correct_answer, ...(current.incorrect_answers || [])]) : []), [current]);
  const progress = questions.length ? (idx / questions.length) * 100 : 0;

  const getAudioUrl = (q?: Question) => {
    if (!q?.audio_url) return "";
    // Use R2 URL instead of Supabase storage
    return q.audio_url.startsWith('http') ? q.audio_url : `https://your-bucket.your-domain.com/${q.audio_url}`;
  };

  const playCorrect = () => {
    try { const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext; const ctx = new Ctx(); const o = ctx.createOscillator(); const g = ctx.createGain(); o.type='sine'; o.frequency.value=880; o.connect(g); g.connect(ctx.destination); g.gain.setValueAtTime(0.0001, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime+0.01); o.start(); setTimeout(()=>{ o.frequency.setValueAtTime(660, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime+0.15); setTimeout(()=>{ o.stop(); ctx.close(); }, 180); }, 120);} catch {}
  };

  const checkDictation = () => {
    if (!current) return;
    const accept = [current.correct_answer, ...(current.incorrect_answers || [])].map(cleanAnswer);
    const user = cleanAnswer(typed);
    const isCorrect = accept.includes(user);
    setChecked(true);
    if (isCorrect) { setScore((s)=>s+1); playCorrect(); setShowCelebrate(true); setTimeout(()=>setShowCelebrate(false), 1200); }
    setAttempts((prev)=>[...prev,{ id: current.id, question: current.content, chosen: typed, correct: current.correct_answer, isCorrect }]);
  };

  const chooseMC = (opt: string) => {
    if (selected || checked) return; if (!current) return;
    setSelected(opt);
    const isCorrect = opt === current.correct_answer;
    if (isCorrect) { setScore((s)=>s+1); playCorrect(); setShowCelebrate(true); setTimeout(()=>setShowCelebrate(false), 1200); }
    setChecked(true);
    setAttempts((prev)=>[...prev,{ id: current.id, question: current.content, chosen: opt, correct: current.correct_answer, isCorrect }]);
  };

  const next = () => {
    if (idx + 1 >= questions.length) { setFinished(true); }
    else { setIdx((i)=>i+1); setSelected(null); setTyped(""); setChecked(false); }
  };

  if (!testId) {
    return (<div className="min-h-screen flex items-center justify-center"><Button onClick={()=>navigate("/ielts-portal")}>Back</Button></div>);
  }

  return (
    <StudentLayout title="Listening for Details" showBackButton backPath="/ielts-portal">
      <section className="mx-auto px-4">
        <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
          <div className="w-full max-w-3xl md:max-w-4xl lg:max-w-5xl">
            <div className="relative">
              <div className="absolute -top-10 h-10 flex items-center justify-center -translate-x-1/2 transition-[left] duration-300 ease-out" style={{ left: `${progress}%` }} aria-label="Progress mascot" title="Keep going!">
                <img src="/lovable-uploads/27e74cd0-58d8-4b55-b31a-fdb162f21e8b.png" alt="Listening progress turtle mascot" className="w-12 h-12 object-contain drop-shadow animate-[turtle-legs_900ms_ease-in-out_infinite]" loading="lazy" />
              </div>
              <style>{`@keyframes turtle-legs { 0% { transform: translateY(0) rotate(0deg) } 25% { transform: translateY(-1px) rotate(-2deg) } 50% { transform: translateY(0) rotate(0deg) } 75% { transform: translateY(-1px) rotate(2deg) } 100% { transform: translateY(0) rotate(0deg) } }`}</style>
              <Progress value={progress} />
            </div>
          </div>

          {finished ? (
            <Card className="w-full max-w-3xl md:max-w-4xl lg:max-w-5xl">
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-3">
                    <div className="text-2xl font-semibold">Great job!</div>
                    <PenguinClapAnimation size="sm" speed={1.1} />
                  </div>
                  <div className="text-center text-muted-foreground">Your score: {score} / {questions.length}</div>
                </div>
                <div>
                  <div className="text-sm font-medium mb-2">Review</div>
                  <div className="max-h-[50vh] overflow-auto space-y-3">
                    {attempts.map((a, i) => (
                      <div key={a.id + String(i)} className="rounded-md border p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="text-sm font-medium">{a.question}</div>
                          <span className={`text-xs px-2 py-1 rounded-full ${a.isCorrect ? 'bg-soft-green' : 'bg-destructive/10 text-destructive'}`}>{a.isCorrect ? 'Correct' : 'Incorrect'}</span>
                        </div>
                        {!a.isCorrect && (
                          <div className="mt-2 text-sm space-y-1">
                            <div className="text-muted-foreground">Your answer: {a.chosen}</div>
                            <div className="text-muted-foreground">Correct answer: {a.correct}</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 justify-center">
                  <Button onClick={()=>{ setIdx(0); setScore(0); setSelected(null); setFinished(false); setAttempts([]); setTyped(""); setChecked(false); }}>Retry</Button>
                  <Button variant="secondary" onClick={()=>navigate("/ielts-portal")}>Back</Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {current ? (
                <Card className="w-full max-w-3xl md:max-w-4xl lg:max-w-5xl border-light-border">
                  <CardContent className="relative p-6 space-y-4">
                    {showCelebrate && (<div className="absolute inset-0 flex items-center justify-center pointer-events-none"><CelebrationLottieAnimation size="sm" speed={1.2} /></div>)}
                    <div className="text-sm text-muted-foreground">Question {idx + 1} of {questions.length}</div>
                    <audio controls className="w-full">
                      <source src={getAudioUrl(current)} />
                    </audio>
                    {current.question_format === "Listening_Dictation" ? (
                      <div className="space-y-3">
                        <div className="text-2xl font-semibold">{current.content}</div>
                        <Textarea value={typed} onChange={(e)=>setTyped(e.target.value)} placeholder="Type what you hear..." className="min-h-[120px] text-base" />
                        {!checked ? (
                          <Button onClick={checkDictation} disabled={typed.trim().length === 0}>Check Answer</Button>
                        ) : (
                          <div className="space-y-3">
                            <div className="rounded-md border p-3">
                              <div className="text-sm font-medium">{attempts[attempts.length-1]?.isCorrect ? 'Correct!' : 'Incorrect'}</div>
                              {!attempts[attempts.length-1]?.isCorrect && (
                                <div className="text-sm text-muted-foreground">Correct sentence: {current.correct_answer}</div>
                              )}
                            </div>
                            {current.explanation && (
                              <div className="rounded-md border p-3">
                                <div className="text-sm font-medium">Explanation</div>
                                <p className="text-sm text-muted-foreground">{sanitizeExplanation(current.explanation)}</p>
                              </div>
                            )}
                            <Button onClick={next}>Continue</Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="text-2xl font-semibold mb-4 whitespace-pre-wrap">{current.content}</div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {mcOptions.map((opt) => {
                            const isCorrect = checked && opt === current.correct_answer;
                            const isWrong = checked && selected === opt && opt !== current.correct_answer;
                            return (
                              <Button key={opt} variant={isCorrect ? "success" : isWrong ? "destructive" : "outline"} className="w-full justify-start text-left h-auto py-3 text-sm md:text-base whitespace-normal break-words" onClick={() => chooseMC(opt)}>
                                {opt}
                              </Button>
                            );
                          })}
                        </div>
                        {checked && (
                          <div className="pt-2 space-y-3">
                            {current.explanation && (
                              <div className="rounded-md border p-3">
                                <div className="text-sm font-medium">Explanation</div>
                                <p className="text-sm text-muted-foreground">{sanitizeExplanation(current.explanation)}</p>
                              </div>
                            )}
                            <Button onClick={next}>Continue</Button>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <p className="text-sm text-muted-foreground">Loading questions...</p>
              )}
            </>
          )}
        </div>
      </section>
    </StudentLayout>
  );
};

export default ListeningQuiz;
