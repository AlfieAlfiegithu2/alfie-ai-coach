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
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  const handleAuthAction = () => {
    if (user) {
      navigate('/tests');
    } else {
      navigate('/auth');
    }
  };

  const features = [
    {
      icon: <Bot className="w-6 h-6 text-foreground" />,
      title: "AI-Powered Learning",
      description: "Personalized study plans with real-time feedback and analysis"
    },
    {
      icon: <Target className="w-6 h-6 text-foreground" />,
      title: "Goal-Oriented Progress", 
      description: "Set your target band score and track daily improvement"
    },
    {
      icon: <Globe className="w-6 h-6 text-foreground" />,
      title: "Multi-Language Support",
      description: "Practice in your native language with instant translation"
    },
    {
      icon: <Users className="w-6 h-6 text-foreground" />,
      title: "Community Learning",
      description: "Connect with fellow learners and share study experiences"
    }
  ];

  const testModules = [
    {
      title: "Reading",
      icon: <BookOpen className="w-6 h-6 text-foreground" />,
      description: "Cambridge IELTS passages with AI analysis",
      path: "/reading",
      questions: "40+ questions"
    },
    {
      title: "Listening", 
      icon: <Headphones className="w-6 h-6 text-foreground" />,
      description: "Audio practice with transcription support",
      path: "/listening",
      color: "bg-green-500",
      questions: "40+ questions"
    },
    {
      title: "Writing",
      icon: <PenTool className="w-6 h-6" />,
      description: "Task 1 & 2 with detailed AI feedback",
      path: "/writing",
      color: "bg-purple-500",
      questions: "2 tasks"
    },
    {
      title: "Speaking",
      icon: <Mic className="w-6 h-6" />,
      description: "Voice analysis with pronunciation feedback",
      path: "/speaking", 
      color: "bg-orange-500",
      questions: "3 parts"
    }
  ];

  const additionalPortals = [
    {
      title: "PTE Academic",
      description: "Comprehensive PTE test preparation",
      path: "/pte-portal",
      badge: "New"
    },
    {
      title: "TOEFL iBT",
      description: "Complete TOEFL preparation suite",
      path: "/toefl-portal",
      badge: "Popular"
    },
    {
      title: "General English",
      description: "Daily English improvement lessons",
      path: "/general-portal",
      badge: "AI Generated"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white">
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

            <Button 
              onClick={handleAuthAction}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6"
            >
              {user ? 'Go to Dashboard' : 'Start Learning'}
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <div className="max-w-4xl mx-auto">
            <Badge className="mb-6 bg-blue-500/20 text-blue-300 border-blue-500/30">
              AI-Powered English Learning Platform
            </Badge>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-blue-200 to-purple-300 bg-clip-text text-transparent">
              Achieve Your English Goals with AI
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-300 mb-8 leading-relaxed">
              Master IELTS, PTE, TOEFL with personalized AI coaching. 
              Track progress, get instant feedback, and reach your target band score faster.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button 
                size="lg" 
                onClick={handleAuthAction}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg"
              >
                <Play className="w-5 h-5 mr-2" />
                Start Free Practice
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => navigate('/community')}
                className="border-white/20 text-white hover:bg-white/10 px-8 py-4 text-lg"
              >
                <Users className="w-5 h-5 mr-2" />
                Join Community
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
              {[
                { label: "Active Learners", value: "50K+" },
                { label: "Practice Tests", value: "1000+" },
                { label: "AI Feedback", value: "Real-time" },
                { label: "Success Rate", value: "95%" }
              ].map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-2xl md:text-3xl font-bold text-blue-400 mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-black/20">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Powered by Advanced AI Technology
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Experience the future of English learning with our cutting-edge AI features
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="bg-white/5 border-white/10 backdrop-blur-xl">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-white text-xl">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 text-center">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
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

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {testModules.map((module, index) => (
              <Card key={index} className="bg-white/5 border-white/10 backdrop-blur-xl hover:bg-white/10 transition-all cursor-pointer group"
                    onClick={() => navigate(module.path)}>
                <CardHeader>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 ${module.color} rounded-xl flex items-center justify-center text-white`}>
                      {module.icon}
                    </div>
                    <Badge variant="outline" className="border-white/20 text-white">
                      {module.questions}
                    </Badge>
                  </div>
                  <CardTitle className="text-white group-hover:text-blue-400 transition-colors">
                    {module.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 mb-4">{module.description}</p>
                  <Button variant="outline" size="sm" className="w-full border-white/20 text-white hover:bg-white/10">
                    Start Practice
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Additional Portals */}
          <div className="grid md:grid-cols-3 gap-6">
            {additionalPortals.map((portal, index) => (
              <Card key={index} className="bg-white/5 border-white/10 backdrop-blur-xl hover:bg-white/10 transition-all cursor-pointer"
                    onClick={() => navigate(portal.path)}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white">{portal.title}</CardTitle>
                    <Badge className={
                      portal.badge === 'New' ? 'bg-green-500' :
                      portal.badge === 'Popular' ? 'bg-orange-500' :
                      'bg-purple-500'
                    }>
                      {portal.badge}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300">{portal.description}</p>
                </CardContent>
              </Card>
            ))}
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
            {[
              { title: "IELTS Preparation", members: "15K+" },
              { title: "PTE Practice", members: "8K+" },
              { title: "TOEFL Study Group", members: "12K+" },
              { title: "General English", members: "20K+" }
            ].map((group, index) => (
              <Card key={index} className="bg-white/5 border-white/10 backdrop-blur-xl">
                <CardContent className="pt-6 text-center">
                  <Users className="w-8 h-8 mx-auto mb-3 text-blue-400" />
                  <h3 className="text-white font-semibold mb-2">{group.title}</h3>
                  <p className="text-gray-300">{group.members} members</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Button 
            size="lg" 
            onClick={() => navigate('/community')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg"
          >
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
              <Button 
                size="lg" 
                onClick={handleAuthAction}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg"
              >
                <Star className="w-5 h-5 mr-2" />
                Start Your Journey
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10 px-8 py-4 text-lg"
              >
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
                <div>IELTS Academic</div>
                <div>PTE Academic</div>
                <div>TOEFL iBT</div>
                <div>General English</div>
              </div>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-3">Features</h4>
              <div className="space-y-2 text-sm text-gray-400">
                <div>AI Feedback</div>
                <div>Progress Tracking</div>
                <div>Community</div>
                <div>Daily Challenges</div>
              </div>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-3">Support</h4>
              <div className="space-y-2 text-sm text-gray-400">
                <div>Help Center</div>
                <div>Contact Us</div>
                <div>Privacy Policy</div>
                <div>Terms of Service</div>
              </div>
            </div>
          </div>
          
          <div className="text-center pt-8 border-t border-white/10">
            <p className="text-gray-400 text-sm">
              © 2024 EnglishAI. All rights reserved. Powered by advanced AI technology.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HeroIndex;