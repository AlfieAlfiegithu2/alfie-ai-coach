import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import StudentLayout from "@/components/StudentLayout";
import SpotlightCard from "@/components/SpotlightCard";
import { CardContent } from "@/components/ui/card";
import { useThemeStyles } from "@/hooks/useThemeStyles";
import { Button } from "@/components/ui/button";

interface DictationLevel {
    id: string;
    name: string;
    slug: string;
}

const DictationLevels = () => {
    const [levels, setLevels] = useState<DictationLevel[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const location = useLocation();
    const themeStyles = useThemeStyles();
    const isNoteTheme = themeStyles.theme.name === 'note';

    const basePath = location.pathname.includes('/skills/listening-for-details')
        ? '/skills/listening-for-details'
        : '/dictation';

    useEffect(() => {
        document.title = "Listening for Details | Alfie";
        loadData();
    }, []);

    // Ensure background covers whole body for note theme
    useEffect(() => {
        if (isNoteTheme) {
            const originalHtmlBg = document.documentElement.style.backgroundColor;
            const originalBodyBg = document.body.style.backgroundColor;
            document.documentElement.style.backgroundColor = '#FEF9E7';
            document.body.style.backgroundColor = '#FEF9E7';
            return () => {
                document.documentElement.style.backgroundColor = originalHtmlBg;
                document.body.style.backgroundColor = originalBodyBg;
            };
        }
    }, [isNoteTheme]);

    const loadData = async () => {
        setLoading(true);
        try {
            const { data: levelsData, error: levelsError } = await (supabase as any)
                .from("dictation_levels")
                .select("id, name, slug")
                .order("order_index");

            if (levelsError) throw levelsError;
            setLevels(levelsData || []);
        } catch (err) {
            console.error("Error loading levels:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative bg-[#FEF9E7]">
            {isNoteTheme && (
                <style>{`
                    body, html, #root { background-color: #FEF9E7 !important; }
                `}</style>
            )}
            <div className="relative z-10">
                <StudentLayout title="" showBackButton={false} transparentBackground={true}>
                    <div className="max-w-6xl mx-auto px-4 py-8">
                        {/* Custom Back Button */}
                        <div className="flex items-center mb-12">
                            <Button
                                variant="ghost"
                                onClick={() => navigate('/ielts-portal')}
                                className="hover:bg-[#A68B5B]/10 hover:text-[#8B6914] transition-all rounded-full px-5 py-2 font-bold"
                                style={{ color: '#5D4E37', border: '1px solid #E8D5A3', backgroundColor: '#FFFDF5' }}
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back to Portal
                            </Button>
                        </div>

                        {/* Header & Explanation */}
                        <div className="text-center mb-16 space-y-4">
                            <h1 className="text-4xl md:text-6xl font-black font-nunito tracking-tight" style={{ color: '#5D4E37' }}>
                                Listening for Details
                            </h1>
                            <p className="max-w-2xl mx-auto text-lg md:text-xl font-medium opacity-80 leading-relaxed" style={{ color: '#8B6914', fontFamily: "'Outfit', sans-serif" }}>
                                Improve your listening precision by transcribing sentences word-for-word.
                                Master English accents and pick up every detail.
                            </p>
                        </div>

                        {/* Level Cards */}
                        {loading ? (
                            <div className="flex justify-center py-24">
                                <div className="w-10 h-10 border-4 border-amber-600/30 border-t-amber-600 rounded-full animate-spin" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-16 px-4">
                                {levels.map((level) => (
                                    <SpotlightCard
                                        key={level.id}
                                        className="cursor-pointer h-[200px] hover:scale-105 transition-all duration-500 hover:shadow-[0_20px_50px_rgba(139,105,20,0.15)] flex items-center justify-center group rounded-[2.5rem] border-2"
                                        onClick={() => navigate(`${basePath}/${level.slug}`)}
                                        style={{
                                            backgroundColor: '#FFFDF5',
                                            borderColor: '#E8D5A3'
                                        }}
                                    >
                                        <CardContent className="p-8 text-center flex items-center justify-center h-full w-full">
                                            <h2 className="text-4xl font-black font-nunito tracking-tight group-hover:text-[#D97706] transition-colors" style={{ color: '#5D4E37' }}>
                                                {level.name}
                                            </h2>
                                        </CardContent>
                                    </SpotlightCard>
                                ))}
                            </div>
                        )}
                    </div>
                </StudentLayout>
            </div>
        </div>
    );
};

export default DictationLevels;
