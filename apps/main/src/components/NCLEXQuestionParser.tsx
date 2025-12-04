import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Copy, 
  Wand2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  RefreshCw,
  Save,
  FileText,
  Sparkles,
  Eye,
  Edit3,
  BookOpen,
  ListChecks,
  HelpCircle
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ParsedQuestion {
  id: string;
  question_number: number;
  question_text: string;
  question_type: 'SATA' | 'MCQ';
  options: string[];
  correct_answers: number[];
  rationale: string;
  original_text: string;
  suggested_text?: string;
  is_modified: boolean;
  use_suggested: boolean;
}

interface NCLEXQuestionParserProps {
  testId: string;
  onQuestionsImported: (questions: ParsedQuestion[]) => void;
}

const NCLEXQuestionParser = ({ testId, onQuestionsImported }: NCLEXQuestionParserProps) => {
  const [questionsText, setQuestionsText] = useState('');
  const [answersText, setAnswersText] = useState('');
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isModifying, setIsModifying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [activeInputTab, setActiveInputTab] = useState('questions');

  const parseQuestions = () => {
    setIsParsing(true);
    setParseError(null);
    
    try {
      const questions = parseNCLEXText(questionsText, answersText);
      
      if (questions.length === 0) {
        setParseError('No questions could be parsed. Please check the format.');
        setParsedQuestions([]);
      } else {
        setParsedQuestions(questions);
        setShowPreview(true);
        toast.success(`Parsed ${questions.length} questions successfully`);
      }
    } catch (error: any) {
      setParseError(error.message || 'Failed to parse questions');
      setParsedQuestions([]);
    } finally {
      setIsParsing(false);
    }
  };

  const parseNCLEXText = (qText: string, aText: string): ParsedQuestion[] => {
    const questions: ParsedQuestion[] = [];
    
    // Parse questions section
    let questionBlocks: { text: string; options: string[] }[] = [];
    
    // Split by double newlines or look for "The nurse" patterns
    const blocks = qText.split(/\n\s*\n/).filter(b => b.trim());
    
    let currentQuestion = '';
    let currentOptions: string[] = [];
    
    for (const block of blocks) {
      const lines = block.split('\n').map(l => l.trim()).filter(l => l);
      
      // Check if this block starts a new question
      const isNewQuestion = /^The\s+(nurse|client|patient)/i.test(lines[0]) || 
                           /^\d+\.\s*The/i.test(lines[0]) ||
                           (lines[0].includes('?') && lines.length > 1);
      
      if (isNewQuestion) {
        // Save previous question if exists
        if (currentQuestion && currentOptions.length > 0) {
          questionBlocks.push({ text: currentQuestion, options: currentOptions });
        }
        
        // Find where the question text ends and options begin
        let questionEndIndex = 0;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('?') || lines[i].toLowerCase().includes('select all that apply')) {
            questionEndIndex = i;
            break;
          }
        }
        
        currentQuestion = lines.slice(0, questionEndIndex + 1).join(' ');
        
        // Parse options - they might be on separate lines or semicolon-separated
        const optionLines = lines.slice(questionEndIndex + 1);
        currentOptions = [];
        
        for (const line of optionLines) {
          // Check if line contains multiple options separated by semicolons
          if (line.includes(';')) {
            currentOptions.push(...line.split(';').map(o => o.trim()).filter(o => o));
          } else if (line.trim()) {
            // Check if it's a lettered option (a), b), A., etc.)
            const cleanedOption = line.replace(/^[a-zA-Z][.)]\s*/, '').trim();
            if (cleanedOption) {
              currentOptions.push(cleanedOption);
            }
          }
        }
      } else if (currentQuestion) {
        // This might be additional options for the current question
        const lines2 = block.split('\n').map(l => l.trim()).filter(l => l);
        for (const line of lines2) {
          if (line.includes(';')) {
            currentOptions.push(...line.split(';').map(o => o.trim()).filter(o => o));
          } else {
            const cleanedOption = line.replace(/^[a-zA-Z][.)]\s*/, '').trim();
            if (cleanedOption && !cleanedOption.toLowerCase().startsWith('the nurse')) {
              currentOptions.push(cleanedOption);
            }
          }
        }
      }
    }
    
    // Don't forget the last question
    if (currentQuestion && currentOptions.length > 0) {
      questionBlocks.push({ text: currentQuestion, options: currentOptions });
    }
    
    // Parse answer key section
    const answerMap: Record<number, { correct: number[]; rationale: string }> = {};
    
    if (aText.trim()) {
      // Multiple patterns to try for answer parsing
      // Pattern 1: "1. Number 3 is correct. Rationale: ..."
      const answerPattern1 = /(\d+)\.\s*Number\s*(\d+)\s*is\s*correct\.?\s*(?:\n|\s)*Rationale:\s*([\s\S]*?)(?=\d+\.\s*Number|\n\s*\n\s*\n|$)/gi;
      
      let answerMatch;
      while ((answerMatch = answerPattern1.exec(aText)) !== null) {
        const questionNum = parseInt(answerMatch[1]);
        const correctAnswer = parseInt(answerMatch[2]);
        const rationale = answerMatch[3].trim();
        
        answerMap[questionNum] = {
          correct: [correctAnswer - 1], // Convert to 0-indexed
          rationale
        };
      }
      
      // Pattern 2: Simpler "1. Number 3 is correct." followed by text
      if (Object.keys(answerMap).length === 0) {
        const answerPattern2 = /(\d+)\.\s*Number\s*(\d+)\s*is\s*correct\.?\s*([\s\S]*?)(?=\d+\.\s*Number|$)/gi;
        
        while ((answerMatch = answerPattern2.exec(aText)) !== null) {
          const questionNum = parseInt(answerMatch[1]);
          const correctAnswer = parseInt(answerMatch[2]);
          let rationale = answerMatch[3]?.trim() || '';
          // Clean up rationale - remove "Rationale:" prefix if present
          rationale = rationale.replace(/^Rationale:\s*/i, '').trim();
          
          if (!answerMap[questionNum]) {
            answerMap[questionNum] = {
              correct: [correctAnswer - 1],
              rationale
            };
          }
        }
      }
      
      // Pattern 3: Split by question numbers and parse each
      if (Object.keys(answerMap).length === 0) {
        const answerBlocks = aText.split(/(?=\d+\.\s*Number)/i).filter(b => b.trim());
        
        for (const block of answerBlocks) {
          const match = block.match(/(\d+)\.\s*Number\s*(\d+)\s*is\s*correct/i);
          if (match) {
            const questionNum = parseInt(match[1]);
            const correctAnswer = parseInt(match[2]);
            let rationale = block.substring(match[0].length);
            rationale = rationale.replace(/^[\.\s]*Rationale:\s*/i, '').trim();
            
            answerMap[questionNum] = {
              correct: [correctAnswer - 1],
              rationale
            };
          }
        }
      }
    }
    
    // Build final questions array
    questionBlocks.forEach((block, index) => {
      const questionNum = index + 1;
      const isSATA = block.text.toLowerCase().includes('select all that apply');
      
      // Get answer info
      const answerInfo = answerMap[questionNum] || { correct: [], rationale: '' };
      
      questions.push({
        id: `temp-${questionNum}`,
        question_number: questionNum,
        question_text: block.text.trim(),
        question_type: isSATA ? 'SATA' : 'MCQ',
        options: block.options,
        correct_answers: answerInfo.correct,
        rationale: answerInfo.rationale,
        original_text: block.text.trim(),
        is_modified: false,
        use_suggested: false
      });
    });
    
    return questions;
  };

  // Function to update a specific question's correct answers
  const updateCorrectAnswer = (questionIndex: number, optionIndex: number) => {
    const updated = [...parsedQuestions];
    const question = updated[questionIndex];
    
    if (question.question_type === 'MCQ') {
      // Single selection for MCQ
      question.correct_answers = [optionIndex];
    } else {
      // Multiple selection for SATA
      if (question.correct_answers.includes(optionIndex)) {
        question.correct_answers = question.correct_answers.filter(i => i !== optionIndex);
      } else {
        question.correct_answers = [...question.correct_answers, optionIndex];
      }
    }
    
    setParsedQuestions(updated);
  };

  // Function to update rationale
  const updateRationale = (questionIndex: number, rationale: string) => {
    const updated = [...parsedQuestions];
    updated[questionIndex].rationale = rationale;
    setParsedQuestions(updated);
  };

  const requestAIModifications = async () => {
    if (parsedQuestions.length === 0) return;
    
    setIsModifying(true);
    
    try {
      // Call the edge function to get AI modifications
      const response = await fetch(
        `https://cuumxmfzhwljylbdlflj.supabase.co/functions/v1/nclex-modify-questions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            questions: parsedQuestions.map(q => ({
              question_text: q.question_text,
              options: q.options,
              rationale: q.rationale
            }))
          })
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to get AI modifications');
      }
      
      const data = await response.json();
      
      // Update questions with suggested modifications
      const updatedQuestions = parsedQuestions.map((q, index) => ({
        ...q,
        suggested_text: data.modifications?.[index]?.question_text || q.question_text,
        options: data.modifications?.[index]?.options || q.options,
        rationale: data.modifications?.[index]?.rationale || q.rationale,
        is_modified: true
      }));
      
      setParsedQuestions(updatedQuestions);
      toast.success('AI modifications generated! Review and accept changes.');
    } catch (error) {
      console.error('Error getting AI modifications:', error);
      toast.error('Failed to generate AI modifications. You can still save the original questions.');
    } finally {
      setIsModifying(false);
    }
  };

  const toggleUseSuggested = (index: number) => {
    const updated = [...parsedQuestions];
    updated[index].use_suggested = !updated[index].use_suggested;
    setParsedQuestions(updated);
  };

  const acceptAllSuggestions = () => {
    const updated = parsedQuestions.map(q => ({ ...q, use_suggested: true }));
    setParsedQuestions(updated);
  };

  const rejectAllSuggestions = () => {
    const updated = parsedQuestions.map(q => ({ ...q, use_suggested: false }));
    setParsedQuestions(updated);
  };

  const saveQuestions = async () => {
    if (parsedQuestions.length === 0) return;
    
    // Check if any questions are missing correct answers
    const questionsWithoutAnswers = parsedQuestions.filter(q => q.correct_answers.length === 0);
    if (questionsWithoutAnswers.length > 0) {
      const proceed = window.confirm(
        `${questionsWithoutAnswers.length} question(s) don't have correct answers set. Save anyway?`
      );
      if (!proceed) return;
    }
    
    setIsSaving(true);
    
    try {
      // Get the current highest question number
      const { data: existingQuestions } = await supabase
        .from('nclex_questions')
        .select('question_number')
        .eq('test_id', testId)
        .order('question_number', { ascending: false })
        .limit(1);
      
      const startNumber = existingQuestions && existingQuestions.length > 0 
        ? existingQuestions[0].question_number + 1 
        : 1;
      
      // Prepare questions for insert
      const questionsToInsert = parsedQuestions.map((q, index) => ({
        test_id: testId,
        question_number: startNumber + index,
        question_text: q.use_suggested && q.suggested_text ? q.suggested_text : q.question_text,
        question_type: q.question_type,
        options: q.options,
        correct_answers: q.correct_answers,
        rationale: q.rationale,
        original_text: q.original_text,
        is_modified: q.use_suggested && q.suggested_text !== q.original_text
      }));
      
      const { error } = await supabase
        .from('nclex_questions')
        .insert(questionsToInsert);
      
      if (error) throw error;
      
      toast.success(`${questionsToInsert.length} questions saved successfully!`);
      onQuestionsImported(parsedQuestions);
      
      // Reset state
      setRawText('');
      setParsedQuestions([]);
      setShowPreview(false);
    } catch (error) {
      console.error('Error saving questions:', error);
      toast.error('Failed to save questions');
    } finally {
      setIsSaving(false);
    }
  };

  const resetParser = () => {
    setQuestionsText('');
    setAnswersText('');
    setParsedQuestions([]);
    setShowPreview(false);
    setParseError(null);
    setActiveInputTab('questions');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Copy className="h-5 w-5" />
          Import Questions via Copy-Paste
        </CardTitle>
        <CardDescription>
          Paste NCLEX questions with their answer key. The parser will automatically detect questions, options, correct answers, and rationales.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!showPreview ? (
          <>
            <Tabs value={activeInputTab} onValueChange={setActiveInputTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="questions" className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Questions
                  {questionsText.trim() && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                </TabsTrigger>
                <TabsTrigger value="answers" className="flex items-center gap-2">
                  <ListChecks className="h-4 w-4" />
                  Answer Key & Rationale
                  {answersText.trim() && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="questions" className="space-y-3 mt-4">
                <Label className="text-sm font-medium">Paste Questions Here</Label>
                <Textarea
                  value={questionsText}
                  onChange={(e) => setQuestionsText(e.target.value)}
                  placeholder={`Paste your NCLEX questions here. Example:

The nurse is caring for a client with cardiogenic shock. The nurse expects which signs present with this client? Select all that apply.
hypertension; slow, labored breathing
decreased urine output; warm, pink skin
increased urine output; cool, clammy skin
hypotension; weak pulse; cool, clammy skin

The nurse is caring for a client with a sacral wound. The wound is full thickness, measures 4 cm × 6 cm with irregular borders, and is covered by a layer of black collagen. Which is this wound stage?
Stage I
Stage II
Stage III
unstageable`}
                  className="min-h-[250px] font-mono text-sm"
                />
                <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200">
                  <HelpCircle className="h-4 w-4 text-blue-500" />
                  <AlertDescription className="text-sm">
                    <strong>Tip:</strong> Include "Select all that apply" in questions for SATA type. Options can be on separate lines or separated by semicolons.
                  </AlertDescription>
                </Alert>
              </TabsContent>
              
              <TabsContent value="answers" className="space-y-3 mt-4">
                <Label className="text-sm font-medium">Paste Answer Key & Rationale Here</Label>
                <Textarea
                  value={answersText}
                  onChange={(e) => setAnswersText(e.target.value)}
                  placeholder={`Paste the answer key and rationales here. Example:

1. Number 4 is correct.
Rationale: Hypotension, weak pulse, and cool clammy skin are classic signs of cardiogenic shock. The heart cannot pump effectively, leading to decreased cardiac output and peripheral vasoconstriction.

2. Number 4 is correct.
Rationale: A wound covered by black collagen (eschar) is unstageable because the true depth cannot be determined until the eschar is removed.

3. Number 1 is correct.
Rationale: A Braden score of 13 indicates high risk for skin breakdown. Scores range from 6-23, with lower scores indicating higher risk.`}
                  className="min-h-[250px] font-mono text-sm"
                />
                <Alert className="bg-amber-50 dark:bg-amber-900/20 border-amber-200">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  <AlertDescription className="text-sm">
                    <strong>Format:</strong> Use "Number X is correct" pattern. The X refers to the option number (1 = first option, 2 = second, etc.)
                  </AlertDescription>
                </Alert>
              </TabsContent>
            </Tabs>
            
            {parseError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{parseError}</AlertDescription>
              </Alert>
            )}
            
            <Separator />
            
            <div className="flex gap-2">
              <Button 
                onClick={parseQuestions} 
                disabled={!questionsText.trim() || isParsing}
                className="flex-1 bg-teal-500 hover:bg-teal-600 text-white"
              >
                {isParsing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Parsing...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Parse Questions {answersText.trim() ? '& Answers' : ''}
                  </>
                )}
              </Button>
            </div>
            
            {!answersText.trim() && questionsText.trim() && (
              <Alert className="bg-purple-50 dark:bg-purple-900/20 border-purple-200">
                <Wand2 className="h-4 w-4 text-purple-500" />
                <AlertDescription className="text-sm">
                  <strong>No answers?</strong> You can still parse questions and manually set correct answers in the preview, or let AI help later.
                </AlertDescription>
              </Alert>
            )}
          </>
        ) : (
          <>
            {/* Preview Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-lg px-3 py-1">
                  {parsedQuestions.length} Questions Parsed
                </Badge>
                <Badge variant="secondary">
                  {parsedQuestions.filter(q => q.question_type === 'SATA').length} SATA
                </Badge>
                <Badge variant="secondary">
                  {parsedQuestions.filter(q => q.question_type === 'MCQ').length} MCQ
                </Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={resetParser}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Start Over
              </Button>
            </div>
            
            {/* Answer Status Summary */}
            <Card className={`p-4 ${
              parsedQuestions.every(q => q.correct_answers.length > 0) 
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200' 
                : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {parsedQuestions.every(q => q.correct_answers.length > 0) ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                  )}
                  <div>
                    <p className="font-medium text-sm">
                      {parsedQuestions.filter(q => q.correct_answers.length > 0).length} / {parsedQuestions.length} questions have correct answers set
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {parsedQuestions.filter(q => q.rationale).length} / {parsedQuestions.length} have rationales
                    </p>
                  </div>
                </div>
                {parsedQuestions.some(q => q.correct_answers.length === 0) && (
                  <Badge variant="destructive" className="animate-pulse">
                    {parsedQuestions.filter(q => q.correct_answers.length === 0).length} need answers
                  </Badge>
                )}
              </div>
            </Card>
            
            <Separator />
            
            {/* AI Modification Section */}
            <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-800">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                    <Wand2 className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">AI-Powered Modifications</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Let AI suggest slight rewording to questions while preserving the exact medical meaning.
                    </p>
                    <Button 
                      onClick={requestAIModifications}
                      disabled={isModifying}
                      className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
                    >
                      {isModifying ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Suggest Modifications
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Bulk accept/reject buttons */}
            {parsedQuestions.some(q => q.suggested_text) && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={acceptAllSuggestions}>
                  <CheckCircle2 className="h-4 w-4 mr-1 text-green-500" />
                  Accept All Suggestions
                </Button>
                <Button variant="outline" size="sm" onClick={rejectAllSuggestions}>
                  <XCircle className="h-4 w-4 mr-1 text-red-500" />
                  Keep All Originals
                </Button>
              </div>
            )}
            
            {/* Questions Preview */}
            <ScrollArea className="h-[500px] border rounded-lg p-4">
              <div className="space-y-6">
                {parsedQuestions.map((question, index) => (
                  <div key={question.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">Q{question.question_number}.</span>
                        <Badge variant={question.question_type === 'SATA' ? 'default' : 'secondary'}>
                          {question.question_type}
                        </Badge>
                        {question.correct_answers.length === 0 && (
                          <Badge variant="destructive" className="animate-pulse">
                            ⚠️ Set correct answer
                          </Badge>
                        )}
                        {question.correct_answers.length > 0 && (
                          <Badge className="bg-green-100 text-green-700">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Answer set
                          </Badge>
                        )}
                      </div>
                      {question.suggested_text && (
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={question.use_suggested}
                            onCheckedChange={() => toggleUseSuggested(index)}
                          />
                          <span className="text-xs text-muted-foreground">Use AI version</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Show original vs suggested */}
                    {question.suggested_text && question.suggested_text !== question.original_text ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div className={`p-3 rounded-lg ${!question.use_suggested ? 'bg-green-50 dark:bg-green-900/20 border-green-200' : 'bg-muted'}`}>
                          <p className="text-xs text-muted-foreground mb-1">Original</p>
                          <p className="text-sm">{question.original_text}</p>
                        </div>
                        <div className={`p-3 rounded-lg ${question.use_suggested ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200' : 'bg-muted'}`}>
                          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <Wand2 className="h-3 w-3" /> AI Suggested
                          </p>
                          <p className="text-sm">{question.suggested_text}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm">{question.question_text}</p>
                    )}
                    
                    {/* Options - Clickable to set correct answers */}
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                        <Edit3 className="h-3 w-3" />
                        Click options to set correct answer{question.question_type === 'SATA' ? '(s)' : ''}:
                      </p>
                      {question.options.map((option, optIndex) => (
                        <div 
                          key={optIndex}
                          onClick={() => updateCorrectAnswer(index, optIndex)}
                          className={`text-sm px-3 py-2 rounded cursor-pointer transition-all border-2 ${
                            question.correct_answers.includes(optIndex)
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-400'
                              : 'bg-muted border-transparent hover:border-gray-300 hover:bg-muted/80'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {question.question_type === 'SATA' ? (
                              <div className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
                                question.correct_answers.includes(optIndex) 
                                  ? 'border-green-500 bg-green-500' 
                                  : 'border-gray-400'
                              }`}>
                                {question.correct_answers.includes(optIndex) && (
                                  <CheckCircle2 className="h-3 w-3 text-white" />
                                )}
                              </div>
                            ) : (
                              <div className={`w-4 h-4 border-2 rounded-full flex items-center justify-center ${
                                question.correct_answers.includes(optIndex) 
                                  ? 'border-green-500 bg-green-500' 
                                  : 'border-gray-400'
                              }`}>
                                {question.correct_answers.includes(optIndex) && (
                                  <div className="w-2 h-2 bg-white rounded-full" />
                                )}
                              </div>
                            )}
                            <span>{optIndex + 1}. {option}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Rationale - Editable */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        Rationale (explain why the answer is correct):
                      </Label>
                      <Textarea
                        value={question.rationale}
                        onChange={(e) => updateRationale(index, e.target.value)}
                        placeholder="Enter rationale for this question..."
                        className="text-sm min-h-[80px]"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button variant="outline" onClick={resetParser} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={saveQuestions}
                disabled={isSaving || parsedQuestions.length === 0}
                className="flex-1 bg-teal-500 hover:bg-teal-600 text-white"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save {parsedQuestions.length} Questions
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default NCLEXQuestionParser;

