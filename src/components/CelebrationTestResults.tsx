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
    <div className="min-h-screen bg-surface-2 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/5 via-brand-purple/5 to-brand-green/5 pointer-events-none" />
      
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
        <Card className="mb-8 card-modern border-2 border-brand-green/20 bg-gradient-to-br from-brand-green/5 to-brand-green/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-brand-green/10">
                <Trophy className="w-8 h-8 text-brand-green" />
              </div>
              <div>
                <h2 className="text-heading-3 text-brand-green">Test Completed Successfully!</h2>
                <p className="text-body">Your IELTS Academic Reading test has been evaluated.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overall Score */}
        <Card className="card-elevated mb-6 overflow-hidden">
          <CardHeader className="text-center bg-gradient-to-r from-brand-blue/10 to-brand-purple/10 py-3">
            <div className="flex items-center justify-center gap-2">
              <div className="p-2 rounded-xl bg-brand-blue/10">
                <Trophy className="w-6 h-6 text-brand-blue" />
              </div>
              <CardTitle className="text-heading-3">Your IELTS Reading Band Score</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-center py-4">
            <div className="text-6xl font-bold mb-4 bg-gradient-to-r from-brand-blue to-brand-purple bg-clip-text text-transparent">
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
            <Badge variant="outline" className={`${performance.color === "text-green-600" ? "text-brand-green bg-brand-green/10 border-brand-green/30" : performance.color === "text-blue-600" ? "text-brand-blue bg-brand-blue/10 border-brand-blue/30" : performance.color === "text-yellow-600" ? "text-brand-orange bg-brand-orange/10 border-brand-orange/30" : "text-destructive bg-destructive/10 border-destructive/30"} text-lg px-4 py-2 rounded-2xl mb-2`}>
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
          <Card className="card-modern border-2 border-brand-blue/20 bg-gradient-to-br from-brand-blue/5 to-brand-blue/10">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2 text-brand-blue">
                <div className="p-2 rounded-xl bg-brand-blue/10">
                  <Target className="w-5 h-5" />
                </div>
                Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-brand-green"></div>
                  <span className="text-text-primary">Correct</span>
                </div>
                <Badge variant="outline" className="text-brand-green border-brand-green/30 rounded-full">
                  {correctCount}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-destructive"></div>
                  <span className="text-text-primary">Incorrect</span>
                </div>
                <Badge variant="outline" className="text-destructive border-destructive/30 rounded-full">
                  {incorrectCount}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-text-tertiary"></div>
                  <span className="text-text-primary">Skipped</span>
                </div>
                <Badge variant="outline" className="text-text-tertiary border-border rounded-full">
                  {skippedCount}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="card-modern border-2 border-brand-purple/20 bg-gradient-to-br from-brand-purple/5 to-brand-purple/10">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2 text-brand-purple">
                <div className="p-2 rounded-xl bg-brand-purple/10">
                  <Star className="w-5 h-5" />
                </div>
                Question Types
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(questionTypes).map(([type, count]) => (
                <div key={type} className="flex justify-between items-center">
                  <span className="text-sm capitalize text-text-primary">{type.replace('_', ' ')}</span>
                  <Badge variant="outline" className="text-brand-purple border-brand-purple/30 rounded-full">
                    {count}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Main Content - Symmetrical Layout */}
        <div className="flex gap-6 h-[calc(100vh-400px)]">
          {/* Left Column - Answer Review */}
          <div className="w-1/2 flex flex-col">
            <Card className="flex-1 card-elevated">
              <CardHeader className="bg-gradient-to-r from-brand-blue/10 to-brand-purple/10">
                <CardTitle className="text-heading-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-brand-blue" />
                  Answer Review - Part {currentPart}
                </CardTitle>
              </CardHeader>

              <CardContent className="flex-1 overflow-y-auto p-6">
                <div className="space-y-4">
                  {(testParts[currentPart]?.questions || []).map((question) => {
                    const userAnswer = answers[question.id] || 'Not answered';
                    const isCorrect = userAnswer.toLowerCase().trim() === question.correct_answer.toLowerCase().trim();
                    const isSkipped = !answers[question.id];
                    
                    return (
                      <div key={question.id} className={`p-4 rounded-2xl border-2 ${
                        isCorrect 
                          ? 'border-brand-green/20 bg-brand-green/5' 
                          : isSkipped 
                          ? 'border-border bg-surface-3'
                          : 'border-destructive/20 bg-destructive/5'
                      }`}>
                        <div className="flex items-start gap-3">
                          <Badge 
                            variant="outline"
                            className={`mt-1 min-w-[24px] justify-center text-xs rounded-full ${
                              isCorrect ? 'text-brand-green border-brand-green/30' :
                              isSkipped ? 'text-text-tertiary border-border' : 
                              'text-destructive border-destructive/30'
                            }`}
                          >
                            {question.question_number}
                          </Badge>
                          <div className="flex-1 space-y-2">
                            <p className="font-medium leading-relaxed text-text-primary">
                              {question.question_text}
                            </p>
                            
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-caption font-medium">Your answer:</span>
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs rounded-full ${
                                    isCorrect ? 'text-brand-green border-brand-green/30' :
                                    isSkipped ? 'text-text-tertiary border-border' : 
                                    'text-destructive border-destructive/30'
                                  }`}
                                >
                                  {userAnswer}
                                </Badge>
                              </div>
                              
                              {!isCorrect && !isSkipped && (
                                <div className="flex items-center gap-2">
                                  <span className="text-caption font-medium">Correct answer:</span>
                                  <Badge variant="outline" className="text-xs rounded-full text-brand-green border-brand-green/30">
                                    {question.correct_answer}
                                  </Badge>
                                </div>
                              )}
                              
                              {question.explanation && (
                                <div 
                                  className="bg-surface-3 p-3 rounded-xl cursor-pointer hover:bg-surface-3/80 transition-colors border-l-4 border-brand-blue"
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
                                        highlightedContent = highlightedContent.replace(regex, '<mark class="bg-brand-orange/30 px-1 py-0.5 rounded">$1</mark>');
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
                                  <p className="text-caption font-medium mb-1 flex items-center gap-2 text-brand-blue">
                                    <Star className="w-3 h-3" />
                                    Explanation:
                                  </p>
                                  <p className="text-caption leading-relaxed text-text-secondary">
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

          {/* Right Column - Passage (Symmetrical Layout) */}
          <div className="w-1/2">
            <Card className="h-full card-elevated">
              <CardHeader className="bg-gradient-to-r from-brand-purple/10 to-brand-blue/10">
                <CardTitle className="flex items-center gap-2 text-heading-4">
                  <div className="p-2 rounded-xl bg-brand-purple/10">
                    <Target className="w-5 h-5 text-brand-purple" />
                  </div>
                  {testParts[currentPart]?.passage?.title || `Reading Passage ${currentPart}`}
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[calc(100%-80px)] overflow-y-auto p-6">
                <div 
                  className="prose prose-sm max-w-none whitespace-pre-wrap leading-relaxed text-text-primary"
                  id={`passage-content-${currentPart}`}
                  style={{ fontSize: '14px', lineHeight: '1.6' }}
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