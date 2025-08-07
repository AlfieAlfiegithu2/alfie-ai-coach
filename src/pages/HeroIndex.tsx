import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, BookOpen, Headphones, PenTool, Mic, Users, Target, Zap, Star, Globe, Sparkles, Award, TrendingUp, Shield, Clock, Brain, MessageSquare, ChevronRight, Volume2, BarChart3, FileText, Languages } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import MinimalisticChatbot from "@/components/MinimalisticChatbot";
import VideoBackground from "@/components/animations/VideoBackground";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { TypewriterText } from "@/components/TypewriterText";
const HeroIndex = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [showWritingFeedback, setShowWritingFeedback] = useState(false);
  const [showSpeakingFeedback, setShowSpeakingFeedback] = useState(false);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  const testimonials = [
    {
      name: "Sarah C.",
      score: "6.5 → 7.5",
      initials: "SC",
      gradient: "from-green-400 to-blue-500",
      quote: "The AI feedback on my Task 2 essay helped me jump from a 6.5 to a 7.5 in just 2 months!"
    },
    {
      name: "Ahmed H.",
      score: "PTE: 79 → 85",
      initials: "AH",
      gradient: "from-purple-400 to-pink-500",
      quote: "I finally found a study partner in the community. It made all the difference - I didn't feel alone anymore."
    },
    {
      name: "Maria R.",
      score: "TOEFL: 95 → 108",
      initials: "MR",
      gradient: "from-orange-400 to-red-500",
      quote: "The personalized study plan was a game-changer. It showed me exactly what to focus on each week."
    }
  ];

  // Auto-carousel for testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);
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
    path: "/ielts-portal"
  }, {
    title: "PTE Academic",
    description: "Pearson Test of English Academic",
    path: "/pte-portal"
  }, {
    title: "TOEFL iBT",
    description: "Test of English as a Foreign Language",
    path: "/toefl-portal"
  }, {
    title: "General English",
    description: "Improve your everyday English fluency",
    path: "/general-portal"
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
      <section id="tests" className="relative z-10 px-8 py-20 opacity-0 animate-fade-in [animation-delay:200ms] [animation-fill-mode:forwards]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl mb-12 text-center font-light text-zinc-950">
            Choose Your Test Preparation
          </h2>
          {/* Test Cards Grid - Smaller, More Approachable */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {testTypes.map((test, index) => (
              <Card 
                key={index} 
                className="bg-white/10 border-white/20 backdrop-blur-xl hover:bg-white/15 transition-all cursor-pointer group shadow-lg hover:shadow-2xl hover:scale-105 duration-300 h-32 flex flex-col justify-center" 
                onClick={() => navigate(test.path)}
              >
                <CardContent className="p-4 text-center">
                  <h3 className="text-zinc-950 font-medium text-lg mb-1">
                    {test.title}
                  </h3>
                  <p className="text-zinc-700 text-xs leading-tight">
                    {test.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 px-8 py-20 opacity-0 animate-fade-in [animation-delay:400ms] [animation-fill-mode:forwards]">
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
                  <div className="mb-4 p-3 bg-white/20 rounded-full w-fit mx-auto">
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
      <section className="relative z-10 px-8 py-20 opacity-0 animate-fade-in [animation-delay:600ms] [animation-fill-mode:forwards]">
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

      {/* AI Examiner Showcase Section */}
      <section className="relative z-10 px-8 py-20 opacity-0 animate-fade-in [animation-delay:800ms] [animation-fill-mode:forwards]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl mb-4 text-center font-light text-zinc-950">
            Go Beyond Practice. Get Personal Feedback.
          </h2>
          <p className="text-center text-zinc-700 mb-16 max-w-2xl mx-auto">
            Experience our AI-powered feedback system that provides detailed, personalized insights to help you improve faster.
          </p>
          
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Writing Feedback Column */}
            <div className="space-y-6">
              <h3 className="text-2xl font-light text-zinc-950 mb-6">Writing Examiner</h3>
              
              {/* Writing Examiner Photo Placeholder */}
              <Card className="bg-white/10 border-white/20 backdrop-blur-xl p-6">
                <div className="bg-white/20 rounded-lg p-8 text-center">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-zinc-600 opacity-50" />
                  <p className="text-zinc-700 text-sm">
                    Writing Examiner screenshot will be displayed here
                  </p>
                </div>
              </Card>
            </div>
            
            {/* Speaking Feedback Column */}
            <div className="space-y-6">
              <h3 className="text-2xl font-light text-zinc-950 mb-6">Speaking Examiner</h3>
              
              {/* Speaking Examiner Photo Placeholder */}
              <Card className="bg-white/10 border-white/20 backdrop-blur-xl p-6">
                <div className="bg-white/20 rounded-lg p-8 text-center">
                  <Mic className="w-16 h-16 mx-auto mb-4 text-zinc-600 opacity-50" />
                  <p className="text-zinc-700 text-sm">
                    Speaking Examiner screenshot will be displayed here
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Vibrant Community Showcase Section */}
      <section className="relative z-10 px-8 py-20 opacity-0 animate-fade-in [animation-delay:1000ms] [animation-fill-mode:forwards]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl mb-4 text-center font-light text-zinc-950">
            Never Study Alone
          </h2>
          <p className="text-center text-zinc-700 mb-16 max-w-2xl mx-auto">
            Join a vibrant community of learners from around the world. Share experiences, get support, and celebrate achievements together.
          </p>
          
          <div className="relative">
            {/* Community Image Background - Placeholder */}
            <div className="relative h-96 rounded-2xl overflow-hidden">
              <div className="w-full h-full bg-white/20 flex items-center justify-center">
                <div className="text-center">
                  <Users className="w-24 h-24 mx-auto mb-4 text-zinc-600 opacity-50" />
                  <p className="text-zinc-700 text-lg">
                    Community image will be displayed here
                  </p>
                </div>
              </div>
              
              {/* Overlay Testimonials - Auto Carousel */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full max-w-md mx-auto p-8">
                  <Card className="bg-white/10 border-white/20 backdrop-blur-xl p-6 transform transition-all duration-1000 ease-in-out">
                    <CardContent className="p-0">
                      <div className="flex items-center mb-4">
                        <div className={`w-12 h-12 bg-gradient-to-br ${testimonials[currentTestimonial].gradient} rounded-full flex items-center justify-center mr-4`}>
                          <span className="text-white text-lg font-bold">{testimonials[currentTestimonial].initials}</span>
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-zinc-900">{testimonials[currentTestimonial].name}</p>
                          <p className="text-sm text-zinc-700">{testimonials[currentTestimonial].score}</p>
                        </div>
                      </div>
                      <p className="text-zinc-800 italic text-lg leading-relaxed">
                        "{testimonials[currentTestimonial].quote}"
                      </p>
                      
                      {/* Carousel Indicators */}
                      <div className="flex justify-center mt-6 space-x-2">
                        {testimonials.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentTestimonial(index)}
                            className={`w-2 h-2 rounded-full transition-all duration-300 ${
                              index === currentTestimonial ? 'bg-white' : 'bg-white/40'
                            }`}
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Personalized Learning Hub Showcase Section */}
      <section className="relative z-10 px-8 py-20 opacity-0 animate-fade-in [animation-delay:1200ms] [animation-fill-mode:forwards]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl mb-4 text-center font-light text-zinc-950">
            Your Personal Path to Success
          </h2>
          <p className="text-center text-zinc-700 mb-16 max-w-2xl mx-auto">
            Every learner is unique. Our AI creates a personalized learning experience tailored to your goals, strengths, and areas for improvement.
          </p>
          
          <div className="grid lg:grid-cols-3 gap-8">
            {/* My Dashboard Card */}
            <Card className="bg-white/10 border-white/20 backdrop-blur-xl hover:bg-white/15 transition-all duration-300 hover:scale-105">
              <CardHeader className="text-center">
                <div className="mb-4 p-3 bg-white/10 rounded-full w-fit mx-auto">
                  <BarChart3 className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-zinc-950 font-normal text-xl">
                  My Dashboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-white/10 rounded-lg p-6 text-center">
                  <div className="text-zinc-700 mb-4">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  </div>
                  <p className="text-sm text-zinc-700">
                    Dashboard preview will be shown here once you upload the image.
                  </p>
                </div>
              </CardContent>
            </Card>
            
            {/* My Word Book Card */}
            <Card className="bg-white/10 border-white/20 backdrop-blur-xl hover:bg-white/15 transition-all duration-300 hover:scale-105">
              <CardHeader className="text-center">
                <div className="mb-4 p-3 bg-white/20 rounded-full w-fit mx-auto">
                  <Languages className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-zinc-950 font-normal text-xl">
                  My Word Book
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-white/20 rounded-lg p-6 text-center">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-zinc-600 opacity-50" />
                  <p className="text-sm text-zinc-700">
                    Word Book screenshot will be displayed here
                  </p>
                </div>
              </CardContent>
            </Card>
            
            {/* AI Study Plan Card */}
            <Card className="bg-white/10 border-white/20 backdrop-blur-xl hover:bg-white/15 transition-all duration-300 hover:scale-105">
              <CardHeader className="text-center">
                <div className="mb-4 p-3 bg-white/20 rounded-full w-fit mx-auto">
                  <Brain className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-zinc-950 font-normal text-xl">
                  AI Study Plan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Current Week Focus */}
                  <div className="bg-white/20 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-zinc-900 mb-2">This Week's Focus</h4>
                    <p className="text-sm text-zinc-700 mb-3">Improve Coherence & Cohesion</p>
                    <div className="space-y-2">
                      <div className="flex items-center text-xs text-zinc-700">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                        Practice linking words (30 min)
                      </div>
                      <div className="flex items-center text-xs text-zinc-700">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                        Complete 2 Task 2 essays
                      </div>
                      <div className="flex items-center text-xs text-zinc-700">
                        <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                        Review paragraph structure
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <Badge className="bg-purple-500/20 text-purple-800 border-purple-500/30">
                      Personalized for You
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
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
          }].map((group, index) => <Card key={index} className="bg-white/10 border-white/20 backdrop-blur-xl hover:bg-white/15 transition-all duration-300 hover:scale-105">
                <CardContent className="pt-6 text-center">
                  
                  <h3 className="mb-2 text-zinc-950 font-light text-sm">{group.title}</h3>
                  <p className="text-sm text-zinc-950 font-extralight">{group.members} members</p>
                </CardContent>
              </Card>)}
          </div>

          <Button size="lg" onClick={() => navigate('/community')} className="bg-white/10 text-white border border-white/20 hover:bg-white/15 px-8 py-4 text-lg transition-all duration-300">
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