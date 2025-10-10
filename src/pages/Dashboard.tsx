import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { BookOpen, Target, TrendingUp, Trophy, Users, User, Zap, ChevronRight, Globe, GraduationCap, MessageSquare, PenTool, Volume2, CheckCircle, Star, Clock, Award, BarChart3, PieChart, Activity, Languages, Calendar, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DailyChallenge from "@/components/DailyChallenge";
import LoadingAnimation from "@/components/animations/LoadingAnimation";
import SettingsModal from "@/components/SettingsModal";
import StudyPlanModal from "@/components/StudyPlanModal";
import TestResultsChart from "@/components/TestResultsChart";
import CountdownTimer from "@/components/CountdownTimer";
import ProfilePhotoSelector from "@/components/ProfilePhotoSelector";
import LanguageSelector from "@/components/LanguageSelector";
const Dashboard = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const {
    user,
    profile,
    refreshProfile
  } = useAuth();
  const {
    toast
  } = useToast();
  const [selectedTestType, setSelectedTestType] = useState("IELTS");
  const [selectedSkill, setSelectedSkill] = useState("reading");
  const [userStats, setUserStats] = useState<any>(null);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedWords, setSavedWords] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [userPreferences, setUserPreferences] = useState<any>(null);
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
    { id: 'reading', label: t('skills.reading'), icon: BookOpen },
    { id: 'listening', label: t('skills.listening'), icon: Volume2 },
    { id: 'writing', label: t('skills.writing'), icon: PenTool },
    { id: 'speaking', label: t('skills.speaking'), icon: MessageSquare }
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
        const {
          data: preferences
        } = await supabase.from('user_preferences').select('*').eq('user_id', user.id).single();
        if (preferences) {
          setUserPreferences(preferences);
          setSelectedTestType(preferences.target_test_type || 'IELTS');
          setRefreshKey(prev => prev + 1);
        }

        // Fetch test results
        const {
          data: results
        } = await supabase.from('test_results').select('*').eq('user_id', user.id).order('created_at', {
          ascending: false
        }).limit(10);

        // Fetch writing test results separately
        const {
          data: writingResults
        } = await supabase.from('writing_test_results').select('*').eq('user_id', user.id).order('created_at', {
          ascending: false
        }).limit(10);

        // Combine results for display
        const allResults = [...(results || [])];
        
        // Add writing results as synthetic test results for dashboard display
        if (writingResults) {
          // Group writing results by test_result_id or date
          const writingByTest: { [key: string]: any[] } = {};
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
              const extractBandFromResult = (result: any): number => {
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
            } as any);
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
    loadSavedWords();
  }, [user, refreshKey]);
  const loadSavedWords = () => {
    const saved = localStorage.getItem('alfie-saved-vocabulary');
    if (saved) {
      try {
        setSavedWords(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading vocabulary:', error);
      }
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
  if (loading) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <LoadingAnimation />
      </div>;
  }
  return <div className="min-h-screen relative">
      {/* Background Image */}
      <div className="absolute inset-0 bg-contain bg-center bg-no-repeat bg-fixed" style={{
      backgroundImage: `url('/lovable-uploads/5d9b151b-eb54-41c3-a578-e70139faa878.png')`,
      backgroundColor: '#a2d2ff'
    }} />
      
      <div className="relative z-10 min-h-full flex items-center justify-center lg:py-10 lg:px-6 pt-6 pr-4 pb-6 pl-4">
      
      <div className="relative w-full max-w-[1440px] lg:rounded-3xl overflow-hidden lg:mx-8 shadow-black/10 bg-white/20 border-white/30 border rounded-2xl mr-4 ml-4 shadow-[0_2.8px_2.2px_rgba(0,_0,_0,_0.034),_0_6.7px_5.3px_rgba(0,_0,_0,_0.048),_0_12.5px_10px_rgba(0,_0,_0,_0.06),_0_22.3px_17.9px_rgba(0,_0,_0,_0.072),_0_41.8px_33.4px_rgba(0,_0,_0,_0.086),_0_100px_80px_rgba(0,_0,_0,_0.12)] backdrop-blur-xl">
        {/* Header */}
        <header className="flex sm:px-6 lg:px-12 lg:py-5 pt-4 pr-4 pb-4 pl-4 items-center justify-between border-b border-white/20">
          <div className="flex items-center gap-3">
            
            
          </div>
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium absolute left-1/2 transform -translate-x-1/2 max-w-2xl overflow-hidden">
            <button onClick={() => navigate('/dashboard/my-word-book')} className="text-slate-600 hover:text-blue-600 transition" style={{
              fontFamily: 'Inter, sans-serif'
            }}>
              {t('dashboard.myWordBook')}
            </button>
            
            <button onClick={() => navigate('/ielts-portal')} className="text-slate-600 hover:text-blue-600 transition" style={{
              fontFamily: 'Inter, sans-serif'
            }}>
              {t('dashboard.tests')}
            </button>
            
            {/* Study Plan Button next to Tests as nav text */}
            <StudyPlanModal>
              <button type="button" className="text-slate-600 hover:text-blue-600 transition" style={{
                fontFamily: 'Inter, sans-serif'
              }}>
                {t('dashboard.studyPlan')}
              </button>
            </StudyPlanModal>
            
            <button onClick={() => navigate('/hero')} className="text-slate-600 hover:text-blue-600 transition" style={{
              fontFamily: 'Inter, sans-serif'
            }}>{t('dashboard.home')}</button>
            
            <button onClick={() => navigate('/community')} className="text-slate-600 hover:text-blue-600 transition" style={{
              fontFamily: 'Inter, sans-serif'
            }}>
              {t('navigation.community')}
            </button>
          </nav>
          <div className="flex items-center gap-3 lg:gap-4 relative z-50">
            {/* Language Selector */}
            <LanguageSelector />
            
            {/* Settings Button */}
            <div className="relative z-50">
              <SettingsModal onSettingsChange={() => setRefreshKey(prev => prev + 1)} />
            </div>
            
            {/* Clickable User Avatar for Photo Upload */}
            <ProfilePhotoSelector onPhotoUpdate={() => {
              refreshProfile();
              setRefreshKey(prev => prev + 1);
            }}>
              <button className="group w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-slate-800/80 backdrop-blur-sm flex items-center justify-center border border-white/20 overflow-hidden hover:border-blue-400/50 transition-all duration-200 hover:scale-105" title="Click to change profile photo">
                {profile?.avatar_url ? <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover group-hover:opacity-80 transition-opacity" /> : <User className="w-4 h-4 text-white group-hover:text-blue-300 transition-colors" />}
                
                {/* Upload overlay on hover */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center">
                  <User className="w-3 h-3 text-white" />
                </div>
              </button>
            </ProfilePhotoSelector>

            {/* Reset Results Button */}
            <Button
              onClick={async () => {
                if (!user) return;
                  const confirmed = window.confirm('This will permanently delete all your saved test results (reading, listening, writing, speaking). Continue?');
                if (!confirmed) return;
                try {
                  setLoading(true);
                  
                  // Delete skill-specific results first (foreign keys)
                  await supabase.from('writing_test_results').delete().eq('user_id', user.id);
                  await supabase.from('speaking_test_results').delete().eq('user_id', user.id);
                  await supabase.from('reading_test_results').delete().eq('user_id', user.id);
                  await supabase.from('listening_test_results').delete().eq('user_id', user.id);

                  // Delete main test results
                  const { error: tErr } = await supabase.from('test_results').delete().eq('user_id', user.id);
                  if (tErr) throw tErr;
                  
                  // Clear local state for instant UI feedback
                  setTestResults([]);
                  setUserStats({ totalTests: 0, avgScore: 0, recentImprovement: 0, weeklyProgress: 0 });
                  toast({ title: 'Results reset', description: 'All your test results have been removed.' });
                  setRefreshKey(prev => prev + 1);
                } catch (e: any) {
                  console.error('Failed to reset results', e);
                  toast({ title: 'Error', description: 'Failed to reset results. Please try again.', variant: 'destructive' });
                } finally {
                  setLoading(false);
                }
              }}
              variant="ghost"
              size="sm"
              className="hidden lg:inline-flex bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-slate-700 text-xs px-2 py-1 whitespace-nowrap"
            >
              {t('dashboard.resetResults')}
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="relative sm:px-6 lg:px-12 pr-4 pb-32 pl-4">
          {/* Greeting / Title Row */}
          <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 pt-6 lg:pt-8">
            {/* Left column */}
            <div className="flex flex-col gap-4 lg:gap-6">
              {/* Greeting */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl text-slate-800 tracking-tight font-semibold" style={{
                fontFamily: 'Bricolage Grotesque, sans-serif'
              }}>
                {t('dashboard.helloUser', {
                  name: (userPreferences?.preferred_name || user?.email?.split('@')[0] || 'Learner')
                })}
              </h1>

              {/* Skills Selection Card */}
              <div className="grid grid-cols-4 gap-2 lg:gap-3">
                {skills.map(skill => {
                  const isSelected = selectedSkill === skill.id;
                  return <button key={skill.id} onClick={() => setSelectedSkill(skill.id)} className={`flex flex-col items-center justify-center gap-2 p-2 lg:p-3 rounded-xl border backdrop-blur-xl transition-all min-h-[60px] ${isSelected ? 'bg-white/20 border-white/40 shadow-lg' : 'bg-white/10 border-white/20 hover:bg-white/15'}`}>
                      <span className={`text-xs lg:text-sm font-medium text-center leading-tight px-1 ${isSelected ? 'text-slate-800' : 'text-slate-600'}`} style={{
                      fontFamily: 'Inter, sans-serif'
                    }}>
                        {skill.label}
                      </span>
                    </button>;
                })}
              </div>

              {/* Target Score Display */}
              <div className="flex flex-col gap-2">
                
                
              </div>

              {/* Test Results Chart */}
              <TestResultsChart key={refreshKey} selectedSkill={selectedSkill} selectedTestType={selectedTestType} />
              
              {/* Countdown Timer */}
              <CountdownTimer targetDate={userPreferences?.target_deadline || null} />

              {/* Analytics Card */}
              <div className="relative lg:p-6 bg-white/10 border-white/20 rounded-2xl mt-6 pt-4 pr-4 pb-4 pl-4 backdrop-blur-xl">
                <h3 className="text-base lg:text-lg font-semibold mb-3 lg:mb-4 text-slate-800" style={{
                  fontFamily: 'Inter, sans-serif'
                }}>{t('dashboard.studyProgress')}</h3>
                <div className="grid grid-cols-3 gap-3 lg:gap-4">
                  <div>
                    <p className="text-2xl lg:text-3xl text-slate-800 font-semibold" style={{
                      fontFamily: 'Bricolage Grotesque, sans-serif'
                    }}>{userStats?.totalTests || 0}</p>
                    <p className="text-xs text-slate-600" style={{
                      fontFamily: 'Inter, sans-serif'
                    }}>{t('dashboard.testsTaken')}</p>
                  </div>
                  <div>
                    <p className="text-2xl lg:text-3xl text-slate-800 font-semibold" style={{
                      fontFamily: 'Bricolage Grotesque, sans-serif'
                    }}>{savedWords.length}</p>
                    <p className="text-xs text-slate-600" style={{
                      fontFamily: 'Inter, sans-serif'
                    }}>{t('dashboard.wordsSaved')}</p>
                  </div>
                  <div>
                    <p className="text-2xl lg:text-3xl text-slate-800 font-semibold" style={{
                      fontFamily: 'Bricolage Grotesque, sans-serif'
                    }}>7</p>
                    <p className="text-xs text-slate-600" style={{
                      fontFamily: 'Inter, sans-serif'
                    }}>{t('dashboard.dayStreak')}</p>
                  </div>
                </div>
              </div>


            </div>

            {/* Right column */}
            <div className="flex flex-col gap-4 lg:gap-6">
              {/* Today's Schedule Heading */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h2 className="text-lg lg:text-xl font-semibold text-slate-800" style={{
                  fontFamily: 'Inter, sans-serif'
                }}>{t('dashboard.practiceAreas')}</h2>
                <div className="flex items-center gap-3 text-sm">
                  
                  
                </div>
              </div>

              <div className="grid xl:grid-cols-1 gap-4 lg:gap-6">
                {/* Test Results and Feedback Cards */}
                <div className="flex flex-col gap-4 lg:gap-6">
                  {skills.map(skill => {
                    // Get recent test results for this skill
                    const skillResults = testResults.filter(result => {
                      if (skill.id === 'writing') {
                        return result.test_type === 'writing';
                      }
                      return result.test_type && result.test_type.toLowerCase().includes(skill.id.toLowerCase());
                    }).slice(0, 3);
                    const averageScore = skillResults.length > 0 ? Math.round(skillResults.reduce((acc, test) => acc + (test.score_percentage || 0), 0) / skillResults.length) : 0;
                    return <div key={skill.id} className="relative lg:p-6 bg-white/10 border-white/20 rounded-xl pt-4 pr-4 pb-4 pl-4 backdrop-blur-xl">
                        <div className="flex items-center justify-between mb-3 lg:mb-4">
                          <h3 className="text-sm lg:text-base font-semibold text-slate-800" style={{
                          fontFamily: 'Inter, sans-serif'
                        }}>
                            {skill.label}
                          </h3>
                          {skill.id === 'writing' && <Button variant="ghost" size="sm" onClick={e => {
                          e.stopPropagation();
                          navigate('/dashboard/writing-history');
                        }} className="text-xs text-slate-600 hover:text-slate-800">
                              View History
                            </Button>}
                        </div>
                        
                        {skillResults.length > 0 ? <div className="space-y-3">
                            <div className="grid grid-cols-3 gap-3 text-xs text-slate-600 mb-4">
                              <div>
                                <p className="font-medium text-slate-800" style={{
                              fontFamily: 'Inter, sans-serif'
                            }}>
                                  {t('dashboard.testsTaken')}:
                                </p>
                                <p style={{
                              fontFamily: 'Inter, sans-serif'
                            }}>{skillResults.length}</p>
                              </div>
                              <div>
                                <p className="font-medium text-slate-800" style={{
                              fontFamily: 'Inter, sans-serif'
                            }}>
                                  {t('dashboard.averageScore')}:
                                </p>
                                <p style={{
                              fontFamily: 'Inter, sans-serif'
                            }}>{convertToIELTSScore(averageScore)}</p>
                              </div>
                              <div>
                                <p className="font-medium text-slate-800" style={{
                              fontFamily: 'Inter, sans-serif'
                            }}>
                                  {t('dashboard.latestScore')}:
                                </p>
                                <p style={{
                              fontFamily: 'Inter, sans-serif'
                            }}>{convertToIELTSScore(skillResults[0]?.score_percentage || 0)}</p>
                              </div>
                            </div>
                            
                            <button onClick={() => handleViewResults(skill.id)} className="w-full text-sm font-medium bg-slate-800/80 backdrop-blur-sm text-white px-3 lg:px-4 py-2 rounded-full flex items-center justify-center gap-2 hover:bg-slate-700/80 transition border border-white/20" style={{
                          fontFamily: 'Inter, sans-serif'
                        }}>
                              {t('dashboard.viewDetailedResults')} <ChevronRight className="w-4 h-4" />
                            </button>
                          </div> : <div className="text-center py-6">
                            <p className="text-slate-600 mb-4" style={{
                          fontFamily: 'Inter, sans-serif'
                        }}>
                              {t('dashboard.noTestsYet', { skill: skill.id })}
                            </p>
                            <button onClick={() => navigate('/ielts-portal')} className="text-sm font-medium bg-[#FFFFF0] backdrop-blur-sm text-black px-3 lg:px-4 py-2 rounded-full flex items-center justify-center gap-2 hover:bg-[#F5F5DC] transition border border-white/20" style={{
                          fontFamily: 'Inter, sans-serif'
                        }}>
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