import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import StudentLayout from "@/components/StudentLayout";
import { useToast } from "@/hooks/use-toast";

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

const SentenceScrambleQuiz = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [testTitle, setTestTitle] = useState("");
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [userOrder, setUserOrder] = useState<string[]>([]);
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      if (!testId) return;
      
      // Get test title
      const { data: testData, error: testError } = await (supabase as any)
        .from("skill_tests")
        .select("title")
        .eq("id", testId)
        .maybeSingle();
      
      if (testError) {
        toast({ title: "Error loading test", description: testError.message, variant: "destructive" });
        return;
      }
      
      if (!testData) {
        toast({ title: "Test not found", variant: "destructive" });
        navigate("/skills/sentence-structure-scramble");
        return;
      }
      
      setTestTitle(testData.title);
      
      // Get questions
      const { data, error } = await (supabase as any)
        .from("skill_practice_questions")
        .select("id,content,question_format,correct_answer,incorrect_answers,explanation,original_sentence")
        .eq("skill_test_id", testId);
      
      if (error) {
        toast({ title: "Error loading questions", description: error.message, variant: "destructive" });
        return;
      }
      
      const questions = (data ?? []) as Question[];
      const shuffledQuestions = shuffle(questions);
      setQuizQuestions(shuffledQuestions);
      setLoading(false);
    };
    
    init();
  }, [testId, toast, navigate]);

  const current = quizQuestions[idx];
  const allChunks = useMemo(() => {
    if (!current) return [];
    const chunks = [current.correct_answer, ...(current.incorrect_answers || [])].filter(Boolean);
    // Make all chunks lowercase to avoid giving away the first word
    const lowercaseChunks = chunks.map(chunk => chunk.toLowerCase());
    return shuffle(lowercaseChunks);
  }, [current]);

  const progress = quizQuestions.length ? ((idx + 1) / quizQuestions.length) * 100 : 0;

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
    // Compare with lowercase versions
    const correctOrderLower = correctOrder.map(chunk => chunk.toLowerCase());
    const isCorrect = userOrder.length === correctOrderLower.length && 
      userOrder.every((chunk, index) => chunk === correctOrderLower[index]);
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
    const correctOrderLower = correctOrder.map(chunk => chunk.toLowerCase());
    return userOrder.length === correctOrderLower.length && 
      userOrder.every((chunk, index) => chunk === correctOrderLower[index]);
  };

  const restart = () => {
    setIdx(0);
    setScore(0);
    setUserOrder([]);
    setAnswered(false);
    setFinished(false);
    setQuizQuestions(shuffle(quizQuestions));
  };

  if (loading) {
    return (
      <StudentLayout title="Loading..." showBackButton backPath="/skills/sentence-structure-scramble">
        <div className="flex justify-center items-center min-h-[50vh]">
          <p className="text-muted-foreground">Loading quiz...</p>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout title={testTitle} showBackButton backPath="/skills/sentence-structure-scramble">
      <div className="max-w-4xl mx-auto space-y-6">
        <Progress value={progress} />
        
        {finished ? (
          <Card>
            <CardContent className="p-6 text-center space-y-4">
              <div className="text-2xl font-semibold">Quiz Complete!</div>
              <div className="text-lg">
                Your Score: <span className="font-bold text-primary">{score} / {quizQuestions.length}</span>
              </div>
              <div className="text-muted-foreground">
                {score === quizQuestions.length
                  ? "Perfect! You got every question right!"
                  : score >= quizQuestions.length * 0.8
                  ? "Great job! You did really well!"
                  : score >= quizQuestions.length * 0.6
                  ? "Good effort! Keep practicing!"
                  : "Keep practicing to improve your sentence structure skills!"
                }
              </div>
              <div className="flex gap-3 justify-center">
                <Button onClick={restart}>Try Again</Button>
                <Button variant="outline" onClick={() => navigate("/skills/sentence-structure-scramble")}>
                  Back to Tests
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : current ? (
          <Card className="border-light-border">
            <CardContent className="p-6 space-y-6">
              <div className="text-sm text-muted-foreground">
                Question {idx + 1} of {quizQuestions.length}
              </div>
              
              {current.original_sentence && (
                <div className="bg-muted/50 p-4 rounded-md">
                  <div className="text-sm font-medium text-muted-foreground mb-2">Original sentence:</div>
                  <div className="text-sm">{current.original_sentence}</div>
                </div>
              )}

              <div className="text-xl font-medium">{current.content || "Unscramble the sentence:"}</div>

              {/* Available chunks */}
              <div className="space-y-3">
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
              <div className="space-y-3">
                <div className="text-sm font-medium">Your sentence:</div>
                <div className="min-h-[4rem] p-4 border-2 border-dashed border-border rounded-md bg-muted/20">
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
                <div className="space-y-4">
                  <div className={`text-lg font-semibold text-center ${isCorrectOrder() ? 'text-green-600' : 'text-red-600'}`}>
                    {isCorrectOrder() ? '✓ Correct!' : '✗ Incorrect'}
                  </div>
                  
                  {!isCorrectOrder() && (
                    <div className="bg-green-50 p-4 rounded-md">
                      <div className="text-sm font-medium text-green-800 mb-2">Correct order:</div>
                      <div className="text-green-700">
                        {[current.correct_answer, ...(current.incorrect_answers || [])].join(' ')}
                      </div>
                    </div>
                  )}

                  {current.explanation && (
                    <div className="rounded-md border p-4">
                      <div className="text-sm font-medium mb-2">Explanation</div>
                      <p className="text-sm text-muted-foreground">{sanitizeExplanation(current.explanation)}</p>
                    </div>
                  )}
                  
                  <Button onClick={next} className="w-full">
                    {idx + 1 >= quizQuestions.length ? 'Finish Quiz' : 'Next Question'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">No questions available for this test.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </StudentLayout>
  );
};

export default SentenceScrambleQuiz;