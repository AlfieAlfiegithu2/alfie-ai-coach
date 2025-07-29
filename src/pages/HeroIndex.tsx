import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Play, BookOpen, Headphones, PenTool, Mic, Users, Target, Zap, Star, Globe, Bot, Award } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
const HeroIndex = () => {
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
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
    path: "/reading",
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
  return <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white">
      {/* Navigation */}
      <nav className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold">EnglishAI</span>
            </div>
            
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="hover:text-blue-400 transition-colors">Features</a>
              <a href="#tests" className="hover:text-blue-400 transition-colors">Tests</a>
              <a href="#community" className="hover:text-blue-400 transition-colors">Community</a>
            </div>

            <div className="flex items-center gap-4">
              {!user && <Button variant="outline" onClick={() => navigate('/auth')} className="border-white/20 text-white hover:bg-white/10">
                  Sign In
                </Button>}
              <Button onClick={handleAuthAction} className="bg-primary hover:bg-primary/90 text-primary-foreground px-6">
                {user ? 'Go to Dashboard' : 'Start Learning'}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <div className="max-w-4xl mx-auto">
            
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-blue-200 to-purple-300 bg-clip-text text-transparent">
              Achieve Your English Goals with AI
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-300 mb-8 leading-relaxed">
              Master English tests with AI-powered coaching. 
              Track progress, get instant feedback, and reach your target score faster.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button size="lg" onClick={handleAuthAction} className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg">
                <Play className="w-5 h-5 mr-2" />
                Start Free Practice
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/community')} className="border-white/20 text-foreground hover:bg-accent px-8 py-4 text-lg">
                <Users className="w-5 h-5 mr-2" />
                Join Community
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
                  <div className="text-2xl md:text-3xl font-bold text-blue-400 mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-400">{stat.label}</div>
                </div>)}
            </div>
          </div>
        </div>
      </section>

      {/* Search Bar Section */}
      <section className="py-12 px-4 bg-black/20">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Quick Search
          </h2>
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <input type="text" placeholder="Search for lessons, tests, or content..." className="w-full px-6 py-4 text-lg rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400" onKeyPress={e => {
              if (e.key === 'Enter') {
                // Basic search functionality - redirect to tests page
                navigate('/tests');
              }
            }} />
              <Button onClick={() => navigate('/tests')} className="absolute right-2 top-2 h-12 px-6 bg-blue-500 hover:bg-blue-600">
                Search
              </Button>
            </div>
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
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Practice all test sections with Cambridge materials and AI-powered feedback
            </p>
          </div>

          {/* Test Types Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {testTypes.map((test, index) => <Card key={index} className="bg-white/5 border-white/10 backdrop-blur-xl hover:bg-white/10 transition-all cursor-pointer group" onClick={() => navigate(test.path)}>
                <CardHeader>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                      {test.icon}
                    </div>
                    <Badge variant="outline" className="border-white/20 text-white">
                      4 sections
                    </Badge>
                  </div>
                  <CardTitle className="text-white group-hover:text-blue-400 transition-colors">
                    {test.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 mb-4">{test.description}</p>
                  
                  <Button variant="outline" size="sm" className="w-full border-white/20 text-white hover:bg-white/10">
                    Start Practice
                  </Button>
                </CardContent>
              </Card>)}
          </div>
        </div>
      </section>

      {/* Community Section */}
      <section id="community" className="py-20 px-4 bg-black/20">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Join Our Learning Community
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
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
          }].map((group, index) => <Card key={index} className="bg-white/5 border-white/10 backdrop-blur-xl">
                <CardContent className="pt-6 text-center">
                  <Users className="w-8 h-8 mx-auto mb-3 text-blue-400" />
                  <h3 className="text-white font-semibold mb-2">{group.title}</h3>
                  <p className="text-gray-300">{group.members} members</p>
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
            <p className="text-xl text-gray-300 mb-8">
              Join thousands of successful learners who achieved their target scores with our AI-powered platform
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button size="lg" onClick={handleAuthAction} className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg">
                <Star className="w-5 h-5 mr-2" />
                Start Your Journey
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/pricing')} className="border-white/20 text-white hover:bg-white/10 px-8 py-4 text-lg">
                View Pricing
              </Button>
            </div>

            <p className="text-sm text-gray-400">
              Free to start • No credit card required • Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-white/10 bg-black/20">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold">EnglishAI</span>
              </div>
              <p className="text-gray-400 text-sm">
                AI-powered English learning platform for IELTS, PTE, and TOEFL preparation.
              </p>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-3">Tests</h4>
              <div className="space-y-2 text-sm text-gray-400">
                <button onClick={() => navigate('/tests')} className="block hover:text-white transition-colors">IELTS Academic</button>
                <button onClick={() => navigate('/pte-portal')} className="block hover:text-white transition-colors">PTE Academic</button>
                <button onClick={() => navigate('/toefl-portal')} className="block hover:text-white transition-colors">TOEFL iBT</button>
                <button onClick={() => navigate('/general-portal')} className="block hover:text-white transition-colors">General English</button>
              </div>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-3">Features</h4>
              <div className="space-y-2 text-sm text-gray-400">
                <button onClick={() => navigate('/dashboard')} className="block hover:text-white transition-colors">AI Feedback</button>
                <button onClick={() => navigate('/dashboard')} className="block hover:text-white transition-colors">Progress Tracking</button>
                <button onClick={() => navigate('/community')} className="block hover:text-white transition-colors">Community</button>
                <button onClick={() => navigate('/dashboard')} className="block hover:text-white transition-colors">Daily Challenges</button>
              </div>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-3">Support</h4>
              <div className="space-y-2 text-sm text-gray-400">
                <button onClick={() => navigate('/dashboard')} className="block hover:text-white transition-colors">Help Center</button>
                <button onClick={() => navigate('/community')} className="block hover:text-white transition-colors">Contact Us</button>
                <div className="text-gray-400">Privacy Policy</div>
                <div className="text-gray-400">Terms of Service</div>
              </div>
            </div>
          </div>
          
          <div className="text-center pt-8 border-t border-white/10">
            <p className="text-gray-400 text-sm">
              © 2024 EnglishAI. All rights reserved.
            </p>
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/login')} className="mt-4 text-xs text-gray-500 hover:text-gray-400">
              Admin Access
            </Button>
          </div>
        </div>
      </footer>
    </div>;
};
export default HeroIndex;