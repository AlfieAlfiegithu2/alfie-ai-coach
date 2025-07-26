
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import TestCard from "@/components/TestCard";
import StatsCard from "@/components/StatsCard";
import { BookOpen, Headphones, PenTool, Mic, Target, TrendingUp, Clock, Award, Zap, Brain, Rocket, Star } from "lucide-react";
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
        navigate("/reading");
        break;
      default:
        console.log(`Starting ${testType} test`);
    }
  };

  return (
    <div className="min-h-screen bg-background particles-bg">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-background via-deep-navy to-charcoal">
        <div className="absolute inset-0 bg-gradient-to-r from-electric-blue/5 via-transparent to-neon-cyan/5"></div>
        <div className="container mx-auto px-4 py-20 lg:py-32 relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8 animate-float-up">
              <div className="space-y-8">
                <div className="inline-block">
                  <div className="px-4 py-2 rounded-full bg-gradient-to-r from-electric-blue/20 to-neon-cyan/20 border border-electric-blue/30 text-electric-blue text-sm font-medium">
                    <Zap className="inline w-4 h-4 mr-2" />
                    AI-Powered Learning System
                  </div>
                </div>
                
                <h1 className="text-5xl lg:text-7xl font-bold font-orbitron leading-tight">
                  <span className="text-foreground">MASTER</span>
                  <br />
                  <span className="bg-gradient-to-r from-electric-blue via-neon-cyan to-tech-purple bg-clip-text text-transparent animate-glow-pulse">
                    IELTS
                  </span>
                  <br />
                  <span className="text-foreground text-4xl lg:text-5xl">with AI Power</span>
                </h1>
                
                <p className="text-lg text-muted-foreground leading-relaxed max-w-lg">
                  Experience the future of test preparation. Advanced AI analytics, 
                  immersive learning environment, and real-time feedback to maximize your potential.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  variant="neon" 
                  size="lg"
                  onClick={() => handleStartTest("full")}
                  className="text-lg font-bold"
                >
                  <Rocket className="w-5 h-5 mr-2" />
                  Launch Test
                </Button>
                <Button 
                  variant="tech" 
                  size="lg"
                  className="text-lg"
                >
                  <Brain className="w-5 h-5 mr-2" />
                  AI Training Mode
                </Button>
              </div>

              <div className="flex items-center gap-12 pt-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-electric-blue font-orbitron">50K+</div>
                  <div className="text-sm text-muted-foreground">Elite Users</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-neon-green font-orbitron">8.5</div>
                  <div className="text-sm text-muted-foreground">Avg Band Score</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-tech-purple font-orbitron">95%</div>
                  <div className="text-sm text-muted-foreground">Success Rate</div>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute -inset-8 bg-gradient-to-r from-electric-blue/20 via-neon-cyan/10 to-tech-purple/20 rounded-3xl blur-3xl animate-pulse-neon"></div>
              <img 
                src={heroImage} 
                alt="Futuristic IELTS Training Interface" 
                className="relative w-full h-auto rounded-2xl shadow-neon-strong glow-border"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold font-orbitron text-electric-blue mb-4">
            Your Neural Progress
          </h2>
          <p className="text-muted-foreground text-lg">Advanced analytics tracking your evolution</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Current Band Level"
            value="7.5"
            change="+0.5 Neural Boost"
            trend="up"
            icon={<Target className="w-5 h-5 text-electric-blue" />}
          />
          <StatsCard
            title="Tests Processed"
            value="12"
            change="Data Analyzed"
            trend="up"
            icon={<Award className="w-5 h-5 text-neon-green" />}
          />
          <StatsCard
            title="Learning Streak"
            value="7 days"
            change="System Active"
            trend="up"
            icon={<TrendingUp className="w-5 h-5 text-tech-purple" />}
          />
          <StatsCard
            title="Time Optimized"
            value="24h"
            change="AI Efficiency"
            trend="neutral"
            icon={<Clock className="w-5 h-5 text-neon-cyan" />}
          />
        </div>
      </section>

      {/* Test Modules */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold font-orbitron mb-6">
            <span className="text-foreground">Select Your</span>
            <br />
            <span className="bg-gradient-to-r from-electric-blue to-neon-cyan bg-clip-text text-transparent">
              Training Module
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose your specialized training protocol. Each module features advanced AI analysis 
            and real-time performance optimization.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          <TestCard
            title="Reading Protocol"
            description="Advanced comprehension analysis with neural pattern recognition. Real IELTS materials processed through AI algorithms."
            duration="60 min"
            participants={1247}
            icon={<BookOpen className="w-6 h-6 text-electric-blue" />}
            onStart={() => handleStartTest("reading")}
          />
          
          <TestCard
            title="Audio Processing"
            description="Multi-accent audio analysis with frequency mapping. Advanced listening protocols for optimal comprehension."
            duration="30 min"
            participants={2156}
            icon={<Headphones className="w-6 h-6 text-neon-cyan" />}
            onStart={() => handleStartTest("listening")}
          />
          
          <TestCard
            title="Text Generation"
            description="AI-powered writing analysis with linguistic pattern recognition. Real-time grammar and coherence optimization."
            duration="60 min"
            participants={891}
            icon={<PenTool className="w-6 h-6 text-neon-green" />}
            onStart={() => handleStartTest("writing")}
          />
          
          <TestCard
            title="Voice Interface"
            description="Neural speech analysis with pronunciation mapping. Advanced conversation protocols with AI feedback."
            duration="14 min"
            participants={634}
            icon={<Mic className="w-6 h-6 text-tech-purple" />}
            onStart={() => handleStartTest("speaking")}
          />
        </div>

        <div className="text-center">
          <Card className="max-w-3xl mx-auto bg-gradient-to-br from-charcoal/80 to-deep-navy/60 border-electric-blue/20">
            <CardHeader className="text-center pb-8">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-electric-blue/20 to-neon-cyan/20 flex items-center justify-center shadow-neon">
                <Star className="w-10 h-10 text-electric-blue animate-glow-pulse" />
              </div>
              <CardTitle className="text-3xl font-orbitron mb-4">
                Full System Integration
              </CardTitle>
              <CardDescription className="text-lg text-muted-foreground max-w-md mx-auto">
                Complete neural pathway training. All four modules integrated for maximum 
                performance optimization and advanced band prediction.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="flex items-center justify-center gap-8 mb-8 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-electric-blue" />
                  <span>3 Hours Total</span>
                </div>
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-neon-cyan" />
                  <span>AI Analysis</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-neon-green" />
                  <span>Band Prediction</span>
                </div>
              </div>
              <Button 
                variant="neon" 
                size="lg" 
                onClick={() => handleStartTest("full")}
                className="w-full text-lg font-bold"
              >
                <Zap className="w-5 h-5 mr-2" />
                Initialize Full System
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-gradient-to-br from-deep-navy/50 to-charcoal/30 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold font-orbitron text-electric-blue mb-6">
              Advanced AI Capabilities
            </h2>
            <p className="text-lg text-muted-foreground">Next-generation learning technology</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center tech-hover border-electric-blue/20">
              <CardHeader>
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-electric-blue/20 to-neon-cyan/20 flex items-center justify-center shadow-neon">
                  <Zap className="w-10 h-10 text-electric-blue" />
                </div>
                <CardTitle className="font-orbitron text-xl">Instant Neural Feedback</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  Real-time AI analysis with advanced pattern recognition. 
                  Immediate performance optimization and targeted improvement protocols.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center tech-hover border-neon-green/20">
              <CardHeader>
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-neon-green/20 to-neon-cyan/20 flex items-center justify-center shadow-success">
                  <TrendingUp className="w-10 h-10 text-neon-green" />
                </div>
                <CardTitle className="font-orbitron text-xl">Progress Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  Advanced data visualization with predictive modeling. 
                  Track your neural learning patterns and optimize performance metrics.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center tech-hover border-tech-purple/20">
              <CardHeader>
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-tech-purple/20 to-electric-blue/20 flex items-center justify-center shadow-purple">
                  <Brain className="w-10 h-10 text-tech-purple" />
                </div>
                <CardTitle className="font-orbitron text-xl">Adaptive Intelligence</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  Machine learning algorithms that adapt to your learning style. 
                  Personalized training protocols for maximum efficiency.
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
