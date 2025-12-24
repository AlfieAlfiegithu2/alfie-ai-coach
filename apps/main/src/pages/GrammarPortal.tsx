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
import { useTheme } from '@/contexts/ThemeContext';
import { themes, ThemeName } from '@/lib/themes';
import SpotlightCard from '@/components/SpotlightCard';
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
  ChevronLeft,
  GraduationCap
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
  const { themeName, setTheme } = useTheme();
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

      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed"
        style={{
          backgroundImage: themeStyles.theme.name === 'note' || themeStyles.theme.name === 'minimalist' || themeStyles.theme.name === 'dark'
            ? 'none'
            : `url('/1000031207.png')`,
          backgroundColor: themeStyles.backgroundImageColor
        }} />

      <div className="relative z-10">
        <StudentLayout title="Grammar" showBackButton transparentBackground={true}>
          <div className="space-y-6 max-w-6xl mx-auto px-4 md:px-6 pb-12">

            {/* Header Navigation - Kept subtle at top */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <button
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center gap-2 px-3 py-1.5 h-9 text-sm font-medium transition-all rounded-xl hover:shadow-sm"
                style={{
                  color: themeStyles.textSecondary,
                  backgroundColor: isNoteTheme ? 'rgba(255,255,255,0.3)' : 'transparent',
                  border: isNoteTheme ? `1px solid ${themeStyles.border}40` : 'none'
                }}
              >
                Dashboard
              </button>
              <button
                onClick={() => navigate('/ielts-portal')}
                className="inline-flex items-center gap-2 px-3 py-1.5 h-9 text-sm font-medium transition-all rounded-xl hover:shadow-sm"
                style={{
                  color: themeStyles.textSecondary,
                  backgroundColor: isNoteTheme ? 'rgba(255,255,255,0.3)' : 'transparent',
                  border: isNoteTheme ? `1px solid ${themeStyles.border}40` : 'none'
                }}
              >
                {!isNoteTheme && <ChevronLeft className="h-4 w-4" />}
                Back
              </button>
            </div>

            {/* Hero Section - Balanced Centering */}
            <div className="flex flex-col items-center justify-center py-2 md:py-4">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 text-center" style={{ color: themeStyles.textPrimary }}>
                Grammar
              </h1>

              {/* Unified Controls Bar */}
              <div className={cn(
                "flex flex-col sm:flex-row items-center justify-center gap-2 p-1.5 w-full sm:w-auto mx-auto mb-2 relative z-50",
                isNoteTheme ? "bg-white/40 backdrop-blur-md border border-[#e8d5a3]/60 rounded-2xl shadow-sm" : "bg-muted/50 rounded-2xl"
              )}>
                {/* Level Filter Tabs */}
                <Tabs value={selectedLevel} onValueChange={(v) => setSelectedLevel(v as any)} className="w-full sm:w-auto">
                  <TabsList className="grid w-full sm:w-auto grid-cols-4 sm:flex items-center justify-center h-10 p-0 gap-1 bg-transparent border-none shadow-none">
                    <TabsTrigger
                      value="all"
                      className={cn(
                        "rounded-xl transition-all duration-300 px-4 sm:px-8 h-9 text-sm font-medium",
                        isNoteTheme ? "data-[state=active]:bg-[#8b6914] data-[state=active]:text-white data-[state=active]:shadow-md text-[#5d4e37] hover:bg-[#8b6914]/10" : ""
                      )}
                    >
                      All
                    </TabsTrigger>
                    <TabsTrigger
                      value="beginner"
                      className={cn(
                        "rounded-xl transition-all duration-300 px-4 sm:px-8 h-9 text-sm font-medium",
                        isNoteTheme ? "data-[state=active]:bg-[#8b6914] data-[state=active]:text-white data-[state=active]:shadow-md text-[#5d4e37] hover:bg-[#8b6914]/10" : "text-emerald-600"
                      )}
                    >
                      Beginner
                    </TabsTrigger>
                    <TabsTrigger
                      value="intermediate"
                      className={cn(
                        "rounded-xl transition-all duration-300 px-4 sm:px-8 h-9 text-sm font-medium",
                        isNoteTheme ? "data-[state=active]:bg-[#8b6914] data-[state=active]:text-white data-[state=active]:shadow-md text-[#5d4e37] hover:bg-[#8b6914]/10" : "text-blue-600"
                      )}
                    >
                      Intermediate
                    </TabsTrigger>
                    <TabsTrigger
                      value="advanced"
                      className={cn(
                        "rounded-xl transition-all duration-300 px-4 sm:px-8 h-9 text-sm font-medium",
                        isNoteTheme ? "data-[state=active]:bg-[#8b6914] data-[state=active]:text-white data-[state=active]:shadow-md text-[#5d4e37] hover:bg-[#8b6914]/10" : "text-purple-600"
                      )}
                    >
                      Advanced
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="hidden sm:block w-px h-6 bg-[#e8d5a3]/40 mx-1" />

                {/* Language Selector */}
                <div className="flex-shrink-0">
                  <LanguageSelector minimal />
                </div>
              </div>
            </div>

            {/* Topics Grid by Level */}
            {selectedLevel === 'all' ? (
              // Show all levels in sections
              Object.entries(groupedTopics).map(([level, levelTopics]) => {
                return (
                  levelTopics.length > 0 && (
                    <div key={level} className="mb-6">
                      <div className="flex items-center justify-center gap-3 mb-4">
                        {!isNoteTheme && <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${levelColors[level as keyof typeof levelColors].bg}`} />}
                        <h2 className="text-3xl font-bold text-center" style={{ color: themeStyles.textPrimary }}>
                          {levelLabels[level as keyof typeof levelLabels]}
                        </h2>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                        {levelTopics.map((topic, index) => {
                          return (
                            <TopicCard
                              key={topic.id}
                              topic={topic}
                              progress={userProgress[topic.id]}
                              onClick={() => handleTopicClick(topic)}
                              themeStyles={themeStyles}
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
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {filteredTopics.map((topic, index) => {
                      return (
                        <TopicCard
                          key={topic.id}
                          topic={topic}
                          progress={userProgress[topic.id]}
                          onClick={() => handleTopicClick(topic)}
                          themeStyles={themeStyles}
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
  const { i18n } = useTranslation();
  const isNoteTheme = themeStyles.theme.name === 'note';
  const isStudied = progress && (progress.theory_completed || progress.mastery_level > 0);

  return (
    <SpotlightCard
      className="cursor-pointer h-[140px] hover:scale-105 transition-all duration-300 hover:shadow-lg rounded-2xl flex items-center justify-center relative"
      onClick={onClick}
      style={{
        backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.8)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground,
        borderColor: (i18n.language !== 'en' ? 'rgba(16, 185, 129, 0.2)' : themeStyles.border),
        ...themeStyles.cardStyle
      }}
    >
      {/* Subtle "studied" indicator */}
      {isStudied && (
        <div className="absolute top-3 right-3 opacity-40 group-hover:opacity-100 transition-opacity">
          <CheckCircle className="w-4 h-4" style={{ color: themeStyles.textSecondary }} />
        </div>
      )}

      <CardContent className="p-4 text-center">
        {/* Title */}
        <h3 className={cn(
          "text-sm font-semibold line-clamp-2",
          isStudied ? "opacity-80" : ""
        )} style={{ color: themeStyles.textPrimary }}>
          {topic.title}
        </h3>
      </CardContent>
    </SpotlightCard>
  );
};

export default GrammarPortal;