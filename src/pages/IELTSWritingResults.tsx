import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Share2, Star } from "lucide-react";

const IELTSWritingResults = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const {
    testName,
    task1Answer,
    task2Answer,
    feedback,
    task1Data,
    task2Data,
    task1WordCount,
    task2WordCount
  } = location.state || {};

  if (!feedback) {
    navigate('/dashboard');
    return null;
  }

  const roundToValidBandScore = (score: number) => {
    return Math.round(score * 2) / 2; // Rounds to nearest 0.5
  };

  const extractBandScore = (feedbackText: string, scoreType: string = 'overall') => {
    const regex = new RegExp(`${scoreType}.*?band.*?score.*?(\\d+(?:\\.\\d+)?)`, 'i');
    const match = feedbackText.match(regex);
    return match ? roundToValidBandScore(parseFloat(match[1])) : 7.0;
  };

  const extractCriteriaScores = (feedbackText: string) => {
    // Try both formats - new format without ## and old format with ##
    let task1Match = feedbackText.match(/TASK 1 ASSESSMENT([\s\S]*?)(?=TASK 2 ASSESSMENT)/);
    let task2Match = feedbackText.match(/TASK 2 ASSESSMENT([\s\S]*?)(?=OVERALL WRITING ASSESSMENT)/);
    
    // Fallback to old format if new format not found
    if (!task1Match || !task2Match) {
      task1Match = feedbackText.match(/## TASK 1 ASSESSMENT([\s\S]*?)(?=## TASK 2 ASSESSMENT)/);
      task2Match = feedbackText.match(/## TASK 2 ASSESSMENT([\s\S]*?)(?=## OVERALL WRITING ASSESSMENT)/);
    }
    
    if (!task1Match || !task2Match) {
      return { task1: [], task2: [], overall: 7.0, task1Overall: 7.0, task2Overall: 7.0 };
    }

    const extractScoresFromSection = (section: string) => {
      const scores = [];
      // Try new format first, then fallback to old format
      let scoreMatches = section.match(/Band Score: (\d+(?:\.\d+)?)/g);
      if (!scoreMatches) {
        scoreMatches = section.match(/\*\*Band Score: (\d+(?:\.\d+)?)\*\*/g);
      }
      if (scoreMatches) {
        scores.push(...scoreMatches.map(match => roundToValidBandScore(parseFloat(match.match(/(\d+(?:\.\d+)?)/)?.[1] || '7'))));
      }
      return scores;
    };

    const task1Scores = extractScoresFromSection(task1Match[1]);
    const task2Scores = extractScoresFromSection(task2Match[1]);
    
    // Extract individual task overall scores
    const task1OverallMatch = task1Match[1].match(/Task 1 Overall Band Score: (\d+(?:\.\d+)?)/);
    const task2OverallMatch = task2Match[1].match(/Task 2 Overall Band Score: (\d+(?:\.\d+)?)/);
    
    const task1Overall = task1OverallMatch ? roundToValidBandScore(parseFloat(task1OverallMatch[1])) : 
                        (task1Scores.length > 0 ? roundToValidBandScore(task1Scores.reduce((a, b) => a + b, 0) / task1Scores.length) : 7.0);
    const task2Overall = task2OverallMatch ? roundToValidBandScore(parseFloat(task2OverallMatch[1])) : 
                        (task2Scores.length > 0 ? roundToValidBandScore(task2Scores.reduce((a, b) => a + b, 0) / task2Scores.length) : 7.0);
    
    // Try new format first, then fallback to old format
    let overallMatch = feedbackText.match(/Overall Writing Band Score: (\d+(?:\.\d+)?)/);
    if (!overallMatch) {
      overallMatch = feedbackText.match(/\*\*Overall Writing Band Score: (\d+(?:\.\d+)?)\*\*/);
    }
    
    // If no overall match found, calculate using correct weighting
    let overall = 7.0;
    if (overallMatch) {
      overall = roundToValidBandScore(parseFloat(overallMatch[1]));
    } else {
      // Apply correct IELTS weighting: Task 1 = 33%, Task 2 = 67%
      const weightedAverage = ((task1Overall * 1) + (task2Overall * 2)) / 3;
      overall = roundToValidBandScore(weightedAverage);
    }

    return { task1: task1Scores, task2: task2Scores, overall, task1Overall, task2Overall };
  };

  const scores = extractCriteriaScores(feedback);
  const overallBand = scores.overall;

  const criteriaNames = [
    "Task Achievement",
    "Coherence & Cohesion", 
    "Lexical Resource",
    "Grammar Range"
  ];

  const task2CriteriaNames = [
    "Task Response",
    "Coherence & Cohesion",
    "Lexical Resource", 
    "Grammar Range"
  ];

  return (
    <div className="min-h-screen bg-surface-2 font-inter">
      {/* Header */}
      <div className="bg-surface-1 border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/dashboard')}
                className="hover:bg-surface-3"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-heading-2">IELTS Writing Results</h1>
                <p className="text-caption">{testName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  const element = document.createElement('a');
                  const file = new Blob([feedback], { type: 'text/plain' });
                  element.href = URL.createObjectURL(file);
                  element.download = `IELTS-Writing-Report-${new Date().toISOString().split('T')[0]}.txt`;
                  document.body.appendChild(element);
                  element.click();
                  document.body.removeChild(element);
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                Download Report
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="w-4 h-4 mr-2" />
                Share Results
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Main Glassmorphism Container */}
        <div className="glass-card rounded-3xl p-8 md:p-12">
          {/* Overall Band Score - Prominent at Top */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-6">
              <Star className="w-8 h-8 text-brand-blue" />
              <h2 className="text-heading-2 text-text-primary">Your IELTS Writing Band Score</h2>
            </div>
            <div className="text-8xl font-bold mb-4 text-brand-gold">
              {overallBand.toFixed(1)}
            </div>
            <Badge variant="outline" className="text-lg px-6 py-3 rounded-2xl border-brand-gold/30 text-brand-gold bg-brand-gold/10">
              Professional Level
            </Badge>
            <p className="text-caption mt-4 max-w-md mx-auto">
              Based on official IELTS assessment criteria with weighted scoring (Task 1: 33%, Task 2: 67%)
            </p>
          </div>

          {/* Task Performance Cards */}
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Task 1 Card */}
            <div className="glass-effect rounded-2xl p-6">
              <div className="text-center mb-6">
                <h3 className="text-heading-3 mb-2 text-text-primary">Task 1</h3>
                <p className="text-body text-text-secondary mb-4">Data Description</p>
                <div className="text-5xl font-bold text-brand-gold mb-2">
                  {scores.task1Overall ? scores.task1Overall.toFixed(1) : '7.0'}
                </div>
                <Badge variant="outline" className="text-brand-blue border-brand-blue/30 bg-brand-blue/10">
                  {task1WordCount || task1Answer?.trim().split(/\s+/).filter(word => word.length > 0).length || 0} words
                </Badge>
              </div>
              
              {/* Task 1 Criteria */}
              <div className="space-y-4">
                {criteriaNames.map((criterion, index) => (
                  <div key={criterion} className="flex justify-between items-center p-3 bg-surface-3/50 rounded-xl">
                    <span className="text-body font-medium text-text-primary">{criterion}</span>
                    <span className="text-xl font-bold text-brand-gold">
                      {scores.task1.length > index ? scores.task1[index]?.toFixed(1) : '7.0'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Task 2 Card */}
            <div className="glass-effect rounded-2xl p-6">
              <div className="text-center mb-6">
                <h3 className="text-heading-3 mb-2 text-text-primary">Task 2</h3>
                <p className="text-body text-text-secondary mb-4">Essay Writing</p>
                <div className="text-5xl font-bold text-brand-gold mb-2">
                  {scores.task2Overall ? scores.task2Overall.toFixed(1) : '7.0'}
                </div>
                <Badge variant="outline" className="text-brand-blue border-brand-blue/30 bg-brand-blue/10">
                  {task2WordCount || task2Answer?.trim().split(/\s+/).filter(word => word.length > 0).length || 0} words
                </Badge>
              </div>
              
              {/* Task 2 Criteria */}
              <div className="space-y-4">
                {task2CriteriaNames.map((criterion, index) => (
                  <div key={criterion} className="flex justify-between items-center p-3 bg-surface-3/50 rounded-xl">
                    <span className="text-body font-medium text-text-primary">{criterion}</span>
                    <span className="text-xl font-bold text-brand-gold">
                      {scores.task2.length > index ? scores.task2[index]?.toFixed(1) : '7.0'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AI Examiner Report */}
          <div className="glass-effect rounded-2xl p-8 mb-8">
            <div className="text-center mb-8">
              <h3 className="text-heading-3 text-text-primary mb-3">Professional IELTS Assessment</h3>
              <p className="text-body text-text-secondary">
                Comprehensive analysis based on official IELTS band descriptors
              </p>
            </div>
            
            <div 
              className="prose prose-lg max-w-none text-text-primary leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: feedback
                  .replace(/^(TASK [12] ASSESSMENT)$/gm, '<h2 class="text-2xl font-bold text-brand-blue mt-8 mb-6 pb-3 border-b border-border">$1</h2>')
                  .replace(/^(OVERALL WRITING ASSESSMENT)$/gm, '<h2 class="text-2xl font-bold text-brand-blue mt-8 mb-6 pb-3 border-b border-border">$1</h2>')
                  .replace(/^(Task Achievement|Task Response|Coherence and Cohesion|Lexical Resource|Grammatical Range and Accuracy|Your Path to a Higher Score)$/gm, '<h3 class="text-xl font-semibold text-text-primary mt-6 mb-4 p-4 bg-surface-3/30 rounded-xl">$1</h3>')
                  .replace(/^Band Score: (\d+(?:\.\d+)?)$/gm, '<div class="text-lg font-bold text-brand-gold mb-3 bg-brand-gold/10 p-3 rounded-lg inline-block border border-brand-gold/20">Band Score: $1</div>')
                  .replace(/^(Positive Feedback|Areas for Improvement):$/gm, '<h4 class="text-lg font-semibold text-text-primary mt-4 mb-3">$1:</h4>')
                  .replace(/^• (.*)$/gm, '<li class="mb-2 text-text-secondary pl-2">$1</li>')
                  .replace(/(<li>.*?<\/li>(?:\s*<li>.*?<\/li>)*)/gs, '<ul class="list-disc pl-6 mb-6 space-y-2 bg-surface-3/20 p-4 rounded-xl">$1</ul>')
                  .replace(/^Overall Writing Band Score: (.*)$/gm, '<div class="text-2xl font-bold text-brand-gold mt-8 mb-6 bg-brand-gold/10 p-6 rounded-2xl text-center border border-brand-gold/20">Overall Writing Band Score: $1</div>')
                  .replace(/\n/g, '<br>')
                  .replace(/---/g, '<hr class="my-8 border-border opacity-30">')
              }}
            />
          </div>

          {/* Your Answers Section */}
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div className="glass-effect rounded-2xl p-6">
              <h4 className="text-heading-3 text-text-primary mb-4">Your Task 1 Answer</h4>
              <p className="text-caption text-text-secondary mb-4">{task1Data?.title}</p>
              <div className="bg-surface-3/30 p-4 rounded-xl text-sm max-h-60 overflow-y-auto text-text-secondary leading-relaxed">
                {task1Answer}
              </div>
            </div>

            <div className="glass-effect rounded-2xl p-6">
              <h4 className="text-heading-3 text-text-primary mb-4">Your Task 2 Answer</h4>
              <p className="text-caption text-text-secondary mb-4">{task2Data?.title}</p>
              <div className="bg-surface-3/30 p-4 rounded-xl text-sm max-h-60 overflow-y-auto text-text-secondary leading-relaxed">
                {task2Answer}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-4">
            <Button 
              onClick={() => navigate('/ielts-portal')}
              className="btn-primary hover-lift px-8 py-3"
            >
              Take Another Test
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate('/dashboard')}
              className="hover-lift px-8 py-3"
            >
              Return to Dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IELTSWritingResults;