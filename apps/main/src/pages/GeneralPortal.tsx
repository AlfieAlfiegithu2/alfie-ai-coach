import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import StudentLayout from '@/components/StudentLayout';
import SEO from '@/components/SEO';
import { useAuth } from '@/hooks/useAuth';
import { Home, Palette } from 'lucide-react';
import { SKILLS } from '@/lib/skills';
import SpotlightCard from '@/components/SpotlightCard';
import { useTheme } from '@/contexts/ThemeContext';
import { themes, ThemeName } from '@/lib/themes';
import { useThemeStyles } from '@/hooks/useThemeStyles';

// General English Core Skill - Speaking Only
const GENERAL_SKILLS = [
  {
    id: 'speaking',
    title: 'Speaking',
    description: 'Practice conversation & fluency'
  }
];

const GeneralPortal = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { themeName, setTheme } = useTheme();
  const themeStyles = useThemeStyles();
  const isNoteTheme = themeStyles.theme.name === 'note';

  const handleSkillClick = (skillSlug: string) => {
    if (skillSlug === 'collocation-connect') {
      navigate('/ai-speaking');
      return;
    }
    if (skillSlug === 'sentence-mastery') {
      navigate('/skills/sentence-mastery');
    } else if (skillSlug === 'speaking') {
      navigate('/ai-speaking');
    } else {
      navigate(`/skills/${skillSlug}`);
    }
  };

  return (
    <div
      className="min-h-screen relative"
      style={{
        backgroundColor: themeStyles.theme.name === 'dark' ? themeStyles.theme.colors.background : 'transparent'
      }}
    >
      <SEO
        title="General English Portal"
        description="Practice your English speaking and language skills with AI-powered feedback. Improve your fluency, vocabulary, and grammar with personalized guidance."
        keywords="General English, speaking practice, English fluency, vocabulary, grammar, English learning"
        type="website"
      />
      {/* Background Texture for Note Theme - ENHANCED NOTEBOOK EFFECT */}
      {(themeStyles.theme.name === 'note') && (
        <>
          <div
            className="absolute inset-0 pointer-events-none opacity-50 z-0"
            style={{
              backgroundColor: '#FFFAF0',
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
          backgroundImage: themeStyles.theme.name === 'note' || themeStyles.theme.name === 'minimalist' || themeStyles.theme.name === 'dark'
            ? 'none'
            : `url('/1000031207.png')`,
          backgroundColor: themeStyles.theme.name === 'note' ? '#FFFAF0' : themeStyles.backgroundImageColor
        }} />
      <div className="relative z-10">
        <StudentLayout title="Dashboard" showBackButton fullWidth transparentBackground={true}>
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

            {/* General English Portal Title - Header Style */}
            <div className="text-center py-4">
              <h1 className="text-4xl font-bold" style={{ color: themeStyles.textPrimary }}>General English</h1>
            </div>

            {/* Speaking Practice */}
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-center" style={{ color: themeStyles.textPrimary }}>Practice Speaking</h2>
              <div className="flex justify-center">
                {GENERAL_SKILLS.map((skill) => {
                  return (
                    <SpotlightCard
                      key={skill.id}
                      className="cursor-pointer h-[140px] w-full max-w-[250px] hover:scale-105 transition-all duration-300 hover:shadow-lg rounded-2xl flex items-center justify-center"
                      onClick={() => handleSkillClick(skill.id)}
                      style={{
                        backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.8)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground,
                        borderColor: themeStyles.border,
                        ...themeStyles.cardStyle
                      }}
                    >
                      <CardContent className="p-4 md:p-6 text-center flex-1 flex flex-col justify-center">
                        <h3 className="font-semibold text-sm" style={{ color: themeStyles.textPrimary }}>{skill.title}</h3>
                      </CardContent>
                    </SpotlightCard>
                  );
                })}
              </div>
            </div>

            {/* Sharpening Your Skills */}
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-center" style={{ color: themeStyles.textPrimary }}>Sharpening your skills</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {/* Vocabulary Book card */}
                <SpotlightCard
                  className="cursor-pointer h-[140px] hover:scale-105 transition-all duration-300 hover:shadow-lg rounded-2xl flex items-center justify-center"
                  onClick={() => navigate('/vocabulary')}
                  style={{
                    backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.8)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground,
                    borderColor: themeStyles.border,
                    ...themeStyles.cardStyle
                  }}
                >
                  <CardContent className="p-4 md:p-6 text-center flex-1 flex flex-col justify-center">
                    <h3 className="font-semibold text-sm" style={{ color: themeStyles.textPrimary }}>Vocabulary Book</h3>
                  </CardContent>
                </SpotlightCard>

                {/* Books Library Card */}
                <SpotlightCard
                  className="cursor-pointer h-[140px] hover:scale-105 transition-all duration-300 hover:shadow-lg rounded-2xl flex items-center justify-center"
                  onClick={() => navigate('/books')}
                  style={{
                    backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.8)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground,
                    borderColor: themeStyles.border,
                    ...themeStyles.cardStyle
                  }}
                >
                  <CardContent className="p-4 md:p-6 text-center flex-1 flex flex-col justify-center">
                    <h3 className="font-semibold text-sm" style={{ color: themeStyles.textPrimary }}>Books</h3>
                  </CardContent>
                </SpotlightCard>

                {/* Templates Card */}
                <SpotlightCard
                  className="cursor-pointer h-[140px] hover:scale-105 transition-all duration-300 hover:shadow-lg rounded-2xl flex items-center justify-center"
                  onClick={() => navigate('/templates')}
                  style={{
                    backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.8)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground,
                    borderColor: themeStyles.border,
                    ...themeStyles.cardStyle
                  }}
                >
                  <CardContent className="p-4 md:p-6 text-center flex-1 flex flex-col justify-center">
                    <h3 className="font-semibold text-sm" style={{ color: themeStyles.textPrimary }}>Templates</h3>
                  </CardContent>
                </SpotlightCard>

                {/* Grammar Learning Center Card */}
                <SpotlightCard
                  className="cursor-pointer h-[140px] hover:scale-105 transition-all duration-300 hover:shadow-lg rounded-2xl flex items-center justify-center"
                  onClick={() => navigate('/grammar')}
                  style={{
                    backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.8)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground,
                    borderColor: themeStyles.border,
                    ...themeStyles.cardStyle
                  }}
                >
                  <CardContent className="p-4 md:p-6 text-center flex-1 flex flex-col justify-center">
                    <h3 className="font-semibold text-sm" style={{ color: themeStyles.textPrimary }}>Grammar</h3>
                  </CardContent>
                </SpotlightCard>

                {SKILLS.map((skill) => {
                  return (
                    <SpotlightCard
                      key={skill.slug}
                      className="cursor-pointer h-[140px] hover:scale-105 transition-all duration-300 hover:shadow-lg rounded-2xl flex items-center justify-center"
                      onClick={() => handleSkillClick(skill.slug)}
                      style={{
                        backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.8)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground,
                        borderColor: themeStyles.border,
                        ...themeStyles.cardStyle
                      }}
                    >
                      <CardContent className="p-4 md:p-6 text-center flex-1 flex flex-col justify-center">
                        <h3 className="font-semibold text-sm" style={{ color: themeStyles.textPrimary }}>{skill.label}</h3>
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

export default GeneralPortal;