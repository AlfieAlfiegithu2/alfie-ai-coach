import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { getBandScore } from '@/lib/ielts-scoring';
import { answersMatch } from '@/lib/ielts-answer-matching';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, RotateCcw, Home, BookOpen, Highlighter } from "lucide-react";
import AnnotationTools from '@/components/AnnotationTools';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TestResultsProps {
  score: number;
  totalQuestions: number;
  timeTaken?: number;
  answers: Record<string, string>;
  questions: any[];
  onRetake: () => void;
  onContinue: () => void;
  testTitle?: string;
  testParts?: Record<number, { passage: any; questions: any[] }>;
}

const TestResults = ({
  score,
  totalQuestions,
  timeTaken,
  answers,
  questions,
  onRetake,
  onContinue,
  testTitle,
  testParts
}: TestResultsProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [currentPart, setCurrentPart] = useState(1);
  const [isDrawingMode, setIsDrawingMode] = useState(false);

  const passageScrollRef = useRef<HTMLDivElement>(null);
  const questionsScrollRef = useRef<HTMLDivElement>(null);

  // Add shortcut for toggling annotation mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key.toLowerCase() === 'a') {
        setIsDrawingMode(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Use official IELTS band score conversion based on correct answers
  const bandScore = getBandScore(score, 'academic-reading');

  if (!testParts) {
    return (
      <div className="min-h-screen bg-[#FEF9E7] p-8">
        <div className="max-w-4xl mx-auto space-y-6 text-center">
          <div className="inline-flex items-center gap-6 bg-white p-8 rounded-3xl border border-[#E8D5A3] shadow-xl font-serif">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8B4513]/60 mb-2">FINAL SCORE</p>
              <p className="text-5xl font-black text-black">{score}<span className="text-black/20 text-3xl mx-1">/</span>{totalQuestions}</p>
            </div>
            <div className="w-px h-16 bg-[#E8D5A3]"></div>
            <div className="px-8 py-4 bg-[#8B4513] rounded-2xl shadow-lg">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60 mb-1">IELTS BAND</p>
              <p className="text-5xl font-black text-white">{bandScore}</p>
            </div>
          </div>
          <div className="flex justify-center gap-4 mt-8">
            <Button onClick={onRetake} variant="outline" className="rounded-xl border-[#E8D5A3] h-12 px-8 font-bold text-black">Retake Test</Button>
            <Button onClick={onContinue} className="rounded-xl bg-[#8B4513] h-12 px-8 font-bold text-white shadow-lg">Continue Practice</Button>
          </div>
        </div>
      </div>
    );
  }

  const currentTestPart = testParts[currentPart];
  if (!currentTestPart) return null;

  return (
    <div className="h-screen flex flex-col bg-[#FEF9E7] overflow-hidden fixed inset-0 z-50">
      {/* Replicated Student Header with Prominent Score/Band */}
      <div className="flex-shrink-0 bg-[#FEF9E7] border-b border-[#E8D5A3]">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/dashboard')} className="text-black hover:bg-[#E8D5A3]/50 h-9 px-3 group">
              <Home className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
              <span className="font-bold">Dashboard</span>
            </Button>

            <div className="w-px h-6 bg-[#E8D5A3] hidden sm:block"></div>

            {/* BIG HIGHLIGHTED STATS */}
            <div className="hidden md:flex items-center gap-6">
              <div className="flex items-center gap-3 bg-white px-4 py-1.5 rounded-xl border border-[#E8D5A3] shadow-sm">
                <span className="text-[9px] font-bold text-[#8B4513]/60 uppercase tracking-widest">SCORE</span>
                <span className="font-serif font-black text-xl text-black">{score}/{totalQuestions}</span>
              </div>
              <div className="flex items-center gap-3 bg-[#8B4513] px-5 py-1.5 rounded-xl shadow-md">
                <span className="text-[9px] font-bold text-white/50 uppercase tracking-widest">BAND</span>
                <span className="font-serif font-black text-xl text-white">{bandScore}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white/50 p-1 rounded-full border border-[#E8D5A3]">
            {Object.keys(testParts).map((partNum) => {
              const partNumber = parseInt(partNum);
              const isActive = currentPart === partNumber;
              return (
                <button
                  key={partNumber}
                  onClick={() => setCurrentPart(partNumber)}
                  className={`w-8 h-8 rounded-full font-serif font-bold text-sm transition-all duration-300 ${isActive
                    ? 'bg-[#8B4513] text-white shadow-sm scale-110'
                    : 'text-black hover:bg-[#8B4513]/10'
                    }`}
                >
                  {partNumber}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsDrawingMode(!isDrawingMode)}
                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 ${isDrawingMode ? 'bg-[#8B4513] text-white' : 'text-[#8B4513] hover:bg-[#FEF9E7]'}`}
                  >
                    <Highlighter className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={8} className="bg-[#2f241f] text-white border-none text-xs px-2 py-1 z-[100]">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold">Annotation Tools (A)</span>
                    <span className="text-[10px] opacity-70">Draw, highlight and annotate the test content</span>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button
              variant="outline"
              size="sm"
              onClick={onRetake}
              className="rounded-lg h-9 border-[#E8D5A3] text-black bg-white hover:bg-[#FEF9E7] font-bold shadow-sm"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline text-xs">Retake</span>
            </Button>
            <Button
              size="sm"
              onClick={onContinue}
              className="rounded-lg h-9 bg-[#8B4513] hover:bg-[#723b10] text-[#FEF9E7] font-bold shadow-sm"
            >
              <span className="hidden sm:inline text-xs">Continue</span>
              <ArrowRight className="w-4 h-4 md:ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Container - Full Page Theme (#FEF9E7) */}
      <div className="flex-1 grid lg:grid-cols-2 min-h-0 bg-[#FEF9E7]">
        {/* Left: Passage Panel (Independent Scroll) */}
        <div className="flex flex-col min-h-0 border-r border-[#E8D5A3]">
          <div className="flex-shrink-0 border-b border-[#E8D5A3] px-6 py-4 bg-white/30 backdrop-blur-sm">
            <h2 className="font-serif text-black text-xl font-bold">
              {currentTestPart.passage.title}
            </h2>
          </div>
          <div id="passage-content" ref={passageScrollRef} className="flex-1 overflow-y-auto px-8 py-8 ielts-scrollbar relative">
            <AnnotationTools
              isOpen={isDrawingMode}
              onClose={() => setIsDrawingMode(false)}
              passageRef={passageScrollRef}
              questionsRef={questionsScrollRef}
            />
            <div className="prose prose-lg max-w-none font-serif text-black leading-loose text-justify whitespace-pre-wrap">
              {currentTestPart.passage.content}
            </div>
          </div>
        </div>

        {/* Right: Question Review Panel (Independent Scroll) */}
        <div className="flex flex-col min-h-0 bg-[#FEF9E7]">
          <div className="flex-shrink-0 border-b border-[#E8D5A3] px-6 py-4 bg-white/20 backdrop-blur-sm flex justify-between items-center text-black font-serif">
            <h2 className="text-xl font-bold">Test Questions Review</h2>
            <Badge variant="outline" className="border-[#E8D5A3] text-[#8B4513] font-black tracking-widest px-3">PART {currentPart}</Badge>
          </div>
          <div id="questions-content" ref={questionsScrollRef} className="flex-1 overflow-y-auto px-8 py-8 ielts-scrollbar bg-[#FEF9E7] relative">
            {(() => {
              const sections: any[] = [];
              let currentSection: any = null;

              currentTestPart.questions.forEach((q) => {
                const qType = q.question_type || 'Short Answer';
                const structureData = (q as any).structure_data || {};
                const qRange = structureData.sectionRange || structureData.questionRange || '';
                const optionsKey = (q.options || []).join('|');

                if (currentSection && currentSection.type === qType && currentSection.optionsKey === optionsKey && currentSection.range === qRange) {
                  currentSection.questions.push(q);
                } else {
                  currentSection = {
                    type: qType,
                    questions: [q],
                    options: q.options || structureData.options || [],
                    optionsKey: optionsKey,
                    taskInstruction: structureData.taskInstruction || '',
                    instructions: structureData.instructions || '',
                    range: qRange
                  };
                  sections.push(currentSection);
                }
              });

              return sections.map((section, sIdx) => {
                const isYesNo = section.type.toLowerCase().includes('yes') && section.type.toLowerCase().includes('no');
                const isTrueFalse = section.type.toLowerCase().includes('true') && section.type.toLowerCase().includes('false');
                const isMatching = section.type.toLowerCase().includes('matching') || section.type.toLowerCase().includes('paragraph');
                const isSummary = section.type.toLowerCase().includes('summary') || (section.type.toLowerCase().includes('completion') && !isMatching);

                return (
                  <div key={`section-${sIdx}`} className="py-10 border-b border-[#E8D5A3]/40 last:border-b-0">
                    <div className="mb-8">
                      <h4 className="font-bold text-lg text-black font-serif mb-3 opacity-40">
                        Questions {section.questions[0]?.question_number} - {section.questions[section.questions.length - 1]?.question_number}
                      </h4>
                      {section.taskInstruction && (
                        <p className="text-base text-black font-bold leading-relaxed whitespace-pre-wrap max-w-2xl font-serif">
                          {section.taskInstruction}
                        </p>
                      )}
                    </div>

                    {(isYesNo || isTrueFalse) && (
                      <div className="mb-8 p-6 bg-[#fdfaf3] rounded-2xl border border-[#e0d6c7] shadow-sm max-w-2xl font-serif">
                        <div className="space-y-3">
                          {isYesNo ? (
                            <>
                              <div className="flex gap-6 text-sm"><span className="font-bold text-black w-32 uppercase tracking-tighter">YES</span><span className="text-black">if the statement agrees with the claims of the writer</span></div>
                              <div className="flex gap-6 text-sm"><span className="font-bold text-black w-32 uppercase tracking-tighter">NO</span><span className="text-black">if the statement contradicts the claims of the writer</span></div>
                              <div className="flex gap-6 text-sm"><span className="font-bold text-black w-32 uppercase tracking-tighter">NOT GIVEN</span><span className="text-black">if it is impossible to say what the writer thinks about this</span></div>
                            </>
                          ) : (
                            <>
                              <div className="flex gap-6 text-sm"><span className="font-bold text-black w-32 uppercase tracking-tighter">TRUE</span><span className="text-black">if the statement agrees with the information</span></div>
                              <div className="flex gap-6 text-sm"><span className="font-bold text-black w-32 uppercase tracking-tighter">FALSE</span><span className="text-black">if the statement contradicts the information</span></div>
                              <div className="flex gap-6 text-sm"><span className="font-bold text-black w-32 uppercase tracking-tighter">NOT GIVEN</span><span className="text-black">if there is no information on this</span></div>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {isSummary && section.instructions && (
                      <div className="mb-8 p-6 bg-[#fdfaf3] rounded-2xl border border-[#e0d6c7] text-black text-sm leading-8 shadow-sm max-w-3xl font-serif">
                        {section.instructions.split('\n').map((line: string, i: number) => (
                          <p key={i} className={`mb-3 last:mb-0 ${line.trim() === '' ? 'h-4' : ''}`}>
                            {line}
                          </p>
                        ))}
                      </div>
                    )}

                    {section.options.length > 0 && (
                      <div className="mb-8 p-6 bg-[#fdfaf3] rounded-xl border border-[#e0d6c7] shadow-sm max-w-2xl">
                        <div className="flex flex-wrap gap-x-8 gap-y-3">
                          {section.options.map((opt: string, idx: number) => (
                            <div key={idx} className="text-sm text-black flex items-center gap-2 font-serif">
                              <span className="text-[#8B4513] font-bold">•</span>
                              <span className="font-bold uppercase tracking-widest">{opt}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-6">
                      {section.questions.map((q: any) => {
                        const userAnswer = answers[q.id];
                        const isCorrect = answersMatch(userAnswer, q.correct_answer);
                        const isSkipped = !userAnswer;

                        const renderReviewInput = () => {
                          if (isYesNo || isTrueFalse) {
                            return (
                              <div className="flex flex-wrap items-center gap-3 mt-4">
                                {isSkipped ? (
                                  <div className="flex items-center gap-2 font-serif">
                                    <div className="px-5 py-2 border-2 border-red-700 bg-[#fff5f5] text-red-800 font-bold rounded-xl text-xs tracking-wide">
                                      No Answer
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-[#10b981]" />
                                    <div className="px-5 py-2 bg-[#10b981] text-white font-bold rounded-xl text-xs tracking-wide shadow-sm">
                                      {q.correct_answer}
                                    </div>
                                  </div>
                                ) : isCorrect ? (
                                  <div className="px-5 py-2 border-2 border-[#10b981] bg-[#f0fdf4] text-[#10b981] font-bold rounded-xl text-xs tracking-wide font-serif">
                                    {userAnswer}
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 font-serif">
                                    <div className="px-5 py-2 border-2 border-red-700 bg-[#fff5f5] text-red-800 font-bold rounded-xl text-xs tracking-wide">
                                      {userAnswer}
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-[#10b981]" />
                                    <div className="px-5 py-2 bg-[#10b981] text-white font-bold rounded-xl text-xs tracking-wide shadow-sm">
                                      {q.correct_answer}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          }

                          const isMCQ = q.options && q.options.length >= 3;
                          if (isMCQ && !isMatching) {
                            return (
                              <div className="grid gap-2 mt-4 max-w-xl">
                                {q.options.map((option: string, index: number) => {
                                  const letter = String.fromCharCode(65 + index);
                                  const isUserChoice = (userAnswer || '').toUpperCase() === letter.toUpperCase();
                                  const isCorrectChoice = (q.correct_answer || '').toUpperCase() === letter.toUpperCase();

                                  let style = "border-[#E8D5A3] bg-white text-black opacity-40";
                                  if (isUserChoice && isCorrectChoice) style = "bg-[#f0f9f1] border-[#10b981] text-[#10b981] font-bold opacity-100 shadow-sm border-2";
                                  else if (isUserChoice && !isCorrectChoice) style = "bg-[#fff1f1] border-red-700 text-red-800 opacity-100 shadow-sm";
                                  else if (isCorrectChoice) style = "bg-white border-[#10b981] text-[#10b981] font-bold border-2 opacity-100";

                                  return (
                                    <div
                                      key={index}
                                      className={`flex items-center p-3 rounded-lg border transition-all duration-200 ${style}`}
                                    >
                                      <span className={`flex-shrink-0 font-bold text-sm mr-3 w-7 h-7 flex items-center justify-center rounded-sm 
                                        ${(isUserChoice || isCorrectChoice) ? 'text-white bg-[#8B4513]' : 'text-[#8B4513] bg-[#E8D5A3]/30'}`}>
                                        {letter}
                                      </span>
                                      <span className="text-base leading-relaxed font-serif">
                                        {option.replace(/^[A-D]\s+/, '')}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          }

                          return (
                            <div className="mt-4 flex flex-wrap items-center gap-3">
                              {isSkipped ? (
                                <div className="flex items-center gap-3 font-serif">
                                  <div className="px-6 py-2 border-2 border-red-700 bg-[#fff5f5] text-red-800 font-bold rounded-xl text-base">
                                    No Answer
                                  </div>
                                  <ArrowRight className="w-4 h-4 text-[#10b981]" />
                                  <div className="px-6 py-2 bg-[#10b981] text-white font-bold rounded-xl text-base shadow-sm">
                                    {q.correct_answer}
                                  </div>
                                </div>
                              ) : isCorrect ? (
                                <div className="px-6 py-2 border-2 border-[#10b981] bg-[#f0fdf4] text-[#10b981] font-bold rounded-xl font-serif text-base">
                                  {userAnswer}
                                </div>
                              ) : (
                                <div className="flex items-center gap-3 font-serif">
                                  <div className="px-6 py-2 border-2 border-red-700 bg-[#fff5f5] text-red-800 font-bold rounded-xl text-base">
                                    {userAnswer}
                                  </div>
                                  <ArrowRight className="w-4 h-4 text-[#10b981]" />
                                  <div className="px-6 py-2 bg-[#10b981] text-white font-bold rounded-xl text-base shadow-sm">
                                    {q.correct_answer}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        };

                        return (
                          <div key={q.id} className="p-6 rounded-2xl border border-[#E8D5A3]/40 bg-white/40 backdrop-blur-sm hover:bg-white/80 transition-all duration-300 shadow-sm">
                            <div className="flex items-start gap-4">
                              <div className="flex-shrink-0 text-base font-bold text-black font-serif w-6 text-right pt-0.5 opacity-20">
                                {q.question_number}
                              </div>
                              <div className="flex-1">
                                <p className="font-serif text-lg text-black leading-relaxed">
                                  {q.question_text}
                                </p>
                                {renderReviewInput()}

                                {q.explanation && (
                                  <div className="mt-6 p-4 bg-[#FEF9E7] rounded-xl border border-[#E8D5A3] flex gap-4 italic font-serif">
                                    <div className="w-6 h-6 rounded-full bg-[#8B4513]/10 flex items-center justify-center shrink-0 mt-0.5">
                                      <BookOpen className="w-4 h-4 text-[#8B4513]" />
                                    </div>
                                    <p className="text-sm text-black leading-relaxed">
                                      <span className="not-italic font-bold text-black mr-2">Teacher's Note:</span>
                                      {q.explanation}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestResults;