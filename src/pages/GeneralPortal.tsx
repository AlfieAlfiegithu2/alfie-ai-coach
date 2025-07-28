import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Headphones, PenTool, Mic, ArrowLeft, Clock, Target, Users, GraduationCap } from "lucide-react";
import { useNavigate } from "react-router-dom";

const GeneralPortal = () => {
  const navigate = useNavigate();

  const sections = [
    { 
      id: "grammar", 
      name: "Grammar Essentials", 
      icon: BookOpen, 
      description: "Foundation to Advanced", 
      tasks: ["Tenses", "Articles", "Prepositions", "Modal Verbs", "Conditionals"],
      color: "from-green-400 to-green-600" 
    },
    { 
      id: "vocabulary", 
      name: "Vocabulary Building", 
      icon: GraduationCap, 
      description: "Academic & Business", 
      tasks: ["Word Families", "Collocations", "Phrasal Verbs", "Idioms", "Academic Words"],
      color: "from-blue-400 to-blue-600" 
    },
    { 
      id: "conversation", 
      name: "Conversation Skills", 
      icon: Mic, 
      description: "Practical Communication", 
      tasks: ["Daily Situations", "Business English", "Small Talk", "Presentations"],
      color: "from-orange-400 to-orange-600" 
    },
    { 
      id: "writing", 
      name: "Writing Skills", 
      icon: PenTool, 
      description: "Academic & Professional", 
      tasks: ["Essay Writing", "Email Writing", "Reports", "Creative Writing"],
      color: "from-purple-400 to-purple-600" 
    }
  ];

  const levels = [
    { name: "Beginner", description: "A1-A2 Level", color: "bg-brand-green/10 text-brand-green" },
    { name: "Intermediate", description: "B1-B2 Level", color: "bg-brand-blue/10 text-brand-blue" },
    { name: "Advanced", description: "C1-C2 Level", color: "bg-brand-purple/10 text-brand-purple" }
  ];

  return (
    <div className="min-h-screen bg-surface-2">
      {/* Header */}
      <header className="bg-surface-1 border-b border-border shadow-sm">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/')}
                className="hover-lift"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
              <div>
                <h1 className="text-heading-2">General English Portal</h1>
                <p className="text-body text-text-secondary">Comprehensive English Language Learning</p>
              </div>
            </div>
            <Badge variant="secondary" className="text-sm px-4 py-2">
              General English
            </Badge>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-12">
        <div className="max-w-6xl mx-auto">
          
          {/* Info Banner */}
          <Card className="card-modern mb-12 bg-gradient-to-r from-brand-purple/10 to-brand-green/10 border-brand-purple/20">
            <CardContent className="p-8">
              <div className="text-center">
                <h2 className="text-heading-3 mb-4">Welcome to General English Learning</h2>
                <p className="text-body-large mb-6 max-w-3xl mx-auto">
                  Improve your English skills with comprehensive lessons, interactive exercises, 
                  and personalized feedback for all proficiency levels.
                </p>
                
                {/* Level Selection */}
                <div className="flex flex-wrap justify-center gap-4 mb-6">
                  {levels.map((level) => (
                    <div key={level.name} className={`px-4 py-2 rounded-xl ${level.color} font-medium text-sm`}>
                      <div className="font-semibold">{level.name}</div>
                      <div className="text-xs opacity-80">{level.description}</div>
                    </div>
                  ))}
                </div>
                
                <div className="flex flex-wrap justify-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-brand-purple" />
                    <span>Self-paced learning</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-brand-green" />
                    <span>All skill levels</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-brand-blue" />
                    <span>Interactive practice</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Learning Sections */}
          <div className="grid lg:grid-cols-2 gap-8 mb-12">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <Card key={section.id} className="card-interactive hover:scale-105">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${section.color} flex items-center justify-center`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{section.name}</CardTitle>
                        <p className="text-text-secondary text-sm">
                          {section.description}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-sm mb-3 text-text-primary">Topics Covered:</h4>
                        <div className="space-y-2">
                          {section.tasks.map((task, index) => (
                            <div key={index} className="text-xs text-text-secondary bg-surface-3 px-3 py-1 rounded-lg">
                              {task}
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <Button 
                        className="w-full btn-primary"
                        onClick={() => {
                          // Will be implemented when General English content is added
                          console.log(`🎯 Starting General English ${section.name} practice`);
                        }}
                      >
                        Start Learning
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Coming Soon Notice */}
          <Card className="card-modern text-center">
            <CardContent className="py-12">
              <div className="max-w-2xl mx-auto">
                <div className="w-16 h-16 bg-brand-purple/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <GraduationCap className="w-8 h-8 text-brand-purple" />
                </div>
                <h3 className="text-heading-3 mb-4">General English Content Coming Soon</h3>
                <p className="text-body-large mb-8 text-text-secondary">
                  We're creating comprehensive English learning materials for all levels, 
                  from basic grammar to advanced communication skills.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button 
                    onClick={() => navigate('/tests')} 
                    className="btn-primary"
                  >
                    Try IELTS Practice Instead
                  </Button>
                  <Button 
                    onClick={() => navigate('/')} 
                    variant="outline"
                    className="hover-lift"
                  >
                    Back to Home
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default GeneralPortal;