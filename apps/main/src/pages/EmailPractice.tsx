import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
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
  ArrowRight, Target, BookOpen, RotateCcw,
  Bold, Italic, Underline, Link, MoreHorizontal,
  Reply, ReplyAll, Forward, User,
  List, ListOrdered, Minus, Plus, Type
} from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';

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

// Universal email scenario types (applicable to all professions)
const SCENARIO_CATEGORIES = [
  { id: 'request', label: 'Request', icon: '📝' },
  { id: 'complaint', label: 'Complaint', icon: '⚠️' },
  { id: 'inquiry', label: 'Inquiry', icon: '❓' },
  { id: 'announcement', label: 'Announcement', icon: '📢' },
  { id: 'custom', label: 'Custom Topic', icon: '✨' },
];

const DIFFICULTY_LEVELS = [
  { id: 'basic', label: 'Basic', color: 'bg-green-100 text-green-700', noteColor: '#5D4E37' },
  { id: 'intermediate', label: 'Intermediate', color: 'bg-yellow-100 text-yellow-700', noteColor: '#5D4E37' },
  { id: 'advanced', label: 'Advanced', color: 'bg-red-100 text-red-700', noteColor: '#5D4E37' },
];

const EmailPractice = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const themeStyles = useThemeStyles();
  const isNoteTheme = themeStyles.theme.name === 'note';

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingScenario, setIsLoadingScenario] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // User's occupation for context
  const [occupation, setOccupation] = useState<string>('');

  // Scenario selection
  const [selectedCategory, setSelectedCategory] = useState('request');
  const [selectedDifficulty, setSelectedDifficulty] = useState('intermediate');
  const [customTopic, setCustomTopic] = useState('');
  const [editorFontSize, setEditorFontSize] = useState(1); // 1 = normal (1rem), 0.9 = small, 1.1 = large, etc.

  // Textarea ref for formatting
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Helper to insert markdown syntax
  const insertFormat = (type: 'bold' | 'italic' | 'underline' | 'bullet' | 'number') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const selection = text.substring(start, end);
    const after = text.substring(end);

    let newText = text;
    let newCursorPos = end;

    if (type === 'bold') {
      newText = `${before}**${selection || 'bold text'}**${after}`;
      newCursorPos = selection ? end + 4 : start + 11;
    } else if (type === 'italic') {
      newText = `${before}_${selection || 'italic text'}_${after}`;
      newCursorPos = selection ? end + 2 : start + 13;
    } else if (type === 'underline') {
      // Just simulate with brackets for plain text or ignore
      newText = `${before}[${selection || 'underlined'}]${after}`;
      newCursorPos = selection ? end + 2 : start + 12;
    } else if (type === 'bullet') {
      newText = `${before}\n• ${selection}${after}`;
      newCursorPos = end + 3;
    } else if (type === 'number') {
      newText = `${before}\n1. ${selection}${after}`;
      newCursorPos = end + 4;
    }

    setResponse(newText);

    // Restore focus and cursor
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const adjustFontSize = (delta: number) => {
    setEditorFontSize(prev => Math.max(0.8, Math.min(1.5, prev + delta)));
  };

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

      if (templates && templates.length > 0 && selectedCategory !== 'custom') {
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
        // Generate AI scenario if no templates available or custom topic selected
        const { data, error: fnError } = await supabase.functions.invoke('email-feedback', {
          body: {
            action: 'generate_scenario',
            category: selectedCategory,
            difficulty: selectedDifficulty,
            occupation: occupation,
            customTopic: selectedCategory === 'custom' ? customTopic : undefined,
          },
        });

        if (fnError) throw fnError;

        if (data.success && data.scenario) {
          setCurrentScenario({
            id: crypto.randomUUID(),
            ...data.scenario,
          });
        } else {
          throw new Error(data.error || 'Failed to generate scenario');
        }
      }
    } catch (error: any) {
      console.error('Error loading scenario:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load email scenario. Please try again.',
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

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message || 'Function call failed');
      }

      console.log('Email feedback response:', data);

      if (data && data.success && data.feedback) {
        setFeedback(data.feedback);
        setShowFeedback(true);

        // Save session to database
        if (user) {
          try {
            await supabase.from('email_practice_sessions').insert({
              user_id: user.id,
              scenario_type: currentScenario.type || selectedCategory,
              scenario_category: currentScenario.category || selectedCategory,
              difficulty_level: currentScenario.difficulty || selectedDifficulty,
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
          } catch (dbError) {
            console.error('Error saving session:', dbError);
            // Don't fail the whole submission if DB save fails
          }

          // Update stats
          setCompletedCount(prev => prev + 1);
          setAverageScore(prev =>
            prev === null
              ? data.feedback.overallScore
              : Math.round((prev * completedCount + data.feedback.overallScore) / (completedCount + 1))
          );
        }
      } else {
        const errorMsg = data?.error || 'Failed to analyze response';
        console.error('API returned error:', errorMsg);
        throw new Error(errorMsg);
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
    <div
      className={`min-h-screen ${isNoteTheme ? 'font-serif' : ''}`}
      style={{ backgroundColor: themeStyles.theme.colors.background }}
    >
      <SEO
        title="Email Practice - Business English"
        description="Master professional email writing with AI-powered feedback. Practice various business scenarios."
        keywords="email writing, business email, professional communication, email practice"
      />

      <StudentLayout title="Email Practice" showBackButton backPath="/business-portal">
        <div className="max-w-6xl mx-auto px-4 space-y-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => navigate('/hero')}
              className="inline-flex items-center gap-1 px-2 py-1 font-medium transition-colors rounded-md hover:bg-muted"
              style={{ color: themeStyles.textSecondary }}
            >
              {!isNoteTheme && <Home className="h-4 w-4" />}
              {isNoteTheme && <span>Home</span>}
            </button>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <button
              onClick={() => navigate('/business-portal')}
              className="font-medium transition-colors hover:bg-muted px-2 py-1 rounded-md"
              style={{ color: themeStyles.textSecondary }}
            >
              Business English
            </button>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium" style={{ color: themeStyles.textPrimary }}>Email Practice</span>
          </div>

          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1
                className={`text-2xl font-bold ${isNoteTheme ? 'font-serif' : ''}`}
                style={{ color: themeStyles.textPrimary }}
              >
                Email Practice
              </h1>
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
                  <p
                    className="text-2xl font-bold"
                    style={{ color: isNoteTheme ? themeStyles.textPrimary : undefined }}
                  >
                    {!isNoteTheme && <span className={getScoreColor(averageScore)}>{averageScore}%</span>}
                    {isNoteTheme && <span>{averageScore}%</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">Avg Score</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {/* Main Content */}
            <div className="w-full">
              {/* Scenario Selection */}
              {!currentScenario && (
                <Card
                  style={{
                    backgroundColor: themeStyles.theme.colors.cardBackground,
                    borderColor: themeStyles.border
                  }}
                >
                  <CardHeader>
                    <CardTitle className={`flex items-center gap-2 ${isNoteTheme ? 'font-serif' : ''}`}>
                      {!isNoteTheme && <Target className="h-5 w-5 text-purple-500" />}
                      Select Scenario
                    </CardTitle>
                    <CardDescription>
                      Choose a category and difficulty level to practice
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Category Selection */}
                    <div>
                      <label className="text-sm font-medium mb-3 block" style={{ color: themeStyles.textPrimary }}>Email Type</label>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {SCENARIO_CATEGORIES.map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => {
                              setSelectedCategory(cat.id);
                              if (cat.id !== 'custom') setCustomTopic('');
                            }}
                            className={`p-4 rounded-lg border-2 transition-all text-center`}
                            style={{
                              borderColor: selectedCategory === cat.id
                                ? (isNoteTheme ? themeStyles.textPrimary : 'rgb(168 85 247)')
                                : themeStyles.border,
                              backgroundColor: selectedCategory === cat.id
                                ? (isNoteTheme ? 'rgba(93, 78, 55, 0.1)' : undefined)
                                : themeStyles.theme.colors.cardBackground
                            }}
                          >
                            {!isNoteTheme && <span className="text-2xl block mb-1">{cat.icon}</span>}
                            <span className="text-sm font-medium" style={{ color: themeStyles.textPrimary }}>{cat.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom Topic Input - Only shown when Custom is selected */}
                    {selectedCategory === 'custom' && (
                      <div>
                        <label className="text-sm font-medium mb-2 block" style={{ color: themeStyles.textPrimary }}>
                          Your Topic
                        </label>
                        <Input
                          value={customTopic}
                          onChange={(e) => setCustomTopic(e.target.value)}
                          placeholder="e.g., asking for promotion, vacation request, resignation notice, project delay, performance review..."
                          style={{
                            backgroundColor: themeStyles.theme.colors.cardBackground,
                            borderColor: themeStyles.border,
                            color: themeStyles.textPrimary
                          }}
                        />
                        <p className="text-xs text-muted-foreground mt-2">
                          Enter any work-related email topic and we'll create a practice scenario for you.
                        </p>
                      </div>
                    )}

                    {/* Difficulty Selection */}
                    <div>
                      <label className="text-sm font-medium mb-3 block" style={{ color: themeStyles.textPrimary }}>Difficulty</label>
                      <div className="flex gap-3">
                        {DIFFICULTY_LEVELS.map((level) => (
                          <button
                            key={level.id}
                            onClick={() => setSelectedDifficulty(level.id)}
                            className={`flex-1 p-3 rounded-lg border-2 transition-all`}
                            style={{
                              borderColor: selectedDifficulty === level.id
                                ? (isNoteTheme ? themeStyles.textPrimary : 'rgb(168 85 247)')
                                : themeStyles.border,
                              backgroundColor: themeStyles.theme.colors.cardBackground
                            }}
                          >
                            {isNoteTheme ? (
                              <span className="text-sm font-medium" style={{ color: themeStyles.textPrimary }}>{level.label}</span>
                            ) : (
                              <Badge className={level.color}>{level.label}</Badge>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    <Button
                      onClick={loadNewScenario}
                      disabled={isLoadingScenario || (selectedCategory === 'custom' && !customTopic.trim())}
                      className={`w-full ${!isNoteTheme ? 'bg-gradient-to-r from-purple-500 to-pink-500' : ''}`}
                      size="lg"
                      style={{
                        backgroundColor: isNoteTheme ? themeStyles.buttonPrimary : undefined,
                        color: isNoteTheme ? '#FFF' : undefined
                      }}
                    >
                      {isLoadingScenario ? 'Generating...' : 'Start Practice'}
                      {!isNoteTheme && <ArrowRight className="h-4 w-4 ml-2" />}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Email Scenario */}
              {currentScenario && !showFeedback && (
                <div className="w-full mx-auto" style={{ maxWidth: '1000px' }}>
                  {/* Outlook-style Email Container */}
                  <div
                    className="rounded-xl overflow-hidden shadow-sm border transition-shadow duration-300"
                    style={{
                      backgroundColor: themeStyles.theme.colors.cardBackground,
                      borderColor: themeStyles.border,
                      boxShadow: isNoteTheme ? '2px 2px 10px rgba(93, 78, 55, 0.1)' : '0 4px 20px -2px rgba(0, 0, 0, 0.05)'
                    }}
                  >
                    {/* 1. Header Section (Subject) */}
                    <div className="px-6 py-5 border-b" style={{ borderColor: isNoteTheme ? 'rgba(93, 78, 55, 0.1)' : 'rgba(0,0,0,0.05)' }}>
                      <div className="flex items-start justify-between">
                        <div>
                          <h1
                            className={`text-2xl font-semibold mb-2 ${isNoteTheme ? 'font-serif' : 'tracking-tight'}`}
                            style={{ color: themeStyles.textPrimary }}
                          >
                            {currentScenario.subject}
                          </h1>
                          <div className="flex items-center gap-2">
                            {isNoteTheme ? (
                              <span
                                className="text-xs font-medium px-2 py-0.5 rounded border"
                                style={{
                                  borderColor: themeStyles.textPrimary,
                                  color: themeStyles.textPrimary
                                }}
                              >
                                {currentScenario.difficulty}
                              </span>
                            ) : (
                              <Badge variant="secondary" className="font-normal">
                                {currentScenario.category}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">• Inbox</span>
                          </div>
                        </div>

                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={loadNewScenario}
                            disabled={isLoadingScenario}
                            title="New Scenario"
                            style={{ color: themeStyles.textSecondary }}
                          >
                            {!isNoteTheme ? <RotateCcw className="h-4 w-4" /> : <span className="text-xs border px-1 rounded">New</span>}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* 2. Sender Info Row */}
                    <div className="px-6 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold"
                          style={{
                            backgroundColor: isNoteTheme ? themeStyles.textPrimary : '#3b82f6',
                            color: '#fff'
                          }}
                        >
                          {currentScenario.from.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold" style={{ color: themeStyles.textPrimary }}>
                            {currentScenario.from.split('<')[0].trim()}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {currentScenario.from.includes('<') ? currentScenario.from.match(/<([^>]+)>/)?.[1] : 'sender@example.com'}
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground flex flex-col items-end">
                        <span>{new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                        <span>{new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>

                    {/* 3. Email Body */}
                    <div
                      className="px-6 py-4 min-h-[120px]"
                      style={{
                        fontFamily: isNoteTheme ? 'serif' : 'sans-serif',
                        color: themeStyles.textPrimary,
                        fontSize: isNoteTheme ? '1.05rem' : '0.95rem',
                        lineHeight: '1.7'
                      }}
                    >
                      <div className="whitespace-pre-wrap">{currentScenario.body}</div>
                    </div>

                    {/* Instructions Block (Subtle) */}
                    {currentScenario.instructions && (
                      <div className="px-6 pb-6">
                        <div
                          className="flex items-start gap-2 p-3 rounded text-sm"
                          style={{
                            backgroundColor: isNoteTheme ? 'rgba(93, 78, 55, 0.05)' : '#f3f4f6',
                            color: isNoteTheme ? themeStyles.textPrimary : '#4b5563'
                          }}
                        >
                          <Lightbulb className="h-4 w-4 mt-0.5 shrink-0 opacity-70" />
                          <span><strong>Task:</strong> {currentScenario.instructions}</span>
                        </div>
                      </div>
                    )}

                    {/* 4. Action Bar (Reply Buttons) */}
                    <div className="px-4 py-2 border-t border-b flex items-center gap-2 bg-opacity-50" style={{ borderColor: themeStyles.border, backgroundColor: isNoteTheme ? 'rgba(0,0,0,0.02)' : 'rgba(249,250,251,0.5)' }}>
                      <p className="text-xs text-muted-foreground ml-2 mr-auto" style={{ fontStyle: 'italic' }}>Reply to this email below</p>
                    </div>

                    {/* 5. Reply Editor (Docked) */}
                    <div className="p-6 pt-4" style={{ backgroundColor: isNoteTheme ? 'transparent' : '#fff' }}>
                      <div
                        className="border rounded-lg overflow-hidden shadow-sm transition-all focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-300"
                        style={{ borderColor: themeStyles.border }}
                      >
                        {/* Mock Toolbar */}
                        <div className="flex items-center gap-1 p-2 border-b bg-gray-50/50" style={{ borderColor: themeStyles.border, backgroundColor: isNoteTheme ? 'rgba(93, 78, 55, 0.05)' : '#f9fafb' }}>
                          <Button
                            variant="ghost" size="sm" className="h-7 w-7 p-0" title="Bold (Ctrl+B)"
                            onClick={() => insertFormat('bold')}
                            style={{ color: themeStyles.textPrimary }}
                          >
                            <Bold className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="sm" className="h-7 w-7 p-0" title="Italic (Ctrl+I)"
                            onClick={() => insertFormat('italic')}
                            style={{ color: themeStyles.textPrimary }}
                          >
                            <Italic className="h-3.5 w-3.5" />
                          </Button>

                          <div className="w-px h-4 bg-gray-200 mx-1" style={{ backgroundColor: themeStyles.border }} />

                          <Button
                            variant="ghost" size="sm" className="h-7 w-7 p-0" title="Bullet List"
                            onClick={() => insertFormat('bullet')}
                            style={{ color: themeStyles.textPrimary }}
                          >
                            <List className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="sm" className="h-7 w-7 p-0" title="Numbered List"
                            onClick={() => insertFormat('number')}
                            style={{ color: themeStyles.textPrimary }}
                          >
                            <ListOrdered className="h-3.5 w-3.5" />
                          </Button>

                          <div className="w-px h-4 bg-gray-200 mx-1" style={{ backgroundColor: themeStyles.border }} />

                          {/* Text Size Controls */}
                          <div className="flex items-center border rounded px-1 group hover:border-gray-400" style={{ borderColor: themeStyles.border }}>
                            <Button
                              variant="ghost" size="sm" className="h-6 w-6 p-0" title="Decrease Font Size"
                              onClick={() => adjustFontSize(-0.1)}
                              style={{ color: themeStyles.textPrimary }}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Type className="h-3 w-3 mx-1 opacity-50" style={{ color: themeStyles.textPrimary }} />
                            <Button
                              variant="ghost" size="sm" className="h-6 w-6 p-0" title="Increase Font Size"
                              onClick={() => adjustFontSize(0.1)}
                              style={{ color: themeStyles.textPrimary }}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>

                          <div className="ml-auto">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" style={{ color: themeStyles.textPrimary }}>
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        {/* Actual Textarea */}
                        <Textarea
                          ref={textareaRef}
                          value={response}
                          onChange={(e) => setResponse(e.target.value)}
                          placeholder="Type your response here..."
                          className="min-h-[250px] border-0 focus-visible:ring-0 resize-none p-4 rounded-none"
                          style={{
                            fontFamily: isNoteTheme ? 'serif' : 'sans-serif',
                            fontSize: isNoteTheme ? `${1.05 * editorFontSize}rem` : `${0.95 * editorFontSize}rem`,
                            lineHeight: '1.6',
                            color: themeStyles.textPrimary,
                            backgroundColor: 'transparent'
                          }}
                        />
                      </div>

                      {/* Footer Actions */}
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-3">
                          <Button
                            onClick={submitResponse}
                            disabled={isSubmitting || !response.trim()}
                            className={!isNoteTheme ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm' : ''}
                            style={{
                              backgroundColor: isNoteTheme ? themeStyles.buttonPrimary : undefined,
                              color: '#fff',
                              paddingLeft: '1.5rem',
                              paddingRight: '1.5rem'
                            }}
                          >
                            {isSubmitting ? 'Sending...' : 'Send'}
                            {!isSubmitting && <Send className="h-3.5 w-3.5 ml-2" />}
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => setResponse('')}
                            className="text-muted-foreground hover:text-red-500"
                          >
                            Discard
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {response.length} characters
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Feedback Display */}
              {showFeedback && feedback && (
                <>
                  {/* Overall Score */}
                  <Card
                    style={{
                      backgroundColor: themeStyles.theme.colors.cardBackground,
                      borderColor: themeStyles.border
                    }}
                  >
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div
                          className={`text-5xl font-bold ${isNoteTheme ? 'font-serif' : ''}`}
                          style={{ color: isNoteTheme ? themeStyles.textPrimary : undefined }}
                        >
                          {!isNoteTheme && <span className={getScoreColor(feedback.overallScore)}>{feedback.overallScore}%</span>}
                          {isNoteTheme && <span>{feedback.overallScore}%</span>}
                        </div>
                        <p
                          className="text-lg font-medium mt-1"
                          style={{ color: themeStyles.textPrimary }}
                        >
                          {getScoreLabel(feedback.overallScore)}
                        </p>
                        <Progress value={feedback.overallScore} className="mt-4 h-3" />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Detailed Feedback */}
                  <Card
                    style={{
                      backgroundColor: themeStyles.theme.colors.cardBackground,
                      borderColor: themeStyles.border
                    }}
                  >
                    <CardHeader>
                      <CardTitle
                        className={`flex items-center gap-2 ${isNoteTheme ? 'font-serif' : ''}`}
                        style={{ color: themeStyles.textPrimary }}
                      >
                        {!isNoteTheme && <Sparkles className="h-5 w-5 text-purple-500" />}
                        Detailed Feedback
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {feedback.items.map((item, index) => (
                        <div
                          key={index}
                          className="p-4 rounded-lg"
                          style={{
                            backgroundColor: isNoteTheme ? 'rgba(93, 78, 55, 0.05)' : undefined
                          }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span
                              className="font-medium capitalize"
                              style={{ color: themeStyles.textPrimary }}
                            >
                              {item.category}
                            </span>
                            <span
                              className="font-bold"
                              style={{ color: isNoteTheme ? themeStyles.textPrimary : undefined }}
                            >
                              {!isNoteTheme && <span className={getScoreColor(item.score)}>{item.score}/100</span>}
                              {isNoteTheme && <span>{item.score}/100</span>}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{item.feedback}</p>
                          {item.suggestions.length > 0 && (
                            <ul className="text-sm space-y-1">
                              {item.suggestions.map((suggestion, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  {!isNoteTheme && <Lightbulb className="h-3 w-3 mt-1 text-yellow-500 flex-shrink-0" />}
                                  {isNoteTheme && <span style={{ color: themeStyles.textSecondary }}>•</span>}
                                  <span style={{ color: themeStyles.textPrimary }}>{suggestion}</span>
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
                    <Card
                      style={{
                        backgroundColor: themeStyles.theme.colors.cardBackground,
                        borderColor: themeStyles.border
                      }}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle
                          className={`text-sm flex items-center gap-2 ${isNoteTheme ? 'font-serif' : 'text-green-600'}`}
                          style={{ color: isNoteTheme ? themeStyles.textPrimary : undefined }}
                        >
                          {!isNoteTheme && <CheckCircle2 className="h-4 w-4" />}
                          Strengths
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="text-sm space-y-2">
                          {feedback.strengths.map((strength, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              {!isNoteTheme && <span className="text-green-500">✓</span>}
                              {isNoteTheme && <span style={{ color: themeStyles.textSecondary }}>•</span>}
                              <span style={{ color: themeStyles.textPrimary }}>{strength}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>

                    <Card
                      style={{
                        backgroundColor: themeStyles.theme.colors.cardBackground,
                        borderColor: themeStyles.border
                      }}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle
                          className={`text-sm flex items-center gap-2 ${isNoteTheme ? 'font-serif' : 'text-orange-600'}`}
                          style={{ color: isNoteTheme ? themeStyles.textPrimary : undefined }}
                        >
                          {!isNoteTheme && <AlertCircle className="h-4 w-4" />}
                          Areas to Improve
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="text-sm space-y-2">
                          {feedback.improvements.map((improvement, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              {!isNoteTheme && <span className="text-orange-500">→</span>}
                              {isNoteTheme && <span style={{ color: themeStyles.textSecondary }}>•</span>}
                              <span style={{ color: themeStyles.textPrimary }}>{improvement}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Improved Version */}
                  {feedback.improvedVersion && (
                    <Card
                      style={{
                        backgroundColor: themeStyles.theme.colors.cardBackground,
                        borderColor: themeStyles.border
                      }}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle
                          className={`text-sm flex items-center gap-2 ${isNoteTheme ? 'font-serif' : ''}`}
                          style={{ color: themeStyles.textPrimary }}
                        >
                          {!isNoteTheme && <BookOpen className="h-4 w-4 text-blue-500" />}
                          Suggested Improved Version
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div
                          className="rounded-lg p-4 whitespace-pre-wrap"
                          style={{
                            backgroundColor: isNoteTheme ? 'rgba(93, 78, 55, 0.05)' : undefined,
                            fontFamily: isNoteTheme ? 'serif' : 'monospace',
                            color: themeStyles.textPrimary,
                            fontSize: isNoteTheme ? '1.05rem' : '0.95rem',
                            lineHeight: '1.7'
                          }}
                        >
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
                      style={{
                        borderColor: themeStyles.border,
                        color: themeStyles.textPrimary
                      }}
                    >
                      {!isNoteTheme && <RefreshCw className="h-4 w-4 mr-2" />}
                      Try Again
                    </Button>
                    <Button
                      onClick={loadNewScenario}
                      disabled={isLoadingScenario}
                      className={`flex-1 ${!isNoteTheme ? 'bg-gradient-to-r from-purple-500 to-pink-500' : ''}`}
                      style={{
                        backgroundColor: isNoteTheme ? themeStyles.buttonPrimary : undefined,
                        color: isNoteTheme ? '#FFF' : undefined
                      }}
                    >
                      {isLoadingScenario ? 'Loading...' : 'New Scenario'}
                      {!isNoteTheme && <ArrowRight className="h-4 w-4 ml-2" />}
                    </Button>
                  </div>
                </>
              )}
            </div>

            {/* Bottom Section: Tips & Phrases */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              <Card
                className="h-full"
                style={{
                  backgroundColor: themeStyles.theme.colors.cardBackground,
                  borderColor: themeStyles.border
                }}
              >
                <CardHeader className="pb-3">
                  <CardTitle
                    className={`text-lg flex items-center gap-2 ${isNoteTheme ? 'font-serif' : ''}`}
                    style={{ color: themeStyles.textPrimary }}
                  >
                    {!isNoteTheme && <Lightbulb className="h-5 w-5 text-yellow-500" />}
                    Email Writing Tips
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p><strong style={{ color: themeStyles.textPrimary }}>Structure:</strong> Use a clear greeting, body paragraphs, and sign-off</p>
                  <p><strong style={{ color: themeStyles.textPrimary }}>Tone:</strong> Match formality to the context and recipient</p>
                  <p><strong style={{ color: themeStyles.textPrimary }}>Clarity:</strong> Be concise - get to the point quickly</p>
                  <p><strong style={{ color: themeStyles.textPrimary }}>Action:</strong> Clearly state what you need or expect</p>
                  <p><strong style={{ color: themeStyles.textPrimary }}>Proofread:</strong> Check spelling and grammar before sending</p>
                </CardContent>
              </Card>

              <Card
                className="h-full"
                style={{
                  backgroundColor: themeStyles.theme.colors.cardBackground,
                  borderColor: themeStyles.border
                }}
              >
                <CardHeader className="pb-3">
                  <CardTitle
                    className={`text-lg ${isNoteTheme ? 'font-serif' : ''}`}
                    style={{ color: themeStyles.textPrimary }}
                  >
                    Professional Phrases
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="text-muted-foreground">Opening:</p>
                  <p className={isNoteTheme ? 'font-serif' : 'italic'} style={{ color: themeStyles.textPrimary }}>"I hope this email finds you well."</p>
                  <p className={isNoteTheme ? 'font-serif' : 'italic'} style={{ color: themeStyles.textPrimary }}>"Thank you for your prompt response."</p>

                  <p className="text-muted-foreground mt-3">Requesting:</p>
                  <p className={isNoteTheme ? 'font-serif' : 'italic'} style={{ color: themeStyles.textPrimary }}>"I would appreciate it if you could..."</p>
                  <p className={isNoteTheme ? 'font-serif' : 'italic'} style={{ color: themeStyles.textPrimary }}>"Could you please advise on..."</p>

                  <p className="text-muted-foreground mt-3">Closing:</p>
                  <p className={isNoteTheme ? 'font-serif' : 'italic'} style={{ color: themeStyles.textPrimary }}>"Please let me know if you need any further information."</p>
                  <p className={isNoteTheme ? 'font-serif' : 'italic'} style={{ color: themeStyles.textPrimary }}>"I look forward to hearing from you."</p>
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

