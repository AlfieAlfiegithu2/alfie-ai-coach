import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Headphones, PenTool, Mic, Star, Heart, Lightbulb, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const Dashboard = () => {
  const navigate = useNavigate();

  const handleStartTest = (testType: string) => {
    navigate(`/${testType}`);
  };

  const sections = [
    { id: "listening", name: "Listening", icon: Headphones, color: "bg-blue-500" },
    { id: "reading", name: "Reading", icon: BookOpen, color: "bg-green-500" },
    { id: "writing", name: "Writing", icon: PenTool, color: "bg-purple-500" },
    { id: "speaking", name: "Speaking", icon: Mic, color: "bg-orange-500" }
  ];

  return (
    <div className="min-h-screen" style={{ background: 'var(--gradient-hero)' }}>
      <div className="container mx-auto px-6 py-12">
        {/* Hero Section - Clean & Welcoming */}
        <div className="text-center mb-16 fade-in">
          <div className="mb-8">
            <div className="inline-flex items-center gap-3 mb-6 gentle-hover">
              <Lightbulb className="w-8 h-8 text-gentle-blue animate-pulse" />
              <h1 className="text-5xl font-georgia font-bold text-foreground">
                Your Path to IELTS Mastery
              </h1>
            </div>
            <p className="text-xl text-warm-gray max-w-2xl mx-auto leading-relaxed">
              Welcome to your personal IELTS companion. Clean, simple, and designed to guide you toward success with confidence.
            </p>
            
            {/* Motivational Quote */}
            <div className="mt-8 p-4 rounded-2xl bg-card/50 backdrop-blur-sm border border-light-border max-w-md mx-auto soft-glow">
              <p className="text-sm text-warm-gray italic">
                "Every expert was once a beginner. Every pro was once an amateur."
              </p>
            </div>
          </div>
        </div>

        {/* Main Action Cards - Soft & Approachable */}
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
          <Card 
            className="cursor-pointer gentle-hover border-light-border shadow-soft rounded-2xl overflow-hidden group"
            onClick={() => navigate('/tests')}
            style={{ background: 'var(--gradient-card)' }}
          >
            <CardContent className="p-8 text-center">
              <div className="mb-6">
                <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 group-hover:success-glow transition-all duration-300" 
                     style={{ background: 'var(--gradient-button)' }}>
                  <BookOpen className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-georgia font-bold text-foreground mb-3">Cambridge Tests</h3>
                <p className="text-warm-gray mb-6 leading-relaxed">
                  Practice with authentic Cambridge IELTS materials from books C17-C20. 
                  Experience the real test environment in a calm, supportive space.
                </p>
              </div>
              <Button 
                className="w-full h-12 rounded-xl font-medium transition-all duration-200 hover:scale-[1.02]"
                style={{ background: 'var(--gradient-button)', border: 'none' }}
              >
                Start Cambridge Practice
              </Button>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer gentle-hover border-light-border shadow-soft rounded-2xl overflow-hidden group"
            style={{ background: 'var(--gradient-card)' }}
          >
            <CardContent className="p-8 text-center">
              <div className="mb-6">
                <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 group-hover:success-glow transition-all duration-300"
                     style={{ background: 'var(--gradient-success)' }}>
                  <Star className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-georgia font-bold text-foreground mb-3">Skill Builder</h3>
                <p className="text-warm-gray mb-6 leading-relaxed">
                  Focus on individual skills with targeted practice. 
                  Build confidence one section at a time with gentle guidance.
                </p>
              </div>
              
              {/* Skill Buttons Grid */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {sections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <Button
                      key={section.id}
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartTest(section.id);
                      }}
                      className="flex flex-col gap-2 h-16 text-xs border-light-border hover:bg-gentle-blue/10 hover:border-gentle-blue/30 rounded-xl transition-all duration-200"
                    >
                      <Icon className="w-4 h-4" />
                      <span className="font-medium">{section.name}</span>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Features Section - Clean & Informative */}
        <div className="max-w-6xl mx-auto mb-20">
          <h2 className="text-center text-3xl font-georgia font-bold text-foreground mb-12">
            Why Choose Our Platform?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center fade-in">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" 
                   style={{ background: 'var(--gradient-button)' }}>
                <BookOpen className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-lg font-semibold mb-3 font-georgia">Authentic Content</h4>
              <p className="text-warm-gray leading-relaxed">
                Practice with genuine Cambridge IELTS materials, designed to mirror the real test experience.
              </p>
            </div>
            
            <div className="text-center fade-in">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                   style={{ background: 'var(--gradient-success)' }}>
                <Heart className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-lg font-semibold mb-3 font-georgia">AI Guidance</h4>
              <p className="text-warm-gray leading-relaxed">
                Receive personalized feedback on speaking and writing with encouraging, constructive insights.
              </p>
            </div>
            
            <div className="text-center fade-in">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                   style={{ background: 'linear-gradient(135deg, hsl(285 85% 75%), hsl(285 85% 85%))' }}>
                <Lightbulb className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-lg font-semibold mb-3 font-georgia">Smart Learning</h4>
              <p className="text-warm-gray leading-relaxed">
                Progress tracking and adaptive recommendations to help you improve efficiently and enjoyably.
              </p>
            </div>
          </div>
        </div>

        {/* Gentle Call to Action */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-card/50 backdrop-blur-sm border border-light-border soft-glow">
            <Star className="w-4 h-4 text-gentle-blue" />
            <span className="text-sm text-warm-gray">Ready to begin your IELTS journey?</span>
            <Heart className="w-4 h-4 text-soft-green" />
          </div>
        </div>

        {/* Admin Access - Direct & Prominent */}
        <div className="text-center py-8 mt-12">
          <Button
            onClick={() => navigate('/admin/login')}
            variant="outline"
            className="rounded-xl border-gentle-blue/30 hover:bg-gentle-blue/10 hover:border-gentle-blue transition-all duration-200"
          >
            <Settings className="w-4 h-4 mr-2" />
            Admin Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;