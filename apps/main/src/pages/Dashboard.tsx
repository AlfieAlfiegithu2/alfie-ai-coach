import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { BookOpen, Target, TrendingUp, Trophy, Users, User, Zap, ChevronRight, Globe, GraduationCap, MessageSquare, PenTool, Volume2, CheckCircle, Star, Clock, Award, BarChart3, PieChart, Activity, Languages, Calendar, Home, Settings, History, Briefcase, FileText } from "lucide-react";
import { useNavigate, Navigate, useSearchParams } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DailyChallenge from "@/components/DailyChallenge";
import PageLoadingScreen from '@/components/PageLoadingScreen';
import SettingsModal from "@/components/SettingsModal";
import TestResultsChart from "@/components/TestResultsChart";
import StudyPlanTodoList from "@/components/StudyPlanTodoList";
import LanguagePicker from "@/components/LanguagePicker";
import { normalizeLanguageCode } from "@/lib/languageUtils";
import { useThemeStyles } from "@/hooks/useThemeStyles";

interface UserStats {
  totalTests: number;
  completedTests?: number;
  averageScore?: number;
  avgScore?: number;
  studyStreak?: number;
  recentImprovement?: number;
  weeklyProgress?: number;
}

interface TestResult {
  id: string;
  test_type: string;
  skill?: string;
  score?: number;
  score_percentage?: number;
  band_score?: number;
  band_scores?: Record<string, number> | any;
  created_at: string;
  user_id: string;
  task_number?: number;
  test_data?: any;
  section_number?: number | null;
  total_questions?: number | null;
  correct_answers?: number | null;
  time_taken?: number | null;
  completed_at?: string | null;
  audio_retention_expires_at?: string | null;
  detailed_feedback?: any;
  question_analysis?: any;
  performance_metrics?: any;
  skill_breakdown?: any;
}

interface UserPreferences {
  target_test_type?: string;
  native_language?: string;
  study_goals?: string[];
  preferred_name?: string;
  target_score?: number;
  target_deadline?: string | null;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const {
    user,
    profile,
    refreshProfile,
    loading: authLoading
  } = useAuth();
  const {
    toast
  } = useToast();
  const themeStyles = useThemeStyles();
  const [selectedTestType, setSelectedTestType] = useState("IELTS");
  const [selectedSkill, setSelectedSkill] = useState("reading");
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedWordsCount, setSavedWordsCount] = useState(0);
  const [activeTab, setActiveTab] = useState("overview");
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [hasShownAutoSettings, setHasShownAutoSettings] = useState(false);
  const [mockStats, setMockStats] = useState<Record<string, { tests: number; avg: number; latest: number }>>({});

  // ⚡ SILENT CACHE: Instant Dashboard Load
  const [isCachedLoad, setIsCachedLoad] = useState(false);

  const getCacheKey = (type: string) => `dashboard_${type}_${user?.id}`;

  // Cache preferred_name in localStorage for instant display
  const getCachedNickname = (): string | null => {
    if (!user?.id) return null;
    try {
      const cached = localStorage.getItem(`nickname_${user.id}`);
      if (cached) {
        const { nickname, timestamp } = JSON.parse(cached);
        // Cache valid for 24 hours
        if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
          return nickname;
        }
      }
    } catch (e) {
      // Ignore localStorage errors
    }
    return null;
  };

  const cacheNickname = (nickname: string | null) => {
    if (!user?.id) return;
    try {
      if (nickname) {
        localStorage.setItem(`nickname_${user.id}`, JSON.stringify({
          nickname,
          timestamp: Date.now()
        }));
      } else {
        localStorage.removeItem(`nickname_${user.id}`);
      }
    } catch (e) {
      // Ignore localStorage errors
    }
  };
  const testTypes = [{
    id: "IELTS",
    name: "IELTS",
    description: "International English Language Testing System",
    icon: Globe,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20"
  }, {
    id: "PTE",
    name: "PTE Academic",
    description: "Pearson Test of English Academic",
    icon: GraduationCap,
    color: "text-gray-500",
    bgColor: "bg-gray-500/10",
    borderColor: "border-gray-500/20"
  }, {
    id: "TOEFL",
    name: "TOEFL iBT",
    description: "Test of English as a Foreign Language",
    icon: BookOpen,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20"
  }, {
    id: "TOEIC",
    name: "TOEIC",
    description: "Test of English for International Communication",
    icon: FileText,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/20"
  }, {
    id: "Business",
    name: "Business English",
    description: "Professional communication and career development",
    icon: Briefcase,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20"
  }, {
    id: "NCLEX",
    name: "NCLEX",
    description: "Nursing licensure examination preparation",
    icon: Activity,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20"
  }, {
    id: "GENERAL",
    name: "General English",
    description: "Comprehensive English proficiency practice",
    icon: MessageSquare,
    color: "text-gray-500",
    bgColor: "bg-gray-500/10",
    borderColor: "border-gray-500/20"
  }];
  const skills = [
    { id: 'reading', label: 'R', fullLabel: t('skills.reading'), icon: BookOpen },
    { id: 'listening', label: 'L', fullLabel: t('skills.listening'), icon: Volume2 },
    { id: 'writing', label: 'W', fullLabel: t('skills.writing'), icon: PenTool },
    { id: 'speaking', label: 'S', fullLabel: t('skills.speaking'), icon: MessageSquare }
  ];
  const achievements = [{
    icon: Trophy,
    label: "7-day streak",
    color: "text-gray-500"
  }, {
    icon: Target,
    label: "95% accuracy",
    color: "text-blue-500"
  }, {
    icon: Award,
    label: "100 questions",
    color: "text-blue-500"
  }, {
    icon: Star,
    label: "Top 10%",
    color: "text-gray-500"
  }];


  // Function to reload user preferences with retry logic
  const reloadUserPreferences = async (retryCount = 0) => {
    if (!user) return;

    const maxRetries = 1; // Only retry once to prevent too many requests
    const retryDelay = 2000; // 2 second delay

    try {
      const {
        data: preferences,
        error: prefError
      } = await supabase.from('user_preferences').select('*').eq('user_id', user.id).maybeSingle();

      if (prefError) {
        // Check if it's a network error that we should retry
        const isNetworkError = prefError.message?.includes('ERR_CONNECTION_CLOSED') ||
          prefError.message?.includes('Failed to fetch') ||
          prefError.message?.includes('NetworkError');

        // Check if it's a column error (400 Bad Request when column doesn't exist)
        const isColumnError =
          prefError.code === 'PGRST204' ||
          prefError.code === '42703' ||
          prefError.code === '42P01' ||
          prefError.message?.toLowerCase().includes('column') ||
          prefError.message?.toLowerCase().includes('does not exist') ||
          prefError.message?.toLowerCase().includes('bad request');

        // Retry network errors once
        if (isNetworkError && retryCount < maxRetries) {
          if (import.meta.env.DEV) {
            console.warn(`Network error fetching preferences (attempt ${retryCount + 1}/${maxRetries + 1}), retrying in ${retryDelay}ms...`);
          }
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return reloadUserPreferences(retryCount + 1);
        }

        // Silently ignore column errors - use defaults
        if (!isColumnError && !isNetworkError && import.meta.env.DEV) {
          console.warn('Error fetching preferences:', prefError);
        }
        setUserPreferences(null);
      } else if (preferences) {
        setUserPreferences(preferences);
        setSelectedTestType(preferences.target_test_type || 'IELTS');
        setRefreshKey(prev => prev + 1);
        // Cache nickname for instant display next time
        if (preferences.preferred_name) {
          cacheNickname(preferences.preferred_name);
        }
      } else {
        // If no preferences found, set to null to use fallback
        setUserPreferences(null);
        // Clear cached nickname if no preferences
        cacheNickname(null);
      }
    } catch (error: any) {
      // Check if it's a network error
      const isNetworkError = error?.message?.includes('ERR_CONNECTION_CLOSED') ||
        error?.message?.includes('Failed to fetch') ||
        error?.message?.includes('NetworkError');

      // Check if it's a column error
      const isColumnError =
        error?.code === 'PGRST204' ||
        error?.code === '42703' ||
        error?.code === '42P01' ||
        error?.message?.toLowerCase().includes('column') ||
        error?.message?.toLowerCase().includes('does not exist') ||
        error?.message?.toLowerCase().includes('bad request');

      // Retry network errors once
      if (isNetworkError && retryCount < maxRetries) {
        if (import.meta.env.DEV) {
          console.warn(`Network error reloading preferences (attempt ${retryCount + 1}/${maxRetries + 1}), retrying in ${retryDelay}ms...`);
        }
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return reloadUserPreferences(retryCount + 1);
      }

      if (!isColumnError && !isNetworkError && import.meta.env.DEV) {
        console.error('Error reloading preferences:', error);
      }
      setUserPreferences(null);
    }
  };

  // Check if settings setup is required (for new Google sign-in users)
  useEffect(() => {
    if (!user || authLoading || loading) return;

    const setupRequired = searchParams.get('setup') === 'required';

    // Only open settings modal if explicitly required via query parameter
    if (setupRequired) {
      console.log('🆕 Settings setup explicitly required, opening settings modal');
      setSettingsModalOpen(true);
      // Remove query parameter from URL
      setSearchParams({}, { replace: true });
      // Show toast to guide user
      toast({
        title: "Welcome! Complete your profile",
        description: "Please set up your preferences to get started.",
        duration: 5000,
      });
    }
  }, [user, authLoading, loading, searchParams, setSearchParams, toast]);

  // Auto-open settings for brand new users who haven't set preferences yet
  useEffect(() => {
    if (!user || authLoading || loading || hasShownAutoSettings) return;

    const seenKey = `settings_seen_${user.id}`;
    const hasSeen = localStorage.getItem(seenKey) === 'true';

    if (hasSeen) {
      setHasShownAutoSettings(true);
      return;
    }

    if (!userPreferences && !hasSeen) {
      setSettingsModalOpen(true);
      localStorage.setItem(seenKey, 'true');
      setHasShownAutoSettings(true);
    }
  }, [user, authLoading, loading, userPreferences, hasShownAutoSettings]);

  // Fetch user data from Supabase with automatic retry
  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const MAX_RETRIES = 2;

    const fetchUserData = async (): Promise<void> => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // 1. Silent Cache: Instant Load
        const cacheKey = getCacheKey('data');
        const cached = localStorage.getItem(cacheKey);
        if (cached && !isCachedLoad) {
          try {
            const parsed = JSON.parse(cached);
            setTestResults(parsed.testResults || []);
            setUserStats(parsed.userStats || null);
            setSavedWordsCount(parsed.savedWordsCount || 0);
            setIsCachedLoad(true);
            setLoading(false); // Hide spinner immediately
            console.log('⚡ Dashboard results loaded instantly from cache');
          } catch (e) {
            console.error('Failed to parse dashboard cache', e);
          }
        } else if (!isCachedLoad) {
          setLoading(true);
        }

        // 2. Fresh Data Fetch
        await reloadUserPreferences();

        // Fetch multiple result tables in parallel
        const [resultsRes, readingRes, writingRes] = await Promise.all([
          supabase.from('test_results').select('id, test_type, score_percentage, created_at, user_id').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
          supabase.from('reading_test_results').select('id, comprehension_score, created_at, reading_time_seconds, user_id').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
          supabase.from('writing_test_results').select('id, created_at, task_number, band_scores, user_id, test_result_id').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10)
        ]);

        if (resultsRes.error) console.warn('Error fetching test results:', resultsRes.error);
        if (readingRes.error) console.warn('Error fetching reading results:', readingRes.error);

        const allResults = [...(resultsRes.data || [])] as TestResult[];

        // Process Reading Results
        if (readingRes.data) {
          readingRes.data.forEach(result => {
            allResults.push({
              id: result.id,
              user_id: result.user_id,
              test_type: 'reading',
              score_percentage: Math.round(result.comprehension_score * 100),
              created_at: result.created_at,
              test_data: { readingResult: result },
              total_questions: 40,
              correct_answers: Math.floor((result.comprehension_score || 0) * 40),
              time_taken: result.reading_time_seconds,
              completed_at: result.created_at
            });
          });
        }

        // Process Writing Results
        if (writingRes.data) {
          const writingByTest: { [key: string]: any[] } = {};
          writingRes.data.forEach((result: any) => {
            const key = result.test_result_id || result.created_at?.split('T')[0] || 'standalone';
            if (!writingByTest[key]) writingByTest[key] = [];
            writingByTest[key].push(result);
          });

          Object.entries(writingByTest).forEach(([key, results]) => {
            if (key !== 'standalone' && allResults.some(r => r.id === key)) return;

            const task1Result = results.find((r: any) => r.task_number === 1);
            const task2Result = results.find((r: any) => r.task_number === 2);
            let overallScore = 70;

            if (task1Result && task2Result) {
              const extractBand = (r: any): number => {
                if (r.band_scores && typeof r.band_scores === 'object') {
                  const bands = Object.values(r.band_scores).filter(v => typeof v === 'number') as number[];
                  return bands.length > 0 ? (bands.reduce((a, b) => a + b, 0) / bands.length) : 7.0;
                }
                return 7.0;
              };
              const overallBand = ((extractBand(task1Result) * 1) + (extractBand(task2Result) * 2)) / 3;
              overallScore = Math.round(overallBand * 10);
            }

            allResults.push({
              id: key === 'standalone' ? `writing-${Date.now()}` : key,
              user_id: user.id,
              test_type: 'writing',
              score_percentage: overallScore,
              created_at: results[0].created_at,
              test_data: { writingResults: results } as any,
              total_questions: results.length,
              completed_at: results[0].created_at
            });
          });
        }

        allResults.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        if (isMounted) {
          setTestResults(allResults as TestResult[]);

          const totalTests = allResults.length;
          const avgScore = totalTests > 0 ? allResults.reduce((acc, test) => acc + (test.score_percentage || 0), 0) / totalTests : 0;

          const freshStats = {
            totalTests,
            avgScore: Math.round(avgScore),
            recentImprovement: totalTests > 1 ? Math.round((allResults[0]?.score_percentage || 0) - (allResults[1]?.score_percentage || 0)) : 0,
            weeklyProgress: 15
          };

          setUserStats(freshStats);

          // Get vocabulary count
          const { count } = await supabase.from('user_vocabulary').select('id', { count: 'exact', head: true }).eq('user_id', user.id);
          const currentVocabCount = count || 0;
          setSavedWordsCount(currentVocabCount);

          // Update Cache
          localStorage.setItem(cacheKey, JSON.stringify({
            testResults: allResults,
            userStats: freshStats,
            savedWordsCount: currentVocabCount
          }));
          console.log('✅ Dashboard sync complete and cached');
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        if (isMounted && retryCount < MAX_RETRIES) {
          retryCount++;
          setTimeout(fetchUserData, Math.pow(2, retryCount) * 1000);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchUserData();

    return () => { isMounted = false; };
  }, [user]);

  const loadSavedWordsCount = async () => {
    if (!user) return;

    try {
      const { count, error } = await supabase
        .from('user_vocabulary')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (error) {
        console.warn('Error loading vocabulary count:', error);
        return;
      }

      setSavedWordsCount(count || 0);
    } catch (error) {
      console.error('Error loading vocabulary count:', error);
    }
  };
  const handleStartPractice = () => {
    // Navigate to exam selection portal
    navigate('/exam-selection');
  };
  const handleViewResults = (skillId: string) => {
    // Navigate to skill-specific detailed results page
    const skillRoutes = {
      'reading': '/reading-results',
      'writing': '/ielts-writing-results',
      'speaking': '/ielts-speaking-results',
      'listening': '/listening-results'
    };
    const route = skillRoutes[skillId as keyof typeof skillRoutes];
    if (route) {
      navigate(route);
    } else {
      // Fallback to personal page
      navigate('/personal');
    }
  };

  const buildMock = () => {
    const tests = Math.floor(Math.random() * 5) + 1; // 1-5 tests
    const avg = Math.floor(Math.random() * 50) + 50; // 50-99%
    const latest = Math.floor(Math.random() * 50) + 50; // 50-99%
    return { tests, avg, latest };
  };

  const generateMockStats = (skillId: string) => {
    setMockStats(prev => ({ ...prev, [skillId]: buildMock() }));
  };

  const generateAllMockStats = () => {
    const next: Record<string, { tests: number; avg: number; latest: number }> = {};
    skills.forEach((skill) => {
      next[skill.id] = buildMock();
    });
    setMockStats(prev => ({ ...prev, ...next }));
  };

  const getDisplayStats = (skillId: string, skillResults: TestResult[], averageScore: number) => {
    if (skillResults.length > 0) {
      return {
        testsTaken: skillResults.length,
        avgDisplay: convertToIELTSScore(averageScore),
        latestDisplay: convertToIELTSScore(skillResults[0]?.score_percentage || 0),
      };
    }
    const mock = mockStats[skillId];
    return {
      testsTaken: mock?.tests ?? 0,
      avgDisplay: convertToIELTSScore(mock?.avg ?? 0),
      latestDisplay: convertToIELTSScore(mock?.latest ?? 0),
    };
  };

  // Convert percentage to IELTS band score
  const convertToIELTSScore = (percentage: number) => {
    if (percentage >= 95) return "9.0";
    if (percentage >= 90) return "8.5";
    if (percentage >= 85) return "8.0";
    if (percentage >= 80) return "7.5";
    if (percentage >= 75) return "7.0";
    if (percentage >= 70) return "6.5";
    if (percentage >= 65) return "6.0";
    if (percentage >= 60) return "5.5";
    if (percentage >= 55) return "5.0";
    if (percentage >= 50) return "4.5";
    if (percentage >= 45) return "4.0";
    if (percentage >= 40) return "3.5";
    if (percentage >= 35) return "3.0";
    if (percentage >= 30) return "2.5";
    if (percentage >= 25) return "2.0";
    if (percentage >= 20) return "1.5";
    return "1.0";
  };
  // Wait for auth to finish loading
  if (authLoading) {
    return <PageLoadingScreen />;
  }

  // Redirect to auth if not authenticated
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Show loading while dashboard data loads
  if (loading) {
    return <PageLoadingScreen />;
  }

  // Guest mode: allow viewing dashboard without login (removed - now requires auth)
  // If not logged in, we render a limited dashboard without user-specific data

  const isNoteTheme = themeStyles.theme.name === 'note';
  const bgColor = themeStyles.theme.name === 'dark' ? themeStyles.theme.colors.background : isNoteTheme ? '#FFFAF0' : 'transparent';

  return (
    <div className="h-screen relative overflow-hidden" style={{ backgroundColor: bgColor }}>
      {/* Background Image */}
      <div className="absolute inset-0 bg-contain bg-center bg-no-repeat bg-fixed" style={{
        backgroundImage: themeStyles.theme.name === 'note' || themeStyles.theme.name === 'minimalist' || themeStyles.theme.name === 'dark'
          ? 'none'
          : `url('/lovable-uploads/5d9b151b-eb54-41c3-a578-e70139faa878.png')`,
        backgroundColor: isNoteTheme ? '#FFFAF0' : themeStyles.backgroundImageColor
      }} />

      {/* Paper texture overlays for Note theme */}
      {isNoteTheme && (
        <>
          <div
            className="absolute inset-0 pointer-events-none opacity-30 z-0"
            style={{
              backgroundImage: `url("https://www.transparenttextures.com/patterns/rice-paper-2.png")`,
              mixBlendMode: 'multiply'
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none opacity-10 z-0"
            style={{
              backgroundImage: `url("https://www.transparenttextures.com/patterns/natural-paper.png")`,
              mixBlendMode: 'multiply',
              filter: 'contrast(1.2)'
            }}
          />
        </>
      )}

      <div className="relative z-10 h-full w-full flex flex-col">

        <div
          className={`relative w-full h-full overflow-y-auto border backdrop-blur-xl`}
          style={{
            backgroundColor: themeStyles.backgroundOverlay,
            borderColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255, 255, 255, 0.3)' : themeStyles.border + '40',
            backdropFilter: themeStyles.theme.name === 'glassmorphism' ? 'blur(12px)' : themeStyles.theme.name === 'dark' ? 'blur(8px)' : 'none'
          }}
        >
          {/* Header */}
          <header
            className="flex flex-col lg:flex-row sm:px-6 lg:px-12 lg:py-5 pt-4 pr-4 pb-4 pl-4 items-center justify-between border-b gap-4 lg:gap-0"
            style={{
              borderColor: themeStyles.theme.name === 'glassmorphism'
                ? 'rgba(255, 255, 255, 0.2)'
                : themeStyles.border + '60'
            }}
          >
            {/* Left section - empty for now */}
            <div className="flex items-center gap-3 order-3 lg:order-1">

            </div>

            {/* Center section - Navigation */}
            <nav className="flex items-center gap-4 lg:gap-6 text-sm font-medium order-1 lg:order-2 flex-wrap justify-center">
              <button
                onClick={() => navigate('/dashboard/my-word-book')}
                className="transition whitespace-nowrap"
                style={{
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  color: themeStyles.textSecondary
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = themeStyles.buttonPrimary}
                onMouseLeave={(e) => e.currentTarget.style.color = themeStyles.textSecondary}
              >
                {t('dashboard.myWordBook')}
              </button>

              <button
                onClick={() => navigate('/exam-selection')}
                className="transition whitespace-nowrap"
                style={{
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  color: themeStyles.textSecondary
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = themeStyles.buttonPrimary}
                onMouseLeave={(e) => e.currentTarget.style.color = themeStyles.textSecondary}
              >
                {t('dashboard.tests')}
              </button>

              <button
                onClick={() => navigate('/hero')}
                className="transition whitespace-nowrap"
                style={{
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  color: themeStyles.textSecondary
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = themeStyles.buttonPrimary}
                onMouseLeave={(e) => e.currentTarget.style.color = themeStyles.textSecondary}
              >
                {t('dashboard.home')}
              </button>

              <button
                onClick={() => navigate('/community')}
                className="transition whitespace-nowrap"
                style={{
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  color: themeStyles.textSecondary
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = themeStyles.buttonPrimary}
                onMouseLeave={(e) => e.currentTarget.style.color = themeStyles.textSecondary}
              >
                {t('navigation.community')}
              </button>
            </nav>

            {/* Right section - Controls */}
            <div className="flex items-center gap-2 lg:gap-3 order-2 lg:order-3 relative z-50">
              {/* Clickable User Avatar - Opens Settings */}
              <SettingsModal
                open={settingsModalOpen}
                onOpenChange={setSettingsModalOpen}
                onSettingsChange={() => {
                  reloadUserPreferences();
                  refreshProfile();
                  setRefreshKey(prev => prev + 1);
                  // Close modal after settings are saved
                  setSettingsModalOpen(false);
                }}>
                <button className="group w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-slate-800/80 backdrop-blur-sm flex items-center justify-center border border-white/20 overflow-hidden hover:border-blue-400/50 transition-all duration-200 hover:scale-105" title={t('dashboard.clickToOpenSettings')}>
                  {profile?.avatar_url ? <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover group-hover:opacity-80 transition-opacity" /> : <User className="w-4 h-4 text-white group-hover:text-blue-300 transition-colors" />}

                  {/* Settings overlay on hover */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center">
                    <Settings className="w-3 h-3 text-white" />
                  </div>
                </button>
              </SettingsModal>
            </div>
          </header>

          {/* Main Content */}
          <main className="relative flex-1 overflow-y-auto sm:px-6 lg:px-12 pr-4 pb-4 pl-4">
            {/* Greeting / Title Row */}
            <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 pt-3 lg:pt-4">
              {/* Left column */}
              <div className="flex flex-col gap-4 h-full">
                {/* Greeting */}
                <div className="space-y-3">
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl tracking-tight font-semibold flex-shrink-0" style={{
                    fontFamily: 'Comfortaa, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, cursive, sans-serif',
                    color: themeStyles.textPrimary
                  }}>
                    {t('dashboard.helloUser', {
                      name: (() => {
                        // Priority: cached nickname > userPreferences preferred_name > profile full_name > Learner
                        // Use cached nickname for instant display, then update when DB loads
                        const cachedNickname = getCachedNickname();
                        if (cachedNickname) {
                          return cachedNickname;
                        }
                        if (userPreferences?.preferred_name) {
                          return userPreferences.preferred_name;
                        }
                        if (profile?.full_name) {
                          return profile.full_name.split(' ')[0];
                        }
                        // Show "Learner" while loading instead of email
                        return 'Learner';
                      })()
                    })}
                  </h1>
                </div>

                {/* Skills Selection Card */}
                <div className="grid grid-cols-4 gap-2 lg:gap-3 flex-shrink-0">
                  {skills.map(skill => {
                    const isSelected = selectedSkill === skill.id;
                    const unselectedClasses = `bg-white/40 border-gray-200 hover:bg-gray-50`;
                    return <button
                      key={skill.id}
                      onClick={() => setSelectedSkill(skill.id)}
                      className={`flex flex-col items-center justify-center gap-2 p-2 lg:p-3 rounded-xl border transition-all min-h-[60px] ${isSelected ? themeStyles.cardClassName + ' shadow-md' : unselectedClasses}`}
                      style={{
                        ...(isSelected ? themeStyles.cardStyle : {}),
                        borderColor: themeStyles.border,
                      }}
                    >
                      <span
                        className={`text-xs lg:text-sm font-medium text-center leading-tight px-1`}
                        style={{
                          fontFamily: 'Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                          color: isSelected ? themeStyles.textPrimary : themeStyles.textSecondary
                        }}
                      >
                        {skill.fullLabel}
                      </span>
                    </button>;
                  })}
                </div>

                {/* Test Results Chart - Fixed height */}
                <div className="flex-shrink-0" style={{ height: '400px' }}>
                  <TestResultsChart
                    key={refreshKey}
                    selectedSkill={selectedSkill}
                    selectedTestType={selectedTestType}
                  />
                </div>

                {/* Study Plan Todo List - Fixed top position */}
                <div className="flex-shrink-0 mt-4">
                  <StudyPlanTodoList />
                </div>


              </div>

              {/* Right column */}
              <div className="flex flex-col h-full">
                {/* Add padding-top to align with left column content (after greeting) */}
                <div className="grid xl:grid-cols-1 h-full pt-12 sm:pt-16 lg:pt-20">
                  {/* Test Results and Feedback Cards */}
                  <div className="flex flex-col flex-1 justify-start gap-4">
                    {skills.map(skill => {
                      // Get recent test results for this skill
                      const skillResults = testResults.filter(result => {
                        if (skill.id === 'writing') {
                          return result.test_type === 'writing';
                        }
                        return result.test_type && result.test_type.toLowerCase().includes(skill.id.toLowerCase());
                      }).slice(0, 3);
                      const averageScore = skillResults.length > 0 ? Math.round(skillResults.reduce((acc, test) => acc + (test.score_percentage || 0), 0) / skillResults.length) : 0;
                      const isWritingOrSpeaking = skill.id === 'writing' || skill.id === 'speaking';
                      const stats = getDisplayStats(skill.id, skillResults, averageScore);
                      return <div
                        key={skill.id}
                        className={`relative lg:p-6 ${themeStyles.cardClassName} rounded-xl pt-4 pr-4 pb-4 pl-4 min-h-[190px] flex flex-col transition-all hover:shadow-md`}
                        style={themeStyles.cardStyle}
                      >
                        <div className="relative flex items-center justify-center mb-3">
                          <h3 className="text-sm lg:text-base tracking-tight font-normal text-center" style={{
                            fontFamily: 'Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                            color: themeStyles.textPrimary
                          }}>
                            {skill.fullLabel}
                          </h3>
                          <History
                            onClick={e => {
                              e.stopPropagation();
                              handleViewResults(skill.id);
                            }}
                            className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 cursor-pointer transition-colors"
                            style={{ color: themeStyles.textSecondary }}
                            onMouseEnter={(e) => e.currentTarget.style.color = themeStyles.textPrimary}
                            onMouseLeave={(e) => e.currentTarget.style.color = themeStyles.textSecondary}
                            aria-label={t('dashboard.viewHistory')}
                          />
                        </div>

                        <div className="flex-1 flex flex-col justify-center">
                          <div className="grid grid-cols-3 gap-4">
                            <div className="text-center">
                              <p className="text-sm font-normal mb-1" style={{
                                fontFamily: 'Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                color: themeStyles.textSecondary
                              }}>
                                {t('dashboard.testsTaken')}
                              </p>
                              <p className="text-lg lg:text-xl font-medium mt-2" style={{
                                fontFamily: 'Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                color: themeStyles.textPrimary
                              }}>{stats.testsTaken}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-sm font-normal mb-1" style={{
                                fontFamily: 'Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                color: themeStyles.textSecondary
                              }}>
                                {t('dashboard.averageScore')}
                              </p>
                              <p className="text-lg lg:text-xl font-medium mt-2" style={{
                                fontFamily: 'Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                color: themeStyles.textPrimary
                              }}>{stats.avgDisplay}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-sm font-normal mb-1" style={{
                                fontFamily: 'Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                color: themeStyles.textSecondary
                              }}>
                                {t('dashboard.latestScore')}
                              </p>
                              <p className="text-lg lg:text-xl font-medium mt-2" style={{
                                fontFamily: 'Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                color: themeStyles.textPrimary
                              }}>{stats.latestDisplay}</p>
                            </div>
                          </div>
                        </div>
                      </div>;
                    })}
                  </div>

                  {/* Mock data action */}
                  <div className="flex justify-end mt-4">
                    <button
                      className="text-xs font-medium underline"
                      style={{ color: themeStyles.buttonPrimary }}
                      onClick={generateAllMockStats}
                    >
                      {t('dashboard.generateMockNumbers')}
                    </button>
                  </div>

                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
export default Dashboard;