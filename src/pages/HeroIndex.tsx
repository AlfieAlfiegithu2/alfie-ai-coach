import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, BookOpen, Headphones, PenTool, Mic, Users, Target, Zap, Star, Globe, Sparkles, Award, TrendingUp, Shield, Clock, Brain, MessageSquare, ChevronRight, Volume2, BarChart3, FileText, Languages, Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import MinimalisticChatbot from "@/components/MinimalisticChatbot";
import VideoBackground from "@/components/animations/VideoBackground";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { TypewriterText } from "@/components/TypewriterText";
import LiveTime from "@/components/LiveTime";
const HeroIndex = () => {
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const [user, setUser] = useState<any>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [showWritingFeedback, setShowWritingFeedback] = useState(false);
  const [showSpeakingFeedback, setShowSpeakingFeedback] = useState(false);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const testimonials = [{
    name: "Sarah C.",
    score: "6.5 → 7.5",
    initials: "SC",
    gradient: "from-green-400 to-blue-500",
    quote: "The AI feedback on my Task 2 essay helped me jump from a 6.5 to a 7.5 in just 2 months!"
  }, {
    name: "Ahmed H.",
    score: "PTE: 79 → 85",
    initials: "AH",
    gradient: "from-purple-400 to-pink-500",
    quote: "I finally found a study partner in the community. It made all the difference - I didn't feel alone anymore."
  }, {
    name: "Maria R.",
    score: "TOEFL: 95 → 108",
    initials: "MR",
    gradient: "from-orange-400 to-red-500",
    quote: "The personalized study plan was a game-changer. It showed me exactly what to focus on each week."
  }];

  // Auto-carousel for testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial(prev => (prev + 1) % testimonials.length);
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
        <img src="/lovable-uploads/c25cc620-ab6d-47a4-9dc6-32d1f6264773.png" alt="Background" className="absolute inset-0 w-full h-full object-cover" />
      </div>

      {/* Background layers */}
      <div className="fixed inset-0 -z-10">
        {/* subtle dots */}
        <div className="absolute inset-0 opacity-[0.35] bg-[radial-gradient(#101010_1px,transparent_1px)] [background-size:16px_16px]"></div>
        {/* grid lines */}
        <div className="absolute inset-0 opacity-[0.22] bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:120px_1px,1px_120px]"></div>
        {/* vignette */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60"></div>
      </div>

      {/* Header */}
      <header className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs sm:text-sm tracking-tight text-neutral-300">ONLINE/ <LiveTime /></span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-neutral-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <circle cx="12" cy="9" r="1"></circle>
              <circle cx="19" cy="9" r="1"></circle>
              <circle cx="5" cy="9" r="1"></circle>
              <circle cx="12" cy="15" r="1"></circle>
              <circle cx="19" cy="15" r="1"></circle>
              <circle cx="5" cy="15" r="1"></circle>
            </svg>
          </div>
          <button onClick={() => navigate('/auth')} className="group inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium tracking-tight text-white bg-white/5 hover:bg-white/10 ring-1 ring-white/10">
            <span>Get Started</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 transition-transform group-hover:translate-x-0.5">
              <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"></path>
              <path d="m21.854 2.147-10.94 10.939"></path>
            </svg>
          </button>
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
            {testTypes.map((test, index) => <Card key={index} className="bg-white/10 border border-white/20 backdrop-blur-xl hover:bg-white/15 transition-all cursor-pointer group shadow-lg hover:shadow-2xl hover:scale-105 duration-300 h-32 flex flex-col justify-center" onClick={() => navigate(test.path)}>
                <CardContent className="p-4 text-center">
                  <h3 className="text-zinc-950 font-medium text-lg mb-1">
                    {test.title}
                  </h3>
                  <p className="text-zinc-700 text-xs leading-tight">
                    {test.description}
                  </p>
                </CardContent>
              </Card>)}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="max-w-7xl mx-auto px-4 sm:px-6 mt-14 sm:mt-20 relative z-10">
        <div className="rounded-2xl ring-1 ring-white/10 overflow-hidden bg-white/5">
          <div className="flex items-end justify-between p-6 border-b border-white/10">
            <h2 className="text-2xl sm:text-3xl tracking-tight font-semibold text-white">Platform Overview</h2>
            <p className="hidden sm:block text-xs text-neutral-400">Features, stats, achievements</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12">
            {/* Service Info */}
            <div className="p-6 md:col-span-3 border-b md:border-b-0 md:border-r border-white/10">
              <p className="text-sm text-neutral-400">AI-Powered Learning</p>
              <p className="mt-1 text-lg font-medium tracking-tight text-white">IELTS Master AI</p>
              <div className="mt-4 flex items-center gap-2 text-xs text-neutral-400">
                <Globe className="w-4 h-4" />
                <span>Global Access • 24/7 Available</span>
              </div>
            </div>

            {/* Feature Image */}
            <div className="relative md:col-span-6 md:row-span-2 border-b md:border-b-0 md:border-r border-white/10">
              <div className="relative aspect-[16/10] md:aspect-[9/10] lg:aspect-[16/10]">
                <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <div className="w-20 h-20 mx-auto bg-white/10 rounded-full flex items-center justify-center">
                      <Brain className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-white font-semibold text-xl">AI Learning Engine</h3>
                    <p className="text-neutral-300 text-sm px-4">Personalized feedback and adaptive learning paths</p>
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-transparent pointer-events-none"></div>

                {/* Overlay stats */}
                <div className="hidden md:block absolute inset-0 pointer-events-none">
                  <div className="absolute top-5 right-5 rounded-xl bg-black/45 ring-1 ring-white/10 backdrop-blur-sm p-4">
                    <div className="text-2xl lg:text-3xl font-semibold tracking-tight text-white">50K+</div>
                    <p className="text-[11px] text-neutral-300 mt-0.5">Active Students</p>
                  </div>
                  <div className="absolute bottom-5 left-5 rounded-xl bg-black/45 ring-1 ring-white/10 backdrop-blur-sm p-4">
                    <div className="text-2xl lg:text-3xl font-semibold tracking-tight text-white">95%</div>
                    <p className="text-[11px] text-neutral-300 mt-0.5">Success Rate</p>
                  </div>
                  <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-xl bg-black/45 ring-1 ring-white/10 backdrop-blur-sm p-4">
                    <div className="text-2xl lg:text-3xl font-semibold tracking-tight text-white">4</div>
                    <p className="text-[11px] text-neutral-300 mt-0.5">Test Types</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right stat (top) */}
            <div className="p-6 md:col-span-3 border-b md:border-b-0">
              <div className="text-3xl font-semibold tracking-tight text-white">1000+</div>
              <p className="text-xs text-neutral-400 mt-1">Practice Tests</p>
            </div>

            {/* Bio (bottom-left) */}
            <div className="p-6 md:col-span-3 border-t md:border-t border-white/10 md:border-r">
              <p className="text-sm text-neutral-300 leading-relaxed">
                Master IELTS, PTE, TOEFL, and General English with our AI-powered platform. Get personalized feedback, track progress, and achieve your target scores faster.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium tracking-tight text-white bg-white/10 hover:bg-white/20 rounded-full px-3 py-1.5 ring-1 ring-white/10 cursor-pointer" onClick={() => navigate('/auth')}>
                <FileText className="w-4 h-4" />
                <span>Start Free Trial</span>
              </div>
            </div>

            {/* Right stat (bottom) */}
            <div className="p-6 md:col-span-3 border-t border-white/10">
              <div className="text-3xl font-semibold tracking-tight text-white">24/7</div>
              <p className="text-xs text-neutral-400 mt-1">AI Support</p>
            </div>
          </div>

          {/* Mobile stats */}
          <div className="md:hidden border-t border-white/10 grid grid-cols-3">
            <div className="p-4 text-center border-r border-white/10">
              <div className="text-xl font-semibold tracking-tight text-white">50K+</div>
              <p className="text-[11px] text-neutral-400 mt-0.5">Students</p>
            </div>
            <div className="p-4 text-center border-r border-white/10">
              <div className="text-xl font-semibold tracking-tight text-white">95%</div>
              <p className="text-[11px] text-neutral-400 mt-0.5">Success</p>
            </div>
            <div className="p-4 text-center">
              <div className="text-xl font-semibold tracking-tight text-white">4</div>
              <p className="text-[11px] text-neutral-400 mt-0.5">Tests</p>
            </div>
          </div>
        </div>
      </section>

      {/* Success Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 mt-14 sm:mt-20 relative z-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl sm:text-2xl tracking-tight font-semibold text-white">Student Achievements</h2>
          <a href="/community" className="text-sm text-neutral-300 hover:text-white inline-flex items-center gap-2">
            <span>View all</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M7 7h10v10"></path>
              <path d="M7 17 17 7"></path>
            </svg>
          </a>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Achievement Card 1 */}
          <article className="group rounded-xl overflow-hidden ring-1 ring-white/10 bg-white/5">
            <div className="relative aspect-[16/10]">
              <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-emerald-500/20 to-blue-500/20 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl font-bold text-white mb-2">8.5</div>
                  <div className="text-sm text-neutral-300">IELTS Overall</div>
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2 text-xs text-neutral-400">
                <Trophy className="w-4 h-4" />
                <span>IELTS Success</span>
              </div>
              <h3 className="mt-2 text-base font-semibold tracking-tight text-white">Sarah C. Achievement</h3>
              <p className="mt-1 text-sm text-neutral-400">"AI feedback helped me improve by 2 bands in writing!"</p>
            </div>
          </article>

          {/* Achievement Card 2 */}
          <article className="group rounded-xl overflow-hidden ring-1 ring-white/10 bg-white/5">
            <div className="relative aspect-[16/10]">
              <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl font-bold text-white mb-2">85</div>
                  <div className="text-sm text-neutral-300">PTE Overall</div>
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2 text-xs text-neutral-400">
                <Star className="w-4 h-4" />
                <span>PTE Excellence</span>
              </div>
              <h3 className="mt-2 text-base font-semibold tracking-tight text-white">Ahmed H. Success</h3>
              <p className="mt-1 text-sm text-neutral-400">"Practice tests were exactly like the real exam!"</p>
            </div>
          </article>

          {/* Achievement Card 3 */}
          <article className="group rounded-xl overflow-hidden ring-1 ring-white/10 bg-white/5">
            <div className="relative aspect-[16/10]">
              <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl font-bold text-white mb-2">108</div>
                  <div className="text-sm text-neutral-300">TOEFL Total</div>
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2 text-xs text-neutral-400">
                <Award className="w-4 h-4" />
                <span>TOEFL Mastery</span>
              </div>
              <h3 className="mt-2 text-base font-semibold tracking-tight text-white">Maria R. Excellence</h3>
              <p className="mt-1 text-sm text-neutral-400">"Personalized study plan was a game-changer!"</p>
            </div>
          </article>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="max-w-7xl mx-auto px-4 sm:px-6 mt-14 sm:mt-20 relative z-10">
        <div className="ring-1 ring-white/10 overflow-hidden bg-white/5 rounded-2xl">
          <div className="flex items-end justify-between p-6 border-b border-white/10">
            <h2 className="text-2xl sm:text-3xl tracking-tight font-semibold text-white">Our Services</h2>
            <div className="hidden sm:flex items-center gap-2">
              <button onClick={() => navigate('/auth')} className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium tracking-tight text-white bg-white/10 hover:bg-white/20 ring-1 ring-white/10">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7,10 12,15 17,10"></polyline>
                  <line x1="12" x2="12" y1="15" y2="3"></line>
                </svg>
                <span>Get Started</span>
              </button>
            </div>
          </div>

          {/* Service 1 - AI Practice Tests */}
          <div className="p-6 sm:p-8 border-b border-white/10">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              <div className="md:col-span-1">
                <div className="text-3xl sm:text-4xl font-medium tracking-tight text-white/70 tabular-nums">1</div>
              </div>
              <div className="md:col-span-8">
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-neutral-300">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 mt-0.5 text-emerald-400">
                      <polyline points="20,6 9,17 4,12"></polyline>
                    </svg>
                    <span>IELTS, PTE, TOEFL Practice Tests</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-neutral-300">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 mt-0.5 text-emerald-400">
                      <polyline points="20,6 9,17 4,12"></polyline>
                    </svg>
                    <span>Real-time Scoring & Analytics</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-neutral-300">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 mt-0.5 text-emerald-400">
                      <polyline points="20,6 9,17 4,12"></polyline>
                    </svg>
                    <span>Authentic Test Materials</span>
                  </li>
                </ul>

                <div className="mt-4 flex items-center gap-3">
                  <div className="aspect-[4/3] w-24 sm:w-28 rounded-md overflow-hidden ring-1 ring-white/10">
                    <div className="w-full h-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                      <BookOpen className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <div className="aspect-[4/3] w-24 sm:w-28 rounded-md overflow-hidden ring-1 ring-white/10">
                    <div className="w-full h-full bg-gradient-to-br from-green-500/20 to-blue-500/20 flex items-center justify-center">
                      <BarChart3 className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <div className="aspect-[4/3] w-24 sm:w-28 rounded-md overflow-hidden ring-1 ring-white/10">
                    <div className="w-full h-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                      <Target className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="md:col-span-3 md:text-right">
                <h3 className="text-lg sm:text-xl tracking-tight font-semibold text-white">AI Practice Tests</h3>
                <p className="text-xs text-neutral-400 mt-1">Comprehensive test preparation</p>
              </div>
            </div>
          </div>

          {/* Service 2 - AI Feedback */}
          <div className="p-6 sm:p-8 border-b border-white/10">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              <div className="md:col-span-1">
                <div className="text-3xl sm:text-4xl font-medium tracking-tight text-white/70 tabular-nums">2</div>
              </div>
              <div className="md:col-span-8">
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-neutral-300">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 mt-0.5 text-emerald-400">
                      <polyline points="20,6 9,17 4,12"></polyline>
                    </svg>
                    <span>Writing & Speaking Analysis</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-neutral-300">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 mt-0.5 text-emerald-400">
                      <polyline points="20,6 9,17 4,12"></polyline>
                    </svg>
                    <span>Personalized Improvement Tips</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-neutral-300">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 mt-0.5 text-emerald-400">
                      <polyline points="20,6 9,17 4,12"></polyline>
                    </svg>
                    <span>Band Score Predictions</span>
                  </li>
                </ul>

                <div className="mt-4 flex items-center gap-3">
                  <div className="aspect-[16/10] w-28 sm:w-32 rounded-md overflow-hidden ring-1 ring-white/10">
                    <div className="w-full h-full bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center">
                      <FileText className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <div className="aspect-[16/10] w-28 sm:w-32 rounded-md overflow-hidden ring-1 ring-white/10">
                    <div className="w-full h-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                      <Mic className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="md:col-span-3 md:text-right">
                <h3 className="text-lg sm:text-xl tracking-tight font-semibold text-white">AI Feedback System</h3>
                <p className="text-xs text-neutral-400 mt-1">Instant detailed analysis</p>
              </div>
            </div>
          </div>

          {/* Service 3 - Study Platform */}
          <div className="p-6 sm:p-8">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              <div className="md:col-span-1">
                <div className="text-3xl sm:text-4xl font-medium tracking-tight text-white/70 tabular-nums">3</div>
              </div>
              <div className="md:col-span-8">
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-neutral-300">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 mt-0.5 text-emerald-400">
                      <polyline points="20,6 9,17 4,12"></polyline>
                    </svg>
                    <span>Personalized Study Plans</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-neutral-300">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 mt-0.5 text-emerald-400">
                      <polyline points="20,6 9,17 4,12"></polyline>
                    </svg>
                    <span>Progress Tracking Dashboard</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-neutral-300">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 mt-0.5 text-emerald-400">
                      <polyline points="20,6 9,17 4,12"></polyline>
                    </svg>
                    <span>Community Support & Forums</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-neutral-300">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 mt-0.5 text-emerald-400">
                      <polyline points="20,6 9,17 4,12"></polyline>
                    </svg>
                    <span>24/7 AI Chat Support</span>
                  </li>
                </ul>

                <div className="mt-4 flex items-center gap-3">
                  <div className="aspect-[16/10] w-32 sm:w-40 rounded-md overflow-hidden ring-1 ring-white/10">
                    <div className="w-full h-full bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center">
                      <Brain className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <div className="aspect-[16/10] w-32 sm:w-40 rounded-md overflow-hidden ring-1 ring-white/10">
                    <div className="w-full h-full bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
                      <Users className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="md:col-span-3 md:text-right">
                <h3 className="text-lg sm:text-xl tracking-tight font-semibold text-white">Study Platform</h3>
                <p className="text-xs text-neutral-400 mt-1">Complete learning ecosystem</p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 sm:p-8 border-t border-white/10">
            <p className="text-sm text-neutral-300">Ready to achieve your target score? Start your free trial today.</p>
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/auth')} className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium tracking-tight text-white bg-emerald-500/90 hover:bg-emerald-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M8 2v4"></path>
                  <path d="M16 2v4"></path>
                  <rect width="18" height="18" x="3" y="4" rx="2"></rect>
                  <path d="M3 10h18"></path>
                </svg>
                <span>Start Free Trial</span>
              </button>
              <button onClick={() => navigate('/community')} className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium tracking-tight text-white bg-white/10 hover:bg-white/20 ring-1 ring-white/10">
                <MessageSquare className="w-4 h-4" />
                <span>Join Community</span>
              </button>
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
            <Card className="bg-white/10 border border-white/20 backdrop-blur-xl hover:bg-white/15 transition-all duration-300 hover:scale-105">
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
            <Card className="bg-white/10 border border-white/20 backdrop-blur-xl hover:bg-white/15 transition-all duration-300 hover:scale-105">
              <CardHeader className="text-center">
                <div className="mb-4 p-3 bg-white/10 border border-white/20 backdrop-blur-xl rounded-full w-fit mx-auto">
                  <Languages className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-zinc-950 font-normal text-xl">
                  My Word Book
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-white/10 border border-white/20 backdrop-blur-xl rounded-lg p-6 text-center">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-zinc-600 opacity-50" />
                  <p className="text-sm text-zinc-700">
                    Word Book screenshot will be displayed here
                  </p>
                </div>
              </CardContent>
            </Card>
            
            {/* AI Study Plan Card */}
            <Card className="bg-white/10 border border-white/20 backdrop-blur-xl hover:bg-white/15 transition-all duration-300 hover:scale-105">
              <CardHeader className="text-center">
                <div className="mb-4 p-3 bg-white/10 border border-white/20 backdrop-blur-xl rounded-full w-fit mx-auto">
                  <Brain className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-zinc-950 font-normal text-xl">
                  AI Study Plan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Current Week Focus */}
                  <div className="bg-white/10 border border-white/20 backdrop-blur-xl rounded-lg p-4">
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

          <Button size="lg" onClick={() => navigate('/community')} className="bg-white/10 border border-white/20 backdrop-blur-xl text-white hover:bg-white/15 px-8 py-4 text-lg transition-all duration-300">
            <Users className="w-5 h-5 mr-2" />
            Explore Community
          </Button>
        </div>
      </section>

      {/* Admin Access CTA */}
      <section className="relative z-10 px-8 py-12 opacity-0 animate-fade-in [animation-delay:1400ms] [animation-fill-mode:forwards]">
        <div className="max-w-3xl mx-auto">
          <Card className="bg-white/10 border border-white/20 backdrop-blur-xl">
            <CardContent className="p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="text-2xl font-light text-zinc-950 mb-1">Admin Access</h3>
                <p className="text-sm text-zinc-700">Manage tests, content, and analytics in the secure admin panel.</p>
              </div>
              <Button onClick={() => navigate('/admin/login')} className="bg-white/10 border border-white/20 backdrop-blur-xl text-white hover:bg-white/15">
                <Shield className="w-4 h-4 mr-2" />
                Go to Admin
              </Button>
            </CardContent>
          </Card>
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