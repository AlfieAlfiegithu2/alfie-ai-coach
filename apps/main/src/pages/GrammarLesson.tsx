import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StudentLayout from '@/components/StudentLayout';
import { supabase } from '@/integrations/supabase/client';
import LoadingAnimation from '@/components/animations/LoadingAnimation';
import SEO from '@/components/SEO';
import { useAuth } from '@/hooks/useAuth';
import { useThemeStyles } from '@/hooks/useThemeStyles';
import { GrammarExercise, ExerciseData } from '@/components/grammar';
import {
  BookOpen,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Play,
  Trophy,
  Star,
  Lightbulb,
  Target,
  AlertCircle,
  RotateCcw,
  Home,
  Globe
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from '@/lib/utils';

interface GrammarTopic {
  id: string | number;
  slug: string;
  level: string;
  title?: string;
  description?: string;
}

interface LessonContent {
  id: string | number;
  theory_title: string;
  theory_definition: string;
  theory_formation: string;
  theory_usage: string;
  theory_common_mistakes: string;
  rules: Array<{ title: string; formula: string; example: string }>;
  examples: Array<{ sentence: string; translation?: string; explanation?: string; highlight?: string; correct: boolean }>;
  localized_tips: string;
}

interface Exercise {
  id: string | number;
  exercise_type: string;
  difficulty: number;
  exercise_order: number;
  correct_order?: string[];
  transformation_type?: string;
  translations: {
    question: string;
    instruction?: string;
    correct_answer: string;
    incorrect_answers?: string[];
    explanation?: string;
    hint?: string;
    sentence_with_blank?: string;
    incorrect_sentence?: string;
    original_sentence?: string;
  };
}

// Supported languages for grammar content
const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'zh', name: '中文' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'ar', name: 'العربية' },
  { code: 'pt', name: 'Português' },
  { code: 'bn', name: 'বাংলা' },
  { code: 'ru', name: 'Русский' },
  { code: 'ja', name: '日本語' },
  { code: 'de', name: 'Deutsch' },
  { code: 'fr', name: 'Français' },
  { code: 'ko', name: '한국어' },
  { code: 'vi', name: 'Tiếng Việt' },
  { code: 'it', name: 'Italiano' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'th', name: 'ไทย' },
  { code: 'pl', name: 'Polski' },
  { code: 'nl', name: 'Nederlands' },
  { code: 'id', name: 'Bahasa Indonesia' },
  { code: 'uk', name: 'Українська' },
  { code: 'ms', name: 'Bahasa Melayu' },
  { code: 'fa', name: 'فارسی' },
  { code: 'tl', name: 'Tagalog' },
  { code: 'ro', name: 'Română' },
  { code: 'el', name: 'Ελληνικά' },
  { code: 'cs', name: 'Čeština' },
  { code: 'sv', name: 'Svenska' },
  { code: 'hu', name: 'Magyar' },
  { code: 'he', name: 'עברית' },
];

const GrammarLesson = () => {
  const { topicSlug } = useParams();
  const navigate = useNavigate();
  const { i18n, t } = useTranslation();
  const { user } = useAuth();
  const themeStyles = useThemeStyles();
  const isNoteTheme = themeStyles.theme.name === 'note';

  const [topic, setTopic] = useState<GrammarTopic | null>(null);
  const [lesson, setLesson] = useState<LessonContent | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'theory' | 'exercises'>('theory');
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [completedExercises, setCompletedExercises] = useState<Set<string | number>>(new Set());
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [theoryCompleted, setTheoryCompleted] = useState(false);

  const selectedLanguage = i18n.language || 'en';

  // Handle language change
  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    localStorage.setItem('alfie-language', langCode);
  };

  useEffect(() => {
    let isMounted = true;

    const loadLessonData = async () => {
      if (!topicSlug) return;

      setIsLoading(true);
      try {
        const languageCode = selectedLanguage;
        let currentTopicId: string | number | null = null;

        // 1. Fetch Topic and Translations in one go
        const { data: topicResult, error: topicError } = await (supabase as any)
          .from('grammar_topics')
          .select(`
            id,
            slug,
            level,
            grammar_topic_translations(title, description, language_code)
          `)
          .eq('slug', topicSlug)
          .maybeSingle();

        if (!isMounted) return;
        if (topicError) throw topicError;

        if (topicResult) {
          currentTopicId = (topicResult as any).id;

          // Select best translation
          const translations = ((topicResult as any).grammar_topic_translations as any[]) || [];
          const bestTranslation = translations.find((t: any) => t.language_code === languageCode)
            || translations.find((t: any) => t.language_code === 'en')
            || translations[0]
            || {} as any;

          setTopic({
            id: (topicResult as any).id,
            slug: (topicResult as any).slug,
            level: (topicResult as any).level,
            title: bestTranslation.title || topicSlug?.replace(/-/g, ' '),
            description: bestTranslation.description || '',
          });
        } else {
          setTopic(null);
          setIsLoading(false);
          return; // Stop if topic not found
        }

        if (!isMounted) return;

        if (currentTopicId) {
          // 2. Fetch Lesson, Exercises, and Progress in Parallel
          const [lessonResult, exercisesResult, progressResult] = await Promise.all([
            // Fetch Lesson Content
            (supabase as any)
              .from('grammar_lessons')
              .select(`
                id,
                grammar_lesson_translations(
                  theory_title,
                  theory_definition,
                  theory_formation,
                  theory_usage,
                  theory_common_mistakes,
                  rules,
                  examples,
                  localized_tips,
                  language_code
                )
              `)
              .eq('topic_id', currentTopicId)
              .order('lesson_order')
              .limit(1)
              .maybeSingle(),

            // Fetch Exercises
            (supabase as any)
              .from('grammar_exercises')
              .select(`
                id,
                exercise_type,
                difficulty,
                exercise_order,
                correct_order,
                transformation_type,
                grammar_exercise_translations(
                  question,
                  instruction,
                  correct_answer,
                  incorrect_answers,
                  explanation,
                  hint,
                  sentence_with_blank,
                  incorrect_sentence,
                  original_sentence,
                  language_code
                )
              `)
              .eq('topic_id', currentTopicId)
              .order('exercise_order'),

            // Fetch Progress
            user ? (supabase as any)
              .from('user_grammar_progress')
              .select('*')
              .eq('user_id', user.id)
              .eq('topic_id', currentTopicId)
              .maybeSingle()
              : Promise.resolve({ data: null })
          ]);

          if (!isMounted) return;

          // Process Lesson Data
          const lessonData = (lessonResult as any).data;
          if (lessonData) {
            const translations = ((lessonData as any).grammar_lesson_translations as any[]) || [];
            const bestTranslation = translations.find((t: any) => t.language_code === languageCode)
              || translations.find((t: any) => t.language_code === 'en')
              || translations[0];

            if (bestTranslation) {
              setLesson({
                id: (lessonData as any).id,
                ...(bestTranslation as any),
                rules: (bestTranslation as any).rules || [],
                examples: (bestTranslation as any).examples || [],
              });
            } else {
              setLesson(null);
            }
          } else {
            setLesson(null);
          }

          // Process Exercises Data
          const exercisesData = (exercisesResult as any).data || [];
          const processedExercises = exercisesData.map((ex: any) => {
            const translations = ((ex as any).grammar_exercise_translations as any[]) || [];
            const bestTranslation = translations.find((t: any) => t.language_code === languageCode)
              || translations.find((t: any) => t.language_code === 'en')
              || translations[0]
              || {};
            return {
              ...(ex as any),
              translations: bestTranslation
            };
          });
          setExercises(processedExercises);

          // Process Progress Data
          const progressData = (progressResult as any).data;
          if (progressData) {
            setTheoryCompleted((progressData as any).theory_completed || false);
          }
        }
      } catch (error) {
        if (isMounted) console.error('Error loading lesson:', error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadLessonData();

    return () => { isMounted = false; };
  }, [topicSlug, user, selectedLanguage]);

  const handleTheoryComplete = async () => {
    setTheoryCompleted(true);
    setActiveTab('exercises');

    // Save progress
    if (user && topic) {
      await (supabase as any)
        .from('user_grammar_progress')
        .upsert({
          user_id: user.id,
          topic_id: topic.id,
          theory_completed: true,
          last_practiced_at: new Date().toISOString(),
        }, { onConflict: 'user_id,topic_id' });
    }
  };

  const handleExerciseComplete = async (isCorrect: boolean, answer: string) => {
    const exercise = exercises[currentExerciseIndex];
    setCompletedExercises(prev => new Set([...prev, exercise.id]));

    if (isCorrect) {
      setCorrectAnswers(prev => prev + 1);
    }

    // Save attempt
    if (user) {
      await (supabase as any)
        .from('user_grammar_exercise_attempts')
        .insert({
          user_id: user.id,
          exercise_id: exercise.id,
          user_answer: answer,
          is_correct: isCorrect,
        });
    }
  };

  const handleNextExercise = () => {
    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentExerciseIndex(prev => prev + 1);
    } else {
      // All exercises completed
      setShowResults(true);
      saveProgress();
    }
  };

  const saveProgress = async () => {
    if (!user || !topic) return;

    const score = exercises.length > 0 ? Math.round((correctAnswers / exercises.length) * 100) : 0;
    const mastery = calculateMastery(score);

    await (supabase as any)
      .from('user_grammar_progress')
      .upsert({
        user_id: user.id,
        topic_id: topic.id,
        theory_completed: true,
        exercises_completed: completedExercises.size,
        total_exercises: exercises.length,
        best_score: score,
        mastery_level: mastery,
        last_practiced_at: new Date().toISOString(),
      }, { onConflict: 'user_id,topic_id' });
  };

  const calculateMastery = (score: number) => {
    // Simple mastery calculation
    if (score >= 90) return 100;
    if (score >= 80) return 90;
    if (score >= 70) return 80;
    if (score >= 60) return 70;
    if (score >= 50) return 60;
    return Math.max(50, score);
  };

  const handleRetry = () => {
    setCurrentExerciseIndex(0);
    setCompletedExercises(new Set());
    setCorrectAnswers(0);
    setShowResults(false);
  };

  const convertToExerciseData = (exercise: Exercise): ExerciseData => {
    const trans = exercise.translations;
    return {
      id: exercise.id as any,
      type: exercise.exercise_type as ExerciseData['type'],
      question: trans.question,
      instruction: trans.instruction,
      correctAnswer: trans.correct_answer,
      incorrectAnswers: trans.incorrect_answers,
      explanation: trans.explanation,
      hint: trans.hint,
      sentenceWithBlank: trans.sentence_with_blank,
      incorrectSentence: trans.incorrect_sentence,
      originalSentence: trans.original_sentence,
      transformationType: exercise.transformation_type,
      correctOrder: exercise.correct_order,
      words: exercise.correct_order ? [...exercise.correct_order].sort(() => Math.random() - 0.5) : undefined,
    };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: themeStyles.theme.colors.background }}>
        <LoadingAnimation />
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: themeStyles.theme.colors.background }}>
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Topic Not Found</h2>
          <p className="text-muted-foreground mb-4">The grammar topic you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/grammar')}>Back to Grammar Portal</Button>
        </Card>
      </div>
    );
  }

  const levelColors = {
    beginner: 'from-emerald-400 to-green-500',
    intermediate: 'from-blue-400 to-indigo-500',
    advanced: 'from-purple-400 to-violet-500',
  };

  const progressPercentage = exercises.length > 0
    ? Math.round((completedExercises.size / exercises.length) * 100)
    : 0;

  const styles = {
    // Container Backgrounds
    container: themeStyles.theme.name === 'note' ? 'bg-[#fef9e7] border-[#e8d5a3] rounded-2xl shadow-sm transition-all duration-300 hover:shadow-md' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5',
    subContainer: themeStyles.theme.name === 'note' ? 'bg-[#fef9e7] border-[#e8d5a3] rounded-xl' : 'bg-blue-50/50 border-blue-200 rounded-xl',
    header: themeStyles.theme.name === 'note' ? 'bg-[#fef9e7]' : 'bg-white dark:bg-gray-800',
    exampleContainer: (success: boolean) => {
      if (themeStyles.theme.name === 'note') {
        return success ? 'bg-[#fef9e7] border-[#e8d5a3]' : 'bg-[#fff] border-[#e8d5a3]';
      }
      return success ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200';
    },

    // Text Colors
    textPrimary: themeStyles.theme.name === 'note' ? 'text-[#5d4e37]' : 'text-gray-900 dark:text-gray-100',
    textSecondary: themeStyles.theme.name === 'note' ? 'text-[#8b6914]' : 'text-gray-600 dark:text-gray-400',
    textAccent: themeStyles.theme.name === 'note' ? 'text-[#a68b5b]' : 'text-emerald-600',

    // Icons
    icon: (defaultColorClass: string) => themeStyles.theme.name === 'note' ? 'text-[#8b6914]' : defaultColorClass,

    // Gradients
    gradient: themeStyles.theme.name === 'note'
      ? 'from-[#fdf6e3] to-[#fef9e7]'
      : 'from-emerald-50/50 via-blue-50/50 to-purple-50/50',

    // Prosa
    prose: themeStyles.theme.name === 'note' ? 'prose-brown' : 'prose dark:prose-invert',

    // Tabs
    tabsList: themeStyles.theme.name === 'note' ? 'bg-[#e8d5a3] p-1' : '',
    tabsTrigger: themeStyles.theme.name === 'note' ? 'data-[state=active]:bg-[#8b6914] data-[state=active]:text-white text-[#5d4e37]' : '',

    // Progress
    progress: themeStyles.theme.name === 'note' ? 'bg-[#e8d5a3]' : '',
    progressIndicator: themeStyles.theme.name === 'note' ? 'bg-[#8b6914]' : '',
  };

  return (
    <div className="min-h-screen relative" style={{ backgroundColor: themeStyles.theme.colors.background }}>
      <SEO
        title={`${topic.title} - English Grammar Lesson & Exercises`}
        description={topic.description || `Learn ${topic.title} with clear explanations, examples, and interactive exercises. Improve your English skills with AI-powered feedback.`}
        url={`https://englishaidol.com/grammar/${topic.slug}`}
        schemaType="breadcrumb"
        breadcrumbs={[
          { name: 'Home', url: 'https://englishaidol.com/' },
          { name: 'Grammar', url: 'https://englishaidol.com/grammar' },
          { name: topic.title || 'Lesson', url: `https://englishaidol.com/grammar/${topic.slug}` }
        ]}
      />

      {/* Dynamic Background Gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${styles.gradient}`} />

      <div className="relative z-10 flex flex-col min-h-screen">
        <StudentLayout title={topic.title || 'Grammar Lesson'} showBackButton backPath="/grammar" transparentBackground={true}>
          <div className="flex-1 flex justify-center py-4 sm:py-8">
            <div className="w-full max-w-4xl mx-auto space-y-4 px-4 flex flex-col pb-12">

              {/* Header */}
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={() => navigate('/dashboard')} className={`text-sm hover:underline transition-colors ${styles.textSecondary}`}>
                    Dashboard
                  </button>
                  <span className={styles.textSecondary}>/</span>
                  <button onClick={() => navigate('/ielts-portal')} className={`text-sm hover:underline transition-colors ${styles.textSecondary}`}>
                    Test Page
                  </button>
                  <span className={styles.textSecondary}>/</span>
                  <button onClick={() => navigate('/grammar')} className={`text-sm hover:underline transition-colors ${styles.textSecondary}`}>
                    Grammar
                  </button>
                  <span className={styles.textSecondary}>/</span>
                  <span className={`text-sm font-medium ${styles.textPrimary}`}>{topic.title}</span>
                </div>

                {/* Language Selector */}
                <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
                  <SelectTrigger className={`w-[160px] h-9 shadow-sm ${styles.container} ${styles.textPrimary}`}>
                    <Globe className={`w-4 h-4 mr-2 ${styles.icon('text-emerald-600')}`} />
                    <SelectValue placeholder="Language" />
                  </SelectTrigger>
                  <SelectContent className={`max-h-[300px] z-50 shadow-lg ${styles.container}`}>
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code} className={`cursor-pointer ${styles.textPrimary} focus:bg-gray-100`}>
                        <span className="flex items-center gap-2">
                          <span>{lang.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Topic Header Card */}
              <Card className={`overflow-hidden border ${styles.container}`}>
                <div className={`h-2 bg-gradient-to-r ${themeStyles.theme.name === 'note' ? 'from-[#8b6914] to-[#a68b5b]' : (levelColors[topic.level as keyof typeof levelColors] || levelColors.beginner)}`} />
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className={`${themeStyles.theme.name === 'note' ? 'bg-[#e8d5a3] text-[#5d4e37]' : ''} capitalize`}>{topic.level}</Badge>
                        {theoryCompleted && (
                          <Badge className={`${themeStyles.theme.name === 'note' ? 'bg-[#a68b5b] text-[#fef9e7]' : 'bg-emerald-100 text-emerald-700'}`}>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Theory Complete
                          </Badge>
                        )}
                      </div>
                      <h1 className={`text-2xl md:text-3xl font-bold mb-2 ${styles.textPrimary}`}>
                        {topic.title}
                      </h1>
                      <p className={styles.textSecondary}>{topic.description}</p>
                    </div>
                    {exercises.length > 0 && (
                      <div className="w-full md:w-48">
                        <div className="flex justify-between text-sm mb-1">
                          <span className={styles.textSecondary}>Progress</span>
                          <span className={`font-semibold ${styles.textPrimary}`}>{progressPercentage}%</span>
                        </div>
                        <Progress value={progressPercentage} className={cn("h-2", styles.progress)} indicatorClassName={styles.progressIndicator} />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Content Tabs */}
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'theory' | 'exercises')}>
                <TabsList className={cn("grid w-full grid-cols-2 max-w-sm", styles.tabsList)}>
                  <TabsTrigger value="theory" className={cn("flex items-center gap-2", styles.tabsTrigger)}>
                    Theory
                  </TabsTrigger>
                  <TabsTrigger value="exercises" className={cn("flex items-center gap-2", styles.tabsTrigger)} disabled={!lesson && exercises.length === 0}>
                    Exercises ({exercises.length})
                  </TabsTrigger>
                </TabsList>

                {/* Theory Tab */}
                <TabsContent value="theory" className="space-y-4 mt-6">
                  {lesson ? (
                    <>
                      {/* Definition */}
                      {lesson.theory_definition && (
                        <Card className={`border ${styles.container}`} style={themeStyles.cardStyle}>
                          <CardHeader>
                            <CardTitle className={`flex items-center gap-2 ${styles.textPrimary}`}>
                              <Lightbulb className={`w-5 h-5 ${styles.icon('text-amber-500')}`} />
                              {lesson.theory_title || `What is ${topic.title}?`}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className={`text-lg font-medium leading-relaxed ${styles.textPrimary} ${styles.prose} max-w-none`}>
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {lesson.theory_definition
                                  ?.replace(/[\p{Extended_Pictographic}\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
                                  .replace(/•/g, '\n- ')}
                              </ReactMarkdown>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Formation / Rules */}
                      {lesson.theory_formation && (
                        <Card className={`border ${styles.container}`} style={themeStyles.cardStyle}>
                          <CardHeader>
                            <CardTitle className={`flex items-center gap-2 ${styles.textPrimary}`}>
                              <Target className={`w-5 h-5 ${styles.icon('text-blue-500')}`} />
                              {i18n.language === 'en' ? 'How to Form It' : (t('grammar.howToFormIt') || 'How to Form It')}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className={`text-lg font-medium leading-relaxed ${styles.textPrimary} ${styles.prose} max-w-none`}>
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {lesson.theory_formation
                                  ?.replace(/[\p{Extended_Pictographic}\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
                                  ?.replace(/•/g, '\n- ')}
                              </ReactMarkdown>
                            </div>

                            {/* Visual Rules */}
                            {lesson.rules && lesson.rules.length > 0 && (
                              <div className="mt-4 space-y-3">
                                {lesson.rules.map((rule, index) => {
                                  if (!rule.title && !rule.formula && !rule.example) return null;
                                  return (
                                    <div key={index} className={`p-4 rounded-lg border ${styles.subContainer}`}>
                                      {rule.title && (
                                        <p className={`font-semibold mb-1 ${styles.textPrimary}`}>
                                          {rule.title.replace(/[\p{Extended_Pictographic}\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim()}
                                        </p>
                                      )}
                                      {rule.formula && <p className={`font-mono text-sm p-2 rounded mb-2 block ${themeStyles.theme.name === 'note' ? 'bg-white border-[#e8d5a3] text-[#5d4e37] border' : 'bg-white text-black border border-blue-100'}`}>{rule.formula}</p>}
                                      {rule.example && <p className={`text-sm italic ${styles.textSecondary}`}><span className="font-semibold not-italic">Example:</span> {rule.example}</p>}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}

                      {/* Usage */}
                      {lesson.theory_usage && (
                        <Card className={`border ${styles.container}`} style={themeStyles.cardStyle}>
                          <CardHeader>
                            <CardTitle className={`flex items-center gap-2 ${styles.textPrimary}`}>
                              <CheckCircle className={`w-5 h-5 ${styles.icon('text-emerald-500')}`} />
                              {t('grammar.whenToUseIt', 'When to Use It')}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className={`text-lg font-medium leading-relaxed ${styles.textPrimary} ${styles.prose} max-w-none`}>
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {lesson.theory_usage
                                  ?.replace(/[\p{Extended_Pictographic}\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
                                  .replace(/•/g, '\n- ')}
                              </ReactMarkdown>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Examples */}
                      {lesson.examples && lesson.examples.length > 0 && (
                        <Card className={`border ${styles.container}`} style={themeStyles.cardStyle}>
                          <CardHeader>
                            <CardTitle className={`flex items-center gap-2 ${styles.textPrimary}`}>
                              <BookOpen className={`w-5 h-5 ${styles.icon('text-purple-500')}`} />
                              {t('grammar.examples', 'Examples')}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {lesson.examples.map((example, index) => (
                                <div
                                  key={index}
                                  className={`p-3 rounded-lg border ${styles.exampleContainer(example.correct !== false)}`}
                                >
                                  <div className="flex items-start gap-2">
                                    <div className="w-4 h-4 mt-1 shrink-0" />
                                    <div>
                                      <p className={`font-medium ${styles.textPrimary}`}>
                                        {example.sentence || (example as any).english}
                                      </p>
                                      {(example.translation || (example as any).native) && (
                                        <p className={`text-sm mt-1 ${styles.textSecondary}`}>
                                          {example.translation || (selectedLanguage !== 'en' ? (example as any).native : '')}
                                        </p>
                                      )}
                                      {(example.explanation || (selectedLanguage === 'en' ? (example as any).native : '')) && (
                                        <p className={`text-sm mt-1 italic ${styles.textSecondary}`}>
                                          {example.explanation || (selectedLanguage === 'en' ? (example as any).native : '')}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Common Mistakes */}
                      {lesson.theory_common_mistakes && (
                        <Card className={`border ${styles.container} ${themeStyles.theme.name === 'note' ? 'bg-[#fffbf0]' : 'bg-amber-50/30 border-amber-200'}`} style={themeStyles.cardStyle}>
                          <CardHeader className="pb-4">
                            <CardTitle className={`flex items-center gap-2 text-xl ${themeStyles.theme.name === 'note' ? 'text-[#8b6914]' : 'text-amber-700'}`}>
                              <AlertCircle className="w-5 h-5" />
                              {t('grammar.commonMistakes', 'Common Mistakes')}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="overflow-hidden rounded-xl border" style={{ borderColor: themeStyles.border }}>
                              <table className="w-full text-sm">
                                <thead className={isNoteTheme ? 'bg-[#e8d5a3]/50' : 'bg-muted/50'}>
                                  <tr>
                                    <th className={`p-3 text-left font-bold ${isNoteTheme ? 'text-[#5d4e37]' : 'text-foreground'}`}>Mistake</th>
                                    <th className={`p-3 text-left font-bold ${isNoteTheme ? 'text-[#5d4e37]' : 'text-foreground'}`}>Correction</th>
                                    <th className={`p-3 text-left font-bold ${isNoteTheme ? 'text-[#5d4e37]' : 'text-foreground'}`}>Explanation</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y" style={{ borderColor: themeStyles.border }}>
                                  {(() => {
                                    // Split by various labels in multiple languages
                                    const chunks = lesson.theory_common_mistakes
                                      ?.split(/\*\*[Mm]istake \d+:\*\*|常见错误 \d+[:：]|흔한 실수 \d+[:：]|Erro \d+[:：]|Mistake \d+[:：]|[❌]/g)
                                      .filter(chunk => chunk.trim()) || [];

                                    // If we have no structured chunks, or parsing fails completely, 
                                    // we might want a fallback to raw markdown, but let's try to parse first.
                                    const rows = chunks.map((chunk, i) => {
                                      // Language-agnostic parsing using markers and keywords
                                      let wrong = "";
                                      let right = "";
                                      let why = "";

                                      // 1. Identify "Wrong" part
                                      const wrongMatch = chunk.match(/(?:Wrong|Incorrect|Incorrecto|Maling|Salah|Errado|Malo|잘못|틀린|错误|错|間違い|誤り|Sai|Error|Mistake|Error|❌)[:：]\s*["']?([^"']+)["']?(?=\s*(?:✅|Right:|Correct|Correcto|Correto|올바름|正确|对|正しい|正解|Đúng|正确))/i)
                                        || chunk.match(/(?:[Xx]|❌)\s*["']?([^"']+)["']?(?=\s*(?:✅|Right:|Correct|Correcto|Correto|올바름|正确|对|正しい|正解|Đúng|正确))/i);

                                      // 2. Identify "Right" part
                                      const rightMatch = chunk.match(/(?:Right|Correct|Correcto|Correto|Tama|Benar|Proper|올바름|맞음|正确|对|正しい|正解|Đúng|✅|V)[:：]\s*["']?([^"']+)["']?(?=\s*(?:💡|Why|Because|Por qu[eé]|Bakit|Mengapa|이유|원인|理由|解释|Tại sao|说明))/i)
                                        || chunk.match(/(?:Right|Correct|Correcto|Correto|Tama|Benar|Proper|올바름|맞음|正确|对|正しい|正解|Đúng|✅)[:：]\s*["']?([^"']+)["']?$/i);

                                      // 3. Identify "Why" part
                                      const whyMatch = chunk.match(/(?:Why|Explanation|Bakit|Mengapa|Because|Por\s*qu[eé]|이유|설명|원인|原因|解释|理由|説明|Tại sao|Giải thích|💡)[:：]?\s*(.+)$/is);

                                      if (wrongMatch) wrong = wrongMatch[1];
                                      if (rightMatch) right = rightMatch[1];
                                      if (whyMatch) why = whyMatch[1];

                                      // Advanced fallback: split by line content if regex misses
                                      if (!wrong || !right) {
                                        const lines = chunk.split('\n').map(l => l.trim()).filter(Boolean);
                                        lines.forEach(line => {
                                          const lowerLine = line.toLowerCase();
                                          // Match Wrong
                                          if (!wrong && (lowerLine.includes('wrong') || lowerLine.includes('incorrecto') || lowerLine.includes('errado') || lowerLine.includes('잘못') || lowerLine.includes('错误') || lowerLine.includes('間違い') || lowerLine.includes('sai '))) {
                                            wrong = line.replace(/^(wrong|incorrecto|errado|maling|salah|malo|incorrect|잘못|틀린|错误|错|間違い|誤り|sai):?\s*/i, '').replace(/["']/g, '').trim();
                                          }
                                          // Match Right
                                          else if (!right && (lowerLine.includes('right') || lowerLine.includes('correct') || lowerLine.includes('correcto') || lowerLine.includes('correto') || lowerLine.includes('올바름') || lowerLine.includes('正确') || lowerLine.includes('正しい') || lowerLine.includes('đúng'))) {
                                            right = line.replace(/^(right|correct|correcto|correto|tama|benar|올바름|맞음|正确|对|正しい|正解|đúng):?\s*/i, '').replace(/["']/g, '').trim();
                                          }
                                          // Match Why
                                          else if (!why && (lowerLine.includes('why') || lowerLine.includes('bakit') || lowerLine.includes('mengapa') || lowerLine.includes('por qu') || lowerLine.includes('이유') || lowerLine.includes('原因') || lowerLine.includes('理由') || lowerLine.includes('giải thích'))) {
                                            why = line.replace(/^(why|bakit|mengapa|explanation|por\s*qu[eé]|explicaci[oó]n|이유|설명|原因|解释|理由|説明|tại sao|giải thích):?\s*/i, '').trim();
                                          }
                                        });
                                      }

                                      // Final sanitation - remove labels and markdown
                                      const labelPattern = /^(?:Wrong|Correct|Mistake|Right|Why|Explanation|Correcto|Incorrecto|错误|正确|原因|理由|이유|잘못|틀린|올바름|맞음|Sai|Đúng|常见错误 \d+|흔한 실수 \d+|Mistake \d+)[:：\s]*/i;
                                      wrong = wrong.replace(labelPattern, '').replace(/["'*:*]|\*\*/g, '').trim();
                                      right = right.replace(labelPattern, '').replace(/["'*:*]|\*\*/g, '').trim();
                                      why = why.replace(labelPattern, '').replace(/\*\*/g, '').trim();

                                      if (!wrong && !right) return null;

                                      return (
                                        <tr key={i} className={isNoteTheme ? 'hover:bg-[#fef9e7]/50' : 'hover:bg-muted/30'}>
                                          <td className={`p-3 align-top font-medium ${isNoteTheme ? 'text-red-700' : 'text-destructive'}`}>{wrong}</td>
                                          <td className={`p-3 align-top font-medium ${isNoteTheme ? 'text-emerald-800' : 'text-emerald-600'}`}>{right}</td>
                                          <td className={`p-3 align-top ${isNoteTheme ? 'text-[#5d4e37]' : 'text-muted-foreground'}`}>{why}</td>
                                        </tr>
                                      );
                                    }).filter(Boolean);

                                    // If we parsed successfully, return the rows.
                                    // If not, show the raw content in a simplified way so it's not empty.
                                    if (rows.length > 0) return rows;

                                    return (
                                      <tr>
                                        <td colSpan={3} className="p-6">
                                          <div className="prose max-w-none dark:prose-invert">
                                            <ReactMarkdown>{lesson.theory_common_mistakes}</ReactMarkdown>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })()}
                                </tbody>
                              </table>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Localized Tips */}
                      {lesson.localized_tips && (
                        <Card className={`border ${styles.container} ${themeStyles.theme.name === 'note' ? 'bg-[#fffbf0]' : 'bg-purple-50/30 border-purple-200'}`} style={themeStyles.cardStyle}>
                          <CardHeader>
                            <CardTitle className={`flex items-center gap-2 ${themeStyles.theme.name === 'note' ? 'text-[#8b6914]' : 'text-purple-700'}`}>
                              Tips for Your Language
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className={`text-lg font-medium leading-relaxed max-w-none ${themeStyles.theme.name === 'note' ? 'text-[#5d4e37]' : 'text-purple-800'}`}>
                              <ReactMarkdown>
                                {lesson.localized_tips?.replace(/[\p{Extended_Pictographic}\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')}
                              </ReactMarkdown>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Continue to Exercises Button */}
                      <div className="flex justify-center pt-4">
                        <Button
                          size="lg"
                          onClick={handleTheoryComplete}
                          className={`${themeStyles.theme.name === 'note' ? 'bg-[#8b6914] hover:bg-[#5d4e37] text-white' : 'bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600'}`}
                        >
                          {theoryCompleted ? 'Review Exercises' : 'I Understand! Continue to Exercises'}
                          <ArrowRight className="w-5 h-5 ml-2" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <Card className={`p-8 text-center border ${styles.container}`}>
                      <BookOpen className={`w-12 h-12 mx-auto mb-4 ${styles.textSecondary}`} />
                      <h3 className={`text-lg font-semibold mb-2 ${styles.textPrimary}`}>Theory Coming Soon</h3>
                      <p className={styles.textSecondary}>The theory content for this topic is being prepared.</p>
                    </Card>
                  )}
                </TabsContent>

                {/* Exercises Tab */}
                <TabsContent value="exercises" className="mt-6">
                  {showResults ? (
                    // Results View
                    <Card className={`overflow-hidden border ${styles.container}`}>
                      <div className={`h-2 bg-gradient-to-r ${themeStyles.theme.name === 'note' ? 'from-[#8b6914] to-[#a68b5b]' : 'from-emerald-400 to-blue-500'}`} />
                      <CardContent className="p-8 text-center">
                        <Trophy className={`w-16 h-16 mx-auto mb-4 ${styles.icon('text-amber-500')}`} />
                        <h2 className={`text-2xl font-bold mb-2 ${styles.textPrimary}`}>Lesson Complete!</h2>
                        <p className={`mb-6 ${styles.textSecondary}`}>
                          You scored {correctAnswers} out of {exercises.length}
                        </p>

                        <div className="flex items-center justify-center gap-2 mb-6">
                          {[...Array(3)].map((_, i) => (
                            <Star
                              key={i}
                              className={cn(
                                "w-8 h-8",
                                i < Math.ceil((correctAnswers / exercises.length) * 3)
                                  ? `${themeStyles.theme.name === 'note' ? 'text-[#8b6914]' : 'text-amber-400'} fill-current`
                                  : "text-gray-300"
                              )}
                            />
                          ))}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                          <Button variant="outline" onClick={handleRetry}>
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Try Again
                          </Button>
                          <Button onClick={() => navigate('/grammar')}>
                            Back to Grammar Portal
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : exercises.length > 0 ? (
                    // Exercise View
                    <div className="space-y-4">
                      {/* Exercise Progress */}
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm text-muted-foreground">
                          Exercise {currentExerciseIndex + 1} of {exercises.length}
                        </span>
                        <span className="text-sm font-medium text-emerald-600">
                          {correctAnswers} correct
                        </span>
                      </div>
                      <Progress value={((currentExerciseIndex) / exercises.length) * 100} className={cn("h-2 mb-6", styles.progress)} indicatorClassName={styles.progressIndicator} />

                      {/* Current Exercise */}
                      <GrammarExercise
                        key={exercises[currentExerciseIndex].id}
                        exercise={convertToExerciseData(exercises[currentExerciseIndex])}
                        onComplete={handleExerciseComplete}
                      />

                      {/* Navigation Buttons */}
                      <div className="flex justify-between items-center pt-4">
                        {/* Previous Button - always show if not first exercise */}
                        {currentExerciseIndex > 0 ? (
                          <Button
                            variant="ghost"
                            onClick={() => setCurrentExerciseIndex(prev => prev - 1)}
                            className={cn(
                              "hover:text-foreground transition-all",
                              themeStyles.theme.name === 'note' ? "text-[#8b6914] hover:bg-[#e8d5a3]" : "text-muted-foreground"
                            )}
                          >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Previous
                          </Button>
                        ) : (
                          <div /> /* Spacer to keep Next button on the right */
                        )}

                        {/* Next Button (shown after completing current exercise) */}
                        {completedExercises.has((exercises[currentExerciseIndex] as any).id) && (
                          <Button
                            onClick={handleNextExercise}
                            className={cn(
                              "transition-all",
                              themeStyles.theme.name === 'note' ? "bg-[#8b6914] hover:bg-[#5d4e37] text-white" : ""
                            )}
                          >
                            {currentExerciseIndex < exercises.length - 1 ? (
                              <>
                                Next Exercise
                                <ArrowRight className="w-4 h-4 ml-2" />
                              </>
                            ) : (
                              <>
                                See Results
                                <Trophy className="w-4 h-4 ml-2" />
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    // No Exercises
                    <Card className="p-8 text-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                      <Target className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
                      <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">Exercises Coming Soon</h3>
                      <p className="text-gray-600 dark:text-gray-400">Practice exercises for this topic are being prepared.</p>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>

            </div>
          </div>
        </StudentLayout>
      </div >
    </div >
  );
};

export default GrammarLesson;
