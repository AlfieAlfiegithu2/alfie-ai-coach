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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-6 py-16">
        {/* Hero Section - Phantom Wallet Inspired */}
        <div className="text-center mb-20">
          <div className="mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 mb-8 shadow-2xl">
              <BookOpen className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-6xl font-bold text-white mb-6 tracking-tight">
              Achieve Your
              <span className="block bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
                IELTS Goals
              </span>
            </h1>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed mb-8">
              Personalized AI-powered preparation with authentic Cambridge materials. 
              Trusted by thousands of successful candidates worldwide.
            </p>
            
            {/* Trust Indicators */}
            <div className="flex items-center justify-center gap-8 mb-8">
              <div className="flex items-center gap-2 text-slate-400">
                <div className="w-2 h-2 rounded-full bg-green-400"></div>
                <span className="text-sm">Official Cambridge Content</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                <span className="text-sm">AI-Powered Analysis</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                <span className="text-sm">Secure & Private</span>
              </div>
            </div>

            {/* Primary CTA */}
            <div className="flex items-center justify-center gap-4">
              <Button 
                onClick={() => navigate('/tests')}
                className="h-14 px-8 text-lg font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
              >
                Start Practice
              </Button>
              <Button 
                onClick={() => navigate('/personal-page')}
                variant="outline"
                className="h-14 px-8 text-lg font-semibold border-slate-600 text-slate-300 hover:bg-slate-800 rounded-xl transition-all duration-300"
              >
                View Progress
              </Button>
            </div>
          </div>
        </div>

        {/* Main Action Cards - Modern & Clean */}
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
          <Card 
            className="cursor-pointer border-slate-700 bg-slate-800/50 backdrop-blur-xl rounded-2xl overflow-hidden group hover:border-violet-500/50 transition-all duration-300 shadow-2xl"
            onClick={() => navigate('/tests')}
          >
            <CardContent className="p-8 text-center">
              <div className="mb-6">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-300">
                  <BookOpen className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Cambridge Tests</h3>
                <p className="text-slate-300 mb-6 leading-relaxed">
                  Practice with authentic Cambridge IELTS materials. Experience the real test environment 
                  with our comprehensive testing platform.
                </p>
              </div>
              <Button 
                className="w-full h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 shadow-lg"
              >
                Start Practice Test
              </Button>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer border-slate-700 bg-slate-800/50 backdrop-blur-xl rounded-2xl overflow-hidden group hover:border-violet-500/50 transition-all duration-300 shadow-2xl"
            onClick={() => navigate('/personal-page')}
          >
            <CardContent className="p-8 text-center">
              <div className="mb-6">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-300">
                  <Star className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Personal Dashboard</h3>
                <p className="text-slate-300 mb-6 leading-relaxed">
                  Track your progress with AI-powered insights and personalized recommendations. 
                  See detailed analytics and improvement areas.
                </p>
              </div>
              
              {/* Quick Skill Access */}
              <div className="grid grid-cols-2 gap-3 mb-6">
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
                      className="flex flex-col gap-2 h-16 text-xs border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-slate-500 rounded-lg transition-all duration-200"
                    >
                      <Icon className="w-4 h-4" />
                      <span className="font-medium">{section.name}</span>
                    </Button>
                  );
                })}
              </div>
              
              <Button 
                className="w-full h-12 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 shadow-lg"
              >
                View Progress
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Features Section - Minimal & Professional */}
        <div className="max-w-6xl mx-auto mb-20">
          <h2 className="text-center text-3xl font-bold text-white mb-16">
            Why Thousands Choose Our Platform
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center group">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center group-hover:scale-110 transition-all duration-300">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-xl font-bold mb-4 text-white">Official Content</h4>
              <p className="text-slate-300 leading-relaxed">
                Authentic Cambridge IELTS materials from C17-C20, exactly as they appear in real tests.
              </p>
            </div>
            
            <div className="text-center group">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center group-hover:scale-110 transition-all duration-300">
                <Heart className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-xl font-bold mb-4 text-white">AI-Powered Feedback</h4>
              <p className="text-slate-300 leading-relaxed">
                Advanced AI provides instant, detailed feedback on speaking and writing performance.
              </p>
            </div>
            
            <div className="text-center group">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center group-hover:scale-110 transition-all duration-300">
                <Lightbulb className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-xl font-bold mb-4 text-white">Smart Analytics</h4>
              <p className="text-slate-300 leading-relaxed">
                Detailed progress tracking with personalized recommendations for improvement.
              </p>
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="text-center">
          <div className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-slate-800/50 border border-slate-700 backdrop-blur-xl">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
            <span className="text-slate-300">Join 50,000+ successful IELTS candidates</span>
          </div>
          
          <div className="mt-8">
            <Button
              onClick={() => navigate('/admin')}
              variant="outline"
              className="border-slate-600 text-slate-400 hover:bg-slate-800 hover:border-slate-500 rounded-xl transition-all duration-300"
            >
              <Settings className="w-4 h-4 mr-2" />
              Admin Portal
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;