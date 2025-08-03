import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, BookOpen, Headphones, PenTool, Mic, Users, Target, Zap, Star, Globe, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import React from "react";
import MinimalisticChatbot from "@/components/MinimalisticChatbot";
const HeroIndex = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
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
  const testTypes = [
    {
      title: "IELTS",
      description: "Comprehensive international test practice",
      path: "/ielts-portal",
      icon: <BookOpen className="w-8 h-8 text-white" />
    },
    {
      title: "PTE Academic", 
      description: "Pearson Test of English preparation",
      path: "/pte-portal",
      icon: <Headphones className="w-8 h-8 text-white" />
    },
    {
      title: "TOEFL iBT",
      description: "Test of English as a Foreign Language",
      path: "/toefl-portal", 
      icon: <PenTool className="w-8 h-8 text-white" />
    },
    {
      title: "General English",
      description: "Improve your everyday fluency",
      path: "/general-portal",
      icon: <Mic className="w-8 h-8 text-white" />
    }
  ];
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image - Original Brightness */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-fixed"
        style={{
          backgroundImage: 'url(/lovable-uploads/f9efcff3-b597-4011-99f1-72a49c46815e.png)'
        }}
      />

      {/* Header */}
      <header className="relative z-10 px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">EnglishAI</span>
          </div>
          
          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-gray-700 hover:text-gray-900 transition-colors font-medium">Features</a>
            <a href="#tests" className="text-gray-700 hover:text-gray-900 transition-colors font-medium">Tests</a>
            <a href="#community" className="text-gray-700 hover:text-gray-900 transition-colors font-medium">Community</a>
          </nav>

          {/* Button Group */}
          <div className="flex items-center gap-4">
            <Button 
              onClick={() => navigate('/auth')} 
              variant="ghost"
              className="text-gray-700 hover:text-gray-900 hover:bg-white/20 transition-all duration-200"
            >
              Log In
            </Button>
            {user && (
              <Button 
                onClick={() => navigate('/dashboard')} 
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 shadow-lg"
              >
                My Dashboard
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 px-8 py-20 text-center animate-fade-in">
        <div className="max-w-4xl mx-auto">
          {/* Hero Badge */}
          <Badge className="mb-8 bg-white/90 backdrop-blur-sm border-gray-200 text-gray-800 px-6 py-2 text-base rounded-full shadow-lg">
            <Sparkles className="w-4 h-4 mr-2 text-blue-600" />
            ✨ Your AI-Powered English Coach
          </Badge>
          
          {/* Headline with Animation */}
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Unlock Your Potential.<br />
            Master English with AI.
          </h1>
          
          {/* Subheadline */}
          <p className="text-xl text-gray-700 mb-12 max-w-3xl mx-auto leading-relaxed animate-fade-in" style={{ animationDelay: '0.4s' }}>
            Go beyond practice tests. Get personalized coaching, track your progress, 
            and reach your target score with confidence.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-fade-in" style={{ animationDelay: '0.6s' }}>
            <Button 
              size="lg" 
              onClick={handleAuthAction}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <Play className="w-5 h-5 mr-2" />
              Start Your Journey
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => navigate('/pricing')}
              className="border-gray-300 text-gray-700 bg-white/80 hover:bg-white/90 backdrop-blur-sm px-8 py-4 text-lg font-medium rounded-lg transition-all duration-300 hover:scale-105 shadow-lg"
            >
              View Pricing
            </Button>
          </div>

          {/* Social Proof Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 animate-fade-in" style={{ animationDelay: '0.8s' }}>
            {[
              { label: "Active Learners", value: "50K+" },
              { label: "Practice Tests", value: "1000+" },
              { label: "AI Feedback", value: "Real-time" },
              { label: "Success Rate", value: "95%" }
            ].map((metric, index) => (
              <div key={index} className="text-center group hover:scale-105 transition-transform duration-300">
                <div className="text-3xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">{metric.value}</div>
                <div className="text-gray-600 text-sm">{metric.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Test Preparation Section */}
      <section id="tests" className="relative z-10 px-8 py-20 animate-fade-in">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Complete Test Preparation
            </h2>
            <p className="text-xl text-gray-700 max-w-2xl mx-auto">
              Practice all test sections with Cambridge materials and AI-powered feedback
            </p>
          </div>

          {/* Test Cards Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {testTypes.map((test, index) => (
              <Card 
                key={index} 
                className="bg-white/90 border-gray-200 backdrop-blur-xl hover:bg-white/95 transition-all cursor-pointer group shadow-lg hover:shadow-2xl hover:scale-105 duration-300 animate-fade-in" 
                style={{ animationDelay: `${index * 0.1}s` }}
                onClick={() => navigate(test.path)}
              >
                <CardHeader>
                  <div className="flex items-center justify-center mb-4">
                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                      {React.cloneElement(test.icon, { className: "w-8 h-8 text-blue-600" })}
                    </div>
                  </div>
                  <CardTitle className="text-gray-900 text-center group-hover:text-blue-600 transition-colors">
                    {test.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-center text-sm mb-6">{test.description}</p>
                  <Button 
                    size="sm" 
                    className="w-full bg-blue-600 text-white hover:bg-blue-700 transition-all duration-200 shadow-md"
                  >
                    Start Practice
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Community Section */}
      <section id="community" className="relative z-10 px-8 py-20 bg-white/80 backdrop-blur-sm animate-fade-in">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Join Our Learning Community
          </h2>
          <p className="text-xl text-gray-700 mb-12 max-w-2xl mx-auto">
            Connect with thousands of learners, share experiences, and achieve your goals together
          </p>
          
          <div className="grid md:grid-cols-4 gap-6 mb-12">
            {[
              { title: "IELTS Preparation", members: "15K+" },
              { title: "PTE Practice", members: "8K+" },
              { title: "TOEFL Study Group", members: "12K+" },
              { title: "General English", members: "20K+" }
            ].map((group, index) => (
              <Card key={index} className="bg-white/70 border-gray-200 backdrop-blur-xl hover:bg-white/90 transition-all duration-300 hover:scale-105 shadow-lg animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                <CardContent className="pt-6 text-center">
                  <Users className="w-8 h-8 mx-auto mb-3 text-blue-600" />
                  <h3 className="text-gray-900 font-semibold mb-2">{group.title}</h3>
                  <p className="text-gray-600">{group.members} members</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Button 
            size="lg" 
            onClick={() => navigate('/community')} 
            className="bg-blue-600 text-white hover:bg-blue-700 px-8 py-4 text-lg transition-all duration-300 shadow-lg"
          >
            <Users className="w-5 h-5 mr-2" />
            Explore Community
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-8 py-12 border-t border-gray-200 bg-white/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Company Info */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold text-gray-900">EnglishAI</span>
              </div>
              <p className="text-gray-600 text-sm">
                AI-powered English learning platform for IELTS, PTE, and TOEFL preparation.
              </p>
            </div>
            
            {/* Tests Column */}
            <div>
              <h4 className="text-gray-900 font-semibold mb-3">Tests</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <button onClick={() => navigate('/ielts-portal')} className="block hover:text-gray-900 transition-colors">IELTS Academic</button>
                <button onClick={() => navigate('/pte-portal')} className="block hover:text-gray-900 transition-colors">PTE Academic</button>
                <button onClick={() => navigate('/toefl-portal')} className="block hover:text-gray-900 transition-colors">TOEFL iBT</button>
                <button onClick={() => navigate('/general-portal')} className="block hover:text-gray-900 transition-colors">General English</button>
              </div>
            </div>
            
            {/* Features Column */}
            <div>
              <h4 className="text-gray-900 font-semibold mb-3">Features</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <button onClick={() => navigate('/dashboard')} className="block hover:text-gray-900 transition-colors">AI Feedback</button>
                <button onClick={() => navigate('/dashboard')} className="block hover:text-gray-900 transition-colors">Progress Tracking</button>
                <button onClick={() => navigate('/community')} className="block hover:text-gray-900 transition-colors">Community</button>
                <button onClick={() => navigate('/pricing')} className="block hover:text-gray-900 transition-colors">Pricing</button>
              </div>
            </div>
            
            {/* Support Column */}
            <div>
              <h4 className="text-gray-900 font-semibold mb-3">Support</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <button onClick={() => navigate('/dashboard')} className="block hover:text-gray-900 transition-colors">Help Center</button>
                <button onClick={() => navigate('/community')} className="block hover:text-gray-900 transition-colors">Contact Us</button>
                <button onClick={() => navigate('/admin/login')} className="block hover:text-gray-900 transition-colors">Admin Panel</button>
              </div>
            </div>
          </div>
          
          <div className="text-center pt-8 border-t border-gray-200">
            <p className="text-gray-600 text-sm">
              © 2024 EnglishAI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
      
      {/* AI Chatbot */}
      <MinimalisticChatbot selectedLanguage={selectedLanguage} onLanguageChange={setSelectedLanguage} />
    </div>
  );
};
export default HeroIndex;