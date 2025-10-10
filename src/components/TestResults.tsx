import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { getBandScore } from '@/lib/ielts-scoring';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, TrendingUp, RotateCcw, ArrowRight, Home } from "lucide-react";
import LightRays from '@/components/animations/LightRays';

interface TestResultsProps {
  score: number;
  totalQuestions: number;
  timeTaken?: number;
  answers: Record<string, string>;
  questions: any[];
  onRetake: () => void;
  onContinue: () => void;
  testTitle?: string;
}

const TestResults = ({ 
  score, 
  totalQuestions, 
  timeTaken, 
  answers, 
  questions, 
  onRetake, 
  onContinue, 
  testTitle 
}: TestResultsProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const percentage = Math.round((score / totalQuestions) * 100);
  
  // Use official IELTS band score conversion based on correct answers
  const bandScore = getBandScore(score, 'academic-reading');
  const correctAnswers = questions.filter(q => 
    answers[q.id]?.toLowerCase().trim() === q.correct_answer?.toLowerCase().trim()
  );
  const incorrectAnswers = questions.filter(q => 
    answers[q.id] && answers[q.id]?.toLowerCase().trim() !== q.correct_answer?.toLowerCase().trim()
  );
  const skippedAnswers = questions.filter(q => !answers[q.id]);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6 relative">
      <LightRays 
        raysOrigin="top-right"
        raysColor="#F59E0B"
        raysSpeed={0.6}
        lightSpread={1.2}
        rayLength={1.5}
        pulsating={true}
        fadeDistance={1.0}
        saturation={0.8}
        followMouse={true}
        mouseInfluence={0.1}
        noiseAmount={0.12}
        distortion={0.25}
      />
      {/* Header */}
      <Card className="rounded-2xl border-light-border shadow-soft" style={{ background: 'var(--gradient-card)' }}>
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-3xl font-georgia text-foreground mb-2">
            {t('testResults.viewResults', { defaultValue: 'View Results' })}
          </CardTitle>
          {testTitle && (
            <p className="text-warm-gray">{testTitle}</p>
          )}
        </CardHeader>
        <CardContent className="text-center">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Score */}
            <div className="space-y-2">
              <div className="text-4xl font-bold text-foreground">
                {score}/{totalQuestions}
              </div>
              <p className="text-sm text-warm-gray">{t('testResults.correctAnswers', { defaultValue: 'Correct Answers' })}</p>
              <Badge variant="outline" className="text-lg px-3 py-1">
                {percentage}%
              </Badge>
            </div>

            {/* Band Score */}
            <div className="space-y-2">
              <div className="text-4xl font-bold text-primary">
                {bandScore}
              </div>
              <p className="text-sm text-warm-gray">{t('testResults.band', { defaultValue: 'Band' })}</p>
              <Progress value={percentage} className="w-full h-2" />
            </div>

            {/* Performance */}
            <div className="space-y-2">
              <TrendingUp className="w-8 h-8 text-primary mx-auto" />
              <p className="text-sm text-warm-gray">{t('testResults.performance', { defaultValue: 'Performance' })}</p>
              <Badge 
                variant={percentage >= 70 ? "default" : percentage >= 50 ? "secondary" : "destructive"}
                className="text-sm px-3 py-1"
              >
                {percentage >= 70 ? t('testResults.excellent', { defaultValue: 'Excellent' }) : percentage >= 50 ? t('testResults.good', { defaultValue: 'Good' }) : t('testResults.needsWork', { defaultValue: 'Needs Work' })}
              </Badge>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center flex-wrap">
            <Button 
              variant="outline" 
              onClick={() => navigate('/dashboard')}
              className="rounded-xl px-6"
            >
              <Home className="w-4 h-4 mr-2" />
              {t('header.dashboard', { defaultValue: 'Dashboard' })}
            </Button>
            <Button 
              variant="outline" 
              onClick={onRetake}
              className="rounded-xl px-6"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              {t('testResults.retakeTest', { defaultValue: 'Retake Test' })}
            </Button>
            <Button 
              onClick={onContinue}
              className="rounded-xl px-6"
              style={{ background: 'var(--gradient-button)' }}
            >
              {t('testResults.continuePractice', { defaultValue: 'Continue Practice' })}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Summary Stats */}
        <Card className="rounded-2xl border-light-border shadow-soft">
          <CardHeader>
            <CardTitle className="text-xl font-georgia text-foreground">{t('testResults.summary', { defaultValue: 'Summary' })}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-foreground">{t('testResults.correct', { defaultValue: 'Correct' })}</span>
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700">
                {correctAnswers.length}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-500" />
                <span className="text-foreground">{t('testResults.incorrect', { defaultValue: 'Incorrect' })}</span>
              </div>
              <Badge variant="outline" className="bg-red-50 text-red-700">
                {incorrectAnswers.length}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-gray-400"></div>
                <span className="text-foreground">{t('testResults.skipped', { defaultValue: 'Skipped' })}</span>
              </div>
              <Badge variant="outline" className="bg-gray-50 text-gray-700">
                {skippedAnswers.length}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Question Type Breakdown */}
        <Card className="rounded-2xl border-light-border shadow-soft">
          <CardHeader>
            <CardTitle className="text-xl font-georgia text-foreground">{t('testResults.questionTypes', { defaultValue: 'Question Types' })}</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const typeStats = questions.reduce((acc, q) => {
                const type = q.question_type || 'Unknown';
                if (!acc[type]) acc[type] = { correct: 0, total: 0 };
                acc[type].total++;
                if (answers[q.id]?.toLowerCase().trim() === q.correct_answer?.toLowerCase().trim()) {
                  acc[type].correct++;
                }
                return acc;
              }, {} as Record<string, { correct: number; total: number }>);

              return Object.entries(typeStats).map(([type, stats]: [string, { correct: number; total: number }]) => (
                <div key={type} className="mb-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-foreground">{type}</span>
                    <span className="text-xs text-warm-gray">
                      {stats.correct}/{stats.total}
                    </span>
                  </div>
                  <Progress 
                    value={(stats.correct / stats.total) * 100} 
                    className="h-2" 
                  />
                </div>
              ));
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Review */}
      <Card className="rounded-2xl border-light-border shadow-soft">
        <CardHeader>
          <CardTitle className="text-xl font-georgia text-foreground">{t('testResults.answerReview', { defaultValue: 'Answer Review' })}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {questions.map((question) => {
            const userAnswer = answers[question.id];
            const isCorrect = userAnswer?.toLowerCase().trim() === question.correct_answer?.toLowerCase().trim();
            const isSkipped = !userAnswer;
            
            return (
              <div 
                key={question.id} 
                className={`p-4 rounded-xl border-2 ${
                  isCorrect 
                    ? 'border-green-200 bg-green-50' 
                    : isSkipped 
                    ? 'border-gray-200 bg-gray-50'
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    {isCorrect ? (
                      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                    ) : isSkipped ? (
                      <div className="w-5 h-5 rounded-full bg-gray-400 mt-0.5"></div>
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
                    )}
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        Q{question.question_number}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {question.question_type}
                      </Badge>
                    </div>
                    
                    <p className="font-medium text-foreground">
                      {question.question_text}
                    </p>
                    
                    <div className="space-y-1">
                      <div className="flex gap-4 text-sm">
                        <span className="text-warm-gray">{t('testResults.yourAnswer', { defaultValue: 'Your answer:' })}</span>
                        <span className={`font-medium ${
                          isCorrect ? 'text-green-700' : isSkipped ? 'text-gray-500' : 'text-red-700'
                        }`}>
                          {userAnswer || t('testResults.notAnswered', { defaultValue: 'Not answered' })}
                        </span>
                      </div>
                      
                      {!isCorrect && (
                        <div className="flex gap-4 text-sm">
                          <span className="text-warm-gray">{t('testResults.correctAnswer', { defaultValue: 'Correct answer:' })}</span>
                          <span className="font-medium text-green-700">
                            {question.correct_answer}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {question.explanation && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-800">
                          <strong>{t('testResults.explanation', { defaultValue: 'Explanation:' })}</strong> {question.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};

export default TestResults;