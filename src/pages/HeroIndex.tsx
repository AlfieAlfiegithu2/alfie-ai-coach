import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Play, BookOpen, Headphones, PenTool, Mic, Users, Target, Zap, Star, Globe, Bot, Award, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import LanguagePicker from "@/components/LanguagePicker";
import MinimalisticChatbot from "@/components/MinimalisticChatbot";
import { TypewriterText } from "@/components/TypewriterText";
import HeroAnimation from "@/components/animations/HeroAnimation";
import LightRays from "@/components/animations/LightRays";
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
  return <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 text-gray-800 relative">
      {/* Light Rays Background Effect */}
      <LightRays 
        raysOrigin="top-center"
        raysColor="#fbbf24"
        raysSpeed={0.3}
        lightSpread={2}
        rayLength={3}
        fadeDistance={2}
        saturation={0.6}
        followMouse={true}
        mouseInfluence={0.05}
        className="absolute inset-0 opacity-20"
      />

      {/* Navigation */}
      <nav className="border-b border-orange-200/30 bg-white/50 backdrop-blur-xl relative z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-800">EnglishAI</span>
            </div>
            
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-gray-700 hover:text-primary transition-colors">Features</a>
              <a href="#tests" className="text-gray-700 hover:text-primary transition-colors">Tests</a>
              <a href="#community" className="text-gray-700 hover:text-primary transition-colors">Community</a>
            </div>

            <div className="flex items-center gap-4">
              <Button 
                onClick={() => navigate('/auth')}
                className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200"
              >
                Log In
              </Button>
              <Button 
                onClick={() => navigate('/dashboard')}
                variant="outline"
                className="border-primary/30 text-primary bg-orange-50 hover:bg-primary hover:text-primary-foreground px-6 py-2 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200"
              >
                My Dashboard
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4 relative overflow-hidden">
        <HeroAnimation className="opacity-30" />
        <div className="container mx-auto text-center relative z-10">
          <div className="max-w-4xl mx-auto">
            
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-gray-800 via-primary to-orange-600 bg-clip-text text-transparent">
              <TypewriterText text="Achieve Your English Goals with AI" />
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 mb-8 leading-relaxed">
              Master English tests with AI-powered coaching. 
              Track progress, get instant feedback, and reach your target score faster.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button 
                size="lg" 
                onClick={() => navigate('/ielts-portal')} 
                className="bg-primary hover:bg-primary/90 text-white px-8 py-4 text-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 rounded-2xl border-none"
              >
                <Play className="w-5 h-5 mr-2" />
                Start Practice
              </Button>
              <Button 
                size="lg" 
                onClick={() => navigate('/pricing')} 
                className="bg-white text-primary hover:bg-orange-50 px-8 py-4 text-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 rounded-2xl border-2 border-primary"
              >
                <Users className="w-5 h-5 mr-2" />
                View Pricing
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
              {[{
              label: "Active Learners",
              value: "50K+"
            }, {
              label: "Practice Tests",
              value: "1000+"
            }, {
              label: "AI Feedback",
              value: "Real-time"
            }, {
              label: "Success Rate",
              value: "95%"
            }].map((stat, index) => <div key={index} className="text-center">
                  <div className="text-2xl md:text-3xl font-bold text-primary mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-500">{stat.label}</div>
                </div>)}
            </div>
          </div>
        </div>
      </section>

      {/* Language Picker Section */}
      <section className="py-16 px-4 bg-white/30 backdrop-blur-sm relative z-10">
        <div className="container mx-auto">
          <div className="max-w-md mx-auto">
            <LanguagePicker
              selectedLanguage={selectedLanguage}
              onLanguageChange={setSelectedLanguage}
            />
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
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Practice all test sections with Cambridge materials and AI-powered feedback
            </p>
          </div>

          {/* Test Types Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {testTypes.map((test, index) => <Card key={index} className="bg-white/70 border-orange-200 backdrop-blur-xl hover:bg-white/90 transition-all cursor-pointer group shadow-lg" onClick={() => navigate(test.path)}>
                <CardHeader>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                      {test.icon}
                    </div>
                    
                  </div>
                  <CardTitle className="text-gray-800 group-hover:text-primary transition-colors">
                    {test.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">{test.description}</p>
                  
                  <Button 
                    size="sm" 
                    className="w-full bg-primary hover:bg-primary/90 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    Start Practice
                  </Button>
                </CardContent>
              </Card>)}
          </div>
        </div>
      </section>

      {/* Community Section */}
      <section id="community" className="py-20 px-4 bg-white/30 backdrop-blur-sm relative z-10">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Join Our Learning Community
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
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
          }].map((group, index) => <Card key={index} className="bg-white/70 border-orange-200 backdrop-blur-xl shadow-lg">
                <CardContent className="pt-6 text-center">
                  <Users className="w-8 h-8 mx-auto mb-3 text-primary" />
                  <h3 className="text-gray-800 font-semibold mb-2">{group.title}</h3>
                  <p className="text-gray-600">{group.members} members</p>
                </CardContent>
              </Card>)}
          </div>

          <Button size="lg" onClick={() => navigate('/community')} className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg">
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
            <p className="text-xl text-gray-600 mb-8">
              Join thousands of successful learners who achieved their target scores with our AI-powered platform
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button size="lg" onClick={handleAuthAction} className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg">
                <Star className="w-5 h-5 mr-2" />
                Start Your Journey
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={() => navigate('/pricing')} 
                className="border-primary/30 text-primary bg-orange-50 hover:bg-primary hover:text-primary-foreground px-8 py-4 text-lg"
              >
                View Pricing
              </Button>
            </div>

            <p className="text-sm text-gray-500">
              Free to start • No credit card required • Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-orange-200/30 bg-white/30 backdrop-blur-sm relative z-10">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold text-gray-800">EnglishAI</span>
              </div>
              <p className="text-gray-600 text-sm">
                AI-powered English learning platform for IELTS, PTE, and TOEFL preparation.
              </p>
            </div>
            
            <div>
              <h4 className="text-gray-800 font-semibold mb-3">Tests</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <button onClick={() => navigate('/tests')} className="block hover:text-primary transition-colors">IELTS Academic</button>
                <button onClick={() => navigate('/pte-portal')} className="block hover:text-primary transition-colors">PTE Academic</button>
                <button onClick={() => navigate('/toefl-portal')} className="block hover:text-primary transition-colors">TOEFL iBT</button>
                <button onClick={() => navigate('/general-portal')} className="block hover:text-primary transition-colors">General English</button>
              </div>
            </div>
            
            <div>
              <h4 className="text-gray-800 font-semibold mb-3">Features</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <button onClick={() => navigate('/dashboard')} className="block hover:text-primary transition-colors">AI Feedback</button>
                <button onClick={() => navigate('/dashboard')} className="block hover:text-primary transition-colors">Progress Tracking</button>
                <button onClick={() => navigate('/community')} className="block hover:text-primary transition-colors">Community</button>
                <button onClick={() => navigate('/dashboard')} className="block hover:text-primary transition-colors">Daily Challenges</button>
              </div>
            </div>
            
            <div>
              <h4 className="text-gray-800 font-semibold mb-3">Support</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <button onClick={() => navigate('/dashboard')} className="block hover:text-primary transition-colors">Help Center</button>
                <button onClick={() => navigate('/community')} className="block hover:text-primary transition-colors">Contact Us</button>
                <div className="text-gray-600">Privacy Policy</div>
                <div className="text-gray-600">Terms of Service</div>
              </div>
            </div>
          </div>
          
          <div className="text-center pt-8 border-t border-orange-200/30">
            <p className="text-gray-600 text-sm">
              © 2024 EnglishAI. All rights reserved.
            </p>
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/login')} className="mt-4 text-xs text-gray-500 hover:text-gray-700">
              Admin Access
            </Button>
          </div>
        </div>
      </footer>
      
      {/* AI Chatbot */}
      <MinimalisticChatbot 
        selectedLanguage={selectedLanguage}
        onLanguageChange={setSelectedLanguage}
      />
    </div>;
};
export default HeroIndex;