import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Headphones, PenTool, Mic, ArrowLeft, Clock, Target, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PTEPortal = () => {
  const navigate = useNavigate();

  const sections = [
    { 
      id: "speaking-writing", 
      name: "Speaking & Writing", 
      icon: PenTool, 
      description: "77-93 minutes", 
      tasks: ["Personal Introduction", "Read Aloud", "Repeat Sentence", "Describe Image", "Re-tell Lecture", "Answer Short Question", "Summarize Written Text", "Essay Writing"],
      color: "from-purple-400 to-purple-600" 
    },
    { 
      id: "reading", 
      name: "Reading", 
      icon: BookOpen, 
      description: "32-41 minutes", 
      tasks: ["Multiple Choice", "Re-order Paragraphs", "Reading Fill in Blanks", "Reading & Writing Fill in Blanks"],
      color: "from-green-400 to-green-600" 
    },
    { 
      id: "listening", 
      name: "Listening", 
      icon: Headphones, 
      description: "45-57 minutes", 
      tasks: ["Summarize Spoken Text", "Multiple Choice", "Fill in Blanks", "Highlight Correct Summary", "Select Missing Word", "Highlight Incorrect Words", "Write from Dictation"],
      color: "from-blue-400 to-blue-600" 
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
                <h1 className="text-heading-2">PTE Academic Portal</h1>
                <p className="text-body text-text-secondary">Pearson Test of English Academic Practice</p>
              </div>
            </div>
            <Badge variant="secondary" className="text-sm px-4 py-2">
              PTE Academic
            </Badge>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-12">
        <div className="max-w-6xl mx-auto">
          
          {/* Info Banner */}
          <Card className="card-modern mb-12 bg-gradient-to-r from-brand-green/10 to-brand-blue/10 border-brand-green/20">
            <CardContent className="p-8">
              <div className="text-center">
                <h2 className="text-heading-3 mb-4">Welcome to PTE Academic Practice</h2>
                <p className="text-body-large mb-6 max-w-3xl mx-auto">
                  PTE Academic is a computer-based English test with integrated skills assessment. 
                  Practice with authentic question types and AI-powered feedback.
                </p>
                <div className="flex flex-wrap justify-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-brand-green" />
                    <span>3 hours total</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-brand-blue" />
                    <span>Scores 10-90</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-brand-purple" />
                    <span>Computer-based</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Test Sections */}
          <div className="grid lg:grid-cols-3 gap-8 mb-12">
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
                          {section.tasks.slice(0, 4).map((task, index) => (
                            <div key={index} className="text-xs text-text-secondary bg-surface-3 px-3 py-1 rounded-lg">
                              {task}
                            </div>
                          ))}
                          {section.tasks.length > 4 && (
                            <div className="text-xs text-text-tertiary">
                              +{section.tasks.length - 4} more types...
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <Button 
                        className="w-full btn-primary"
                        onClick={() => {
                          // Will be implemented when PTE content is added
                          console.log(`🎯 Starting PTE ${section.name} practice`);
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
                <h3 className="text-heading-3 mb-4">PTE Content Coming Soon</h3>
                <p className="text-body-large mb-8 text-text-secondary">
                  We're working hard to bring you comprehensive PTE Academic practice materials. 
                  Our team is developing authentic question types, AI-powered feedback, and detailed analytics.
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

export default PTEPortal;