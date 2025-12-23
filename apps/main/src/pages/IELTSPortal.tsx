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
import { Home, Palette, Library, Image, BookOpen } from 'lucide-react';
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

  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [availableTests, setAvailableTests] = useState<any[]>([]);
  const [showWritingModal, setShowWritingModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [skillBands, setSkillBands] = useState<Record<string, string>>({});
  const [skillProgress, setSkillProgress] = useState<Record<string, { completed: number; total: number }>>({});
  const [ieltsSkillProgress, setIeltsSkillProgress] = useState<Record<string, { completed: number; total: number }>>({});
  const [vocabProgress, setVocabProgress] = useState<{ completed: number; total: number }>({ completed: 0, total: 0 });

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    // Don't block UI on image loading - show content immediately
    setImageLoaded(true);

    // Consolidated data loading with guard checks
    const loadAllData = async () => {
      try {
        // Load tests first (critical path)
        await loadAvailableTests();

        if (!isMounted) return;

        // Load user-specific data in parallel if logged in
        if (user) {
          await Promise.all([
            loadSkillBands(),
            loadSkillProgress(),
            loadIeltsSkillProgress()
          ].map(p => p.catch(e => {
            // Log but don't fail the whole batch
            if (isMounted) console.warn('Non-critical data load failed:', e);
          })));
        } else {
          // Load minimal data for non-logged-in users
          await loadSkillProgress(); // This will load skill tests count
        }
      } catch (error) {
        if (isMounted) {
          console.error('Error loading IELTS portal data:', error);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadAllData();

    // Cleanup on unmount - prevents memory leaks and state updates on unmounted component
    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [user]);

  const loadAvailableTests = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch only IELTS tests first to get IDs
      const { data: testsData, error: testsError } = await supabase
        .from('tests')
        .select('*')
        .ilike('test_type', 'IELTS')
        .order('created_at', { ascending: true });

      if (testsError) throw testsError;
      if (!testsData || testsData.length === 0) {
        setAvailableTests([]);
        return;
      }

      const testIds = testsData.map(t => t.id);

      // 2. Fetch questions and prompts ONLY for these specific tests
      const [questionsResult, speakingResult] = await Promise.all([
        supabase
          .from('questions')
          .select('test_id, part_number, id, audio_url, choices')
          .in('test_id', testIds),
        supabase
          .from('speaking_prompts')
          .select('test_id, id')
          .in('test_id', testIds)
      ]);

      if (questionsResult.error) throw questionsResult.error;
      if (speakingResult.error) throw speakingResult.error;

      const questionsData = questionsResult.data;
      const speakingData = speakingResult.data;

      // Seed module availability from tests table metadata and names
      const testModules = new Map();
      testsData.forEach(t => {
        if (!testModules.has(t.id)) testModules.set(t.id, new Set());
        const mod = (t.module || '').toLowerCase();
        if (mod && ['reading', 'listening', 'writing', 'speaking'].includes(mod)) {
          testModules.get(t.id).add(mod);
        }
        const skillCat = (t.skill_category || '').toLowerCase();
        if (skillCat && ['reading', 'listening', 'writing', 'speaking'].includes(skillCat)) {
          testModules.get(t.id).add(skillCat);
        }
        const name = (t.test_name || '').toLowerCase();
        if (name.includes('reading')) testModules.get(t.id).add('reading');
        if (name.includes('listening')) testModules.get(t.id).add('listening');
        if (name.includes('writing')) testModules.get(t.id).add('writing');
        if (name.includes('speaking')) testModules.get(t.id).add('speaking');
      });

      // Heuristic detection based on fetched content
      questionsData?.forEach(q => {
        if (!q.test_id) return;
        if (q.audio_url) testModules.get(q.test_id)?.add('listening');
        if (q.choices) testModules.get(q.test_id)?.add('reading');
      });

      speakingData?.forEach(sp => {
        if (sp.test_id) testModules.get(sp.test_id)?.add('speaking');
      });

      const transformedTests = testsData.map((test, index) => {
        const availableModules = testModules.get(test.id) || new Set();
        const testQuestions = questionsData?.filter(q => q.test_id === test.id) || [];
        const testSpeaking = speakingData?.filter(sp => sp.test_id === test.id) || [];
        const totalContent = testQuestions.length + testSpeaking.length;

        return {
          id: test.id,
          test_name: test.test_name,
          test_number: index + 1,
          status: totalContent > 0 ? 'complete' : 'incomplete',
          modules: Array.from(availableModules),
          total_questions: testQuestions.length,
          speaking_prompts: testSpeaking.length,
          comingSoon: totalContent === 0
        };
      });

      setAvailableTests(transformedTests);
    } catch (error) {
      console.error('Error loading tests:', error);
      setAvailableTests([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadVocabularyProgress = async (allSkillTests?: any[]) => {
    try {
      let vocabTests = allSkillTests?.filter(t => t.skill_slug === 'vocabulary-builder');

      if (!vocabTests) {
        const { data } = await supabase
          .from('skill_tests')
          .select('id')
          .eq('skill_slug', 'vocabulary-builder');
        vocabTests = data || [];
      }

      const total = vocabTests.length || 0;
      let completed = 0;

      if (user && total > 0) {
        const testIds = vocabTests.map(t => t.id);
        const { data: progress } = await supabase
          .from('user_test_progress')
          .select('test_id, status')
          .eq('user_id', user.id)
          .in('test_id', testIds);

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

      // Fetch latest results across all types in one query
      const { data: recentResults, error } = await supabase
        .from('test_results')
        .select('score_percentage, created_at, test_type')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const bands: Record<string, string> = {};

      skillsToFetch.forEach(skill => {
        // Find latest result for this skill using case-insensitive search in JS
        const latest = recentResults?.find(r =>
          r.test_type?.toLowerCase().includes(skill.toLowerCase())
        );

        if (latest?.score_percentage != null) {
          const band = percentageToIELTSBand(latest.score_percentage);
          bands[skill] = `Band ${band}`;
        }
      });

      setSkillBands(bands);
    } catch (e) {
      console.error('Error loading skill bands:', e);
    }
  };

  const loadSkillProgress = async () => {
    try {
      const progress: Record<string, { completed: number; total: number }> = {};
      const skillSlugs = SKILLS.map(s => s.slug);

      // Fetch totals regardless of user status, fetch progress only if user exists
      const [userProgressRes, allTestsRes] = await Promise.all([
        user
          ? supabase
            .from('user_skill_progress')
            .select('skill_slug, max_unlocked_level')
            .eq('user_id', user.id)
            .in('skill_slug', skillSlugs)
          : Promise.resolve({ data: [] }),
        supabase
          .from('skill_tests')
          .select('id, skill_slug')
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

      // Pass the tests data to vocabulary loader to save another query
      loadVocabularyProgress(allTestsData);
    } catch (error) {
      console.error('Error loading skill progress:', error);
    }
  };

  const loadIeltsSkillProgress = async () => {
    if (!user) return;
    try {
      const progress: Record<string, { completed: number; total: number }> = {};

      // Determine actual totals per skill from availableTests' modules
      const totalsBySkill: Record<string, number> = { reading: 0, listening: 0, writing: 0, speaking: 0 };
      for (const t of availableTests) {
        const modules: string[] = t.modules || [];
        // Count each test once per skill; writing must be explicitly present to count
        if (modules.includes('reading')) totalsBySkill.reading += 1;
        if (modules.includes('listening')) totalsBySkill.listening += 1;
        if (modules.includes('writing')) totalsBySkill.writing += 1;
        if (modules.includes('speaking')) totalsBySkill.speaking += 1;
      }

      // Fetch completed distinct submissions per skill from result tables
      const [writingRes, readingRes, listeningRes, speakingRes] = await Promise.all([
        supabase.from('writing_test_results').select('test_result_id, user_id').eq('user_id', user.id),
        supabase.from('reading_test_results').select('test_result_id, user_id').eq('user_id', user.id),
        supabase.from('listening_test_results').select('test_result_id, user_id').eq('user_id', user.id),
        supabase.from('speaking_test_results').select('test_result_id, user_id').eq('user_id', user.id)
      ]);

      const distinctCount = (rows?: { test_result_id: string | null }[]) => {
        const s = new Set<string>();
        rows?.forEach(r => { if (r.test_result_id) s.add(r.test_result_id); });
        return s.size;
      };

      const writingCompleted = distinctCount(writingRes.data as any);
      const readingCompleted = distinctCount(readingRes.data as any);
      const listeningCompleted = distinctCount(listeningRes.data as any);
      const speakingCompleted = distinctCount(speakingRes.data as any);

      const clamp = (completed: number, total: number) => {
        const safeTotal = Math.max(0, total);
        return { completed: Math.min(completed, safeTotal), total: safeTotal };
      };

      progress['writing'] = clamp(writingCompleted, totalsBySkill['writing'] || 0);
      progress['reading'] = clamp(readingCompleted, totalsBySkill['reading'] || 0);
      progress['listening'] = clamp(listeningCompleted, totalsBySkill['listening'] || 0);
      progress['speaking'] = clamp(speakingCompleted, totalsBySkill['speaking'] || 0);

      setIeltsSkillProgress(progress);
    } catch (error) {
      console.error('Error loading IELTS skill progress:', error);
    }
  };

  const handleSkillClick = (skillSlug: string) => {
    if (skillSlug === 'collocation-connect') {
      navigate('/ai-speaking');
      return;
    }
    if (skillSlug === 'sentence-mastery') {
      navigate('/skills/sentence-mastery');
    } else if (skillSlug === 'writing') {
      setShowWritingModal(true);
    } else if (skillSlug === 'speaking') {
      navigate('/ielts-speaking-test');
    } else if (skillSlug === 'reading') {
      navigate('/reading');
    } else if (skillSlug === 'listening') {
      navigate('/listening');
    } else {
      navigate(`/skills/${skillSlug}`);
    }
  };

  const handleWritingTypeSelect = (trainingType: 'Academic' | 'General') => {
    setShowWritingModal(false);
    navigate(`/ielts-writing-test?training=${trainingType}`);
  };

  // Show loading only for actual data, not image
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: themeStyles.theme.name === 'dark' ? themeStyles.theme.colors.background : 'transparent' }}>
      <LoadingAnimation />
    </div>;
  }

  return (
    <div
      className={`min-h-screen relative ${isNoteTheme ? 'font-serif' : ''}`}
      style={{
        backgroundColor: themeStyles.theme.name === 'dark' ? themeStyles.theme.colors.background : 'transparent'
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
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed"
        style={{
          backgroundImage: isNoteTheme || themeStyles.theme.name === 'minimalist' || themeStyles.theme.name === 'dark'
            ? 'none'
            : `url('/1000031207.png')`,
          backgroundColor: themeStyles.backgroundImageColor
        }} />
      <div className="relative z-10">
        <StudentLayout title="Dashboard" showBackButton>
          <div className="space-y-3 md:space-y-4 max-w-6xl mx-auto px-3 md:px-4">
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

            {/* IELTS Portal Title - Header Style */}
            <div className="mb-8">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-center tracking-tight font-nunito" style={{ color: themeStyles.textPrimary }}>IELTS Portal</h1>
            </div>

            {/* Skill Practice Quick Links */}
            <div className="mb-8">
              <h2 className="text-xl md:text-2xl font-bold mb-6 text-center font-nunito tracking-tight" style={{ color: themeStyles.textPrimary }}>Study each part</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {IELTS_SKILLS.map((skill, index) => {
                  const progress = ieltsSkillProgress[skill.id];

                  // Skill-specific images
                  const skillImages = [
                    '/reading.png',    // Reading
                    '/listening.png',  // Listening
                    '/writing.png',    // Writing
                    '/speaking.png'    // Speaking
                  ];

                  const skillImage = skillImages[index];

                  return (
                    <SpotlightCard
                      key={skill.id}
                      className="cursor-pointer min-h-[140px] hover:scale-105 transition-all duration-300 hover:shadow-lg"
                      onClick={() => handleSkillClick(skill.id)}
                      style={{
                        backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.8)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground,
                        borderColor: themeStyles.border,
                        ...themeStyles.cardStyle
                      }}
                    >
                      <CardContent className="p-3 md:p-4 text-center flex-1 flex flex-col justify-center">
                        {!isNoteTheme && (
                          <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                            <img
                              src={skillImage}
                              alt={`${skill.title} icon`}
                              className="w-12 h-12 object-cover"
                            />
                          </div>
                        )}
                        <h3 className={`font-semibold ${isNoteTheme ? 'text-lg' : 'text-xs md:text-sm'}`} style={{ color: themeStyles.textPrimary }}>{skill.title}</h3>
                      </CardContent>
                    </SpotlightCard>
                  );
                })}
              </div>
            </div>

            {/* Sharpening Your Skills */}
            <div className="mb-8">
              <h2 className="text-xl md:text-2xl font-bold mb-6 text-center font-nunito tracking-tight" style={{ color: themeStyles.textPrimary }}>Sharpening Your Skills</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {/* Vocabulary Book card */}
                <SpotlightCard
                  className="cursor-pointer min-h-[140px] hover:scale-105 transition-all duration-300 hover:shadow-lg"
                  onClick={() => navigate('/vocabulary')}
                  style={{
                    backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.8)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground,
                    borderColor: themeStyles.border,
                    ...themeStyles.cardStyle
                  }}
                >
                  <CardContent className="p-3 md:p-4 text-center flex-1 flex flex-col justify-center">
                    <h3 className={`font-semibold ${isNoteTheme ? 'text-lg' : 'text-xs md:text-sm'}`} style={{ color: themeStyles.textPrimary }}>Vocabulary Book</h3>
                  </CardContent>
                </SpotlightCard>

                {/* Books Library Card */}
                <SpotlightCard
                  className="cursor-pointer min-h-[140px] hover:scale-105 transition-all duration-300 hover:shadow-lg"
                  onClick={() => navigate('/books')}
                  style={{
                    backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.8)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground,
                    borderColor: themeStyles.border,
                    ...themeStyles.cardStyle
                  }}
                >
                  <CardContent className="p-3 md:p-4 text-center flex-1 flex flex-col justify-center">
                    {!isNoteTheme && <Library className="w-8 h-8 mx-auto mb-2" style={{ color: themeStyles.textPrimary }} />}
                    <h3 className={`font-semibold ${isNoteTheme ? 'text-lg' : 'text-xs md:text-sm'}`} style={{ color: themeStyles.textPrimary }}>Books</h3>
                    {!isNoteTheme && <p className="text-xs text-muted-foreground mt-1">Educational reading</p>}
                  </CardContent>
                </SpotlightCard>

                {/* Templates Card */}
                <SpotlightCard
                  className="cursor-pointer min-h-[140px] hover:scale-105 transition-all duration-300 hover:shadow-lg"
                  onClick={() => navigate('/templates')}
                  style={{
                    backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.8)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground,
                    borderColor: themeStyles.border,
                    ...themeStyles.cardStyle
                  }}
                >
                  <CardContent className="p-3 md:p-4 text-center flex-1 flex flex-col justify-center">
                    {!isNoteTheme && <Image className="w-8 h-8 mx-auto mb-2" style={{ color: themeStyles.textPrimary }} />}
                    <h3 className={`font-semibold ${isNoteTheme ? 'text-lg' : 'text-xs md:text-sm'}`} style={{ color: themeStyles.textPrimary }}>Templates</h3>
                    {!isNoteTheme && <p className="text-xs text-muted-foreground mt-1">Charts & diagrams</p>}
                  </CardContent>
                </SpotlightCard>

                {/* Grammar Learning Center Card */}
                <SpotlightCard
                  className="cursor-pointer min-h-[140px] hover:scale-105 transition-all duration-300 hover:shadow-lg"
                  onClick={() => navigate('/grammar')}
                  style={{
                    backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.8)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground,
                    borderColor: themeStyles.border,
                    ...themeStyles.cardStyle
                  }}
                >
                  <CardContent className="p-3 md:p-4 text-center flex-1 flex flex-col justify-center">
                    {!isNoteTheme && <BookOpen className="w-8 h-8 mx-auto mb-2" style={{ color: themeStyles.textPrimary }} />}
                    <h3 className={`font-semibold ${isNoteTheme ? 'text-lg' : 'text-xs md:text-sm'}`} style={{ color: themeStyles.textPrimary }}>Grammar</h3>
                    {!isNoteTheme && <p className="text-xs text-muted-foreground mt-1">Interactive lessons</p>}
                  </CardContent>
                </SpotlightCard>

                {SKILLS.map((skill) => {
                  const progress = skillProgress[skill.slug];

                  return (
                    <SpotlightCard
                      key={skill.slug}
                      className="cursor-pointer min-h-[140px] hover:scale-105 transition-all duration-300 hover:shadow-lg"
                      onClick={() => handleSkillClick(skill.slug)}
                      style={{
                        backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.8)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : themeStyles.theme.colors.cardBackground,
                        borderColor: themeStyles.border,
                        ...themeStyles.cardStyle
                      }}
                    >
                      <CardContent className="p-3 md:p-4 text-center flex-1 flex flex-col justify-center">
                        <h3 className={`font-semibold ${isNoteTheme ? 'text-lg' : 'text-xs md:text-sm'}`} style={{ color: themeStyles.textPrimary }}>{skill.label}</h3>
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
            className="sm:max-w-md border-2 shadow-xl"
            style={{
              backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.9)' : themeStyles.theme.name === 'dark' ? '#1e293b' : themeStyles.theme.colors.cardBackground,
              borderColor: themeStyles.border,
              ...themeStyles.cardStyle
            }}
          >
            <DialogHeader className="text-center">
              <DialogTitle className="text-center text-xl font-bold" style={{ color: themeStyles.textPrimary }}>Choose IELTS Writing Type</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3 mt-2">
              <Button
                onClick={() => handleWritingTypeSelect('Academic')}
                className="w-full h-12 text-base font-medium"
                variant="outline"
                style={{
                  borderColor: themeStyles.border,
                  color: themeStyles.textPrimary,
                  backgroundColor: themeStyles.theme.colors.cardBackground
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = themeStyles.hoverBg;
                  e.currentTarget.style.color = themeStyles.buttonPrimary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = themeStyles.theme.colors.cardBackground;
                  e.currentTarget.style.color = themeStyles.textPrimary;
                }}
              >
                Academic Training
              </Button>
              <Button
                onClick={() => handleWritingTypeSelect('General')}
                className="w-full h-12 text-base font-medium"
                variant="outline"
                style={{
                  borderColor: themeStyles.border,
                  color: themeStyles.textPrimary,
                  backgroundColor: themeStyles.theme.colors.cardBackground
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = themeStyles.hoverBg;
                  e.currentTarget.style.color = themeStyles.buttonPrimary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = themeStyles.theme.colors.cardBackground;
                  e.currentTarget.style.color = themeStyles.textPrimary;
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