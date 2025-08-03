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
  return <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Premium Glass Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-muted/30 to-background" />
      <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-primary/10" />

      {/* Glassmorphism Header */}
      <header className="relative z-10 px-8 py-4 glass-nav">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 glow-blue">
              <span className="text-lg font-bold text-white">A</span>
            </div>
            <span className="text-xl font-bold text-text-primary">
              ALFIE IELTS AI
            </span>
          </div>
          
          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-text-secondary hover:text-primary transition-colors font-medium">Features</a>
            <a href="#tests" className="text-text-secondary hover:text-primary transition-colors font-medium">Tests</a>
            <a href="#community" className="text-text-secondary hover:text-primary transition-colors font-medium">Community</a>
          </nav>

          {/* Button Group */}
          <div className="flex items-center gap-4">
            <Button onClick={() => navigate('/auth')} variant="glass" className="transition-all duration-300">
              Log In
            </Button>
            {user && <Button onClick={() => navigate('/dashboard')} variant="premium" className="transition-all duration-300">
                My Dashboard
              </Button>}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 px-8 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          {/* Hero Badge */}
          
          
          {/* Hero Title */}
          <h1 className="text-5xl mb-6 leading-tight animate-fade-in text-text-primary md:text-6xl font-bold">
            Unlock Your Potential.<br />
            <span className="text-primary glow-blue">Master English with AI.</span>
          </h1>
          
          {/* Subheadline */}
          <p className="mb-12 max-w-3xl mx-auto leading-relaxed text-text-secondary text-xl">
            Go beyond practice tests. Get personalized coaching, track your progress, 
            and reach your target score with confidence.
          </p>

          {/* CTA Buttons */}
          

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
          }].map((metric, index) => (
            <div key={index} className="text-center glass-card p-4 rounded-2xl hover:glow-blue transition-all duration-300">
              <div className="text-3xl font-bold text-primary mb-2 glow-blue">{metric.value}</div>
              <div className="text-sm text-text-tertiary">{metric.label}</div>
            </div>
          ))}
          </div>
        </div>
      </section>

      {/* Test Preparation Section */}
      <section id="tests" className="relative z-10 px-8 py-20">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl mb-4 text-text-primary font-bold">
              Complete Test Preparation
            </h2>
            <p className="max-w-2xl mx-auto text-text-secondary text-lg">
              Practice all test sections with Cambridge materials and AI-powered feedback
            </p>
          </div>

          {/* Test Cards Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {testTypes.map((test, index) => <Card key={index} className="glass-card cursor-pointer group hover:glow-blue transition-all duration-300 hover:scale-105" onClick={() => navigate(test.path)}>
                <CardHeader>
                  <div className="w-16 h-16 mx-auto mb-4 rounded-xl glass-effect flex items-center justify-center group-hover:glow-blue transition-all duration-300">
                    <div className="text-primary">
                      {test.icon}
                    </div>
                  </div>
                  <CardTitle className="text-center transition-colors text-text-primary font-semibold text-lg">
                    {test.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-center text-sm mb-6 text-text-secondary">{test.description}</p>
                  <Button size="sm" variant="premium" className="w-full">
                    Start Practice
                  </Button>
                </CardContent>
              </Card>)}
          </div>
        </div>
      </section>

      {/* Community Section */}
      <section id="community" className="relative z-10 px-8 py-20 glass-effect">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-4xl mb-4 md:text-4xl font-bold text-text-primary">
            Join Our Learning Community
          </h2>
          <p className="mb-12 max-w-2xl mx-auto text-text-secondary text-lg">
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
          }].map((group, index) => <Card key={index} className="glass-card hover:glow-blue transition-all duration-300">
                <CardContent className="pt-6 text-center">
                  <Users className="w-8 h-8 mx-auto mb-3 text-primary" />
                  <h3 className="mb-2 text-text-primary font-semibold text-sm">{group.title}</h3>
                  <p className="text-sm text-text-tertiary">{group.members} members</p>
                </CardContent>
              </Card>)}
          </div>

          <Button size="lg" onClick={() => navigate('/community')} variant="premium" className="px-8 py-4 text-lg">
            <Users className="w-5 h-5 mr-2" />
            Explore Community
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-8 py-12 glass-nav border-t border-glass-border">
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
              <p className="text-sm text-text-secondary">
                AI-powered English learning platform for IELTS, PTE, and TOEFL preparation.
              </p>
            </div>
            
            {/* Tests Column */}
            <div>
              <h4 className="text-text-primary font-semibold mb-3">Tests</h4>
              <div className="space-y-2 text-sm text-text-tertiary">
                <button onClick={() => navigate('/ielts-portal')} className="block hover:text-primary transition-colors">IELTS Academic</button>
                <button onClick={() => navigate('/pte-portal')} className="block hover:text-primary transition-colors">PTE Academic</button>
                <button onClick={() => navigate('/toefl-portal')} className="block hover:text-primary transition-colors">TOEFL iBT</button>
                <button onClick={() => navigate('/general-portal')} className="block hover:text-primary transition-colors">General English</button>
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