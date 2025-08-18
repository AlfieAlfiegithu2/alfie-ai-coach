import { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Upload, Download, FileText, AlertCircle, HelpCircle } from "lucide-react";
import { getQuestionTypesForModule, mapQuestionType, validateQuestionType, QuestionTypeDefinition } from '@/lib/ielts-question-types';
import { useCSVUpload } from '@/hooks/useCSVUpload';
interface CSVImportProps {
  onImport: (questions: any[]) => void;
  onQuestionsPreview?: (questions: any[]) => void;
  type: 'reading' | 'listening' | 'writing' | 'speaking';
  module?: 'ielts' | 'pte' | 'toefl' | 'general';
  cambridgeBook?: string;
  testNumber?: number;
  sectionNumber?: number;
  partNumber?: number;
  hideDownloadSample?: boolean;
  testId?: string;
  testType?: string;
}
const CSVImport = ({
  onImport,
  onQuestionsPreview,
  type,
  module = 'ielts',
  cambridgeBook,
  testNumber,
  sectionNumber,
  partNumber,
  hideDownloadSample = false,
  testId,
  testType
}: CSVImportProps) => {
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewQuestions, setPreviewQuestions] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const expectedColumns = ['Question Number', 'Section', 'Type', 'Question Text', 'Choices', 'Correct Answer', 'Explanation'];
  
  const { uploading, uploadCSV } = useCSVUpload();

  // Get valid question types for the current module
  const validQuestionTypes = getQuestionTypesForModule(type);
  const downloadTemplate = () => {
    // Generate sample data based on module type
    const getSampleData = () => {
      const samples: Record<string, string[]> = {
        reading: ['1,Reading,True/False/Not Given,"People had expected Andy Murray to become the world\'s top tennis player for at least five years before 2016.","TRUE;FALSE;NOT GIVEN","FALSE","The passage states Murray was regarded as an outsider before 2016."', '2,Reading,Sentence Completion,"Mike and Bob Bryan made changes to the types of ______ used on their racket frames.","","paint","The passage mentions they experimented with different kinds of paint."', '3,Reading,Multiple Choice,"What is the main benefit of racket modifications according to the passage?","A) Increased speed;B) Better control;C) Reduced weight;D) Enhanced power","B","The passage emphasizes control as a key benefit."'],
        listening: ['1,Listening,Multiple Choice,"What is the main topic of the conversation?","A) Travel plans;B) Hotel booking;C) Restaurant reservation;D) Meeting schedule","B","The speakers discuss hotel arrangements."', '2,Listening,Form Completion,"The caller\'s name is ______","","Sarah Johnson","As stated by the caller at the beginning."', '3,Listening,Table Completion,"Complete the table: Day | Activity | Time","Monday;Meeting;9:00 AM","Monday=Meeting;9:00 AM","Based on the schedule discussion."'],
        writing: ['1,Writing,Task 1 - Graph Description,"Describe the trends shown in the graph","","The graph shows a steady increase...","Model answer describing key trends."', '2,Writing,Task 2 - Essay,"Discuss both views and give your opinion","","While some argue that...","Model essay with balanced arguments."'],
        speaking: ['1,Speaking,Part 1 - Introduction and Interview,"What do you do for work or study?","","I work as a software developer...","Sample response with details."', '2,Speaking,Part 2 - Long Turn (Cue Card),"Describe a memorable journey","","I\'d like to talk about a trip...","Sample 2-minute response."']
      };
      return samples[type] || samples.reading;
    };
    const csvContent = [expectedColumns.join(','), ...getSampleData()].join('\n');
    const blob = new Blob([csvContent], {
      type: 'text/csv'
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}_questions_sample.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      if (char === '"' && !inQuotes) {
        inQuotes = true;
      } else if (char === '"' && inQuotes && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else if (char === '"' && inQuotes) {
        inQuotes = false;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };
  const parseCSV = (csvText: string) => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV file must contain at least a header row and one data row');
    }
    const headers = parseCSVLine(lines[0]).map(h => h.trim());
    const expectedHeaders = expectedColumns;

    // Check if all expected headers are present (exact match)
    const missingHeaders = expectedHeaders.filter(header => !headers.includes(header));
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required columns: ${missingHeaders.join(', ')}. Expected exact format: ${expectedColumns.join(', ')}`);
    }
    const questions = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length < headers.length) continue;

      // Fix question numbering to always start from 1 and increment sequentially
      const questionNumber = i; // i starts from 1 in the loop (since we skip header at index 0)
      const section = values[1]?.trim() || 'Reading';
      const questionType = values[2]?.trim() || '';
      const questionText = values[3]?.trim() || '';
      const choices = values[4]?.trim() || '';
      const correctAnswer = values[5]?.trim() || '';
      const explanation = values[6]?.trim() || '';

      // Map and validate question type
      const mappedType = mapQuestionType(questionType);
      const isValid = validateQuestionType(mappedType, type);
      if (!isValid) {
        const validTypes = validQuestionTypes.map(t => t.value);
        throw new Error(`Invalid question type "${questionType}" in row ${i + 1}. Mapped to "${mappedType}". Supported types: ${validTypes.join(', ')}`);
      }
      const finalQuestionType = mappedType;

      // Parse choices based on question type
      let options: string[] = [];
      let parsedChoices: any = null;
      if (choices) {
        if (finalQuestionType === 'Multiple Choice') {
          options = choices.split(';').map(choice => choice.trim()).filter(choice => choice);
        } else if (finalQuestionType === 'True/False/Not Given') {
          options = ['TRUE', 'FALSE', 'NOT GIVEN'];
        } else if (finalQuestionType === 'Yes/No/Not Given') {
          options = ['YES', 'NO', 'NOT GIVEN'];
        } else if (finalQuestionType.includes('Matching')) {
          // For matching types, parse as key=value pairs
          const pairs = choices.split(';').map(pair => pair.trim()).filter(pair => pair);
          if (pairs.some(pair => pair.includes('='))) {
            parsedChoices = {};
            pairs.forEach(pair => {
              const [key, value] = pair.split('=').map(part => part.trim());
              if (key && value) {
                parsedChoices[key] = value;
              }
            });
          } else {
            options = pairs;
          }
        } else {
          options = choices.split(';').map(choice => choice.trim()).filter(choice => choice);
        }
      }

      // Keep question type in official IELTS format for database (no conversion to snake_case)
      questions.push({
        question_number: questionNumber,
        question_type: finalQuestionType,
        // Use the official format directly
        question_text: questionText,
        options: options.length > 0 ? options : undefined,
        choices: parsedChoices || undefined,
        correct_answer: correctAnswer,
        explanation: explanation,
        cambridge_book: cambridgeBook,
        section_number: sectionNumber,
        part_number: partNumber || 1
      });
    }
    return questions;
  };
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setError(null);
    setShowPreview(false);
    try {
      const text = await file.text();
      const questions = parseCSV(text);
      if (questions.length === 0) {
        throw new Error('No valid questions found in CSV file');
      }
      setPreviewQuestions(questions);
      setShowPreview(true);
    } catch (err: any) {
      setError(err.message || 'Failed to parse CSV file');
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  const handleConfirmImport = async () => {
    if (!testId || !testType) {
      // Fallback to the old behavior if testId and testType are not provided
      console.log('Confirming import of questions:', previewQuestions);
      onImport(previewQuestions);
      setShowPreview(false);
      setPreviewQuestions([]);
      return;
    }

    try {
      setImporting(true);
      setError(null); // Clear any previous errors
      
      console.log('Confirm Import clicked - uploading questions to database...');
      await uploadCSV(previewQuestions, testId, testType, partNumber || 1, module);
      
      console.log('Database upload completed successfully');
      
      // Call the parent component's onImport handler for additional processing
      onImport(previewQuestions);
      
      // Close the preview and clear state
      setShowPreview(false);
      setPreviewQuestions([]);
      
      console.log('Import workflow completed - preview closed');
    } catch (error: any) {
      console.error('Upload failed:', error);
      
      // Extract specific error message from backend response
      let errorMessage = 'Failed to upload questions. Please try again.';
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      // If it's a backend error with details, show specific message
      if (error?.response?.data?.error) {
        errorMessage = `Upload Failed: ${error.response.data.error}`;
        if (error.response.data.details) {
          errorMessage += ` Details: ${error.response.data.details}`;
        }
      }
      
      setError(errorMessage);
    } finally {
      setImporting(false);
    }
  };
  const handleCancelImport = () => {
    setShowPreview(false);
    setPreviewQuestions([]);
  };
  return <Card className="rounded-2xl border-light-border shadow-soft" style={{
    background: 'var(--gradient-card)'
  }}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <FileText className="w-5 h-5" />
          Bulk CSV Import - {type.charAt(0).toUpperCase() + type.slice(1)} Question Types
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-warm-gray">
          Import multiple questions at once using a CSV file with comprehensive IELTS Reading question type support. Download the sample file to see the exact format and examples for all question types.
        </div>

        <div className="text-xs text-warm-gray bg-blue-50 p-3 rounded-xl border border-blue-200">
          <strong>Instructions:</strong> Your CSV must match this exact format and support all IELTS Reading types listed below. Use semicolons (;) to separate choices or matches. Download the sample for reference and examples. Enclose text with commas in quotes if needed.
          <br /><br />
          <strong>Required Format:</strong> {expectedColumns.join(', ')}
          <br /><br />
          <strong>Supported Question Types:</strong>
          <TooltipProvider>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1 mt-2">
              {validQuestionTypes.map(questionType => (
                <div key={questionType.value} className="text-xs">
                  {questionType.label}
                </div>
              ))}
            </div>
          </TooltipProvider>
          <br /><br />
          <strong>Choice Formats:</strong>
          <br />• Multiple Choice: "A) Option1;B) Option2;C) Option3"
          <br />• Matching: "Item1=MatchA;Item2=MatchB" or "Option1;Option2;Option3"
          <br />• True/False/Not Given: Leave choices blank (auto-generated)
          <br />• Fill/Completion: Leave choices blank for open text answers
        </div>

        {error && <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>}

        <div className="bg-muted/30 border border-dashed rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <HelpCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-sm mb-2">Need CSV Format Reference?</h4>
              <p className="text-xs text-muted-foreground mb-3">
                Download a sample CSV with the correct format and column headers for {type} questions.
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={downloadTemplate}
                className="text-xs"
              >
                <Download className="w-3 h-3 mr-1" />
                Download Sample CSV
              </Button>
            </div>
          </div>
        </div>

        {!showPreview ? <div className="flex flex-col sm:flex-row gap-3">
            <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
            
            <Button 
              onClick={() => fileInputRef.current?.click()} 
              disabled={importing} 
              className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-medium w-full"
            >
              <Upload className="w-4 h-4 mr-2" />
              {importing ? 'Parsing CSV...' : 'Upload CSV File'}
            </Button>
          </div> : <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <h4 className="font-medium text-green-800 mb-2">Preview: {previewQuestions.length} questions parsed successfully</h4>
              <div className="text-sm text-green-700">
                Review the questions below and confirm to import them into your test.
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto border border-light-border rounded-xl p-4 bg-white">
              {previewQuestions.map((question, index) => <div key={index} className="border-b border-light-border pb-3 mb-3 last:border-b-0 last:mb-0">
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-sm text-foreground min-w-8">
                      {question.question_number}.
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {question.question_type}
                        </span>
                        <span className="text-xs text-warm-gray">
                          Answer: {question.correct_answer}
                        </span>
                      </div>
                      <p className="text-sm text-foreground">
                        {question.question_text}
                      </p>
                      {question.options && question.options.length > 0 && <div className="text-xs text-warm-gray mt-1">
                          Options: {question.options.join(' | ')}
                        </div>}
                      {question.choices && <div className="text-xs text-warm-gray mt-1">
                          Matches: {Object.entries(question.choices).map(([k, v]) => `${k}=${v}`).join(' | ')}
                        </div>}
                    </div>
                  </div>
                </div>)}
            </div>

            <div className="flex gap-3">
            <Button 
              onClick={handleConfirmImport} 
              disabled={importing || uploading}
              className="rounded-xl flex-1 bg-primary hover:bg-primary/90 text-white font-medium"
            >
              {importing || uploading ? 'Uploading...' : 'Confirm Import'}
            </Button>
              <Button variant="outline" onClick={handleCancelImport} className="rounded-xl flex-1 border-light-border">
                Cancel
              </Button>
            </div>
          </div>}
      </CardContent>
    </Card>;
};
export default CSVImport;