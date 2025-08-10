import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";

interface Question {
  id: string;
  content: string;
  question_format: "DefinitionMatch" | "SentenceFillIn" | string;
  correct_answer: string;
  incorrect_answers: string[];
  explanation?: string;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface Props {
  skillTestId?: string;
  questions?: Question[];
  selectedQuestionId?: string;
  limit?: number;
}

const VocabularyQuizPreview = (props: Props) => {
  const { skillTestId, selectedQuestionId, limit = 6 } = props;
  const providedQuestions = props.questions;
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

useEffect(() => {
    // Use provided questions if available; otherwise, fetch by skillTestId
    const init = async () => {
      if (providedQuestions && providedQuestions.length) {
        setQuizQuestions(providedQuestions);
        setIdx(0);
        setSelected(null);
        setScore(0);
        setFinished(false);
        return;
      }
      if (!skillTestId) return;
      const { data, error } = await (supabase as any)
        .from("skill_practice_questions")
        .select("id,content,question_format,correct_answer,incorrect_answers,explanation")
        .eq("skill_test_id", skillTestId);
      if (!error) {
        const all = (data ?? []) as Question[];
        const picked = shuffle(all).slice(0, limit);
        setQuizQuestions(picked);
        setIdx(0);
        setSelected(null);
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

  const next = () => {
    if (idx + 1 >= quizQuestions.length) {
      setFinished(true);
    } else {
      setIdx((i) => i + 1);
      setSelected(null);
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
            <Button onClick={() => { setIdx(0); setScore(0); setSelected(null); setFinished(false); }}>Restart preview</Button>
          </CardContent>
        </Card>
      ) : current ? (
        <Card className="border-light-border">
          <CardContent className="p-6 space-y-4">
            <div className="text-xs text-muted-foreground">Question {idx + 1} of {quizQuestions.length}</div>
            {current.question_format === "DefinitionMatch" ? (
              <div>
                <div className="text-xl font-semibold mb-4">{current.content}</div>
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
            ) : (
              <div>
                <div className="text-lg mb-4 whitespace-pre-wrap">{current.content}</div>
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
                {current.explanation && (
                  <div className="rounded-md border p-3">
                    <div className="text-sm font-medium">Explanation</div>
                    <p className="text-sm text-muted-foreground">{current.explanation}</p>
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

export default VocabularyQuizPreview;
