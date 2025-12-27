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
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Check, Star, Zap, Crown, ChevronRight, BookOpen, Shield, FileText, Receipt, Settings, LineChart, Users, Target, Heart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import SettingsModal from "@/components/SettingsModal";

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
    comingSoon?: boolean;
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
        comingSoon: true,
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
        comingSoon: true,
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
        comingSoon: true,
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
        comingSoon: true,
        route: '/nclex',
        sections: [
            {
                title: 'Study Portal',
                items: [
                    { label: 'Go to Portal', path: '/nclex' }
                ]
            }
        ]
    },
    {
        id: 'wordbook',
        title: 'My Word Book',
        route: '/vocabulary',
        sections: [
            {
                title: 'Your Library',
                items: [
                    { label: 'Review All Words', path: '/vocabulary' }
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

const SETTINGS_SECTION: ExamType = {
    id: 'settings',
    title: 'Settings',
    route: '/settings',
    sections: []
};

const ABOUT_SECTION: ExamType = {
    id: 'about',
    title: 'About English Aidol',
    route: '/about',
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
    const [savedWords, setSavedWords] = useState<any[]>([]);
    const [loadingWords, setLoadingWords] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const { user, profile } = useAuth();



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
    const [nickname, setNickname] = useState<string>('');

    const fetchNickname = async () => {
        if (!user) return;

        // 1. LocalStorage
        try {
            const cached = localStorage.getItem(`nickname_${user.id}`);
            if (cached) {
                const parsed = JSON.parse(cached);
                if (parsed.nickname) setNickname(parsed.nickname);
            }
        } catch (e) { }

        // 2. Supabase
        const { data } = await supabase
            .from('user_preferences')
            .select('preferred_name')
            .eq('user_id', user.id)
            .maybeSingle();

        if (data?.preferred_name) {
            setNickname(data.preferred_name);
            localStorage.setItem(`nickname_${user.id}`, JSON.stringify({
                nickname: data.preferred_name,
                timestamp: Date.now()
            }));
        }
    };

    useEffect(() => {
        fetchNickname();

        const handleStorage = (e: StorageEvent) => {
            if (e.key === `nickname_${user?.id}` || e.key === 'language-updated') {
                fetchNickname();
            }
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, [user]);

    useEffect(() => {
        if (hoveredExam.id === 'wordbook' && user) {
            const fetchWords = async () => {
                setLoadingWords(true);
                const { data } = await supabase
                    .from('user_vocabulary')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(50);
                if (data) setSavedWords(data);
                setLoadingWords(false);
            };
            fetchWords();
        }
    }, [hoveredExam.id, user]);

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

    // Enhanced Theme-aware Selection & Hover colors
    const activeSelectionBg = isNoteTheme ? "#E8D5A366"
        : isGlassmorphism ? "rgba(255, 255, 255, 0.4)"
            : themeStyles.theme.colors.buttonPrimary + "40";

    const hoverItemBg = isNoteTheme ? "#E8D5A333"
        : isGlassmorphism ? "rgba(255, 255, 255, 0.2)"
            : themeStyles.theme.colors.buttonPrimary + "15";

    // Loading overlay that forces Note Theme background
    // Shared LoadingOverlay is now used below

    return (
        <div
            className="min-h-screen relative overflow-hidden"
            style={{
                background: isGlassmorphism ? mainBg : undefined,
                backgroundColor: !isGlassmorphism ? (isNoteTheme ? mainBg : themeStyles.theme.colors.background) : undefined,
                color: textColor,
                fontFamily: getFontFamily(dashboardFont),
                // Inject custom colors as CSS variables for Tailwind usage
                "--theme-hover": hoverItemBg,
                "--theme-active": activeSelectionBg
            } as React.CSSProperties}
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
                            className="w-full md:w-[260px] lg:w-[300px] h-full flex flex-col border-r z-20"
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
                            <button
                                onClick={() => setHoveredExam(ABOUT_SECTION)}
                                className="px-8 py-8 shrink-0 flex items-center gap-4 text-left transition-opacity hover:opacity-80 w-full outline-none"
                            >
                                <img src="/1000031328.png" alt="English Aidol" className="w-16 h-16 object-contain rounded-xl" />
                                <div>
                                    <p className="text-xl font-bold tracking-tight" style={{ color: textColor }}>
                                        Hi, {nickname || (profile?.full_name ? profile.full_name.split(' ')[0] : 'there')}
                                    </p>
                                </div>
                            </button>



                            <div className="flex-1 overflow-y-auto px-6 pb-8" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                                {/* Exam List */}
                                <div className="space-y-1">
                                    {EXAM_TYPES.map((exam, index) => (
                                        <div key={exam.id}>
                                            <button
                                                onClick={() => setHoveredExam(exam)}
                                                className={cn(
                                                    "w-full text-left relative flex items-center py-3 px-4 transition-all duration-200 group outline-none rounded-lg",
                                                    hoveredExam.id === exam.id
                                                        ? isGlassmorphism ? "bg-white/40 shadow-sm border border-white/30 backdrop-blur-sm" : "bg-[var(--theme-active)]"
                                                        : "hover:bg-[var(--theme-hover)]"
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
                                    {/* Settings Button */}
                                    <button
                                        onClick={() => setHoveredExam(SETTINGS_SECTION)}
                                        className={cn(
                                            "w-full text-left relative flex items-center py-3 px-4 transition-all duration-200 group outline-none rounded-lg",
                                            hoveredExam.id === 'settings'
                                                ? isGlassmorphism ? "bg-white/40 shadow-sm border border-white/30 backdrop-blur-sm" : "bg-[var(--theme-active)]"
                                                : "hover:bg-[var(--theme-hover)]"
                                        )}
                                        style={{
                                            color: hoveredExam.id === 'settings' ? textColor : secondaryTextColor,
                                        }}
                                    >
                                        <div className="flex-1 relative z-10">
                                            <span className={cn(
                                                "text-base transition-all duration-200",
                                                hoveredExam.id === 'settings' ? "font-bold" : "font-medium",
                                            )} style={{ fontFamily: getFontFamily(dashboardFont) }}>
                                                Settings
                                            </span>
                                        </div>
                                        {hoveredExam.id === 'settings' && <ChevronRight className="w-4 h-4 opacity-50" />}
                                    </button>

                                    {/* Plans Button */}
                                    <button
                                        onClick={() => setHoveredExam(PLAN_SECTION)}
                                        className={cn(
                                            "w-full text-left relative flex items-center py-3 px-4 transition-all duration-200 group outline-none rounded-lg",
                                            hoveredExam.id === 'plans'
                                                ? isGlassmorphism ? "bg-white/40 shadow-sm border border-white/30 backdrop-blur-sm" : "bg-[var(--theme-active)]"
                                                : "hover:bg-[var(--theme-hover)]"
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



                                    {/* Links Divider */}
                                    <div className="w-full h-px opacity-20 my-2" style={{ backgroundColor: textColor }} />

                                    {/* Footer Links */}
                                    <div className="pt-2 gap-1 flex flex-col">
                                        <button
                                            onClick={() => setPoliciesOpen(!policiesOpen)}
                                            className="w-full text-left py-2 px-4 rounded-lg hover:bg-[var(--theme-hover)] text-sm transition-colors font-medium flex items-center justify-between group"
                                            style={{ color: secondaryTextColor, fontFamily: getFontFamily(dashboardFont) }}
                                        >
                                            <span>Policies</span>
                                            <ChevronRight className={cn("w-3.5 h-3.5 transition-transform opacity-50 group-hover:opacity-100", policiesOpen && "rotate-90")} />
                                        </button>

                                        {policiesOpen && (
                                            <div className="pl-6 space-y-1 animate-in slide-in-from-top-2 duration-200">
                                                <button
                                                    onClick={() => setHoveredExam(FAQ_SECTION)}
                                                    className="w-full text-left py-1.5 px-2 rounded-md hover:bg-[var(--theme-hover)] text-xs transition-colors opacity-70 hover:opacity-100"
                                                    style={{ color: secondaryTextColor, fontFamily: getFontFamily(dashboardFont) }}
                                                >
                                                    FAQ
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setHoveredExam(BLOG_SECTION);
                                                        handleMaterialClick(BLOG_SECTION.route);
                                                    }}
                                                    className="w-full text-left py-1.5 px-2 rounded-md hover:bg-[var(--theme-hover)] text-xs transition-colors opacity-70 hover:opacity-100"
                                                    style={{ color: secondaryTextColor, fontFamily: getFontFamily(dashboardFont) }}
                                                >
                                                    Blog
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setHoveredExam(SUPPORT_SECTION);
                                                        window.open(SUPPORT_SECTION.route, '_blank');
                                                    }}
                                                    className="w-full text-left py-1.5 px-2 rounded-md hover:bg-[var(--theme-hover)] text-xs transition-colors opacity-70 hover:opacity-100"
                                                    style={{ color: secondaryTextColor, fontFamily: getFontFamily(dashboardFont) }}
                                                >
                                                    Support
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setHoveredExam(PRIVACY_SECTION);
                                                        window.open(PRIVACY_SECTION.route, '_blank');
                                                    }}
                                                    className="w-full text-left py-1.5 px-2 rounded-md hover:bg-[var(--theme-hover)] text-xs transition-colors opacity-70 hover:opacity-100"
                                                    style={{ color: secondaryTextColor, fontFamily: getFontFamily(dashboardFont) }}
                                                >
                                                    Privacy Policy
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setHoveredExam(REFUND_SECTION);
                                                        window.open(REFUND_SECTION.route, '_blank');
                                                    }}
                                                    className="w-full text-left py-1.5 px-2 rounded-md hover:bg-[var(--theme-hover)] text-xs transition-colors opacity-70 hover:opacity-100"
                                                    style={{ color: secondaryTextColor, fontFamily: getFontFamily(dashboardFont) }}
                                                >
                                                    Refund Policy
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setHoveredExam(TERMS_SECTION);
                                                        window.open(TERMS_SECTION.route, '_blank');
                                                    }}
                                                    className="w-full text-left py-1.5 px-2 rounded-md hover:bg-[var(--theme-hover)] text-xs transition-colors opacity-70 hover:opacity-100"
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
                                className="relative min-h-full w-full flex flex-col items-center pt-4 px-8 lg:pt-4 lg:px-12"
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
                                    {hoveredExam.id !== 'about' && (
                                        <div className="mb-12 flex justify-center w-full">
                                            <h1 className={cn(
                                                "text-6xl md:text-7xl font-bold mb-4 tracking-tight text-center",
                                            )} style={{ color: textColor, fontFamily: getFontFamily(dashboardFont) }}>
                                                {hoveredExam.title}
                                            </h1>
                                        </div>
                                    )}

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
                                                            href={profile?.subscription_status === plan.id ? '#' : `http://localhost:3009/pay?plan=${plan.id}`}
                                                            className={cn(
                                                                "block w-full py-5 text-xl font-bold rounded-2xl transition-all text-center mt-auto",
                                                                profile?.subscription_status === plan.id ? "opacity-50 cursor-default" : "hover:opacity-90 hover:scale-105"
                                                            )}
                                                            style={{
                                                                backgroundColor: plan.popular ? accentColor : 'transparent',
                                                                color: plan.popular ? '#fff' : textColor,
                                                                border: plan.popular ? 'none' : `2px solid ${borderColor}`
                                                            }}
                                                            onClick={(e) => {
                                                                if (profile?.subscription_status === plan.id) e.preventDefault();
                                                            }}
                                                        >
                                                            {profile?.subscription_status === plan.id ? "Current Plan" : `Get ${plan.name}`}
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
                                    ) : hoveredExam.id === 'settings' ? (
                                        <div className="h-full w-full overflow-hidden">
                                            <SettingsModal
                                                inline
                                                open={true}
                                                onSettingsChange={() => {
                                                    fetchNickname();
                                                }}
                                            />
                                        </div>
                                    ) : hoveredExam.id === 'about' ? (
                                        <div className="max-w-6xl mx-auto w-full space-y-16 pt-0 pb-8">
                                            {/* Custom Styles for Sketchy Design */}
                                            <style>{`
                                                .sketchy-box {
                                                    border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px;
                                                }
                                                .sketchy-oval {
                                                    border-radius: 50% / 100% 100% 80% 80%;
                                                }
                                                .marker-highlight {
                                                    background-image: linear-gradient(120deg, #f4c4a8 0%, #f4c4a8 100%);
                                                    background-repeat: no-repeat;
                                                    background-size: 100% 40%;
                                                    background-position: 0 85%;
                                                }
                                                .wavy-underline {
                                                    text-decoration: underline;
                                                    text-decoration-style: wavy;
                                                    text-decoration-color: #e8a838;
                                                    text-decoration-thickness: 2px;
                                                    text-underline-offset: 4px;
                                                }
                                                ::selection {
                                                    background: #f4c4a8 !important;
                                                    color: inherit !important;
                                                    text-shadow: none !important;
                                                }
                                                ::-moz-selection {
                                                    background: #f4c4a8 !important;
                                                    color: inherit !important;
                                                    text-shadow: none !important;
                                                }
                                                ::-webkit-selection {
                                                    background: #f4c4a8 !important;
                                                    color: inherit !important;
                                                    text-shadow: none !important;
                                                }
                                            `}</style>

                                            {/* Hero Section */}
                                            <div className="grid lg:grid-cols-2 gap-16 items-center">
                                                {/* Left: Content */}
                                                <div className="flex flex-col items-start space-y-8">
                                                    {/* Hand-drawn label */}
                                                    <div className="relative inline-block mb-2">
                                                        <div
                                                            className="absolute inset-0 sketchy-oval transform -rotate-2"
                                                            style={{ border: `2px solid ${accentColor}` }}
                                                        />
                                                        <span
                                                            className="relative block px-5 py-2 text-[10px] font-bold tracking-[0.15em] uppercase"
                                                            style={{ color: textColor }}
                                                        >
                                                            AI-Powered Learning
                                                        </span>
                                                    </div>

                                                    <h1
                                                        className="text-5xl sm:text-6xl lg:text-7xl font-medium leading-[1.05] tracking-tight"
                                                        style={{ color: textColor, fontFamily: getFontFamily(dashboardFont) }}
                                                    >
                                                        Master English. <br />
                                                        <span className="marker-highlight inline-block px-1 transform -rotate-1">Score higher.</span> <br />
                                                        Dream bigger.
                                                    </h1>

                                                    <p
                                                        className="text-lg font-light leading-relaxed max-w-lg"
                                                        style={{ color: secondaryTextColor }}
                                                    >
                                                        Your AI-powered language coach that provides <span className="border-b-2 border-dashed" style={{ borderColor: accentColor }}>instant expert feedback</span> on speaking, writing, reading, and listening—available 24/7.
                                                    </p>

                                                    <div className="flex flex-wrap items-center gap-6 pt-4">
                                                        <button
                                                            className="sketchy-box px-8 py-4 font-bold text-xs uppercase tracking-widest flex items-center gap-3 transition-all hover:translate-x-[2px] hover:translate-y-[2px]"
                                                            style={{
                                                                backgroundColor: '#e8a838',
                                                                color: textColor,
                                                                border: `2px solid ${textColor}`,
                                                                boxShadow: `4px 4px 0px 0px ${textColor}`
                                                            }}
                                                            onClick={() => navigate('/ielts-portal')}
                                                        >
                                                            Start Learning
                                                        </button>
                                                        <button
                                                            className="sketchy-box px-8 py-4 font-bold text-xs uppercase tracking-widest transition-colors hover:bg-white/50"
                                                            style={{
                                                                backgroundColor: 'transparent',
                                                                color: textColor,
                                                                border: `2px solid ${textColor}`
                                                            }}
                                                            onClick={() => setHoveredExam(PLAN_SECTION)}
                                                        >
                                                            View Plans
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Right: Feature Card */}
                                                <div className="relative flex items-center justify-center lg:justify-end">
                                                    <div
                                                        className="w-full max-w-md sketchy-box p-8 relative z-10 transform rotate-1 transition-transform hover:rotate-0 duration-500"
                                                        style={{
                                                            backgroundColor: '#FFFDF8',
                                                            border: `2px solid ${textColor}`,
                                                            boxShadow: '0 4px 20px -2px rgba(26, 34, 52, 0.1)'
                                                        }}
                                                    >
                                                        {/* Tape effect */}
                                                        <div
                                                            className="absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-8 transform -rotate-2 opacity-60 shadow-sm"
                                                            style={{ backgroundColor: 'rgba(245, 242, 235, 0.8)', borderLeft: '1px solid rgba(255,255,255,0.5)', borderRight: '1px solid rgba(255,255,255,0.5)' }}
                                                        />

                                                        <div className="mb-6">
                                                            <span className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: textColor }}>
                                                                What We Offer
                                                            </span>
                                                        </div>

                                                        <h3
                                                            className="text-2xl font-medium leading-tight mb-2"
                                                            style={{ color: textColor, fontFamily: getFontFamily(dashboardFont) }}
                                                        >
                                                            Complete Exam Preparation
                                                        </h3>
                                                        <p
                                                            className="text-sm mb-8 font-light leading-relaxed"
                                                            style={{ color: secondaryTextColor }}
                                                        >
                                                            IELTS, TOEIC, TOEFL, PTE—practice all four skills with AI examiners calibrated to official scoring criteria.
                                                        </p>

                                                        <div className="space-y-4">
                                                            {['Speaking Mock Tests', 'Writing Feedback', 'Score Predictions', 'Vocabulary Builder'].map((item, i) => (
                                                                <div key={i} className="flex items-center gap-3">
                                                                    <Check className="w-5 h-5" style={{ color: accentColor }} />
                                                                    <span style={{ color: textColor }}>{item}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Stats Section */}
                                            <div className="py-16 border-t border-b" style={{ borderColor: `${textColor}20` }}>
                                                <div className="mb-12 text-center">
                                                    <div
                                                        className="inline-block sketchy-box px-4 py-1 mb-6 transform -rotate-1"
                                                        style={{ border: `2px solid ${textColor}` }}
                                                    >
                                                        <span className="font-bold text-xs tracking-widest uppercase" style={{ color: textColor }}>
                                                            Why Students Choose Us
                                                        </span>
                                                    </div>
                                                    <h2
                                                        className="text-4xl md:text-5xl max-w-3xl mx-auto leading-tight"
                                                        style={{ color: textColor, fontFamily: getFontFamily(dashboardFont) }}
                                                    >
                                                        Premium tutoring is <span className="marker-highlight px-2">expensive</span>. AI feedback is <span className="wavy-underline">instant & affordable</span>.
                                                    </h2>
                                                </div>

                                                {/* Stats Grid */}
                                                <div className="grid md:grid-cols-3 gap-12 mt-16">
                                                    {[
                                                        { value: '24/7', label: 'Available Anytime' },
                                                        { value: '90%', label: 'Cost Savings vs Tutors' },
                                                        { value: '<5s', label: 'Feedback Response' }
                                                    ].map((stat, i) => (
                                                        <div key={i} className="relative text-center group">
                                                            <div
                                                                className="sketchy-box p-8 transition-transform duration-300 group-hover:-translate-y-2"
                                                                style={{
                                                                    border: `2px solid ${textColor}`,
                                                                    backgroundColor: '#FFFDF8',
                                                                    boxShadow: `4px 4px 0px 0px ${textColor}`
                                                                }}
                                                            >
                                                                <span
                                                                    className="block text-5xl font-medium mb-2"
                                                                    style={{ color: textColor, fontFamily: getFontFamily(dashboardFont) }}
                                                                >
                                                                    {stat.value}
                                                                </span>
                                                                <span
                                                                    className="text-xs font-bold tracking-widest uppercase"
                                                                    style={{ color: secondaryTextColor }}
                                                                >
                                                                    {stat.label}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* AI Precision Section */}
                                            <div className="py-16 -mx-8 sm:-mx-12 lg:-mx-20 px-8 sm:px-12 lg:px-20">
                                                <div className="text-center mb-12">
                                                    <div
                                                        className="inline-block sketchy-box px-4 py-1 mb-6 transform rotate-1"
                                                        style={{ border: `2px solid ${textColor}` }}
                                                    >
                                                        <span className="font-bold text-xs tracking-widest uppercase" style={{ color: textColor }}>
                                                            AI Precision
                                                        </span>
                                                    </div>
                                                    <h2
                                                        className="text-4xl md:text-5xl max-w-3xl mx-auto leading-tight mb-4"
                                                        style={{ color: textColor, fontFamily: getFontFamily(dashboardFont) }}
                                                    >
                                                        Scoring accuracy that <span className="marker-highlight px-2">rivals human examiners</span>
                                                    </h2>
                                                    <p
                                                        className="text-lg opacity-80 max-w-2xl mx-auto"
                                                        style={{ color: secondaryTextColor }}
                                                    >
                                                        Our AI models are trained on thousands of official exam samples and calibrated against certified examiner scores.
                                                    </p>
                                                </div>

                                                {/* Precision Cards */}
                                                <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                                                    {/* Speaking Analysis Card */}
                                                    <div
                                                        className="sketchy-box p-8 relative"
                                                        style={{
                                                            border: `2px solid ${textColor}`,
                                                            backgroundColor: '#FFFDF8',
                                                            boxShadow: `4px 4px 0px 0px ${textColor}`
                                                        }}
                                                    >
                                                        {/* Decorative Loop SVG */}
                                                        <svg
                                                            className="absolute -top-10 left-1/2 -translate-x-1/2 w-16 h-16 opacity-80 pointer-events-none"
                                                            style={{ color: textColor }}
                                                            viewBox="0 0 100 100"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeWidth="1.5"
                                                        >
                                                            <path d="M50 40C30 40 20 60 45 70C70 80 85 50 65 35C45 20 15 30 10 55" strokeLinecap="round" strokeLinejoin="round" />
                                                        </svg>

                                                        <span
                                                            className="absolute -top-2 right-6 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transform -rotate-2 shadow-sm z-10"
                                                            style={{ backgroundColor: '#1a2234', color: '#fff' }}
                                                        >
                                                            Speaking
                                                        </span>

                                                        <h3
                                                            className="text-2xl font-medium mb-4 relative z-10"
                                                            style={{ color: textColor, fontFamily: getFontFamily(dashboardFont) }}
                                                        >
                                                            Voice & Fluency Analysis
                                                        </h3>

                                                        <div className="space-y-4 mb-6 relative z-10">
                                                            {[
                                                                { metric: '95%', label: 'Pronunciation accuracy detection' },
                                                                { metric: '±0.5', label: 'Band score margin vs human examiners' },
                                                                { metric: '12+', label: 'Fluency metrics analyzed per response' }
                                                            ].map((item, i) => (
                                                                <div key={i} className="flex items-center gap-4">
                                                                    <span
                                                                        className="text-2xl font-bold min-w-[60px]"
                                                                        style={{ color: accentColor }}
                                                                    >
                                                                        {item.metric}
                                                                    </span>
                                                                    <span
                                                                        className="text-sm"
                                                                        style={{ color: secondaryTextColor }}
                                                                    >
                                                                        {item.label}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        <p
                                                            className="text-sm italic border-l-2 pl-4 relative z-10"
                                                            style={{ color: secondaryTextColor, borderColor: accentColor }}
                                                        >
                                                            "Analyzes pronunciation, intonation, pace, hesitation patterns, and lexical resource in real-time."
                                                        </p>
                                                    </div>

                                                    {/* Writing Analysis Card */}
                                                    <div
                                                        className="sketchy-box p-8 relative"
                                                        style={{
                                                            border: `2px solid ${textColor}`,
                                                            backgroundColor: '#FFFDF8',
                                                            boxShadow: `4px 4px 0px 0px ${textColor}`
                                                        }}
                                                    >
                                                        {/* Decorative Sparkle SVG */}
                                                        <svg
                                                            className="absolute -top-8 -right-4 w-16 h-16 opacity-80 transform rotate-12 pointer-events-none"
                                                            style={{ color: '#e8a838' }}
                                                            viewBox="0 0 100 100"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeWidth="2"
                                                        >
                                                            <path d="M50 10 L55 40 L85 45 L60 60 L65 90 L50 75 L35 90 L40 60 L15 45 L45 40 Z" strokeLinecap="round" strokeLinejoin="round" />
                                                        </svg>

                                                        <span
                                                            className="absolute -top-2 right-6 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transform rotate-2 shadow-sm z-10"
                                                            style={{ backgroundColor: '#e8a838', color: '#fff' }}
                                                        >
                                                            Writing
                                                        </span>

                                                        <h3
                                                            className="text-2xl font-medium mb-4 relative z-10"
                                                            style={{ color: textColor, fontFamily: getFontFamily(dashboardFont) }}
                                                        >
                                                            Essay & Task Analysis
                                                        </h3>

                                                        <div className="space-y-4 mb-6 relative z-10">
                                                            {[
                                                                { metric: '93%', label: 'Agreement with human examiner scores' },
                                                                { metric: '4', label: 'Official criteria scored (TA, CC, LR, GRA)' },
                                                                { metric: '50+', label: 'Grammar & coherence checks per essay' }
                                                            ].map((item, i) => (
                                                                <div key={i} className="flex items-center gap-4">
                                                                    <span
                                                                        className="text-2xl font-bold min-w-[60px]"
                                                                        style={{ color: accentColor }}
                                                                    >
                                                                        {item.metric}
                                                                    </span>
                                                                    <span
                                                                        className="text-sm"
                                                                        style={{ color: secondaryTextColor }}
                                                                    >
                                                                        {item.label}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        <p
                                                            className="text-sm italic border-l-2 pl-4 relative z-10"
                                                            style={{ color: secondaryTextColor, borderColor: accentColor }}
                                                        >
                                                            "Instant feedback on task achievement, coherence, lexical resource, and grammatical range."
                                                        </p>

                                                        {/* Decorative Underline SVG */}
                                                        <svg
                                                            className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-32 h-4 pointer-events-none"
                                                            style={{ color: '#e8a838' }}
                                                            viewBox="0 0 100 10"
                                                            preserveAspectRatio="none"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeWidth="2"
                                                        >
                                                            <path d="M0 5 Q 25 10 50 5 T 100 5" strokeLinecap="round" />
                                                        </svg>


                                                    </div>
                                                </div>
                                            </div>

                                            {/* Testimonials Section */}
                                            <div className="py-12 relative">
                                                {/* SVG Marker Definition */}
                                                <svg style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} aria-hidden="true">
                                                    <defs>
                                                        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                                            <polygon points="0 0, 10 3.5, 0 7" fill={textColor} />
                                                        </marker>
                                                    </defs>
                                                </svg>

                                                <div className="text-center mb-20 relative">
                                                    <h2
                                                        className="text-4xl md:text-5xl font-medium relative inline-block"
                                                        style={{ color: textColor, fontFamily: getFontFamily(dashboardFont) }}
                                                    >
                                                        What our students say
                                                        {/* Decorative Arrow */}
                                                        <svg className="absolute -bottom-16 -right-12 w-24 h-24 hidden md:block" viewBox="0 0 100 100" fill="none">
                                                            <path d="M10,50 Q30,20 60,10" stroke={accentColor} strokeWidth="2" fill="none" markerEnd="url(#arrowhead)" transform="rotate(20, 50, 50)" />
                                                        </svg>
                                                    </h2>
                                                </div>

                                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10 px-6">
                                                    {[
                                                        {
                                                            quote: "English Aidol transformed my IELTS preparation. I achieved a Band 8.0 in just 3 weeks solely using the AI feedback.",
                                                            name: "Sarah J.",
                                                            role: "University Student",
                                                            badge: null,
                                                            badgeColor: "navy",
                                                            rotate: -2
                                                        },
                                                        {
                                                            quote: "The writing feedback is incredibly detailed. It caught grammar mistakes my tutor missed and helped me understand exactly how to improve.",
                                                            name: "Michael T.",
                                                            role: "Software Engineer",
                                                            badge: "The Scientist",
                                                            badgeColor: "orange",
                                                            rotate: 1
                                                        },
                                                        {
                                                            quote: "As a busy professional, practicing speaking at midnight is a game-changer. The AI gives me honest feedback without judgment.",
                                                            name: "Jennifer L.",
                                                            role: "Marketing Manager",
                                                            badge: null,
                                                            badgeColor: "navy",
                                                            rotate: -1
                                                        },
                                                        {
                                                            quote: "I was skeptical about AI scoring, but the band predictions were incredibly accurate—within 0.5 of my actual exam result.",
                                                            name: "David K.",
                                                            role: "Medical Professional",
                                                            badge: null,
                                                            badgeColor: "orange",
                                                            rotate: 2
                                                        },
                                                        {
                                                            quote: "The vocabulary builder helped me learn 500+ academic words in a month. The spaced repetition system really works.",
                                                            name: "Emma W.",
                                                            role: "Graduate Student",
                                                            badge: "The Scholar",
                                                            badgeColor: "navy",
                                                            rotate: -1
                                                        },
                                                        {
                                                            quote: "Finally, affordable English prep that actually works! English Aidol gave me the same quality feedback as a private tutor.",
                                                            name: "Carlos M.",
                                                            role: "Architect",
                                                            badge: null,
                                                            badgeColor: "orange",
                                                            rotate: 1
                                                        }
                                                    ].map((testimonial, i) => (
                                                        <div
                                                            key={i}
                                                            className="relative group transition-transform hover:-translate-y-2 duration-500"
                                                            style={{
                                                                transform: `rotate(${testimonial.rotate}deg)`
                                                            }}
                                                        >
                                                            <div
                                                                className="sketchy-box p-8 relative bg-[#FFFDF8]"
                                                                style={{
                                                                    border: `2px solid ${textColor}`,
                                                                    boxShadow: `4px 4px 0px 0px ${textColor}`
                                                                }}
                                                            >
                                                                {/* Badge */}
                                                                {testimonial.badge && (
                                                                    <span
                                                                        className={`absolute -top-4 ${i % 2 === 0 ? '-left-2 -rotate-3' : '-right-2 rotate-2'} px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white shadow-sm z-10`}
                                                                        style={{
                                                                            backgroundColor: testimonial.badgeColor === 'navy' ? textColor : '#e8a838'
                                                                        }}
                                                                    >
                                                                        {testimonial.badge}
                                                                    </span>
                                                                )}

                                                                {/* Quote */}
                                                                <p
                                                                    className="text-lg leading-relaxed mb-6 italic opacity-80"
                                                                    style={{ color: secondaryTextColor, fontFamily: 'Georgia, serif' }}
                                                                >
                                                                    "{testimonial.quote}"
                                                                </p>

                                                                {/* Author Info */}
                                                                <div className="relative z-10">
                                                                    <div className="flex gap-1 mb-2">
                                                                        {[...Array(5)].map((_, s) => (
                                                                            <Star key={s} className="w-3 h-3 fill-amber-400 text-amber-400" />
                                                                        ))}
                                                                    </div>
                                                                    <h4
                                                                        className="text-2xl font-serif mb-1"
                                                                        style={{ color: textColor }}
                                                                    >
                                                                        {testimonial.name}
                                                                    </h4>
                                                                    <p
                                                                        className="font-sans text-xs font-bold tracking-widest uppercase mb-1"
                                                                        style={{ color: accentColor }}
                                                                    >
                                                                        {testimonial.role}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Footer Note */}
                                            <div className="text-center pt-12 pb-8 space-y-6">
                                                <p
                                                    className="text-xs font-bold tracking-widest uppercase"
                                                    style={{ color: secondaryTextColor }}
                                                >
                                                    © 2026 English Aidol
                                                </p>
                                                <div className="max-w-2xl mx-auto space-y-3">
                                                    <p
                                                        className="text-[11px] leading-relaxed opacity-70"
                                                        style={{ color: secondaryTextColor }}
                                                    >
                                                        We securely store your practice data and audio recordings long-term so you can review your history, track progress, and receive better AI feedback over time.
                                                    </p>
                                                    <p
                                                        className="text-[11px] leading-relaxed opacity-70"
                                                        style={{ color: secondaryTextColor }}
                                                    >
                                                        All feedback and scores are AI-generated for learning purposes only. This is not an official test, does not guarantee future exam results, and does not constitute legal, immigration, or professional advice.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : hoveredExam.comingSoon ? (
                                        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center opacity-80 animate-in fade-in zoom-in-95 duration-500">

                                            <h2 className="text-3xl font-bold mb-4" style={{ color: textColor, fontFamily: getFontFamily(dashboardFont) }}>Coming Soon</h2>
                                            <p className="max-w-md text-lg leading-relaxed" style={{ color: secondaryTextColor }}>
                                                We are working hard to bring the <span className="font-semibold">{hoveredExam.title}</span> curriculum to English Aidol. Stay tuned for updates!
                                            </p>
                                        </div>
                                    ) : hoveredExam.id === 'wordbook' ? (
                                        <div className="w-full h-full flex flex-col">
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 pb-20">
                                                {loadingWords ? (
                                                    <div className="col-span-full flex justify-center py-20">
                                                        <LoadingAnimation size="md" />
                                                    </div>
                                                ) : savedWords.length > 0 ? (
                                                    savedWords.map((word, i) => (
                                                        <div
                                                            key={i}
                                                            className="p-6 rounded-2xl border transition-all hover:scale-[1.02]"
                                                            style={{
                                                                backgroundColor: isGlassmorphism ? 'rgba(255,255,255,0.4)' : themeStyles.theme.colors.cardBackground,
                                                                borderColor: borderColor,
                                                                boxShadow: isGlassmorphism ? '0 4px 16px rgba(0,0,0,0.05)' : undefined
                                                            }}
                                                        >
                                                            <div className="flex justify-between items-start mb-2">
                                                                <h3 className="text-xl font-bold" style={{ color: textColor, fontFamily: getFontFamily(dashboardFont) }}>{word.word}</h3>
                                                                <span className="text-xs px-2 py-1 rounded-full bg-black/5 opacity-60">
                                                                    {new Date(word.created_at).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                            <p className="text-base opacity-80 leading-relaxed" style={{ color: secondaryTextColor }}>{word.meaning || word.definition || "No definition saved."}</p>
                                                            {word.translation && (
                                                                <div className="mt-3 pt-3 border-t border-black/5">
                                                                    <p className="text-sm italic opacity-70" style={{ color: accentColor }}>{word.translation}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="col-span-full text-center py-20 opacity-60">
                                                        <h3 className="text-xl font-medium">No words saved yet</h3>
                                                        <p>Start your learning journey to build your vocabulary.</p>
                                                    </div>
                                                )}
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
