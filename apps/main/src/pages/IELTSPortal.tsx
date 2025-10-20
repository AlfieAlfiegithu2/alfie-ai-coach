import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import StudentLayout from '@/components/StudentLayout';
import { supabase } from '@/integrations/supabase/client';
import LoadingAnimation from '@/components/animations/LoadingAnimation';
import { useAuth } from '@/hooks/useAuth';
import { useSentenceMasteryAuth } from '@/hooks/useSentenceMasteryAuth';
import { Home } from 'lucide-react';
import { SKILLS } from '@/lib/skills';

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
  const { navigateToSentenceMastery } = useSentenceMasteryAuth();
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [availableTests, setAvailableTests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [skillBands, setSkillBands] = useState<Record<string, string>>({});
  const [skillProgress, setSkillProgress] = useState<Record<string, { completed: number; total: number }>>({});
  const [ieltsSkillProgress, setIeltsSkillProgress] = useState<Record<string, { completed: number; total: number }>>({});
  const [vocabProgress, setVocabProgress] = useState<{ completed: number; total: number }>({ completed: 0, total: 0 });
  useEffect(() => {
    loadAvailableTests();

    if (user) {
      loadSkillBands();
      loadSkillProgress();
    }

    // Preload the background image
    const img = new Image();
    img.onload = () => setImageLoaded(true);
    img.src = '/lovable-uploads/38d81cb0-fd21-4737-b0f5-32bc5d0ae774.png';
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
      // Fetch all IELTS tests from admin (case insensitive)
      const {
        data: testsData,
        error: testsError
      } = await supabase.from('tests').select('*').ilike('test_type', 'IELTS').order('created_at', {
        ascending: true
      });
      if (testsError) {
        console.error('Error fetching tests:', testsError);
        throw testsError;
      }

      // Fetch questions to check test completion status
      const {
        data: questionsData,
        error: questionsError
      } = await supabase.from('questions').select('test_id, part_number, id, audio_url, choices');
      if (questionsError) {
        console.error('Error fetching questions:', questionsError);
        throw questionsError;
      }

      // Fetch speaking prompts to check speaking tests
      const {
        data: speakingData,
        error: speakingError
      } = await supabase.from('speaking_prompts').select('test_number, cambridge_book, id');
      if (speakingError) {
        console.error('Error fetching speaking prompts:', speakingError);
        throw speakingError;
      }

      // Seed module availability from tests table metadata and names
      const testModules = new Map();
      testsData?.forEach(t => {
        if (!testModules.has(t.id)) testModules.set(t.id, new Set());
        const mod = (t.module || '').toLowerCase();
        if (['reading','listening','writing'].includes(mod)) {
          testModules.get(t.id).add(mod);
        }
        const name = (t.test_name || '').toLowerCase();
        if (name.includes('reading')) testModules.get(t.id).add('reading');
        if (name.includes('listening')) testModules.get(t.id).add('listening');
        if (name.includes('writing')) testModules.get(t.id).add('writing');
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

      // Add speaking tests
      speakingData?.forEach(sp => {
        // Find corresponding test by name
        const matchingTest = testsData?.find(t =>
          t.test_name === (sp.test_number?.toString() || '') ||
          t.test_name.includes(sp.test_number?.toString() || '') ||
          (!!sp.cambridge_book && (t.test_name === sp.cambridge_book || t.test_name.includes(sp.cambridge_book)))
        );
        if (matchingTest) {
          if (!testModules.has(matchingTest.id)) {
            testModules.set(matchingTest.id, new Set());
          }
          testModules.get(matchingTest.id).add('speaking');
        }
      });

      const transformedTests = testsData?.map((test, index) => {
        const availableModules = testModules.get(test.id) || new Set();
        const questionCount = questionsData?.filter(q => q.test_id === test.id).length || 0;
        const speakingCount = speakingData?.filter(sp => sp.test_number?.toString() === test.test_name || sp.cambridge_book?.includes(test.test_name)).length || 0;
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
      const bands: Record<string, string> = {};

      for (const s of skillsToFetch) {
        const { data, error } = await supabase
          .from('test_results')
          .select('score_percentage, created_at, test_type')
          .eq('user_id', user.id)
          .ilike('test_type', `%${s}%`)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data?.score_percentage != null) {
          const band = percentageToIELTSBand(data.score_percentage);
          bands[s] = `Band ${band}`;
        }
      }

      setSkillBands(bands);
    } catch (e) {
      console.error('Error loading skill bands:', e);
    }
  };

  const loadSkillProgress = async () => {
    if (!user) return;
    try {
      const progress: Record<string, { completed: number; total: number }> = {};
      
      for (const skill of SKILLS) {
        // Get user progress for this skill
        const { data: userProgress } = await supabase
          .from('user_skill_progress')
          .select('max_unlocked_level')
          .eq('user_id', user.id)
          .eq('skill_slug', skill.slug)
          .single();

        // Get total available tests for this skill
        const { data: totalTests } = await supabase
          .from('skill_tests')
          .select('id')
          .eq('skill_slug', skill.slug);

        const completed = userProgress?.max_unlocked_level || 0;
        const total = totalTests?.length || 10; // Default to 10 if no tests found
        
        progress[skill.slug] = { completed, total };
      }
      
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
    if (skillSlug === 'sentence-mastery') {
      navigateToSentenceMastery();
    } else {
      navigate(`/skills/${skillSlug}`);
    }
  };

  const handleTestClick = (testId: string) => {
    console.log(`🧪 Opening IELTS test ${testId}`);
    navigate(`/ielts-test-modules/${testId}`);
  };

  if (!imageLoaded) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <LoadingAnimation />
      </div>;
  }

  return (
    <div className="min-h-screen relative">
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed" 
           style={{
             backgroundImage: `url('/lovable-uploads/38d81cb0-fd21-4737-b0f5-32bc5d0ae774.png')`,
             backgroundColor: '#f3f4f6'
           }} />
      <div className="relative z-10">
        <StudentLayout title="My IELTS Dashboard" showBackButton>
          <div className="space-y-3 md:space-y-4 max-w-6xl mx-auto px-3 md:px-4">
            <div className="flex items-center gap-2 mb-2">
              <Button variant="ghost" onClick={() => navigate('/hero')} className="text-text-secondary px-2 py-1 h-8">
                <Home className="mr-2 h-4 w-4" /> Home
              </Button>
              <Button variant="ghost" onClick={() => navigate('/dashboard')} className="text-text-secondary px-2 py-1 h-8">
                My Dashboard
              </Button>
            </div>
            
            {/* Skill Practice Quick Links */}
            <div className="mb-6">
              <h2 className="text-xl md:text-2xl font-bold mb-4 text-foreground">Study each part</h2>
              {/* Vocabulary Book quick card (separate from Skills' builder) */}
              <div className="mb-4">
                <Card className="bg-card/80 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-base md:text-lg font-semibold text-foreground">Vocabulary Book</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          ({vocabProgress.completed}/{vocabProgress.total} Completed)
                        </div>
                      </div>
                      <Button size="sm" onClick={() => navigate('/vocabulary')}>
                        Start Memorizing
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {IELTS_SKILLS.map((skill, index) => {
                  const progress = ieltsSkillProgress[skill.id];
                  const progressPercentage = progress ? (progress.completed / progress.total) * 100 : 0;
                  
                  // Skill-specific images
                  const skillImages = [
                    '/reading.png',    // Reading
                    '/listening.png',  // Listening  
                    '/writing.png',    // Writing
                    '/speaking.png'    // Speaking
                  ];
                  
                  const skillImage = skillImages[index];
                  
                  return (
                    <Card key={skill.id} className="hover:shadow-lg transition-all duration-200 cursor-pointer bg-card/80 backdrop-blur-sm" onClick={() => handleSkillClick(skill.id)}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-3 mb-2">
                          <img 
                            src={skillImage} 
                            alt={`${skill.title} icon`}
                            className="w-12 h-12 rounded-full object-cover bg-white/10 p-1"
                          />
                          <CardTitle className="text-base md:text-lg flex-1">
                            {skill.title}
                          </CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="text-xs md:text-sm text-muted-foreground mb-3">
                          <p>{skill.description}</p>
                        </div>
                        
                        {progress && (
                          <div className="mb-3 space-y-2">
                            <div className="text-xs text-muted-foreground">
                              ({progress.completed}/{progress.total} Completed)
                            </div>
                            <Progress value={progressPercentage} className="h-2" />
                          </div>
                        )}
                        
                        {skillBands[skill.id] && skill.id !== 'speaking' && (
                          <div className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded mb-3">
                            Last: {skillBands[skill.id]}
                          </div>
                        )}
                        
                        <Button 
                          className="w-full" 
                          size="sm"
                        >
                          Start Practice
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Sharpening Your Skills */}
            <div className="mb-6">
              <h2 className="text-xl md:text-2xl font-bold mb-4 text-foreground">Sharpening Your Skills</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {SKILLS.map((skill) => {
                  const progress = skillProgress[skill.slug];
                  const progressPercentage = progress ? (progress.completed / progress.total) * 100 : 0;
                  
                  return (
                    <Card key={skill.slug} className="hover:shadow-lg transition-all duration-200 cursor-pointer bg-card/80 backdrop-blur-sm" onClick={() => handleSkillClick(skill.slug)}>
                      <CardContent className="p-3 md:p-4 text-center min-h-[120px] flex flex-col justify-center">
                        <h3 className="font-semibold text-xs md:text-sm">{skill.label}</h3>
                        
                        {progress && (
                          <div className="mt-3 space-y-2">
                            <div className="text-xs text-muted-foreground">
                              ({progress.completed}/{progress.total} Completed)
                            </div>
                            <Progress value={progressPercentage} className="h-2" />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Available IELTS Tests */}
            <div className="mb-6">
              <h2 className="text-xl md:text-2xl font-bold mb-4 text-foreground">Complete IELTS Tests</h2>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingAnimation />
                </div>
              ) : availableTests.length > 0 ? (
                <div className="flex overflow-x-auto pb-5 gap-3 md:gap-4" style={{ scrollbarWidth: 'thin' }}>
                  {availableTests.map((test, index) => {
                    // Animal photos array - cycling through available animals
                    const animalPhotos = [
                      '/panda.png',
                      '/koala.png', 
                      '/cat.png',
                      '/puppy.png',
                      '/rabbit.png',
                      '/bear.png',
                      '/fox.png',
                      '/hedgehog.png',
                      '/otter.png',
                      '/seal.png',
                      '/chick.png',
                      '/duck.png',
                      '/Hamster.png',
                      '/Monkey.png',
                      '/Penguine.png',
                      '/dear.png',
                      '/piglet.png',
                      '/polar bear.png',
                      '/squerrel.png'
                    ];
                    
                    const animalImage = animalPhotos[index % animalPhotos.length];
                    
                    return (
                      <Card 
                        key={test.id} 
                        className="hover:shadow-lg transition-all duration-200 cursor-pointer bg-card/80 backdrop-blur-sm flex-shrink-0 w-64 md:w-72" 
                        onClick={() => handleTestClick(test.id)}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-center gap-3 mb-2">
                            <img 
                              src={animalImage} 
                              alt={`Test ${test.test_number} mascot`}
                              className="w-12 h-12 rounded-full object-cover bg-white/10 p-1"
                            />
                            <CardTitle className="text-base md:text-lg flex-1 flex justify-between items-center">
                              <span>Test {test.test_number}</span>
                              {test.comingSoon && (
                                <span className="text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded">
                                  Coming Soon
                                </span>
                              )}
                            </CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="text-xs md:text-sm text-muted-foreground mb-3">
                            <p>{test.test_name}</p>
                          </div>
                          <Button 
                            className="w-full mt-3" 
                            size="sm" 
                            disabled={test.comingSoon}
                          >
                            {test.comingSoon ? 'Coming Soon' : 'Start Test'}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card className="bg-card/80 backdrop-blur-sm">
                  <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">No IELTS tests available yet. Check back soon!</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </StudentLayout>
      </div>
    </div>
  );
};

export default IELTSPortal;
