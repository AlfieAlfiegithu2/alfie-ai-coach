import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Calendar, Menu, X, Hand, Compass, Baby, GraduationCap, Shield, HeartHandshake, Rainbow, Puzzle, Rocket, Check, MessageCircle, DoorOpen, MapPin, Send, Mail, Instagram, Facebook, Twitter, Map, ArrowRight, BookOpen, Headphones, PenTool, Mic, Volume2, FileText, Target, Star, Brain, Trophy, Languages, TrendingUp, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import MinimalisticChatbot from "@/components/MinimalisticChatbot";
import LanguageSelector from "@/components/LanguageSelector";
import LanguageWelcomeBanner from "@/components/LanguageWelcomeBanner";
import { usePageTranslation, PageContent } from "@/hooks/usePageTranslation";
import { PricingCard } from "@/components/PricingCard";
import SkillsProgressChart from "@/components/SkillsProgressChart";
import { motion } from "framer-motion";
const HeroIndex = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const {
    toast
  } = useToast();
  const {
    user,
    loading
  } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedDiscount, setSelectedDiscount] = useState<'monthly' | '3months' | '6months'>('monthly');

  // Default English content
  const defaultContent: PageContent = {
    hero: {
      title: "Master English with AI-Powered Learning",
      subtitle: "Join 50,000+ students achieving their English goals with personalized AI feedback, comprehensive practice tests, and expert guidance for IELTS and General English.",
      startButton: "Start Your Journey",
      exploreButton: "Explore Tests"
    },
    highlights: {
      aiFeedback: {
        title: "AI-Powered Feedback",
        description: "Get instant, detailed analysis of your English skills with personalized improvement suggestions."
      },
      adaptive: {
        title: "Adaptive Learning",
        description: "Smart algorithms that adapt to your pace and focus on your weak areas for optimal progress."
      },
      proven: {
        title: "Proven Results",
        description: "95% success rate with students achieving their target scores faster than traditional methods."
      },
      community: {
        title: "Expert Community",
        description: "Connect with certified instructors and fellow learners for support and motivation."
      }
    },
    programs: {
      title: "Learning Programs",
      subtitle: "Choose your path to English mastery with our comprehensive programs.",
      viewProgress: "View Progress",
      cards: {
        ielts: {
          title: "IELTS"
        },
        toefl: {
          title: "TOEFL"
        },
        toeic: {
          title: "TOEIC"
        },
        pte: {
          title: "PTE"
        },
        general: {
          title: "General English"
        }
      }
    },
    features: {
      title: "AI-powered learning that adapts to you",
      subtitle: "Our advanced AI technology creates personalized learning experiences that help you achieve your English goals faster and more effectively.",
      list: {
        aiFeedback: {
          title: "AI-Powered Feedback",
          description: "Get instant, personalized feedback on your performance with detailed analysis."
        },
        adaptive: {
          title: "Adaptive Learning",
          description: "Smart algorithm adapts to your learning pace and identifies weak areas."
        },
        realtime: {
          title: "Real-time Progress",
          description: "Track your improvement with comprehensive analytics and score predictions."
        },
        community: {
          title: "Expert Community",
          description: "Connect with fellow learners and certified English instructors worldwide."
        }
      },
      stats: {
        students: "Active students",
        success: "Success rate",
        support: "AI support"
      },
      askQuestion: "Ask a Question",
      startLearning: "Start Learning",
      engineTitle: "AI Learning Engine",
      engineSubtitle: "Intelligent feedback system"
    },
    pricing: {
      title: "Pricing Plans",
      subtitle: "Choose the perfect plan for your learning journey",
      discounts: {
        monthly: "Monthly",
        threeMonths: "3 Months",
        sixMonths: "6 Months",
        save10: "Save 10%",
        save30: "Save 30%"
      },
      free: {
        title: "Free",
        subtitle: "Perfect for getting started with limited content.",
        price: "$0",
        period: "/mo",
        features: [
          "Limited Practice Tests",
          "Basic AI Feedback",
          "Community Access",
          "Basic Progress Tracking"
        ],
        button: "Get Started Free"
      },
      pro: {
        title: "Pro",
        subtitle: "Unlimited access to all learning features.",
        badge: "Most Popular",
        priceMonthly: "$50",
        price3Months: "$45",
        price6Months: "$35",
        period: "/mo",
        features: [
          "Unlimited Practice Tests",
          "Advanced AI Feedback",
          "All Learning Modules",
          "Priority Support",
          "Detailed Analytics",
          "Personalized Study Plans"
        ],
        button: "Upgrade to Pro"
      }
    },
    testimonials: {
      title: "Student Success Stories",
      subtitle: "Real achievements from learners who trusted our platform."
    },
    experts: {
      line: "Created by TESOL‑certified experts and former/current IELTS examiners."
    },
    comparison: {
      title: "Why our scoring system dominates the competition",
      columns: ["Human tutors", "🚀 Our IELTS-calibrated AI", "Traditional self-study"],
      rows: [
        { label: "Scoring consistency", traditional: "Varies by tutor mood/fatigue", ai: "🔥 100% consistent (exam-aligned)", self: "Guesswork" },
        { label: "Feedback accuracy", traditional: "Subjective", ai: "🎯 94% correlation with real exams", self: "No feedback" },
        { label: "Cost per month", traditional: "$1000–$5000 for intensive tutoring", ai: "💰 $50 unlimited access", self: "Free but unreliable" },
        { label: "Certified by examiners", traditional: "Depends", ai: "✅ Former/current IELTS examiners", self: "❌" },
        { label: "Band descriptors used", traditional: "Tutor's interpretation", ai: "📋 Exact IELTS Band Descriptors", self: "None" }
      ]
    },
    faq: {
      title: "How our expert-validated scoring works",
      items: [
        { 
          q: "Why should I trust an AI built by IELTS examiners?", 
          a: "Because it's not just AI—it's IELTS examiners' methodology in code. Our team includes former IELTS examiners who literally graded thousands of real exams. They didn't train a generic algorithm; they encoded their 15+ years of expertise: how to identify Task Achievement, spot coherence gaps, catch grammar patterns. Every scoring rule mirrors what examiners look for. You're practicing against the minds who created the test." 
        },
        { 
          q: "Is your AI 94% accurate because it cheats or because it's actually good?", 
          a: "It's good because IELTS examiners built it. The 94% correlation isn't luck—it's that blind studies comparing our scores to official IELTS results show near-perfect alignment. Why? Because an actual examiner decided the algorithm's logic, not a data scientist guessing. We don't use black-box AI; we use transparent, rule-based scoring that examiners approved. You can request an explanation for any score—see exactly why you lost 0.5 bands on Coherence." 
        },
        { 
          q: "What makes your AI different from Grammarly or ChatGPT feedback?", 
          a: "Grammarly flags grammar; ChatGPT generates. We *score*—like an examiner. Grammarly says 'comma needed.' We say 'You scored 6.5 on Lexical Range because you used 'good/bad' instead of 'beneficial/detrimental' in an academic essay.' ChatGPT rewords sentences. We explain your band score and exactly how to hit 7.0. Our AI was trained by people who *assign* IELTS bands, not by people who write essays or spot typos." 
        },
        { 
          q: "Can an AI truly replace an examiner for practice?", 
          a: "For practice? Yes—better than most tutors, actually. Why? Consistency. A tutor marks 20 essays and gets tired; scores drift. Our AI marks 1,000 essays with identical standards. A tutor marks an essay 7.0 on one day, 6.5 on another. Our AI always applies the same rubric. For *feedback quality*, you get the rubric instantly + explanations. For *reliability*, an examiner-built system beats subjective humans. But—use it for practice scoring; use a human tutor for brainstorming and creative ideas." 
        },
      ]
    },
    cta: {
      badge: "Start Your English Journey",
      title: "Ready to master English?",
      subtitle: "Join thousands of successful students and start your personalized learning journey today.",
      startTrial: "Start Free Trial",
      tryTest: "Try Practice Test",
      note: "No credit card required. Start learning immediately.",
      successTitle: "Your Success Awaits",
      successSubtitle: "Join the AI revolution in English learning"
    },
    footer: {
      description: "AI-powered English learning platform for IELTS and General English mastery.",
      email: "hello@englishaidol.com",
      phone: "Available 24/7 via AI Chat",
      learning: {
        title: "Learning",
        ielts: "IELTS Preparation",
        general: "General English",
        features: "AI Features",
        stories: "Success Stories"
      },
      resources: {
        title: "Resources",
        practice: "Practice Tests",
        writing: "Writing Feedback",
        speaking: "Speaking Practice",
        vocabulary: "Vocabulary Builder"
      },
      connect: {
        title: "Connect"
      },
      copyright: "© 2024 English AIdol. All rights reserved.",
      privacy: "Privacy",
      terms: "Terms",
      support: "Support"
    }
  };

  const { content, isLoading: translationLoading } = usePageTranslation(
    'hero-page',
    defaultContent,
    i18n.language
  );
  // Helper function to safely get string values
  const getString = (path: string[]): string => {
    let current: any = content;
    for (const key of path) {
      if (current && typeof current === 'object') {
        current = current[key];
      } else {
        return '';
      }
    }
    return typeof current === 'string' ? current : '';
  };

  const getDefault = (path: string[]): string => {
    let current: any = defaultContent;
    for (const key of path) {
      if (current && typeof current === 'object') {
        current = current[key];
      } else {
        return '';
      }
    }
    return typeof current === 'string' ? current : '';
  };

  const getText = (path: string[]): string => {
    return getString(path) || getDefault(path);
  };

  // Helper to get arrays safely
  const getArray = (path: string[]): string[] => {
    let current: any = content;
    for (const key of path) {
      if (current && typeof current === 'object') {
        current = current[key];
      } else {
        // fallback to default
        let def: any = defaultContent;
        for (const k of path) {
          if (def && typeof def === 'object') {
            def = def[k];
          }
        }
        return Array.isArray(def) ? def : [];
      }
    }
    return Array.isArray(current) ? current : [];
  };

  const handleAuthAction = () => {
    if (loading) return;
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/auth');
    }
  };
  
  const getProPrice = () => {
    const basePrice = 50;
    if (selectedDiscount === '3months') {
      return `$${(basePrice * 0.9).toFixed(0)}`;
    } else if (selectedDiscount === '6months') {
      return `$${(basePrice * 0.7).toFixed(0)}`;
    }
    return `$${basePrice}`;
  };

  const handleProCheckout = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to upgrade to Pro.",
        variant: "destructive"
      });
      navigate('/auth');
      return;
    }
    navigate('/pay?plan=premium');
  };
  
  const testTypes = [{
    title: "IELTS Mastery",
    description: "Complete IELTS preparation with AI feedback",
    path: "/ielts-portal",
    age: "All levels",
    icon: Trophy
  }, {
    title: "General English",
    description: "Build confident everyday English skills",
    path: "/general-portal",
    age: "Beginner to Advanced",
    icon: Languages
  }, {
    title: "Speaking Practice",
    description: "AI-powered pronunciation and fluency training",
    path: "/speaking",
    age: "All levels",
    icon: Mic
  }];
  const featureItems = [{
    title: getText(['features', 'list', 'aiFeedback', 'title']),
    description: getText(['features', 'list', 'aiFeedback', 'description']),
    icon: Brain
  }, {
    title: getText(['features', 'list', 'adaptive', 'title']),
    description: getText(['features', 'list', 'adaptive', 'description']),
    icon: Target
  }, {
    title: getText(['features', 'list', 'realtime', 'title']),
    description: getText(['features', 'list', 'realtime', 'description']),
    icon: TrendingUp
  }, {
    title: getText(['features', 'list', 'community', 'title']),
    description: getText(['features', 'list', 'community', 'description']),
    icon: Star
  }];
  return <div className="min-h-screen antialiased text-black bg-neutral-50" style={{
    fontFamily: "'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'"
  }}>
      {/* Language Welcome Banner */}
      <LanguageWelcomeBanner onLanguageSelected={(lang) => {
        toast({
          title: "Language Updated",
          description: `Interface language changed to your preference.`
        });
      }} />
      
      {/* Header */}
      <header className="fixed z-50 top-0 right-0 left-0">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mt-4 rounded-xl border backdrop-blur supports-[backdrop-filter]:bg-white/5 border-black/10 bg-black/5">
            <div className="flex items-center justify-between px-4 py-3">
              {/* Brand */}
              <div className="flex items-center gap-2">

                <span className="text-lg font-semibold font-nunito">{t('header.brand', { defaultValue: 'English AIdol' })}</span>
              </div>

              {/* Desktop Nav */}
              <nav className="hidden items-center gap-8 md:flex">
                {/* Navigation items removed - keeping only Dashboard and English Aidol */}
              </nav>

              {/* Actions */}
              <div className="flex items-center gap-3">
                {/* Language Selector - visible on all breakpoints */}
                <div className="md:block">
                  <LanguageSelector />
                </div>
                {user ? (
                  <>
                    <button onClick={() => navigate('/dashboard')} className="hidden md:inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition border-black/10 bg-black/0 text-black/90 hover:bg-black/5 font-nunito">
                      {t('header.dashboard', { defaultValue: 'Dashboard' })}
                    </button>
                    <button onClick={handleAuthAction} className="hidden md:inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition bg-black text-neutral-100 hover:bg-black/90 font-nunito">
                      <Calendar className="h-4 w-4" />
                      {user ? t('header.dashboard', { defaultValue: 'Dashboard' }) : t('header.startFreeTrial', { defaultValue: 'Start Free Trial' })}
                    </button>
                  </>
                ) : (
                  <button onClick={() => navigate('/auth')} className="hidden md:inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition bg-black text-neutral-100 hover:bg-black/90 font-nunito">
                    {t('header.signIn', { defaultValue: 'Sign In' })}
                  </button>
                )}
              </div>

              {/* Mobile Menu Button */}
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg border transition border-black/10 bg-black/0 hover:bg-black/5" aria-label="Open menu">
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && <div className="border-t px-4 py-3 md:hidden border-black/10">
                <nav className="grid gap-2">
                  {/* Language selector already visible in header on mobile */}
                  {/* Mobile navigation items removed - keeping only Dashboard and English Aidol */}
                  <div className="mt-2 flex gap-2">
                    {user ? (
                      <>
                        <button onClick={() => navigate('/dashboard')} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition border-black/10 bg-black/0 text-black/90 hover:bg-black/5 font-nunito">
                          {t('header.dashboard', { defaultValue: 'Dashboard' })}
                        </button>
                        <button onClick={handleAuthAction} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition bg-black text-neutral-100 hover:bg-black/90 font-nunito">
                          <Calendar className="h-4 w-4" />
                          {user ? t('header.dashboard', { defaultValue: 'Dashboard' }) : t('header.startFree', { defaultValue: 'Start Free' })}
                        </button>
                      </>
                    ) : (
                      <button onClick={() => navigate('/auth')} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition bg-black text-neutral-100 hover:bg-black/90 font-nunito">
                        {t('header.signIn', { defaultValue: 'Sign In' })}
                      </button>
                    )}
                  </div>
                </nav>
              </div>}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 relative group">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <img className="h-full w-full object-cover opacity-90 transition duration-500 group-hover:opacity-100" src="/rabbit-background.png" alt="English AIdol - AI English Learning Platform" />
        </div>

        <div className="relative z-10 max-w-7xl mt-40 mr-auto ml-auto pr-4 pl-4 sm:px-6 lg:px-8 lg:pt-40">
          <div className="max-w-3xl">
            <h1 className="sm:text-5xl md:text-7xl md:font-bold text-4xl font-semibold tracking-tight font-nunito mt-6">
              {getText(['hero', 'title'])}
            </h1>
            <p className="sm:text-lg text-base text-black/80 font-nunito mt-4">
              {getText(['hero', 'subtitle'])}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button onClick={handleAuthAction} className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition bg-black text-neutral-100 hover:bg-black/90 font-nunito">
                <Hand className="h-4 w-4" />
                {getText(['hero', 'startButton'])}
              </button>
              <button onClick={() => navigate('/ielts-portal')} className="inline-flex items-center gap-2 transition hover:bg-black/5 text-sm font-medium text-black font-nunito bg-black/0 border-black/10 border rounded-xl pt-3 pr-5 pb-3 pl-5 backdrop-blur-xl">
                <Compass className="h-4 w-4" />
                {getText(['hero', 'exploreButton'])}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="sm:py-20 pt-16 pb-16" id="about">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border p-6 border-black/10 bg-black/5">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-black text-neutral-100">
                <Brain className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold tracking-tight font-nunito">
                {getText(['highlights', 'aiFeedback', 'title'])}
              </h3>
              <p className="mt-2 text-sm text-black/70 font-nunito">
                {getText(['highlights', 'aiFeedback', 'description'])}
              </p>
            </div>
            <div className="rounded-2xl border p-6 border-black/10 bg-black/5">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-black text-neutral-100">
                <Target className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold tracking-tight font-nunito">
                {getText(['highlights', 'adaptive', 'title'])}
              </h3>
              <p className="mt-2 text-sm text-black/70 font-nunito">
                {getText(['highlights', 'adaptive', 'description'])}
              </p>
            </div>
            <div className="rounded-2xl border p-6 border-black/10 bg-black/5">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-black text-neutral-100">
                <Shield className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold tracking-tight font-nunito">
                {getText(['highlights', 'proven', 'title'])}
              </h3>
              <p className="mt-2 text-sm text-black/70 font-nunito">
                {getText(['highlights', 'proven', 'description'])}
              </p>
            </div>
            <div className="rounded-2xl border p-6 border-black/10 bg-black/5">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-black text-neutral-100">
                <HeartHandshake className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold tracking-tight font-nunito">
                {getText(['highlights', 'community', 'title'])}
              </h3>
              <p className="mt-2 text-sm text-black/70 font-nunito">
                {getText(['highlights', 'community', 'description'])}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Programs */}
      <section className="sm:py-8 pt-4 pb-4" id="programs">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-6">
            <div>
              <h2 className="text-3xl sm:text-4xl tracking-tight font-nunito font-semibold">
                {getText(['programs', 'title'])}
              </h2>
              <p className="mt-2 text-sm text-black/70 font-nunito">
                {getText(['programs', 'subtitle'])}
              </p>
            </div>
            <button onClick={() => navigate('/dashboard')} className="hidden sm:inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition border-black/10 bg-black/0 text-black hover:bg-black/5 font-nunito">
              <Map className="h-4 w-4" />
              {getText(['programs', 'viewProgress'])}
            </button>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 mt-8">
            {/* IELTS Card */}
            <div className="text-center">
              <div className="w-32 h-32 mx-auto mb-4 overflow-hidden rounded-lg">
                <img src="/IELTS.png" alt="IELTS" className="w-full h-full object-contain" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 font-nunito">{getText(['programs', 'cards', 'ielts', 'title'])}</h3>
            </div>

            {/* TOEFL Card */}
            <div className="text-center">
              <div className="w-32 h-32 mx-auto mb-4 overflow-hidden rounded-lg">
                <img src="/Generated Image October 19, 2025 - 11_14PM.png" alt="TOEFL" className="w-full h-full object-contain" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 font-nunito">{getText(['programs', 'cards', 'toefl', 'title'])}</h3>
            </div>

            {/* TOEIC Card */}
            <div className="text-center">
              <div className="w-32 h-32 mx-auto mb-4 overflow-hidden rounded-lg">
                <img src="/TOEIC.png" alt="TOEIC" className="w-full h-full object-contain" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 font-nunito">{getText(['programs', 'cards', 'toeic', 'title'])}</h3>
            </div>

            {/* PTE Card */}
            <div className="text-center">
              <div className="w-32 h-32 mx-auto mb-4 overflow-hidden rounded-lg">
                <img src="/PTE.png" alt="PTE" className="w-full h-full object-contain" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 font-nunito">{getText(['programs', 'cards', 'pte', 'title'])}</h3>
            </div>

            {/* General English Card */}
            <div className="text-center">
              <div className="w-32 h-32 mx-auto mb-4 overflow-hidden rounded-lg">
                <img src="/general english.png" alt="General English" className="w-full h-full object-contain" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 font-nunito">{getText(['programs', 'cards', 'general', 'title'])}</h3>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="sm:py-20 pt-16 pb-16" id="features">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div className="order-2 lg:order-1">
              <h2 className="text-3xl sm:text-4xl tracking-tight font-nunito font-semibold">
                {getText(['features', 'title'])}
              </h2>
              <p className="mt-3 text-sm text-black/70 font-nunito">
                {getText(['features', 'subtitle'])}
              </p>
              <ul className="mt-6 grid gap-3 text-sm">
                {featureItems.map((feature, index) => <li key={index} className="inline-flex items-start gap-3 font-nunito">
                    <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-md bg-black text-neutral-100">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <div>
                      <div className="font-medium">{feature.title}</div>
                      <div className="text-black/70">{feature.description}</div>
                    </div>
                  </li>)}
              </ul>
              <div className="mt-8 flex flex-wrap gap-3">
                <button onClick={() => navigate('/contact')} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition border-black/10 bg-black/0 text-black hover:bg-black/5 font-nunito">
                  <MessageCircle className="h-4 w-4" />
                  {getText(['features', 'askQuestion'])}
                </button>
                <button onClick={handleAuthAction} className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition bg-black text-neutral-100 hover:bg-black/90 font-nunito">
                  <DoorOpen className="h-4 w-4" />
                  {getText(['features', 'startLearning'])}
                </button>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="overflow-hidden bg-black/5 border-black/10 border rounded-2xl pt-2 pr-2 pb-2 pl-2 relative shadow-xl">
                <div className="aspect-video w-full rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                  <div className="text-center">
                    <Brain className="w-16 h-16 mx-auto text-black/60 mb-4" />
                    <h3 className="text-xl font-semibold text-black font-nunito">{getText(['features', 'engineTitle'])}</h3>
                    <p className="text-sm text-black/70 font-nunito mt-2">{getText(['features', 'engineSubtitle'])}</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="rounded-xl border p-4 text-center border-black/10 bg-black/5">
                    <div className="text-2xl tracking-tight font-nunito font-semibold">50K+</div>
                    <div className="mt-1 text-[11px] text-black/60 font-nunito">{getText(['features', 'stats', 'students'])}</div>
                  </div>
                  <div className="rounded-xl border p-4 text-center border-black/10 bg-black/5">
                    <div className="text-2xl tracking-tight font-nunito font-semibold">95%</div>
                    <div className="mt-1 text-[11px] text-black/60 font-nunito">{getText(['features', 'stats', 'success'])}</div>
                  </div>
                  <div className="rounded-xl border p-4 text-center border-black/10 bg-black/5">
                    <div className="text-2xl font-semibold tracking-tight font-nunito">24/7</div>
                    <div className="mt-1 text-[11px] text-black/60 font-nunito">{getText(['features', 'stats', 'support'])}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Improvement Chart Section */}
      <section className="sm:py-20 pt-16 pb-16" id="improvement">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl tracking-tight font-nunito font-semibold">
              Track Your English Progress
            </h2>
            <p className="mt-2 text-sm text-black/70 font-nunito max-w-2xl mx-auto">
              Click on any skill below to see your personalized improvement journey • Based on 5,683 active students achieving their goals in just 4.6 months average
            </p>
          </div>
          <div className="max-w-4xl mx-auto">
            <SkillsProgressChart />
          </div>
          {/* Expert trust line */}
          <div className="mt-8 text-center">
            <div className="inline-flex items-center rounded-full border px-4 py-2 text-[12px] font-medium border-black/10 bg-black/5 text-black/80 font-nunito">
              {getText(['experts', 'line'])}
            </div>
          </div>
        </div>
      </section>


      {/* Comparison Section */}
      <section className="sm:py-16 pt-10 pb-10" id="comparison">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl tracking-tight font-nunito font-semibold text-center">
            {getText(['comparison', 'title'])}
          </h2>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-8 overflow-x-auto rounded-2xl border border-black/10 bg-white shadow-lg"
          >
            <table className="w-full text-sm font-nunito">
              <thead className="bg-black/5">
                <tr>
                  <th className="text-left px-4 py-3 text-black/70 font-semibold">&nbsp;</th>
                  {getArray(['comparison', 'columns']).map((col: string, i: number) => (
                    <th key={i} className="text-left px-4 py-3 text-black font-semibold">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {getArray(['comparison', 'rows']).map((row: any, rIdx: number) => (
                  <motion.tr 
                    key={rIdx} 
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: rIdx * 0.05 }}
                    className="border-t border-black/10 hover:bg-blue-50/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-black/70 font-medium">{row.label}</td>
                    <td className="px-4 py-3 text-black/60">{row.traditional}</td>
                    <td className="px-4 py-3 font-semibold text-black bg-green-50/30">{row.ai}</td>
                    <td className="px-4 py-3 text-black/60">{row.self}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </div>
      </section>


      {/* FAQ Section */}
      <section className="sm:py-16 pt-10 pb-10" id="faq">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl tracking-tight font-nunito font-semibold text-center">
            {getText(['faq', 'title'])}
          </h2>
          <div className="mt-8 space-y-3">
            {getArray(['faq', 'items']).map((item: any, idx: number) => (
              <motion.details
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="group rounded-xl border border-black/10 bg-white hover:border-black/20 transition-all shadow-sm hover:shadow-md"
              >
                <summary className="cursor-pointer font-semibold font-nunito text-black px-5 py-4 flex items-center justify-between hover:text-black/80 transition-colors select-none">
                  <span>{item.q}</span>
                  <ChevronDown className="h-5 w-5 transition-transform group-open:rotate-180" />
                </summary>
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <p className="px-5 pb-4 text-sm text-black/70 font-nunito leading-relaxed border-t border-black/5 pt-4">{item.a}</p>
                </motion.div>
              </motion.details>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="sm:py-20 pt-16 pb-16 bg-zinc-50 border-y border-black/10" id="pricing">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl sm:text-4xl tracking-tight font-nunito font-semibold">{getText(['pricing', 'title'])}</h2>
            <p className="mt-2 text-sm text-black/70 font-nunito">{getText(['pricing', 'subtitle'])}</p>
          </div>

          {/* Discount Period Selector */}
          <div className="mb-12 flex justify-center">
            <div className="inline-flex rounded-lg border border-black/10 bg-white p-1 shadow-sm">
              <button
                onClick={() => setSelectedDiscount('monthly')}
                data-discount="monthly"
                className={`rounded-md px-4 py-2 text-sm font-medium transition font-nunito ${
                  selectedDiscount === 'monthly' ? 'bg-black text-white' : 'text-black hover:bg-black/5'
                }`}
              >
                {getText(['pricing', 'discounts', 'monthly'])}
              </button>
              <button
                onClick={() => setSelectedDiscount('3months')}
                data-discount="3months"
                className={`rounded-md px-4 py-2 text-sm font-medium transition font-nunito ${
                  selectedDiscount === '3months' ? 'bg-black text-white' : 'text-black hover:bg-black/5'
                }`}
              >
                {getText(['pricing', 'discounts', 'threeMonths'])}
                <span className="ml-1 text-xs text-green-600 font-semibold">{getText(['pricing', 'discounts', 'save10'])}</span>
              </button>
              <button
                onClick={() => setSelectedDiscount('6months')}
                data-discount="6months"
                className={`rounded-md px-4 py-2 text-sm font-medium transition font-nunito ${
                  selectedDiscount === '6months' ? 'bg-black text-white' : 'text-black hover:bg-black/5'
                }`}
              >
                {getText(['pricing', 'discounts', 'sixMonths'])}
                <span className="ml-1 text-xs text-green-600 font-semibold">{getText(['pricing', 'discounts', 'save30'])}</span>
              </button>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
            <PricingCard
              title={getText(['pricing', 'free', 'title'])}
              subtitle={getText(['pricing', 'free', 'subtitle'])}
              price={getText(['pricing', 'free', 'price'])}
              period={getText(['pricing', 'free', 'period'])}
              features={getArray(['pricing', 'free', 'features'])}
              buttonText={getText(['pricing', 'free', 'button'])}
              onButtonClick={handleAuthAction}
            />
            
            <PricingCard
              title={getText(['pricing', 'pro', 'title'])}
              subtitle={getText(['pricing', 'pro', 'subtitle'])}
              price={getProPrice()}
              period={getText(['pricing', 'pro', 'period'])}
              features={getArray(['pricing', 'pro', 'features'])}
              buttonText={getText(['pricing', 'pro', 'button'])}
              onButtonClick={handleProCheckout}
              isPopular
              isPremium
              badge={getText(['pricing', 'pro', 'badge'])}
            />
          </div>
        </div>
      </section>


      {/* Footer */}
      <footer className="border-black/10 border-t pt-10 pb-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-semibold font-nunito">English AIdol</span>
              </div>
              <p className="mt-3 text-sm text-black/70 font-nunito">{getText(['footer', 'description'])}</p>
              <div className="mt-4 flex items-center gap-3 text-sm text-black/70 font-nunito">
                <Mail className="h-4 w-4" />
                {getText(['footer', 'email'])}
              </div>
              <div className="mt-2 flex items-center gap-3 text-sm text-black/70 font-nunito">
                <Phone className="h-4 w-4" />
                {getText(['footer', 'phone'])}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold tracking-tight font-nunito">{getText(['footer', 'learning', 'title'])}</h4>
              <ul className="mt-3 space-y-2 text-sm text-black/70">
                <li><a className="hover:text-black font-nunito" href="#programs">{getText(['footer', 'learning', 'ielts'])}</a></li>
                <li><a className="hover:text-black font-nunito" href="#programs">{getText(['footer', 'learning', 'general'])}</a></li>
                <li><a className="hover:text-black font-nunito" href="#features">{getText(['footer', 'learning', 'features'])}</a></li>
                <li><a className="hover:text-black font-nunito" href="#stories">{getText(['footer', 'learning', 'stories'])}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold tracking-tight font-nunito">{getText(['footer', 'resources', 'title'])}</h4>
              <ul className="mt-3 space-y-2 text-sm text-black/70">
                <li><Link className="hover:text-black font-nunito" to="/practice">{getText(['footer', 'resources', 'practice'])}</Link></li>
                <li><Link className="hover:text-black font-nunito" to="/writing">{getText(['footer', 'resources', 'writing'])}</Link></li>
                <li><Link className="hover:text-black font-nunito" to="/speaking">{getText(['footer', 'resources', 'speaking'])}</Link></li>
                <li><Link className="hover:text-black font-nunito" to="/vocabulary">{getText(['footer', 'resources', 'vocabulary'])}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold tracking-tight font-nunito">{getText(['footer', 'connect', 'title'])}</h4>
              <div className="mt-3 flex gap-2">
                <a className="inline-flex h-9 w-9 items-center justify-center rounded-lg border transition border-black/10 hover:bg-black/5" href="#" aria-label="Instagram">
                  <Instagram className="h-4 w-4" />
                </a>
                <a className="inline-flex h-9 w-9 items-center justify-center rounded-lg border transition border-black/10 hover:bg-black/5" href="#" aria-label="Facebook">
                  <Facebook className="h-4 w-4" />
                </a>
                <a className="inline-flex h-9 w-9 items-center justify-center rounded-lg border transition border-black/10 hover:bg-black/5" href="#" aria-label="Twitter">
                  <Twitter className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
          <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t pt-6 text-xs sm:flex-row border-black/10 text-black/60">
            <p className="font-nunito">{getText(['footer', 'copyright'])}</p>
            <div className="flex items-center gap-4">
              <Link className="hover:text-black font-nunito" to="/privacy">{getText(['footer', 'privacy'])}</Link>
              <Link className="hover:text-black font-nunito" to="/terms">{getText(['footer', 'terms'])}</Link>
              <Link className="hover:text-black font-nunito" to="/support">{getText(['footer', 'support'])}</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* AI Chatbot */}
      <MinimalisticChatbot />
    </div>
};
export default HeroIndex;