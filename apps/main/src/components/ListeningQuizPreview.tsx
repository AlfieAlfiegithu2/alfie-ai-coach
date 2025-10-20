import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

interface Question {
  id: string;
  content: string;
  question_format: "Listening_Dictation" | "Listening_MultipleChoice" | string;
  correct_answer: string;
  incorrect_answers: string[];
  explanation?: string;
  original_sentence?: string | null;
  audio_url?: string;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sanitizeExplanation(text: string): string {
  if (!text) return "";
  let t = text.trim();
  t = t.replace(/^[-•]\s*/, "");
  t = t.replace(/\*\*(.*?)\*\*/g, "$1");
  t = t.replace(/\*(.*?)\*/g, "$1");
  t = t.replace(/_(.*?)_/g, "$1");
  t = t.replace(/`(.*?)`/g, "$1");
  return t;
}

interface Props {
  skillTestId?: string;
  questions?: Question[];
  selectedQuestionId?: string;
  limit?: number;
}

const ListeningQuizPreview = (props: Props) => {
  const { skillTestId, selectedQuestionId, limit = 6 } = props;
  const providedQuestions = props.questions;
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [userInput, setUserInput] = useState("");
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    // Use provided questions if available; otherwise, fetch by skillTestId
    const init = async () => {
      if (providedQuestions && providedQuestions.length) {
        setQuizQuestions(providedQuestions);
        setIdx(0);
        setSelected(null);
        setUserInput("");
        setScore(0);
        setFinished(false);
        return;
      }
      if (!skillTestId) return;
      const { data, error } = await (supabase as any)
        .from("skill_practice_questions")
        .select("id,content,question_format,correct_answer,incorrect_answers,explanation,original_sentence,audio_url")
        .eq("skill_test_id", skillTestId);
      if (!error) {
        const all = (data ?? []) as Question[];
        const picked = shuffle(all).slice(0, limit);
        setQuizQuestions(picked);
        setIdx(0);
        setSelected(null);
        setUserInput("");
        setScore(0);
        setFinished(false);
      }
    };
    init();
  }, [providedQuestions, skillTestId, limit]);

  useEffect(() => {
    if (!selectedQuestionId || !quizQuestions.length) return;
    const newIndex = quizQuestions.findIndex((q) => q.id === selectedQuestionId);
    if (newIndex >= 0) {
      setIdx(newIndex);
      setSelected(null);
      setUserInput("");
      setFinished(false);
    }
  }, [selectedQuestionId, quizQuestions]);

  const current = quizQuestions[idx];
  const options = useMemo(
    () => (current ? shuffle([current.correct_answer, ...(current.incorrect_answers || [])]) : []),
    [current]
  );
  const progress = quizQuestions.length ? (idx / quizQuestions.length) * 100 : 0;

  const choose = (opt: string) => {
    if (selected) return;
    setSelected(opt);
    if (current && opt === current.correct_answer) setScore((s) => s + 1);
  };

  const submitDictation = () => {
    if (selected) return;
    setSelected(userInput);
    if (current && userInput.toLowerCase().trim() === current.correct_answer.toLowerCase().trim()) {
      setScore((s) => s + 1);
    }
  };

  const next = () => {
    if (idx + 1 >= quizQuestions.length) {
      setFinished(true);
    } else {
      setIdx((i) => i + 1);
      setSelected(null);
      setUserInput("");
    }
  };

  if (!skillTestId && !(providedQuestions && providedQuestions.length)) return null;

  return (
    <div className="space-y-4">
      <Progress value={progress} />
      {finished ? (
        <Card>
          <CardContent className="p-6 text-center space-y-3">
            <div className="text-lg font-semibold">Preview complete</div>
            <div className="text-muted-foreground">Score: {score} / {quizQuestions.length}</div>
            <Button onClick={() => { setIdx(0); setScore(0); setSelected(null); setUserInput(""); setFinished(false); }}>Restart preview</Button>
          </CardContent>
        </Card>
      ) : current ? (
        <Card className="border-light-border">
          <CardContent className="p-6 space-y-4">
            <div className="text-xs text-muted-foreground">Question {idx + 1} of {quizQuestions.length}</div>
            
            {/* Audio Player */}
            {current.audio_url && (
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="text-sm font-medium mb-2">Audio</div>
                <audio controls className="w-full">
                  <source src={current.audio_url.startsWith('http') ? current.audio_url : `https://your-bucket.your-domain.com/${current.audio_url}`} />
                  Your browser does not support the audio element.
                </audio>
              </div>
            )}

            {/* Transcript (for admin preview only) */}
            {current.original_sentence && (
              <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 text-sm">
                <div className="font-medium text-blue-900 dark:text-blue-100">Transcript (admin view)</div>
                <div className="text-blue-700 dark:text-blue-300">{current.original_sentence}</div>
              </div>
            )}

            {current.question_format === "Listening_Dictation" ? (
              <div>
                <div className="text-lg font-medium mb-4">{current.content}</div>
                <div className="space-y-3">
                  <Input
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="Type what you hear..."
                    disabled={!!selected}
                  />
                  {!selected && (
                    <Button onClick={submitDictation} disabled={!userInput.trim()}>
                      Submit
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <div className="text-lg font-medium mb-4">{current.content}</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {options.map((opt) => {
                    const isCorrect = selected && opt === current.correct_answer;
                    const isWrong = selected === opt && opt !== current.correct_answer;
                    return (
                      <Button
                        key={opt}
                        variant={isCorrect ? "success" : isWrong ? "destructive" : "outline"}
                        className="justify-start h-auto py-3"
                        onClick={() => choose(opt)}
                      >
                        {opt}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            {selected && (
              <div className="pt-2 space-y-3">
                <div className="rounded-md border p-3">
                  <div className="text-sm font-medium">Result</div>
                  <div className="text-sm">
                    {current.question_format === "Listening_Dictation" ? (
                      <>
                        <div>Your answer: <span className="font-mono">{selected}</span></div>
                        <div>Correct answer: <span className="font-mono">{current.correct_answer}</span></div>
                        <div className={`font-medium ${selected.toLowerCase().trim() === current.correct_answer.toLowerCase().trim() ? 'text-green-600' : 'text-red-600'}`}>
                          {selected.toLowerCase().trim() === current.correct_answer.toLowerCase().trim() ? '✓ Correct' : '✗ Incorrect'}
                        </div>
                      </>
                    ) : (
                      <>
                        <div>Correct answer: <span className="font-medium">{current.correct_answer}</span></div>
                        <div className={`font-medium ${selected === current.correct_answer ? 'text-green-600' : 'text-red-600'}`}>
                          {selected === current.correct_answer ? '✓ Correct' : '✗ Incorrect'}
                        </div>
                      </>
                    )}
                  </div>
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
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">No questions yet. Use the CSV import above.</p>
      )}
    </div>
  );
};

export default ListeningQuizPreview;