import { useState, useTransition, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentLayout from '@/components/StudentLayout';
import SEO from '@/components/SEO';
import { useTheme } from '@/contexts/ThemeContext';
import { themes, ThemeName } from '@/lib/themes';
import { useThemeStyles } from '@/hooks/useThemeStyles';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import SpotlightCard from '@/components/SpotlightCard';
import { CardContent } from '@/components/ui/card';
import LoadingOverlay from '@/components/transitions/LoadingOverlay';
import LoadingAnimation from '@/components/animations/LoadingAnimation';
import { Check, Star, Zap, Crown, ChevronRight, BookOpen, Shield, FileText, Receipt } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Section interface for structured content
interface ExamSection {
    title: string;
    items: {
        label: string;
        path: string;
    }[];
}

interface ExamType {
    id: string;
    title: string;
    route: string;
    sections: ExamSection[];
}

// Exam types with simplified sections (Titles only) and removed descriptions
const EXAM_TYPES: ExamType[] = [
    {
        id: 'ielts',
        title: 'IELTS',
        route: '/ielts-portal',
        sections: [
            {
                title: 'Study each part',
                items: [
                    { label: 'Reading', path: '/reading' },
                    { label: 'Listening', path: '/listening' },
                    { label: 'Writing', path: '/ielts-writing-test' },
                    { label: 'Speaking', path: '/ielts-speaking-test' }
                ]
            },
            {
                title: 'Sharpening your skills',
                items: [
                    { label: 'Vocabulary Book', path: '/vocabulary' },
                    { label: 'Books', path: '/books' },
                    { label: 'Templates', path: '/templates' },
                    { label: 'Grammar', path: '/grammar' },
                    { label: 'Paraphrasing', path: '/skills/paraphrasing-challenge' },
                    { label: 'Pronunciation', path: '/skills/pronunciation-repeat-after-me' },
                    { label: 'Sentence Structure', path: '/skills/sentence-structure-scramble' },
                    { label: 'Listening for Details', path: '/skills/listening-for-details' },
                    { label: 'Synonym Match', path: '/skills/synonym-match' }
                ]
            }
        ]
    },
    {
        id: 'toeic',
        title: 'TOEIC',
        route: '/toeic-portal',
        sections: [
            {
                title: 'Practice Tests',
                items: [
                    { label: 'Listening Tests', path: '/toeic-portal' },
                    { label: 'Reading Tests', path: '/toeic-portal' }
                ]
            }
        ]
    },
    {
        id: 'business',
        title: 'Business English',
        route: '/business-portal',
        sections: [
            {
                title: 'Career Development',
                items: [
                    { label: 'Resume Builder', path: '/business/resume' },
                    { label: 'Email Practice', path: '/business/email' },
                    { label: 'Interview Prep', path: '/business/interview' }
                ]
            }
        ]
    },
    {
        id: 'general',
        title: 'General English',
        route: '/general-portal',
        sections: [
            {
                title: 'Practice Speaking',
                items: [
                    { label: 'Speaking', path: '/ai-speaking' }
                ]
            },
            {
                title: 'Sharpening your skills',
                items: [
                    { label: 'Vocabulary Book', path: '/vocabulary' },
                    { label: 'Books', path: '/books' },
                    { label: 'Templates', path: '/templates' },
                    { label: 'Grammar', path: '/grammar' },
                    { label: 'Paraphrasing', path: '/skills/paraphrasing-challenge' },
                    { label: 'Pronunciation', path: '/skills/pronunciation-repeat-after-me' },
                    { label: 'Sentence Structure', path: '/skills/sentence-structure-scramble' },
                    { label: 'Listening for Details', path: '/skills/listening-for-details' },
                    { label: 'Synonym Match', path: '/skills/synonym-match' }
                ]
            }
        ]
    },
    {
        id: 'toefl',
        title: 'TOEFL',
        route: '/toefl-portal',
        sections: [
            {
                title: 'Study Portal',
                items: [
                    { label: 'Go to Portal', path: '/toefl-portal' }
                ]
            }
        ]
    },
    {
        id: 'pte',
        title: 'PTE Academic',
        route: '/pte-portal',
        sections: [
            {
                title: 'Study Portal',
                items: [
                    { label: 'Go to Portal', path: '/pte-portal' }
                ]
            }
        ]
    },
    {
        id: 'nclex',
        title: 'NCLEX',
        route: '/nclex',
        sections: [
            {
                title: 'Study Portal',
                items: [
                    { label: 'Go to Portal', path: '/nclex' }
                ]
            }
        ]
    }
];

// Special Sections for Sidebar Navigation acting as "Exams"
const PLAN_SECTION: ExamType = {
    id: 'plans',
    title: 'Plans & Pricing',
    route: '/pay',
    sections: []
};

const FAQ_SECTION: ExamType = {
    id: 'faq',
    title: 'FAQ',
    route: '/faq',
    sections: []
};

const BLOG_SECTION: ExamType = { id: 'blog', title: 'Blog', route: '/blog', sections: [] };
const SUPPORT_SECTION: ExamType = { id: 'support', title: 'Support', route: 'https://www.englishaidol.com/support', sections: [] };
const PRIVACY_SECTION: ExamType = { id: 'privacy', title: 'Privacy Policy', route: 'https://www.englishaidol.com/privacy-policy', sections: [] };
const REFUND_SECTION: ExamType = { id: 'refund', title: 'Refund Policy', route: 'https://www.englishaidol.com/refund-policy', sections: [] };
const TERMS_SECTION: ExamType = { id: 'terms', title: 'Terms of Service', route: 'https://www.englishaidol.com/terms-of-service', sections: [] };

const PRICING_PLANS = [
    {
        id: 'free',
        name: 'Free',
        price: '$0',
        period: 'forever',
        pricePrefix: null,
        originalPrice: null,
        discount: null,
        description: 'Try all tests for free',
        icon: <Star className="w-6 h-6" />,
        features: [
            'Access to all test types',
            '1 free test included',
            'Basic AI feedback'
        ],
        buttonText: 'Get Started',
        popular: false
    },
    {
        id: 'pro',
        name: 'Pro',
        price: '$29',
        period: 'mo',
        pricePrefix: 'from',
        originalPrice: null,
        discount: null,
        description: 'For dedicated learners',
        icon: <Zap className="w-6 h-6" />,
        features: [
            'Unlimited practice tests',
            'Advanced AI feedback',
            'Premium study materials'
        ],
        buttonText: 'Get Pro',
        popular: true
    },
    {
        id: 'ultra',
        name: 'Ultra',
        price: '$119',
        period: 'mo',
        pricePrefix: 'from',
        originalPrice: null,
        discount: null,
        description: 'Complete mastery package',
        icon: <Crown className="w-6 h-6" />,
        features: [
            'Everything in Pro',
            '1-on-1 Instructor Call (90m)',
            'Personalized Study Path & Guide',
            'Official Level Test'
        ],
        buttonText: 'Get Ultra',
        popular: false
    }
];

const FAQS = [
    {
        question: "How does English Aidol work?",
        answer: "English Aidol uses advanced AI to analyze your speaking, writing, and reading skills in real-time. It provides instant, personalized feedback just like a human tutor, but available 24/7."
    },
    {
        question: "Can I practice for specific exams?",
        answer: "Yes! We specialize in IELTS, TOEIC, TOEFL, and PTE preparation. Our AI examiners are calibrated to official grading criteria to give you accurate score predictions."
    },
    {
        question: "Is there a free trial?",
        answer: "Our Free plan gives you access to basic features forever, including one free test of each type. Our Premium plans unlock unlimited practice and advanced analytics."
    },
    {
        question: "What makes English Aidol different?",
        answer: "Unlike standard learning apps, we focus on output—speaking and writing. Our AI doesn't just correct grammar; it coaches you on pronunciation, fluency, coherence, and vocabulary usage."
    }
];

const ExamSelectionPortal = () => {
    const navigate = useNavigate();
    const { themeName } = useTheme();
    const themeStyles = useThemeStyles();

    // Use useTransition for smoother concurrent navigation if available
    const [isPending, startTransition] = useTransition();

    const [dashboardFont, setDashboardFont] = useState<string>('Inter');
    const [policiesOpen, setPoliciesOpen] = useState(false);

    useEffect(() => {
        const loadFont = () => {
            const stored = localStorage.getItem('dashboard_font');
            if (stored) {
                setDashboardFont(stored);
            } else {
                setDashboardFont(themeName === 'note' ? 'Patrick Hand' : 'Inter');
            }
        };
        loadFont();

        const handleStorage = (e: StorageEvent) => {
            if (e.key === 'dashboard_font_updated') {
                loadFont();
            }
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, [themeName]);

    const getFontFamily = (fontName: string) => {
        switch (fontName) {
            case 'Patrick Hand': return 'Patrick Hand, cursive';
            case 'Roboto': return 'Roboto, sans-serif';
            case 'Open Sans': return 'Open Sans, sans-serif';
            case 'Lora': return 'Lora, serif';
            case 'Inter':
            default: return 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        }
    };

    // State for hover/selection
    const [hoveredExam, setHoveredExam] = useState(EXAM_TYPES[0]);

    const handleMaterialClick = (path: string) => {
        // Use transition to keep UI responsive
        startTransition(() => {
            navigate(path);
        });
    };

    // Note theme specific styles
    const isNoteTheme = themeName === 'note';
    const isGlassmorphism = themeName === 'glassmorphism';
    // Explicitly fallback to BRIGHTER cream for cleaner premium paper feel
    // For glassmorphism, use a bright gradient background
    const mainBg = isNoteTheme ? '#FFFAF0'
        : isGlassmorphism ? 'linear-gradient(135deg, #e0f4ff 0%, #cce7ff 25%, #d4ebff 50%, #e8f4ff 75%, #f0f9ff 100%)'
            : themeStyles.theme.colors.background;
    const textColor = isNoteTheme ? themes.note.colors.textPrimary : themeStyles.theme.colors.textPrimary;
    const secondaryTextColor = isNoteTheme ? themes.note.colors.textSecondary : themeStyles.theme.colors.textSecondary;
    const accentColor = isNoteTheme ? themes.note.colors.textAccent : themeStyles.theme.colors.textAccent;
    const borderColor = isNoteTheme ? themes.note.colors.border : themeStyles.theme.colors.border;

    // Loading overlay that forces Note Theme background
    // Shared LoadingOverlay is now used below

    return (
        <div
            className="min-h-screen relative overflow-hidden"
            style={{
                background: isGlassmorphism ? mainBg : undefined,
                backgroundColor: !isGlassmorphism ? (isNoteTheme ? mainBg : themeStyles.theme.colors.background) : undefined,
                color: textColor,
                fontFamily: getFontFamily(dashboardFont)
                // Removed Georgia font globally to look less academic
            }}
        >
            <SEO
                title="Choose Your Test - English AI Dol"
                description="Select from IELTS, TOEIC, TOEFL, PTE, NCLEX, Business English, and more."
                keywords="IELTS, TOEIC, TOEFL, PTE, NCLEX, English test"
                type="website"
            />

            {/* Background Texture for Note Theme - ENHANCED PAPER FEEL */}
            {isNoteTheme && (
                <div
                    className="fixed inset-0 pointer-events-none z-50"
                    style={{
                        backgroundImage: `url("https://www.transparenttextures.com/patterns/rice-paper-2.png")`,
                        mixBlendMode: 'multiply',
                        opacity: 0.5,
                        filter: 'contrast(1.2)'
                    }}
                />
            )}

            {/* Dashboard Button */}
            <div className="absolute top-6 right-6 z-50">
                <Button
                    variant="ghost"
                    onClick={() => navigate('/dashboard')}
                    className="font-medium hover:bg-transparent"
                    style={{ color: secondaryTextColor }}
                >
                    Dashboard →
                </Button>
            </div>

            {/* Background Texture for Note Theme - REMOVED GLOBAL TEXTURE */}

            <div className="relative z-10 h-screen flex flex-col">
                <StudentLayout title="" showBackButton={false} fullWidth transparentBackground={true} noPadding>

                    <div className="flex h-full md:h-screen w-full relative">

                        {/* LEFT SIDEBAR - Minimalist List */}
                        <motion.div
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                            className="w-full md:w-[300px] lg:w-[340px] h-full flex flex-col border-r z-20"
                            style={{
                                borderColor: isGlassmorphism ? 'rgba(255,255,255,0.4)' : borderColor,
                                backgroundColor: isNoteTheme ? 'transparent'
                                    : isGlassmorphism ? 'rgba(255,255,255,0.5)'
                                        : 'rgba(255,255,255,0.05)',
                                backdropFilter: isGlassmorphism ? 'blur(12px)' : undefined,
                                WebkitBackdropFilter: isGlassmorphism ? 'blur(12px)' : undefined,
                            }}
                        >
                            {/* Left Sidebar Texture - Static */}

                            {/* Header / Navigation */}


                            {/* Title Area */}
                            <div className="px-8 py-8 shrink-0 flex items-center gap-4">
                                <img src="/1000031328.png" alt="English Aidol" className="w-16 h-16 object-contain rounded-xl" />
                                <div>
                                    <h1 className={cn(
                                        "text-2xl font-bold tracking-wide",
                                    )} style={{ color: textColor, fontFamily: getFontFamily(dashboardFont) }}>
                                        English Aidol
                                    </h1>
                                </div>
                            </div>



                            <div className="flex-1 overflow-y-auto px-6 pb-8" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                                {/* Exam List */}
                                <div className="space-y-1">
                                    {EXAM_TYPES.map((exam, index) => (
                                        <div key={exam.id}>
                                            <button
                                                onMouseEnter={() => setHoveredExam(exam)}
                                                onClick={() => setHoveredExam(exam)}
                                                className={cn(
                                                    "w-full text-left relative flex items-center py-3 px-4 transition-all duration-200 group outline-none rounded-lg",
                                                    hoveredExam.id === exam.id
                                                        ? isGlassmorphism ? "bg-white/40 shadow-sm border border-white/30 backdrop-blur-sm" : "bg-[#E8D5A3]/40"
                                                        : "hover:bg-black/5"
                                                )}
                                                style={{
                                                    color: hoveredExam.id === exam.id ? textColor : secondaryTextColor,
                                                }}
                                            >
                                                <div className="flex-1 relative z-10">
                                                    <span className={cn(
                                                        "text-base transition-all duration-200",
                                                        hoveredExam.id === exam.id ? "font-bold" : "font-medium",
                                                    )} style={{ fontFamily: getFontFamily(dashboardFont) }}>
                                                        {exam.title}
                                                    </span>
                                                </div>
                                                {hoveredExam.id === exam.id && <ChevronRight className="w-4 h-4 opacity-50" />}
                                            </button>
                                            {/* Divider after each exam except last - Increased Visibility */}
                                            {index < EXAM_TYPES.length - 1 && (
                                                <div className="w-full h-px opacity-20 my-2" style={{ backgroundColor: textColor }} />
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Section Divider */}
                                <div className="w-full h-px opacity-20 my-4" style={{ backgroundColor: textColor }} />

                                <div className="space-y-2">
                                    {/* Plans Button */}
                                    <button
                                        onMouseEnter={() => setHoveredExam(PLAN_SECTION)}
                                        onClick={() => setHoveredExam(PLAN_SECTION)}
                                        className={cn(
                                            "w-full text-left relative flex items-center py-3 px-4 transition-all duration-200 group outline-none rounded-lg",
                                            hoveredExam.id === 'plans'
                                                ? isGlassmorphism ? "bg-white/40 shadow-sm border border-white/30 backdrop-blur-sm" : "bg-[#E8D5A3]/40"
                                                : "hover:bg-black/5"
                                        )}
                                        style={{
                                            color: hoveredExam.id === 'plans' ? textColor : secondaryTextColor,
                                        }}
                                    >
                                        <div className="flex-1 relative z-10">
                                            <span className={cn(
                                                "text-base transition-all duration-200",
                                                hoveredExam.id === 'plans' ? "font-bold" : "font-medium",
                                            )} style={{ fontFamily: getFontFamily(dashboardFont) }}>
                                                Plans & Pricing
                                            </span>
                                        </div>
                                        {hoveredExam.id === 'plans' && <ChevronRight className="w-4 h-4 opacity-50" />}
                                    </button>

                                    {/* FAQ Button */}
                                    <button
                                        onMouseEnter={() => setHoveredExam(FAQ_SECTION)}
                                        onClick={() => setHoveredExam(FAQ_SECTION)}
                                        className={cn(
                                            "w-full text-left relative flex items-center py-3 px-4 transition-all duration-200 group outline-none rounded-lg",
                                            hoveredExam.id === 'faq'
                                                ? isGlassmorphism ? "bg-white/40 shadow-sm border border-white/30 backdrop-blur-sm" : "bg-[#E8D5A3]/40"
                                                : "hover:bg-black/5"
                                        )}
                                        style={{
                                            color: hoveredExam.id === 'faq' ? textColor : secondaryTextColor,
                                        }}
                                    >
                                        <div className="flex-1 relative z-10">
                                            <span className={cn(
                                                "text-base transition-all duration-200",
                                                hoveredExam.id === 'faq' ? "font-bold" : "font-medium",
                                            )} style={{ fontFamily: getFontFamily(dashboardFont) }}>
                                                FAQ
                                            </span>
                                        </div>
                                        {hoveredExam.id === 'faq' && <ChevronRight className="w-4 h-4 opacity-50" />}
                                    </button>

                                    {/* Links Divider */}
                                    <div className="w-full h-px opacity-20 my-2" style={{ backgroundColor: textColor }} />

                                    {/* Footer Links */}
                                    <div className="pt-2 gap-1 flex flex-col">
                                        <button
                                            onClick={() => setPoliciesOpen(!policiesOpen)}
                                            className="w-full text-left py-2 px-4 rounded-lg hover:bg-black/5 text-sm transition-colors font-medium flex items-center justify-between group"
                                            style={{ color: secondaryTextColor, fontFamily: getFontFamily(dashboardFont) }}
                                        >
                                            <span>Policies</span>
                                            <ChevronRight className={cn("w-3.5 h-3.5 transition-transform opacity-50 group-hover:opacity-100", policiesOpen && "rotate-90")} />
                                        </button>

                                        {policiesOpen && (
                                            <div className="pl-6 space-y-1 animate-in slide-in-from-top-2 duration-200">
                                                <button
                                                    onMouseEnter={() => setHoveredExam(BLOG_SECTION)}
                                                    onClick={() => handleMaterialClick(BLOG_SECTION.route)}
                                                    className="w-full text-left py-1.5 px-2 rounded-md hover:bg-black/5 text-xs transition-colors opacity-70 hover:opacity-100"
                                                    style={{ color: secondaryTextColor, fontFamily: getFontFamily(dashboardFont) }}
                                                >
                                                    Blog
                                                </button>
                                                <button
                                                    onMouseEnter={() => setHoveredExam(SUPPORT_SECTION)}
                                                    onClick={() => window.open(SUPPORT_SECTION.route, '_blank')}
                                                    className="w-full text-left py-1.5 px-2 rounded-md hover:bg-black/5 text-xs transition-colors opacity-70 hover:opacity-100"
                                                    style={{ color: secondaryTextColor, fontFamily: getFontFamily(dashboardFont) }}
                                                >
                                                    Support
                                                </button>
                                                <button
                                                    onMouseEnter={() => setHoveredExam(PRIVACY_SECTION)}
                                                    onClick={() => window.open(PRIVACY_SECTION.route, '_blank')}
                                                    className="w-full text-left py-1.5 px-2 rounded-md hover:bg-black/5 text-xs transition-colors opacity-70 hover:opacity-100"
                                                    style={{ color: secondaryTextColor, fontFamily: getFontFamily(dashboardFont) }}
                                                >
                                                    Privacy Policy
                                                </button>
                                                <button
                                                    onMouseEnter={() => setHoveredExam(REFUND_SECTION)}
                                                    onClick={() => window.open(REFUND_SECTION.route, '_blank')}
                                                    className="w-full text-left py-1.5 px-2 rounded-md hover:bg-black/5 text-xs transition-colors opacity-70 hover:opacity-100"
                                                    style={{ color: secondaryTextColor, fontFamily: getFontFamily(dashboardFont) }}
                                                >
                                                    Refund Policy
                                                </button>
                                                <button
                                                    onMouseEnter={() => setHoveredExam(TERMS_SECTION)}
                                                    onClick={() => window.open(TERMS_SECTION.route, '_blank')}
                                                    className="w-full text-left py-1.5 px-2 rounded-md hover:bg-black/5 text-xs transition-colors opacity-70 hover:opacity-100"
                                                    style={{ color: secondaryTextColor, fontFamily: getFontFamily(dashboardFont) }}
                                                >
                                                    Terms of Service
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* RIGHT MAIN CONTENT - Card Containers */}
                        <div
                            className="flex-1 hidden md:flex relative overflow-hidden overflow-y-auto"
                            style={{ perspective: '5px' }}
                        >
                            <div
                                className="relative min-h-full w-full flex flex-col items-center p-8 lg:p-12"
                                style={{ transformStyle: 'preserve-3d' }}
                            >
                                {/* Right Content Texture - Static to fix scroll issues */}


                                {/* Transition Loading Overlay */}
                                { /* Transition Loading Overlay moved outside for true full-screen experience */}

                                <motion.div
                                    key={hoveredExam.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4 }}
                                    className="max-w-5xl w-full h-full pb-8 relative z-10"
                                    style={{ transform: 'translateZ(0)' }}
                                >
                                    <div className="mb-12 flex justify-center w-full">
                                        <h1 className={cn(
                                            "text-6xl md:text-7xl font-bold mb-4 tracking-tight text-center",
                                        )} style={{ color: textColor, fontFamily: getFontFamily(dashboardFont) }}>
                                            {hoveredExam.title}
                                        </h1>
                                    </div>

                                    {/* Sections or Special Content */}
                                    {/* Sections or Special Content */}
                                    {hoveredExam.id === 'plans' ? (
                                        <div className="flex flex-col items-center w-full max-w-6xl mx-auto h-full justify-center">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full items-stretch">
                                                {PRICING_PLANS.map((plan) => (
                                                    <div
                                                        key={plan.id}
                                                        className={cn(
                                                            "relative p-8 rounded-3xl border-2 transition-all duration-300 flex flex-col",
                                                            plan.popular ? "shadow-2xl scale-105 z-10" : "hover:scale-102 hover:shadow-lg",
                                                            isGlassmorphism ? (plan.popular ? "bg-white/40 backdrop-blur-xl border-white/50 shadow-[0_8px_32px_0_rgba(31,38,135,0.37)]" : "bg-white/10 backdrop-blur-md border-white/10") : ""
                                                        )}
                                                        style={{
                                                            borderColor: plan.popular ? accentColor : borderColor,
                                                            backgroundColor: !isGlassmorphism ? (isNoteTheme ? '#FFFDF8' : themeStyles.theme.colors.cardBackground) : undefined,
                                                            boxShadow: plan.popular ? '0 25px 50px -12px rgba(0,0,0,0.25)' : undefined
                                                        }}
                                                    >
                                                        {/* Popular Badge */}
                                                        {plan.popular && (
                                                            <div
                                                                className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-sm font-bold shadow-lg whitespace-nowrap"
                                                                style={{ backgroundColor: accentColor, color: '#fff' }}
                                                            >
                                                                MOST POPULAR
                                                            </div>
                                                        )}

                                                        {/* Plan Name */}
                                                        <h3 className="text-2xl font-bold mb-4" style={{ color: textColor, fontFamily: getFontFamily(dashboardFont) }}>
                                                            {plan.name}
                                                        </h3>

                                                        {/* Price Section */}
                                                        <div className="mb-6">
                                                            {plan.pricePrefix && (
                                                                <span className="text-sm opacity-60 block mb-1" style={{ color: secondaryTextColor }}>
                                                                    {plan.pricePrefix}
                                                                </span>
                                                            )}
                                                            <div className="flex items-baseline gap-1">
                                                                <span className="text-5xl font-bold" style={{ color: textColor }}>{plan.price}</span>
                                                                <span className="text-lg opacity-60" style={{ color: secondaryTextColor }}>/{plan.period}</span>
                                                            </div>
                                                        </div>

                                                        {/* Description */}
                                                        <p className="text-lg mb-8 opacity-80" style={{ color: secondaryTextColor }}>
                                                            {plan.description}
                                                        </p>

                                                        {/* Features */}
                                                        <ul className="space-y-5 mb-10 flex-1">
                                                            {plan.features.map((feature, i) => (
                                                                <li key={i} className="flex items-center gap-4 text-lg">
                                                                    <Check className="w-6 h-6 shrink-0" style={{ color: accentColor }} />
                                                                    <span style={{ color: secondaryTextColor }}>{feature}</span>
                                                                </li>
                                                            ))}
                                                        </ul>

                                                        {/* CTA Button */}
                                                        <a
                                                            href={`http://localhost:3009/pay?plan=${plan.id}`}
                                                            className={cn(
                                                                "block w-full py-5 text-xl font-bold rounded-2xl transition-all text-center mt-auto",
                                                                "hover:opacity-90 hover:scale-105"
                                                            )}
                                                            style={{
                                                                backgroundColor: plan.popular ? accentColor : 'transparent',
                                                                color: plan.popular ? '#fff' : textColor,
                                                                border: plan.popular ? 'none' : `2px solid ${borderColor}`
                                                            }}
                                                        >
                                                            Get {plan.name}
                                                        </a>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : hoveredExam.id === 'faq' ? (
                                        <div className="max-w-4xl mx-auto space-y-8 w-full">
                                            <div className="text-center mb-8">
                                                <p className="text-lg opacity-80 max-w-2xl mx-auto" style={{ color: secondaryTextColor }}>
                                                    Welcome to English Aidol – your intelligent partner for mastering English.
                                                    Whether you're preparing for IELTS, TOEIC, or just want to improve your business communication,
                                                    our specialized AI tutors are here to guide you 24/7.
                                                </p>
                                            </div>
                                            <div className="grid gap-6">
                                                {FAQS.map((faq, i) => (
                                                    <div
                                                        key={i}
                                                        className="p-8 rounded-2xl border transition-all hover:bg-black/5"
                                                        style={{
                                                            borderColor: borderColor,
                                                            backgroundColor: isGlassmorphism ? 'rgba(255,255,255,0.4)' : undefined
                                                        }}
                                                    >
                                                        <h3 className="font-bold text-xl mb-3" style={{ color: textColor }}>{faq.question}</h3>
                                                        <p className="leading-relaxed" style={{ color: secondaryTextColor }}>{faq.answer}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-12">
                                            {hoveredExam.sections.map((section, sectionIdx) => (
                                                <div key={sectionIdx}>
                                                    <h2 className={cn(
                                                        "text-2xl font-bold mb-6 flex items-center",
                                                    )} style={{
                                                        fontFamily: getFontFamily(dashboardFont),
                                                        color: textColor
                                                    }}>
                                                        {section.title}
                                                        <div className="ml-4 h-[1px] flex-1 opacity-20" style={{ backgroundColor: secondaryTextColor }}></div>
                                                    </h2>

                                                    {/* Card Grid */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                                        {section.items.map((item, idx) => (
                                                            <SpotlightCard
                                                                key={item.label}
                                                                className="cursor-pointer h-[140px] hover:scale-105 transition-all duration-300 hover:shadow-lg flex items-center justify-center"
                                                                onClick={() => handleMaterialClick(item.path)}
                                                                style={{
                                                                    backgroundColor: isGlassmorphism
                                                                        ? 'rgba(255,255,255,0.6)'
                                                                        : themeStyles.theme.name === 'dark'
                                                                            ? 'rgba(255,255,255,0.1)'
                                                                            : themeStyles.theme.name === 'minimalist'
                                                                                ? '#ffffff'
                                                                                : themeStyles.theme.colors.cardBackground,
                                                                    borderColor: isGlassmorphism ? 'rgba(255,255,255,0.5)' : themeStyles.border,
                                                                    backdropFilter: isGlassmorphism ? 'blur(8px)' : undefined,
                                                                    WebkitBackdropFilter: isGlassmorphism ? 'blur(8px)' : undefined,
                                                                    boxShadow: isGlassmorphism ? '0 4px 16px rgba(0,0,0,0.08)' : undefined,
                                                                    ...(isGlassmorphism ? {} : themeStyles.cardStyle)
                                                                }}
                                                            >
                                                                <CardContent className="p-4 md:p-6 text-center flex-1 flex flex-col justify-center h-full">
                                                                    <h3 className={cn(
                                                                        "font-semibold w-full break-words leading-relaxed",
                                                                        isNoteTheme ? "text-xl" : "text-sm"
                                                                    )} style={{
                                                                        color: themeStyles.textPrimary,
                                                                        fontFamily: getFontFamily(dashboardFont),
                                                                        fontWeight: isNoteTheme ? 600 : 600
                                                                    }}>{item.label}</h3>
                                                                </CardContent>
                                                            </SpotlightCard>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                </motion.div>

                            </div>
                        </div>
                    </div>
                </StudentLayout >
                {/* Full-screen loading overlay during navigation transitions */}
                <AnimatePresence>
                    {isPending && <LoadingOverlay />}
                </AnimatePresence >
            </div >
        </div >
    );
};

export default ExamSelectionPortal;
