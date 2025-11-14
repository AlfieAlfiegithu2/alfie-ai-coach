import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { BookOpen, Target, TrendingUp, Trophy, Users, User, Zap, ChevronRight, Globe, GraduationCap, MessageSquare, PenTool, Volume2, CheckCircle, Star, Clock, Award, BarChart3, PieChart, Activity, Languages, Calendar, Home, Settings, History } from "lucide-react";
import { useNavigate, Navigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DailyChallenge from "@/components/DailyChallenge";
import LoadingAnimation from "@/components/animations/LoadingAnimation";
import SettingsModal from "@/components/SettingsModal";
import TestResultsChart from "@/components/TestResultsChart";
import StudyPlanTodoList from "@/components/StudyPlanTodoList";
import LanguagePicker from "@/components/LanguagePicker";
import { normalizeLanguageCode } from "@/lib/languageUtils";
import { useThemeStyles } from "@/hooks/useThemeStyles";

interface UserStats {
  totalTests: number;
  completedTests: number;
  averageScore: number;
  studyStreak: number;
}

interface TestResult {
  id: string;
  test_type: string;
  skill: string;
  score: number;
  band_score?: number;
  created_at: string;
  user_id: string;
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


  // Function to reload user preferences
  const reloadUserPreferences = async () => {
    if (!user) return;
    
    try {
      const {
        data: preferences,
        error: prefError
      } = await supabase.from('user_preferences').select('*').eq('user_id', user.id).maybeSingle();
      
      if (prefError) {
        // Check if it's a column error (400 Bad Request when column doesn't exist)
        const isColumnError = 
          prefError.code === 'PGRST204' ||
          prefError.code === '42703' ||
          prefError.code === '42P01' ||
          prefError.message?.toLowerCase().includes('column') ||
          prefError.message?.toLowerCase().includes('does not exist') ||
          prefError.message?.toLowerCase().includes('bad request');
        
        // Silently ignore column errors - use defaults
        if (!isColumnError) {
          console.warn('Error fetching preferences:', prefError);
        }
        setUserPreferences(null);
      } else if (preferences) {
        setUserPreferences(preferences);
        setSelectedTestType(preferences.target_test_type || 'IELTS');
        setRefreshKey(prev => prev + 1);
      } else {
        // If no preferences found, set to null to use fallback
        setUserPreferences(null);
      }
    } catch (error: any) {
      // Check if it's a column error
      const isColumnError = 
        error?.code === 'PGRST204' ||
        error?.code === '42703' ||
        error?.code === '42P01' ||
        error?.message?.toLowerCase().includes('column') ||
        error?.message?.toLowerCase().includes('does not exist') ||
        error?.message?.toLowerCase().includes('bad request');
      
      if (!isColumnError) {
        console.error('Error reloading preferences:', error);
      }
      setUserPreferences(null);
    }
  };

  // Fetch user data from Supabase
  useEffect(() => {
    // Preload the background image
    const img = new Image();
    img.onload = () => setImageLoaded(true);
    img.src = '/lovable-uploads/5d9b151b-eb54-41c3-a578-e70139faa878.png';
    const fetchUserData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        // Fetch user preferences
        await reloadUserPreferences();

        // Fetch test results
        const {
          data: results,
          error: resultsError
        } = await supabase.from('test_results').select('*').eq('user_id', user.id).order('created_at', {
          ascending: false
        }).limit(10);
        if (resultsError) {
          console.warn('Error fetching test results:', resultsError);
        }

        // Fetch reading test results separately
        const {
          data: readingResults,
          error: readingError
        } = await supabase.from('reading_test_results').select('*').eq('user_id', user.id).order('created_at', {
          ascending: false
        }).limit(10);
        if (readingError) {
          console.warn('Error fetching reading results:', readingError);
        }

        // Fetch writing test results separately
        const {
          data: writingResults
        } = await supabase.from('writing_test_results').select('*').eq('user_id', user.id).order('created_at', {
          ascending: false
        }).limit(10);

        // Combine results for display
        const allResults = [...(results || [])];

        // Add reading results as synthetic test results for dashboard display
        if (readingResults) {
          readingResults.forEach(result => {
            allResults.push({
              id: result.id,
              user_id: user.id,
              test_type: 'reading',
              score_percentage: Math.round(result.comprehension_score * 100),
              created_at: result.created_at,
              test_data: { readingResult: result },
              // Required fields for test_results table structure
              section_number: null,
              total_questions: result.questions_data?.questions?.length || result.questions_data?.length || 0,
              correct_answers: Math.floor((result.comprehension_score || 0) * (result.questions_data?.questions?.length || result.questions_data?.length || 1)),
              time_taken: result.reading_time_seconds,
              completed_at: result.created_at,
              audio_retention_expires_at: null,
              detailed_feedback: result.detailed_feedback,
              question_analysis: null,
              performance_metrics: null,
              skill_breakdown: null,
              cambridge_book: null,
              audio_urls: null
            });
          });
        }
        
        // Add writing results as synthetic test results for dashboard display
        if (writingResults) {
          // Group writing results by test_result_id or date
          const writingByTest: { [key: string]: TestResult[] } = {};
          writingResults.forEach(result => {
            const key = result.test_result_id || result.created_at?.split('T')[0] || 'standalone';
            if (!writingByTest[key]) {
              writingByTest[key] = [];
            }
            writingByTest[key].push(result);
          });

          // Create synthetic test results for writing tests
          Object.entries(writingByTest).forEach(([key, results]) => {
            if (key !== 'standalone' && allResults.some(r => r.id === key)) {
              // Already have main test result, skip
              return;
            }

            // Calculate overall writing score
            const task1Result = results.find(r => r.task_number === 1);
            const task2Result = results.find(r => r.task_number === 2);
            let overallScore = 70; // Default 7.0 band

            if (task1Result && task2Result) {
              const extractBandFromResult = (result: { band_scores?: Record<string, number> }): number => {
                if (result.band_scores && typeof result.band_scores === 'object') {
                  const bands = Object.values(result.band_scores).filter(v => typeof v === 'number') as number[];
                  if (bands.length > 0) {
                    return bands.reduce((a, b) => a + b, 0) / bands.length;
                  }
                }
                return 7.0;
              };

              const task1Band = extractBandFromResult(task1Result);
              const task2Band = extractBandFromResult(task2Result);
              const overallBand = ((task1Band * 1) + (task2Band * 2)) / 3;
              overallScore = Math.round(overallBand * 10); // Convert to percentage-like score
            }

            allResults.push({
              id: key === 'standalone' ? `writing-${Date.now()}` : key,
              user_id: user.id,
              test_type: 'writing',
              score_percentage: overallScore,
              created_at: results[0].created_at,
              test_data: { writingResults: results },
              // Required fields for test_results table structure
              section_number: null,
              total_questions: results.length,
              correct_answers: null,
              time_taken: null,
              completed_at: results[0].created_at,
              audio_retention_expires_at: null,
              detailed_feedback: null,
              question_analysis: null,
              performance_metrics: null,
              skill_breakdown: null,
              cambridge_book: null,
              audio_urls: null
            });
          });
        }

        // Sort all results by date
        allResults.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
        setTestResults(allResults);

        // Calculate user stats from all test results
        const totalTests = allResults.length;
        const avgScore = allResults.length > 0 ? allResults.reduce((acc, test) => acc + (test.score_percentage || 0), 0) / allResults.length : 0;
        setUserStats({
          totalTests,
          avgScore: Math.round(avgScore),
          recentImprovement: totalTests > 1 ? Math.round((allResults[0]?.score_percentage || 0) - (allResults[1]?.score_percentage || 0)) : 0,
          weeklyProgress: 15 // Placeholder
        });
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
    loadSavedWordsCount();
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
    // Route to IELTS portal for quick start
    navigate('/ielts-portal');
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
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <LoadingAnimation />
      </div>;
  }

  // Redirect to auth if not authenticated
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Show loading while dashboard data loads
  if (loading) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <LoadingAnimation />
      </div>;
  }

  // Guest mode: allow viewing dashboard without login (removed - now requires auth)
  // If not logged in, we render a limited dashboard without user-specific data

  return <div 
            className="h-screen relative overflow-hidden"
            style={{
              backgroundColor: themeStyles.theme.name === 'dark' ? themeStyles.theme.colors.background : 'transparent'
            }}
          >
              {/* Background Image */}
              <div className="absolute inset-0 bg-contain bg-center bg-no-repeat bg-fixed" style={{
                backgroundImage: themeStyles.theme.name === 'note' || themeStyles.theme.name === 'minimalist' || themeStyles.theme.name === 'dark'
                  ? 'none'
                  : `url('/lovable-uploads/5d9b151b-eb54-41c3-a578-e70139faa878.png')`,
                backgroundColor: themeStyles.backgroundImageColor
              }} />
      
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
                fontFamily: 'Inter, sans-serif',
                color: themeStyles.textSecondary
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = themeStyles.buttonPrimary}
              onMouseLeave={(e) => e.currentTarget.style.color = themeStyles.textSecondary}
            >
              {t('dashboard.myWordBook')}
            </button>
            
            <button 
              onClick={() => navigate('/ielts-portal')} 
              className="transition whitespace-nowrap" 
              style={{
                fontFamily: 'Inter, sans-serif',
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
                fontFamily: 'Inter, sans-serif',
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
                fontFamily: 'Inter, sans-serif',
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
            <SettingsModal onSettingsChange={() => {
              reloadUserPreferences();
              refreshProfile();
              setRefreshKey(prev => prev + 1);
            }}>
              <button className="group w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-slate-800/80 backdrop-blur-sm flex items-center justify-center border border-white/20 overflow-hidden hover:border-blue-400/50 transition-all duration-200 hover:scale-105" title="Click to open settings">
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
              <h1 className="text-3xl sm:text-4xl lg:text-5xl tracking-tight font-semibold flex-shrink-0" style={{
                fontFamily: 'Comfortaa, cursive',
                color: themeStyles.textPrimary
              }}>
                {t('dashboard.helloUser', {
                  name: (userPreferences?.preferred_name || user?.email?.split('@')[0] || 'Learner')
                })}
              </h1>

              {/* Skills Selection Card */}
              <div className="grid grid-cols-4 gap-2 lg:gap-3 flex-shrink-0">
                {skills.map(skill => {
                  const isSelected = selectedSkill === skill.id;
                  return <button 
                    key={skill.id} 
                    onClick={() => setSelectedSkill(skill.id)} 
                    className={`flex flex-col items-center justify-center gap-2 p-2 lg:p-3 rounded-xl border transition-all min-h-[60px] ${isSelected ? themeStyles.cardClassName + ' shadow-md' : `bg-white/40 border-[${themeStyles.border}] hover:bg-[${themeStyles.hoverBg}]`}`} 
                    style={{
                      ...(isSelected ? themeStyles.cardStyle : {}),
                      borderColor: themeStyles.border,
                    }}
                  >
                      <span 
                        className={`text-xs lg:text-sm font-medium text-center leading-tight px-1`} 
                        style={{
                          fontFamily: 'Poppins, sans-serif',
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
                    return <div 
                      key={skill.id} 
                      className={`relative lg:p-6 ${themeStyles.cardClassName} rounded-xl pt-4 pr-4 pb-4 pl-4 min-h-[190px] flex flex-col transition-all hover:shadow-md`} 
                      style={themeStyles.cardStyle}
                    >
                        <div className="relative flex items-center justify-center mb-3">
                          <h3 className="text-sm lg:text-base tracking-tight font-normal text-center" style={{
                            fontFamily: 'Poppins, sans-serif',
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
                            aria-label="View history"
                            title="View detailed test history"
                          />
                        </div>
                        
                        {skillResults.length > 0 ? <div className="flex-1 flex flex-col justify-end">
                            <div className="grid grid-cols-3 gap-4">
                              <div className={`text-center ${isWritingOrSpeaking ? 'p-2 rounded-lg border' : ''}`} style={{
                                backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'minimalist' ? '#f9fafb' : 'rgba(255,255,255,0.4)',
                                borderColor: themeStyles.border
                              }}>
                                <p className="text-xs font-normal mb-1" style={{
                              fontFamily: 'Poppins, sans-serif',
                              color: themeStyles.textSecondary
                            }}>
                                  {t('dashboard.testsTaken')}
                                </p>
                                <p className="text-sm lg:text-base font-normal" style={{
                              fontFamily: 'Poppins, sans-serif',
                              color: themeStyles.textPrimary
                            }}>{skillResults.length}</p>
                              </div>
                              <div className={`text-center ${isWritingOrSpeaking ? 'p-2 rounded-lg border' : ''}`} style={{
                                backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'minimalist' ? '#f9fafb' : 'rgba(255,255,255,0.4)',
                                borderColor: themeStyles.border
                              }}>
                                <p className="text-xs font-normal mb-1" style={{
                              fontFamily: 'Poppins, sans-serif',
                              color: themeStyles.textSecondary
                            }}>
                                  {t('dashboard.averageScore')}
                                </p>
                                <p className="text-sm lg:text-base font-normal" style={{
                              fontFamily: 'Poppins, sans-serif',
                              color: themeStyles.textPrimary
                            }}>{convertToIELTSScore(averageScore)}</p>
                              </div>
                              <div className={`text-center ${isWritingOrSpeaking ? 'p-2 rounded-lg border' : ''}`} style={{
                                backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'minimalist' ? '#f9fafb' : 'rgba(255,255,255,0.4)',
                                borderColor: themeStyles.border
                              }}>
                                <p className="text-xs font-normal mb-1" style={{
                              fontFamily: 'Poppins, sans-serif',
                              color: themeStyles.textSecondary
                            }}>
                                  {t('dashboard.latestScore')}
                                </p>
                                <p className="text-sm lg:text-base font-normal" style={{
                              fontFamily: 'Poppins, sans-serif',
                              color: themeStyles.textPrimary
                            }}>{convertToIELTSScore(skillResults[0]?.score_percentage || 0)}</p>
                              </div>
                            </div>
                          </div> : <div className="flex-1 flex flex-col justify-center items-center">
                            <button 
                              onClick={() => navigate('/ielts-portal')} 
                              className="text-sm font-medium px-3 lg:px-4 py-2 rounded-full flex items-center justify-center gap-2 transition shadow-sm mx-auto" 
                              style={{
                                fontFamily: 'Poppins, sans-serif',
                                backgroundColor: themeStyles.buttonPrimary,
                                color: 'white'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = themeStyles.buttonPrimaryHover}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = themeStyles.buttonPrimary}
                            >
                              {t('dashboard.startFirstTest')} <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>}
                      </div>;
                  })}
                </div>

                {/* Quick Actions */}
                
              </div>
            </div>
          </div>
        </main>
      </div>
      </div>
    </div>;
};
export default Dashboard;