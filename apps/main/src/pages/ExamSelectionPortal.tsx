import { useNavigate } from 'react-router-dom';
import { CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import StudentLayout from '@/components/StudentLayout';
import SEO from '@/components/SEO';
import { Home, Palette } from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';
import { useTheme } from '@/contexts/ThemeContext';
import { themes, ThemeName } from '@/lib/themes';
import { useThemeStyles } from '@/hooks/useThemeStyles';

// Exam types available on the platform
const EXAM_TYPES = [
    {
        id: 'ielts',
        title: 'IELTS',
        route: '/ielts-portal'
    },
    {
        id: 'toeic',
        title: 'TOEIC',
        route: '/toeic-portal'
    },
    {
        id: 'toefl',
        title: 'TOEFL',
        route: '/toefl-portal'
    },
    {
        id: 'pte',
        title: 'PTE Academic',
        route: '/pte-portal'
    },
    {
        id: 'general',
        title: 'General English',
        route: '/general-portal'
    },
    {
        id: 'business',
        title: 'Business English',
        route: '/business-portal'
    },
    {
        id: 'nclex',
        title: 'NCLEX',
        route: '/nclex'
    }
];

const ExamSelectionPortal = () => {
    const navigate = useNavigate();
    const { themeName, setTheme } = useTheme();
    const themeStyles = useThemeStyles();
    const isNoteTheme = themeStyles.theme.name === 'note';

    const handleExamClick = (route: string) => {
        navigate(route);
    };

    return (
        <div
            className="min-h-screen relative"
            style={{
                backgroundColor: themeStyles.theme.name === 'dark' ? themeStyles.theme.colors.background : 'transparent'
            }}
        >
            <SEO
                title="Choose Your Test - English AI Dol"
                description="Select from IELTS, TOEIC, TOEFL, PTE, NCLEX, Business English, and more. AI-powered exam preparation with personalized practice and feedback."
                keywords="IELTS, TOEIC, TOEFL, PTE, NCLEX, English test, exam preparation, language test"
                type="website"
            />
            <div className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed"
                style={{
                    backgroundImage: themeStyles.theme.name === 'note' || themeStyles.theme.name === 'minimalist' || themeStyles.theme.name === 'dark'
                        ? 'none'
                        : `url('/1000031207.png')`,
                    backgroundColor: themeStyles.backgroundImageColor
                }} />
            <div className="relative z-10">
                <StudentLayout title="Choose Your Test" showBackButton fullWidth transparentBackground={true}>
                    <div className="max-w-4xl mx-auto px-4 space-y-6">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <button
                                onClick={() => navigate('/hero')}
                                className="inline-flex items-center gap-2 px-2 py-1 h-8 text-sm font-medium transition-colors rounded-md"
                                style={{
                                    color: themeStyles.textSecondary,
                                    backgroundColor: 'transparent'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.color = themeStyles.buttonPrimary;
                                    e.currentTarget.style.backgroundColor = themeStyles.hoverBg;
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.color = themeStyles.textSecondary;
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                            >
                                {!isNoteTheme && <Home className="h-4 w-4" />}
                                {isNoteTheme && <span>Home</span>}
                            </button>
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="inline-flex items-center gap-2 px-2 py-1 h-8 text-sm font-medium transition-colors rounded-md"
                                style={{
                                    color: themeStyles.textSecondary,
                                    backgroundColor: 'transparent'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.color = themeStyles.buttonPrimary;
                                    e.currentTarget.style.backgroundColor = themeStyles.hoverBg;
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.color = themeStyles.textSecondary;
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                            >
                                Dashboard
                            </button>
                            <div className="flex items-center gap-2">
                                {!isNoteTheme && <Palette className="h-4 w-4" style={{ color: themeStyles.textSecondary }} />}
                                <Select value={themeName} onValueChange={(value) => setTheme(value as ThemeName)}>
                                    <SelectTrigger
                                        className="w-[140px] h-8 text-sm border transition-colors"
                                        style={{
                                            backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.8)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground,
                                            borderColor: themeStyles.border,
                                            color: themeStyles.textPrimary
                                        }}
                                    >
                                        <SelectValue placeholder="Theme" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.values(themes).map((theme) => (
                                            <SelectItem key={theme.name} value={theme.name}>
                                                {theme.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Portal Title - Header Style */}
                        <div className="text-center py-4">
                            <h1 className="text-4xl font-bold" style={{ color: themeStyles.textPrimary }}>Choose Your Test</h1>
                        </div>

                        {/* Exam Selection Grid */}
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                                {EXAM_TYPES.map((exam) => {
                                    return (
                                        <SpotlightCard
                                            key={exam.id}
                                            className="cursor-pointer h-[140px] hover:scale-105 transition-all duration-300 hover:shadow-lg rounded-2xl flex items-center justify-center"
                                            onClick={() => handleExamClick(exam.route)}
                                            style={{
                                                backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.8)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground,
                                                borderColor: themeStyles.border,
                                                ...themeStyles.cardStyle
                                            }}
                                        >
                                            <CardContent className="p-4 md:p-6 text-center flex-1 flex flex-col justify-center">
                                                <h3 className="font-semibold text-sm" style={{ color: themeStyles.textPrimary }}>{exam.title}</h3>
                                            </CardContent>
                                        </SpotlightCard>
                                    );
                                })}
                            </div>
                        </div>

                    </div>
                </StudentLayout>
            </div>
        </div>
    );
};

export default ExamSelectionPortal;
