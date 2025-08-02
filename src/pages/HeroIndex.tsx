import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Play, Headphones, PenTool, Mic, Zap, Star, Globe, Bot, Search, TrendingUp, Clock, CheckCircle, BookOpen, Target, Users, Award } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import LanguagePicker from "@/components/LanguagePicker";
import MinimalisticChatbot from "@/components/MinimalisticChatbot";
import { TypewriterText } from "@/components/TypewriterText";
import HeroAnimation from "@/components/animations/HeroAnimation";
import LightRays from "@/components/animations/LightRays";
import CardSwap, { Card as SwapCard } from "@/components/CardSwap";
const HeroIndex = () => {
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [searchQuery, setSearchQuery] = useState('');
  useEffect(() => {
    const getUser = async () => {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);
  const handleAuthAction = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/auth');
    }
  };
  const testTypes = [{
    title: "IELTS",
    description: "International English Language Testing System",
    path: "/ielts-portal",
    // Main IELTS portal
    icon: <BookOpen className="w-6 h-6 text-foreground" />,
    sections: ["Reading", "Listening", "Writing", "Speaking"]
  }, {
    title: "PTE Academic",
    description: "Pearson Test of English Academic",
    path: "/pte-portal",
    icon: <Target className="w-6 h-6 text-foreground" />,
    sections: ["Reading", "Listening", "Writing", "Speaking"]
  }, {
    title: "TOEFL iBT",
    description: "Test of English as a Foreign Language",
    path: "/toefl-portal",
    icon: <Globe className="w-6 h-6 text-foreground" />,
    sections: ["Reading", "Listening", "Writing", "Speaking"]
  }, {
    title: "General English",
    description: "Daily English improvement lessons",
    path: "/general-portal",
    icon: <Users className="w-6 h-6 text-foreground" />,
    sections: ["Vocabulary", "Grammar", "Conversation", "Practice"]
  }];
  const ieltsModules = [{
    title: "Reading",
    icon: <BookOpen className="w-6 h-6 text-foreground" />,
    description: "Cambridge IELTS passages with AI analysis",
    path: "/reading",
    questions: "40+ questions"
  }, {
    title: "Listening",
    icon: <Headphones className="w-6 h-6 text-foreground" />,
    description: "Audio practice with transcription support",
    path: "/listening",
    questions: "40+ questions"
  }, {
    title: "Writing",
    icon: <PenTool className="w-6 h-6 text-foreground" />,
    description: "Task 1 & 2 with detailed AI feedback",
    path: "/writing",
    questions: "2 tasks"
  }, {
    title: "Speaking",
    icon: <Mic className="w-6 h-6 text-foreground" />,
    description: "Voice analysis with pronunciation feedback",
    path: "/speaking",
    questions: "3 parts"
  }];
  const additionalPortals = [{
    title: "PTE Academic",
    description: "Comprehensive PTE test preparation",
    path: "/pte-portal",
    badge: "New"
  }, {
    title: "TOEFL iBT",
    description: "Complete TOEFL preparation suite",
    path: "/toefl-portal",
    badge: "Popular"
  }, {
    title: "General English",
    description: "Daily English improvement lessons",
    path: "/general-portal",
    badge: "AI Generated"
  }];
  return <div className="min-h-screen relative overflow-hidden" style={{
    background: 'var(--gradient-hero)'
  }}>
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating Particles */}
        {[...Array(20)].map((_, i) => <div key={i} className="absolute w-2 h-2 bg-white/20 rounded-full animate-float" style={{
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 10}s`,
        animationDuration: `${8 + Math.random() * 4}s`
      }} />)}
        
        {/* Gradient Orbs */}
        <div className="absolute top-20 left-10 w-64 h-64 bg-gradient-to-r from-purple-400/30 to-pink-400/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-r from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl animate-pulse" style={{
        animationDelay: '2s'
      }} />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-r from-indigo-400/20 to-purple-400/20 rounded-full blur-3xl animate-ping" style={{
        animationDuration: '4s'
      }} />
      </div>

      {/* Light Rays Background Effect */}
      <LightRays raysOrigin="top-center" raysColor="#8b5cf6" raysSpeed={0.2} lightSpread={1.5} rayLength={4} fadeDistance={3} saturation={0.4} followMouse={true} mouseInfluence={0.03} className="absolute inset-0 opacity-30" />

      {/* Navigation */}
      <nav className="border-b border-white/20 bg-white/10 backdrop-blur-xl relative z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">EnglishAI</span>
            </div>
            
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-white/80 hover:text-white transition-colors">Features</a>
              <a href="#tests" className="text-white/80 hover:text-white transition-colors">Tests</a>
              <a href="#community" className="text-white/80 hover:text-white transition-colors">Community</a>
            </div>

            <div className="flex items-center gap-4">
              <Button onClick={() => navigate('/auth')} className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200">
                Log In
              </Button>
              <Button onClick={() => navigate('/dashboard')} variant="outline" className="border-white/30 text-white bg-white/10 hover:bg-white/20 px-6 py-2 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200">
                My Dashboard
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section with Enhanced Animations */}
      <section className="py-20 px-4 relative overflow-hidden">
        {/* Background CardSwap */}
        <div className="absolute inset-0 flex items-center justify-center opacity-20">
          <div className="w-80 h-96">
            <CardSwap
              cardDistance={60}
              verticalDistance={70}
              delay={5000}
              pauseOnHover={false}
            >
              <SwapCard>
                <div className="bg-gradient-to-br from-blue-500/80 to-purple-600/80 backdrop-blur-sm border border-white/20 rounded-2xl p-6 h-full shadow-2xl">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-white" />
                    </div>
                    <Badge className="bg-white/20 text-white border-none">Most Popular</Badge>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">IELTS</h3>
                  <p className="text-white/80 mb-4">International English Language Testing System</p>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-white/70">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm">40 Reading Questions</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/70">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">3 Hour Practice</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/70">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-sm">Band 9 Achievable</span>
                    </div>
                  </div>
                  <div className="mt-auto">
                    <Button className="w-full bg-white text-blue-600 hover:bg-white/90">
                      Start IELTS Practice
                    </Button>
                  </div>
                </div>
              </SwapCard>
              
              <SwapCard>
                <div className="bg-gradient-to-br from-green-500/80 to-emerald-600/80 backdrop-blur-sm border border-white/20 rounded-2xl p-6 h-full shadow-2xl">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <Target className="w-6 h-6 text-white" />
                    </div>
                    <Badge className="bg-white/20 text-white border-none">AI Powered</Badge>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">PTE Academic</h3>
                  <p className="text-white/80 mb-4">Pearson Test of English Academic</p>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-white/70">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm">Computer-based Test</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/70">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">2 Hour Practice</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/70">
                      <Award className="w-4 h-4" />
                      <span className="text-sm">90 Score Possible</span>
                    </div>
                  </div>
                  <div className="mt-auto">
                    <Button className="w-full bg-white text-green-600 hover:bg-white/90">
                      Start PTE Practice
                    </Button>
                  </div>
                </div>
              </SwapCard>
              
              <SwapCard>
                <div className="bg-gradient-to-br from-orange-500/80 to-red-600/80 backdrop-blur-sm border border-white/20 rounded-2xl p-6 h-full shadow-2xl">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <Badge className="bg-white/20 text-white border-none">Daily Practice</Badge>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">General English</h3>
                  <p className="text-white/80 mb-4">Improve your everyday English skills</p>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-white/70">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm">Daily Vocabulary</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/70">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">15 Min Sessions</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/70">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-sm">Progress Tracking</span>
                    </div>
                  </div>
                  <div className="mt-auto">
                    <Button className="w-full bg-white text-orange-600 hover:bg-white/90">
                      Start Learning
                    </Button>
                  </div>
                </div>
              </SwapCard>
            </CardSwap>
          </div>
        </div>
        
        <div className="container mx-auto text-center relative z-10">
          <div className="max-w-4xl mx-auto">
            {/* Animated Hero Badge */}
            
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-blue-200 to-purple-300 bg-clip-text text-transparent animate-fade-in">
              <TypewriterText text="Achieve Your English Goals with AI" />
            </h1>
            
            <p className="text-xl md:text-2xl text-white/80 mb-8 leading-relaxed animate-fade-in" style={{
            animationDelay: '0.3s'
          }}>
              Master English tests with AI-powered coaching. 
              Track progress, get instant feedback, and reach your target score faster.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 animate-fade-in" style={{
            animationDelay: '0.6s'
          }}>
              <Button size="lg" onClick={() => navigate('/ielts-portal')} className="bg-white text-blue-600 hover:bg-white/90 px-8 py-4 text-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 rounded-2xl border-none group">
                <Play className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                Start Practice
              </Button>
              <Button size="lg" onClick={() => navigate('/pricing')} className="bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm border border-white/30 px-8 py-4 text-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 rounded-2xl group">
                <Users className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                View Pricing
              </Button>
            </div>

            {/* Animated Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16 animate-fade-in" style={{
            animationDelay: '0.9s'
          }}>
              {[{
              label: "Active Learners",
              value: "50K+",
              icon: "👥"
            }, {
              label: "Practice Tests",
              value: "1000+",
              icon: "📚"
            }, {
              label: "AI Feedback",
              value: "Real-time",
              icon: "🤖"
            }, {
              label: "Success Rate",
              value: "95%",
              icon: "🏆"
            }].map((stat, index) => <div key={index} className="text-center group hover:scale-105 transition-transform duration-300">
                  
                  <div className="text-2xl md:text-3xl font-bold text-white mb-1 group-hover:text-yellow-300 transition-colors">
                    {stat.value}
                  </div>
                  <div className="text-sm text-white/70">{stat.label}</div>
                </div>)}
            </div>
          </div>
        </div>
      </section>

      {/* Language Picker Section */}
      <section className="py-16 px-4 bg-white/10 backdrop-blur-sm relative z-10">
        <div className="container mx-auto">
          <div className="max-w-md mx-auto">
            <LanguagePicker selectedLanguage={selectedLanguage} onLanguageChange={setSelectedLanguage} />
          </div>
        </div>
      </section>

      {/* Test Modules Section */}
      <section id="tests" className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Complete Test Preparation
            </h2>
            <p className="text-xl text-white/80 max-w-2xl mx-auto">
              Practice all test sections with Cambridge materials and AI-powered feedback
            </p>
          </div>

          {/* Animated Test Types Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {testTypes.map((test, index) => <Card key={index} className="bg-white/10 border-white/20 backdrop-blur-xl hover:bg-white/20 transition-all cursor-pointer group shadow-lg hover:shadow-2xl hover:scale-105 duration-300 animate-fade-in" style={{
            animationDelay: `${index * 0.1}s`
          }} onClick={() => navigate(test.path)}>
                <CardHeader>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                      {test.icon}
                    </div>
                    
                  </div>
                  <CardTitle className="text-white group-hover:text-yellow-300 transition-colors duration-300">
                    {test.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-white/70 mb-4">{test.description}</p>
                  
                  <Button size="sm" className="w-full bg-white text-blue-600 hover:bg-white/90 font-medium shadow-lg hover:shadow-xl transition-all duration-200 group-hover:scale-105">
                    Start Practice
                  </Button>
                </CardContent>
              </Card>)}
          </div>
        </div>
      </section>

      {/* Community Section */}
      <section id="community" className="py-20 px-4 bg-black/20 backdrop-blur-sm relative z-10">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Join Our Learning Community
          </h2>
          <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
            Connect with thousands of learners, share experiences, and achieve your goals together
          </p>
          
          <div className="grid md:grid-cols-4 gap-6 mb-12">
            {[{
            title: "IELTS Preparation",
            members: "15K+"
          }, {
            title: "PTE Practice",
            members: "8K+"
          }, {
            title: "TOEFL Study Group",
            members: "12K+"
          }, {
            title: "General English",
            members: "20K+"
          }].map((group, index) => <Card key={index} className="bg-white/10 border-white/20 backdrop-blur-xl shadow-lg hover:bg-white/20 transition-all duration-300 hover:scale-105">
                <CardContent className="pt-6 text-center">
                  <Users className="w-8 h-8 mx-auto mb-3 text-yellow-400" />
                  <h3 className="text-white font-semibold mb-2">{group.title}</h3>
                  <p className="text-white/70">{group.members} members</p>
                </CardContent>
              </Card>)}
          </div>

          <Button size="lg" onClick={() => navigate('/community')} className="bg-white text-blue-600 hover:bg-white/90 px-8 py-4 text-lg">
            <Users className="w-5 h-5 mr-2" />
            Explore Community
          </Button>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to Master English with AI?
            </h2>
            <p className="text-xl text-white/80 mb-8">
              Join thousands of successful learners who achieved their target scores with our AI-powered platform
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button size="lg" onClick={handleAuthAction} className="bg-white text-blue-600 hover:bg-white/90 px-8 py-4 text-lg">
                <Star className="w-5 h-5 mr-2" />
                Start Your Journey
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/pricing')} className="border-white/30 text-white bg-white/10 hover:bg-white/20 px-8 py-4 text-lg">
                View Pricing
              </Button>
            </div>

            <p className="text-sm text-white/60">
              Free to start • No credit card required • Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-white/20 bg-black/30 backdrop-blur-sm relative z-10">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold text-white">EnglishAI</span>
              </div>
              <p className="text-white/60 text-sm">
                AI-powered English learning platform for IELTS, PTE, and TOEFL preparation.
              </p>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-3">Tests</h4>
              <div className="space-y-2 text-sm text-white/60">
                <button onClick={() => navigate('/tests')} className="block hover:text-white transition-colors">IELTS Academic</button>
                <button onClick={() => navigate('/pte-portal')} className="block hover:text-white transition-colors">PTE Academic</button>
                <button onClick={() => navigate('/toefl-portal')} className="block hover:text-white transition-colors">TOEFL iBT</button>
                <button onClick={() => navigate('/general-portal')} className="block hover:text-white transition-colors">General English</button>
              </div>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-3">Features</h4>
              <div className="space-y-2 text-sm text-white/60">
                <button onClick={() => navigate('/dashboard')} className="block hover:text-white transition-colors">AI Feedback</button>
                <button onClick={() => navigate('/dashboard')} className="block hover:text-white transition-colors">Progress Tracking</button>
                <button onClick={() => navigate('/community')} className="block hover:text-white transition-colors">Community</button>
                <button onClick={() => navigate('/dashboard')} className="block hover:text-white transition-colors">Daily Challenges</button>
              </div>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-3">Support</h4>
              <div className="space-y-2 text-sm text-white/60">
                <button onClick={() => navigate('/dashboard')} className="block hover:text-white transition-colors">Help Center</button>
                <button onClick={() => navigate('/community')} className="block hover:text-white transition-colors">Contact Us</button>
                <div className="text-white/60">Privacy Policy</div>
                <div className="text-white/60">Terms of Service</div>
              </div>
            </div>
          </div>
          
          <div className="text-center pt-8 border-t border-white/20">
            <p className="text-white/60 text-sm">
              © 2024 EnglishAI. All rights reserved.
            </p>
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/login')} className="mt-4 text-xs text-white/40 hover:text-white/60">
              Admin Access
            </Button>
          </div>
        </div>
      </footer>
      
      {/* AI Chatbot */}
      <MinimalisticChatbot selectedLanguage={selectedLanguage} onLanguageChange={setSelectedLanguage} />
    </div>;
};
export default HeroIndex;