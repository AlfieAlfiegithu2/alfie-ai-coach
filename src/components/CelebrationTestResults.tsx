import React, { useState } from 'react';
import { getBandScore } from '@/lib/ielts-scoring';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trophy, Target, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PenguinClapAnimation from "@/components/animations/PenguinClapAnimation";

interface CelebrationTestResultsProps {
  score: number;
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
  timeTaken,
  answers,
  questions,
  onRetake,
  testParts
}) => {
  const navigate = useNavigate();
  const [hoveredExplanation, setHoveredExplanation] = useState<string | null>(null);
  const [currentPart, setCurrentPart] = useState(1);
  
  // IELTS Reading has exactly 40 questions
  const totalQuestions = 40;
  const percentage = Math.round((score / totalQuestions) * 100);
  
  // Use official IELTS band score conversion based on correct answers
  const estimatedBandScore = getBandScore(score, 'academic-reading');
  
  const getPerformanceLevel = () => {
    if (percentage >= 85) return { level: "Excellent", color: "text-primary" };
    if (percentage >= 70) return { level: "Good", color: "text-primary" };
    if (percentage >= 50) return { level: "Average", color: "text-primary" };
    return { level: "Needs Improvement", color: "text-muted-foreground" };
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
    <div className="min-h-screen bg-surface-2 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10 pointer-events-none" />
      
      {/* Header */}
      <div className="bg-surface-1 border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/ielts-portal')}
                className="hover:bg-surface-3"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Portal
              </Button>
              <div>
                <h1 className="text-heading-2">Reading Test Results</h1>
                <p className="text-caption">IELTS Academic Reading</p>
              </div>
            </div>
            <Button onClick={onRetake} variant="outline">
              <RotateCcw className="w-4 h-4 mr-2" />
              Retake Test
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 space-section">
        {/* Success Message */}
        <Card className="mb-8 card-modern border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-6">
              <PenguinClapAnimation size="sm" className="flex-shrink-0" />
              <div>
                <h2 className="text-heading-3 text-primary">Test Completed Successfully!</h2>
                <p className="text-body">Your IELTS Academic Reading test has been evaluated.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overall Score */}
        <Card className="card-elevated mb-6 overflow-hidden">
          <CardHeader className="text-center bg-gradient-to-r from-primary/10 to-primary/20 py-3">
            <div className="flex items-center justify-center gap-2">
              <Trophy className="w-6 h-6 text-primary" />
              <CardTitle className="text-heading-3">Your IELTS Reading Band Score</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-center py-4">
            <div className="text-6xl font-bold mb-4 text-primary">
              {estimatedBandScore}
            </div>
            <div className="flex items-center justify-center gap-6 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-text-primary">{score}/{totalQuestions}</div>
                <p className="text-caption">Questions Correct</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-text-primary">{percentage}%</div>
                <p className="text-caption">Accuracy</p>
              </div>
            </div>
            <Badge variant="outline" className="text-primary bg-primary/10 border-primary/30 text-lg px-4 py-2 rounded-2xl mb-2">
              {performance.level} Performance
            </Badge>
            <p className="text-caption">
              Based on official IELTS assessment criteria
            </p>
          </CardContent>
        </Card>

        {/* Part Navigation */}
        <Card className="mb-6 card-modern">
          <CardContent className="py-4">
            <div className="flex justify-center">
              <div className="flex bg-surface-3 rounded-2xl p-1 gap-1">
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
                      className="min-w-[100px] rounded-xl"
                    >
                      Part {partNumber}
                      <Badge variant="secondary" className="ml-2 text-xs rounded-full">
                        {partAnswered}/{partQuestions.length}
                      </Badge>
                    </Button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Summary */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="card-modern border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2 text-primary">
                <Target className="w-5 h-5" />
                Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary"></div>
                  <span className="text-text-primary">Correct</span>
                </div>
                <Badge variant="outline" className="text-primary border-primary/30 rounded-full">
                  {correctCount}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-muted-foreground"></div>
                  <span className="text-text-primary">Incorrect</span>
                </div>
                <Badge variant="outline" className="text-muted-foreground border-border rounded-full">
                  {incorrectCount}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-muted-foreground"></div>
                  <span className="text-text-primary">Skipped</span>
                </div>
                <Badge variant="outline" className="text-muted-foreground border-border rounded-full">
                  {skippedCount}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="card-modern border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2 text-primary">
                <Target className="w-5 h-5" />
                Question Types
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(questionTypes).map(([type, count]) => (
                <div key={type} className="flex justify-between items-center">
                  <span className="text-sm capitalize text-text-primary">{type.replace('_', ' ')}</span>
                  <Badge variant="outline" className="text-primary border-primary/30 rounded-full">
                    {count}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Main Content - Fixed Height Layout matching test page */}
        <div className="flex gap-2 h-[calc(100vh-400px)] px-2">
          {/* Passage - Fixed 45% width (main focus like test page) */}
          <Card className="flex flex-col w-[45%] h-full">
            <CardHeader className="flex-shrink-0 pb-2 px-3 py-2 bg-gradient-to-r from-primary/10 to-primary/20">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Target className="w-4 h-4 text-primary" />
                {testParts[currentPart]?.passage?.title || `Reading Passage ${currentPart}`}
              </CardTitle>
              <Badge variant="outline" className="w-fit text-xs h-5">
                Part {currentPart}/{Object.keys(testParts).length}
              </Badge>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto min-h-0 p-3">
              <div className="prose prose-sm max-w-none">
                <div 
                  className="whitespace-pre-wrap leading-relaxed select-text text-text-primary"
                  id={`passage-content-${currentPart}`}
                  style={{ fontSize: '15px', lineHeight: '1.6' }}
                >
                  {testParts[currentPart]?.passage?.content || 'Loading passage...'}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Questions - Fixed 55% width with scrollable content */}
          <Card className="flex flex-col w-[55%] h-full">
            <CardHeader className="flex-shrink-0 pb-2 px-3 py-2 bg-gradient-to-r from-primary/10 to-primary/20">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                Answer Review - Part {currentPart}
              </CardTitle>
              <Badge variant="secondary" className="text-xs h-5">
                {(testParts[currentPart]?.questions || []).filter(q => answers[q.id]).length}/{(testParts[currentPart]?.questions || []).length} answered
              </Badge>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto min-h-0 p-3 scroll-smooth">
              <div className="space-y-3 pb-4">
                {(testParts[currentPart]?.questions || []).map((question) => {
                  const userAnswer = answers[question.id] || 'Not answered';
                  const isCorrect = userAnswer.toLowerCase().trim() === question.correct_answer.toLowerCase().trim();
                  const isSkipped = !answers[question.id];
                  
                  return (
                    <div key={question.id} className={`p-3 rounded-xl border ${
                      isCorrect 
                        ? 'border-primary/20 bg-primary/5' 
                        : 'border-border bg-surface-3'
                    }`}>
                      <div className="flex items-start gap-2">
                        <Badge 
                          variant="outline"
                          className={`mt-1 min-w-[20px] justify-center text-xs rounded-full ${
                            isCorrect ? 'text-primary border-primary/30' : 'text-muted-foreground border-border'
                          }`}
                        >
                          {question.question_number}
                        </Badge>
                        <div className="flex-1 space-y-2">
                          <p className="text-sm leading-relaxed text-text-primary">
                            {question.question_text}
                          </p>
                          
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-muted-foreground">Your:</span>
                              <Badge 
                                variant="outline" 
                                className={`text-xs rounded-full ${
                                  isCorrect ? 'text-primary border-primary/30' : 'text-muted-foreground border-border'
                                }`}
                              >
                                {userAnswer}
                              </Badge>
                            </div>
                            
                            {/* Always show correct answer */}
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-muted-foreground">Correct:</span>
                              <Badge variant="outline" className="text-xs rounded-full text-primary border-primary/30">
                                {question.correct_answer}
                              </Badge>
                            </div>
                            
                            {question.explanation && (
                              <div 
                                className="bg-surface-2 p-2 rounded-lg cursor-pointer hover:bg-surface-2/80 transition-colors border-l-2 border-primary/50"
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
                                      highlightedContent = highlightedContent.replace(regex, '<mark class="bg-primary/30 px-1 py-0.5 rounded">$1</mark>');
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
                                <p className="text-xs font-medium mb-1 text-primary">
                                  Explanation:
                                </p>
                                <p className="text-xs leading-relaxed text-text-secondary">
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
      </div>
    </div>
  );
};

export default CelebrationTestResults;