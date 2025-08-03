import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, BookOpen, Headphones, PenTool, Mic, Users, Target, Zap, Star, Globe, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import MinimalisticChatbot from "@/components/MinimalisticChatbot";
const HeroIndex = () => {
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
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
  const testTypes = [{
    title: "IELTS",
    description: "Comprehensive international test practice",
    path: "/ielts-portal",
    icon: <BookOpen className="w-8 h-8 text-white" />
  }, {
    title: "PTE Academic",
    description: "Pearson Test of English preparation",
    path: "/pte-portal",
    icon: <Headphones className="w-8 h-8 text-white" />
  }, {
    title: "TOEFL iBT",
    description: "Test of English as a Foreign Language",
    path: "/toefl-portal",
    icon: <PenTool className="w-8 h-8 text-white" />
  }, {
    title: "General English",
    description: "Improve your everyday fluency",
    path: "/general-portal",
    icon: <Mic className="w-8 h-8 text-white" />
  }];
  return <div className="min-h-screen relative overflow-hidden">
      {/* Background Image - Original Brightness */}
      <div className="absolute inset-0 bg-cover bg-center bg-fixed" style={{
      backgroundImage: 'url(/lovable-uploads/f9efcff3-b597-4011-99f1-72a49c46815e.png)'
    }} />

      {/* Header */}
      <header className="relative z-10 px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">EnglishAI</span>
          </div>
          
          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-zinc-300 hover:text-white transition-colors font-medium">Features</a>
            <a href="#tests" className="text-zinc-300 hover:text-white transition-colors font-medium">Tests</a>
            <a href="#community" className="text-zinc-300 hover:text-white transition-colors font-medium">Community</a>
          </nav>

          {/* Button Group */}
          <div className="flex items-center gap-4">
            <Button onClick={() => navigate('/auth')} variant="ghost" className="text-white transition-all duration-200 bg-zinc-950 hover:bg-zinc-800">
              Log In
            </Button>
            {user && <Button onClick={() => navigate('/dashboard')} className="text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 bg-gray-500 hover:bg-gray-400">
                My Dashboard
              </Button>}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 px-8 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          {/* Hero Badge */}
          
          
          {/* Headline with Animation */}
          <h1 className="text-5xl mb-6 leading-tight animate-fade-in text-zinc-950 md:text-4xl font-light">
            Unlock Your Potential.<br />
            Master English with AI.
          </h1>
          
          {/* Subheadline */}
          <p className="mb-12 max-w-3xl mx-auto leading-relaxed text-zinc-900 text-lg">
            Go beyond practice tests. Get personalized coaching, track your progress, 
            and reach your target score with confidence.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button size="lg" onClick={handleAuthAction} className="text-white px-8 py-4 text-lg font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 bg-zinc-500 hover:bg-zinc-400">
              <Play className="w-5 h-5 mr-2" />
              Start Your Journey
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/pricing')} className="border-white/30 bg-white/10 hover:bg-white/20 backdrop-blur-sm px-8 py-4 text-lg font-medium rounded-lg transition-all duration-300 hover:scale-105 text-zinc-900">
              View Pricing
            </Button>
          </div>

          {/* Social Proof Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
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
          }].map((metric, index) => <div key={index} className="text-center">
                
                
              </div>)}
          </div>
        </div>
      </section>

      {/* Test Preparation Section */}
      <section id="tests" className="relative z-10 px-8 py-20">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl mb-4 text-zinc-900 font-extralight">
              Complete Test Preparation
            </h2>
            <p className="max-w-2xl mx-auto text-zinc-900 text-lg">
              Practice all test sections with Cambridge materials and AI-powered feedback
            </p>
          </div>

          {/* Test Cards Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {testTypes.map((test, index) => <Card key={index} className="bg-white/10 border-white/20 backdrop-blur-xl hover:bg-white/15 transition-all cursor-pointer group shadow-lg hover:shadow-2xl hover:scale-105 duration-300" onClick={() => navigate(test.path)}>
                <CardHeader>
                  
                  <CardTitle className="text-center transition-colors text-zinc-950 font-normal text-base">
                    {test.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-center text-sm mb-6 text-slate-900">{test.description}</p>
                  <Button size="sm" className="w-full bg-white/10 border border-white/20 hover:bg-white/20 transition-all duration-200 text-zinc-950 font-extralight text-sm">
                    Start Practice
                  </Button>
                </CardContent>
              </Card>)}
          </div>
        </div>
      </section>

      {/* Community Section */}
      <section id="community" className="relative z-10 px-8 py-20 bg-black/20 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-4xl mb-4 md:text-4xl font-extralight text-zinc-950">
            Join Our Learning Community
          </h2>
          <p className="mb-12 max-w-2xl mx-auto text-zinc-950 text-base font-light">
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
          }].map((group, index) => <Card key={index} className="bg-white/10 border-white/20 backdrop-blur-xl hover:bg-white/20 transition-all duration-300 hover:scale-105">
                <CardContent className="pt-6 text-center">
                  
                  <h3 className="mb-2 text-zinc-950 font-light text-sm">{group.title}</h3>
                  <p className="text-sm text-zinc-950 font-extralight">{group.members} members</p>
                </CardContent>
              </Card>)}
          </div>

          <Button size="lg" onClick={() => navigate('/community')} className="bg-white/10 text-white border border-white/20 hover:bg-white/20 px-8 py-4 text-lg transition-all duration-300">
            <Users className="w-5 h-5 mr-2" />
            Explore Community
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-8 py-12 border-t border-white/20 bg-black/30 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Company Info */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold text-white">EnglishAI</span>
              </div>
              <p className="text-sm text-zinc-950">
                AI-powered English learning platform for IELTS, PTE, and TOEFL preparation.
              </p>
            </div>
            
            {/* Tests Column */}
            <div>
              <h4 className="text-white font-semibold mb-3">Tests</h4>
              <div className="space-y-2 text-sm text-zinc-400">
                <button onClick={() => navigate('/ielts-portal')} className="block hover:text-white transition-colors">IELTS Academic</button>
                <button onClick={() => navigate('/pte-portal')} className="block hover:text-white transition-colors">PTE Academic</button>
                <button onClick={() => navigate('/toefl-portal')} className="block hover:text-white transition-colors">TOEFL iBT</button>
                <button onClick={() => navigate('/general-portal')} className="block hover:text-white transition-colors">General English</button>
              </div>
            </div>
            
            {/* Features Column */}
            <div>
              <h4 className="text-white font-semibold mb-3">Features</h4>
              <div className="space-y-2 text-sm text-zinc-400">
                <button onClick={() => navigate('/dashboard')} className="block hover:text-white transition-colors">AI Feedback</button>
                <button onClick={() => navigate('/dashboard')} className="block hover:text-white transition-colors">Progress Tracking</button>
                <button onClick={() => navigate('/community')} className="block hover:text-white transition-colors">Community</button>
                <button onClick={() => navigate('/pricing')} className="block hover:text-white transition-colors">Pricing</button>
              </div>
            </div>
            
            {/* Support Column */}
            <div>
              <h4 className="text-white font-semibold mb-3">Support</h4>
              <div className="space-y-2 text-sm text-zinc-400">
                <button onClick={() => navigate('/dashboard')} className="block hover:text-white transition-colors">Help Center</button>
                <button onClick={() => navigate('/community')} className="block hover:text-white transition-colors">Contact Us</button>
                <button onClick={() => navigate('/admin/login')} className="block hover:text-white transition-colors">Admin Panel</button>
              </div>
            </div>
          </div>
          
          <div className="text-center pt-8 border-t border-white/20">
            <p className="text-zinc-400 text-sm">
              © 2024 EnglishAI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
      
      {/* AI Chatbot */}
      <MinimalisticChatbot selectedLanguage={selectedLanguage} onLanguageChange={setSelectedLanguage} />
    </div>;
};
export default HeroIndex;