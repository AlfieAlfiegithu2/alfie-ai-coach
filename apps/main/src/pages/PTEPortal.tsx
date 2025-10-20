import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Volume2, PenTool, MessageSquare, Target, Award, Clock, BarChart3 } from 'lucide-react';
import StudentLayout from '@/components/StudentLayout';
import LightRays from '@/components/animations/LightRays';

const PTEPortal = () => {
  const navigate = useNavigate();
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);

  const skills = [
    {
      id: 'reading',
      name: 'Reading',
      icon: BookOpen,
      description: 'Multiple choice, Re-order paragraphs, Fill in the blanks',
      sections: ['Reading & Writing Fill in the Blanks', 'Multiple Choice Single Answer', 'Re-order Paragraphs'],
      difficulty: 'Intermediate',
      timeLimit: '32-41 minutes',
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      id: 'listening',
      name: 'Listening',
      icon: Volume2,
      description: 'Summarize spoken text, Fill in the blanks, Multiple choice',
      sections: ['Summarize Spoken Text', 'Multiple Choice Multiple Answer', 'Fill in the Blanks'],
      difficulty: 'Advanced',
      timeLimit: '45-57 minutes',
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      id: 'writing',
      name: 'Writing',
      icon: PenTool,
      description: 'Summarize written text, Essay writing',
      sections: ['Summarize Written Text', 'Write Essay'],
      difficulty: 'Intermediate',
      timeLimit: '20 minutes',
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      id: 'speaking',
      name: 'Speaking',
      icon: MessageSquare,
      description: 'Read aloud, Repeat sentence, Describe image, Re-tell lecture',
      sections: ['Read Aloud', 'Repeat Sentence', 'Describe Image', 'Re-tell Lecture'],
      difficulty: 'Advanced',
      timeLimit: '54-67 minutes',
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    }
  ];

  const mockTests = Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    title: `PTE Test ${i + 1}`,
    difficulty: 'Mixed Levels',
    duration: '3 hours',
    sections: 4
  }));

  const handleSkillPractice = (skillId: string) => {
    console.log(`🚀 Starting PTE ${skillId} practice`);
    // Route to PTE-specific skill pages
    navigate(`/pte-${skillId}`);
  };

  const handleMockTest = (testId: number) => {
    console.log(`🧪 Starting PTE mock test ${testId}`);
    navigate(`/pte-tests?test=${testId}`);
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
        <StudentLayout title="PTE Academic Portal" showBackButton>
      <div className="space-y-8">
        <div className="text-center">
          <Badge variant="outline" className="mb-4 px-4 py-1 text-primary border-primary/20">
            PTE ACADEMIC MODULE
          </Badge>
          <h1 className="text-heading-2 mb-4">PTE Academic Test Preparation</h1>
          <p className="text-body-large max-w-3xl mx-auto">
            Master the Pearson Test of English Academic with our comprehensive practice materials, 
            AI-powered feedback, and realistic mock tests.
          </p>
        </div>

        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">PTE Skills Practice</h2>
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
                        <div className="text-sm text-gray-300">Band 6.8</div>
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
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-white">Question Types:</p>
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
            <h2 className="text-xl font-semibold text-white">PTE Mock Tests</h2>
            <Badge variant="outline" className="bg-blue-900/50 text-blue-200 border-blue-400/30">
              AI Scoring Available
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
                        <p className="text-sm text-gray-300">PTE Academic Test</p>
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
                        <span className="text-gray-400">Sections:</span>
                        <span className="text-white font-medium">{test.sections}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Duration:</span>
                        <span className="text-white font-medium">{test.duration}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Type:</span>
                        <span className="text-white font-medium">Full Test</span>
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
                      Start Mock Test
                    </span>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="bg-surface-1 rounded-3xl p-8">
          <div className="text-center">
            <h3 className="text-heading-3 mb-4">Ready to Begin?</h3>
            <p className="text-body mb-6">
              Start with a diagnostic test or jump into skill-specific practice
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={() => navigate('/tests')}
                className="btn-gradient px-8"
                size="lg"
              >
                Take Diagnostic Test
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

export default PTEPortal;