import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { BookOpen, Target, TrendingUp, Trophy, Users, User, Zap, ChevronRight, Globe, GraduationCap, MessageSquare, PenTool, Volume2, CheckCircle, Star, Clock, Award, BarChart3, PieChart, Activity, Languages, Calendar, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DailyChallenge from "@/components/DailyChallenge";
import LoadingAnimation from "@/components/animations/LoadingAnimation";
import SettingsModal from "@/components/SettingsModal";
import TestResultsChart from "@/components/TestResultsChart";
import CountdownTimer from "@/components/CountdownTimer";
const Dashboard = () => {
  const navigate = useNavigate();
  const {
    user,
    profile
  } = useAuth();
  const [selectedTestType, setSelectedTestType] = useState("IELTS");
  const [selectedSkill, setSelectedSkill] = useState("overall");
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
  const skills = ["Reading", "Listening", "Writing", "Speaking"];
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
        if (results) {
          setTestResults(results);

          // Calculate user stats from test results
          const totalTests = results.length;
          const avgScore = results.length > 0 ? results.reduce((acc, test) => acc + (test.score_percentage || 0), 0) / results.length : 0;
          setUserStats({
            totalTests,
            avgScore: Math.round(avgScore),
            recentImprovement: totalTests > 1 ? Math.round((results[0]?.score_percentage || 0) - (results[1]?.score_percentage || 0)) : 0,
            weeklyProgress: 15 // Placeholder
          });
        }
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
    // Route to personal page instead of dashboard loop
    navigate('/personal-page');
  };
  const handleSkillPractice = (skillName: string) => {
    const route = skillName.toLowerCase();
    navigate(`/${route}`);
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

  if (loading || !imageLoaded) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <LoadingAnimation />
      </div>
    );
  }

  return <div className="min-h-screen relative">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-contain bg-center bg-no-repeat bg-fixed"
        style={{
          backgroundImage: `url('/lovable-uploads/5d9b151b-eb54-41c3-a578-e70139faa878.png')`,
          backgroundColor: '#a2d2ff'
        }}
      />
      
      <div className="relative z-10 min-h-full flex items-center justify-center lg:py-10 lg:px-6 pt-6 pr-4 pb-6 pl-4">
      
      <div className="relative w-full max-w-[1440px] lg:rounded-3xl overflow-hidden lg:mx-8 shadow-black/10 bg-white/20 border-white/30 border rounded-2xl mr-4 ml-4 shadow-[0_2.8px_2.2px_rgba(0,_0,_0,_0.034),_0_6.7px_5.3px_rgba(0,_0,_0,_0.048),_0_12.5px_10px_rgba(0,_0,_0,_0.06),_0_22.3px_17.9px_rgba(0,_0,_0,_0.072),_0_41.8px_33.4px_rgba(0,_0,_0,_0.086),_0_100px_80px_rgba(0,_0,_0,_0.12)] backdrop-blur-xl">
        {/* Header */}
        <header className="flex sm:px-6 lg:px-12 lg:py-5 pt-4 pr-4 pb-4 pl-4 items-center justify-between border-b border-white/20">
          <div className="flex items-center gap-3">
            
            
          </div>
          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium">
            <a href="#" className="text-slate-800 hover:text-blue-600 transition" style={{
            fontFamily: 'Inter, sans-serif'
          }}>Dashboard</a>
            <button onClick={() => navigate('/vocabulary')} className="text-slate-600 hover:text-blue-600 transition" style={{
            fontFamily: 'Inter, sans-serif'
          }}>My Vocab</button>
            <button onClick={() => navigate('/')} className="text-slate-600 hover:text-blue-600 transition flex items-center gap-1" style={{
            fontFamily: 'Inter, sans-serif'
          }}>
              <Home className="w-4 h-4" />
              Home
            </button>
          </nav>
          <div className="flex items-center gap-3 lg:gap-4">
            {/* Settings Button */}
            <SettingsModal onSettingsChange={() => setRefreshKey(prev => prev + 1)} />
            
            {/* User Avatar */}
            <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-slate-800/80 backdrop-blur-sm flex items-center justify-center border border-white/20">
              <User className="w-4 h-4 text-white" />
            </div>
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
                Good morning, {userPreferences?.preferred_name || user?.email?.split('@')[0] || 'Learner'}!
              </h1>

              {/* Skills Selection Card */}
              <div className="grid grid-cols-5 gap-2 lg:gap-3">
                {skills.map(skill => {
                const isSelected = selectedSkill === skill.toLowerCase();
                const getIcon = (skillName: string) => {
                  switch (skillName) {
                    case 'Reading':
                      return BookOpen;
                    case 'Listening':
                      return Volume2;
                    case 'Writing':
                      return PenTool;
                    case 'Speaking':
                      return MessageSquare;
                    default:
                      return BookOpen;
                  }
                };
                const Icon = getIcon(skill);
                return <button key={skill} onClick={() => setSelectedSkill(skill.toLowerCase())} className={`flex flex-col items-center gap-2 p-3 lg:p-4 rounded-xl border backdrop-blur-xl transition-all ${isSelected ? 'bg-white/20 border-white/40 shadow-lg' : 'bg-white/10 border-white/20 hover:bg-white/15'}`}>
                      <Icon className={`w-5 h-5 lg:w-6 lg:h-6 ${isSelected ? 'text-slate-800' : 'text-slate-600'}`} />
                      <span className={`text-xs lg:text-sm font-medium ${isSelected ? 'text-slate-800' : 'text-slate-600'}`} style={{
                    fontFamily: 'Inter, sans-serif'
                  }}>
                        {skill}
                      </span>
                    </button>;
              })}
                <button onClick={() => setSelectedSkill('overall')} className={`flex flex-col items-center gap-2 p-3 lg:p-4 rounded-xl border backdrop-blur-xl transition-all ${selectedSkill === 'overall' ? 'bg-white/20 border-white/40 shadow-lg' : 'bg-white/10 border-white/20 hover:bg-white/15'}`}>
                  <BarChart3 className={`w-5 h-5 lg:w-6 lg:h-6 ${selectedSkill === 'overall' ? 'text-slate-800' : 'text-slate-600'}`} />
                  <span className={`text-xs lg:text-sm font-medium ${selectedSkill === 'overall' ? 'text-slate-800' : 'text-slate-600'}`} style={{
                  fontFamily: 'Inter, sans-serif'
                }}>
                    Overall
                  </span>
                </button>
              </div>

              {/* Target Score Display */}
              <div className="flex flex-col gap-2">
                
                
              </div>

              {/* Test Results Chart */}
              <TestResultsChart selectedSkill={selectedSkill} selectedTestType={selectedTestType} />
              
              {/* Countdown Timer */}
              <CountdownTimer targetDate={userPreferences?.target_deadline || null} />

              {/* Analytics Card */}
              <div className="relative lg:p-6 bg-white/10 border-white/20 rounded-2xl mt-6 pt-4 pr-4 pb-4 pl-4 backdrop-blur-xl">
                <h3 className="text-base lg:text-lg font-semibold mb-3 lg:mb-4 text-slate-800" style={{
                fontFamily: 'Inter, sans-serif'
              }}>Study Progress</h3>
                <div className="grid grid-cols-3 gap-3 lg:gap-4">
                  <div>
                    <p className="text-2xl lg:text-3xl text-slate-800 font-semibold" style={{
                    fontFamily: 'Bricolage Grotesque, sans-serif'
                  }}>{userStats?.totalTests || 0}</p>
                    <p className="text-xs text-slate-600" style={{
                    fontFamily: 'Inter, sans-serif'
                  }}>Tests Taken</p>
                  </div>
                  <div>
                    <p className="text-2xl lg:text-3xl text-slate-800 font-semibold" style={{
                    fontFamily: 'Bricolage Grotesque, sans-serif'
                  }}>{savedWords.length}</p>
                    <p className="text-xs text-slate-600" style={{
                    fontFamily: 'Inter, sans-serif'
                  }}>Words Saved</p>
                  </div>
                  <div>
                    <p className="text-2xl lg:text-3xl text-slate-800 font-semibold" style={{
                    fontFamily: 'Bricolage Grotesque, sans-serif'
                  }}>7</p>
                    <p className="text-xs text-slate-600" style={{
                    fontFamily: 'Inter, sans-serif'
                  }}>Day Streak</p>
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
              }}>Practice Areas</h2>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-slate-600" style={{
                  fontFamily: 'Inter, sans-serif'
                }}>Your progress:</span>
                  
                </div>
              </div>

              <div className="grid xl:grid-cols-1 gap-4 lg:gap-6">
                {/* Test Results and Feedback Cards */}
                <div className="flex flex-col gap-4 lg:gap-6">
                  {skills.map(skill => {
                  const getIcon = (skillName: string) => {
                    switch (skillName) {
                      case 'Reading':
                        return BookOpen;
                      case 'Listening':
                        return Volume2;
                      case 'Writing':
                        return PenTool;
                      case 'Speaking':
                        return MessageSquare;
                      default:
                        return BookOpen;
                    }
                  };
                  const Icon = getIcon(skill);

                  // Get recent test results for this skill
                  const skillResults = testResults.filter(result => result.test_type && result.test_type.toLowerCase().includes(skill.toLowerCase())).slice(0, 3);
                  const averageScore = skillResults.length > 0 ? Math.round(skillResults.reduce((acc, test) => acc + (test.score_percentage || 0), 0) / skillResults.length) : 0;
                  return <div key={skill} className="relative lg:p-6 bg-white/10 border-white/20 rounded-xl pt-4 pr-4 pb-4 pl-4 backdrop-blur-xl">
                        <h3 className="flex items-center gap-2 text-sm lg:text-base font-semibold mb-3 lg:mb-4 text-slate-800" style={{
                      fontFamily: 'Inter, sans-serif'
                    }}>
                          <Icon className="w-4 h-4" />
                          {skill} Results & Feedback
                        </h3>
                        
                        {skillResults.length > 0 ? <div className="space-y-3">
                            <div className="grid grid-cols-3 gap-3 text-xs text-slate-600 mb-4">
                              <div>
                                <p className="font-medium text-slate-800" style={{
                            fontFamily: 'Inter, sans-serif'
                          }}>
                                  Tests Taken:
                                </p>
                                <p style={{
                            fontFamily: 'Inter, sans-serif'
                          }}>{skillResults.length}</p>
                              </div>
                              <div>
                                <p className="font-medium text-slate-800" style={{
                            fontFamily: 'Inter, sans-serif'
                          }}>
                                  Average Score:
                                </p>
                                <p style={{
                            fontFamily: 'Inter, sans-serif'
                          }}>{averageScore}%</p>
                              </div>
                              <div>
                                <p className="font-medium text-slate-800" style={{
                            fontFamily: 'Inter, sans-serif'
                          }}>
                                  Latest Score:
                                </p>
                                <p style={{
                            fontFamily: 'Inter, sans-serif'
                          }}>{skillResults[0]?.score_percentage || 0}%</p>
                              </div>
                            </div>
                            
                            <button onClick={() => handleSkillPractice(skill)} className="w-full text-sm font-medium bg-slate-800/80 backdrop-blur-sm text-white px-3 lg:px-4 py-2 rounded-full flex items-center justify-center gap-2 hover:bg-slate-700/80 transition border border-white/20" style={{
                        fontFamily: 'Inter, sans-serif'
                      }}>
                              View Detailed Results <ChevronRight className="w-4 h-4" />
                            </button>
                          </div> : <div className="text-center py-6">
                            <p className="text-slate-600 mb-4" style={{
                        fontFamily: 'Inter, sans-serif'
                      }}>
                              No {skill.toLowerCase()} tests taken yet
                            </p>
                            <button onClick={() => handleSkillPractice(skill)} className="text-sm font-medium bg-[#FFFFF0] backdrop-blur-sm text-black px-3 lg:px-4 py-2 rounded-full flex items-center justify-center gap-2 hover:bg-[#F5F5DC] transition border border-white/20" style={{
                        fontFamily: 'Inter, sans-serif'
                      }}>
                              Start First Test <ChevronRight className="w-4 h-4" />
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