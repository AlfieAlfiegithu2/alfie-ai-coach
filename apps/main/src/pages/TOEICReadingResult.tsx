import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, AlertCircle, Home, RotateCcw, FileText, ChevronDown, ChevronRight, XCircle } from "lucide-react";
import { useThemeStyles } from "@/hooks/useThemeStyles";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

interface Question {
  id: string;
  question_number: number;
  question_text: string;
  options: string[] | null;
  correct_answer: string;
  toeic_part: number;
  ai_explanation?: string;
  passage_context?: string;
}

interface Passage {
  id: string;
  title?: string;
  content: string;
  questionStart: number;
  questionEnd: number;
}

interface GroupedPart {
  partNumber: number;
  questions: Question[];
  passages: Passage[];
}

interface ResultState {
  score: number;
  totalQuestions: number;
  answers: Record<number, string>;
  groupedParts: GroupedPart[];
  testName?: string;
}

const TOEICReadingResult = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as ResultState;
  const themeStyles = useThemeStyles();
  const isNoteTheme = themeStyles.theme.name === 'note';
  const [expandedParts, setExpandedParts] = useState<number[]>([5, 6, 7]);

  if (!state) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold mb-4">No results found</h2>
        <Button onClick={() => navigate('/toeic')}>Back to TOEIC Portal</Button>
      </div>
    );
  }

  const { score, totalQuestions, answers, groupedParts, testName } = state;
  const percentage = Math.round((score / totalQuestions) * 100);

  // Helper to find passage for a question
  const getPassageForQuestion = (question: Question, part: GroupedPart) => {
    return part.passages.find(
      p => question.question_number >= p.questionStart && 
      question.question_number <= p.questionEnd
    );
  };

  const togglePart = (partNumber: number) => {
    setExpandedParts(prev => 
      prev.includes(partNumber) 
        ? prev.filter(p => p !== partNumber)
        : [...prev, partNumber]
    );
  };

  return (
    <div className={`min-h-screen py-8 ${isNoteTheme ? 'bg-[#FFFAF0]' : 'bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950'}`}>
      <div className="container px-4 max-w-4xl mx-auto">
        
        {/* Header Section with Paper Texture Effect */}
        <div className={`relative mb-8 p-8 rounded-xl overflow-hidden shadow-sm ${
          isNoteTheme 
            ? 'bg-[#FFFAF0] border-2 border-[#E8D5A3] shadow-[4px_4px_0px_0px_rgba(232,213,163,1)]' 
            : 'bg-white/80 backdrop-blur border border-white/20'
        }`}>
          {isNoteTheme && (
            <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-b from-[#E8D5A3]/20 to-transparent" />
          )}
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
            <div className="text-center md:text-left">
              <h1 className={`text-3xl font-bold mb-2 ${isNoteTheme ? 'text-[#5D4E37]' : ''}`}>
                {testName || 'TOEIC Reading Test'}
              </h1>
              <p className={`font-medium ${isNoteTheme ? 'text-[#8B6914]' : 'text-muted-foreground'}`}>
                Error Log & Performance Review
              </p>
            </div>

            <div className="flex items-center gap-8">
              <div className="text-center">
                <div className={`text-4xl font-bold mb-1 ${isNoteTheme ? 'text-[#5D4E37]' : ''}`}>
                  {score}/{totalQuestions}
                </div>
                <div className={`text-xs font-semibold uppercase tracking-wider ${isNoteTheme ? 'text-[#8B6914]' : 'text-muted-foreground'}`}>Correct</div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Review */}
        <div className="space-y-6">
          {groupedParts.map((part) => (
            <Collapsible 
              key={part.partNumber} 
              open={expandedParts.includes(part.partNumber)}
              onOpenChange={() => togglePart(part.partNumber)}
              className={`rounded-xl overflow-hidden transition-all duration-200 ${
                isNoteTheme 
                  ? 'bg-white border-2 border-[#E8D5A3] shadow-[4px_4px_0px_0px_rgba(232,213,163,0.5)]' 
                  : 'bg-white shadow-sm border border-slate-100'
              }`}
            >
              <CollapsibleTrigger className="w-full">
                <div className={`flex items-center justify-between p-4 ${isNoteTheme ? 'bg-[#FFFAF0]/50' : 'bg-slate-50/50'} hover:bg-opacity-80 transition-colors`}>
                  <h2 className={`text-lg font-bold flex items-center gap-2 ${isNoteTheme ? 'text-[#5D4E37]' : ''}`}>
                    {expandedParts.includes(part.partNumber) ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    Part {part.partNumber}
                  </h2>
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="p-4 space-y-4">
                  {part.questions.map((question) => {
                    const userAnswer = answers[question.question_number];
                    const isCorrect = userAnswer === question.correct_answer;
                    const passage = getPassageForQuestion(question, part);

                    return (
                      <div key={question.id} className={`group relative rounded-xl border-2 transition-all duration-300 ${
                        isNoteTheme 
                          ? 'bg-[#FFFAF0] border-[#E8D5A3] shadow-[2px_2px_0px_0px_rgba(232,213,163,0.5)] hover:shadow-[4px_4px_0px_0px_rgba(232,213,163,0.8)] hover:-translate-y-0.5' 
                          : 'bg-white border-transparent shadow-sm hover:shadow-md ring-1 ring-slate-100 hover:ring-slate-200'
                      }`}>
                        
                        {/* Status Badge (Top Right) */}
                        <div className={`absolute top-0 right-0 px-3 py-1 rounded-bl-xl rounded-tr-lg text-xs font-bold tracking-wider border-b border-l ${
                          isCorrect 
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                            : 'bg-rose-50 text-rose-600 border-rose-100'
                        }`}>
                          {isCorrect ? 'CORRECT' : 'INCORRECT'}
                        </div>

                        <div className="p-6">
                          <div className="flex flex-col gap-6">
                            {/* Header: Number */}
                            <div className="flex items-center gap-3">
                              <span className={`text-lg font-bold ${
                                isNoteTheme 
                                  ? 'text-[#5D4E37]' 
                                  : 'text-slate-700'
                              }`}>
                                {question.question_number}.
                              </span>
                            </div>

                            {/* Question Text */}
                            <p className={`text-lg font-medium leading-relaxed ${isNoteTheme ? 'text-[#5D4E37]' : 'text-slate-800'}`}>
                              {question.question_text}
                            </p>

                            {/* Layout: Options & Context Side-by-Side on Desktop */}
                            <div className="grid md:grid-cols-2 gap-8">
                              {/* Options */}
                              <div className="space-y-3">
                                {question.options?.map((option, idx) => {
                                  const letter = String.fromCharCode(65 + idx);
                                  const isSelected = userAnswer === letter;
                                  const isAnswerCorrect = question.correct_answer === letter;

                                  let optionClass = `flex items-center gap-3 p-3 rounded-lg text-sm transition-all border `;
                                  
                                  if (isAnswerCorrect) {
                                    optionClass += "bg-emerald-50/40 border-emerald-100 text-emerald-800";
                                  } else if (isSelected && !isAnswerCorrect) {
                                    optionClass += "bg-rose-50/40 border-rose-100 text-rose-800";
                                  } else {
                                    optionClass += "bg-transparent border-transparent hover:bg-black/5 text-muted-foreground";
                                  }

                                  return (
                                    <div key={idx} className={optionClass}>
                                      <span className={`font-bold w-6 text-sm ${
                                        isAnswerCorrect ? 'text-emerald-700' : 
                                        isSelected && !isAnswerCorrect ? 'text-rose-700' : 
                                        'text-muted-foreground'
                                      }`}>
                                        {letter}.
                                      </span>
                                      <span className="flex-1 font-medium">{option}</span>
                                      {isAnswerCorrect && <CheckCircle className="w-5 h-5 text-emerald-500/70 flex-shrink-0" />}
                                      {isSelected && !isAnswerCorrect && <XCircle className="w-5 h-5 text-rose-500/70 flex-shrink-0" />}
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Context / Explanation Column */}
                              <div className="space-y-4">
                                {/* Passage Context (Miniature) */}
                                {(passage || question.passage_context) && (
                                  <div className={`text-sm p-4 rounded-xl border transition-colors ${
                                    isNoteTheme 
                                      ? 'bg-white border-[#E8D5A3]/50 text-[#5D4E37]/90' 
                                      : 'bg-slate-50/50 border-slate-100 text-slate-600'
                                  }`}>
                                    <div className="font-bold mb-2 flex items-center gap-2 opacity-70 text-xs uppercase tracking-wider">
                                      <FileText className="w-4 h-4" />
                                      {passage?.title || 'Context Reference'}
                                    </div>
                                    <ScrollArea className="h-[120px] pr-4">
                                      <div className="whitespace-pre-wrap leading-relaxed opacity-90 text-xs">
                                        {passage?.content || question.passage_context}
                                      </div>
                                    </ScrollArea>
                                  </div>
                                )}

                                {/* AI Explanation */}
                                {question.ai_explanation && (
                                  <div className={`p-4 rounded-xl text-sm ${
                                    isNoteTheme 
                                      ? 'bg-[#A68B5B]/10 text-[#5D4E37]' 
                                      : 'bg-blue-50/50 text-blue-900'
                                  }`}>
                                    <span className="font-bold text-xs uppercase tracking-wider opacity-70 mb-2 block flex items-center gap-2">
                                      <div className={`w-1.5 h-1.5 rounded-full ${isNoteTheme ? 'bg-[#A68B5B]' : 'bg-blue-400'}`} />
                                      Explanation
                                    </span>
                                    <p className="leading-relaxed opacity-90">{question.ai_explanation}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>

        <div className="flex justify-center mt-12 pb-12">
           <Button 
            onClick={() => navigate('/toeic')}
            size="lg"
            className={`shadow-lg px-8 rounded-full ${isNoteTheme ? 'bg-[#A68B5B] hover:bg-[#8B6914] text-white' : ''}`}
          >
            <Home className="w-4 h-4 mr-2" />
            Back to TOEIC Portal
          </Button>
        </div>

      </div>
    </div>
  );
};

export default TOEICReadingResult;

