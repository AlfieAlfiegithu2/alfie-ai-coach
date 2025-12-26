import { useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LoadingOverlay from '@/components/transitions/LoadingOverlay';
import LoadingAnimation from '@/components/animations/LoadingAnimation';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Volume2, PenTool, MessageSquare, Target, Award, Clock, Globe, BarChart3 } from 'lucide-react';
import StudentLayout from '@/components/StudentLayout';
import LightRays from '@/components/animations/LightRays';
import { useThemeStyles } from "@/hooks/useThemeStyles";

const TOEFLPortal = () => {
  const navigate = useNavigate();
  const themeStyles = useThemeStyles();
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const skills = [
    {
      id: 'reading',
      name: 'Reading',
      icon: BookOpen,
      description: 'Academic passages with comprehension questions',
      sections: ['Academic Reading', 'Vocabulary Questions', 'Inference Questions'],
      difficulty: 'Intermediate',
      timeLimit: '54-72 minutes',
      questions: '30-40 questions',
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      id: 'listening',
      name: 'Listening',
      icon: Volume2,
      description: 'Academic lectures and campus conversations',
      sections: ['Academic Lectures', 'Campus Conversations', 'Note-taking Skills'],
      difficulty: 'Advanced',
      timeLimit: '41-57 minutes',
      questions: '28-39 questions',
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      id: 'speaking',
      name: 'Speaking',
      icon: MessageSquare,
      description: 'Independent and integrated speaking tasks',
      sections: ['Independent Speaking', 'Integrated Speaking', 'Campus Situations'],
      difficulty: 'Advanced',
      timeLimit: '17 minutes',
      questions: '4 tasks',
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      id: 'writing',
      name: 'Writing',
      icon: PenTool,
      description: 'Integrated and independent writing tasks',
      sections: ['Integrated Writing', 'Independent Writing', 'Academic Writing'],
      difficulty: 'Intermediate',
      timeLimit: '50 minutes',
      questions: '2 tasks',
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    }
  ];

  const mockTests = Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    title: `TOEFL Test ${i + 1}`,
    difficulty: 'Mixed Levels',
    duration: '3 hours',
    score: '0-120',
    type: 'Full Test'
  }));

  const handleSkillPractice = (skillId: string) => {
    console.log(`🚀 Starting TOEFL ${skillId} practice`);
    // Route to TOEFL-specific skill pages
    startTransition(() => {
      navigate(`/toefl-${skillId}`);
    });
  };

  const handleMockTest = (testId: number) => {
    console.log(`🧪 Starting TOEFL mock test ${testId}`);
    startTransition(() => {
      navigate(`/toefl-tests?test=${testId}`);
    });
  };

  const isNoteTheme = themeStyles.theme.name === 'note';

  return (
    <div
      className="min-h-screen relative transition-colors duration-300"
      style={{
        backgroundColor: isNoteTheme ? '#FFFAF0' : '#030712'
      }}
    >
      {/* Background Texture for Note Theme - ENHANCED NOTEBOOK EFFECT */}
      {isNoteTheme && (
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

      {!isNoteTheme && (
        <LightRays
          raysOrigin="top-center"
          raysColor="#1E40AF"
          raysSpeed={0.6}
          lightSpread={2.0}
          rayLength={1.2}
          pulsating={false}
          fadeDistance={0.8}
          saturation={0.4}
          followMouse={true}
          mouseInfluence={0.05}
          noiseAmount={0.02}
          distortion={0.02}
          className="absolute inset-0 z-0"
        />
      )}
      <div className="relative z-10">
        <StudentLayout title="TOEFL iBT Portal" showBackButton>
          <div className="space-y-8">
            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Globe className="w-8 h-8 text-primary" />
                <h1 className="text-heading-2">TOEFL iBT Test Preparation</h1>
              </div>
              <p className="text-body-large max-w-3xl mx-auto">
                Prepare for the Test of English as a Foreign Language with authentic practice materials,
                detailed scoring rubrics, and comprehensive test strategies.
              </p>
              <div className="flex items-center justify-center gap-6 mt-6 text-sm text-text-secondary">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  <span>Score: 0-120</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>Test Duration: ~3 hours</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  <span>4 Skills Tested</span>
                </div>
              </div>
            </div>

            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold" style={{ color: isNoteTheme ? themeStyles.textPrimary : 'white' }}>Practice by Section</h2>
                <Button variant="outline" size="sm" className="hover:bg-white/10" style={{ color: isNoteTheme ? themeStyles.textPrimary : '#1e293b', borderColor: isNoteTheme ? themeStyles.border : 'rgba(255,255,255,0.3)' }}>View All</Button>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {skills.map((skill) => {
                  const Icon = skill.icon;
                  return (
                    <Card
                      key={skill.id}
                      className="relative lg:p-6 rounded-2xl pt-4 pr-4 pb-4 pl-4 backdrop-blur-xl transition-all duration-200 cursor-pointer"
                      style={{
                        backgroundColor: isNoteTheme ? themeStyles.theme.colors.cardBackground : 'rgba(255,255,255,0.05)',
                        borderColor: isNoteTheme ? themeStyles.border : 'rgba(255,255,255,0.1)',
                        ...isNoteTheme ? themeStyles.cardStyle : {}
                      }}
                      onClick={() => setSelectedSkill(skill.id)}
                    >
                      <CardHeader className="pb-4">
                        <div className="flex items-center gap-3 mb-3 my-[3px]">
                          <div>
                            <CardTitle className="text-lg" style={{ color: isNoteTheme ? themeStyles.textPrimary : 'white' }}>{skill.name}</CardTitle>
                            <div className="text-sm" style={{ color: isNoteTheme ? themeStyles.textSecondary : '#d1d5db' }}>Score: 0-30</div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span style={{ color: isNoteTheme ? themeStyles.textSecondary : '#d1d5db' }}>Difficulty:</span>
                            <Badge variant="secondary" className="border-white/20" style={{ backgroundColor: isNoteTheme ? 'transparent' : 'rgba(255,255,255,0.1)', color: isNoteTheme ? themeStyles.textPrimary : 'white', borderColor: isNoteTheme ? themeStyles.border : undefined }}>{skill.difficulty}</Badge>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span style={{ color: isNoteTheme ? themeStyles.textSecondary : '#d1d5db' }}>Duration:</span>
                            <span className="font-medium" style={{ color: isNoteTheme ? themeStyles.textPrimary : 'white' }}>{skill.timeLimit}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span style={{ color: isNoteTheme ? themeStyles.textSecondary : '#d1d5db' }}>Questions:</span>
                            <span className="font-medium" style={{ color: isNoteTheme ? themeStyles.textPrimary : 'white' }}>{skill.questions}</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <p className="text-sm font-medium" style={{ color: isNoteTheme ? themeStyles.textPrimary : 'white' }}>Focus Areas:</p>
                          <div className="space-y-1">
                            {skill.sections.slice(0, 2).map((section, index) => (
                              <p key={index} className="text-xs" style={{ color: isNoteTheme ? themeStyles.textSecondary : '#d1d5db' }}>• {section}</p>
                            ))}
                            {skill.sections.length > 2 && (
                              <p className="text-xs" style={{ color: isNoteTheme ? themeStyles.textSecondary : '#9ca3af' }}>+ {skill.sections.length - 2} more</p>
                            )}
                          </div>
                        </div>

                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSkillPractice(skill.id);
                          }}
                          size="sm"
                          className="w-full border-0"
                          style={{
                            backgroundColor: isNoteTheme ? themeStyles.buttonPrimary : '#374151',
                            color: 'white'
                          }}
                        >
                          Practice {skill.name}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold" style={{ color: isNoteTheme ? themeStyles.textPrimary : 'white' }}>TOEFL Practice Tests</h2>
                <Badge variant="outline" className="border-blue-400/30" style={{ backgroundColor: isNoteTheme ? 'transparent' : 'rgba(30, 58, 138, 0.5)', color: isNoteTheme ? themeStyles.textAccent : '#bfdbfe' }}>
                  Official Scoring
                </Badge>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mockTests.map((test) => (
                  <Card key={test.id}
                    className="relative rounded-2xl p-6 backdrop-blur-xl transition-all duration-200 group"
                    style={{
                      backgroundColor: isNoteTheme ? themeStyles.theme.colors.cardBackground : 'rgba(255,255,255,0.05)',
                      borderColor: isNoteTheme ? themeStyles.border : 'rgba(255,255,255,0.1)',
                      ...isNoteTheme ? themeStyles.cardStyle : {}
                    }}
                  >
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-lg" style={{ backgroundColor: isNoteTheme ? 'transparent' : 'rgba(37, 99, 235, 0.2)' }}>
                            <BarChart3 className="w-6 h-6" style={{ color: isNoteTheme ? themeStyles.textAccent : '#60a5fa' }} />
                          </div>
                          <div>
                            <CardTitle className="text-lg font-semibold" style={{ color: isNoteTheme ? themeStyles.textPrimary : 'white' }}>{test.title}</CardTitle>
                            <p className="text-sm" style={{ color: isNoteTheme ? themeStyles.textSecondary : '#d1d5db' }}>TOEFL iBT Test</p>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span style={{ color: isNoteTheme ? themeStyles.textSecondary : '#9ca3af' }}>Difficulty:</span>
                            <span className="font-medium" style={{ color: isNoteTheme ? themeStyles.textPrimary : 'white' }}>{test.difficulty}</span>
                          </div>
                          <div className="flex justify-between">
                            <span style={{ color: isNoteTheme ? themeStyles.textSecondary : '#9ca3af' }}>Score:</span>
                            <span className="font-medium" style={{ color: isNoteTheme ? themeStyles.textPrimary : 'white' }}>{test.score}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span style={{ color: isNoteTheme ? themeStyles.textSecondary : '#9ca3af' }}>Duration:</span>
                            <span className="font-medium" style={{ color: isNoteTheme ? themeStyles.textPrimary : 'white' }}>{test.duration}</span>
                          </div>
                          <div className="flex justify-between">
                            <span style={{ color: isNoteTheme ? themeStyles.textSecondary : '#9ca3af' }}>Type:</span>
                            <span className="font-medium" style={{ color: isNoteTheme ? themeStyles.textPrimary : 'white' }}>{test.type}</span>
                          </div>
                        </div>
                      </div>

                      <Button
                        onClick={() => handleMockTest(test.id)}
                        size="sm"
                        className="w-full border-0 mt-4 transition-colors"
                        style={{
                          backgroundColor: isNoteTheme ? themeStyles.buttonPrimary : '#3f3f46',
                          color: 'white'
                        }}
                      >
                        <span className="flex items-center gap-2">
                          <Target className="w-4 h-4" />
                          Start Practice Test
                        </span>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            <section
              className={`rounded-3xl p-8 ${!isNoteTheme ? 'bg-gradient-to-r from-primary/10 to-accent/10' : ''}`}
              style={{
                backgroundColor: isNoteTheme ? themeStyles.theme.colors.cardBackground : undefined,
                border: isNoteTheme ? `1px solid ${themeStyles.border}` : undefined,
                ...(isNoteTheme ? themeStyles.cardStyle : {})
              }}
            >
              <div className="text-center">
                <h3 className="text-heading-3 mb-4" style={{ color: isNoteTheme ? themeStyles.textPrimary : undefined }}>Ready to Start?</h3>
                <p className="text-body mb-6" style={{ color: isNoteTheme ? themeStyles.textSecondary : undefined }}>
                  Begin with a diagnostic test or focus on specific skills that need improvement
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    onClick={() => navigate('/tests')}
                    size="lg"
                    className={!isNoteTheme ? "btn-gradient px-8" : "px-8"}
                    style={isNoteTheme ? { backgroundColor: themeStyles.buttonPrimary, color: 'white' } : {}}
                  >
                    Take Full Practice Test
                  </Button>
                  <Button
                    onClick={() => navigate('/dashboard')}
                    variant="outline"
                    size="lg"
                    style={{
                      borderColor: isNoteTheme ? themeStyles.border : undefined,
                      color: isNoteTheme ? themeStyles.textPrimary : undefined
                    }}
                  >
                    My Dashboard
                  </Button>
                </div>
              </div>
            </section>
          </div>
        </StudentLayout>
      </div>
      <AnimatePresence>
        {isPending && <LoadingOverlay />}
      </AnimatePresence>
    </div>
  );
};

export default TOEFLPortal;