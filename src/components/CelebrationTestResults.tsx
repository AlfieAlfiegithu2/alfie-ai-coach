import React, { useState } from 'react';
import { getBandScore } from '@/lib/ielts-scoring';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trophy, Target, RotateCcw, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import CelebrationLottieAnimation from "@/components/animations/CelebrationLottieAnimation";

interface CelebrationTestResultsProps {
  score: number;
  totalQuestions: number;
  timeTaken: number;
  answers: Record<string, string>;
  questions: Array<{
    id: string;
    question_text: string;
    question_number: number;
    correct_answer: string;
    explanation: string;
    question_type: string;
  }>;
  onRetake: () => void;
  testParts: {[key: number]: {
    passage: {
      id: string;
      title: string;
      content: string;
      part_number: number;
    };
    questions: Array<{
      id: string;
      question_text: string;
      question_number: number;
      correct_answer: string;
      explanation: string;
      question_type: string;
      part_number: number;
    }>;
  }};
}

const CelebrationTestResults: React.FC<CelebrationTestResultsProps> = ({
  score,
  totalQuestions,
  timeTaken,
  answers,
  questions,
  onRetake,
  testParts
}) => {
  const navigate = useNavigate();
  const [hoveredExplanation, setHoveredExplanation] = useState<string | null>(null);
  const [currentPart, setCurrentPart] = useState(1);
  
  const percentage = Math.round((score / totalQuestions) * 100);
  
  // Use official IELTS band score conversion based on correct answers
  const estimatedBandScore = getBandScore(score, 'academic-reading');
  
  const getPerformanceLevel = () => {
    if (percentage >= 85) return { level: "Excellent", color: "text-green-600" };
    if (percentage >= 70) return { level: "Good", color: "text-blue-600" };
    if (percentage >= 50) return { level: "Average", color: "text-yellow-600" };
    return { level: "Needs Improvement", color: "text-red-600" };
  };

  const performance = getPerformanceLevel();

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  };

  const correctCount = questions.filter(q => 
    answers[q.id]?.toLowerCase().trim() === q.correct_answer.toLowerCase().trim()
  ).length;
  
  const incorrectCount = questions.filter(q => {
    const userAnswer = answers[q.id];
    return userAnswer && userAnswer.toLowerCase().trim() !== q.correct_answer.toLowerCase().trim();
  }).length;
  
  const skippedCount = questions.filter(q => !answers[q.id]).length;

  const questionTypes = questions.reduce((acc, q) => {
    acc[q.question_type] = (acc[q.question_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const highlightTextInPassage = (explanationText: string) => {
    // Extract key phrases from explanation to highlight in passage
    const keyPhrases = explanationText.match(/"([^"]+)"/g)?.map(phrase => phrase.replace(/"/g, '')) || [];
    return keyPhrases;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950 dark:via-indigo-950 dark:to-purple-950">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => navigate('/ielts-portal')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Portal
            </Button>
            <Button onClick={onRetake} variant="outline">
              <RotateCcw className="w-4 h-4 mr-2" />
              Retake Test
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Celebration Header */}
        <Card className="mb-8 bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0">
          <CardContent className="text-center py-12">
            <div className="flex items-center justify-center mb-6">
              <CelebrationLottieAnimation size="md" />
            </div>
            <h1 className="text-4xl font-bold mb-2">Test Completed! 🎉</h1>
            <p className="text-xl opacity-90 mb-6">Reading Test - Cambridge IELTS Academic</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold">{score}/{totalQuestions}</div>
                <div className="text-sm opacity-80">Questions Correct</div>
                <div className="text-lg font-semibold">{percentage}%</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-300">{estimatedBandScore}</div>
                <div className="text-sm opacity-80">Estimated Band Score</div>
              </div>
              
              <div className="text-center">
                <div className={`text-2xl font-bold ${performance.level === "Excellent" ? "text-green-300" : performance.level === "Good" ? "text-blue-300" : performance.level === "Average" ? "text-yellow-300" : "text-red-300"}`}>
                  {performance.level}
                </div>
                <div className="text-sm opacity-80">Performance</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Part Navigation */}
        <div className="flex justify-center mb-6">
          <div className="flex bg-muted rounded-lg p-1">
            {Object.keys(testParts).map((partNum) => {
              const partNumber = parseInt(partNum);
              const partQuestions = testParts[partNumber]?.questions || [];
              const partAnswered = partQuestions.filter(q => answers[q.id]).length;
              
              return (
                <Button
                  key={partNumber}
                  variant={currentPart === partNumber ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setCurrentPart(partNumber)}
                  className="min-w-[100px]"
                >
                  Part {partNumber}
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {partAnswered}/{partQuestions.length}
                  </Badge>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-12 gap-4">
          {/* Results Sidebar - Now on Left */}
          <div className="lg:col-span-7 space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Correct</span>
                    <Badge variant="default">{correctCount}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Incorrect</span>
                    <Badge variant="destructive">{incorrectCount}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Skipped</span>
                    <Badge variant="secondary">{skippedCount}</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Question Types</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(questionTypes).map(([type, count]) => (
                    <div key={type} className="flex justify-between items-center">
                      <span className="text-sm capitalize">{type.replace('_', ' ')}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Answer Review */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Answer Review - Part {currentPart}</CardTitle>
              </CardHeader>
              <CardContent className="max-h-[500px] overflow-y-auto">
                <div className="space-y-4">
                  {(testParts[currentPart]?.questions || []).map((question) => {
                    const userAnswer = answers[question.id] || 'Not answered';
                    const isCorrect = userAnswer.toLowerCase().trim() === question.correct_answer.toLowerCase().trim();
                    const isSkipped = !answers[question.id];
                    
                    return (
                      <div key={question.id} className="border-b pb-3 last:border-b-0">
                        <div className="flex items-start gap-2">
                          <Badge 
                            variant={isCorrect ? "default" : isSkipped ? "secondary" : "destructive"} 
                            className="mt-1 min-w-[20px] justify-center text-xs"
                          >
                            {question.question_number}
                          </Badge>
                          <div className="flex-1 space-y-2">
                            <p className="font-medium leading-relaxed text-sm">
                              {question.question_text}
                            </p>
                            
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium">Your answer:</span>
                                <Badge variant={isCorrect ? "default" : isSkipped ? "secondary" : "destructive"} className="text-xs">
                                  {userAnswer}
                                </Badge>
                              </div>
                              
                              {!isCorrect && !isSkipped && (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium">Correct answer:</span>
                                  <Badge variant="default" className="text-xs">
                                    {question.correct_answer}
                                  </Badge>
                                </div>
                              )}
                              
                              {question.explanation && (
                                <div 
                                  className="bg-muted p-3 rounded-md cursor-pointer hover:bg-muted/80 transition-colors border-l-4 border-primary"
                                  onMouseEnter={() => {
                                    setHoveredExplanation(question.id);
                                    // Highlight relevant text in passage
                                    const keyPhrases = highlightTextInPassage(question.explanation);
                                    const passageElement = document.getElementById(`passage-content-${currentPart}`);
                                    if (passageElement) {
                                      // Store original content
                                      if (!passageElement.dataset.original) {
                                        passageElement.dataset.original = passageElement.innerHTML;
                                      }
                                      
                                      let highlightedContent = passageElement.dataset.original;
                                      keyPhrases.forEach(phrase => {
                                        const regex = new RegExp(`(${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
                                        highlightedContent = highlightedContent.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800 px-1 py-0.5 rounded">$1</mark>');
                                      });
                                      passageElement.innerHTML = highlightedContent;
                                    }
                                  }}
                                  onMouseLeave={() => {
                                    setHoveredExplanation(null);
                                    // Remove highlights
                                    const passageElement = document.getElementById(`passage-content-${currentPart}`);
                                    if (passageElement && passageElement.dataset.original) {
                                      passageElement.innerHTML = passageElement.dataset.original;
                                    }
                                  }}
                                >
                                  <p className="text-xs font-medium mb-1 flex items-center gap-2">
                                    <Star className="w-3 h-3" />
                                    Explanation:
                                  </p>
                                  <p className="text-xs leading-relaxed">
                                    {question.explanation}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Passage - Now on Right, Wider */}
          <div className="lg:col-span-5">
            <Card className="h-[600px]">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="w-4 h-4" />
                  {testParts[currentPart]?.passage?.title || `Reading Passage ${currentPart}`}
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[calc(100%-60px)] overflow-y-auto p-3">
                <div 
                  className="prose prose-sm max-w-none whitespace-pre-wrap leading-6 text-sm"
                  id={`passage-content-${currentPart}`}
                  style={{ fontSize: '13px', lineHeight: '1.5' }}
                >
                  {testParts[currentPart]?.passage?.content || 'Loading passage...'}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CelebrationTestResults;