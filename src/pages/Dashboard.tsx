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
      <section className="relative overflow-hidden bg-gradient-to-br from-background via-peachy-pink/20 to-soft-mint/15">
        <div className="container mx-auto px-4 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 animate-fade-in-up">
              <div className="space-y-6">
                <div className="inline-block">
                  <span className="font-handwriting text-xl text-warm-coral animate-wiggle inline-block">
                    Hey there, future IELTS champion! 👋
                  </span>
                </div>
                
                <h2 className="text-4xl lg:text-6xl font-bold text-foreground leading-tight">
                  Let's achieve your
                  <span className="bg-gradient-to-r from-warm-coral to-sunny-yellow bg-clip-text text-transparent"> IELTS dreams </span>
                  together! ✨
                </h2>
                
                <p className="text-lg text-muted-foreground leading-relaxed max-w-md">
                  Your friendly AI study buddy is here to support you every step of the way. 
                  Get encouraging feedback, celebrate your progress, and turn your goals into achievements! 🎯
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  variant="hero" 
                  size="lg"
                  onClick={() => handleStartTest("full")}
                  className="warm-hover shadow-strong font-semibold"
                >
                  🚀 Start Your Journey
                </Button>
                <Button 
                  variant="outline" 
                  size="lg"
                  className="warm-hover border-warm-coral text-warm-coral hover:bg-warm-coral hover:text-white"
                >
                  💡 Explore Practice Mode
                </Button>
              </div>

              <div className="flex items-center gap-8 pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">50K+</div>
                  <div className="text-sm text-muted-foreground">Happy Learners 😊</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">8.5</div>
                  <div className="text-sm text-muted-foreground">Average Band Score 🎉</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">95%</div>
                  <div className="text-sm text-muted-foreground">Success Stories 🌟</div>
                </div>
              </div>
            </div>
            
            <div className="relative animate-bounce-gentle">
              <div className="absolute -inset-4 bg-gradient-to-r from-warm-coral/20 to-sunny-yellow/20 rounded-3xl blur-2xl"></div>
              <img 
                src={heroImage} 
                alt="Happy student learning IELTS" 
                className="relative w-full h-auto rounded-3xl shadow-strong"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold text-foreground mb-2 font-handwriting">
            Your progress makes us proud! 🌈
          </h3>
          <p className="text-muted-foreground">Here's how you're growing</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Your Current Band"
            value="7.5"
            change="+0.5 this week! 🎊"
            trend="up"
            icon={<Target className="w-4 h-4 text-warm-coral" />}
          />
          <StatsCard
            title="Tests Completed"
            value="12"
            change="Amazing effort! 💪"
            trend="up"
            icon={<Award className="w-4 h-4 text-warm-coral" />}
          />
          <StatsCard
            title="Learning Streak"
            value="7 days"
            change="You're on fire! 🔥"
            trend="up"
            icon={<TrendingUp className="w-4 h-4 text-warm-coral" />}
          />
          <StatsCard
            title="Study Time Saved"
            value="24h"
            change="Smart learning! 🧠"
            trend="neutral"
            icon={<Clock className="w-4 h-4 text-warm-coral" />}
          />
        </div>
      </section>

      {/* Test Sections */}
      <section className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold text-foreground mb-4">
            Pick your adventure! 🎯
          </h3>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose a skill to practice, or take the full test when you're feeling confident. 
            Remember, every step forward is a win! 🏆
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <TestCard
            title="Reading 📚"
            description="Dive into fascinating passages! Practice comprehension, skimming, and scanning with real IELTS materials."
            duration="60 minutes"
            participants={1247}
            icon={<BookOpen className="w-6 h-6 text-warm-coral" />}
            onStart={() => handleStartTest("reading")}
          />
          
          <TestCard
            title="Listening 🎧"
            description="Tune in and level up! Improve your listening skills with varied accents and engaging scenarios."
            duration="30 minutes"
            participants={2156}
            icon={<Headphones className="w-6 h-6 text-warm-coral" />}
            onStart={() => handleStartTest("listening")}
          />
          
          <TestCard
            title="Writing ✍️"
            description="Express yourself brilliantly! Get instant AI feedback to polish your writing style and clarity."
            duration="60 minutes"
            participants={891}
            icon={<PenTool className="w-6 h-6 text-warm-coral" />}
            onStart={() => handleStartTest("writing")}
          />
          
          <TestCard
            title="Speaking 🎤"
            description="Find your voice with confidence! Practice real conversations and get pronunciation tips."
            duration="14 minutes"
            participants={634}
            icon={<Mic className="w-6 h-6 text-warm-coral" />}
            onStart={() => handleStartTest("speaking")}
          />
        </div>

        <div className="text-center">
          <Card className="max-w-2xl mx-auto bg-gradient-to-r from-peachy-pink/30 to-soft-mint/30 warm-hover">
            <CardHeader>
              <CardTitle className="text-2xl font-handwriting">Ready for the full experience? 🌟</CardTitle>
              <CardDescription className="text-base">
                Take all four sections in order for the most realistic exam experience. 
                You've got this! 💪
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center gap-6 mb-6 text-sm text-muted-foreground">
                <span>⏰ 3 hours total</span>
                <span>🤖 AI feedback</span>
                <span>📊 Band prediction</span>
              </div>
              <Button 
                variant="hero" 
                size="lg" 
                onClick={() => handleStartTest("full")}
                className="w-full shadow-medium warm-hover font-semibold"
              >
                🚀 Let's Do This Together!
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-gradient-to-br from-muted/20 to-peachy-pink/10 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-foreground mb-4 font-handwriting">
              Why learners love Alfie! 💖
            </h3>
            <p className="text-lg text-muted-foreground">Your success is our happiness!</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center warm-hover">
              <CardHeader>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-warm-coral/20 to-sunny-yellow/20 flex items-center justify-center encouraging-glow">
                  <Target className="w-8 h-8 text-warm-coral" />
                </div>
                <CardTitle className="font-handwriting">Instant Encouragement 🎉</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Get warm, personalized feedback that celebrates your progress and guides your next steps!
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center warm-hover">
              <CardHeader>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-soft-mint/30 to-sky-blue/20 flex items-center justify-center encouraging-glow">
                  <TrendingUp className="w-8 h-8 text-soft-mint" />
                </div>
                <CardTitle className="font-handwriting">Watch Yourself Grow 🌱</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  See your improvement journey with beautiful charts and celebrate every milestone achieved!
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center warm-hover">
              <CardHeader>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-gentle-lavender/30 to-peachy-pink/20 flex items-center justify-center encouraging-glow">
                  <Award className="w-8 h-8 text-gentle-lavender" />
                </div>
                <CardTitle className="font-handwriting">Real Test Experience 📝</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Practice with authentic materials in a supportive environment that builds confidence!
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