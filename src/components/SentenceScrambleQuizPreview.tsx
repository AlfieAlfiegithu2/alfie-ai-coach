import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";

interface Question {
  id: string;
  content: string;
  question_format: "SentenceScramble" | string;
  correct_answer: string;
  incorrect_answers: string[];
  explanation?: string;
  original_sentence?: string | null;
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

const SentenceScrambleQuizPreview = (props: Props) => {
  const { skillTestId, selectedQuestionId, limit = 6 } = props;
  const providedQuestions = props.questions;
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [userOrder, setUserOrder] = useState<string[]>([]);
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);

  useEffect(() => {
    // Use provided questions if available; otherwise, fetch by skillTestId
    const init = async () => {
      if (providedQuestions && providedQuestions.length) {
        setQuizQuestions(providedQuestions);
        setIdx(0);
        setUserOrder([]);
        setScore(0);
        setFinished(false);
        setAnswered(false);
        return;
      }
      if (!skillTestId) return;
      const { data, error } = await (supabase as any)
        .from("skill_practice_questions")
        .select("id,content,question_format,correct_answer,incorrect_answers,explanation,original_sentence")
        .eq("skill_test_id", skillTestId);
      if (!error) {
        const all = (data ?? []) as Question[];
        const picked = shuffle(all).slice(0, limit);
        setQuizQuestions(picked);
        setIdx(0);
        setUserOrder([]);
        setScore(0);
        setFinished(false);
        setAnswered(false);
      }
    };
    init();
  }, [providedQuestions, skillTestId, limit]);

  useEffect(() => {
    if (!selectedQuestionId || !quizQuestions.length) return;
    const newIndex = quizQuestions.findIndex((q) => q.id === selectedQuestionId);
    if (newIndex >= 0) {
      setIdx(newIndex);
      setUserOrder([]);
      setAnswered(false);
      setFinished(false);
    }
  }, [selectedQuestionId, quizQuestions]);

  const current = quizQuestions[idx];
  const allChunks = useMemo(() => {
    if (!current) return [];
    const chunks = [current.correct_answer, ...(current.incorrect_answers || [])].filter(Boolean);
    return shuffle(chunks);
  }, [current]);

  const progress = quizQuestions.length ? (idx / quizQuestions.length) * 100 : 0;

  const addChunk = (chunk: string) => {
    if (answered || userOrder.includes(chunk)) return;
    setUserOrder([...userOrder, chunk]);
  };

  const removeChunk = (chunk: string) => {
    if (answered) return;
    setUserOrder(userOrder.filter(c => c !== chunk));
  };

  const checkAnswer = () => {
    if (!current || answered) return;
    setAnswered(true);
    const correctOrder = [current.correct_answer, ...(current.incorrect_answers || [])];
    const isCorrect = userOrder.length === correctOrder.length && 
      userOrder.every((chunk, index) => chunk === correctOrder[index]);
    if (isCorrect) {
      setScore(s => s + 1);
    }
  };

  const next = () => {
    if (idx + 1 >= quizQuestions.length) {
      setFinished(true);
    } else {
      setIdx(i => i + 1);
      setUserOrder([]);
      setAnswered(false);
    }
  };

  const isCorrectOrder = () => {
    if (!current) return false;
    const correctOrder = [current.correct_answer, ...(current.incorrect_answers || [])];
    return userOrder.length === correctOrder.length && 
      userOrder.every((chunk, index) => chunk === correctOrder[index]);
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
            <Button onClick={() => { 
              setIdx(0); 
              setScore(0); 
              setUserOrder([]); 
              setAnswered(false);
              setFinished(false); 
            }}>
              Restart preview
            </Button>
          </CardContent>
        </Card>
      ) : current ? (
        <Card className="border-light-border">
          <CardContent className="p-6 space-y-4">
            <div className="text-xs text-muted-foreground">Question {idx + 1} of {quizQuestions.length}</div>
            
            {current.original_sentence && (
              <div className="bg-muted/50 p-3 rounded-md">
                <div className="text-sm font-medium text-muted-foreground mb-1">Original sentence:</div>
                <div className="text-sm">{current.original_sentence}</div>
              </div>
            )}

            <div className="text-lg font-medium">{current.content || "Unscramble the sentence:"}</div>

            {/* Available chunks */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Available chunks:</div>
              <div className="flex flex-wrap gap-2">
                {allChunks.map((chunk, index) => (
                  <Button
                    key={`${chunk}-${index}`}
                    variant="outline"
                    size="sm"
                    className={`${userOrder.includes(chunk) ? 'opacity-50' : ''}`}
                    onClick={() => addChunk(chunk)}
                    disabled={answered}
                  >
                    {chunk}
                  </Button>
                ))}
              </div>
            </div>

            {/* User's sentence construction */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Your sentence:</div>
              <div className="min-h-[3rem] p-3 border-2 border-dashed border-border rounded-md bg-muted/20">
                {userOrder.length === 0 ? (
                  <div className="text-sm text-muted-foreground italic">Click chunks above to build your sentence</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {userOrder.map((chunk, index) => (
                      <Button
                        key={`selected-${chunk}-${index}`}
                        variant="secondary"
                        size="sm"
                        onClick={() => removeChunk(chunk)}
                        disabled={answered}
                        className={answered ? (isCorrectOrder() ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800') : ''}
                      >
                        {chunk}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {!answered && userOrder.length > 0 && (
              <Button onClick={checkAnswer} className="w-full">
                Check Answer
              </Button>
            )}

            {answered && (
              <div className="pt-2 space-y-3">
                <div className={`text-sm font-medium ${isCorrectOrder() ? 'text-green-600' : 'text-red-600'}`}>
                  {isCorrectOrder() ? '✓ Correct!' : '✗ Incorrect'}
                </div>
                
                {!isCorrectOrder() && (
                  <div className="bg-green-50 p-3 rounded-md">
                    <div className="text-sm font-medium text-green-800 mb-1">Correct order:</div>
                    <div className="text-sm text-green-700">
                      {[current.correct_answer, ...(current.incorrect_answers || [])].join(' ')}
                    </div>
                  </div>
                )}

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

export default SentenceScrambleQuizPreview;