import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Headphones, PenTool, Mic, ArrowLeft, Clock, Target, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

const TOEFLPortal = () => {
  const navigate = useNavigate();

  const sections = [
    { 
      id: "reading", 
      name: "Reading", 
      icon: BookOpen, 
      description: "54-72 minutes", 
      tasks: ["Academic Passages", "Multiple Choice", "Insert Text", "Reading to Learn"],
      color: "from-green-400 to-green-600" 
    },
    { 
      id: "listening", 
      name: "Listening", 
      icon: Headphones, 
      description: "41-57 minutes", 
      tasks: ["Lectures", "Conversations", "Multiple Choice", "Listening to Learn"],
      color: "from-blue-400 to-blue-600" 
    },
    { 
      id: "speaking", 
      name: "Speaking", 
      icon: Mic, 
      description: "17 minutes", 
      tasks: ["Independent Tasks", "Integrated Tasks", "Campus Life", "Academic Courses"],
      color: "from-orange-400 to-orange-600" 
    },
    { 
      id: "writing", 
      name: "Writing", 
      icon: PenTool, 
      description: "50 minutes", 
      tasks: ["Integrated Writing", "Academic Discussion"],
      color: "from-purple-400 to-purple-600" 
    }
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
                <h1 className="text-heading-2">TOEFL iBT Portal</h1>
                <p className="text-body text-text-secondary">Test of English as a Foreign Language</p>
              </div>
            </div>
            <Badge variant="secondary" className="text-sm px-4 py-2">
              TOEFL iBT
            </Badge>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-12">
        <div className="max-w-6xl mx-auto">
          
          {/* Info Banner */}
          <Card className="card-modern mb-12 bg-gradient-to-r from-brand-orange/10 to-brand-purple/10 border-brand-orange/20">
            <CardContent className="p-8">
              <div className="text-center">
                <h2 className="text-heading-3 mb-4">Welcome to TOEFL iBT Practice</h2>
                <p className="text-body-large mb-6 max-w-3xl mx-auto">
                  TOEFL iBT measures your English proficiency in academic settings. 
                  Practice with authentic materials and get detailed performance feedback.
                </p>
                <div className="flex flex-wrap justify-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-brand-orange" />
                    <span>3 hours total</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-brand-purple" />
                    <span>Scores 0-120</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-brand-blue" />
                    <span>Internet-based</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Test Sections */}
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
                        <p className="text-text-secondary text-sm flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {section.description}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-sm mb-3 text-text-primary">Question Types:</h4>
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
                          // Will be implemented when TOEFL content is added
                          console.log(`🎯 Starting TOEFL ${section.name} practice`);
                        }}
                      >
                        Start {section.name}
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
                <div className="w-16 h-16 bg-brand-orange/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Target className="w-8 h-8 text-brand-orange" />
                </div>
                <h3 className="text-heading-3 mb-4">TOEFL Content Coming Soon</h3>
                <p className="text-body-large mb-8 text-text-secondary">
                  We're developing comprehensive TOEFL iBT materials with authentic question types, 
                  integrated skills practice, and advanced scoring algorithms.
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

export default TOEFLPortal;