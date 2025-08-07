import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, BookOpen, Headphones, PenTool, Mic, Users, Target, Zap, Star, Globe, Sparkles, Award, TrendingUp, Shield, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import MinimalisticChatbot from "@/components/MinimalisticChatbot";
import VideoBackground from "@/components/animations/VideoBackground";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { TypewriterText } from "@/components/TypewriterText";
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
      {/* Background Image */}
      <div className="fixed inset-0 w-full h-full">
        <img 
          src="/lovable-uploads/c25cc620-ab6d-47a4-9dc6-32d1f6264773.png"
          alt="Background"
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>

      {/* Header */}
      <header className="relative z-10 px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          
          
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

      {/* Hero Section - Centered */}
      <section className="relative z-10 px-8 min-h-screen flex items-center justify-center">
        <div className="max-w-4xl mx-auto bg-white/10 border border-white/20 backdrop-blur-xl rounded-xl p-8">
          {/* Headline with Animation */}
          <h1 className="text-5xl mb-8 leading-tight text-zinc-950 md:text-6xl font-light my-0 py-0 px-0">
            <TypewriterText text="Master English with AI" speed={80} />
          </h1>
          
          {/* Subheadline */}
          <div className="mb-12 max-w-2xl mx-auto leading-relaxed text-lg text-sky-950">
            <TypewriterText text="Go beyond practice tests. Get personalized coaching, track your progress, and reach your target score with confidence." speed={30} />
          </div>

          {/* Action Button */}
          <div className="mb-16">
            
          </div>

          {/* Social Proof Metrics with Animated Counters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-2xl font-light text-zinc-900 mb-2">
                <AnimatedCounter endValue={50} suffix="K+" />
              </div>
              <div className="text-sm text-zinc-700">Active Learners</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-light text-zinc-900 mb-2">
                <AnimatedCounter endValue={1000} suffix="+" />
              </div>
              <div className="text-sm text-zinc-700">Practice Tests</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-light text-zinc-900 mb-2">Real-time</div>
              <div className="text-sm text-zinc-700">AI Feedback</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-light text-zinc-900 mb-2">
                <AnimatedCounter endValue={95} suffix="%" />
              </div>
              <div className="text-sm text-zinc-700">Success Rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* Test Preparation Section - Square Cards */}
      <section id="tests" className="relative z-10 px-8 py-20 animate-fade-in">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl mb-12 text-center font-light text-zinc-950">
            Choose Your Test Preparation
          </h2>
          {/* Test Cards Grid - Square Layout */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {testTypes.map((test, index) => (
              <Card 
                key={index} 
                className="bg-white/10 border-white/20 backdrop-blur-xl hover:bg-white/15 transition-all cursor-pointer group shadow-lg hover:shadow-2xl hover:scale-105 duration-300 aspect-square flex flex-col justify-between" 
                onClick={() => navigate(test.path)}
              >
                <CardHeader className="text-center flex-1 flex flex-col justify-center items-center">
                  <div className="mb-4 p-3 bg-white/10 rounded-full">
                    {test.icon}
                  </div>
                  <CardTitle className="text-center transition-colors text-zinc-950 font-normal text-lg">
                    {test.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-6">
                  <Button size="sm" className="w-full bg-white/10 border border-white/20 hover:bg-white/20 transition-all duration-200 text-zinc-950 font-extralight text-sm">
                    Start Practice
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 px-8 py-20 animate-fade-in">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl mb-12 text-center font-light text-zinc-950">
            Why Choose Our Platform
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Target className="w-8 h-8 text-white" />,
                title: "Personalized Learning",
                description: "AI-powered adaptive learning paths tailored to your specific needs and skill level"
              },
              {
                icon: <TrendingUp className="w-8 h-8 text-white" />,
                title: "Real-time Progress",
                description: "Track your improvement with detailed analytics and performance insights"
              },
              {
                icon: <Award className="w-8 h-8 text-white" />,
                title: "Expert Content",
                description: "Practice with authentic test materials created by certified English instructors"
              }
            ].map((feature, index) => (
              <Card key={index} className="bg-white/10 border-white/20 backdrop-blur-xl hover:bg-white/15 transition-all duration-300 hover:scale-105">
                <CardHeader className="text-center">
                  <div className="mb-4 p-3 bg-white/10 rounded-full w-fit mx-auto">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-zinc-950 font-normal text-xl">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-zinc-700 text-center leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Success Stories Section */}
      <section className="relative z-10 px-8 py-20 animate-fade-in">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl mb-12 text-center font-light text-zinc-950">
            Success Stories
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                score: "8.5",
                test: "IELTS",
                name: "Sarah Chen",
                quote: "The AI feedback helped me improve my speaking score by 2 bands in just 6 weeks!"
              },
              {
                score: "85",
                test: "PTE",
                name: "Ahmed Hassan",
                quote: "Perfect preparation platform. The practice tests were exactly like the real exam."
              }
            ].map((story, index) => (
              <Card key={index} className="bg-white/10 border-white/20 backdrop-blur-xl hover:bg-white/15 transition-all duration-300">
                <CardContent className="p-8">
                  <div className="flex items-center mb-4">
                    <div className="text-3xl font-bold text-zinc-950 mr-4">{story.score}</div>
                    <div>
                      <div className="font-semibold text-zinc-950">{story.test} Score</div>
                      <div className="text-sm text-zinc-700">{story.name}</div>
                    </div>
                  </div>
                  <p className="text-zinc-800 italic">"{story.quote}"</p>
                </CardContent>
              </Card>
            ))}
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