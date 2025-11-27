import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Calendar, Menu, X, Hand, Compass, Baby, GraduationCap, Shield, HeartHandshake, Rainbow, Puzzle, Rocket, Check, MessageCircle, DoorOpen, MapPin, Send, Mail, Instagram, Facebook, Twitter, Map, ArrowRight, BookOpen, Headphones, PenTool, Mic, Volume2, FileText, Target, Star, Brain, Trophy, Languages, TrendingUp, ChevronDown, Minus, AlertCircle } from "lucide-react";
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
import SEO from "@/components/SEO";
import JourneyButton from "@/components/JourneyButton";
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
      subtitle: "Join 50,000+ students achieving their goals across IELTS, TOEFL, PTE, TOEIC, and General English with personalized AI feedback and expert guidance.",
      startButton: "Start Your Journey",
      exploreButton: "Explore All Tests"
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
      title: "Pricing",
      discounts: {
        monthly: "Monthly",
        threeMonths: "3 Months",
        sixMonths: "6 Months",
        save10: "Save 15%",
        save30: "Save 30%"
      },
      free: {
        title: "Explorer",
        subtitle: "Experience the power of AI learning completely risk-free.",
        price: "$0",
        period: "/forever",
        features: [
          "Access to 1 Full Practice Test",
          "Basic AI Scoring & Feedback",
          "Limited Vocabulary Builder",
          "Community Forum Access"
        ],
        button: "Start Free Journey"
      },
      pro: {
        title: "Pro",
        subtitle: "Unlock your full potential with unlimited AI mentorship.",
        badge: "Most Popular",
        priceMonthly: "$49",
        price3Months: "$45",
        price6Months: "$35",
        period: "/mo",
        features: [
          "Unlimited AI Practice Tests",
          "Examiner-Level Detailed Feedback",
          "Advanced Pronunciation Coaching",
          "Writing Style & Tone Analysis",
          "Personalized Study Roadmap",
          "Priority Support Channel"
        ],
        button: "Become a Pro"
      },
      ultra: {
        title: "Ultra",
        subtitle: "The ultimate mentorship package for serious achievers.",
        priceMonthly: "$199",
        price3Months: "$179",
        price6Months: "$159",
        period: "/mo",
        features: [
          "Everything in Pro Plan",
          "1-on-1 Personal Meeting with Developers",
          "All Premium Templates & E-books",
          "Direct Access to New Beta Features"
        ],
        button: "Get Ultra Access"
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
      title: "Why our universal scoring system leads the industry",
      columns: [
        "Human tutors",
        "Our Multi-Exam AI",
        "Traditional self-study"
      ],
      // Store rows as array of JSON strings to satisfy PageContent typing,
      // then parse when rendering.
      rows: [
        "{\"label\":\"Scoring consistency\",\"traditional\":\"Varies by tutor mood/fatigue\",\"ai\":\"100% consistent across IELTS, TOEFL, PTE, TOEIC\",\"self\":\"Guesswork\"}",
        "{\"label\":\"Feedback accuracy\",\"traditional\":\"Subjective\",\"ai\":\"98% correlation with real exam results\",\"self\":\"No feedback\"}",
        "{\"label\":\"Cost per month\",\"traditional\":\"$1000–$5000 for intensive tutoring\",\"ai\":\"$49 unlimited access\",\"self\":\"Free but unreliable\"}",
        "{\"label\":\"Exam coverage\",\"traditional\":\"Specialized tutors needed\",\"ai\":\"IELTS, TOEFL, PTE, TOEIC, General English\",\"self\":\"Fragmented resources\"}",
        "{\"label\":\"Band descriptors used\",\"traditional\":\"Tutor's interpretation\",\"ai\":\"Official Rubrics for Each Exam\",\"self\":\"None\"}"
      ]
    },
    faq: {
      title: "Expert-validated scoring for every major exam",
      // Store items as JSON strings to be parsed at render time.
      items: [
        "{\"q\":\"Does this work for TOEFL, PTE, and TOEIC as well as IELTS?\",\"a\":\"Absolutely. Our AI engine has been trained on thousands of official samples from IELTS, TOEFL, PTE, and TOEIC. It automatically detects which exam you are practicing for and applies the specific scoring rubrics and band descriptors for that test. Whether you need a TOEFL score of 100+, a PTE 79+, or a TOEIC 900+, our feedback is tailored to that exam's unique criteria.\"}",
        "{\"q\":\"How accurate is the scoring for Speaking and Writing?\",\"a\":\"Our scoring correlates 98% with official exam results across all supported tests. This isn't just generic grammar checking; our system evaluates Task Response, Coherence, Lexical Resource, and Pronunciation just like a certified examiner would. We regularly calibrate our AI against real recent exam papers to ensure maximum accuracy.\"}",
        "{\"q\":\"Can I practice General English without preparing for an exam?\",\"a\":\"Yes! Our General English module is perfect for professionals and learners who want to improve their fluency, vocabulary, and confidence without the pressure of a specific test format. You still get the same high-quality AI feedback to track your improvement over time.\"}",
        "{\"q\":\"Is the 'Ultra' plan really worth it?\",\"a\":\"If you are serious about achieving a high score quickly, the Ultra plan offers unparalleled value. The 1-on-1 sessions with our developers allow you to deep-dive into how the AI works and get personalized strategy tips. Plus, lifetime legacy status means you lock in your rate forever, even as we add more advanced features.\"}"
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
    const basePrice = 49;
    if (selectedDiscount === '3months') {
      return `$${45}`;
    } else if (selectedDiscount === '6months') {
      return `$${35}`;
    }
    return `$${basePrice}`;
  };

  const getUltraPrice = () => {
    const basePrice = 199;
    if (selectedDiscount === '3months') {
      return `$${179}`;
    } else if (selectedDiscount === '6months') {
      return `$${159}`;
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
  return <div className="min-h-screen antialiased text-[#3c3c3c] bg-[#f5f2e8]" style={{
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', sans-serif"
  }}>
      <SEO
        title="English AIdol - AI-Powered English Learning Platform | IELTS & General English"
        description="Master English with AI-powered learning. Join 50,000+ students achieving their English goals with personalized AI feedback, comprehensive practice tests, and expert guidance for IELTS and General English. Created by TESOL-certified experts and former IELTS examiners."
        keywords="English learning, IELTS preparation, AI tutor, language learning, speaking practice, writing feedback, vocabulary builder, grammar practice, TOEFL, PTE, TOEIC, English AIdol, AI English tutor, IELTS practice tests, English exam preparation"
        type="website"
        schemaType="organization"
        url="https://englishaidol.com"
      />
      {/* Language Welcome Banner */}
      <LanguageWelcomeBanner onLanguageSelected={(lang) => {
        toast({
          title: "Language Updated",
          description: `Interface language changed to your preference.`
        });
      }} />
      
      {/* Header */}
      <header className="fixed z-50 top-0 right-0 left-0 bg-[#f5f2e8]/80 backdrop-blur-md border-b border-[#e6e0d4]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">

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
                <button onClick={handleAuthAction} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#d97757] text-white font-medium hover:bg-[#c56a4b] transition-colors shadow-sm text-sm">
                  <Calendar className="h-4 w-4" />
                    {user ? t('header.dashboard', { defaultValue: 'Dashboard' }) : t('header.startFreeTrial', { defaultValue: 'Start Free Trial' })}
                </button>
                ) : (
                <button onClick={() => navigate('/auth')} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#d97757] text-white font-medium hover:bg-[#c56a4b] transition-colors shadow-sm text-sm">
                    {t('header.signIn', { defaultValue: 'Sign In' })}
                </button>
                )}
              </div>

              {/* Mobile Menu Button */}
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#e6e0d4]/50 hover:bg-[#e6e0d4] text-[#3c3c3c] transition-colors" aria-label="Open menu">
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>

            {/* Mobile Menu */}
          {mobileMenuOpen && <div className="border-t px-4 py-4 md:hidden border-[#e6e0d4] bg-[#f5f2e8]">
              <nav className="grid gap-4">
                  {/* Language selector already visible in header on mobile */}
                  {/* Mobile navigation items removed - keeping only Dashboard and English Aidol */}
                <div className="flex gap-2">
                    {user ? (
                    <button onClick={handleAuthAction} className="flex-1 inline-flex justify-center items-center gap-2 px-5 py-3 rounded-full bg-[#d97757] text-white font-medium hover:bg-[#c56a4b] transition-colors shadow-sm text-sm">
                      <Calendar className="h-4 w-4" />
                        {user ? t('header.dashboard', { defaultValue: 'Dashboard' }) : t('header.startFree', { defaultValue: 'Start Free' })}
                    </button>
                    ) : (
                    <button onClick={() => navigate('/auth')} className="flex-1 inline-flex justify-center items-center gap-2 px-5 py-3 rounded-full bg-[#d97757] text-white font-medium hover:bg-[#c56a4b] transition-colors shadow-sm text-sm">
                        {t('header.signIn', { defaultValue: 'Sign In' })}
                    </button>
                    )}
                  </div>
                </nav>
              </div>}
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 relative min-h-[90vh] flex items-center bg-[#f5f2e8] overflow-hidden">
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-20 items-center">
            {/* Left Column: Text */}
            <div className="max-w-2xl text-left text-center lg:text-left">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[#2d2d2d] leading-[1.1]"
                style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: "900" }}
              >
              {getText(['hero', 'title'])}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                className="mt-8 text-lg sm:text-xl text-[#666666] leading-relaxed"
                style={{ fontFamily: "'Inter', sans-serif", fontWeight: "400" }}
              >
              {getText(['hero', 'subtitle'])}
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
                className="mt-6"
              >
                <button
                  onClick={handleAuthAction}
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-[#d97757] text-white font-medium hover:bg-[#c56a4b] transition-all shadow-md hover:shadow-lg text-base min-h-[48px] w-full sm:w-auto sm:min-w-[200px]"
                >
                  <Rocket className="h-4 w-4" />
                  Get Started Now
                </button>
              </motion.div>
            </div>

            {/* Right Column: Image */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
              className="relative lg:block h-full min-h-[300px] sm:min-h-[400px] lg:min-h-[500px] w-full mt-12 lg:mt-0"
            >
               <div className="absolute inset-0 bg-[#d97757]/5 rounded-[3rem] transform rotate-3 scale-95 z-0"></div>
               <img 
                className="relative z-10 w-full h-auto object-cover rounded-[2.5rem] shadow-xl border border-[#e6e0d4]" 
              src="https://raw.githubusercontent.com/AlfieAlfiegithu2/alfie-ai-coach/main/public/1000031207.png" 
                alt="English AIdol Learning Interface"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Programs */}
      <section className="py-12 bg-[#f5f2e8]" id="programs">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#2d2d2d]" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              {getText(['programs', 'title'])}
            </h2>
            <p className="mt-4 text-lg text-[#666666] font-sans">
              {getText(['programs', 'subtitle'])}
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {[
              { id: 'ielts', img: '/hero-nov06.png', title: 'IELTS' },
              { id: 'toefl', img: '/Generated Image October 19, 2025 - 11_14PM.png', title: 'TOEFL' },
              { id: 'toeic', img: '/TOEIC.png', title: 'TOEIC' },
              { id: 'pte', img: '/PTE.png', title: 'PTE' },
              { id: 'general', img: '/general english.png', title: 'General English' }
            ].map((program) => (
              <div key={program.id} className="group flex flex-col items-center p-6 rounded-2xl bg-[#faf8f6] border border-[#e6e0d4] transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <div className="w-24 h-24 mb-6 overflow-hidden rounded-xl bg-white p-2 shadow-sm flex items-center justify-center">
                  <img src={program.img} alt={program.title} className="w-full h-full object-contain" />
              </div>
                <h3 className="text-lg font-serif font-medium text-[#3c3c3c]">{getText(['programs', 'cards', program.id, 'title'])}</h3>
            </div>
            ))}
          </div>
        </div>
      </section>


      {/* Improvement Chart Section */}
      <section className="py-24 bg-[#f5f2e8]" id="improvement">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#2d2d2d]" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              Track Your English Progress
            </h2>
            <p className="mt-4 text-lg text-[#666666] font-sans max-w-2xl mx-auto">
              Click on any skill below to see your personalized improvement journey • Based on 5,683 active students achieving their goals in just 4.6 months average
            </p>
          </div>
          <div className="max-w-4xl mx-auto">
            <SkillsProgressChart />
          </div>
        </div>
      </section>


      {/* Comparison Section */}
      <section className="py-24 bg-[#f5f2e8]" id="comparison">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#2d2d2d] text-center mb-16" style={{ fontFamily: "'Inter', sans-serif" }}>
            {getText(['comparison', 'title'])}
          </h2>
          
          {/* Card-based layout for better optimality and design */}
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            
            {/* Traditional Tutors Card */}
            <div className="group rounded-3xl p-8 border border-[#e6e0d4] bg-white hover:border-[#d97757]/30 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 relative overflow-hidden flex flex-col">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#e6e0d4]/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                <h3 className="text-xl font-bold text-[#2d2d2d] mb-8 text-center border-b border-[#e6e0d4] pb-4 relative z-10" style={{ fontFamily: "'Inter', sans-serif" }}>Human Tutors</h3>
              <ul className="space-y-6 relative z-10 flex-1">
                {getArray(['comparison', 'rows']).map((rowStr: string, idx: number) => {
                  let row: any;
                  try { row = JSON.parse(rowStr); } catch { return null; }
                  return (
                    <li key={idx} className="flex flex-col gap-1.5 min-h-[80px]">
                      <span className="text-xs font-bold text-[#999999] uppercase tracking-wider">{row.label}</span>
                      <div className="flex items-start gap-2 text-[#666666] font-medium font-sans text-sm">
                        <Minus className="h-4 w-4 mt-0.5 text-[#999999] flex-shrink-0" />
                        <span>{row.traditional}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* English AIdol Card (Highlighted) */}
            <div className="group rounded-3xl p-8 border-2 border-[#d97757] bg-white shadow-2xl transform scale-105 relative z-20 overflow-visible flex flex-col">
              <div className="absolute inset-0 bg-gradient-to-b from-[#fffaf8] to-white opacity-50"></div>
              
              
              <div className="relative z-10 flex-1">
                <h3 className="text-2xl font-bold text-[#d97757] mb-8 text-center border-b border-[#d97757]/10 pb-4" style={{ fontFamily: "'Inter', sans-serif" }}>English AIdol</h3>
                <ul className="space-y-6">
                  {getArray(['comparison', 'rows']).map((rowStr: string, idx: number) => {
                    let row: any;
                    try { row = JSON.parse(rowStr); } catch { return null; }
                    return (
                      <li key={idx} className="flex flex-col gap-2 min-h-[80px]">
                        <span className="text-xs font-bold text-[#d97757] uppercase tracking-wider">{row.label}</span>
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 bg-[#d97757] p-1 rounded-full flex-shrink-0 shadow-sm">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                          <span className="text-[#2d2d2d] font-bold font-sans text-sm leading-snug">{row.ai}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>

            {/* Self Study Card */}
            <div className="group rounded-3xl p-8 border border-[#e6e0d4] bg-white hover:border-[#d97757]/30 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 relative overflow-hidden flex flex-col">
              <div className="absolute top-0 left-0 w-24 h-24 bg-[#e6e0d4]/10 rounded-br-full -ml-4 -mt-4 transition-transform group-hover:scale-110"></div>
              <h3 className="text-xl font-bold text-[#2d2d2d] mb-8 text-center border-b border-[#e6e0d4] pb-4 relative z-10" style={{ fontFamily: "'Inter', sans-serif" }}>Self-Study</h3>
              <ul className="space-y-6 relative z-10 flex-1">
                {getArray(['comparison', 'rows']).map((rowStr: string, idx: number) => {
                  let row: any;
                  try { row = JSON.parse(rowStr); } catch { return null; }
                  return (
                    <li key={idx} className="flex flex-col gap-1.5 min-h-[80px]">
                      <span className="text-xs font-bold text-[#999999] uppercase tracking-wider">{row.label}</span>
                      <div className="flex items-start gap-2 text-[#666666] font-medium font-sans text-sm">
                        <X className="h-4 w-4 mt-0.5 text-[#999999] flex-shrink-0" />
                        <span>{row.self}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

          </div>
        </div>
      </section>


      {/* FAQ Section */}
      <section className="py-24 bg-[#f5f2e8]" id="faq">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-serif font-medium text-[#2d2d2d] text-center mb-12">
            {getText(['faq', 'title'])}
          </h2>
          <div className="space-y-4">
            {getArray(['faq', 'items']).map((itemStr: string, idx: number) => {
              let item: any;
              try {
                item = JSON.parse(itemStr);
              } catch {
                return null;
              }
              return (
                <motion.details
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: idx * 0.05 }}
                  className="group rounded-xl border border-[#e6e0d4] bg-white open:shadow-md transition-all duration-200"
                >
                  <summary className="cursor-pointer font-serif font-medium text-[#3c3c3c] px-6 py-5 flex items-center justify-between select-none">
                    <span className="text-lg">{item.q}</span>
                    <ChevronDown className="h-5 w-5 text-[#666666] transition-transform group-open:rotate-180" />
                  </summary>
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <p className="px-6 pb-6 text-[#666666] font-sans leading-relaxed border-t border-[#f5f2e8] pt-4">
                      {item.a}
                    </p>
                  </motion.div>
                </motion.details>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 bg-[#f5f2e8] border-t border-[#e6e0d4]" id="pricing">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#2d2d2d]" style={{ fontFamily: "'Montserrat', sans-serif" }}>{getText(['pricing', 'title'])}</h2>
          </div>

          {/* Discount Period Selector */}
          <div className="mb-16 flex justify-center">
            <div className="inline-flex rounded-lg border border-[#e6e0d4] bg-[#faf8f6] p-1 shadow-sm">
              <button
                onClick={() => setSelectedDiscount('monthly')}
                data-discount="monthly"
                className={`rounded-md px-6 py-2.5 text-sm font-medium transition font-sans ${
                  selectedDiscount === 'monthly' ? 'bg-white text-[#2d2d2d] shadow-sm' : 'text-[#666666] hover:bg-white/50'
                }`}
              >
                {getText(['pricing', 'discounts', 'monthly'])}
              </button>
              <button
                onClick={() => setSelectedDiscount('3months')}
                data-discount="3months"
                className={`rounded-md px-6 py-2.5 text-sm font-medium transition font-sans ${
                  selectedDiscount === '3months' ? 'bg-white text-[#2d2d2d] shadow-sm' : 'text-[#666666] hover:bg-white/50'
                }`}
              >
                {getText(['pricing', 'discounts', 'threeMonths'])}
                <span className="ml-2 text-xs text-[#d97757] font-semibold">{getText(['pricing', 'discounts', 'save10'])}</span>
              </button>
              <button
                onClick={() => setSelectedDiscount('6months')}
                data-discount="6months"
                className={`rounded-md px-6 py-2.5 text-sm font-medium transition font-sans ${
                  selectedDiscount === '6months' ? 'bg-white text-[#2d2d2d] shadow-sm' : 'text-[#666666] hover:bg-white/50'
                }`}
              >
                {getText(['pricing', 'discounts', 'sixMonths'])}
                <span className="ml-2 text-xs text-[#d97757] font-semibold">{getText(['pricing', 'discounts', 'save30'])}</span>
              </button>
            </div>
          </div>

          <div className="grid gap-8 md:grid-cols-3 max-w-7xl mx-auto">
            <PricingCard
              title={getText(['pricing', 'free', 'title'])}
              subtitle={getText(['pricing', 'free', 'subtitle'])}
              price={getText(['pricing', 'free', 'price'])}
              period={getText(['pricing', 'free', 'period'])}
              features={getArray(['pricing', 'free', 'features'])}
              buttonText={getText(['pricing', 'free', 'button'])}
              onButtonClick={handleAuthAction}
              isPopular
              isBlack
              className="pb-16 min-h-[600px]"
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
              badge={getText(['pricing', 'pro', 'badge'])}
              originalPrice="$78"
              limitedTimeOffer
              className="min-h-[600px]"
            />

            <PricingCard
              title={getText(['pricing', 'ultra', 'title'])}
              subtitle={getText(['pricing', 'ultra', 'subtitle'])}
              price={getUltraPrice()}
              period={getText(['pricing', 'ultra', 'period'])}
              features={getArray(['pricing', 'ultra', 'features'])}
              buttonText={getText(['pricing', 'ultra', 'button'])}
              onButtonClick={handleProCheckout}
              isPopular
              isPremium
              isGold
              originalPrice="$300"
              limitedTimeOffer
              className="min-h-[600px]"
            />
          </div>
        </div>
      </section>

      {/* Highlights Section - Bottom with Image Layout */}
      <section className="py-24 bg-[#f5f2e8]" id="highlights-bottom">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          {/* Highlight 1: AI-Powered Feedback */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-24">
            <div className="flex items-center justify-center">
              <div className="w-80 h-80 bg-gradient-to-br from-white to-[#f5f2e8] rounded-full flex items-center justify-center border border-[#e6e0d4] shadow-sm">
                 <Brain className="w-32 h-32 text-[#d97757] opacity-80" />
              </div>
            </div>
            <div>
              <h3 className="text-3xl sm:text-4xl font-serif font-medium text-[#2d2d2d] mb-6">
                {getText(['highlights', 'aiFeedback', 'title'])}
              </h3>
              <p className="text-lg text-[#666666] font-sans leading-relaxed">
                {getText(['highlights', 'aiFeedback', 'description'])}
              </p>
            </div>
          </div>

          {/* Highlight 2: Adaptive Learning */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-24 lg:auto-cols-max">
            <div className="lg:order-2 flex items-center justify-center">
              <div className="w-80 h-80 bg-gradient-to-br from-white to-[#f5f2e8] rounded-full flex items-center justify-center border border-[#e6e0d4] shadow-sm">
                <Target className="w-32 h-32 text-[#d97757] opacity-80" />
              </div>
            </div>
            <div className="lg:order-1">
              <h3 className="text-3xl sm:text-4xl font-serif font-medium text-[#2d2d2d] mb-6">
                {getText(['highlights', 'adaptive', 'title'])}
              </h3>
              <p className="text-lg text-[#666666] font-sans leading-relaxed">
                {getText(['highlights', 'adaptive', 'description'])}
              </p>
            </div>
          </div>

          {/* Highlight 3: Proven Results */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-24">
            <div className="flex items-center justify-center">
              <div className="w-80 h-80 bg-gradient-to-br from-white to-[#f5f2e8] rounded-full flex items-center justify-center border border-[#e6e0d4] shadow-sm">
                 <TrendingUp className="w-32 h-32 text-[#d97757] opacity-80" />
              </div>
            </div>
            <div>
              <h3 className="text-3xl sm:text-4xl font-serif font-medium text-[#2d2d2d] mb-6">
                {getText(['highlights', 'proven', 'title'])}
              </h3>
              <p className="text-lg text-[#666666] font-sans leading-relaxed">
                {getText(['highlights', 'proven', 'description'])}
              </p>
            </div>
          </div>

          {/* Highlight 4: Expert Community */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center lg:auto-cols-max">
            <div className="lg:order-2 flex items-center justify-center">
              <div className="w-80 h-80 bg-gradient-to-br from-white to-[#f5f2e8] rounded-full flex items-center justify-center border border-[#e6e0d4] shadow-sm">
                <Star className="w-32 h-32 text-[#d97757] opacity-80" />
              </div>
            </div>
            <div className="lg:order-1">
              <h3 className="text-3xl sm:text-4xl font-serif font-medium text-[#2d2d2d] mb-6">
                {getText(['highlights', 'community', 'title'])}
              </h3>
              <p className="text-lg text-[#666666] font-sans leading-relaxed">
                {getText(['highlights', 'community', 'description'])}
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* Footer with Blog Section */}
      <footer className="border-t border-[#e6e0d4] bg-[#faf8f6] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-6">
                <img
                  src="/1000031328.png"
                  alt="English AIdol Logo"
                  className="h-16 w-auto opacity-90 grayscale-[0.2]"
                />
                </div>
              <p className="mt-3 text-sm text-[#666666] font-sans leading-relaxed">
                Simple, Transparent Pricing. Invest in your future with the most advanced AI English tutor available.
              </p>
            </div>

            {/* Learning */}
            <div>
              <h4 className="text-sm font-serif font-semibold text-[#2d2d2d] tracking-wide uppercase mb-6">
                {getText(['footer', 'learning', 'title'])}
              </h4>
              <ul className="space-y-3 text-sm text-[#666666] font-sans">
                <li>
                  <a className="hover:text-[#d97757] transition-colors" href="/ielts-portal">
                    IELTS Preparation
                  </a>
                </li>
                <li>
                  <a className="hover:text-[#d97757] transition-colors" href="/toefl-portal">
                    TOEFL Preparation
                  </a>
                </li>
                <li>
                  <a className="hover:text-[#d97757] transition-colors" href="/pte-portal">
                    PTE Preparation
                  </a>
                </li>
                <li>
                  <a className="hover:text-[#d97757] transition-colors" href="/toeic-portal">
                    TOEIC Preparation
                  </a>
                </li>
                <li>
                  <a className="hover:text-[#d97757] transition-colors" href="/general-portal">
                    General English
                  </a>
                </li>
              </ul>
            </div>

            {/* Blog entry point for SEO + UX */}
            <div>
              <h4 className="text-sm font-serif font-semibold text-[#2d2d2d] tracking-wide uppercase mb-6">
                Blog & Resources
              </h4>
              <p className="text-sm text-[#666666] font-sans leading-relaxed mb-4">
                Discover expert tips, real IELTS examiner insights, and AI-powered study strategies.
              </p>
                <Link
                  to="/blog"
                className="inline-flex items-center gap-2 text-[#d97757] hover:text-[#c56a4b] font-medium font-sans text-sm"
                >
                <span>Visit the Blog</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
            </div>

            {/* Social / Connect */}
            <div>
              <h4 className="text-sm font-serif font-semibold text-[#2d2d2d] tracking-wide uppercase mb-6">
                {getText(['footer', 'connect', 'title'])}
              </h4>
              <div className="flex gap-3">
                <a
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e6e0d4] bg-white text-[#666666] transition hover:border-[#d97757] hover:text-[#d97757]"
                  href="#"
                  aria-label="Instagram"
                >
                  <Instagram className="h-4 w-4" />
                </a>
                <a
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e6e0d4] bg-white text-[#666666] transition hover:border-[#d97757] hover:text-[#d97757]"
                  href="#"
                  aria-label="Facebook"
                >
                  <Facebook className="h-4 w-4" />
                </a>
                <a
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e6e0d4] bg-white text-[#666666] transition hover:border-[#d97757] hover:text-[#d97757]"
                  href="#"
                  aria-label="Twitter"
                >
                  <Twitter className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-16 flex flex-col items-center justify-between gap-6 border-t border-[#e6e0d4] pt-8 text-xs sm:flex-row text-[#666666] font-sans">
            <p>
              {getText(['footer', 'copyright'])}
            </p>
            <div className="flex items-center gap-6">
              <Link className="hover:text-[#d97757] transition-colors" to="/privacy-policy">
                {getText(['footer', 'privacy'])}
              </Link>
              <Link className="hover:text-[#d97757] transition-colors" to="/refund-policy">
                Refund Policy
              </Link>
              <Link className="hover:text-[#d97757] transition-colors" to="/terms-of-service">
                {getText(['footer', 'terms'])}
              </Link>
              <Link className="hover:text-[#d97757] transition-colors" to="/support">
                {getText(['footer', 'support'])}
              </Link>
            </div>
          </div>

          {/* Hero page specific privacy & no-liability notice */}
          <div className="mt-6 pt-6 border-t border-[#e6e0d4]/50 text-[10px] text-[#666666]/60 space-y-2 font-sans max-w-4xl mx-auto text-center">
            <p>
              We securely store your practice data and audio recordings long-term so you can review your history, track progress, and receive better AI feedback over time.
            </p>
            <p>
              All feedback and scores are AI-generated for learning purposes only. This is not an official test, does not guarantee future exam results, and does not constitute legal, immigration, or professional advice.
            </p>
          </div>
        </div>
      </footer>

      {/* AI Chatbot */}
      <MinimalisticChatbot />
    </div>
};
export default HeroIndex;