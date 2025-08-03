import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Volume2, PenTool, MessageSquare, Target, Award, Clock, Globe, BarChart3 } from 'lucide-react';
import StudentLayout from '@/components/StudentLayout';
import LightRays from '@/components/animations/LightRays';

const TOEFLPortal = () => {
  const navigate = useNavigate();
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);

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
    navigate(`/toefl-${skillId}`);
  };

  const handleMockTest = (testId: number) => {
    console.log(`🧪 Starting TOEFL mock test ${testId}`);
    navigate(`/toefl-tests?test=${testId}`);
  };

  return (
    <div className="min-h-screen bg-gray-950 relative">
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
            <h2 className="text-xl font-semibold text-white">Practice by Section</h2>
            <Button variant="outline" size="sm" className="border-white/30 hover:bg-white/10 text-slate-800">View All</Button>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {skills.map((skill) => {
              const Icon = skill.icon;
              return (
                <Card 
                  key={skill.id} 
                  className="relative lg:p-6 bg-white/5 border-white/10 rounded-2xl pt-4 pr-4 pb-4 pl-4 backdrop-blur-xl hover:bg-white/10 transition-all duration-200 cursor-pointer"
                  onClick={() => setSelectedSkill(skill.id)}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3 mb-3 my-[3px]">
                      <div>
                        <CardTitle className="text-lg text-white">{skill.name}</CardTitle>
                        <div className="text-sm text-gray-300">Score: 0-30</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-300">Difficulty:</span>
                        <Badge variant="secondary" className="bg-white/10 text-white border-white/20">{skill.difficulty}</Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-300">Duration:</span>
                        <span className="font-medium text-white">{skill.timeLimit}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-300">Questions:</span>
                        <span className="font-medium text-white">{skill.questions}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-white">Focus Areas:</p>
                      <div className="space-y-1">
                        {skill.sections.slice(0, 2).map((section, index) => (
                          <p key={index} className="text-xs text-gray-300">• {section}</p>
                        ))}
                        {skill.sections.length > 2 && (
                          <p className="text-xs text-gray-400">+ {skill.sections.length - 2} more</p>
                        )}
                      </div>
                    </div>

                    <Button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSkillPractice(skill.id);
                      }}
                      size="sm" 
                      className="w-full text-white border-0 bg-gray-700 hover:bg-gray-600"
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
            <h2 className="text-xl font-semibold text-white">TOEFL Practice Tests</h2>
            <Badge variant="outline" className="bg-blue-900/50 text-blue-200 border-blue-400/30">
              Official Scoring
            </Badge>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockTests.map((test) => (
              <Card key={test.id} className="relative bg-white/5 border-white/10 rounded-2xl p-6 backdrop-blur-xl hover:bg-white/10 transition-all duration-200 group">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-blue-600/20 rounded-lg">
                        <BarChart3 className="w-6 h-6 text-blue-400" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-semibold text-white">{test.title}</CardTitle>
                        <p className="text-sm text-gray-300">TOEFL iBT Test</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Difficulty:</span>
                        <span className="text-white font-medium">{test.difficulty}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Score:</span>
                        <span className="text-white font-medium">{test.score}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Duration:</span>
                        <span className="text-white font-medium">{test.duration}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Type:</span>
                        <span className="text-white font-medium">{test.type}</span>
                      </div>
                    </div>
                  </div>

                  <Button 
                    onClick={() => handleMockTest(test.id)}
                    size="sm" 
                    className="w-full text-white border-0 mt-4 transition-colors bg-zinc-700 hover:bg-zinc-600"
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

        <section className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-3xl p-8">
          <div className="text-center">
            <h3 className="text-heading-3 mb-4">Ready to Start?</h3>
            <p className="text-body mb-6">
              Begin with a diagnostic test or focus on specific skills that need improvement
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={() => navigate('/tests')}
                className="btn-gradient px-8"
                size="lg"
              >
                Take Full Practice Test
              </Button>
              <Button 
                onClick={() => navigate('/dashboard')}
                variant="outline"
                size="lg"
              >
                My Dashboard
              </Button>
            </div>
          </div>
        </section>
      </div>
        </StudentLayout>
      </div>
    </div>
  );
};

export default TOEFLPortal;