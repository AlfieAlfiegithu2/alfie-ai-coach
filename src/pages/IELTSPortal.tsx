import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Headphones, PenTool, Mic, Clock, Target, BarChart } from "lucide-react";
import StudentLayout from "@/components/StudentLayout";

const IELTSPortal = () => {
  const navigate = useNavigate();

  const skills = [
    {
      id: "reading",
      title: "Reading",
      icon: BookOpen,
      description: "Academic and General Training passages with comprehensive question types",
      questions: "40 questions",
      duration: "60 minutes",
      difficulty: "Band 4.0 - 9.0",
      color: "bg-blue-500"
    },
    {
      id: "listening", 
      title: "Listening",
      icon: Headphones,
      description: "Four sections covering social and academic contexts",
      questions: "40 questions",
      duration: "30 minutes",
      difficulty: "Band 4.0 - 9.0", 
      color: "bg-green-500"
    },
    {
      id: "writing",
      title: "Writing", 
      icon: PenTool,
      description: "Task 1 (charts/graphs) and Task 2 (essay writing)",
      questions: "2 tasks",
      duration: "60 minutes",
      difficulty: "Band 4.0 - 9.0",
      color: "bg-purple-500"
    },
    {
      id: "speaking",
      title: "Speaking",
      icon: Mic,
      description: "Face-to-face interview with examiner in three parts", 
      questions: "3 parts",
      duration: "11-14 minutes",
      difficulty: "Band 4.0 - 9.0",
      color: "bg-orange-500"
    }
  ];

  const mockTests = [
    {
      id: 1,
      title: "IELTS Academic Full Test",
      type: "Full Test",
      difficulty: "Mixed Bands",
      duration: "2h 45m",
      description: "Complete IELTS Academic test with all four skills",
      scoreRange: "4.0 - 9.0"
    },
    {
      id: 2, 
      title: "IELTS General Training Full Test",
      type: "Full Test",
      difficulty: "Mixed Bands",
      duration: "2h 45m", 
      description: "Complete IELTS General Training test",
      scoreRange: "4.0 - 9.0"
    },
    {
      id: 3,
      title: "Reading & Writing Skills Test",
      type: "Section Test", 
      difficulty: "Intermediate",
      duration: "2h",
      description: "Focused practice on reading and writing skills",
      scoreRange: "5.0 - 8.0"
    },
    {
      id: 4,
      title: "Listening & Speaking Skills Test", 
      type: "Section Test",
      difficulty: "Intermediate",
      duration: "45m",
      description: "Comprehensive listening and speaking assessment",
      scoreRange: "5.0 - 8.0"
    }
  ];

  const handleSkillPractice = (skillId: string) => {
    switch(skillId) {
      case 'reading':
        navigate('/reading');
        break;
      case 'listening':
        navigate('/listening');
        break;
      case 'writing':
        navigate('/writing');
        break;
      case 'speaking':
        navigate('/speaking');
        break;
      default:
        navigate('/');
    }
  };

  const handleMockTest = (testId: number) => {
    navigate(`/test/${testId}`);
  };

  return (
    <StudentLayout title="IELTS Portal" showBackButton={true}>
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            IELTS Test Preparation
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Master all four skills of the International English Language Testing System with comprehensive practice materials and mock tests
          </p>
        </div>

        {/* Skills Practice Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Practice by Skill</h2>
            <Badge variant="outline" className="text-sm">
              4 Skills Available
            </Badge>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {skills.map((skill) => {
              const Icon = skill.icon;
              return (
                <Card key={skill.id} className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-0 shadow-md">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className={`p-3 rounded-lg ${skill.color} text-white`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {skill.difficulty}
                      </Badge>
                    </div>
                    <CardTitle className="text-xl group-hover:text-blue-600 transition-colors">
                      {skill.title}
                    </CardTitle>
                    <CardDescription className="text-sm text-gray-600 line-clamp-2">
                      {skill.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-4">
                    <div className="space-y-2 text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        <span>{skill.questions}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>{skill.duration}</span>
                      </div>
                    </div>
                    <Button 
                      onClick={() => handleSkillPractice(skill.id)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Start Practice
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Mock Tests Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">IELTS Practice Tests</h2>
            <Badge variant="outline" className="text-sm">
              Full & Section Tests
            </Badge>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2">
            {mockTests.map((test) => (
              <Card key={test.id} className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-0 shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={test.type === 'Full Test' ? 'default' : 'secondary'} className="text-xs">
                          {test.type}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {test.difficulty}
                        </Badge>
                      </div>
                      <CardTitle className="text-xl group-hover:text-blue-600 transition-colors">
                        {test.title}
                      </CardTitle>
                    </div>
                  </div>
                  <CardDescription className="text-gray-600">
                    {test.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>{test.duration}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BarChart className="h-4 w-4" />
                      <span>{test.scoreRange}</span>
                    </div>
                  </div>
                  <Button 
                    onClick={() => handleMockTest(test.id)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Start Test
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Call to Action */}
        <section className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Ready to Achieve Your Target Band Score?
          </h3>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Join thousands of successful test takers who improved their IELTS scores with our comprehensive preparation materials.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={() => handleMockTest(1)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8"
            >
              Take Full Practice Test
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/dashboard')}
              className="border-blue-600 text-blue-600 hover:bg-blue-50 px-8"
            >
              Track Your Progress
            </Button>
          </div>
        </section>
      </div>
    </StudentLayout>
  );
};

export default IELTSPortal;