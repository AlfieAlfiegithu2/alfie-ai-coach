import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import StudentLayout from '@/components/StudentLayout';
import { supabase } from '@/integrations/supabase/client';
import SpotlightCard from '@/components/SpotlightCard';
import { useThemeStyles } from '@/hooks/useThemeStyles';
import LottieLoadingAnimation from '@/components/animations/LottieLoadingAnimation';
import { toast } from 'sonner';

interface SkillTest {
    id: string;
    title: string;
    test_order: number;
}

const SynonymMapView = () => {
    const navigate = useNavigate();
    const themeStyles = useThemeStyles();
    const [tests, setTests] = useState<SkillTest[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadTests();
    }, []);

    const loadTests = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('skill_tests')
                .select('id, title, test_order')
                .eq('skill_slug', 'synonym-match')
                .order('test_order', { ascending: true });

            if (error) throw error;
            setTests(data || []);
        } catch (error) {
            console.error('Error loading synonym tests:', error);
            toast.error('Failed to load synonym tests');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: themeStyles.theme.name === 'dark' ? themeStyles.theme.colors.background : 'transparent' }}>
                <LottieLoadingAnimation size="lg" message="Loading synonym tests..." />
            </div>
        );
    }

    return (
        <div
            className="min-h-screen relative"
            style={{
                backgroundColor: themeStyles.theme.name === 'dark' ? themeStyles.theme.colors.background : 'transparent'
            }}
        >
            <div className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed"
                style={{
                    backgroundImage: themeStyles.theme.name === 'note' || themeStyles.theme.name === 'minimalist' || themeStyles.theme.name === 'dark'
                        ? 'none'
                        : `url('/1000031207.png')`,
                    backgroundColor: themeStyles.backgroundImageColor
                }} />
            <div className="relative z-10">
                <StudentLayout title="Synonym Match Tests">
                    <div className="min-h-screen py-12">
                        <div className="container mx-auto px-4">
                            <div className="max-w-4xl mx-auto">
                                <div className="mb-8 text-center">
                                    <h1 className="text-4xl font-bold mb-2" style={{ color: themeStyles.textPrimary }}>Synonym Match Tests</h1>
                                    <p className="text-lg" style={{ color: themeStyles.textSecondary }}>Select a test to practice your synonym matching skills</p>
                                </div>

                                {tests.length > 0 ? (
                                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                        {tests.map((test) => (
                                            <SpotlightCard
                                                key={test.id}
                                                className="cursor-pointer h-[140px] hover:scale-105 transition-all duration-300 hover:shadow-lg flex items-center justify-center"
                                                onClick={() => navigate(`/skills/synonym-match/test/${test.id}`)}
                                                style={{
                                                    backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.8)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground,
                                                    borderColor: themeStyles.border,
                                                    ...themeStyles.cardStyle
                                                }}
                                            >
                                                <CardContent className="p-3 md:p-4 text-center flex items-center justify-center h-full w-full">
                                                    <h3 className="font-semibold text-lg" style={{ color: themeStyles.textPrimary }}>
                                                        Test {test.test_order}: {test.title}
                                                    </h3>
                                                </CardContent>
                                            </SpotlightCard>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <p className="text-lg mb-4" style={{ color: themeStyles.textSecondary }}>No synonym match tests available yet</p>
                                        <Button
                                            onClick={() => navigate('/dashboard')}
                                            variant="outline"
                                            style={{
                                                borderColor: themeStyles.border,
                                                color: themeStyles.textPrimary,
                                                backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = themeStyles.hoverBg}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground}
                                        >
                                            Back to Dashboard
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </StudentLayout>
            </div>
        </div>
    );
};

export default SynonymMapView;
