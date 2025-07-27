import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Target, 
  TrendingUp, 
  BookOpen, 
  Mic, 
  PenTool, 
  Headphones,
  Brain,
  BarChart3,
  Trophy,
  Clock,
  ArrowRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import StudentLayout from '@/components/StudentLayout';

interface SkillData {
  name: string;
  score: number;
  target: number;
  improvement: string;
  icon: any;
  color: string;
  weakAreas: string[];
  suggestions: string[];
}

const PersonalPage = () => {
  const navigate = useNavigate();
  const [skillsData, setSkillsData] = useState<SkillData[]>([
    {
      name: "Reading",
      score: 72,
      target: 85,
      improvement: "+8% this week",
      icon: BookOpen,
      color: "hsl(142 76% 36%)",
      weakAreas: ["Academic vocabulary", "Skimming technique"],
      suggestions: ["Practice C19 Academic passages", "Focus on time management"]
    },
    {
      name: "Listening",
      score: 68,
      target: 80,
      improvement: "+5% this week",
      icon: Headphones,
      color: "hsl(221 83% 53%)",
      weakAreas: ["Note-taking speed", "Section 4 lectures"],
      suggestions: ["Practice short-form notes", "Listen to academic podcasts"]
    },
    {
      name: "Writing",
      score: 65,
      target: 75,
      improvement: "+3% this week",
      icon: PenTool,
      color: "hsl(262 83% 58%)",
      weakAreas: ["Task 2 structure", "Lexical resource"],
      suggestions: ["Study model essays", "Expand academic vocabulary"]
    },
    {
      name: "Speaking",
      score: 70,
      target: 80,
      improvement: "+6% this week",
      icon: Mic,
      color: "hsl(25 95% 53%)",
      weakAreas: ["Fluency in Part 2", "Complex grammar"],
      suggestions: ["Practice 2-minute talks", "Record yourself daily"]
    }
  ]);

  const overallBand = 6.5;
  const targetBand = 7.5;
  const overallProgress = 75;

  const handlePracticeSkill = (skillName: string) => {
    navigate(`/${skillName.toLowerCase()}`);
  };

  return (
    <StudentLayout title="Personal Progress">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-electric-blue to-neon-cyan flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Personal Progress</h1>
                <p className="text-muted-foreground">Your AI-powered IELTS improvement dashboard</p>
              </div>
            </div>
          </div>

          {/* Overall Performance Card */}
          <Card className="mb-8 border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  Overall IELTS Performance
                </span>
                <Badge variant="outline" className="text-lg px-3 py-1">
                  Band {overallBand}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-foreground mb-2">{overallBand}</div>
                  <p className="text-sm text-muted-foreground">Current Band</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-electric-blue mb-2">{targetBand}</div>
                  <p className="text-sm text-muted-foreground">Target Band</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">{overallProgress}%</div>
                  <p className="text-sm text-muted-foreground">Progress to Goal</p>
                </div>
              </div>
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Progress to Target</span>
                  <span className="text-sm text-muted-foreground">{overallProgress}%</span>
                </div>
                <Progress value={overallProgress} className="h-3" />
              </div>
            </CardContent>
          </Card>

          {/* Skills Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {skillsData.map((skill, index) => {
              const Icon = skill.icon;
              return (
                <Card key={skill.name} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Icon className="w-5 h-5" style={{ color: skill.color }} />
                        {skill.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-600">{skill.improvement}</span>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold">{skill.score}%</span>
                        <span className="text-sm text-muted-foreground">Target: {skill.target}%</span>
                      </div>
                      
                      <Progress 
                        value={skill.score} 
                        className="h-2" 
                        style={{ 
                          ['--progress-background' as any]: skill.color 
                        }}
                      />

                      <div>
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                          <Target className="w-4 h-4" />
                          Areas to Improve
                        </h4>
                        <div className="flex flex-wrap gap-1 mb-3">
                          {skill.weakAreas.map((area, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {area}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                          <Brain className="w-4 h-4" />
                          AI Suggestions
                        </h4>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {skill.suggestions.map((suggestion, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <ArrowRight className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              {suggestion}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <Button 
                        onClick={() => handlePracticeSkill(skill.name)}
                        className="w-full mt-4"
                        variant="outline"
                      >
                        Practice {skill.name}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Quick Actions */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                  onClick={() => navigate('/tests')}
                  className="h-16 flex flex-col gap-2"
                  variant="outline"
                >
                  <Clock className="w-5 h-5" />
                  <span>Take Practice Test</span>
                </Button>
                <Button 
                  onClick={() => navigate('/content-selection/reading')}
                  className="h-16 flex flex-col gap-2"
                  variant="outline"
                >
                  <BookOpen className="w-5 h-5" />
                  <span>Quick Reading Practice</span>
                </Button>
                <Button 
                  onClick={() => navigate('/speaking')}
                  className="h-16 flex flex-col gap-2"
                  variant="outline"
                >
                  <Mic className="w-5 h-5" />
                  <span>Speaking Session</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Study Recommendations */}
          <Card className="mt-6 border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-600" />
                Personalized Study Plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                  <Target className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-800 dark:text-blue-200">Priority Focus: Reading Skills</h4>
                    <p className="text-sm text-blue-600 dark:text-blue-300">
                      Your reading accuracy is 72%. Focus on academic vocabulary and practice C19 passages 
                      for 30 minutes daily to reach your 85% target.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                  <Clock className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-800 dark:text-amber-200">Weekly Goal</h4>
                    <p className="text-sm text-amber-600 dark:text-amber-300">
                      Complete 3 full practice tests and focus 40% of study time on writing task structure.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </StudentLayout>
  );
};

export default PersonalPage;