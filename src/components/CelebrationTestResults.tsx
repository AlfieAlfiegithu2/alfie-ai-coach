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
    <div className="min-h-screen bg-slate-50 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 pointer-events-none" />
      
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/ielts-portal')}
                className="hover:bg-slate-100 text-slate-700"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Portal
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Reading Test Results</h1>
                <p className="text-sm text-slate-600">IELTS Academic Reading</p>
              </div>
            </div>
            <Button onClick={onRetake} variant="outline" className="border-slate-300 hover:bg-slate-50">
              <RotateCcw className="w-4 h-4 mr-2" />
              Retake Test
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 space-section">
        {/* Success Message */}
        <Card className="mb-8 border-0 shadow-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-6">
              <PenguinClapAnimation size="sm" className="flex-shrink-0" />
              <div>
                <h2 className="text-2xl font-bold text-white">Test Completed Successfully! 🎉</h2>
                <p className="text-blue-100">Your IELTS Academic Reading test has been evaluated.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overall Score */}
        <Card className="shadow-xl mb-8 overflow-hidden border-0 bg-white">
          <CardHeader className="text-center bg-gradient-to-r from-slate-100 to-slate-200 py-6">
            <div className="flex items-center justify-center gap-3">
              <div className="p-3 rounded-full bg-blue-500">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-slate-800">Your IELTS Reading Band Score</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-center py-8">
            <div className="text-7xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {estimatedBandScore}
            </div>
            <div className="flex items-center justify-center gap-8 mb-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-slate-800">{score}/{totalQuestions}</div>
                <p className="text-sm text-slate-600 font-medium">Questions Correct</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-slate-800">{percentage}%</div>
                <p className="text-sm text-slate-600 font-medium">Accuracy</p>
              </div>
            </div>
            <div className="inline-flex items-center px-6 py-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold text-lg shadow-lg">
              {performance.level} Performance
            </div>
            <p className="text-sm text-slate-600 mt-4">
              Based on official IELTS assessment criteria
            </p>
          </CardContent>
        </Card>

        {/* Part Navigation */}
        <Card className="mb-6 shadow-lg border-0 bg-white">
          <CardContent className="py-6">
            <div className="flex justify-center">
              <div className="flex bg-slate-100 rounded-xl p-2 gap-2">
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
                      className={`min-w-[120px] rounded-lg font-semibold ${
                        currentPart === partNumber 
                          ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                          : 'hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      Part {partNumber}
                      <Badge variant="secondary" className="ml-2 text-xs rounded-full bg-white/20 text-current">
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
          <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardHeader className="text-center pb-3">
              <CardTitle className="flex items-center justify-center gap-2 text-slate-800">
                <div className="p-2 rounded-lg bg-blue-500">
                  <Target className="w-5 h-5 text-white" />
                </div>
                Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-3 rounded-lg bg-white/70">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-green-500"></div>
                  <span className="font-medium text-slate-700">Correct</span>
                </div>
                <Badge className="bg-green-500 text-white border-0 px-3 py-1 rounded-full font-semibold">
                  {correctCount}
                </Badge>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-white/70">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-red-500"></div>
                  <span className="font-medium text-slate-700">Incorrect</span>
                </div>
                <Badge className="bg-red-500 text-white border-0 px-3 py-1 rounded-full font-semibold">
                  {incorrectCount}
                </Badge>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-white/70">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-slate-400"></div>
                  <span className="font-medium text-slate-700">Skipped</span>
                </div>
                <Badge className="bg-slate-400 text-white border-0 px-3 py-1 rounded-full font-semibold">
                  {skippedCount}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 bg-gradient-to-br from-indigo-50 to-purple-50">
            <CardHeader className="text-center pb-3">
              <CardTitle className="flex items-center justify-center gap-2 text-slate-800">
                <div className="p-2 rounded-lg bg-indigo-500">
                  <Target className="w-5 h-5 text-white" />
                </div>
                Question Types
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(questionTypes).map(([type, count]) => (
                <div key={type} className="flex justify-between items-center p-3 rounded-lg bg-white/70">
                  <span className="text-sm capitalize font-medium text-slate-700">{type.replace('_', ' ')}</span>
                  <Badge className="bg-indigo-500 text-white border-0 px-3 py-1 rounded-full font-semibold">
                    {count}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Main Content - Taller and Better Layout */}
        <div className="flex gap-6 h-[calc(100vh-280px)]">
          {/* Passage - Wider and Taller */}
          <Card className="flex flex-col w-[50%] h-full shadow-xl border-0 bg-white">
            <CardHeader className="flex-shrink-0 pb-3 px-4 py-3 bg-gradient-to-r from-slate-100 to-slate-200">
              <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-800">
                <div className="p-2 rounded-lg bg-blue-500">
                  <Target className="w-5 h-5 text-white" />
                </div>
                {testParts[currentPart]?.passage?.title || `Reading Passage ${currentPart}`}
              </CardTitle>
              <Badge variant="outline" className="w-fit text-xs border-slate-300 text-slate-600">
                Part {currentPart}/{Object.keys(testParts).length}
              </Badge>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto min-h-0 p-6">
              <div className="prose prose-sm max-w-none">
                <div 
                  className="whitespace-pre-wrap leading-relaxed select-text text-slate-700"
                  id={`passage-content-${currentPart}`}
                  style={{ fontSize: '16px', lineHeight: '1.8' }}
                >
                  {testParts[currentPart]?.passage?.content || 'Loading passage...'}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Answer Review - Cleaner Design */}
          <Card className="flex flex-col w-[50%] h-full shadow-xl border-0 bg-white">
            <CardHeader className="flex-shrink-0 pb-3 px-4 py-3 bg-gradient-to-r from-indigo-100 to-purple-100">
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
                <div className="p-2 rounded-lg bg-indigo-500">
                  <Target className="w-5 h-5 text-white" />
                </div>
                Answer Review - Part {currentPart}
              </CardTitle>
              <Badge variant="outline" className="w-fit text-xs border-indigo-300 text-indigo-600">
                {(testParts[currentPart]?.questions || []).filter(q => answers[q.id]).length}/{(testParts[currentPart]?.questions || []).length} answered
              </Badge>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto min-h-0 p-4 scroll-smooth">
              <div className="space-y-4 pb-4">
                {(testParts[currentPart]?.questions || []).map((question) => {
                  const userAnswer = answers[question.id] || 'Not answered';
                  const isCorrect = userAnswer.toLowerCase().trim() === question.correct_answer.toLowerCase().trim();
                  const isSkipped = !answers[question.id];
                  
                  return (
                    <div key={question.id} className={`p-4 rounded-xl border shadow-sm ${
                      isCorrect 
                        ? 'border-green-200 bg-green-50' 
                        : 'border-slate-200 bg-slate-50'
                    }`}>
                      <div className="flex items-start gap-3">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                          isCorrect ? 'bg-green-500 text-white' : 'bg-slate-400 text-white'
                        }`}>
                          {question.question_number}
                        </div>
                        <div className="flex-1 space-y-3">
                          <p className="text-sm leading-relaxed text-slate-800 font-medium">
                            {question.question_text}
                          </p>
                          
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-slate-600">Your answer:</span>
                              <Badge 
                                variant="outline" 
                                className={`text-xs rounded-full font-semibold ${
                                  isCorrect ? 'bg-green-100 text-green-700 border-green-300' : 'bg-red-100 text-red-700 border-red-300'
                                }`}
                              >
                                {userAnswer}
                              </Badge>
                            </div>
                            
                            {/* Always show correct answer with better styling */}
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-slate-600">Correct answer:</span>
                              <Badge className="text-xs rounded-full bg-blue-500 text-white border-0 font-semibold">
                                {question.correct_answer}
                              </Badge>
                            </div>
                            
                            {question.explanation && (
                              <div 
                                className="bg-blue-50 p-3 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors border-l-4 border-blue-400"
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
                                      highlightedContent = highlightedContent.replace(regex, '<mark class="bg-yellow-300 px-1 py-0.5 rounded">$1</mark>');
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
                                <p className="text-xs font-semibold mb-2 text-blue-700">
                                  💡 Explanation:
                                </p>
                                <p className="text-xs leading-relaxed text-slate-700">
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