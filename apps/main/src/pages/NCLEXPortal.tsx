import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import StudentLayout from '@/components/StudentLayout';
import { supabase } from '@/integrations/supabase/client';
import LoadingAnimation from '@/components/animations/LoadingAnimation';
import SEO from '@/components/SEO';
import { useAuth } from '@/hooks/useAuth';
import {
  Home,
  ChevronRight,
  Sparkles,
  Heart,
  Baby,
  Brain,
  Stethoscope,
  Activity,
  Pill,
  Shield,
  Users,
  Clock,
  CheckCircle2,
  BookOpen,
  Target
} from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';
import { useThemeStyles } from '@/hooks/useThemeStyles';
import { useToast } from '@/hooks/use-toast';

// NCLEX Categories with icons and colors
const NCLEX_CATEGORIES = [
  {
    id: 'medical-surgical',
    title: 'Medical-Surgical',
    description: 'Adult health nursing care',
    icon: Stethoscope,
    color: 'from-blue-500 to-cyan-500',
    topics: ['Cardiovascular', 'Respiratory', 'Gastrointestinal', 'Renal'],
  },
  {
    id: 'pediatrics',
    title: 'Pediatrics',
    description: 'Child health nursing',
    icon: Baby,
    color: 'from-pink-500 to-rose-500',
    topics: ['Growth & Development', 'Immunizations', 'Common Illnesses'],
  },
  {
    id: 'maternity',
    title: 'Maternity',
    description: 'Obstetric & newborn care',
    icon: Heart,
    color: 'from-red-500 to-pink-500',
    topics: ['Prenatal', 'Labor & Delivery', 'Postpartum', 'Newborn'],
  },
  {
    id: 'mental-health',
    title: 'Mental Health',
    description: 'Psychiatric nursing',
    icon: Brain,
    color: 'from-purple-500 to-violet-500',
    topics: ['Mood Disorders', 'Anxiety', 'Schizophrenia', 'Substance Abuse'],
  },
  {
    id: 'pharmacology',
    title: 'Pharmacology',
    description: 'Medication administration',
    icon: Pill,
    color: 'from-green-500 to-emerald-500',
    topics: ['Drug Classes', 'Calculations', 'Side Effects', 'Interactions'],
  },
  {
    id: 'fundamentals',
    title: 'Fundamentals',
    description: 'Basic nursing skills',
    icon: Shield,
    color: 'from-amber-500 to-orange-500',
    topics: ['Safety', 'Infection Control', 'Documentation', 'Assessment'],
  },
];

interface NCLEXTest {
  id: string;
  title: string;
  description: string | null;
  category: string;
  difficulty_level: string;
  question_count: number;
  time_limit_minutes: number;
}

interface TestResult {
  test_id: string;
  score: number;
  completed_at: string;
}

const NCLEXPortal = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const themeStyles = useThemeStyles();
  const isNoteTheme = themeStyles.theme.name === 'note';

  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [tests, setTests] = useState<NCLEXTest[]>([]);
  const [userResults, setUserResults] = useState<TestResult[]>([]);
  const [categoryStats, setCategoryStats] = useState<Record<string, { total: number; completed: number }>>({});

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      // Load all published tests
      const { data: testsData, error: testsError } = await supabase
        .from('nclex_tests')
        .select('id, title, description, category, difficulty_level, question_count, time_limit_minutes')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (testsError) {
        console.error('Error loading tests:', testsError);
      } else {
        setTests((testsData as NCLEXTest[]) || []);

        // Calculate category stats
        const stats: Record<string, { total: number; completed: number }> = {};
        (testsData || []).forEach((test: NCLEXTest) => {
          const cat = test.category.toLowerCase().replace(/\s+/g, '-');
          if (!stats[cat]) {
            stats[cat] = { total: 0, completed: 0 };
          }
          stats[cat].total++;
        });
        setCategoryStats(stats);
      }

      // Load user's results if logged in
      if (user) {
        const { data: resultsData, error: resultsError } = await supabase
          .from('nclex_test_results')
          .select('test_id, score, completed_at')
          .eq('user_id', user.id)
          .order('completed_at', { ascending: false });

        if (resultsError) {
          console.error('Error loading results:', resultsError);
        } else {
          setUserResults((resultsData as TestResult[]) || []);

          // Update completed count in stats
          const completedTestIds = new Set((resultsData || []).map((r: TestResult) => r.test_id));
          setCategoryStats(prev => {
            const updated = { ...prev };
            (testsData || []).forEach((test: NCLEXTest) => {
              const cat = test.category.toLowerCase().replace(/\s+/g, '-');
              if (completedTestIds.has(test.id) && updated[cat]) {
                updated[cat].completed++;
              }
            });
            return updated;
          });
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(selectedCategory === categoryId ? null : categoryId);
  };

  const handleStartTest = (testId: string) => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to take NCLEX practice tests',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }
    navigate(`/nclex/test/${testId}`);
  };

  const getTestsByCategory = (categoryId: string) => {
    const categoryName = NCLEX_CATEGORIES.find(c => c.id === categoryId)?.title || '';
    return tests.filter(t => t.category.toLowerCase() === categoryName.toLowerCase());
  };

  const getTestResult = (testId: string) => {
    return userResults.find(r => r.test_id === testId);
  };

  const getDifficultyColor = (level: string) => {
    if (isNoteTheme) return 'bg-transparent border border-[#E8D5A3] text-[#5D4E37]';
    switch (level.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'medium': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'hard': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
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
      className={`min-h-screen relative ${isNoteTheme ? 'font-serif' : ''}`}
      style={{
        backgroundColor: themeStyles.theme.name === 'dark' ? themeStyles.theme.colors.background : 'transparent'
      }}
    >
      {/* Background Texture for Note Theme - ENHANCED NOTEBOOK EFFECT */}
      {(themeStyles.theme.name === 'note') && (
        <>
          <div
            className="absolute inset-0 pointer-events-none opacity-50 z-0"
            style={{
              backgroundColor: '#FEF9E7',
              backgroundImage: `url("https://www.transparenttextures.com/patterns/cream-paper.png")`,
              mixBlendMode: 'multiply'
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none opacity-30 z-0"
            style={{
              backgroundImage: `url("https://www.transparenttextures.com/patterns/notebook.png")`,
              mixBlendMode: 'multiply',
              filter: 'contrast(1.2)'
            }}
          />
        </>
      )}

      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed"
        style={{
          backgroundImage: themeStyles.theme.name === 'note' || themeStyles.theme.name === 'minimalist' || themeStyles.theme.name === 'dark'
            ? 'none'
            : `url('/lovable-uploads/38d81cb0-fd21-4737-b0f5-32bc5d0ae774.png')`,
          backgroundColor: themeStyles.theme.name === 'note' ? '#FEF9E7' : themeStyles.backgroundImageColor
        }} />

      <div className="relative z-10">
        <SEO
          title="NCLEX Practice Tests"
          description="Prepare for NCLEX-RN with comprehensive practice tests. Medical-Surgical, Pediatrics, Maternity, Mental Health, Pharmacology and more. AI-powered feedback and detailed rationales."
          keywords="NCLEX, NCLEX-RN, nursing exam, practice tests, medical-surgical, pediatrics, maternity, pharmacology"
          type="website"
        />

        <StudentLayout title="NCLEX Practice" showBackButton>
          <div className="space-y-6 max-w-6xl mx-auto px-3 md:px-4">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => navigate('/hero')}
                className="inline-flex items-center gap-1 px-2 py-1 text-sm font-medium transition-colors rounded-md hover:bg-muted"
                style={{ color: themeStyles.textSecondary }}
              >
                {!isNoteTheme && <Home className="h-4 w-4" />}
                {isNoteTheme && <span>Home</span>}
              </button>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium" style={{ color: themeStyles.textPrimary }}>
                NCLEX Practice
              </span>
            </div>

            {/* Hero Section */}
            <div className="text-center mb-8">
              {!isNoteTheme && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-teal-500/10 to-cyan-500/10 border border-teal-500/20 mb-4">
                  <Activity className="h-5 w-5 text-teal-500" />
                  <span className="text-sm font-medium text-teal-600 dark:text-teal-400">Nursing Excellence</span>
                </div>
              )}
              <h1 className={`text-3xl md:text-4xl lg:text-5xl font-black tracking-tight mb-3 ${isNoteTheme ? 'font-serif' : ''}`} style={{ color: themeStyles.textPrimary }}>
                NCLEX Practice Tests
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Master nursing concepts with SATA and multiple choice questions. Detailed rationales for every answer.
              </p>
            </div>

            {/* Quick Stats */}
            {user && userResults.length > 0 && (
              <Card
                className="border"
                style={{
                  backgroundColor: themeStyles.theme.colors.cardBackground,
                  borderColor: themeStyles.border
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      {!isNoteTheme && (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 flex items-center justify-center">
                          <Target className="h-6 w-6 text-white" />
                        </div>
                      )}
                      <div>
                        <p className="font-semibold" style={{ color: themeStyles.textPrimary }}>
                          Your Progress
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {userResults.length} tests completed
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-6">
                      <div className="text-center">
                        <p className={`text-2xl font-bold ${isNoteTheme ? '' : 'text-teal-500'}`} style={{ color: isNoteTheme ? themeStyles.textPrimary : undefined }}>
                          {Math.round(userResults.reduce((sum, r) => sum + r.score, 0) / userResults.length)}%
                        </p>
                        <p className="text-xs text-muted-foreground">Avg Score</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold" style={{ color: themeStyles.textPrimary }}>
                          {tests.length}
                        </p>
                        <p className="text-xs text-muted-foreground">Available</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Category Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {NCLEX_CATEGORIES.map((category) => {
                const IconComponent = category.icon;
                const stats = categoryStats[category.id] || { total: 0, completed: 0 };
                const categoryTests = getTestsByCategory(category.id);

                return (
                  <div key={category.id}>
                    <SpotlightCard
                      className="cursor-pointer group transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
                      onClick={() => handleCategoryClick(category.id)}
                      style={{
                        backgroundColor: themeStyles.theme.colors.cardBackground,
                        borderColor: selectedCategory === category.id ? (isNoteTheme ? themeStyles.textSecondary : 'rgb(20, 184, 166)') : themeStyles.border,
                        borderWidth: selectedCategory === category.id ? '2px' : '1px',
                      }}
                    >
                      <CardHeader className="pb-3">
                        {!isNoteTheme && (
                          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${category.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`}>
                            <IconComponent className="h-7 w-7 text-white" />
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-xl" style={{ color: themeStyles.textPrimary }}>
                            {category.title}
                          </CardTitle>
                          {stats.total > 0 && (
                            <Badge variant="secondary" className="text-xs" style={isNoteTheme ? { backgroundColor: 'transparent', border: `1px solid ${themeStyles.border}`, color: themeStyles.textSecondary } : undefined}>
                              {stats.total} tests
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="text-sm">
                          {category.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex flex-wrap gap-1 mb-3">
                          {category.topics.slice(0, 3).map((topic, index) => (
                            <span
                              key={index}
                              className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground"
                              style={isNoteTheme ? { backgroundColor: 'rgba(0,0,0,0.05)', color: themeStyles.textSecondary } : undefined}
                            >
                              {topic}
                            </span>
                          ))}
                          {category.topics.length > 3 && (
                            <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground" style={isNoteTheme ? { backgroundColor: 'rgba(0,0,0,0.05)', color: themeStyles.textSecondary } : undefined}>
                              +{category.topics.length - 3}
                            </span>
                          )}
                        </div>
                        {stats.completed > 0 && (
                          <div className={`flex items-center gap-2 text-sm ${isNoteTheme ? '' : 'text-green-600 dark:text-green-400'}`} style={{ color: isNoteTheme ? themeStyles.textSecondary : undefined }}>
                            {!isNoteTheme && <CheckCircle2 className="h-4 w-4" />}
                            {isNoteTheme && <span>✓</span>}
                            {stats.completed}/{stats.total} completed
                          </div>
                        )}
                        <div className="mt-3 pt-3 border-t border-border">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              {selectedCategory === category.id ? 'Click to collapse' : 'View tests'}
                            </span>
                            {!isNoteTheme && <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${selectedCategory === category.id ? 'rotate-90' : 'group-hover:translate-x-1'}`} />}
                          </div>
                        </div>
                      </CardContent>
                    </SpotlightCard>

                    {/* Expanded Test List */}
                    {selectedCategory === category.id && categoryTests.length > 0 && (
                      <div className={`mt-4 space-y-3 pl-4 border-l-2 ${isNoteTheme ? '' : 'border-teal-500'}`} style={{ borderColor: isNoteTheme ? themeStyles.border : undefined }}>
                        {categoryTests.map((test) => {
                          const result = getTestResult(test.id);
                          return (
                            <Card
                              key={test.id}
                              className="border transition-all hover:shadow-md"
                              style={{
                                backgroundColor: themeStyles.theme.colors.cardBackground,
                                borderColor: themeStyles.border
                              }}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h4 className="font-semibold" style={{ color: themeStyles.textPrimary }}>
                                        {test.title}
                                      </h4>
                                      <Badge className={getDifficultyColor(test.difficulty_level)}>
                                        {test.difficulty_level}
                                      </Badge>
                                    </div>
                                    {test.description && (
                                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                                        {test.description}
                                      </p>
                                    )}
                                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                      <span className="flex items-center gap-1">
                                        {!isNoteTheme && <BookOpen className="h-3 w-3" />}
                                        {test.question_count} questions
                                      </span>
                                      <span className="flex items-center gap-1">
                                        {!isNoteTheme && <Clock className="h-3 w-3" />}
                                        {test.time_limit_minutes} min
                                      </span>
                                      {result && (
                                        <span className={`flex items-center gap-1 ${isNoteTheme ? '' : 'text-green-600 dark:text-green-400'}`} style={{ color: isNoteTheme ? themeStyles.textSecondary : undefined }}>
                                          {!isNoteTheme && <CheckCircle2 className="h-3 w-3" />}
                                          Best: {Math.round(result.score)}%
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <Button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStartTest(test.id);
                                    }}
                                    className={!isNoteTheme ? "bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white" : ""}
                                    style={isNoteTheme ? { backgroundColor: themeStyles.theme.colors.buttonPrimary, color: '#FFF' } : undefined}
                                  >
                                    {result ? 'Retake' : 'Start'}
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}

                    {selectedCategory === category.id && categoryTests.length === 0 && (
                      <div className="mt-4 p-4 text-center text-muted-foreground border border-dashed rounded-lg">
                        No tests available in this category yet
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* All Tests Section (when no category selected) */}
            {!selectedCategory && tests.length > 0 && (
              <div className="mt-8">
                <h2 className="text-2xl font-bold mb-4" style={{ color: themeStyles.textPrimary }}>
                  All Available Tests
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tests.slice(0, 6).map((test) => {
                    const result = getTestResult(test.id);
                    return (
                      <Card
                        key={test.id}
                        className="border transition-all hover:shadow-md cursor-pointer"
                        style={{
                          backgroundColor: themeStyles.theme.colors.cardBackground,
                          borderColor: themeStyles.border
                        }}
                        onClick={() => handleStartTest(test.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold" style={{ color: themeStyles.textPrimary }}>
                                  {test.title}
                                </h4>
                                <Badge className={getDifficultyColor(test.difficulty_level)}>
                                  {test.difficulty_level}
                                </Badge>
                              </div>
                              <Badge variant="outline" className="text-xs mb-2">
                                {test.category}
                              </Badge>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  {!isNoteTheme && <BookOpen className="h-3 w-3" />}
                                  {test.question_count} questions
                                </span>
                                {result && (
                                  <span className={`flex items-center gap-1 ${isNoteTheme ? '' : 'text-green-600 dark:text-green-400'}`} style={{ color: isNoteTheme ? themeStyles.textSecondary : undefined }}>
                                    {!isNoteTheme && <CheckCircle2 className="h-3 w-3" />}
                                    {Math.round(result.score)}%
                                  </span>
                                )}
                              </div>
                            </div>
                            {!isNoteTheme && <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Info Section */}
            <Card
              className={`mt-8 border ${!isNoteTheme ? 'bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950/20 dark:to-cyan-950/20' : ''}`}
              style={{
                borderColor: themeStyles.border,
                backgroundColor: isNoteTheme ? themeStyles.theme.colors.cardBackground : undefined
              }}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  {!isNoteTheme && (
                    <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="h-5 w-5 text-teal-500" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold mb-2" style={{ color: themeStyles.textPrimary }}>
                      About NCLEX Practice
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Our NCLEX practice tests feature both Select All That Apply (SATA) and Multiple Choice questions
                      to prepare you for the real exam. Each question includes detailed rationales explaining
                      why answers are correct or incorrect, helping you understand the nursing concepts deeply.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </StudentLayout>
      </div>
    </div>
  );
};

export default NCLEXPortal;