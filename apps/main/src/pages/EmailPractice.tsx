import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import StudentLayout from '@/components/StudentLayout';
import { supabase } from '@/integrations/supabase/client';
import LoadingAnimation from '@/components/animations/LoadingAnimation';
import SEO from '@/components/SEO';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useThemeStyles } from '@/hooks/useThemeStyles';
import {
  Mail, Send, RefreshCw, ChevronRight, Home, Sparkles,
  CheckCircle2, AlertCircle, Lightbulb, MessageSquare,
  ArrowRight, Target, BookOpen, RotateCcw
} from 'lucide-react';

// Email scenario types
interface EmailScenario {
  id: string;
  type: string;
  category: string;
  difficulty: string;
  subject: string;
  from: string;
  body: string;
  instructions: string;
}

interface FeedbackItem {
  category: string;
  score: number;
  feedback: string;
  suggestions: string[];
}

interface EmailFeedback {
  overallScore: number;
  items: FeedbackItem[];
  improvedVersion: string;
  strengths: string[];
  improvements: string[];
}

// Preset scenarios
const SCENARIO_CATEGORIES = [
  { id: 'business', label: 'Business', icon: '💼' },
  { id: 'tech', label: 'Technology', icon: '💻' },
  { id: 'healthcare', label: 'Healthcare', icon: '🏥' },
  { id: 'general', label: 'General', icon: '📧' },
];

const DIFFICULTY_LEVELS = [
  { id: 'basic', label: 'Basic', color: 'bg-green-100 text-green-700' },
  { id: 'intermediate', label: 'Intermediate', color: 'bg-yellow-100 text-yellow-700' },
  { id: 'advanced', label: 'Advanced', color: 'bg-red-100 text-red-700' },
];

const EmailPractice = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const themeStyles = useThemeStyles();

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingScenario, setIsLoadingScenario] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // User's occupation for context
  const [occupation, setOccupation] = useState<string>('');

  // Scenario selection
  const [selectedCategory, setSelectedCategory] = useState('business');
  const [selectedDifficulty, setSelectedDifficulty] = useState('intermediate');

  // Current scenario
  const [currentScenario, setCurrentScenario] = useState<EmailScenario | null>(null);

  // Student response
  const [response, setResponse] = useState('');

  // Feedback
  const [feedback, setFeedback] = useState<EmailFeedback | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  // Stats
  const [completedCount, setCompletedCount] = useState(0);
  const [averageScore, setAverageScore] = useState<number | null>(null);

  // Load user's business profile and stats
  useEffect(() => {
    const loadUserData = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        // Load business profile
        const { data: profile } = await supabase
          .from('business_profiles')
          .select('occupation, industry')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profile) {
          setOccupation(profile.occupation);
        }

        // Load stats
        const { data: sessions, error } = await supabase
          .from('email_practice_sessions')
          .select('overall_score')
          .eq('user_id', user.id)
          .not('overall_score', 'is', null);

        if (sessions && sessions.length > 0) {
          setCompletedCount(sessions.length);
          const avg = sessions.reduce((sum, s) => sum + (s.overall_score || 0), 0) / sessions.length;
          setAverageScore(Math.round(avg));
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [user]);

  const loadNewScenario = async () => {
    setIsLoadingScenario(true);
    setFeedback(null);
    setShowFeedback(false);
    setResponse('');

    try {
      // Try to load from preset templates first
      const { data: templates, error } = await supabase
        .from('email_scenario_templates')
        .select('*')
        .eq('scenario_category', selectedCategory)
        .eq('difficulty_level', selectedDifficulty)
        .eq('is_active', true);

      if (templates && templates.length > 0) {
        // Pick a random template
        const template = templates[Math.floor(Math.random() * templates.length)];
        setCurrentScenario({
          id: template.id,
          type: template.scenario_type,
          category: template.scenario_category,
          difficulty: template.difficulty_level,
          subject: template.subject_template,
          from: template.from_template,
          body: template.body_template,
          instructions: template.instructions || 'Reply professionally to this email.',
        });
      } else {
        // Generate AI scenario if no templates available
        const { data, error: fnError } = await supabase.functions.invoke('email-feedback', {
          body: {
            action: 'generate_scenario',
            category: selectedCategory,
            difficulty: selectedDifficulty,
            occupation: occupation,
          },
        });

        if (fnError) throw fnError;

        if (data.success && data.scenario) {
          setCurrentScenario({
            id: crypto.randomUUID(),
            ...data.scenario,
          });
        } else {
          throw new Error('Failed to generate scenario');
        }
      }
    } catch (error) {
      console.error('Error loading scenario:', error);
      toast({
        title: 'Error',
        description: 'Failed to load email scenario. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingScenario(false);
    }
  };

  const submitResponse = async () => {
    if (!response.trim()) {
      toast({
        title: 'Empty response',
        description: 'Please write your email response before submitting.',
        variant: 'destructive',
      });
      return;
    }

    if (!currentScenario) return;

    setIsSubmitting(true);

    try {
      // Get AI feedback
      const { data, error } = await supabase.functions.invoke('email-feedback', {
        body: {
          action: 'analyze_response',
          scenario: currentScenario,
          response: response,
          occupation: occupation,
        },
      });

      if (error) throw error;

      if (data.success && data.feedback) {
        setFeedback(data.feedback);
        setShowFeedback(true);

        // Save session to database
        if (user) {
          await supabase.from('email_practice_sessions').insert({
            user_id: user.id,
            scenario_type: currentScenario.type,
            scenario_category: currentScenario.category,
            difficulty_level: currentScenario.difficulty,
            context_subject: currentScenario.subject,
            context_from: currentScenario.from,
            context_body: currentScenario.body,
            context_instructions: currentScenario.instructions,
            student_response: response,
            response_submitted_at: new Date().toISOString(),
            feedback: data.feedback,
            overall_score: data.feedback.overallScore,
            improved_version: data.feedback.improvedVersion,
          });

          // Update stats
          setCompletedCount(prev => prev + 1);
          setAverageScore(prev => 
            prev === null 
              ? data.feedback.overallScore 
              : Math.round((prev * completedCount + data.feedback.overallScore) / (completedCount + 1))
          );
        }
      } else {
        throw new Error(data.error || 'Failed to analyze response');
      }
    } catch (error) {
      console.error('Error submitting response:', error);
      toast({
        title: 'Error',
        description: 'Failed to analyze your response. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Very Good';
    if (score >= 70) return 'Good';
    if (score >= 60) return 'Needs Work';
    return 'Practice More';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: themeStyles.theme.colors.background }}>
        <LoadingAnimation />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: themeStyles.theme.colors.background }}>
      <SEO
        title="Email Practice - Business English"
        description="Master professional email writing with AI-powered feedback. Practice various business scenarios."
        keywords="email writing, business email, professional communication, email practice"
      />

      <StudentLayout title="Email Practice" showBackButton backPath="/business-portal">
        <div className="max-w-6xl mx-auto px-4 space-y-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            <button onClick={() => navigate('/hero')} className="text-muted-foreground hover:text-primary">
              <Home className="h-4 w-4" />
            </button>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <button onClick={() => navigate('/business-portal')} className="text-muted-foreground hover:text-primary">
              Business English
            </button>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span style={{ color: themeStyles.textPrimary }}>Email Practice</span>
          </div>

          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: themeStyles.textPrimary }}>Email Practice</h1>
              <p className="text-muted-foreground">Master professional email communication</p>
            </div>
            {/* Stats */}
            <div className="flex gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold" style={{ color: themeStyles.textPrimary }}>{completedCount}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
              {averageScore !== null && (
                <div className="text-center">
                  <p className={`text-2xl font-bold ${getScoreColor(averageScore)}`}>{averageScore}%</p>
                  <p className="text-xs text-muted-foreground">Avg Score</p>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Scenario Selection */}
              {!currentScenario && (
                <Card style={{ backgroundColor: themeStyles.theme.colors.cardBackground }}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-purple-500" />
                      Select Scenario
                    </CardTitle>
                    <CardDescription>
                      Choose a category and difficulty level to practice
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Category Selection */}
                    <div>
                      <label className="text-sm font-medium mb-3 block">Category</label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {SCENARIO_CATEGORIES.map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`p-4 rounded-lg border-2 transition-all text-center ${
                              selectedCategory === cat.id
                                ? 'border-purple-500 bg-purple-50 dark:bg-purple-950'
                                : 'border-border hover:border-purple-300'
                            }`}
                          >
                            <span className="text-2xl block mb-1">{cat.icon}</span>
                            <span className="text-sm font-medium">{cat.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Difficulty Selection */}
                    <div>
                      <label className="text-sm font-medium mb-3 block">Difficulty</label>
                      <div className="flex gap-3">
                        {DIFFICULTY_LEVELS.map((level) => (
                          <button
                            key={level.id}
                            onClick={() => setSelectedDifficulty(level.id)}
                            className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                              selectedDifficulty === level.id
                                ? 'border-purple-500'
                                : 'border-border hover:border-purple-300'
                            }`}
                          >
                            <Badge className={level.color}>{level.label}</Badge>
                          </button>
                        ))}
                      </div>
                    </div>

                    <Button 
                      onClick={loadNewScenario} 
                      disabled={isLoadingScenario}
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-500"
                      size="lg"
                    >
                      {isLoadingScenario ? 'Loading...' : 'Start Practice'}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Email Scenario */}
              {currentScenario && !showFeedback && (
                <>
                  {/* Incoming Email */}
                  <Card style={{ backgroundColor: themeStyles.theme.colors.cardBackground }}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <Badge className={DIFFICULTY_LEVELS.find(d => d.id === currentScenario.difficulty)?.color}>
                            {currentScenario.difficulty}
                          </Badge>
                          <CardTitle className="mt-2 text-lg">{currentScenario.subject}</CardTitle>
                          <CardDescription>From: {currentScenario.from}</CardDescription>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setCurrentScenario(null);
                            setResponse('');
                          }}
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          New
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 font-mono text-sm whitespace-pre-wrap">
                        {currentScenario.body}
                      </div>
                      {currentScenario.instructions && (
                        <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-950 rounded-lg flex items-start gap-2">
                          <Lightbulb className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-purple-700 dark:text-purple-300">
                            <strong>Instructions:</strong> {currentScenario.instructions}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Response Editor */}
                  <Card style={{ backgroundColor: themeStyles.theme.colors.cardBackground }}>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <MessageSquare className="h-5 w-5 text-purple-500" />
                        Your Reply
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Textarea
                        value={response}
                        onChange={(e) => setResponse(e.target.value)}
                        placeholder="Dear [Name],

Write your professional email response here...

Best regards,
[Your Name]"
                        rows={12}
                        className="font-mono"
                      />
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          {response.length} characters
                        </p>
                        <Button 
                          onClick={submitResponse}
                          disabled={isSubmitting || !response.trim()}
                        >
                          {isSubmitting ? 'Analyzing...' : 'Submit for Feedback'}
                          <Send className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              {/* Feedback Display */}
              {showFeedback && feedback && (
                <>
                  {/* Overall Score */}
                  <Card style={{ backgroundColor: themeStyles.theme.colors.cardBackground }}>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className={`text-5xl font-bold ${getScoreColor(feedback.overallScore)}`}>
                          {feedback.overallScore}%
                        </div>
                        <p className="text-lg font-medium mt-1">{getScoreLabel(feedback.overallScore)}</p>
                        <Progress value={feedback.overallScore} className="mt-4 h-3" />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Detailed Feedback */}
                  <Card style={{ backgroundColor: themeStyles.theme.colors.cardBackground }}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-purple-500" />
                        Detailed Feedback
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {feedback.items.map((item, index) => (
                        <div key={index} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium capitalize">{item.category}</span>
                            <span className={`font-bold ${getScoreColor(item.score)}`}>
                              {item.score}/100
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{item.feedback}</p>
                          {item.suggestions.length > 0 && (
                            <ul className="text-sm space-y-1">
                              {item.suggestions.map((suggestion, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <Lightbulb className="h-3 w-3 mt-1 text-yellow-500 flex-shrink-0" />
                                  <span>{suggestion}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Strengths & Improvements */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card style={{ backgroundColor: themeStyles.theme.colors.cardBackground }}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2 text-green-600">
                          <CheckCircle2 className="h-4 w-4" />
                          Strengths
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="text-sm space-y-2">
                          {feedback.strengths.map((strength, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-green-500">✓</span>
                              {strength}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>

                    <Card style={{ backgroundColor: themeStyles.theme.colors.cardBackground }}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2 text-orange-600">
                          <AlertCircle className="h-4 w-4" />
                          Areas to Improve
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="text-sm space-y-2">
                          {feedback.improvements.map((improvement, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-orange-500">→</span>
                              {improvement}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Improved Version */}
                  {feedback.improvedVersion && (
                    <Card style={{ backgroundColor: themeStyles.theme.colors.cardBackground }}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-blue-500" />
                          Suggested Improved Version
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4 font-mono text-sm whitespace-pre-wrap">
                          {feedback.improvedVersion}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setShowFeedback(false);
                        setResponse('');
                      }}
                      className="flex-1"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Try Again
                    </Button>
                    <Button 
                      onClick={() => {
                        setCurrentScenario(null);
                        setFeedback(null);
                        setShowFeedback(false);
                        setResponse('');
                      }}
                      className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500"
                    >
                      New Scenario
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </>
              )}
            </div>

            {/* Right Sidebar - Tips */}
            <div className="space-y-6">
              <Card style={{ backgroundColor: themeStyles.theme.colors.cardBackground }}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-yellow-500" />
                    Email Writing Tips
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p><strong>Structure:</strong> Use a clear greeting, body paragraphs, and sign-off</p>
                  <p><strong>Tone:</strong> Match formality to the context and recipient</p>
                  <p><strong>Clarity:</strong> Be concise - get to the point quickly</p>
                  <p><strong>Action:</strong> Clearly state what you need or expect</p>
                  <p><strong>Proofread:</strong> Check spelling and grammar before sending</p>
                </CardContent>
              </Card>

              <Card style={{ backgroundColor: themeStyles.theme.colors.cardBackground }}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Professional Phrases</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="text-muted-foreground">Opening:</p>
                  <p className="italic">"I hope this email finds you well."</p>
                  <p className="italic">"Thank you for your prompt response."</p>
                  
                  <p className="text-muted-foreground mt-3">Requesting:</p>
                  <p className="italic">"I would appreciate it if you could..."</p>
                  <p className="italic">"Could you please advise on..."</p>
                  
                  <p className="text-muted-foreground mt-3">Closing:</p>
                  <p className="italic">"Please let me know if you need any further information."</p>
                  <p className="italic">"I look forward to hearing from you."</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </StudentLayout>
    </div>
  );
};

export default EmailPractice;

