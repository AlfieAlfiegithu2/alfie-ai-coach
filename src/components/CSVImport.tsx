import { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Download, FileText, AlertCircle } from "lucide-react";

interface CSVImportProps {
  onImport: (questions: any[]) => void;
  type: 'reading' | 'listening';
}

const CSVImport = ({ onImport, type }: CSVImportProps) => {
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewQuestions, setPreviewQuestions] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const expectedColumns = [
    'Question Number',
    'Section',
    'Type',
    'Question Text',
    'Choices',
    'Correct Answer',
    'Explanation'
  ];

  const validQuestionTypes = [
    'Multiple Choice',
    'True/False/Not Given',
    'Yes/No/Not Given',
    'Matching Information',
    'Matching Headings',
    'Matching Features',
    'Matching Sentence Endings',
    'Sentence Completion',
    'Summary Completion',
    'Diagram Label Completion',
    'Short-answer Questions',
    'Fill In The Blank'
  ];

  const downloadTemplate = () => {
    const csvContent = [
      expectedColumns.join(','),
      '1,Reading,True/False/Not Given,"People had expected Andy Murray to become the world\'s top tennis player for at least five years before 2016.","TRUE;FALSE;NOT GIVEN","FALSE","The passage states Murray was regarded as an outsider before 2016."',
      '2,Reading,Fill In The Blank,"Mike and Bob Bryan made changes to the types of ______ used on their racket frames.","","paint","The passage mentions they experimented with different kinds of paint."',
      '3,Reading,Multiple Choice,"What is the main benefit of racket modifications according to the passage?","A) Increased speed;B) Better control;C) Reduced weight;D) Enhanced power","B","The passage emphasizes control as a key benefit."',
      '4,Reading,Yes/No/Not Given,"The writer believes racket technology has revolutionized tennis.","YES;NO;NOT GIVEN","YES","The passage supports this view through examples."',
      '5,Reading,Matching Headings,"Match the following paragraphs to headings: Paragraph A; Paragraph B","i) History of Rackets;ii) Modern Modifications;iii) Banned Innovations","Paragraph A=ii;Paragraph B=iii","Based on content matching."',
      '6,Reading,Matching Information,"Which paragraph mentions the impact of weather?","A;B;C;D","C","Paragraph C discusses climatic conditions."',
      '7,Reading,Matching Features,"Match players to their modifications: Andy Murray; Pete Sampras","String changes;Lead weights","Andy Murray=String changes;Pete Sampras=Lead weights","From player-specific details."',
      '8,Reading,Matching Sentence Endings,"Complete the sentence: The spaghetti-strung racket was banned because...","it created too much topspin;it was too heavy;it broke easily","it created too much topspin","Directly stated in the passage."',
      '9,Reading,Sentence Completion,"Professional players often adjust their rackets based on ______ conditions.","","climatic","The passage mentions climatic conditions."',
      '10,Reading,Summary Completion,"Complete the summary: Racket strings were originally made from animal ______.","","intestines","Historical fact from the text."',
      '11,Reading,Diagram Label Completion,"Label the racket diagram: Part 1 (strings); Part 2 (frame)","Natural gut;Wooden","Part 1=Natural gut;Part 2=Wooden","Based on described components."',
      '12,Reading,Short-answer Questions,"What material did Pete Sampras add to his rackets? (No more than two words)","","lead weights","Exact phrase from the passage."'
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
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
    const missingHeaders = expectedHeaders.filter(header => 
      !headers.includes(header)
    );
    
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required columns: ${missingHeaders.join(', ')}. Expected exact format: ${expectedColumns.join(', ')}`);
    }

    const questions = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      
      if (values.length < headers.length) continue;

      const questionNumber = parseInt(values[0]) || i;
      const section = values[1]?.trim() || 'Reading';
      const questionType = values[2]?.trim() || '';
      const questionText = values[3]?.trim() || '';
      const choices = values[4]?.trim() || '';
      const correctAnswer = values[5]?.trim() || '';
      const explanation = values[6]?.trim() || '';

      // Validate question type
      if (!validQuestionTypes.includes(questionType)) {
        throw new Error(`Invalid question type "${questionType}" in row ${i + 1}. Supported types: ${validQuestionTypes.join(', ')}`);
      }

      // Parse choices based on question type
      let options: string[] = [];
      let parsedChoices: any = null;

      if (choices) {
        if (questionType === 'Multiple Choice') {
          options = choices.split(';').map(choice => choice.trim()).filter(choice => choice);
        } else if (questionType === 'True/False/Not Given') {
          options = ['TRUE', 'FALSE', 'NOT GIVEN'];
        } else if (questionType === 'Yes/No/Not Given') {
          options = ['YES', 'NO', 'NOT GIVEN'];
        } else if (questionType.includes('Matching')) {
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

      questions.push({
        question_number: questionNumber,
        section: section,
        question_type: questionType,
        question_text: questionText,
        options: options.length > 0 ? options : undefined,
        choices: parsedChoices || undefined,
        correct_answer: correctAnswer,
        explanation: explanation
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

  const handleConfirmImport = () => {
    onImport(previewQuestions);
    setShowPreview(false);
    setPreviewQuestions([]);
  };

  const handleCancelImport = () => {
    setShowPreview(false);
    setPreviewQuestions([]);
  };

  return (
    <Card className="rounded-2xl border-light-border shadow-soft" style={{ background: 'var(--gradient-card)' }}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <FileText className="w-5 h-5" />
          Bulk CSV Import - All IELTS Reading Types
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
          <strong>Supported Types:</strong> {validQuestionTypes.join(', ')}
          <br /><br />
          <strong>Choice Formats:</strong>
          <br />• Multiple Choice: "A) Option1;B) Option2;C) Option3"
          <br />• Matching: "Item1=MatchA;Item2=MatchB" or "Option1;Option2;Option3"
          <br />• True/False/Not Given: Leave choices blank (auto-generated)
          <br />• Fill/Completion: Leave choices blank for open text answers
        </div>

        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {!showPreview ? (
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={downloadTemplate}
              className="rounded-xl border-light-border flex-1"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Sample CSV
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="rounded-xl flex-1"
              style={{ background: 'var(--gradient-button)', border: 'none' }}
            >
              <Upload className="w-4 h-4 mr-2" />
              {importing ? 'Parsing CSV...' : 'Upload CSV'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <h4 className="font-medium text-green-800 mb-2">Preview: {previewQuestions.length} questions parsed successfully</h4>
              <div className="text-sm text-green-700">
                Review the questions below and confirm to import them into your test.
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto border border-light-border rounded-xl p-4 bg-white">
              {previewQuestions.map((question, index) => (
                <div key={index} className="border-b border-light-border pb-3 mb-3 last:border-b-0 last:mb-0">
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
                      {question.options && question.options.length > 0 && (
                        <div className="text-xs text-warm-gray mt-1">
                          Options: {question.options.join(' | ')}
                        </div>
                      )}
                      {question.choices && (
                        <div className="text-xs text-warm-gray mt-1">
                          Matches: {Object.entries(question.choices).map(([k, v]) => `${k}=${v}`).join(' | ')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleConfirmImport}
                className="rounded-xl flex-1"
                style={{ background: 'var(--gradient-button)', border: 'none' }}
              >
                Confirm Import
              </Button>
              <Button
                variant="outline"
                onClick={handleCancelImport}
                className="rounded-xl flex-1 border-light-border"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CSVImport;