import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [availableTests, setAvailableTests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [skillBands, setSkillBands] = useState<Record<string, string>>({});
  const [skillProgress, setSkillProgress] = useState<Record<string, { completed: number; total: number }>>({});
  const [ieltsSkillProgress, setIeltsSkillProgress] = useState<Record<string, { completed: number; total: number }>>({});
  const [vocabProgress, setVocabProgress] = useState<{ completed: number; total: number }>({ completed: 0, total: 0 });
  useEffect(() => {
    // Don't block UI on image loading - show content immediately
    setImageLoaded(true);
    
    // Load all data in parallel
    const loadData = async () => {
      await Promise.all([
        loadAvailableTests(),
        user ? Promise.all([loadSkillBands(), loadSkillProgress()]) : Promise.resolve()
      ]);
    };
    
    loadData();
  }, [user]);

  // Recompute IELTS skill progress whenever tests load or user changes
  useEffect(() => {
    if (user) {
      loadIeltsSkillProgress();
    }
  }, [user, availableTests]);

  useEffect(() => {
    if (user) {
      loadVocabularyProgress();
    } else {
      // load totals even if not logged in
      loadVocabularyProgress();
    }
  }, [user]);

  const loadAvailableTests = async () => {
    setIsLoading(true);
    try {
      // Fetch all data in parallel for faster loading
      const [testsResult, questionsResult, speakingResult] = await Promise.all([
        supabase.from('tests').select('*').ilike('test_type', 'IELTS').order('created_at', { ascending: true }),
        supabase.from('questions').select('test_id, part_number, id, audio_url, choices'),
        supabase.from('speaking_prompts').select('test_id, id')
      ]);

      if (testsResult.error) {
        console.error('Error fetching tests:', testsResult.error);
        throw testsResult.error;
      }
      if (questionsResult.error) {
        console.error('Error fetching questions:', questionsResult.error);
        throw questionsResult.error;
      }
      if (speakingResult.error) {
        console.error('Error fetching speaking prompts:', speakingResult.error);
        throw speakingResult.error;
      }

      const testsData = testsResult.data;
      const questionsData = questionsResult.data;
      const speakingData = speakingResult.data;

      // Seed module availability from tests table metadata and names
      const testModules = new Map();
      testsData?.forEach(t => {
        if (!testModules.has(t.id)) testModules.set(t.id, new Set());
        // Prioritize module field from tests table
        const mod = (t.module || '').toLowerCase();
        if (mod && ['reading','listening','writing','speaking'].includes(mod)) {
          testModules.get(t.id).add(mod);
        }
        // Also check skill_category as fallback
        const skillCat = (t.skill_category || '').toLowerCase();
        if (skillCat && ['reading','listening','writing','speaking'].includes(skillCat)) {
          testModules.get(t.id).add(skillCat);
        }
        // Fallback: check test name for keywords
        const name = (t.test_name || '').toLowerCase();
        if (name.includes('reading')) testModules.get(t.id).add('reading');
        if (name.includes('listening')) testModules.get(t.id).add('listening');
        if (name.includes('writing')) testModules.get(t.id).add('writing');
        if (name.includes('speaking')) testModules.get(t.id).add('speaking');
      });

      // Augment with question-based detection (only listening/reading to avoid false writing positives)
      questionsData?.forEach(q => {
        if (!q.test_id) return;
        if (!testModules.has(q.test_id)) {
          testModules.set(q.test_id, new Set());
        }

        // Heuristics:
        // - Listening: has audio
        // - Reading: has choices/options
        if (q.audio_url) {
          testModules.get(q.test_id).add('listening');
        }
        if (q.choices) {
          testModules.get(q.test_id).add('reading');
        }
      });

      // Add speaking tests - now use test_id directly
      speakingData?.forEach(sp => {
        if (sp.test_id) {
          // Direct mapping via test_id
          if (!testModules.has(sp.test_id)) {
            testModules.set(sp.test_id, new Set());
          }
          testModules.get(sp.test_id).add('speaking');
        }
      });

      const transformedTests = testsData?.map((test, index) => {
        const availableModules = testModules.get(test.id) || new Set();
        const questionCount = questionsData?.filter(q => q.test_id === test.id).length || 0;
        const speakingCount = speakingData?.filter(sp => sp.test_id === test.id).length || 0;
        const totalContent = questionCount + speakingCount;
        return {
          id: test.id,
          test_name: test.test_name,
          test_number: index + 1, // Use sequential numbering to avoid duplicates
          status: totalContent > 0 ? 'complete' : 'incomplete',
          modules: Array.from(availableModules),
          total_questions: questionCount,
          speaking_prompts: speakingCount,
          comingSoon: totalContent === 0
        };
      }) || [];
      setAvailableTests(transformedTests);
    } catch (error) {
      console.error('Error loading tests:', error);
      setAvailableTests([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadVocabularyProgress = async () => {
    try {
      // Total tests for vocabulary builder
      const { data: tests } = await supabase
        .from('skill_tests')
        .select('id')
        .eq('skill_slug', 'vocabulary-builder');

      const total = tests?.length || 0;

      let completed = 0;
      if (user && total > 0) {
        // Completed defined by user_test_progress.status === 'completed' for those tests
        const testIds = (tests || []).map(t => t.id);
        const { data: progress } = await supabase
          .from('user_test_progress')
          .select('test_id,status,completed_score')
          .eq('user_id', user.id);
        const setIds = new Set(testIds);
        completed = (progress || []).filter(p => setIds.has(p.test_id) && p.status === 'completed').length;
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
      
      // Fetch all skill bands in parallel
      const bandPromises = skillsToFetch.map(skill =>
        supabase
          .from('test_results')
          .select('score_percentage, created_at, test_type')
          .eq('user_id', user.id)
          .ilike('test_type', `%${skill}%`)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      );

      const results = await Promise.all(bandPromises);
      const bands: Record<string, string> = {};

      results.forEach(({ data, error }, index) => {
        const skill = skillsToFetch[index];
        if (!error && data?.score_percentage != null) {
          const band = percentageToIELTSBand(data.score_percentage);
          bands[skill] = `Band ${band}`;
        }
      });

      setSkillBands(bands);
    } catch (e) {
      console.error('Error loading skill bands:', e);
    }
  };

  const loadSkillProgress = async () => {
    if (!user) return;
    try {
      const progress: Record<string, { completed: number; total: number }> = {};
      
      // Fetch all skill progress in parallel
      const progressPromises = SKILLS.map(skill =>
        Promise.all([
          supabase
            .from('user_skill_progress')
            .select('max_unlocked_level')
            .eq('user_id', user.id)
            .eq('skill_slug', skill.slug)
            .maybeSingle(),
          supabase
            .from('skill_tests')
            .select('id', { count: 'exact', head: true })
            .eq('skill_slug', skill.slug)
        ])
      );

      const results = await Promise.all(progressPromises);

      results.forEach(([userProgressResult, totalTestsResult], index) => {
        const skill = SKILLS[index];
        const completed = userProgressResult.data?.max_unlocked_level || 0;
        const total = totalTestsResult.count || 10; // Default to 10 if no tests found
        
        progress[skill.slug] = { completed, total };
      });
      
      setSkillProgress(progress);
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
      navigate('/ielts-writing-test');
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

  // Show loading only for actual data, not image
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: themeStyles.theme.name === 'dark' ? themeStyles.theme.colors.background : 'transparent' }}>
        <LoadingAnimation />
      </div>;
  }

  return (
    <div 
      className="min-h-screen relative"
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
             backgroundImage: themeStyles.theme.name === 'note' || themeStyles.theme.name === 'minimalist' || themeStyles.theme.name === 'dark'
               ? 'none'
               : `url('https://raw.githubusercontent.com/AlfieAlfiegithu2/alfie-ai-coach/main/public/1000031207.png')`,
             backgroundColor: themeStyles.backgroundImageColor
           }} />
      <div className="relative z-10">
        <StudentLayout title="My IELTS Dashboard" showBackButton>
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
                <Home className="h-4 w-4" /> Home
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
                My Dashboard
              </button>
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4" style={{ color: themeStyles.textSecondary }} />
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
                        <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                          <img
                            src={skillImage}
                            alt={`${skill.title} icon`}
                            className="w-12 h-12 object-cover"
                          />
                        </div>
                        <h3 className="font-semibold text-xs md:text-sm" style={{ color: themeStyles.textPrimary }}>{skill.title}</h3>
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
                    <h3 className="font-semibold text-xs md:text-sm" style={{ color: themeStyles.textPrimary }}>Vocabulary Book</h3>
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
                        <h3 className="font-semibold text-xs md:text-sm" style={{ color: themeStyles.textPrimary }}>{skill.label}</h3>
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

export default IELTSPortal;
