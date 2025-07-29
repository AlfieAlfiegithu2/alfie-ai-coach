import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Volume2, PenTool, MessageSquare, Target, Award, Clock, Globe } from 'lucide-react';
import StudentLayout from '@/components/StudentLayout';

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

  const mockTests = [
    { 
      id: 1, 
      title: 'TOEFL iBT Practice Test 1', 
      difficulty: 'Beginner', 
      duration: '3 hours', 
      score: '0-120',
      type: 'Full Test'
    },
    { 
      id: 2, 
      title: 'TOEFL iBT Practice Test 2', 
      difficulty: 'Intermediate', 
      duration: '3 hours', 
      score: '0-120',
      type: 'Full Test'
    },
    { 
      id: 3, 
      title: 'TOEFL iBT Practice Test 3', 
      difficulty: 'Advanced', 
      duration: '3 hours', 
      score: '0-120',
      type: 'Full Test'
    },
    { 
      id: 4, 
      title: 'TOEFL Speaking Only', 
      difficulty: 'Mixed', 
      duration: '17 minutes', 
      score: '0-30',
      type: 'Section Test'
    },
    { 
      id: 5, 
      title: 'TOEFL Writing Only', 
      difficulty: 'Mixed', 
      duration: '50 minutes', 
      score: '0-30',
      type: 'Section Test'
    }
  ];

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
          <h2 className="text-heading-3 mb-6">Practice by Section</h2>
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
                        <span className="text-text-secondary">Time:</span>
                        <span className="font-medium">{skill.timeLimit}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-text-secondary">Questions:</span>
                        <span className="font-medium">{skill.questions}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-text-primary">Focus Areas:</p>
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
            <h2 className="text-heading-3">TOEFL Practice Tests</h2>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              Official Scoring
            </Badge>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockTests.map((test) => (
              <Card key={test.id} className="card-modern hover-lift">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{test.title}</CardTitle>
                    <Badge 
                      variant={test.type === 'Full Test' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {test.type}
                    </Badge>
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
                    <Target className="w-4 h-4 text-text-secondary" />
                    <span>Score Range: {test.score}</span>
                  </div>

                  <Button 
                    onClick={() => handleMockTest(test.id)}
                    className="w-full btn-primary"
                    size="sm"
                  >
                    Start Practice Test
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
                onClick={() => navigate('/personal-page')}
                variant="outline"
                size="lg"
              >
                Track Progress
              </Button>
            </div>
          </div>
        </section>
      </div>
    </StudentLayout>
  );
};

export default TOEFLPortal;