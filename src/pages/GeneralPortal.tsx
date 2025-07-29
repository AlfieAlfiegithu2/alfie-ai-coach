import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BookOpen, 
  MessageSquare, 
  Users, 
  Lightbulb, 
  Trophy, 
  Clock, 
  Star,
  Globe,
  Brain,
  Target,
  Zap
} from 'lucide-react';
import StudentLayout from '@/components/StudentLayout';
import DailyChallenge from '@/components/DailyChallenge';

const GeneralPortal = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = [
    {
      id: 'grammar',
      name: 'Grammar Mastery',
      icon: BookOpen,
      description: 'Essential grammar rules and structures',
      lessons: 24,
      difficulty: 'Beginner to Advanced',
      color: 'text-brand-blue',
      bgColor: 'bg-brand-blue/10',
      progress: 65,
      topics: ['Tenses', 'Articles', 'Conditionals', 'Passive Voice']
    },
    {
      id: 'vocabulary',
      name: 'Vocabulary Building',
      icon: Brain,
      description: 'Build your word power systematically',
      lessons: 30,
      difficulty: 'All Levels',
      color: 'text-brand-green',
      bgColor: 'bg-brand-green/10',
      progress: 42,
      topics: ['Academic Words', 'Idioms', 'Phrasal Verbs', 'Collocations']
    },
    {
      id: 'conversation',
      name: 'Conversation Skills',
      icon: MessageSquare,
      description: 'Practical speaking for daily situations',
      lessons: 18,
      difficulty: 'Intermediate',
      color: 'text-brand-purple',
      bgColor: 'bg-brand-purple/10',
      progress: 78,
      topics: ['Small Talk', 'Business English', 'Travel English', 'Presentations']
    },
    {
      id: 'pronunciation',
      name: 'Pronunciation',
      icon: Globe,
      description: 'Perfect your accent and clarity',
      lessons: 16,
      difficulty: 'All Levels',
      color: 'text-brand-orange',
      bgColor: 'bg-brand-orange/10',
      progress: 23,
      topics: ['Phonics', 'Word Stress', 'Intonation', 'Connected Speech']
    }
  ];

  const featuredLessons = [
    {
      id: 1,
      title: 'Common English Idioms',
      category: 'Vocabulary',
      difficulty: 'Intermediate',
      duration: '15 min',
      description: 'Learn 20 essential idioms used in everyday conversation',
      type: 'Interactive Quiz',
      color: 'bg-brand-green/10 text-brand-green'
    },
    {
      id: 2,
      title: 'Present Perfect vs Past Simple',
      category: 'Grammar',
      difficulty: 'Beginner',
      duration: '20 min',
      description: 'Master the difference between these commonly confused tenses',
      type: 'Video + Exercises',
      color: 'bg-brand-blue/10 text-brand-blue'
    },
    {
      id: 3,
      title: 'Making Small Talk',
      category: 'Conversation',
      difficulty: 'Intermediate',
      duration: '12 min',
      description: 'Essential phrases and techniques for casual conversations',
      type: 'Role-play Practice',
      color: 'bg-brand-purple/10 text-brand-purple'
    },
    {
      id: 4,
      title: 'Word Stress Patterns',
      category: 'Pronunciation',
      difficulty: 'Advanced',
      duration: '18 min',
      description: 'Learn how stress affects meaning in English words',
      type: 'Audio Practice',
      color: 'bg-brand-orange/10 text-brand-orange'
    }
  ];

  const skillLevels = [
    { level: 'Beginner', range: 'A1-A2', lessons: 45, color: 'bg-green-100 text-green-800' },
    { level: 'Intermediate', range: 'B1-B2', lessons: 38, color: 'bg-blue-100 text-blue-800' },
    { level: 'Advanced', range: 'C1-C2', lessons: 25, color: 'bg-purple-100 text-purple-800' }
  ];

  const handleStartLesson = (lessonId: number) => {
    console.log(`🚀 Starting General English lesson ${lessonId}`);
    navigate('/tests');
  };

  const handleCategoryPractice = (categoryId: string) => {
    console.log(`🎯 Starting ${categoryId} practice`);
    navigate('/tests');
  };

  return (
    <StudentLayout title="General English Portal" showBackButton>
      <div className="space-y-8">
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Lightbulb className="w-8 h-8 text-brand-orange" />
            <h1 className="text-heading-2">General English Learning</h1>
          </div>
          <p className="text-body-large max-w-3xl mx-auto">
            Improve your overall English proficiency with structured lessons, 
            interactive exercises, and AI-powered feedback for all skill levels.
          </p>
        </div>

        <section className="bg-surface-1 rounded-3xl p-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-brand-blue mb-2">108</div>
              <p className="text-text-secondary">Lessons Completed</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-brand-green mb-2">7</div>
              <p className="text-text-secondary">Day Streak</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-brand-purple mb-2">B2</div>
              <p className="text-text-secondary">Current Level</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-heading-3 mb-6">Choose Your Focus Area</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <Card 
                  key={category.id} 
                  className={`card-interactive hover:scale-105 transition-all duration-300 ${
                    selectedCategory === category.id ? 'ring-2 ring-brand-blue' : ''
                  }`}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <CardHeader className="text-center pb-4">
                    <div className={`w-16 h-16 mx-auto rounded-2xl ${category.bgColor} flex items-center justify-center mb-4`}>
                      <Icon className={`w-8 h-8 ${category.color}`} />
                    </div>
                    <CardTitle className="text-xl">{category.name}</CardTitle>
                    <p className="text-text-secondary text-sm">{category.description}</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-text-secondary">Lessons:</span>
                        <span className="font-medium">{category.lessons}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-text-secondary">Level:</span>
                        <Badge variant="secondary" className="text-xs">{category.difficulty}</Badge>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-text-secondary">Progress:</span>
                        <span className="font-medium">{category.progress}%</span>
                      </div>
                      <Progress value={category.progress} className="h-2" />
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-text-primary">Topics:</p>
                      <div className="flex flex-wrap gap-1">
                        {category.topics.slice(0, 2).map((topic, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {topic}
                          </Badge>
                        ))}
                        {category.topics.length > 2 && (
                          <Badge variant="outline" className="text-xs text-text-tertiary">
                            +{category.topics.length - 2}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <Button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCategoryPractice(category.id);
                      }}
                      className="w-full btn-primary"
                      size="sm"
                    >
                      Continue Learning
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="text-heading-3 mb-6">Featured Lessons</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredLessons.map((lesson) => (
              <Card key={lesson.id} className="card-modern hover-lift">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Badge className={lesson.color + " mb-2 text-xs"}>
                        {lesson.category}
                      </Badge>
                      <CardTitle className="text-lg leading-tight">{lesson.title}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-text-secondary">{lesson.description}</p>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <Target className="w-3 h-3 text-text-secondary" />
                      <span>{lesson.difficulty}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-text-secondary" />
                      <span>{lesson.duration}</span>
                    </div>
                  </div>
                  
                  <div className="text-xs text-text-secondary">
                    {lesson.type}
                  </div>

                  <Button 
                    onClick={() => handleStartLesson(lesson.id)}
                    className="w-full btn-primary"
                    size="sm"
                  >
                    Start Lesson
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <h2 className="text-heading-3 mb-6">Learning Paths by Level</h2>
            <div className="space-y-4">
              {skillLevels.map((level) => (
                <Card key={level.level} className="card-modern">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Badge className={level.color}>
                          {level.range}
                        </Badge>
                        <div>
                          <h3 className="font-semibold">{level.level}</h3>
                          <p className="text-sm text-text-secondary">
                            {level.lessons} lessons available
                          </p>
                        </div>
                      </div>
                      <Button 
                        onClick={() => navigate('/tests')}
                        variant="outline"
                        size="sm"
                      >
                        Explore
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <DailyChallenge />
          </div>
        </div>

        <section className="bg-gradient-to-r from-brand-blue/10 to-brand-green/10 rounded-3xl p-8">
          <div className="text-center">
            <h3 className="text-heading-3 mb-4">Ready to Learn?</h3>
            <p className="text-body mb-6">
              Choose how you want to practice English today
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              <Button 
                onClick={() => navigate('/tests')}
                className="btn-primary px-6 py-4 h-auto flex flex-col gap-2"
              >
                <Zap className="w-5 h-5" />
                <span>Quick Lesson</span>
                <span className="text-xs opacity-80">15 minutes</span>
              </Button>
              <Button 
                onClick={() => navigate('/tests')}
                variant="outline"
                className="px-6 py-4 h-auto flex flex-col gap-2"
              >
                <Users className="w-5 h-5" />
                <span>Group Practice</span>
                <span className="text-xs opacity-80">Join others</span>
              </Button>
              <Button 
                onClick={() => navigate('/personal-page')}
                variant="outline"
                className="px-6 py-4 h-auto flex flex-col gap-2"
              >
                <Trophy className="w-5 h-5" />
                <span>View Progress</span>
                <span className="text-xs opacity-80">Track growth</span>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </StudentLayout>
  );
};

export default GeneralPortal;