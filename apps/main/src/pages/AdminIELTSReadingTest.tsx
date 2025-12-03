import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// Select removed - using auto-detect instead of manual selection
import { CheckCircle, Upload, Circle, BookOpen, Sparkles, Image, Trash2, Plus, Eye, X, Save, FileText, ClipboardPaste, Edit2, AlertCircle } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { ImageQuestionExtractor } from "@/components/ImageQuestionExtractor";
import { SmartQuestionRenderer } from "@/components/NoteCompletionRenderer";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// All 14 IELTS Reading Question Types
const IELTS_READING_QUESTION_TYPES = [
  { value: 'Matching Headings', label: '1. Matching Headings', keywords: ['heading', 'paragraph', 'section'] },
  { value: 'Matching Paragraph Information', label: '2. Matching Paragraph Information', keywords: ['paragraph', 'contains', 'which paragraph'] },
  { value: 'Matching Features', label: '3. Matching Features', keywords: ['match', 'feature', 'researcher', 'writer', 'person'] },
  { value: 'Matching Sentence Endings', label: '4. Matching Sentence Endings', keywords: ['complete', 'sentence', 'ending'] },
  { value: 'True False Not Given', label: '5. True/False/Not Given', keywords: ['true', 'false', 'not given', 'TFNG'] },
  { value: 'Yes No Not Given', label: '5. Yes/No/Not Given', keywords: ['yes', 'no', 'not given', 'YNNG'] },
  { value: 'Multiple Choice', label: '6. Multiple Choice', keywords: ['choose', 'A', 'B', 'C', 'D', 'option'] },
  { value: 'List Selection', label: '7. List of Options', keywords: ['list', 'choose', 'THREE', 'TWO', 'select'] },
  { value: 'Choose a Title', label: '8. Choose a Title', keywords: ['title', 'best title', 'suitable title'] },
  { value: 'Short Answer', label: '9. Short Answers', keywords: ['answer', 'no more than', 'words'] },
  { value: 'Sentence Completion', label: '10. Sentence Completion', keywords: ['complete', 'sentence', 'blank'] },
  { value: 'Summary Completion', label: '11. Summary Completion', keywords: ['summary', 'complete the summary'] },
  { value: 'Table Completion', label: '12. Table Completion', keywords: ['table', 'complete the table'] },
  { value: 'Flow Chart Completion', label: '13. Flow Chart Completion', keywords: ['flow', 'chart', 'process'] },
  { value: 'Diagram Completion', label: '14. Diagram Completion', keywords: ['diagram', 'label'] },
];

// Auto-detect question type from text patterns
const detectQuestionType = (text: string): string => {
  const lowerText = text.toLowerCase();
  
  // Check for specific patterns - order matters! More specific first
  
  // True/False/Not Given
  if (lowerText.includes('true') && lowerText.includes('false') && lowerText.includes('not given')) {
    return 'True False Not Given';
  }
  
  // Yes/No/Not Given
  if (lowerText.includes('yes') && lowerText.includes('no') && lowerText.includes('not given')) {
    return 'Yes No Not Given';
  }
  
  // Multiple Choice - check for "choose the correct letter" or A B C D options
  if (lowerText.includes('choose the correct letter') || 
      lowerText.includes('choose the best') ||
      /choose.*letter\s*[A-D]/i.test(text) ||
      /\n\s*[A-D]\s+[A-Z][a-z]+/.test(text)) {  // Lines starting with A, B, C, D followed by text
    return 'Multiple Choice';
  }
  
  // Summary/Notes Completion - check for blanks like "14……" or "complete the summary"
  if (lowerText.includes('complete the summary') || 
      lowerText.includes('complete the notes') ||
      /\d+[….…]{3,}/.test(text) ||  // Blanks like 14………
      (lowerText.includes('no more than') && lowerText.includes('words'))) {
    return 'Summary Completion';
  }
  
  // Matching Features
  if (lowerText.includes('match') && (lowerText.includes('people') || lowerText.includes('listed') || /[A-G]\s+\w+\s+\w+/.test(text))) {
    return 'Matching Features';
  }
  
  // Matching Headings
  if (lowerText.includes('heading') || lowerText.includes('list of headings')) {
    return 'Matching Headings';
  }
  
  // Matching Paragraph Information
  if (lowerText.includes('which paragraph') || lowerText.includes('paragraph contains')) {
    return 'Matching Paragraph Information';
  }
  
  // Matching Sentence Endings
  if (lowerText.includes('complete') && lowerText.includes('sentence') && lowerText.includes('ending')) {
    return 'Matching Sentence Endings';
  }
  
  // Table Completion
  if (lowerText.includes('complete') && lowerText.includes('table')) {
    return 'Table Completion';
  }
  
  // Flow Chart Completion
  if (lowerText.includes('complete') && (lowerText.includes('flow') || lowerText.includes('chart'))) {
    return 'Flow Chart Completion';
  }
  
  // Diagram Completion
  if (lowerText.includes('diagram') || lowerText.includes('label')) {
    return 'Diagram Completion';
  }
  
  // Choose a Title
  if (lowerText.includes('choose') && lowerText.includes('title')) {
    return 'Choose a Title';
  }
  
  // Sentence Completion
  if (lowerText.includes('complete') && lowerText.includes('sentence')) {
    return 'Sentence Completion';
  }
  
  // Short Answer as fallback
  return 'Short Answer';
};

// Parse ALL sections from pasted text automatically
const parseAllSections = (text: string): QuestionSection[] => {
  const sections: QuestionSection[] = [];
  
  // Split by "Questions X-Y" OR "Question X" (single question) pattern
  // Match: "Questions 14-16", "Question 40", "Questions 1-8"
  const sectionPattern = /Questions?\s+(\d+)(?:[-–—](\d+))?/gi;
  const sectionMatches = [...text.matchAll(sectionPattern)];
  
  if (sectionMatches.length === 0) {
    return sections;
  }
  
  // Process each section
  for (let i = 0; i < sectionMatches.length; i++) {
    const match = sectionMatches[i];
    const startNum = parseInt(match[1]);
    // If no end number (single question like "Question 40"), use start as end
    const endNum = match[2] ? parseInt(match[2]) : startNum;
    const sectionStart = match.index!;
    const sectionEnd = i < sectionMatches.length - 1 ? sectionMatches[i + 1].index! : text.length;
    
    const sectionText = text.substring(sectionStart, sectionEnd);
    
    // Detect question type for this section
    const questionType = detectQuestionType(sectionText);
    
    // Extract instructions (text between header and first question or options)
    const instructionsMatch = sectionText.match(/Questions?\s+\d+[-–—]\d+\s*([\s\S]*?)(?=\n\s*(?:[A-G]\s+\w|\d+\s+[A-Z]|\d+\.))/i);
    const instructions = instructionsMatch ? instructionsMatch[1].replace(/\s+/g, ' ').trim() : '';
    
    // Extract options for matching types (A-G list)
    // Handle both single column and two-column formats
    const options: string[] = [];
    
    // Pattern for options like "A  Tony Brown" - handles multiple per line
    // Matches: A followed by 1-2 spaces, then name (letters/spaces), stopping at next letter option or end
    const lines = sectionText.split('\n');
    for (const line of lines) {
      // Check if line contains option pattern (A-G followed by name)
      // Handle two-column format: "A  Tony Brown            E  Art Pimms"
      const multiOptionPattern = /([A-G])\s{1,3}([A-Za-z][A-Za-z\s]+?)(?=\s{3,}[A-G]\s|\s*$)/g;
      let optionMatch;
      while ((optionMatch = multiOptionPattern.exec(line)) !== null) {
        const letter = optionMatch[1];
        const name = optionMatch[2].trim();
        // Only add if it looks like a name (has letters) and not already added
        if (name.length > 1 && /^[A-Z]/.test(name) && !options.some(o => o.startsWith(letter + ' '))) {
          options.push(`${letter}  ${name}`);
        }
      }
      
      // Also try single option per line format: "A. Tony Brown" or "A) Tony Brown"
      const singleMatch = line.match(/^\s*([A-G])[.\)]\s*(.+)/);
      if (singleMatch && !options.some(o => o.startsWith(singleMatch[1] + ' '))) {
        options.push(`${singleMatch[1]}  ${singleMatch[2].trim()}`);
      }
    }
    
    // Sort options by letter
    options.sort((a, b) => a.charCodeAt(0) - b.charCodeAt(0));
    
    // Also check for roman numeral options (i, ii, iii, etc.)
    const romanPattern = /^\s*([ivxIVX]+)[.\)]\s*(.+)/gm;
    let romanMatch;
    while ((romanMatch = romanPattern.exec(sectionText)) !== null) {
      const numeral = romanMatch[1].toLowerCase();
      if (!options.some(o => o.toLowerCase().startsWith(numeral + '.'))) {
        options.push(`${numeral}. ${romanMatch[2].trim()}`);
      }
    }
    
    // Extract individual questions - improved to handle multiple formats
    const questions: any[] = [];
    const sectionLines = sectionText.split('\n');
    
    // For Multiple Choice: extract A, B, C, D options that appear after the question
    const mcOptions: string[] = [];
    let currentQuestionText = '';
    let currentQuestionNum = 0;
    let collectingOptions = false;
    
    for (let lineIdx = 0; lineIdx < sectionLines.length; lineIdx++) {
      const line = sectionLines[lineIdx].trim();
      if (!line) continue;
      
      // Check if line starts with a question number in our range
      const qNumMatch = line.match(/^(\d+)\s+(.+)/);
      if (qNumMatch) {
        const num = parseInt(qNumMatch[1]);
        
        // Save previous question if we have one
        if (currentQuestionNum >= startNum && currentQuestionNum <= endNum && currentQuestionText) {
          const qOptions = questionType === 'True False Not Given' ? ['TRUE', 'FALSE', 'NOT GIVEN'] :
                          questionType === 'Yes No Not Given' ? ['YES', 'NO', 'NOT GIVEN'] :
                          questionType === 'Multiple Choice' && mcOptions.length > 0 ? [...mcOptions] : null;
          
          questions.push({
            question_number: currentQuestionNum,
            question_text: currentQuestionText.trim(),
            question_type: questionType,
            options: qOptions,
            correct_answer: ''
          });
          mcOptions.length = 0; // Clear for next question
        }
        
        if (num >= startNum && num <= endNum) {
          currentQuestionNum = num;
          currentQuestionText = qNumMatch[2].trim();
          collectingOptions = questionType === 'Multiple Choice';
        } else {
          // Not in our range, might be an option like "A Tony Brown"
          currentQuestionNum = 0;
          currentQuestionText = '';
        }
      }
      // Check if line is a multiple choice option (A, B, C, D followed by text)
      else if (/^[A-D]\s+/.test(line) && collectingOptions) {
        mcOptions.push(line);
      }
      // Check for blank/gap format: "14……………" or just continuing text
      else if (currentQuestionNum > 0) {
        // Append to current question if it looks like continuation
        if (!line.match(/^[A-G]\s+[A-Z]/) && !line.match(/^Questions?\s/i)) {
          currentQuestionText += ' ' + line;
        }
      }
    }
    
    // Don't forget the last question!
    if (currentQuestionNum >= startNum && currentQuestionNum <= endNum && currentQuestionText) {
      const qOptions = questionType === 'True False Not Given' ? ['TRUE', 'FALSE', 'NOT GIVEN'] :
                      questionType === 'Yes No Not Given' ? ['YES', 'NO', 'NOT GIVEN'] :
                      questionType === 'Multiple Choice' && mcOptions.length > 0 ? [...mcOptions] : null;
      
      questions.push({
        question_number: currentQuestionNum,
        question_text: currentQuestionText.trim(),
        question_type: questionType,
        options: qOptions,
        correct_answer: ''
      });
    }
    
    // For Summary Completion: keep the WHOLE summary as context, just mark blank numbers
    if (questions.length === 0 && (questionType === 'Summary Completion' || questionType === 'Short Answer')) {
      // Get everything after the header line
      const afterHeader = sectionText.replace(/Questions?\s+\d+[-–—]?\d*[^\n]*\n/, '').trim();
      
      // The full summary text (replace all blank numbers with underscores)
      let summaryWithBlanks = afterHeader;
      for (let qNum = startNum; qNum <= endNum; qNum++) {
        // Replace "14……………" or just "14" followed by dots with "(14) _______"
        summaryWithBlanks = summaryWithBlanks.replace(
          new RegExp(`\\b${qNum}[….…]+`, 'g'), 
          `(${qNum}) _______`
        );
      }
      
      // Create ONE question per blank, but all share the same summary context
      for (let qNum = startNum; qNum <= endNum; qNum++) {
        questions.push({
          question_number: qNum,
          question_text: `Blank ${qNum}`, // Simple label
          question_type: questionType,
          options: null,
          correct_answer: ''
        });
      }
      
      // Store the full summary in the section instructions so it displays once
      if (summaryWithBlanks) {
        // Update instructions to include the summary
        const fullInstructions = afterHeader.split('\n').slice(0, 3).join(' ').trim(); // First few lines as instructions
      }
    }
    
    // For Summary Completion, extract the full summary paragraph
    let summaryText = '';
    if (questionType === 'Summary Completion' || questionType === 'Short Answer') {
      // Get everything after "answer sheet" or after the header
      const afterInstructions = sectionText.replace(/[\s\S]*?answer sheet\.?\s*/i, '').trim();
      if (afterInstructions) {
        summaryText = afterInstructions;
        // Replace blank markers with cleaner format
        for (let qn = startNum; qn <= endNum; qn++) {
          summaryText = summaryText.replace(
            new RegExp(`\\b${qn}[….…]+`, 'g'),
            `_____(${qn})_____`
          );
        }
      }
    }
    
    // Create section - even for single questions
    if (questions.length > 0 || startNum === endNum) {
      // If no questions extracted but it's a range, create placeholder questions
      if (questions.length === 0) {
        for (let qn = startNum; qn <= endNum; qn++) {
          questions.push({
            question_number: qn,
            question_text: `Question ${qn}`,
            question_type: questionType,
            options: questionType === 'True False Not Given' ? ['TRUE', 'FALSE', 'NOT GIVEN'] :
                    questionType === 'Yes No Not Given' ? ['YES', 'NO', 'NOT GIVEN'] : null,
            correct_answer: ''
          });
        }
      }
      
      // Build full instructions including summary text for Summary Completion
      let fullInstructions = instructions;
      if (summaryText && (questionType === 'Summary Completion' || questionType === 'Short Answer')) {
        fullInstructions = summaryText;
      }
      
      sections.push({
        sectionTitle: startNum === endNum ? `Question ${startNum}` : `Questions ${startNum}-${endNum}`,
        questionType: questionType,
        instructions: fullInstructions,
        questionRange: startNum === endNum ? `${startNum}` : `${startNum}-${endNum}`,
        options: options.length > 0 ? options : null,
        questions: questions
      });
    }
  }
  
  return sections;
};

interface QuestionSection {
  sectionTitle: string;
  questionType: string;
  instructions: string;
  questionRange: string;
  options: string[] | null;
  questions: any[];
}

interface PassageData {
  passageNumber: number;
  title: string;
  passageText: string;
  questions: any[];
  sections: QuestionSection[];  // NEW: Multiple question sections per passage
  structureItems: any[];
  extractionMetadata: any;
  questionRange: string;
  imageFile: File | null;
  imageUrl: string | null;
}

const AdminIELTSReadingTest = () => {
  const navigate = useNavigate();
  const { testId } = useParams<{ testId: string }>();
  const { admin, loading } = useAdminAuth();
  
  const [testName, setTestName] = useState("");
  const [saving, setSaving] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [generatingExplanations, setGeneratingExplanations] = useState(false);
  
  const [activePassage, setActivePassage] = useState<number>(1);
  const [inputMode, setInputMode] = useState<'paste' | 'image'>('paste');
  
  // Copy-paste question input state
  const [pastedQuestionsText, setPastedQuestionsText] = useState("");
  const [detectedSections, setDetectedSections] = useState<QuestionSection[]>([]);
  
  // Three passages for IELTS Reading
  const [passagesData, setPassagesData] = useState<{ [key: number]: PassageData }>({
    1: { passageNumber: 1, title: "Passage 1", passageText: "", questions: [], sections: [], structureItems: [], extractionMetadata: null, questionRange: '1-13', imageFile: null, imageUrl: null },
    2: { passageNumber: 2, title: "Passage 2", passageText: "", questions: [], sections: [], structureItems: [], extractionMetadata: null, questionRange: '14-26', imageFile: null, imageUrl: null },
    3: { passageNumber: 3, title: "Passage 3", passageText: "", questions: [], sections: [], structureItems: [], extractionMetadata: null, questionRange: '27-40', imageFile: null, imageUrl: null },
  });
  
  // Auto-detect sections when text changes
  useEffect(() => {
    if (pastedQuestionsText.trim()) {
      const sections = parseAllSections(pastedQuestionsText);
      setDetectedSections(sections);
    } else {
      setDetectedSections([]);
    }
  }, [pastedQuestionsText]);
  
  // Helper to get correct passage for a question number
  const getPassageForQuestion = (qNum: number): number => {
    if (qNum >= 1 && qNum <= 13) return 1;
    if (qNum >= 14 && qNum <= 26) return 2;
    if (qNum >= 27 && qNum <= 40) return 3;
    return 1; // default
  };
  
  // Apply detected sections to CORRECT passages based on question numbers
  const applyDetectedSections = () => {
    if (detectedSections.length === 0) {
      toast.error('No sections detected. Make sure your text contains "Questions X-Y" headers.');
      return;
    }
    
    // Group sections by their correct passage based on question numbers
    const sectionsByPassage: { [key: number]: QuestionSection[] } = { 1: [], 2: [], 3: [] };
    
    detectedSections.forEach(section => {
      // Get the first question number to determine passage
      const firstQNum = section.questions[0]?.question_number || parseInt(section.questionRange.split('-')[0]);
      const targetPassage = getPassageForQuestion(firstQNum);
      sectionsByPassage[targetPassage].push(section);
    });
    
    // Update each passage that has sections - REPLACE not add
    let totalAdded = 0;
    const passagesUpdated: string[] = [];
    
    [1, 2, 3].forEach(passageNum => {
      const sectionsForPassage = sectionsByPassage[passageNum];
      if (sectionsForPassage.length > 0) {
        const questionsForPassage = sectionsForPassage.flatMap(s => s.questions);
        
        // REPLACE existing sections for this passage (not merge)
        updatePassageData(passageNum, {
          sections: sectionsForPassage,
          questions: questionsForPassage
        });
        
        totalAdded += questionsForPassage.length;
        passagesUpdated.push(`P${passageNum}: ${questionsForPassage.length}q`);
      }
    });
    
    const summary = detectedSections.map(s => `${s.questionRange}: ${s.questionType}`).join(', ');
    console.log(`✅ Applied ${detectedSections.length} sections with ${totalAdded} questions`);
    toast.success(`Added ${totalAdded} questions!`, {
      description: passagesUpdated.join(' | ')
    });
    
    // Clear input
    setPastedQuestionsText('');
    setDetectedSections([]);
  };

  useEffect(() => {
    if (!loading && !admin) {
      navigate('/admin/login');
    }
  }, [admin, loading, navigate]);

  useEffect(() => {
    if (testId) {
      loadExistingData();
    }
  }, [testId]);

  const loadExistingData = async () => {
    if (!testId) {
      setPageLoading(false);
      return;
    }

    try {
      console.log('📖 Loading reading test data for testId:', testId);
      setPageLoading(true);
      
      // Fetch test details
      const { data: testRecord, error: testError } = await supabase
        .from('tests')
        .select('*')
        .eq('id', testId)
        .maybeSingle();

      if (testError) {
        console.error('Error fetching test:', testError);
        throw testError;
      }

      if (!testRecord) {
        console.error('❌ Test not found:', testId);
        toast.error('Test not found');
        setPageLoading(false);
        return;
      }

      console.log('✅ Test loaded:', testRecord.test_name);
      setTestName(testRecord.test_name);

      // Fetch questions for this test
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('test_id', testId)
        .order('part_number', { ascending: true })
        .order('question_number_in_part', { ascending: true });

      if (questionsError) {
        console.error('Error fetching questions:', questionsError);
      }

      console.log('📊 Found', questions?.length || 0, 'questions for this test');

      if (questions && questions.length > 0) {
        // Group questions by passage (part_number)
        const newPassagesData = { ...passagesData };
        
        questions.forEach((q: any) => {
          const passageNum = q.part_number || 1;
          if (newPassagesData[passageNum]) {
            if (!newPassagesData[passageNum].passageText && q.passage_text) {
              newPassagesData[passageNum].passageText = q.passage_text;
            }
            newPassagesData[passageNum].questions.push({
              question_number: q.question_number_in_part || q.id,
              question_text: q.question_text,
              question_type: q.question_type || 'Short Answer',
              options: q.choices ? q.choices.split(';') : null,
              correct_answer: q.correct_answer,
              explanation: q.explanation
            });
          }
        });

        setPassagesData(newPassagesData);
      }

      setPageLoading(false);
    } catch (error) {
      console.error('❌ Error loading test data:', error);
      toast.error('Failed to load test data');
      setPageLoading(false);
    }
  };

  // Update passage-specific data
  const updatePassageData = (passageNumber: number, updates: Partial<PassageData>) => {
    setPassagesData(prev => ({
      ...prev,
      [passageNumber]: { ...prev[passageNumber], ...updates }
    }));
  };

  // Get all questions from all passages combined
  const getAllQuestions = () => {
    const allQuestions: any[] = [];
    [1, 2, 3].forEach(passageNum => {
      const passageData = passagesData[passageNum];
      if (passageData.questions.length > 0) {
        passageData.questions.forEach((q, idx) => {
          allQuestions.push({
            ...q,
            passageNumber: passageNum,
            globalQuestionNumber: getGlobalQuestionNumber(passageNum, idx)
          });
        });
      }
    });
    return allQuestions;
  };

  // Helper to get global question number
  const getGlobalQuestionNumber = (passageNum: number, localIndex: number): number => {
    if (passageNum === 1) return localIndex + 1;
    if (passageNum === 2) return 13 + localIndex + 1;
    return 26 + localIndex + 1;
  };

  const generateExplanations = async () => {
    const allQuestions = getAllQuestions();
    if (allQuestions.length === 0) {
      toast.error('Please add questions first');
      return;
    }

    setGeneratingExplanations(true);
    try {
      console.log('🤖 Generating AI explanations with Gemini...');

      // Gather all passage texts
      const passageTexts = [1, 2, 3].map(num => ({
        passageNumber: num,
        text: passagesData[num].passageText
      })).filter(p => p.text);

      const { data, error } = await supabase.functions.invoke('generate-reading-explanations', {
        body: {
          questions: allQuestions,
          passages: passageTexts
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to generate explanations');

      // Merge explanations into questions
      const newPassagesData = { ...passagesData };
      
      data.explanations.forEach((exp: any) => {
        const passageNum = exp.passageNumber || 1;
        const qIndex = newPassagesData[passageNum].questions.findIndex(
          (q: any) => q.question_number === exp.questionNumber
        );
        if (qIndex !== -1) {
          newPassagesData[passageNum].questions[qIndex].explanation = exp.explanation;
        }
      });

      setPassagesData(newPassagesData);
      toast.success(`Generated explanations for ${data.explanations.length} questions!`);
    } catch (error: any) {
      console.error('Error generating explanations:', error);
      toast.error(`Failed to generate explanations: ${error.message}`);
    } finally {
      setGeneratingExplanations(false);
    }
  };

  const saveTest = async () => {
    if (!testId) {
      toast.error('Test ID is required');
      return;
    }

    const allQuestions = getAllQuestions();
    
    // Check if we have any content
    const hasContent = allQuestions.length > 0 || 
      [1, 2, 3].some(num => passagesData[num].passageText.trim());
    
    if (!hasContent) {
      toast.error('Please add at least one passage or questions');
      return;
    }

    setSaving(true);
    try {
      console.log('💾 Saving reading test...');

      const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI';
      const supabaseUrl = 'https://cuumxmfzhwljylbdlflj.supabase.co';
      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/save-reading-test`;

      // Prepare questions with passage data including section info
      // STRICT: Only save questions that belong to each passage's range
      const questionsToSave: any[] = [];
      
      const passageRanges: { [key: number]: [number, number] } = {
        1: [1, 13],
        2: [14, 26],
        3: [27, 40]
      };
      
      [1, 2, 3].forEach(passageNum => {
        const passage = passagesData[passageNum];
        const [minQ, maxQ] = passageRanges[passageNum];
        
        // If we have sections, use section data for better structure
        if (passage.sections && passage.sections.length > 0) {
          passage.sections.forEach(section => {
            section.questions.forEach((q, idx) => {
              const qNum = q.question_number || (idx + 1);
              
              // STRICT: Only include questions within this passage's range
              if (qNum >= minQ && qNum <= maxQ) {
                questionsToSave.push({
                  ...q,
                  part_number: passageNum,
                  passage_text: passage.passageText,
                  question_number_in_part: qNum,
                  question_type: section.questionType || q.question_type || 'Short Answer',
                  // Include section options for matching types
                  choices: section.options || q.options || null,
                  structure_data: {
                    sectionTitle: section.sectionTitle,
                    sectionRange: section.questionRange,
                    instructions: section.instructions,
                    options: section.options
                  }
                });
              }
            });
          });
        } else {
          // Fallback to flat questions
          passage.questions.forEach((q, idx) => {
            const qNum = q.question_number || (idx + 1);
            
            // STRICT: Only include questions within this passage's range
            if (qNum >= minQ && qNum <= maxQ) {
              questionsToSave.push({
                ...q,
                part_number: passageNum,
                passage_text: passage.passageText,
                question_number_in_part: qNum,
                question_type: q.question_type || 'Short Answer',
                choices: q.options || null
              });
            }
          });
        }
      });
      
      console.log(`📊 Saving ${questionsToSave.length} questions (strict range validation applied)`);

      const dataToSave = {
        testId,
        testData: {
          title: testName || `IELTS Reading Test`,
          passages: [1, 2, 3].map(num => ({
            passageNumber: num,
            title: passagesData[num].title,
            passageText: passagesData[num].passageText,
            questionRange: passagesData[num].questionRange,
            structureItems: passagesData[num].structureItems,
            extractionMetadata: passagesData[num].extractionMetadata,
            // Include sections data for reconstruction
            sections: passagesData[num].sections || []
          }))
        },
        questions: questionsToSave
      };

      console.log('📦 Data being sent:', JSON.stringify(dataToSave, null, 2));

      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        },
        body: JSON.stringify(dataToSave)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save test');
      }

      console.log('✅ Test saved successfully!');
      toast.success('Reading test saved successfully!');

    } catch (error: any) {
      console.error('Error saving test:', error);
      toast.error(`Failed to save test: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading || pageLoading) {
    return (
      <AdminLayout title="Loading Reading Test..." showBackButton backPath="/admin/ielts/reading">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Loading reading test data...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!admin) return null;

  return (
    <AdminLayout
      title={`IELTS Reading Test - ${testName || testId}`}
      showBackButton={true}
      backPath="/admin/ielts/reading"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              IELTS Reading Test Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Create a complete reading test with 3 passages and 40 questions total
            </p>
          </div>
          <Badge variant="secondary" className="text-sm">
            Test ID: {testId?.substring(0, 8)}...
          </Badge>
        </div>

        {/* Main Test Card */}
        <Card className="border border-border bg-card shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Reading Test - All Passages (1-3)
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                Preview updates instantly ↓
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Test Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Test Name *</label>
              <p className="text-xs text-muted-foreground mb-2">
                Give this test a descriptive name (e.g., "IELTS Reading Test 1 - Cambridge 18")
              </p>
              <Input
                placeholder="IELTS Reading Test 1"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                className="max-w-md"
              />
            </div>

            {/* Passage Tabs */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Passages & Questions</label>
                  <p className="text-xs text-muted-foreground">
                    Upload passages and use AI to extract questions from images
                  </p>
                </div>
              </div>

              {/* Passage Navigation Tabs */}
              <div className="flex gap-2 border-b pb-2">
                {[1, 2, 3].map(passageNum => {
                  const passageData = passagesData[passageNum];
                  const hasQuestions = passageData.questions.length > 0;
                  const hasPassage = passageData.passageText.trim().length > 0;
                  
                  return (
                    <Button
                      key={passageNum}
                      variant={activePassage === passageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActivePassage(passageNum)}
                      className={`relative ${activePassage === passageNum ? 'ring-2 ring-primary' : ''}`}
                    >
                      Passage {passageNum}
                      {hasQuestions && (
                        <CheckCircle className="w-3 h-3 ml-1 text-green-500" />
                      )}
                      {hasPassage && !hasQuestions && (
                        <Circle className="w-3 h-3 ml-1 text-orange-500" />
                      )}
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({passageData.questionRange})
                      </span>
                    </Button>
                  );
                })}
              </div>

              {/* Active Passage Content */}
              <div className="border rounded-lg p-4 bg-muted/20">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-semibold text-lg">Passage {activePassage}</h4>
                    <p className="text-sm text-muted-foreground">
                      Questions {passagesData[activePassage].questionRange} • {passagesData[activePassage].questions.length} questions extracted
                    </p>
                  </div>
                  {passagesData[activePassage].questions.length > 0 && (
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {passagesData[activePassage].questions.length} Questions
                    </Badge>
                  )}
                </div>

                {/* Passage Title */}
                <div className="space-y-2 mb-4">
                  <label className="text-sm font-medium">Passage Title</label>
                  <Input
                    placeholder={`Passage ${activePassage} Title (e.g., "The History of Coffee")`}
                    value={passagesData[activePassage].title}
                    onChange={(e) => updatePassageData(activePassage, { title: e.target.value })}
                    className="max-w-lg"
                  />
                </div>

                {/* Passage Text */}
                <div className="space-y-2 mb-6">
                  <label className="text-sm font-medium">
                    <FileText className="w-4 h-4 inline mr-1" />
                    Passage Text *
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Paste the full reading passage text here. This will be shown to students during the test.
                  </p>
                  <Textarea
                    placeholder="Paste the complete reading passage text here..."
                    value={passagesData[activePassage].passageText}
                    onChange={(e) => updatePassageData(activePassage, { passageText: e.target.value })}
                    rows={12}
                    className="font-serif text-sm leading-relaxed"
                  />
                  {passagesData[activePassage].passageText && (
                    <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200">
                      <p className="text-xs text-green-800 dark:text-green-200 flex items-center gap-2">
                        <CheckCircle className="w-3 h-3" />
                        {passagesData[activePassage].passageText.split(' ').length} words
                      </p>
                      <Button
                        onClick={saveTest}
                        disabled={saving}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {saving ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                        ) : (
                          <>
                            <Save className="w-3 h-3 mr-1" />
                            Save Passage
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Question Input Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-500" />
                      <label className="text-sm font-medium">Add Questions</label>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {IELTS_READING_QUESTION_TYPES.length} question types supported
                    </Badge>
                  </div>
                  
                  <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as 'paste' | 'image')}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="paste" className="gap-2">
                        <ClipboardPaste className="w-4 h-4" />
                        Copy & Paste
                      </TabsTrigger>
                      <TabsTrigger value="image" className="gap-2">
                        <Image className="w-4 h-4" />
                        Image Upload
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="paste" className="mt-4 space-y-4">
                      <Card className="border-2 border-green-200 dark:border-green-800">
                        <CardHeader className="pb-3 bg-green-50 dark:bg-green-900/20">
                          <CardTitle className="text-base flex items-center gap-2">
                            <ClipboardPaste className="w-4 h-4 text-green-600" />
                            Paste All Questions (Auto-Detect)
                          </CardTitle>
                          <p className="text-xs text-muted-foreground">
                            Just paste everything! System auto-detects question types, ranges, and options.
                          </p>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4">
                          {/* Questions Paste Area */}
                          <div>
                            <label className="text-sm font-medium mb-1 block">Paste Questions (including headers)</label>
                            <Textarea
                              placeholder={`Paste entire question section here, for example:

Questions 1-8
Use the information in the passage to match the people (listed A-G)...

       A  Tony Brown            E  Art Pimms
       B  Patrick Leahy          F  Steve Black
       ...

1   There is a double-advantage to the new techniques.
2   The work on developing these alternative techniques is not finished.
...

Questions 9-13
Do the following statements agree with the information given?
YES if the statement is true
NO if the statement is false
NOT GIVEN if the information is not given

9   Integrated Pest Management has been regarded as a success.
10  Oregon farmers have been promoted as successful examples.
...`}
                              value={pastedQuestionsText}
                              onChange={(e) => setPastedQuestionsText(e.target.value)}
                              rows={14}
                              className="font-mono text-sm"
                            />
                          </div>
                          
                          {/* Auto-detected sections preview */}
                          {detectedSections.length > 0 && (
                            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border-2 border-green-300">
                              <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-2 flex items-center gap-2">
                                <CheckCircle className="w-4 h-4" />
                                Auto-Detected {detectedSections.length} Section{detectedSections.length > 1 ? 's' : ''}:
                              </p>
                              <div className="space-y-2">
                                {detectedSections.map((section, idx) => {
                                  // Determine which passage this section belongs to
                                  const firstQNum = section.questions[0]?.question_number || parseInt(section.questionRange.split('-')[0]);
                                  const targetPassage = getPassageForQuestion(firstQNum);
                                  
                                  return (
                                    <div key={idx} className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded border">
                                      <Badge className={
                                        targetPassage === 1 ? "bg-blue-600" :
                                        targetPassage === 2 ? "bg-purple-600" :
                                        "bg-orange-600"
                                      }>
                                        P{targetPassage}
                                      </Badge>
                                      <Badge variant="outline">{section.questionRange}</Badge>
                                      <Badge variant="secondary">{section.questionType}</Badge>
                                      <span className="text-xs text-muted-foreground">
                                        ({section.questions.length} questions)
                                      </span>
                                      {section.options && section.options.length > 0 && (
                                        <span className="text-xs text-amber-600">
                                          +{section.options.length} options
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                              <p className="text-xs text-muted-foreground mt-2">
                                📍 Questions auto-assigned: 1-13 → P1, 14-26 → P2, 27-40 → P3
                              </p>
                            </div>
                          )}
                          
                          {pastedQuestionsText && detectedSections.length === 0 && (
                            <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200">
                              <p className="text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
                                <AlertCircle className="w-3 h-3" />
                                No sections detected. Make sure text includes "Questions X-Y" headers.
                              </p>
                            </div>
                          )}
                          
                          <Button
                            onClick={applyDetectedSections}
                            disabled={detectedSections.length === 0}
                            className="w-full bg-green-600 hover:bg-green-700"
                            size="lg"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add {detectedSections.length} Section{detectedSections.length !== 1 ? 's' : ''} to Passage {activePassage}
                          </Button>
                          
                          {/* Quick tips */}
                          <div className="border-t pt-3 mt-3">
                            <p className="text-xs font-medium text-muted-foreground mb-2">✨ Auto-Detection Works For:</p>
                            <div className="flex flex-wrap gap-1">
                              <Badge variant="outline" className="text-xs">True/False/Not Given</Badge>
                              <Badge variant="outline" className="text-xs">Yes/No/Not Given</Badge>
                              <Badge variant="outline" className="text-xs">Matching Features</Badge>
                              <Badge variant="outline" className="text-xs">Matching Headings</Badge>
                              <Badge variant="outline" className="text-xs">Multiple Choice</Badge>
                              <Badge variant="outline" className="text-xs">Summary Completion</Badge>
                              <Badge variant="outline" className="text-xs">+8 more</Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                    
                    <TabsContent value="image" className="mt-4">
                      <ImageQuestionExtractor
                        testId={testId || ''}
                        testType="IELTS-Reading"
                        initialImageFile={passagesData[activePassage].imageFile}
                        onImageSelected={(file) => updatePassageData(activePassage, { imageFile: file })}
                        onQuestionsExtracted={(extractedQuestions, metadata) => {
                          console.log(`✨ Passage ${activePassage}: AI extracted ${extractedQuestions.length} questions`);
                          
                          updatePassageData(activePassage, {
                            questions: extractedQuestions,
                            structureItems: metadata?.structureItems || [],
                            extractionMetadata: metadata || null
                          });
                          
                          const typeInfo = metadata?.questionType ? ` (${metadata.questionType})` : '';
                          toast.success(`Passage ${activePassage}: ${extractedQuestions.length} questions extracted!${typeInfo}`);
                        }}
                      />
                    </TabsContent>
                  </Tabs>
                </div>

                {/* Manual Question Entry hint */}
                {passagesData[activePassage].questions.length === 0 && (
                  <div className="mt-4 p-4 border-2 border-dashed border-muted-foreground/25 rounded-lg bg-muted/10">
                    <p className="text-center text-muted-foreground text-sm">
                      📋 Use <strong>Copy & Paste</strong> to paste question text, or <strong>Image Upload</strong> to extract from screenshots
                    </p>
                  </div>
                )}

                {/* Questions Review - Grouped by Sections */}
                {(passagesData[activePassage].questions.length > 0 || passagesData[activePassage].sections.length > 0) && (
                  <div className="mt-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="font-medium">Extracted Questions ({passagesData[activePassage].questions.length})</h5>
                        {passagesData[activePassage].sections.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {passagesData[activePassage].sections.length} question section(s) detected
                          </p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updatePassageData(activePassage, { questions: [], sections: [] })}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Clear All
                      </Button>
                    </div>
                    
                    {/* Show sections if available */}
                    {passagesData[activePassage].sections.length > 0 ? (
                      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                        {passagesData[activePassage].sections.map((section, sIdx) => (
                          <Card key={sIdx} className="border-2 border-purple-200 dark:border-purple-800">
                            <CardHeader className="pb-2 bg-purple-50 dark:bg-purple-900/20">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-sm flex items-center gap-2">
                                  <Badge className="bg-purple-600">{section.questionRange}</Badge>
                                  <span>{section.questionType}</span>
                                </CardTitle>
                                <Badge variant="outline">{section.questions.length} questions</Badge>
                              </div>
                              {section.instructions && (
                                <p className="text-xs text-muted-foreground mt-1 italic">
                                  {section.instructions}
                                </p>
                              )}
                            </CardHeader>
                            <CardContent className="pt-3 space-y-2">
                              {/* Show options for matching/heading types */}
                              {section.options && section.options.length > 0 && (
                                <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 mb-3">
                                  <p className="text-xs font-medium text-amber-800 dark:text-amber-200 mb-1">Options:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {section.options.map((opt, oIdx) => (
                                      <Badge key={oIdx} variant="outline" className="text-xs">
                                        {opt}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {section.questions.map((q, qIdx) => (
                                <div key={qIdx} className="flex items-start gap-2 p-2 rounded bg-muted/30 hover:bg-muted/50">
                                  <Badge variant="outline" className="flex-shrink-0 text-xs">
                                    {q.question_number}
                                  </Badge>
                                  <div className="flex-1 text-sm">
                                    <span>{q.question_text}</span>
                                    {q.correct_answer && (
                                      <span className="ml-2 text-green-600 font-medium text-xs">
                                        → {q.correct_answer}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      // Fallback: Show flat question list
                      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                        {passagesData[activePassage].questions.map((q, i) => (
                          <Card key={i} className="bg-card border shadow-sm">
                            <CardContent className="p-3">
                              <div className="flex items-start gap-3">
                                <Badge variant="outline" className="flex-shrink-0">
                                  Q{q.question_number || i + 1}
                                </Badge>
                                <div className="flex-1 space-y-1">
                                  <p className="text-sm">{q.question_text}</p>
                                  {q.options && q.options.length > 0 && (
                                    <div className="text-xs text-muted-foreground">
                                      Options: {q.options.join(' | ')}
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2 text-xs">
                                    <Badge variant="secondary" className="text-xs">
                                      {q.question_type}
                                    </Badge>
                                    {q.correct_answer && (
                                      <span className="text-green-600 font-medium">
                                        Answer: {q.correct_answer}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                    
                    {/* Save Button - prominent after extracting */}
                    <div className="mt-4 pt-4 border-t">
                      <Button
                        onClick={saveTest}
                        disabled={saving}
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3"
                        size="lg"
                      >
                        {saving ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-5 h-5 mr-2" />
                            Save Passage {activePassage} Questions
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-center text-muted-foreground mt-2">
                        💡 Save after adding questions to each passage
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Summary of all passages */}
              <div className="grid grid-cols-3 gap-2 mt-4">
                {[1, 2, 3].map(passageNum => {
                  const passageData = passagesData[passageNum];
                  const hasPassage = passageData.passageText.trim().length > 0;
                  const status = passageData.questions.length > 0 
                    ? 'complete' 
                    : hasPassage
                      ? 'passage-ready' 
                      : 'empty';
                  
                  return (
                    <div 
                      key={passageNum}
                      className={`p-3 rounded-lg border text-center cursor-pointer transition-all ${
                        status === 'complete' ? 'bg-green-50 border-green-300 dark:bg-green-900/20' :
                        status === 'passage-ready' ? 'bg-orange-50 border-orange-300 dark:bg-orange-900/20' :
                        'bg-gray-50 border-gray-200 dark:bg-gray-800'
                      } ${activePassage === passageNum ? 'ring-2 ring-primary' : ''}`}
                      onClick={() => setActivePassage(passageNum)}
                    >
                      <div className="font-semibold text-sm">Passage {passageNum}</div>
                      <div className="text-xs text-muted-foreground">{passageData.questionRange}</div>
                      <div className={`text-xs mt-1 font-medium ${
                        status === 'complete' ? 'text-green-600' :
                        status === 'passage-ready' ? 'text-orange-600' :
                        'text-gray-400'
                      }`}>
                        {status === 'complete' ? `${passageData.questions.length} Questions` :
                         status === 'passage-ready' ? 'Passage Added' :
                         'Empty'}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Student Preview - ALWAYS shows when there's content */}
              {(passagesData[activePassage].passageText || passagesData[activePassage].questions.length > 0) && (
                <div className="mt-6 border-t pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Eye className="w-5 h-5 text-blue-500" />
                    <h4 className="font-semibold">Student View Preview - Passage {activePassage}</h4>
                    <Badge variant="outline" className="bg-blue-50">Exactly as students will see</Badge>
                  </div>
                  
                  {/* Full-width student exam view */}
                  <div className="border-4 border-blue-200 rounded-xl overflow-hidden shadow-lg">
                    {/* Exam Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-lg">IELTS Academic Reading</h3>
                          <p className="text-blue-100 text-sm">{testName || 'Reading Test'}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">Passage {activePassage}</div>
                          <div className="text-blue-100 text-sm">Questions {passagesData[activePassage].questionRange}</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Split View: Passage | Questions */}
                    <div className="grid grid-cols-2 divide-x divide-gray-200">
                      {/* Left: Passage Text */}
                      <div className="bg-white dark:bg-gray-950 p-6 max-h-[600px] overflow-y-auto">
                        <h4 className="font-bold text-xl mb-4 text-gray-900 dark:text-gray-100 border-b pb-2">
                          {passagesData[activePassage].title || `Reading Passage ${activePassage}`}
                        </h4>
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          {passagesData[activePassage].passageText ? (
                            passagesData[activePassage].passageText.split('\n').filter(p => p.trim()).map((para, i) => (
                              <p key={i} className="mb-4 text-justify leading-relaxed text-gray-800 dark:text-gray-200 indent-8 first:indent-0">
                                {para}
                              </p>
                            ))
                          ) : (
                            <p className="text-muted-foreground italic">No passage text added yet</p>
                          )}
                        </div>
                      </div>
                      
                      {/* Right: Questions grouped by section */}
                      <div className="bg-gray-50 dark:bg-gray-900 p-6 max-h-[600px] overflow-y-auto">
                        <h4 className="font-bold text-lg mb-4 text-gray-900 dark:text-gray-100">
                          Questions {passagesData[activePassage].questionRange}
                        </h4>
                        
                        {passagesData[activePassage].sections.length > 0 ? (
                          <div className="space-y-6">
                            {passagesData[activePassage].sections.map((section, sIdx) => (
                              <div key={sIdx} className="border-l-4 border-blue-500 pl-4">
                                {/* Section Header */}
                                <div className="mb-3">
                                  <h5 className="font-bold text-base text-gray-900 dark:text-gray-100">
                                    Questions {section.questionRange}
                                  </h5>
                                  <Badge className="mt-1">{section.questionType}</Badge>
                                  {section.instructions && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 italic bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
                                      📋 {section.instructions}
                                    </p>
                                  )}
                                </div>
                                
                                {/* Options for matching types */}
                                {section.options && section.options.length > 0 && (
                                  <div className="mb-4 p-3 bg-white dark:bg-gray-800 rounded-lg border">
                                    <p className="text-xs font-semibold text-gray-500 mb-2">LIST OF HEADINGS/OPTIONS:</p>
                                    <div className="space-y-1">
                                      {section.options.map((opt, oIdx) => (
                                        <div key={oIdx} className="text-sm text-gray-700 dark:text-gray-300">
                                          {opt}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Questions - Special handling for Summary Completion */}
                                {section.questionType === 'Summary Completion' || section.questionType === 'Short Answer' ? (
                                  // Summary Completion: Show answer boxes in a row
                                  <div className="space-y-2">
                                    <div className="flex flex-wrap gap-3">
                                      {section.questions.map((q, qIdx) => (
                                        <div key={qIdx} className="flex items-center gap-2">
                                          <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-xs">
                                            {q.question_number}
                                          </span>
                                          <Input 
                                            className="w-32 border-dashed text-sm" 
                                            placeholder="Your answer"
                                            disabled
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  // Other question types: Show full question with answer input
                                  <div className="space-y-3">
                                    {section.questions.map((q, qIdx) => (
                                      <div key={qIdx} className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border hover:border-blue-300 transition-colors">
                                        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-sm">
                                          {q.question_number}
                                        </span>
                                        <div className="flex-1">
                                          <p className="text-sm text-gray-800 dark:text-gray-200">{q.question_text}</p>
                                          
                                          {/* Answer input based on question type */}
                                          {section.questionType === 'True False Not Given' || section.questionType === 'Yes No Not Given' ? (
                                            <div className="flex gap-2 mt-2">
                                              {(section.questionType === 'True False Not Given' ? ['TRUE', 'FALSE', 'NOT GIVEN'] : ['YES', 'NO', 'NOT GIVEN']).map(opt => (
                                                <label key={opt} className="flex items-center gap-1 cursor-pointer">
                                                  <input type="radio" name={`q-${q.question_number}`} className="w-4 h-4" disabled />
                                                  <span className="text-xs">{opt}</span>
                                                </label>
                                              ))}
                                            </div>
                                          ) : section.questionType === 'Multiple Choice' && q.options ? (
                                            <div className="space-y-1 mt-2">
                                              {q.options.map((opt: string, optIdx: number) => (
                                                <label key={optIdx} className="flex items-center gap-2 text-sm cursor-pointer p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                                                  <input type="radio" name={`q-${q.question_number}`} className="w-4 h-4" disabled />
                                                  <span>{opt}</span>
                                                </label>
                                              ))}
                                            </div>
                                          ) : section.questionType === 'Matching Features' || section.questionType === 'Matching Headings' ? (
                                            <Input 
                                              className="mt-2 w-16 border-dashed text-center" 
                                              placeholder="A-G"
                                              disabled
                                            />
                                          ) : (
                                            <Input 
                                              className="mt-2 max-w-xs border-dashed" 
                                              placeholder="Type your answer..."
                                              disabled
                                            />
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : passagesData[activePassage].questions.length > 0 ? (
                          // Fallback for flat questions
                          <div className="space-y-3">
                            {passagesData[activePassage].questions.map((q, i) => (
                              <div key={i} className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border">
                                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-sm">
                                  {q.question_number || i + 1}
                                </span>
                                <div className="flex-1">
                                  <p className="text-sm text-gray-800 dark:text-gray-200">{q.question_text}</p>
                                  <Badge variant="outline" className="mt-1 text-xs">{q.question_type}</Badge>
                                  <Input className="mt-2 max-w-xs border-dashed" placeholder="Answer..." disabled />
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted-foreground italic">No questions added yet</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Footer */}
                    <div className="bg-gray-100 dark:bg-gray-800 p-3 text-center text-xs text-muted-foreground">
                      Preview Mode • This is exactly how students will see the test
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Info Panel */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200">
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                💡 How IELTS Reading works:
              </h4>
              <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside mb-4">
                <li>IELTS Academic Reading has 3 passages with 40 questions total</li>
                <li>Questions 1-13 = Passage 1, 14-26 = Passage 2, 27-40 = Passage 3</li>
                <li><strong>Copy & Paste</strong> questions from Cambridge books or paste text directly</li>
                <li><strong>Image Upload</strong> for screenshots of question papers</li>
              </ul>
              
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                📝 14 IELTS Reading Question Types (All Supported):
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs text-blue-800 dark:text-blue-200">
                <div className="space-y-1">
                  <p>1. Matching Headings</p>
                  <p>2. Matching Paragraph Info</p>
                  <p>3. Matching Features</p>
                  <p>4. Matching Sentence Endings</p>
                  <p>5. True/False/Not Given</p>
                  <p>6. Multiple Choice</p>
                  <p>7. List of Options</p>
                </div>
                <div className="space-y-1">
                  <p>8. Choose a Title</p>
                  <p>9. Short Answers</p>
                  <p>10. Sentence Completion</p>
                  <p>11. Summary Completion</p>
                  <p>12. Table Completion</p>
                  <p>13. Flow Chart Completion</p>
                  <p>14. Diagram Completion</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end pt-4 border-t">
              {getAllQuestions().length > 0 && (
                <Button
                  variant="outline"
                  onClick={generateExplanations}
                  disabled={generatingExplanations}
                  className="border-purple-300 text-purple-700 hover:bg-purple-50"
                  size="lg"
                >
                  {generatingExplanations ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mr-2"></div>
                      Generating Explanations...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate AI Explanations
                    </>
                  )}
                </Button>
              )}

              <Button
                onClick={saveTest}
                disabled={saving}
                className="bg-primary hover:bg-primary/90 px-8"
                size="lg"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving Test...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Complete Reading Test
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminIELTSReadingTest;
