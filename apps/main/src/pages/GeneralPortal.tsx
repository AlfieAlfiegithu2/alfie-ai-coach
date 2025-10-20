import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Volume2, PenTool, MessageSquare, Target, Award, Clock } from 'lucide-react';
import StudentLayout from '@/components/StudentLayout';

const GeneralPortal = () => {
  const navigate = useNavigate();
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);

  const skills = [
    {
      id: 'reading',
      name: 'Reading',
      icon: BookOpen,
      description: 'Improve reading comprehension with diverse texts and exercises',
      sections: ['Multiple Choice', 'Gap Fill', 'Reading Comprehension'],
      difficulty: 'Beginner-Advanced',
      timeLimit: '30-45 minutes',
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      id: 'listening',
      name: 'Listening',
      icon: Volume2,
      description: 'Enhance listening skills with authentic conversations',
      sections: ['Dialogues', 'Lectures', 'Conversations'],
      difficulty: 'Beginner-Advanced',
      timeLimit: '20-30 minutes',
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      id: 'writing',
      name: 'Writing',
      icon: PenTool,
      description: 'Develop writing skills from sentences to essays',
      sections: ['Paragraph Writing', 'Essay Structure', 'Creative Writing'],
      difficulty: 'Beginner-Advanced',
      timeLimit: '30-60 minutes',
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      id: 'speaking',
      name: 'Speaking',
      icon: MessageSquare,
      description: 'Practice pronunciation and fluency with AI feedback',
      sections: ['Pronunciation', 'Fluency', 'Conversation Practice'],
      difficulty: 'Beginner-Advanced',
      timeLimit: '15-30 minutes',
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    }
  ];

  const mockTests = Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    title: `General English Test ${i + 1}`,
    difficulty: 'All Levels',
    duration: '90 minutes',
    sections: 4
  }));

  const handleSkillPractice = (skillId: string) => {
    console.log(`🚀 Starting General English ${skillId} practice`);
    navigate(`/general-${skillId}`);
  };

  const handleMockTest = (testId: number) => {
    console.log(`🧪 Starting General English test ${testId}`);
    navigate(`/general-test/${testId}`);
  };

  return (
    <StudentLayout title="General English Portal" showBackButton>
      <div className="space-y-8">
        <div className="text-center">
          <Badge variant="outline" className="mb-4 px-4 py-1 text-primary border-primary/20">
            GENERAL ENGLISH LEARNING
          </Badge>
          <h1 className="text-heading-2 mb-4">General English Test Preparation</h1>
          <p className="text-body-large max-w-3xl mx-auto">
            Master essential English skills with comprehensive lessons, interactive exercises, 
            and personalized feedback for all proficiency levels.
          </p>
        </div>

        <section>
          <h2 className="text-heading-3 mb-6">English Skills Practice</h2>
          <p className="text-text-secondary mb-6">Select a skill to practice and improve your English proficiency</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {skills.map((skill) => {
              const Icon = skill.icon;
              return (
                <Card 
                  key={skill.id} 
                  className={`card-interactive hover:scale-105 transition-all duration-300 ${
                    selectedSkill === skill.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedSkill(skill.id)}
                >
                  <CardHeader className="text-center pb-4">
                    <div className={`w-16 h-16 mx-auto rounded-2xl ${skill.bgColor} flex items-center justify-center mb-4`}>
                      <Icon className={`w-8 h-8 ${skill.color}`} />
                    </div>
                    <CardTitle className="text-xl">{skill.name}</CardTitle>
                    <p className="text-text-secondary text-sm">{skill.description}</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-text-secondary">Level:</span>
                        <Badge variant="secondary">{skill.difficulty}</Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-text-secondary">Duration:</span>
                        <span className="font-medium">{skill.timeLimit}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-text-primary">Practice Areas:</p>
                      <div className="space-y-1">
                        {skill.sections.slice(0, 2).map((section, index) => (
                          <p key={index} className="text-xs text-text-secondary">• {section}</p>
                        ))}
                        {skill.sections.length > 2 && (
                          <p className="text-xs text-text-tertiary">+ {skill.sections.length - 2} more</p>
                        )}
                      </div>
                    </div>

                    <Button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSkillPractice(skill.id);
                      }}
                      className="w-full btn-primary"
                      size="sm"
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
            <h2 className="text-heading-3">English Assessment Tests</h2>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              Level Assessment Available
            </Badge>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockTests.map((test) => (
              <Card key={test.id} className="card-modern hover-lift">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{test.title}</CardTitle>
                    <Target className="w-5 h-5 text-primary" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-text-secondary" />
                      <span>{test.difficulty}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-text-secondary" />
                      <span>{test.duration}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <BookOpen className="w-4 h-4 text-text-secondary" />
                    <span>{test.sections} sections included</span>
                  </div>

                  <Button 
                    onClick={() => handleMockTest(test.id)}
                    className="w-full btn-primary"
                    size="sm"
                  >
                    Start Assessment
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
              Start with a level assessment or jump into skill-specific practice
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={() => navigate('/general-test/1')}
                className="btn-gradient px-8"
                size="lg"
              >
                Take Level Assessment
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
  );
};

export default GeneralPortal;