import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import TestCard from "@/components/TestCard";
import StatsCard from "@/components/StatsCard";
import { BookOpen, Headphones, PenTool, Mic, Target, TrendingUp, Clock, Award } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-image.jpg";

const Dashboard = () => {
  const navigate = useNavigate();

  const handleStartTest = (testType: string) => {
    switch (testType) {
      case "reading":
        navigate("/reading");
        break;
      case "listening":
        navigate("/listening");
        break;
      case "writing":
        navigate("/writing");
        break;
      case "speaking":
        navigate("/speaking");
        break;
      case "full":
        // For now, start with reading - in future this would be a full test flow
        navigate("/reading");
        break;
      default:
        console.log(`Starting ${testType} test`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-background via-blue-light/20 to-blue-medium/10">
        <div className="container mx-auto px-4 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h2 className="text-4xl lg:text-6xl font-bold text-foreground leading-tight">
                  Master IELTS with
                  <span className="bg-gradient-to-r from-blue-deep to-blue-medium bg-clip-text text-transparent"> AI-Powered </span>
                  Mock Tests
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed max-w-md">
                  Get instant feedback, detailed analysis, and personalized recommendations to achieve your target IELTS band score.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  variant="hero" 
                  size="lg"
                  onClick={() => handleStartTest("full")}
                  className="shadow-strong"
                >
                  Start Full Mock Test
                </Button>
                <Button 
                  variant="light" 
                  size="lg"
                >
                  Try Practice Mode
                </Button>
              </div>

              <div className="flex items-center gap-8 pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">50K+</div>
                  <div className="text-sm text-muted-foreground">Tests Taken</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">8.5</div>
                  <div className="text-sm text-muted-foreground">Avg Band Score</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">95%</div>
                  <div className="text-sm text-muted-foreground">Success Rate</div>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <img 
                src={heroImage} 
                alt="IELTS Study Illustration" 
                className="w-full h-auto rounded-2xl shadow-strong"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Current Band Score"
            value="7.5"
            change="+0.5 from last test"
            trend="up"
            icon={<Target className="w-4 h-4 text-blue-deep" />}
          />
          <StatsCard
            title="Tests Completed"
            value="12"
            change="3 this week"
            trend="up"
            icon={<Award className="w-4 h-4 text-blue-deep" />}
          />
          <StatsCard
            title="Study Streak"
            value="7 days"
            change="Keep it up!"
            trend="up"
            icon={<TrendingUp className="w-4 h-4 text-blue-deep" />}
          />
          <StatsCard
            title="Time Saved"
            value="24h"
            change="vs traditional prep"
            trend="neutral"
            icon={<Clock className="w-4 h-4 text-blue-deep" />}
          />
        </div>
      </section>

      {/* Test Sections */}
      <section className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold text-foreground mb-4">Choose Your Test Section</h3>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Practice individual skills or take the complete IELTS Academic mock test with AI-powered feedback
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <TestCard
            title="Reading"
            description="3 passages with 40 questions. Practice comprehension, skimming, and scanning techniques."
            duration="60 minutes"
            difficulty="Intermediate"
            participants={1247}
            icon={<BookOpen className="w-6 h-6 text-blue-deep" />}
            onStart={() => handleStartTest("reading")}
          />
          
          <TestCard
            title="Listening"
            description="4 audio sections with 40 questions. Improve your listening skills with varied accents."
            duration="30 minutes"
            difficulty="Beginner"
            participants={2156}
            icon={<Headphones className="w-6 h-6 text-blue-deep" />}
            onStart={() => handleStartTest("listening")}
          />
          
          <TestCard
            title="Writing"
            description="Task 1 & 2 with instant AI feedback. Get detailed analysis of your writing skills."
            duration="60 minutes"
            difficulty="Advanced"
            participants={891}
            icon={<PenTool className="w-6 h-6 text-blue-deep" />}
            onStart={() => handleStartTest("writing")}
          />
          
          <TestCard
            title="Speaking"
            description="3-part speaking test with AI assessment. Practice with realistic interview scenarios."
            duration="14 minutes"
            difficulty="Advanced"
            participants={634}
            icon={<Mic className="w-6 h-6 text-blue-deep" />}
            onStart={() => handleStartTest("speaking")}
          />
        </div>

        <div className="text-center">
          <Card className="max-w-2xl mx-auto bg-gradient-to-r from-blue-light to-blue-medium/20">
            <CardHeader>
              <CardTitle className="text-2xl">Complete IELTS Mock Test</CardTitle>
              <CardDescription className="text-base">
                Take all four sections in order for the most realistic exam experience
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center gap-6 mb-6 text-sm text-muted-foreground">
                <span>⏱️ 3 hours total</span>
                <span>📊 Detailed AI feedback</span>
                <span>🎯 Band score prediction</span>
              </div>
              <Button 
                variant="hero" 
                size="lg" 
                onClick={() => handleStartTest("full")}
                className="w-full shadow-medium"
              >
                Start Complete Mock Test
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-foreground mb-4">Why Choose Alfie IELTS?</h3>
            <p className="text-lg text-muted-foreground">Advanced AI technology meets proven IELTS preparation methods</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardHeader>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-light flex items-center justify-center">
                  <Target className="w-8 h-8 text-blue-deep" />
                </div>
                <CardTitle>Instant AI Feedback</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Get detailed, personalized feedback within seconds of completing any test section
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-light flex items-center justify-center">
                  <TrendingUp className="w-8 h-8 text-blue-deep" />
                </div>
                <CardTitle>Track Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Monitor your improvement with detailed analytics and band score predictions
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-light flex items-center justify-center">
                  <Award className="w-8 h-8 text-blue-deep" />
                </div>
                <CardTitle>Authentic Tests</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Practice with test materials that mirror the actual IELTS Academic format
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;