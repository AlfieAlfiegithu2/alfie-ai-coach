import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Calendar, Menu, X, Hand, Compass, Baby, GraduationCap, Shield, HeartHandshake, Rainbow, Puzzle, Rocket, Check, MessageCircle, DoorOpen, MapPin, Send, Mail, Instagram, Facebook, Twitter, Map, ArrowRight, BookOpen, Headphones, PenTool, Mic, Volume2, FileText, Target, Star, Brain, Trophy, Languages, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import MinimalisticChatbot from "@/components/MinimalisticChatbot";
import LanguageSelector from "@/components/LanguageSelector";
import { usePageTranslation, PageContent } from "@/hooks/usePageTranslation";
import { PricingCard } from "@/components/PricingCard";
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
          badge: "All levels",
          title: "IELTS Mastery",
          description: "Complete IELTS preparation with AI feedback",
          learnMore: "Learn More"
        },
        general: {
          badge: "Beginner to Advanced",
          title: "General English",
          description: "Build confident everyday English skills",
          learnMore: "Learn More"
        },
        speaking: {
          badge: "All levels",
          title: "Speaking Practice",
          description: "AI-powered pronunciation and fluency training",
          learnMore: "Learn More"
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
        priceMonthly: "$29",
        price3Months: "$26",
        price6Months: "$20",
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
    switch (selectedDiscount) {
      case '3months':
        return getText(['pricing', 'pro', 'price3Months']);
      case '6months':
        return getText(['pricing', 'pro', 'price6Months']);
      default:
        return getText(['pricing', 'pro', 'priceMonthly']);
    }
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
  const testimonials = [{
    name: "Sarah Chen",
    role: "IELTS Student",
    quote: "The AI feedback helped me improve from 6.5 to 8.0 in just 3 months. Incredible platform!",
    avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face"
  }, {
    name: "Ahmed Hassan",
    role: "Professional English Learner",
    quote: "Real-time feedback and community support made all the difference in my learning journey.",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"
  }, {
    name: "Maria Rodriguez",
    role: "General English Student",
    quote: "The personalized study plans are amazing. I finally feel confident speaking English.",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face"
  }];
  return <div className="min-h-screen antialiased text-black bg-neutral-50" style={{
    fontFamily: "'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'"
  }}>
      {/* Header */}
      <header className="fixed z-50 top-0 right-0 left-0">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mt-4 rounded-xl border backdrop-blur supports-[backdrop-filter]:bg-white/5 border-black/10 bg-black/5">
            <div className="flex items-center justify-between px-4 py-3">
              {/* Brand */}
              <div className="flex items-center gap-2">

                <span className="text-lg font-semibold font-nunito">{t('header.brand', 'English AIdol')}</span>
              </div>

              {/* Desktop Nav */}
              <nav className="hidden items-center gap-8 md:flex">
                {/* Navigation items removed - keeping only Dashboard and English Aidol */}
              </nav>

              {/* Actions */}
              <div className="hidden md:flex items-center gap-3">
                {/* Language Selector */}
                <LanguageSelector />
                {user ? (
                  <>
                    <button onClick={() => navigate('/dashboard')} className="inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition border-black/10 bg-black/0 text-black/90 hover:bg-black/5 font-nunito">
                      {t('header.dashboard', 'Dashboard')}
                    </button>
                    <button onClick={handleAuthAction} className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition bg-black text-neutral-100 hover:bg-black/90 font-nunito">
                      <Calendar className="h-4 w-4" />
                      {user ? t('header.continueLearning', 'Continue Learning') : t('header.startFreeTrial', 'Start Free Trial')}
                    </button>
                  </>
                ) : (
                  <button onClick={() => navigate('/auth')} className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition bg-black text-neutral-100 hover:bg-black/90 font-nunito">
                    {t('header.signIn', 'Sign In')}
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
                  {/* Language Selector for Mobile */}
                  <div className="mb-2">
                    <LanguageSelector />
                  </div>
                  {/* Mobile navigation items removed - keeping only Dashboard and English Aidol */}
                  <div className="mt-2 flex gap-2">
                    {user ? (
                      <>
                        <button onClick={() => navigate('/dashboard')} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition border-black/10 bg-black/0 text-black/90 hover:bg-black/5 font-nunito">
                          {t('header.dashboard', 'Dashboard')}
                        </button>
                        <button onClick={handleAuthAction} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition bg-black text-neutral-100 hover:bg-black/90 font-nunito">
                          <Calendar className="h-4 w-4" />
                          {user ? t('header.continueLearning', 'Continue') : t('header.startFree', 'Start Free')}
                        </button>
                      </>
                    ) : (
                      <button onClick={() => navigate('/auth')} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition bg-black text-neutral-100 hover:bg-black/90 font-nunito">
                        {t('header.signIn', 'Sign In')}
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

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-8">
            {/* IELTS Mastery Card */}
            <article className="group overflow-hidden bg-black/5 border-black/10 border rounded-2xl shadow-xl backdrop-blur-none">
              <div className="relative overflow-hidden">
                <div className="h-48 w-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center transition duration-500 group-hover:scale-[1.03]">
                  <Trophy className="w-16 h-16 text-black/60" />
                </div>
              </div>
              <div className="pt-6 pr-6 pb-6 pl-6">
                <div className="inline-flex text-[11px] font-medium text-black/80 border-black/10 border rounded-full pt-1 pr-2.5 pb-1 pl-2.5 gap-x-2 gap-y-2 items-center font-nunito">
                  {getText(['programs', 'cards', 'ielts', 'badge'])}
                  <Star className="h-3.5 w-3.5" />
                </div>
                <h3 className="text-xl font-semibold tracking-tight font-nunito mt-3">{getText(['programs', 'cards', 'ielts', 'title'])}</h3>
                <p className="text-sm text-black/70 mt-2 font-nunito">{getText(['programs', 'cards', 'ielts', 'description'])}</p>
                <button onClick={() => navigate('/ielts-portal')} className="inline-flex items-center gap-2 hover:text-black text-sm font-medium text-black/80 mt-4 font-nunito">
                  {getText(['programs', 'cards', 'ielts', 'learnMore'])}
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </button>
              </div>
            </article>

            {/* General English Card */}
            <article className="group overflow-hidden bg-black/5 border-black/10 border rounded-2xl shadow-xl backdrop-blur-none">
              <div className="relative overflow-hidden">
                <div className="h-48 w-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center transition duration-500 group-hover:scale-[1.03]">
                  <Languages className="w-16 h-16 text-black/60" />
                </div>
              </div>
              <div className="pt-6 pr-6 pb-6 pl-6">
                <div className="inline-flex text-[11px] font-medium text-black/80 border-black/10 border rounded-full pt-1 pr-2.5 pb-1 pl-2.5 gap-x-2 gap-y-2 items-center font-nunito">
                  {getText(['programs', 'cards', 'general', 'badge'])}
                  <Star className="h-3.5 w-3.5" />
                </div>
                <h3 className="text-xl font-semibold tracking-tight font-nunito mt-3">{getText(['programs', 'cards', 'general', 'title'])}</h3>
                <p className="text-sm text-black/70 mt-2 font-nunito">{getText(['programs', 'cards', 'general', 'description'])}</p>
                <button onClick={() => navigate('/general-portal')} className="inline-flex items-center gap-2 hover:text-black text-sm font-medium text-black/80 mt-4 font-nunito">
                  {getText(['programs', 'cards', 'general', 'learnMore'])}
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </button>
              </div>
            </article>

            {/* Speaking Practice Card */}
            <article className="group overflow-hidden bg-black/5 border-black/10 border rounded-2xl shadow-xl backdrop-blur-none">
              <div className="relative overflow-hidden">
                <div className="h-48 w-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center transition duration-500 group-hover:scale-[1.03]">
                  <Mic className="w-16 h-16 text-black/60" />
                </div>
              </div>
              <div className="pt-6 pr-6 pb-6 pl-6">
                <div className="inline-flex text-[11px] font-medium text-black/80 border-black/10 border rounded-full pt-1 pr-2.5 pb-1 pl-2.5 gap-x-2 gap-y-2 items-center font-nunito">
                  {getText(['programs', 'cards', 'speaking', 'badge'])}
                  <Star className="h-3.5 w-3.5" />
                </div>
                <h3 className="text-xl font-semibold tracking-tight font-nunito mt-3">{getText(['programs', 'cards', 'speaking', 'title'])}</h3>
                <p className="text-sm text-black/70 mt-2 font-nunito">{getText(['programs', 'cards', 'speaking', 'description'])}</p>
                <button onClick={() => navigate('/speaking')} className="inline-flex items-center gap-2 hover:text-black text-sm font-medium text-black/80 mt-4 font-nunito">
                  {getText(['programs', 'cards', 'speaking', 'learnMore'])}
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </button>
              </div>
            </article>
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
              onButtonClick={handleAuthAction}
              isPopular
              isPremium
              badge={getText(['pricing', 'pro', 'badge'])}
            />
          </div>
        </div>
      </section>

      {/* Stories / Testimonials */}
      <section className="sm:py-20 pt-16 pb-16" id="stories">
        <div className="sm:px-6 lg:px-8 max-w-7xl mr-auto ml-auto pr-4 pl-4">
          <div className="flex items-end justify-between gap-6">
            <div>
              <h2 className="text-3xl sm:text-4xl tracking-tight font-nunito font-semibold">{getText(['testimonials', 'title'])}</h2>
              <p className="mt-2 text-sm text-black/70 font-nunito">{getText(['testimonials', 'subtitle'])}</p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((testimonial, index) => <article key={index} className="rounded-2xl border p-6 border-black/10 bg-black/5">
                <div className="flex items-center gap-3">
                  <img className="h-10 w-10 rounded-full object-cover" src={testimonial.avatar} alt={`${testimonial.name} portrait`} />
                  <div>
                    <div className="text-sm font-semibold tracking-tight font-nunito">{testimonial.name}</div>
                    <div className="text-[11px] text-black/60 font-nunito">{testimonial.role}</div>
                  </div>
                </div>
                <p className="mt-4 text-sm text-black/80 font-nunito">"{testimonial.quote}"</p>
              </article>)}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="pb-20" id="contact">
        <div className="sm:px-6 lg:px-8 max-w-7xl mr-auto ml-auto pr-4 pl-4">
          <div className="overflow-hidden bg-zinc-50 border-black/10 border rounded-2xl shadow-[0_2.8px_2.2px_rgba(0,_0,_0,_0.034),_0_6.7px_5.3px_rgba(0,_0,_0,_0.048),_0_12.5px_10px_rgba(0,_0,_0,_0.06),_0_22.3px_17.9px_rgba(0,_0,_0,_0.072),_0_41.8px_33.4px_rgba(0,_0,_0,_0.086),_0_100px_80px_rgba(0,_0,_0,_0.12)]">
            <div className="grid md:grid-cols-2">
              <div className="sm:p-10 pt-8 pr-8 pb-8 pl-8">
                <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium backdrop-blur border-black/10 bg-black/5 text-black/80 font-nunito">
                  <MapPin className="h-3.5 w-3.5" />
                  {getText(['cta', 'badge'])}
                </div>
                <h3 className="mt-4 text-2xl sm:text-3xl tracking-tight font-nunito font-semibold">{getText(['cta', 'title'])}</h3>
                <p className="mt-2 text-sm text-black/70 font-nunito">{getText(['cta', 'subtitle'])}</p>

                <div className="mt-6 space-y-4">
                  <button onClick={handleAuthAction} className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition bg-black text-neutral-100 hover:bg-black/90 font-nunito">
                    <Send className="h-4 w-4" />
                    {getText(['cta', 'startTrial'])}
                  </button>
                  <button onClick={() => navigate('/ielts-portal')} className="w-full inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition border-black/10 bg-black/0 text-black/90 hover:bg-black/5 font-nunito">
                    <FileText className="h-4 w-4" />
                    {getText(['cta', 'tryTest'])}
                  </button>
                </div>
                <p className="mt-3 text-[11px] text-black/60 font-nunito">{getText(['cta', 'note'])}</p>
              </div>
              <div className="relative">
                <div className="w-full h-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center min-h-[300px]">
                  <div className="text-center">
                    <Trophy className="w-20 h-20 mx-auto text-black/40 mb-4" />
                    <h4 className="text-xl font-semibold text-black/80 font-nunito">{getText(['cta', 'successTitle'])}</h4>
                    <p className="text-sm text-black/60 font-nunito mt-2">{getText(['cta', 'successSubtitle'])}</p>
                  </div>
                </div>
              </div>
            </div>
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
                <li><a className="hover:text-black font-nunito" href="/practice">{getText(['footer', 'resources', 'practice'])}</a></li>
                <li><a className="hover:text-black font-nunito" href="/writing">{getText(['footer', 'resources', 'writing'])}</a></li>
                <li><a className="hover:text-black font-nunito" href="/speaking">{getText(['footer', 'resources', 'speaking'])}</a></li>
                <li><a className="hover:text-black font-nunito" href="/vocabulary">{getText(['footer', 'resources', 'vocabulary'])}</a></li>
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
              <a className="hover:text-black font-nunito" href="/privacy">{getText(['footer', 'privacy'])}</a>
              <a className="hover:text-black font-nunito" href="/terms">{getText(['footer', 'terms'])}</a>
              <a className="hover:text-black font-nunito" href="/support">{getText(['footer', 'support'])}</a>
            </div>
          </div>
        </div>
      </footer>

      {/* AI Chatbot */}
      <MinimalisticChatbot />
    </div>;
};
export default HeroIndex;