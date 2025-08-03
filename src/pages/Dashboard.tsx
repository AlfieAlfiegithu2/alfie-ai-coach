import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { BookOpen, Target, TrendingUp, Trophy, Users, User, Zap, ChevronRight, Globe, GraduationCap, MessageSquare, PenTool, Volume2, CheckCircle, Star, Clock, Award, BarChart3, PieChart, Activity, Languages, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DailyChallenge from "@/components/DailyChallenge";
import LightRays from "@/components/animations/LightRays";
const Dashboard = () => {
  const navigate = useNavigate();
  const {
    user,
    profile
  } = useAuth();
  const [selectedTestType, setSelectedTestType] = useState("IELTS");
  const [userStats, setUserStats] = useState<any>(null);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedWords, setSavedWords] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
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
  const skills = [{
    name: "Reading",
    icon: BookOpen,
    description: "Comprehension & Analysis",
    progress: 78,
    level: "Intermediate",
    color: "text-blue-500"
  }, {
    name: "Listening",
    icon: Volume2,
    description: "Audio Understanding",
    progress: 85,
    level: "Advanced",
    color: "text-gray-500"
  }, {
    name: "Writing",
    icon: PenTool,
    description: "Essay & Task Writing",
    progress: 62,
    level: "Intermediate",
    color: "text-blue-500"
  }, {
    name: "Speaking",
    icon: MessageSquare,
    description: "Fluency & Pronunciation",
    progress: 71,
    level: "Intermediate",
    color: "text-gray-500"
  }];
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
    const fetchUserData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
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
  }, [user]);
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
  return <div className="min-h-full flex items-center justify-center lg:py-10 lg:px-6 bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 pt-6 pr-4 pb-6 pl-4">
      {/* Background Image */}
      <div className="fixed top-0 w-full h-screen bg-cover bg-center -z-10" style={{
      backgroundImage: "url('https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/44dea03b-7cbb-41b6-934f-6482f1fdf2e3_3840w.jpg')"
    }} />
      
      <div className="relative w-full max-w-[1440px] lg:rounded-3xl overflow-hidden lg:mx-8 shadow-black/10 bg-white/20 border-white/30 border rounded-2xl mr-4 ml-4 shadow-[0_2.8px_2.2px_rgba(0,_0,_0,_0.034),_0_6.7px_5.3px_rgba(0,_0,_0,_0.048),_0_12.5px_10px_rgba(0,_0,_0,_0.06),_0_22.3px_17.9px_rgba(0,_0,_0,_0.072),_0_41.8px_33.4px_rgba(0,_0,_0,_0.086),_0_100px_80px_rgba(0,_0,_0,_0.12)] backdrop-blur-xl">
        {/* Header */}
        <header className="flex sm:px-6 lg:px-12 lg:py-5 pt-4 pr-4 pb-4 pl-4 items-center justify-between border-b border-white/20">
          <div className="flex items-center gap-3">
            <span className="text-xl lg:text-2xl font-semibold">✱</span>
            <span className="text-lg lg:text-xl font-semibold tracking-tight text-slate-800" style={{
            fontFamily: 'Inter, sans-serif'
          }}>Alfie AI</span>
          </div>
          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium">
            <a href="#" className="text-slate-800 hover:text-blue-600 transition" style={{
            fontFamily: 'Inter, sans-serif'
          }}>Dashboard</a>
            
            
            
          </nav>
          <div className="flex items-center gap-3 lg:gap-4">
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
                Good morning, {user?.email?.split('@')[0] || 'Learner'}!
              </h1>

              {/* Progress Summary Card */}
              <div className="flex lg:px-5 lg:py-4 bg-white/30 border-white/30 border rounded-xl pt-3 pr-4 pb-3 pl-4 shadow-[0_2.8px_2.2px_rgba(0,_0,_0,_0.034),_0_6.7px_5.3px_rgba(0,_0,_0,_0.048),_0_12.5px_10px_rgba(0,_0,_0,_0.06),_0_22.3px_17.9px_rgba(0,_0,_0,_0.072),_0_41.8px_33.4px_rgba(0,_0,_0,_0.086),_0_100px_80px_rgba(0,_0,_0,_0.12)] backdrop-blur-sm items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800" style={{
                    fontFamily: 'Inter, sans-serif'
                  }}>English Mastery Platform</p>
                    <p className="text-xs text-slate-600" style={{
                    fontFamily: 'Inter, sans-serif'
                  }}>IELTS • PTE • TOEFL • General</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500" />
              </div>

              {/* Productivity Score */}
              <div className="flex flex-col gap-2">
                <span className="text-6xl sm:text-7xl lg:text-[90px] leading-none text-slate-800 font-semibold" style={{
                fontFamily: 'Bricolage Grotesque, sans-serif'
              }}>
                  {userStats?.avgScore || 0}%
                </span>
                <p className="text-base lg:text-lg text-slate-600 -mt-2 lg:-mt-4" style={{
                fontFamily: 'Inter, sans-serif'
              }}>Average test score</p>
              </div>

              {/* Skills Distribution */}
              <div className="relative lg:p-6 bg-white/20 border-white/30 border rounded-2xl pt-4 pr-4 pb-4 pl-4 shadow-[0_2.8px_2.2px_rgba(0,_0,_0,_0.034),_0_6.7px_5.3px_rgba(0,_0,_0,_0.048),_0_12.5px_10px_rgba(0,_0,_0,_0.06),_0_22.3px_17.9px_rgba(0,_0,_0,_0.072),_0_41.8px_33.4px_rgba(0,_0,_0,_0.086),_0_100px_80px_rgba(0,_0,_0,_0.12)] backdrop-blur-sm">
                <h3 className="text-base lg:text-lg font-semibold mb-3 lg:mb-4 text-slate-800" style={{
                fontFamily: 'Inter, sans-serif'
              }}>Skills Overview</h3>
                <div className="grid grid-cols-2 gap-3 lg:gap-4">
                  {skills.slice(0, 4).map(skill => <div key={skill.name}>
                      <p className="text-2xl lg:text-3xl text-slate-800 font-semibold" style={{
                    fontFamily: 'Bricolage Grotesque, sans-serif'
                  }}>{skill.progress}%</p>
                      <p className="text-xs text-slate-600" style={{
                    fontFamily: 'Inter, sans-serif'
                  }}>{skill.name}</p>
                    </div>)}
                </div>
              </div>

              {/* Analytics Card */}
              <div className="relative lg:p-6 bg-white/20 border-white/30 border rounded-2xl mt-6 pt-4 pr-4 pb-4 pl-4 shadow-[0_2.8px_2.2px_rgba(0,_0,_0,_0.034),_0_6.7px_5.3px_rgba(0,_0,_0,_0.048),_0_12.5px_10px_rgba(0,_0,_0,_0.06),_0_22.3px_17.9px_rgba(0,_0,_0,_0.072),_0_41.8px_33.4px_rgba(0,_0,_0,_0.086),_0_100px_80px_rgba(0,_0,_0,_0.12)] backdrop-blur-sm">
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
                  <div className="flex -space-x-2">
                    <div className="w-6 h-6 lg:w-7 lg:h-7 rounded-full bg-blue-500/20 border-2 border-white/50 flex items-center justify-center">
                      <BookOpen className="w-3 h-3 text-blue-600" />
                    </div>
                    <div className="w-6 h-6 lg:w-7 lg:h-7 rounded-full bg-green-500/20 border-2 border-white/50 flex items-center justify-center">
                      <Volume2 className="w-3 h-3 text-green-600" />
                    </div>
                    <div className="w-6 h-6 lg:w-7 lg:h-7 rounded-full bg-purple-500/20 border-2 border-white/50 flex items-center justify-center">
                      <PenTool className="w-3 h-3 text-purple-600" />
                    </div>
                    <div className="w-6 h-6 lg:w-7 lg:h-7 rounded-full bg-white/40 backdrop-blur-sm flex items-center justify-center text-[10px] font-semibold border-2 border-white/50 text-slate-700" style={{
                    fontFamily: 'Inter, sans-serif'
                  }}>+1</div>
                  </div>
                </div>
              </div>

              <div className="grid xl:grid-cols-1 gap-4 lg:gap-6">
                {/* Skill Practice Cards */}
                <div className="flex flex-col gap-4 lg:gap-6">
                  {skills.map((skill, index) => {
                  const Icon = skill.icon;
                  const tagColors = [{
                    bg: 'bg-green-500/20',
                    text: 'text-green-700',
                    border: 'border-green-200/30',
                    label: 'Strong'
                  }, {
                    bg: 'bg-blue-500/20',
                    text: 'text-blue-700',
                    border: 'border-blue-200/30',
                    label: 'Improving'
                  }, {
                    bg: 'bg-orange-500/20',
                    text: 'text-orange-700',
                    border: 'border-orange-200/30',
                    label: 'Focus Area'
                  }, {
                    bg: 'bg-purple-500/20',
                    text: 'text-purple-700',
                    border: 'border-purple-200/30',
                    label: 'Practice'
                  }];
                  const tag = tagColors[index] || tagColors[0];
                  return <div key={skill.name} className="relative lg:p-6 bg-white/40 border-white/30 border rounded-xl pt-4 pr-4 pb-4 pl-4 shadow-[0_2.8px_2.2px_rgba(0,_0,_0,_0.034),_0_6.7px_5.3px_rgba(0,_0,_0,_0.048),_0_12.5px_10px_rgba(0,_0,_0,_0.06),_0_22.3px_17.9px_rgba(0,_0,_0,_0.072),_0_41.8px_33.4px_rgba(0,_0,_0,_0.086),_0_100px_80px_rgba(0,_0,_0,_0.12)] backdrop-blur-md">
                        
                        <h3 className="flex items-center gap-2 text-sm lg:text-base font-semibold mb-3 lg:mb-4 text-slate-800" style={{
                      fontFamily: 'Inter, sans-serif'
                    }}>
                          <Icon className="w-4 h-4" />
                          {skill.name} Practice
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600 mb-4 lg:mb-6">
                          <div>
                            <p className="font-medium text-slate-800" style={{
                          fontFamily: 'Inter, sans-serif'
                        }}>Level:</p>
                            <p style={{
                          fontFamily: 'Inter, sans-serif'
                        }}>{skill.level}</p>
                          </div>
                          <div>
                            <p className="font-medium text-slate-800" style={{
                          fontFamily: 'Inter, sans-serif'
                        }}>Progress:</p>
                            <p style={{
                          fontFamily: 'Inter, sans-serif'
                        }}>{skill.progress}%</p>
                          </div>
                          <div>
                            <p className="font-medium text-slate-800" style={{
                          fontFamily: 'Inter, sans-serif'
                        }}>Type:</p>
                            <p style={{
                          fontFamily: 'Inter, sans-serif'
                        }}>{skill.description}</p>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          
                          <button onClick={() => handleSkillPractice(skill.name)} className="text-sm font-medium bg-slate-800/80 backdrop-blur-sm text-white px-3 lg:px-4 py-2 rounded-full flex items-center justify-center gap-2 hover:bg-slate-700/80 transition border border-white/20" style={{
                        fontFamily: 'Inter, sans-serif'
                      }}>
                            Start Practice <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>;
                })}
                </div>

                {/* Quick Actions */}
                
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>;
};
export default Dashboard;