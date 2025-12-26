import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import StudentLayout from '@/components/StudentLayout';
import { supabase } from '@/integrations/supabase/client';
import LoadingAnimation from '@/components/animations/LoadingAnimation';
import SEO from '@/components/SEO';
import { useAuth } from '@/hooks/useAuth';
import { Home, Palette } from 'lucide-react';
import { SKILLS } from '@/lib/skills';
import SpotlightCard from '@/components/SpotlightCard';
import { useTheme } from '@/contexts/ThemeContext';
import { themes, ThemeName } from '@/lib/themes';
import { useThemeStyles } from '@/hooks/useThemeStyles';

// IELTS Core Skills
const IELTS_SKILLS = [
  {
    id: 'reading',
    title: 'Reading',
    description: 'Academic & General texts'
  },
  {
    id: 'listening',
    title: 'Listening',
    description: 'Audio comprehension'
  },
  {
    id: 'writing',
    title: 'Writing',
    description: 'Task 1 & Task 2'
  },
  {
    id: 'speaking',
    title: 'Speaking',
    description: 'Interview & presentation'
  }
];


const IELTSPortal = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { themeName, setTheme } = useTheme();
  const themeStyles = useThemeStyles();
  const isNoteTheme = themeStyles.theme.name === 'note';

  const [availableTests, setAvailableTests] = useState<any[]>([]);
  const [showWritingModal, setShowWritingModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [skillBands, setSkillBands] = useState<Record<string, string>>({});
  const [skillProgress, setSkillProgress] = useState<Record<string, { completed: number; total: number }>>({});
  const [ieltsSkillProgress, setIeltsSkillProgress] = useState<Record<string, { completed: number; total: number }>>({});
  const [vocabProgress, setVocabProgress] = useState<{ completed: number; total: number }>({ completed: 0, total: 0 });

  useEffect(() => {
    let isMounted = true;
    setIsLoading(false);

    // Load data in background without blocking
    const loadAllData = async () => {
      try {
        const tests = await loadAvailableTestsFast();
        if (!isMounted) return;

        if (user) {
          Promise.all([
            loadSkillBands(),
            loadSkillProgress()
          ]).catch(e => {
            if (isMounted) console.warn('Non-critical data load failed:', e);
          });
          if (tests && tests.length > 0) {
            loadIeltsSkillProgressWithTests(tests);
          }
        } else {
          loadSkillProgress();
        }
      } catch (error) {
        if (isMounted) {
          console.error('Error loading IELTS portal data:', error);
        }
      }
    };

    loadAllData();
    return () => { isMounted = false; };
  }, [user]);

  const loadAvailableTestsFast = async () => {
    try {
      const { data: testsData, error: testsError } = await supabase
        .from('tests')
        .select('id, test_name, module, skill_category')
        .ilike('test_type', 'IELTS')
        .order('created_at', { ascending: true });

      if (testsError) throw testsError;
      if (!testsData || testsData.length === 0) {
        setAvailableTests([]);
        return [];
      }

      const transformedTests = testsData.map((test, index) => {
        const modules: string[] = [];
        const mod = (test.module || '').toLowerCase();
        const skillCat = (test.skill_category || '').toLowerCase();
        const name = (test.test_name || '').toLowerCase();

        if (mod === 'reading' || skillCat === 'reading' || name.includes('reading')) modules.push('reading');
        if (mod === 'listening' || skillCat === 'listening' || name.includes('listening')) modules.push('listening');
        if (mod === 'writing' || skillCat === 'writing' || name.includes('writing')) modules.push('writing');
        if (mod === 'speaking' || skillCat === 'speaking' || name.includes('speaking')) modules.push('speaking');

        return {
          id: test.id,
          test_name: test.test_name,
          test_number: index + 1,
          status: 'complete',
          modules: [...new Set(modules)],
          total_questions: 0,
          speaking_prompts: 0,
          comingSoon: false
        };
      });

      setAvailableTests(transformedTests);
      return transformedTests;
    } catch (error) {
      console.error('Error loading tests:', error);
      setAvailableTests([]);
      return [];
    }
  };

  const loadVocabularyProgress = async (allSkillTests?: any[]) => {
    try {
      let vocabTests = allSkillTests?.filter(t => t.skill_slug === 'vocabulary-builder');
      if (!vocabTests) {
        const { data } = await supabase.from('skill_tests').select('id').eq('skill_slug', 'vocabulary-builder');
        vocabTests = data || [];
      }
      const total = vocabTests.length || 0;
      let completed = 0;
      if (user && total > 0) {
        const testIds = vocabTests.map(t => t.id);
        const { data: progress } = await supabase.from('user_test_progress').select('test_id, status').eq('user_id', user.id).in('test_id', testIds);
        completed = (progress || []).filter(p => p.status === 'completed').length;
      }
      setVocabProgress({ completed: Math.min(completed, total), total });
    } catch (e) {
      console.error('Error loading vocabulary progress', e);
      setVocabProgress({ completed: 0, total: 0 });
    }
  };

  const percentageToIELTSBand = (percentage: number): number => {
    if (percentage >= 95) return 9;
    if (percentage >= 90) return 8.5;
    if (percentage >= 85) return 8;
    if (percentage >= 80) return 7.5;
    if (percentage >= 75) return 7;
    if (percentage >= 70) return 6.5;
    if (percentage >= 65) return 6;
    if (percentage >= 60) return 5.5;
    if (percentage >= 55) return 5;
    if (percentage >= 50) return 4.5;
    if (percentage >= 45) return 4;
    if (percentage >= 40) return 3.5;
    if (percentage >= 35) return 3;
    if (percentage >= 30) return 2.5;
    if (percentage >= 25) return 2;
    if (percentage >= 20) return 1.5;
    if (percentage >= 15) return 1;
    if (percentage >= 10) return 0.5;
    return 0;
  };

  const loadSkillBands = async () => {
    if (!user) return;
    try {
      const skillsToFetch = ['reading', 'listening', 'writing', 'speaking'];
      const { data: recentResults, error } = await supabase
        .from('test_results')
        .select('score_percentage, created_at, test_type')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      const bands: Record<string, string> = {};
      skillsToFetch.forEach(skill => {
        const latest = recentResults?.find(r => r.test_type?.toLowerCase().includes(skill.toLowerCase()));
        if (latest?.score_percentage != null) {
          const band = percentageToIELTSBand(latest.score_percentage);
          bands[skill] = `Band ${band}`;
        }
      });
      setSkillBands(bands);
    } catch (e) { console.error('Error loading skill bands:', e); }
  };

  const loadSkillProgress = async () => {
    try {
      const progress: Record<string, { completed: number; total: number }> = {};
      const skillSlugs = SKILLS.map(s => s.slug);
      const [userProgressRes, allTestsRes] = await Promise.all([
        user ? supabase.from('user_skill_progress').select('skill_slug, max_unlocked_level').eq('user_id', user.id).in('skill_slug', skillSlugs) : Promise.resolve({ data: [] }),
        supabase.from('skill_tests').select('id, skill_slug')
      ]);
      const userProgressData = userProgressRes?.data || [];
      const allTestsData = allTestsRes?.data || [];
      SKILLS.forEach(skill => {
        const up = userProgressData.find(u => u.skill_slug === skill.slug);
        const completed = up?.max_unlocked_level || 0;
        const total = allTestsData.filter(t => t.skill_slug === skill.slug).length || 10;
        progress[skill.slug] = { completed, total };
      });
      setSkillProgress(progress);
      loadVocabularyProgress(allTestsData);
    } catch (error) { console.error('Error loading skill progress:', error); }
  };

  const loadIeltsSkillProgressWithTests = async (tests: any[]) => {
    if (!user) return;
    try {
      const progress: Record<string, { completed: number; total: number }> = {};
      const totalsBySkill: Record<string, number> = { reading: 0, listening: 0, writing: 0, speaking: 0 };
      for (const t of tests) {
        const modules: string[] = t.modules || [];
        if (modules.includes('reading')) totalsBySkill.reading += 1;
        if (modules.includes('listening')) totalsBySkill.listening += 1;
        if (modules.includes('writing')) totalsBySkill.writing += 1;
        if (modules.includes('speaking')) totalsBySkill.speaking += 1;
      }
      const [writingRes, readingRes, listeningRes, speakingRes] = await Promise.all([
        supabase.from('writing_test_results').select('test_result_id').eq('user_id', user.id),
        supabase.from('reading_test_results').select('test_result_id').eq('user_id', user.id),
        supabase.from('listening_test_results').select('test_result_id').eq('user_id', user.id),
        supabase.from('speaking_test_results').select('test_result_id').eq('user_id', user.id)
      ]);
      const distinctCount = (rows?: { test_result_id: string | null }[]) => {
        const s = new Set<string>();
        rows?.forEach(r => { if (r.test_result_id) s.add(r.test_result_id); });
        return s.size;
      };
      const clamp = (completed: number, total: number) => {
        const safeTotal = Math.max(0, total);
        return { completed: Math.min(completed, safeTotal), total: safeTotal };
      };
      progress['writing'] = clamp(distinctCount(writingRes.data as any), totalsBySkill['writing'] || 0);
      progress['reading'] = clamp(distinctCount(readingRes.data as any), totalsBySkill['reading'] || 0);
      progress['listening'] = clamp(distinctCount(listeningRes.data as any), totalsBySkill['listening'] || 0);
      progress['speaking'] = clamp(distinctCount(speakingRes.data as any), totalsBySkill['speaking'] || 0);
      setIeltsSkillProgress(progress);
    } catch (error) { console.error('Error loading IELTS skill progress:', error); }
  };

  const handleSkillClick = (skillSlug: string) => {
    if (skillSlug === 'collocation-connect') { navigate('/ai-speaking'); return; }
    if (skillSlug === 'sentence-mastery') { navigate('/skills/sentence-mastery'); }
    else if (skillSlug === 'writing') { setShowWritingModal(true); }
    else if (skillSlug === 'speaking') { navigate('/ielts-speaking-test'); }
    else if (skillSlug === 'reading') { navigate('/reading'); }
    else if (skillSlug === 'listening') { navigate('/listening'); }
    else { navigate(`/skills/${skillSlug}`); }
  };

  const handleWritingTypeSelect = (trainingType: 'Academic' | 'General') => {
    setShowWritingModal(false);
    navigate(`/ielts-writing-test?training=${trainingType}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ backgroundColor: themeStyles.theme.name === 'note' ? '#FFFAF0' : themeStyles.theme.name === 'dark' ? themeStyles.theme.colors.background : 'transparent' }}>
        {themeStyles.theme.name === 'note' && (
          <>
            <div
              className="absolute inset-0 pointer-events-none opacity-30 z-0"
              style={{
                backgroundImage: `url("https://www.transparenttextures.com/patterns/rice-paper-2.png")`,
                mixBlendMode: 'multiply'
              }}
            />
            <div
              className="absolute inset-0 pointer-events-none opacity-10 z-0"
              style={{
                backgroundImage: `url("https://www.transparenttextures.com/patterns/natural-paper.png")`,
                mixBlendMode: 'multiply',
                filter: 'contrast(1.2)'
              }}
            />
          </>
        )}
        <div className="relative z-10">
          <LoadingAnimation />
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen relative"
      style={{
        backgroundColor: isNoteTheme ? '#FFFAF0' : (themeStyles.theme.name === 'dark' ? themeStyles.theme.colors.background : 'transparent')
      }}
    >
      <SEO
        title="IELTS Preparation Portal"
        description="Complete IELTS preparation with AI-powered feedback. Practice reading, listening, writing, and speaking with personalized guidance and real exam simulations."
        keywords="IELTS preparation, IELTS practice tests, IELTS writing feedback, IELTS speaking practice, IELTS reading, IELTS listening, IELTS band score"
        type="website"
        schemaType="course"
        courseType="IELTS"
        courseLevel="Intermediate to Advanced"
      />

      {/* Paper texture overlays for Note theme */}
      {isNoteTheme && (
        <>
          <div
            className="absolute inset-0 pointer-events-none opacity-30 z-0"
            style={{
              backgroundImage: `url("https://www.transparenttextures.com/patterns/rice-paper-2.png")`,
              mixBlendMode: 'multiply'
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none opacity-10 z-0"
            style={{
              backgroundImage: `url("https://www.transparenttextures.com/patterns/natural-paper.png")`,
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
          backgroundColor: isNoteTheme ? '#FFFAF0' : themeStyles.backgroundImageColor
        }} />
      <div className="relative z-10">
        <StudentLayout title="Dashboard" showBackButton fullWidth transparentBackground={true}>
          <div className="max-w-4xl mx-auto px-4 space-y-6">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <button
                onClick={() => navigate('/hero')}
                className="inline-flex items-center gap-2 px-2 py-1 h-8 text-sm font-medium transition-colors rounded-md"
                style={{ color: themeStyles.textSecondary, backgroundColor: 'transparent' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = themeStyles.buttonPrimary; e.currentTarget.style.backgroundColor = themeStyles.hoverBg; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = themeStyles.textSecondary; e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                {!isNoteTheme && <Home className="h-4 w-4" />}
                {isNoteTheme && <span>Home</span>}
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center gap-2 px-2 py-1 h-8 text-sm font-medium transition-colors rounded-md"
                style={{ color: themeStyles.textSecondary, backgroundColor: 'transparent' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = themeStyles.buttonPrimary; e.currentTarget.style.backgroundColor = themeStyles.hoverBg; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = themeStyles.textSecondary; e.currentTarget.style.backgroundColor = 'transparent'; }}
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

            <div className="text-center py-4">
              <h1 className="text-4xl font-bold" style={{ color: themeStyles.textPrimary }}>IELTS portal</h1>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-center" style={{ color: themeStyles.textPrimary }}>Study each part</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {IELTS_SKILLS.map((skill, index) => {
                  return (
                    <SpotlightCard
                      key={skill.id}
                      className="cursor-pointer h-[140px] hover:scale-105 transition-all duration-300 hover:shadow-lg rounded-2xl flex items-center justify-center"
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

        {/* Writing Type Selection Modal */}
        <Dialog open={showWritingModal} onOpenChange={setShowWritingModal}>
          <DialogContent
            className="sm:max-w-md backdrop-blur-sm shadow-lg p-6 rounded-2xl"
            style={{
              backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.9)' : themeStyles.theme.name === 'dark' ? 'rgba(30, 41, 59, 0.95)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground,
              borderColor: themeStyles.border,
              backdropFilter: themeStyles.theme.name === 'glassmorphism' ? 'blur(12px)' : themeStyles.theme.name === 'dark' ? 'blur(8px)' : 'none',
              boxShadow: themeStyles.theme.name === 'dark'
                ? '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)'
                : themeStyles.theme.name === 'note'
                  ? themeStyles.theme.styles.cardStyle?.boxShadow
                  : '0 8px 32px rgba(15, 23, 42, 0.16), 0 0 0 1px rgba(148, 163, 253, 0.06)',
              ...themeStyles.cardStyle
            }}
          >
            <DialogHeader className="text-center pb-4">
              <DialogTitle className="text-center text-2xl font-medium" style={{ color: themeStyles.textPrimary }}>Choose IELTS Writing Type</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 mt-2">
              <Button
                onClick={() => handleWritingTypeSelect('Academic')}
                className="w-full h-14 text-lg font-medium rounded-2xl shadow-md transition-all duration-300 hover:scale-[1.02]"
                style={{
                  backgroundColor: themeStyles.buttonPrimary,
                  color: '#ffffff'
                }}
              >
                Academic Training
              </Button>
              <Button
                onClick={() => handleWritingTypeSelect('General')}
                className="w-full h-14 text-lg font-medium rounded-2xl shadow-md transition-all duration-300 hover:scale-[1.02]"
                style={{
                  backgroundColor: themeStyles.buttonPrimary,
                  color: '#ffffff'
                }}
              >
                General Training
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default IELTSPortal;