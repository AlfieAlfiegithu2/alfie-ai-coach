import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  BookOpen, 
  Target, 
  TrendingUp, 
  Trophy, 
  Users, 
  Zap, 
  ChevronRight, 
  Globe,
  GraduationCap,
  MessageSquare,
  PenTool,
  Volume2,
  CheckCircle,
  Star,
  Clock,
  Award
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import DailyChallenge from "@/components/DailyChallenge";

const Dashboard = () => {
  const navigate = useNavigate();
  const [selectedTestType, setSelectedTestType] = useState("IELTS");

  const testTypes = [
    {
      id: "IELTS",
      name: "IELTS",
      description: "International English Language Testing System",
      icon: Globe,
      color: "text-brand-blue",
      bgColor: "bg-brand-blue/10",
      borderColor: "border-brand-blue/20"
    },
    {
      id: "PTE",
      name: "PTE Academic",
      description: "Pearson Test of English Academic",
      icon: GraduationCap,
      color: "text-brand-green",
      bgColor: "bg-brand-green/10",
      borderColor: "border-brand-green/20"
    },
    {
      id: "TOEFL",
      name: "TOEFL iBT",
      description: "Test of English as a Foreign Language",
      icon: BookOpen,
      color: "text-brand-orange",
      bgColor: "bg-brand-orange/10",
      borderColor: "border-brand-orange/20"
    },
    {
      id: "GENERAL",
      name: "General English",
      description: "Comprehensive English proficiency practice",
      icon: MessageSquare,
      color: "text-brand-purple",
      bgColor: "bg-brand-purple/10",
      borderColor: "border-brand-purple/20"
    }
  ];

  const skills = [
    {
      name: "Reading",
      icon: BookOpen,
      description: "Comprehension & Analysis",
      progress: 78,
      level: "Intermediate",
      color: "text-brand-blue"
    },
    {
      name: "Listening",
      icon: Volume2,
      description: "Audio Understanding",
      progress: 85,
      level: "Advanced",
      color: "text-brand-green"
    },
    {
      name: "Writing",
      icon: PenTool,
      description: "Essay & Task Writing",
      progress: 62,
      level: "Intermediate",
      color: "text-brand-orange"
    },
    {
      name: "Speaking",
      icon: MessageSquare,
      description: "Fluency & Pronunciation",
      progress: 71,
      level: "Intermediate",
      color: "text-brand-purple"
    }
  ];

  const achievements = [
    { icon: Trophy, label: "7-day streak", color: "text-brand-green" },
    { icon: Target, label: "95% accuracy", color: "text-brand-blue" },
    { icon: Award, label: "100 questions", color: "text-brand-orange" },
    { icon: Star, label: "Top 10%", color: "text-brand-purple" }
  ];

  const handleStartPractice = () => {
    // Route to student dashboard instead of Cambridge test
    navigate('/personal-page');
  };

  const handleSkillPractice = (skillName: string) => {
    const route = skillName.toLowerCase();
    navigate(`/${route}`);
  };

  return (
    <div className="min-h-screen bg-surface-2">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-blue via-brand-purple to-brand-blue">
        <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/10 opacity-20"></div>
        
        <div className="relative container mx-auto px-6 py-16 md:py-24">
          <div className="text-center text-white">
            <h1 className="text-heading-1 mb-6 animate-fade-in">
              Master English with
              <span className="block bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                AI-Powered Learning
              </span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-white/90 max-w-3xl mx-auto animate-slide-up">
              Achieve your target score with personalized practice, real-time feedback, and comprehensive test preparation
            </p>
            
            {/* Test Type Selection */}
            <div className="mb-12 animate-scale-in">
              <p className="text-white/80 mb-4 text-lg">Choose your test:</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                {testTypes.map((test) => {
                  const Icon = test.icon;
                  return (
                    <button
                      key={test.id}
                      onClick={() => setSelectedTestType(test.id)}
                      className={`p-4 rounded-2xl border-2 transition-all duration-200 hover:scale-105 ${
                        selectedTestType === test.id
                          ? 'bg-white/20 border-white shadow-lg'
                          : 'bg-white/5 border-white/20 hover:bg-white/10'
                      }`}
                    >
                      <Icon className="w-6 h-6 mx-auto mb-2 text-white" />
                      <p className="font-semibold text-white text-sm">{test.name}</p>
                      <p className="text-xs text-white/70 mt-1">{test.description.split(' ').slice(0, 3).join(' ')}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-bounce-gentle">
              <Button 
                onClick={handleStartPractice}
                size="lg" 
                className="btn-gradient text-lg px-8 py-4 h-auto"
              >
                <Zap className="w-5 h-5 mr-2" />
                Start Practice
              </Button>
              <Button 
                onClick={() => navigate('/auth')}
                variant="outline" 
                size="lg"
                className="bg-white/10 border-white/30 text-white hover:bg-white/20 text-lg px-8 py-4 h-auto"
              >
                <Users className="w-5 h-5 mr-2" />
                Sign In
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="mt-12 flex flex-wrap justify-center items-center gap-6 text-white/60">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">Official Content</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4" />
                <span className="text-sm">AI-Powered</span>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                <span className="text-sm">Proven Results</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Skills Dashboard Section */}
      <section className="space-section">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-3 gap-8">
            
            {/* Skills Overview */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-heading-2 mb-2">Your Progress</h2>
                  <p className="text-body">Track your improvement across all English skills</p>
                </div>
                <Button 
                  onClick={() => navigate('/personal-page')}
                  variant="outline"
                  className="hover-lift"
                >
                  View Details
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {skills.map((skill) => {
                  const Icon = skill.icon;
                  return (
                    <Card key={skill.name} className="card-interactive">
                      <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl bg-surface-3 ${skill.color}`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">{skill.name}</CardTitle>
                              <CardDescription>{skill.description}</CardDescription>
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {skill.level}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-text-secondary">Progress</span>
                            <span className="font-semibold">{skill.progress}%</span>
                          </div>
                          <div className="progress-bar h-2">
                            <div 
                              className="progress-fill"
                              style={{ width: `${skill.progress}%` }}
                            />
                          </div>
                          <Button 
                            onClick={() => handleSkillPractice(skill.name)}
                            variant="ghost" 
                            size="sm" 
                            className="w-full mt-3"
                          >
                            Practice {skill.name}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Daily Challenge - Now Functional */}
              <DailyChallenge />

              {/* Achievements */}
              <Card className="card-modern">
                <CardHeader>
                  <CardTitle className="text-lg">Recent Achievements</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {achievements.map((achievement, index) => {
                      const Icon = achievement.icon;
                      return (
                        <div key={index} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-3 transition-colors">
                          <div className={`p-2 rounded-lg bg-surface-3 ${achievement.color}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="text-sm font-medium">{achievement.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="space-section bg-surface-1">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-heading-2 mb-4">Why Choose Our Platform</h2>
            <p className="text-body-large max-w-2xl mx-auto">
              Advanced AI technology meets proven teaching methods to accelerate your English learning journey
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="card-modern text-center">
              <CardContent className="pt-8">
                <div className="w-16 h-16 bg-brand-blue/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8 text-brand-blue" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Official Content</h3>
                <p className="text-text-secondary">
                  Practice with authentic materials from Cambridge, IDP, and other official sources
                </p>
              </CardContent>
            </Card>

            <Card className="card-modern text-center">
              <CardContent className="pt-8">
                <div className="w-16 h-16 bg-brand-green/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-brand-green" />
                </div>
                <h3 className="text-xl font-semibold mb-3">AI-Powered Feedback</h3>
                <p className="text-text-secondary">
                  Get instant, detailed analysis of your performance with personalized improvement suggestions
                </p>
              </CardContent>
            </Card>

            <Card className="card-modern text-center">
              <CardContent className="pt-8">
                <div className="w-16 h-16 bg-brand-purple/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-8 h-8 text-brand-purple" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Smart Analytics</h3>
                <p className="text-text-secondary">
                  Track your progress with detailed insights and adaptive learning recommendations
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;