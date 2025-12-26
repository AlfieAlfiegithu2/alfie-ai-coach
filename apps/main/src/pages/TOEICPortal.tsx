import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Headphones,
  BookOpen,
  Clock,
  Home,
  Palette
} from "lucide-react";
import StudentLayout from "@/components/StudentLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import LoadingAnimation from "@/components/animations/LoadingAnimation";
import { useThemeStyles } from "@/hooks/useThemeStyles";
import { useTheme } from "@/contexts/ThemeContext";
import { themes, ThemeName } from "@/lib/themes";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SpotlightCard from "@/components/SpotlightCard";

interface TOEICTest {
  id: string;
  test_name: string;
  skill_category: string;
  created_at: string;
}

const TOEICPortal = () => {
  const navigate = useNavigate();
  const { themeName, setTheme } = useTheme();
  const themeStyles = useThemeStyles();
  const isNoteTheme = themeStyles.theme.name === 'note';

  const [listeningTests, setListeningTests] = useState<TOEICTest[]>([]);
  const [readingTests, setReadingTests] = useState<TOEICTest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTests();
  }, []);

  const loadTests = async () => {
    try {
      // Load Listening tests 
      const { data: listening, error: listeningError } = await supabase
        .from('tests')
        .select('*')
        .eq('test_type', 'TOEIC')
        .eq('skill_category', 'Listening')
        .order('created_at', { ascending: false });

      if (listeningError) throw listeningError;
      setListeningTests(listening || []);

      // Load Reading tests
      const { data: reading, error: readingError } = await supabase
        .from('tests')
        .select('*')
        .eq('test_type', 'TOEIC')
        .eq('skill_category', 'Reading')
        .order('created_at', { ascending: false });

      if (readingError) throw readingError;
      setReadingTests(reading || []);
    } catch (error) {
      console.error('Error loading tests:', error);
      toast.error('Failed to load tests');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: themeStyles.theme.name === 'dark' ? themeStyles.theme.colors.background : 'transparent' }}>
        <LoadingAnimation />
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen relative ${isNoteTheme ? 'font-serif' : ''}`}
      style={{
        backgroundColor: themeStyles.theme.name === 'dark' ? themeStyles.theme.colors.background : 'transparent'
      }}
    >
      {/* Background Texture for Note Theme - ENHANCED NOTEBOOK EFFECT */}
      {(themeStyles.theme.name === 'note') && (
        <>
          <div
            className="absolute inset-0 pointer-events-none opacity-50 z-0"
            style={{
              backgroundColor: '#FEF9E7',
              backgroundImage: `url("https://www.transparenttextures.com/patterns/cream-paper.png")`,
              mixBlendMode: 'multiply'
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none opacity-30 z-0"
            style={{
              backgroundImage: `url("https://www.transparenttextures.com/patterns/notebook.png")`,
              mixBlendMode: 'multiply',
              filter: 'contrast(1.2)'
            }}
          />
        </>
      )}

      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed"
        style={{
          backgroundImage: isNoteTheme || themeStyles.theme.name === 'minimalist' || themeStyles.theme.name === 'dark'
            ? 'none'
            : `url('/lovable-uploads/38d81cb0-fd21-4737-b0f5-32bc5d0ae774.png')`,
          backgroundColor: isNoteTheme ? '#FEF9E7' : themeStyles.backgroundImageColor
        }} />
      <div className="relative z-10">
        <StudentLayout title="TOEIC Test Portal" showBackButton>
          <div className="space-y-3 md:space-y-4 max-w-6xl mx-auto px-3 md:px-4">
            {/* Header Controls */}
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

            {/* Title */}
            <div className="text-center space-y-4 mb-8">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-center tracking-tight font-nunito" style={{ color: themeStyles.textPrimary }}>
                TOEIC Test Portal
              </h1>
              <p className="text-sm md:text-base max-w-2xl mx-auto" style={{ color: themeStyles.textSecondary }}>
                Practice authentic TOEIC Listening and Reading tests and track your progress
              </p>
            </div>

            {/* Listening Section */}
            <div className="space-y-4 mb-8">
              <h2 className="text-xl md:text-2xl font-bold mb-4 flex items-center gap-2 font-nunito" style={{ color: themeStyles.textPrimary }}>
                <Headphones className="w-6 h-6" style={{ color: themeStyles.buttonPrimary }} />
                Listening Tests
              </h2>

              {listeningTests.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                  {listeningTests.map((test) => (
                    <SpotlightCard
                      key={test.id}
                      className="cursor-pointer h-[140px] hover:scale-105 transition-all duration-300 hover:shadow-lg rounded-2xl flex items-center justify-center"
                      onClick={() => navigate(`/toeic/listening/${test.id}`)}
                      style={{
                        backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.8)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground,
                        borderColor: themeStyles.border,
                        ...themeStyles.cardStyle
                      }}
                    >
                      <CardContent className="p-4 md:p-6 text-center flex-1 flex flex-col justify-center">
                        <h3 className="font-semibold text-sm" style={{ color: themeStyles.textPrimary }}>{test.test_name}</h3>
                      </CardContent>
                    </SpotlightCard>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 rounded-lg border border-dashed" style={{
                  backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.05)',
                  borderColor: themeStyles.border
                }}>
                  <p style={{ color: themeStyles.textSecondary }}>No listening tests available yet.</p>
                </div>
              )}
            </div>

            {/* Reading Section */}
            <div className="space-y-4">
              <h2 className="text-xl md:text-2xl font-bold mb-4 flex items-center gap-2 font-nunito" style={{ color: themeStyles.textPrimary }}>
                <BookOpen className="w-6 h-6" style={{ color: themeStyles.buttonPrimary }} />
                Reading Tests
              </h2>

              {readingTests.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                  {readingTests.map((test) => (
                    <SpotlightCard
                      key={test.id}
                      className="cursor-pointer h-[140px] hover:scale-105 transition-all duration-300 hover:shadow-lg rounded-2xl flex items-center justify-center"
                      onClick={() => navigate(`/toeic/reading/${test.id}`)}
                      style={{
                        backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.8)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground,
                        borderColor: themeStyles.border,
                        ...themeStyles.cardStyle
                      }}
                    >
                      <CardContent className="p-4 md:p-6 text-center flex-1 flex flex-col justify-center">
                        <h3 className="font-semibold text-sm" style={{ color: themeStyles.textPrimary }}>{test.test_name}</h3>
                      </CardContent>
                    </SpotlightCard>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 rounded-lg border border-dashed" style={{
                  backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.05)',
                  borderColor: themeStyles.border
                }}>
                  <p style={{ color: themeStyles.textSecondary }}>No reading tests available yet.</p>
                </div>
              )}
            </div>

          </div>
        </StudentLayout>
      </div>
    </div>
  );
};

export default TOEICPortal;
