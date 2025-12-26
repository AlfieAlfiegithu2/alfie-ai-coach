import { useState, useTransition } from 'react';
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

const ExamSelectionPortal = () => {
    const navigate = useNavigate();
    const { themeName } = useTheme();
    const themeStyles = useThemeStyles();

    // Use useTransition for smoother concurrent navigation if available
    const [isPending, startTransition] = useTransition();

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
    // Explicitly fallback to BRIGHTER cream for cleaner premium paper feel
    const mainBg = isNoteTheme ? '#FFFAF0' : themeStyles.theme.colors.background;
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
                backgroundColor: mainBg,
                color: textColor,
                fontFamily: isNoteTheme ? 'Georgia, serif' : 'Arial, Helvetica, sans-serif'
            }}
        >
            <SEO
                title="Choose Your Test - English AI Dol"
                description="Select from IELTS, TOEIC, TOEFL, PTE, NCLEX, Business English, and more."
                keywords="IELTS, TOEIC, TOEFL, PTE, NCLEX, English test"
                type="website"
            />

            {/* Background Texture for Note Theme - ENHANCED PAPER FEEL */}
            {/* Background Texture for Note Theme - REMOVED GLOBAL TEXTURE */}

            <div className="relative z-10 h-screen flex flex-col">
                <StudentLayout title="Choose Your Test" showBackButton fullWidth transparentBackground={true} noPadding>

                    <div className="flex h-full md:h-screen w-full relative">

                        {/* LEFT SIDEBAR - Minimalist List */}
                        <motion.div
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                            className="w-full md:w-[300px] lg:w-[340px] h-full flex flex-col border-r z-20"
                            style={{
                                borderColor: borderColor,
                                backgroundColor: isNoteTheme ? 'transparent' : 'rgba(255,255,255,0.05)'
                            }}
                        >
                            {/* Left Sidebar Texture - Static */}
                            {isNoteTheme && (
                                <>
                                    <div
                                        className="absolute inset-0 pointer-events-none opacity-40 z-10"
                                        style={{
                                            backgroundImage: `url("https://www.transparenttextures.com/patterns/rice-paper-2.png")`,
                                            mixBlendMode: 'multiply'
                                        }}
                                    />
                                </>
                            )}
                            {/* Header / Navigation */}
                            <div className="p-8 pb-4 flex items-center justify-between shrink-0">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => navigate('/dashboard')}
                                    className="p-0 h-auto font-medium hover:bg-transparent"
                                    style={{ color: secondaryTextColor }}
                                >
                                    ← Dashboard
                                </Button>
                            </div>

                            {/* Title Area */}
                            <div className="px-8 py-6 shrink-0">
                                <h1 className="text-3xl font-bold tracking-tight" style={{
                                    color: textColor,
                                    fontFamily: isNoteTheme ? 'Georgia, serif' : 'inherit'
                                }}>
                                    Exam Selection
                                </h1>
                            </div>

                            {/* Exam List */}
                            <div className="flex-1 overflow-y-auto px-6 space-y-1 pb-8 scrollbar-hide">
                                {EXAM_TYPES.map((exam) => (
                                    <button
                                        key={exam.id}
                                        onMouseEnter={() => setHoveredExam(exam)}
                                        onClick={() => setHoveredExam(exam)}
                                        className={cn(
                                            "w-full text-left relative flex items-center py-3 px-4 transition-all duration-200 rounded-lg group outline-none",
                                        )}
                                        style={{ color: hoveredExam.id === exam.id ? textColor : secondaryTextColor }}
                                    >
                                        <div className="flex-1 relative z-10">
                                            <span className={cn(
                                                "text-lg transition-all duration-200",
                                                hoveredExam.id === exam.id ? "font-bold tracking-wide" : "font-normal"
                                            )} style={{ fontFamily: isNoteTheme ? 'Georgia, serif' : 'inherit' }}>
                                                {exam.title}
                                            </span>

                                            {/* Minimalist underline indicator */}
                                            {hoveredExam.id === exam.id && (
                                                <motion.div
                                                    layoutId="underline"
                                                    className="absolute -bottom-1 left-0 h-[2px] w-full"
                                                    style={{ backgroundColor: accentColor }}
                                                    initial={{ scaleX: 0 }}
                                                    animate={{ scaleX: 1 }}
                                                    transition={{ duration: 0.2 }}
                                                />
                                            )}
                                        </div>
                                    </button>
                                ))}
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
                                {/* Right Content Texture - Parallax Effect */}
                                {isNoteTheme && (
                                    <>
                                        <div
                                            className="absolute inset-[-100px] pointer-events-none opacity-40 z-0 h-[150%] origin-top"
                                            style={{
                                                backgroundImage: `url("https://www.transparenttextures.com/patterns/rice-paper-2.png")`,
                                                mixBlendMode: 'multiply',
                                                backgroundRepeat: 'repeat',
                                                transform: 'translateZ(-10px) scale(3)'
                                            }}
                                        />
                                    </>
                                )}

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
                                    <div className="mb-10">
                                        <h1 className="text-5xl md:text-6xl font-bold mb-4 tracking-tight" style={{
                                            color: textColor,
                                            fontFamily: isNoteTheme ? 'Georgia, serif' : 'inherit'
                                        }}>
                                            {hoveredExam.title}
                                        </h1>
                                    </div>

                                    {/* Sections */}
                                    <div className="space-y-12">
                                        {hoveredExam.sections.map((section, sectionIdx) => (
                                            <div key={sectionIdx}>
                                                <h2 className="text-2xl font-bold mb-6 flex items-center" style={{
                                                    color: textColor,
                                                    fontFamily: isNoteTheme ? 'Georgia, serif' : 'inherit'
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
                                                                backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.8)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground,
                                                                borderColor: themeStyles.border,
                                                                ...themeStyles.cardStyle
                                                            }}
                                                        >
                                                            <CardContent className="p-4 md:p-6 text-center flex-1 flex flex-col justify-center h-full">
                                                                <h3 className="font-semibold text-sm w-full break-words leading-relaxed" style={{
                                                                    color: themeStyles.textPrimary,
                                                                    fontFamily: isNoteTheme ? 'Georgia, serif' : 'inherit',
                                                                    fontWeight: isNoteTheme ? 600 : 600
                                                                }}>{item.label}</h3>
                                                            </CardContent>
                                                        </SpotlightCard>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                </motion.div>
                            </div>
                        </div>
                    </div>
                </StudentLayout>
                {/* Full-screen loading overlay during navigation transitions */}
                <AnimatePresence>
                    {isPending && <LoadingOverlay />}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default ExamSelectionPortal;
