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
  testParts: {
    [key: number]: {
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
    };
  };
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
  const [currentPart, setCurrentPart] = useState(1);

  // IELTS Reading has exactly 40 questions
  const totalQuestions = 40;
  const percentage = Math.round(score / totalQuestions * 100);

  // Use official IELTS band score conversion based on correct answers
  const estimatedBandScore = getBandScore(score, 'academic-reading');
  const getPerformanceLevel = () => {
    if (percentage >= 85) return {
      level: "Excellent",
      color: "text-primary"
    };
    if (percentage >= 70) return {
      level: "Good",
      color: "text-primary"
    };
    if (percentage >= 50) return {
      level: "Average",
      color: "text-primary"
    };
    return {
      level: "Needs Improvement",
      color: "text-muted-foreground"
    };
  };
  const performance = getPerformanceLevel();
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor(seconds % 3600 / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  };
  // Get all questions from all test parts to ensure we count all 40 questions
  const allQuestions = Object.values(testParts).flatMap(part => part.questions);
  
  const correctCount = allQuestions.filter(q => answers[q.id]?.toLowerCase().trim() === q.correct_answer.toLowerCase().trim()).length;
  const incorrectCount = allQuestions.filter(q => {
    const userAnswer = answers[q.id];
    return userAnswer && userAnswer.toLowerCase().trim() !== q.correct_answer.toLowerCase().trim();
  }).length;
  const skippedCount = allQuestions.filter(q => !answers[q.id]).length;
  const questionTypes = allQuestions.reduce((acc, q) => {
    acc[q.question_type] = (acc[q.question_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  return <div className="min-h-screen bg-background">
      
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate('/ielts-portal')} className="hover:bg-muted text-foreground">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Portal
              </Button>
              <div>
                <h1 className="text-2xl font-semibold text-foreground font-inter">Reading Test Results</h1>
                <p className="text-sm text-muted-foreground font-inter">IELTS Academic Reading</p>
              </div>
            </div>
            <Button onClick={onRetake} variant="outline">
              <RotateCcw className="w-4 h-4 mr-2" />
              Retake Test
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Success Message */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex items-center gap-6">
              <PenguinClapAnimation size="sm" className="flex-shrink-0" />
              <div>
                <h2 className="text-xl font-medium text-foreground font-inter">Test Completed Successfully! 🎉</h2>
                <p className="text-muted-foreground font-inter">Your IELTS Academic Reading test has been evaluated.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overall Score */}
        <Card className="mb-8">
          <CardHeader className="text-center bg-muted/30 py-6">
            <div className="flex items-center justify-center gap-3">
              <div className="p-3 rounded-full bg-primary">
                <Trophy className="w-6 h-6 text-primary-foreground" />
              </div>
              <CardTitle className="text-xl font-medium text-foreground font-inter">Your IELTS Reading Band Score</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-center py-8">
            <div className="text-7xl font-bold mb-6 text-foreground font-inter">
              {estimatedBandScore}
            </div>
            <div className="flex items-center justify-center gap-8 mb-6">
              <div className="text-center">
                <div className="text-3xl font-semibold text-foreground font-inter">{score}/{totalQuestions}</div>
                <p className="text-sm text-muted-foreground font-inter">Questions Correct</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-semibold text-foreground font-inter">{percentage}%</div>
                <p className="text-sm text-muted-foreground font-inter">Accuracy</p>
              </div>
            </div>
            <div className="inline-flex items-center px-6 py-3 rounded-full bg-primary text-primary-foreground font-medium text-lg font-inter">
              {performance.level} Performance
            </div>
            <p className="text-sm text-muted-foreground mt-4 font-inter">
              Based on official IELTS assessment criteria
            </p>
          </CardContent>
        </Card>

        {/* Part Navigation */}
        <Card className="mb-6">
          <CardContent className="py-6">
            <div className="flex justify-center">
              <div className="flex bg-muted/50 rounded-xl p-2 gap-2">
                {Object.keys(testParts).map(partNum => {
                const partNumber = parseInt(partNum);
                const partQuestions = testParts[partNumber]?.questions || [];
                const partCorrect = partQuestions.filter(q => answers[q.id]?.toLowerCase().trim() === q.correct_answer.toLowerCase().trim()).length;
                return <Button key={partNumber} variant={currentPart === partNumber ? "default" : "ghost"} size="sm" onClick={() => setCurrentPart(partNumber)} className="min-w-[120px] rounded-lg font-medium font-inter">
                      Part {partNumber}
                      <span className="ml-2 text-xs">
                        {partCorrect}/{partQuestions.length}
                      </span>
                    </Button>;
              })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Summary */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader className="text-center pb-3">
              <CardTitle className="text-lg font-medium text-foreground font-inter">
                Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="font-medium text-foreground font-inter">Correct</span>
                </div>
                <span className="text-xl font-semibold text-foreground font-inter">
                  {correctCount}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="font-medium text-foreground font-inter">Incorrect</span>
                </div>
                <span className="text-xl font-semibold text-foreground font-inter">
                  {incorrectCount}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-muted-foreground"></div>
                  <span className="font-medium text-foreground font-inter">Skipped</span>
                </div>
                <span className="text-xl font-semibold text-foreground font-inter">
                  {skippedCount}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center pb-3">
              <CardTitle className="text-lg font-medium text-foreground font-inter">
                Question Types
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(questionTypes).map(([type, count]) => <div key={type} className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                  <span className="text-sm capitalize font-medium text-foreground font-inter">{type.replace('_', ' ')}</span>
                  <span className="text-xl font-semibold text-foreground font-inter">
                    {count}
                  </span>
                </div>)}
            </CardContent>
          </Card>
        </div>

        {/* Main Content - Taller and Better Layout */}
        <div className="flex gap-6 h-[calc(100vh-200px)]">
          {/* Passage - Wider and Taller */}
          <Card className="flex flex-col w-[50%] h-full">
            <CardHeader className="flex-shrink-0 pb-3 px-4 py-3 bg-muted/30 border-b">
              <CardTitle className="flex items-center gap-2 text-lg font-medium text-foreground font-inter">
                {testParts[currentPart]?.passage?.title || `Reading Passage ${currentPart}`}
              </CardTitle>
              <Badge variant="outline" className="w-fit text-xs">
                Part {currentPart}/{Object.keys(testParts).length}
              </Badge>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto min-h-0 p-6">
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap leading-relaxed select-text text-foreground font-inter" id={`passage-content-${currentPart}`} style={{
                fontSize: '16px',
                lineHeight: '1.8'
              }}>
                  {testParts[currentPart]?.passage?.content || 'Loading passage...'}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Answer Review - Cleaner Design */}
          <Card className="flex flex-col w-[50%] h-full">
            <CardHeader className="flex-shrink-0 pb-3 px-4 py-3 bg-muted/30 border-b">
              <CardTitle className="text-lg font-medium flex items-center gap-2 text-foreground font-inter">
                Answer Review - Part {currentPart}
              </CardTitle>
              <Badge variant="outline" className="w-fit text-xs">
                {(testParts[currentPart]?.questions || []).filter(q => answers[q.id]?.toLowerCase().trim() === q.correct_answer.toLowerCase().trim()).length}/{(testParts[currentPart]?.questions || []).length} correct
              </Badge>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto min-h-0 p-4 scroll-smooth">
              <div className="space-y-4 pb-4">
                {(testParts[currentPart]?.questions || []).map(question => {
                const userAnswer = answers[question.id] || 'Not answered';
                const isCorrect = userAnswer.toLowerCase().trim() === question.correct_answer.toLowerCase().trim();
                const isSkipped = !answers[question.id];
                return <div key={question.id} className={`p-4 rounded-lg border ${isCorrect ? 'border-green-200 bg-green-50' : 'border-border bg-muted/30'}`}>
                      <div className="flex items-start gap-3">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${isCorrect ? 'bg-green-500 text-white' : 'bg-muted-foreground text-background'}`}>
                          {question.question_number}
                        </div>
                        <div className="flex-1 space-y-3">
                          <p className="text-sm leading-relaxed text-foreground font-medium font-inter">
                            {question.question_text}
                          </p>
                          
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-muted-foreground font-inter">Your answer:</span>
                              <span className={`text-sm font-medium ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                                {userAnswer}
                              </span>
                            </div>
                            
                            {/* Always show correct answer with better styling */}
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-muted-foreground font-inter">Correct answer:</span>
                              <span className="text-sm font-medium text-foreground">
                                {question.correct_answer}
                              </span>
                            </div>
                            
                            {question.explanation && <div className="bg-muted/50 p-3 rounded-lg border-l-4 border-primary/50">
                                <p className="text-xs font-medium mb-2 text-foreground font-inter">
                                  💡 Explanation:
                                </p>
                                <p className="text-xs leading-relaxed text-muted-foreground font-inter">
                                  {question.explanation}
                                </p>
                              </div>}
                          </div>
                        </div>
                      </div>
                    </div>;
              })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>;
};
export default CelebrationTestResults;