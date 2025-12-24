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
import { useSubscription } from '@/hooks/useSubscription';
import { ProLockOverlay, LockBadge, useProLockOverlay } from '@/components/ProLockOverlay';
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
import { cn } from '@/lib/utils';
import { getLanguagesWithFlags } from '@/lib/languageUtils';

const languages = getLanguagesWithFlags();

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
  const { isItemLocked, isPro } = useSubscription();
  const { isOpen: lockOverlayOpen, showLockOverlay, hideLockOverlay, totalLockedCount } = useProLockOverlay();

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

        // Load topics with all translations (we'll filter in JS)
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
            grammar_topic_translations(title, description, language_code)
          `)
          .eq('is_published', true)
          .order('level')
          .order('topic_order');

        if (!isMounted) return;

        if (topicsError) {
          console.error('Error loading topics:', topicsError);
        } else if (topicsData) {
          const transformedTopics = topicsData.map(t => {
            const translations = (t.grammar_topic_translations as any[]) || [];
            const bestTranslation = translations.find((tr: any) => tr.language_code === languageCode)
              || translations.find((tr: any) => tr.language_code === 'en')
              || translations[0]
              || {};

            return {
              ...t,
              title: bestTranslation.title || t.slug.replace(/-/g, ' '),
              description: bestTranslation.description || '',
            };
          });
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

  const handleTopicClick = (topic: GrammarTopic, isLocked: boolean, lockedCount: number) => {
    if (isLocked) {
      showLockOverlay('This grammar topic', lockedCount);
    } else {
      navigate(`/grammar/${topic.slug}`);
    }
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
      className="min-h-screen relative"
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
          { name: 'Dashboard', url: 'https://englishaidol.com/dashboard' },
          { name: 'Test Page', url: 'https://englishaidol.com/ielts-portal' },
          { name: 'Grammar', url: 'https://englishaidol.com/grammar' }
        ]}
      />

      {!isNoteTheme && <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 via-blue-50/50 to-purple-50/50" />}

      <div className="relative z-10">
        <StudentLayout title="Grammar" showBackButton transparentBackground={true}>
          <div className="space-y-6 max-w-6xl mx-auto px-4 md:px-6 pb-12">

            {/* Header Navigation */}
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center gap-2 px-2 py-1 h-8 text-sm font-medium transition-colors rounded-md hover:bg-gray-100"
                style={{ color: themeStyles.textSecondary }}
              >
                {!isNoteTheme && <Home className="h-4 w-4" />}
                <span>Dashboard</span>
              </button>
              <span style={{ color: themeStyles.textSecondary }}>/</span>
              <button
                onClick={() => navigate('/ielts-portal')}
                className="inline-flex items-center gap-2 px-2 py-1 h-8 text-sm font-medium transition-colors rounded-md hover:bg-gray-100"
                style={{ color: themeStyles.textSecondary }}
              >
                <span>Test Page</span>
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
                      <Progress
                        value={overallProgress.percentage}
                        className={cn("h-3", isNoteTheme ? "bg-[#e8d5a3]" : "")}
                        indicatorClassName={isNoteTheme ? "bg-[#8b6914]" : ""}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Level Filter Tabs */}
            <Tabs value={selectedLevel} onValueChange={(v) => setSelectedLevel(v as any)} className="mb-6">
              <TabsList
                className={cn(
                  "grid w-full grid-cols-4 max-w-md mx-auto",
                  isNoteTheme ? "bg-[#e8d5a3] p-1 border-[#e8d5a3]" : ""
                )}
              >
                <TabsTrigger
                  value="all"
                  className={cn(isNoteTheme ? "data-[state=active]:bg-[#8b6914] data-[state=active]:text-white text-[#5d4e37]" : "")}
                >
                  All
                </TabsTrigger>
                <TabsTrigger
                  value="beginner"
                  className={cn(
                    isNoteTheme ? "data-[state=active]:bg-[#8b6914] data-[state=active]:text-white text-[#5d4e37]" : "text-emerald-600"
                  )}
                >
                  Beginner
                </TabsTrigger>
                <TabsTrigger
                  value="intermediate"
                  className={cn(
                    isNoteTheme ? "data-[state=active]:bg-[#8b6914] data-[state=active]:text-white text-[#5d4e37]" : "text-blue-600"
                  )}
                >
                  Intermediate
                </TabsTrigger>
                <TabsTrigger
                  value="advanced"
                  className={cn(
                    isNoteTheme ? "data-[state=active]:bg-[#8b6914] data-[state=active]:text-white text-[#5d4e37]" : "text-purple-600"
                  )}
                >
                  Advanced
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Topics Grid by Level */}
            {selectedLevel === 'all' ? (
              // Show all levels in sections
              Object.entries(groupedTopics).map(([level, levelTopics]) => {
                const lockedCount = isPro ? 0 : Math.max(0, levelTopics.length - 1);
                return (
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                        {levelTopics.map((topic, index) => {
                          const isLocked = isItemLocked(index, 1); // First topic per level is free
                          return (
                            <TopicCard
                              key={topic.id}
                              topic={topic}
                              progress={userProgress[topic.id]}
                              onClick={() => handleTopicClick(topic, isLocked, lockedCount)}
                              themeStyles={themeStyles}
                              isLocked={isLocked}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )
                );
              })
            ) : (
              // Show filtered level only
              (() => {
                const lockedCount = isPro ? 0 : Math.max(0, filteredTopics.length - 1);
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {filteredTopics.map((topic, index) => {
                      const isLocked = isItemLocked(index, 1);
                      return (
                        <TopicCard
                          key={topic.id}
                          topic={topic}
                          progress={userProgress[topic.id]}
                          onClick={() => handleTopicClick(topic, isLocked, lockedCount)}
                          themeStyles={themeStyles}
                          isLocked={isLocked}
                        />
                      );
                    })}
                  </div>
                );
              })()
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

        {/* Pro Lock Overlay */}
        <ProLockOverlay
          isOpen={lockOverlayOpen}
          onClose={hideLockOverlay}
          featureName="This grammar topic"
          totalLockedCount={totalLockedCount}
        />
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
  isLocked?: boolean;
}

const TopicCard = ({ topic, progress, onClick, themeStyles, isLocked = false }: TopicCardProps) => {
  const { i18n } = useTranslation();
  const isNoteTheme = themeStyles.theme.name === 'note';
  const isStudied = progress && (progress.theory_completed || progress.mastery_level > 0);

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-300 overflow-hidden group flex flex-col justify-between relative",
        isLocked ? "opacity-75" : "hover:shadow-lg hover:scale-[1.02]",
        i18n.language !== 'en' && !isLocked ? "shadow-inner border-emerald-500/20" : "",
        isStudied && !isLocked ? "opacity-90" : ""
      )}
      onClick={onClick}
      style={{
        backgroundColor: isLocked ? (isNoteTheme ? '#F5F0E6' : '#f8f8f8') : themeStyles.theme.colors.cardBackground,
        borderColor: isLocked ? (isNoteTheme ? '#D4C4A8' : '#e5e5e5') : (i18n.language !== 'en' ? 'rgba(16, 185, 129, 0.2)' : themeStyles.border),
        minHeight: '140px'
      }}
    >
      {/* Lock badge for locked items */}
      {isLocked && <LockBadge />}

      {/* Subtle "studied" indicator */}
      {!isLocked && isStudied && (
        <div className="absolute top-3 right-3 opacity-40 group-hover:opacity-100 transition-opacity">
          <CheckCircle className="w-4 h-4" style={{ color: themeStyles.textSecondary }} />
        </div>
      )}

      <CardContent className="p-6 flex flex-col items-center justify-center flex-1 text-center">
        {/* Title */}
        <h3 className={cn(
          "text-lg font-medium line-clamp-2",
          isStudied && !isLocked ? "opacity-80" : ""
        )} style={{ color: isLocked ? (isNoteTheme ? '#8B6914' : '#888') : themeStyles.textPrimary }}>
          {topic.title}
        </h3>
        {isLocked && (
          <span className="text-xs mt-2" style={{ color: isNoteTheme ? '#A68B5B' : '#888' }}>Pro</span>
        )}
      </CardContent>
    </Card>
  );
};

export default GrammarPortal;