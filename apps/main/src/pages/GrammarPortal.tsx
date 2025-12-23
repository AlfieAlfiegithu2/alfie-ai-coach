import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
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
import LanguageSelector from '@/components/LanguageSelector';
import {
  BookOpen,
  CheckCircle,
  Lock,
  Play,
  Star,
  Trophy,
  Zap,
  Target,
  Home,
  GraduationCap,
  Globe
} from 'lucide-react';

interface GrammarTopic {
  id: string;
  slug: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  topic_order: number;
  icon: string;
  color: string;
  is_published: boolean;
  title?: string;
  description?: string;
}

interface UserProgress {
  topic_id: string;
  theory_completed: boolean;
  exercises_completed: number;
  total_exercises: number;
  best_score: number;
  mastery_level: number;
}

// Topic icons mapping
const topicIcons: Record<string, React.ReactNode> = {
  'book': <BookOpen className="w-6 h-6" />,
  'star': <Star className="w-6 h-6" />,
  'target': <Target className="w-6 h-6" />,
  'zap': <Zap className="w-6 h-6" />,
  'trophy': <Trophy className="w-6 h-6" />,
  'graduation': <GraduationCap className="w-6 h-6" />,
};

// Level colors
const levelColors = {
  beginner: { bg: 'from-emerald-400 to-green-500', text: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700' },
  intermediate: { bg: 'from-blue-400 to-indigo-500', text: 'text-blue-600', badge: 'bg-blue-100 text-blue-700' },
  advanced: { bg: 'from-purple-400 to-violet-500', text: 'text-purple-600', badge: 'bg-purple-100 text-purple-700' },
};

// Level labels for display
const levelLabels = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

const GrammarPortal = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const themeStyles = useThemeStyles();
  const isNoteTheme = themeStyles.theme.name === 'note';

  const [topics, setTopics] = useState<GrammarTopic[]>([]);
  const [userProgress, setUserProgress] = useState<Record<string, UserProgress>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState<'all' | 'beginner' | 'intermediate' | 'advanced'>('all');
  const [overallProgress, setOverallProgress] = useState({ completed: 0, total: 0, percentage: 0 });

  // Reload data when language changes
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setIsLoading(true);
      try {
        // Get current language from i18n
        const languageCode = i18n.language || 'en';

        // Load topics with translations
        const { data: topicsData, error: topicsError } = await (supabase as any)
          .from('grammar_topics')
          .select(`
            id,
            slug,
            level,
            topic_order,
            icon,
            color,
            is_published,
            grammar_topic_translations!inner(title, description)
          `)
          .eq('is_published', true)
          .eq('grammar_topic_translations.language_code', languageCode)
          .order('level')
          .order('topic_order');

        if (!isMounted) return;

        if (topicsError) {
          console.error('Error loading topics:', topicsError);
          // Try without language filter for fallback
          const { data: fallbackData } = await (supabase as any)
            .from('grammar_topics')
            .select(`
              id,
              slug,
              level,
              topic_order,
              icon,
              color,
              is_published,
              grammar_topic_translations(title, description)
            `)
            .eq('is_published', true)
            .order('level')
            .order('topic_order');

          if (!isMounted) return;

          if (fallbackData) {
            const transformedTopics = fallbackData.map(t => ({
              ...t,
              title: (t.grammar_topic_translations as any)?.[0]?.title || t.slug.replace(/-/g, ' '),
              description: (t.grammar_topic_translations as any)?.[0]?.description || '',
            }));
            setTopics(transformedTopics as GrammarTopic[]);
          }
        } else if (topicsData) {
          const transformedTopics = topicsData.map(t => ({
            ...t,
            title: (t.grammar_topic_translations as any)?.[0]?.title || t.slug.replace(/-/g, ' '),
            description: (t.grammar_topic_translations as any)?.[0]?.description || '',
          }));
          setTopics(transformedTopics as GrammarTopic[]);
        }

        if (!isMounted) return;

        // Load user progress if logged in
        if (user) {
          const { data: progressData, error: progressError } = await (supabase as any)
            .from('user_grammar_progress')
            .select('*')
            .eq('user_id', user.id);

          if (!isMounted) return;

          if (!progressError && progressData) {
            const progressMap: Record<string, UserProgress> = {};
            (progressData as any[]).forEach((p: any) => {
              progressMap[p.topic_id] = p as UserProgress;
            });
            setUserProgress(progressMap);

            // Calculate overall progress
            const completed = (progressData as any[]).filter((p: any) => p.mastery_level >= 80).length;
            const total = topicsData?.length || 0;
            setOverallProgress({
              completed,
              total,
              percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
            });
          }
        }
      } catch (error) {
        if (isMounted) console.error('Error loading grammar data:', error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();

    return () => { isMounted = false; };
  }, [user, i18n.language]);

  const getTopicStatus = (topicId: string) => {
    const progress = userProgress[topicId];
    if (!progress) return 'not_started';
    if (progress.mastery_level >= 80) return 'mastered';
    if (progress.theory_completed || progress.exercises_completed > 0) return 'in_progress';
    return 'not_started';
  };

  const filteredTopics = selectedLevel === 'all'
    ? topics
    : topics.filter(t => t.level === selectedLevel);

  const groupedTopics = {
    beginner: filteredTopics.filter(t => t.level === 'beginner'),
    intermediate: filteredTopics.filter(t => t.level === 'intermediate'),
    advanced: filteredTopics.filter(t => t.level === 'advanced'),
  };

  const handleTopicClick = (topic: GrammarTopic) => {
    navigate(`/grammar/${topic.slug}`);
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
      className={`min-h-screen relative ${isNoteTheme ? 'font-serif' : ''}`}
      style={{ backgroundColor: themeStyles.theme.colors.background }}
    >
      <SEO
        title="Grammar Learning Center | Master English Grammar Rules"
        description="Master English grammar with interactive lessons and exercises. Learn grammar rules for all levels (Beginner to Advanced), practice with AI-powered feedback."
        keywords="English grammar, grammar lessons, grammar exercises, learn grammar, English learning"
        type="website"
        url="https://englishaidol.com/grammar"
        schemaType="breadcrumb"
        breadcrumbs={[
          { name: 'Home', url: 'https://englishaidol.com/' },
          { name: 'Grammar', url: 'https://englishaidol.com/grammar' }
        ]}
      />

      {!isNoteTheme && <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 via-blue-50/50 to-purple-50/50" />}

      <div className="relative z-10">
        <StudentLayout title="Grammar" showBackButton>
          <div className="space-y-6 max-w-6xl mx-auto px-4 md:px-6 pb-12">

            {/* Header Navigation */}
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => navigate('/hero')}
                className="inline-flex items-center gap-2 px-2 py-1 h-8 text-sm font-medium transition-colors rounded-md hover:bg-gray-100"
                style={{ color: themeStyles.textSecondary }}
              >
                {!isNoteTheme && <Home className="h-4 w-4" />}
                {isNoteTheme && <span>Home</span>}
              </button>
              <span style={{ color: themeStyles.textSecondary }}>/</span>
              <span className="text-sm font-medium" style={{ color: themeStyles.textPrimary }}>Grammar</span>
            </div>

            {/* Hero Section */}
            <div className="text-center mb-8">
              <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4" style={{ color: themeStyles.textPrimary }}>
                Grammar Learning Center
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-4">
                Master English grammar step by step with clear explanations, examples, and interactive exercises.
              </p>

              {/* Language Selector */}
              <div className="flex items-center justify-center gap-2">
                {!isNoteTheme && <Globe className="w-4 h-4 text-muted-foreground" />}
                <span className="text-sm text-muted-foreground">Learn in your language:</span>
                <LanguageSelector />
              </div>
            </div>

            {/* Progress Overview Card */}
            {user && (
              <Card className="mb-8 overflow-hidden" style={{
                backgroundColor: themeStyles.theme.colors.cardBackground,
                borderColor: themeStyles.border
              }}>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {!isNoteTheme && (
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center">
                          <Trophy className="w-8 h-8 text-white" />
                        </div>
                      )}
                      <div>
                        <h3 className="text-lg font-semibold" style={{ color: themeStyles.textPrimary }}>Your Progress</h3>
                        <p className="text-sm text-muted-foreground">
                          {overallProgress.completed} of {overallProgress.total} topics mastered
                        </p>
                      </div>
                    </div>
                    <div className="w-full md:w-64">
                      <div className="flex justify-between text-sm mb-1">
                        <span style={{ color: themeStyles.textSecondary }}>Overall Mastery</span>
                        <span className="font-semibold" style={{ color: themeStyles.textPrimary }}>{overallProgress.percentage}%</span>
                      </div>
                      <Progress value={overallProgress.percentage} className="h-3" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Level Filter Tabs */}
            <Tabs value={selectedLevel} onValueChange={(v) => setSelectedLevel(v as any)} className="mb-6">
              <TabsList className="grid w-full grid-cols-4 max-w-md mx-auto" style={isNoteTheme ? { backgroundColor: 'transparent', border: `1px solid ${themeStyles.border}` } : undefined}>
                <TabsTrigger value="all" style={isNoteTheme ? { color: themeStyles.textPrimary } : undefined}>All</TabsTrigger>
                <TabsTrigger value="beginner" className={isNoteTheme ? "" : "text-emerald-600"} style={isNoteTheme ? { color: themeStyles.textSecondary } : undefined}>Beginner</TabsTrigger>
                <TabsTrigger value="intermediate" className={isNoteTheme ? "" : "text-blue-600"} style={isNoteTheme ? { color: themeStyles.textSecondary } : undefined}>Intermediate</TabsTrigger>
                <TabsTrigger value="advanced" className={isNoteTheme ? "" : "text-purple-600"} style={isNoteTheme ? { color: themeStyles.textSecondary } : undefined}>Advanced</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Topics Grid by Level */}
            {selectedLevel === 'all' ? (
              // Show all levels in sections
              Object.entries(groupedTopics).map(([level, levelTopics]) => (
                levelTopics.length > 0 && (
                  <div key={level} className="mb-10">
                    <div className="flex items-center gap-3 mb-4">
                      {!isNoteTheme && <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${levelColors[level as keyof typeof levelColors].bg}`} />}
                      <h2 className="text-2xl font-bold" style={{ color: themeStyles.textPrimary }}>
                        {levelLabels[level as keyof typeof levelLabels]}
                      </h2>
                      <Badge variant="secondary" className={isNoteTheme ? '' : levelColors[level as keyof typeof levelColors].badge} style={isNoteTheme ? { backgroundColor: 'transparent', border: `1px solid ${themeStyles.border}`, color: themeStyles.textSecondary } : undefined}>
                        {levelTopics.length} topics
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {levelTopics.map((topic) => (
                        <TopicCard
                          key={topic.id}
                          topic={topic}
                          progress={userProgress[topic.id]}
                          onClick={() => handleTopicClick(topic)}
                          themeStyles={themeStyles}
                        />
                      ))}
                    </div>
                  </div>
                )
              ))
            ) : (
              // Show filtered level only
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredTopics.map((topic) => (
                  <TopicCard
                    key={topic.id}
                    topic={topic}
                    progress={userProgress[topic.id]}
                    onClick={() => handleTopicClick(topic)}
                    themeStyles={themeStyles}
                  />
                ))}
              </div>
            )}

            {/* Empty State */}
            {topics.length === 0 && (
              <div className="text-center py-16">
                {!isNoteTheme && <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />}
                <h3 className="text-xl font-semibold mb-2" style={{ color: themeStyles.textPrimary }}>
                  No Topics Available Yet
                </h3>
                <p className="text-muted-foreground">
                  Grammar lessons are being prepared. Check back soon!
                </p>
              </div>
            )}

          </div>
        </StudentLayout>
      </div>
    </div>
  );
};

// Topic Card Component
interface TopicCardProps {
  topic: GrammarTopic;
  progress?: UserProgress;
  onClick: () => void;
  themeStyles: any;
}

const TopicCard = ({ topic, progress, onClick, themeStyles }: TopicCardProps) => {
  const isNoteTheme = themeStyles.theme.name === 'note';
  const status = progress
    ? (progress.mastery_level >= 80 ? 'mastered' : progress.theory_completed || progress.exercises_completed > 0 ? 'in_progress' : 'not_started')
    : 'not_started';

  const levelColor = levelColors[topic.level];
  const icon = topicIcons[topic.icon] || <BookOpen className="w-6 h-6" />;

  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] overflow-hidden group"
      onClick={onClick}
      style={{
        backgroundColor: themeStyles.theme.colors.cardBackground,
        borderColor: themeStyles.border
      }}
    >
      {/* Top accent bar */}
      {!isNoteTheme && <div className={`h-1.5 bg-gradient-to-r ${levelColor.bg}`} />}
      {isNoteTheme && <div className="h-1.5" style={{ backgroundColor: themeStyles.theme.colors.border }} />}

      <CardContent className="p-4">
        {/* Header with icon and status */}
        <div className="flex items-start justify-between mb-3">
          {!isNoteTheme && (
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${levelColor.bg} flex items-center justify-center text-white`}>
              {icon}
            </div>
          )}
          {status === 'mastered' && (
            <div className={`flex items-center gap-1 ${isNoteTheme ? '' : 'text-amber-500'}`} style={isNoteTheme ? { color: themeStyles.textSecondary } : undefined}>
              {!isNoteTheme && (
                <>
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                </>
              )}
              {isNoteTheme && <span className="text-sm font-bold">Mastered</span>}
            </div>
          )}
          {status === 'in_progress' && (
            <Badge variant="secondary" className={isNoteTheme ? '' : "bg-blue-100 text-blue-700 text-xs"} style={isNoteTheme ? { backgroundColor: 'transparent', border: `1px solid ${themeStyles.border}`, color: themeStyles.textSecondary } : undefined}>
              In Progress
            </Badge>
          )}
          {status === 'not_started' && !isNoteTheme && (
            <Play className="w-5 h-5 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
          )}
        </div>

        {/* Title and description */}
        <h3 className="font-semibold mb-1 line-clamp-1" style={{ color: themeStyles.textPrimary }}>
          {topic.title}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
          {topic.description}
        </p>

        {/* Progress bar (if started) */}
        {progress && (progress.theory_completed || progress.exercises_completed > 0) && (
          <div className="mt-auto">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Mastery</span>
              <span className={isNoteTheme ? '' : levelColor.text} style={isNoteTheme ? { color: themeStyles.textSecondary } : undefined}>{progress.mastery_level}%</span>
            </div>
            <Progress value={progress.mastery_level} className="h-1.5" />
          </div>
        )}

        {/* Start button for not started */}
        {status === 'not_started' && (
          <Button
            size="sm"
            className={`w-full mt-2 ${isNoteTheme ? '' : `bg-gradient-to-r ${levelColor.bg}`} text-white hover:opacity-90`}
            style={isNoteTheme ? { backgroundColor: themeStyles.theme.colors.buttonPrimary } : undefined}
          >
            Start Learning
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default GrammarPortal;