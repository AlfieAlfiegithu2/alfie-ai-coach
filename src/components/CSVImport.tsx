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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const expectedColumns = [
    'Question Number',
    'Question Type',
    'Question Text',
    'Choices',
    'Correct Answer',
    'Explanation'
  ];

  const downloadTemplate = () => {
    const csvContent = [
      expectedColumns.join(','),
      '1,multiple_choice,"What is the main idea of the passage?","A. Option A;B. Option B;C. Option C;D. Option D",A,"This is the explanation for the correct answer"',
      '2,fill_in_blank,"Fill in the blank: The author suggests that _____.","","climate change","The passage discusses climate change in paragraph 2"',
      '3,true_false_not_given,"The study was conducted in 2020.","True;False;Not Given",Not Given,"The passage does not mention when the study was conducted"'
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}_questions_template.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const parseCSV = (csvText: string) => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV file must contain at least a header row and one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const expectedHeaders = expectedColumns;
    
    // Check if all expected headers are present
    const missingHeaders = expectedHeaders.filter(header => 
      !headers.some(h => h.toLowerCase().includes(header.toLowerCase()))
    );
    
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
    }

    const questions = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      
      if (values.length < headers.length) continue;

      const questionNumber = parseInt(values[0]) || i;
      const questionType = values[1] || 'multiple_choice';
      const questionText = values[2] || '';
      const choices = values[3] || '';
      const correctAnswer = values[4] || '';
      const explanation = values[5] || '';

      let options: string[] = [];
      if (questionType === 'multiple_choice' && choices) {
        options = choices.split(';').map(choice => choice.trim());
      } else if (questionType === 'true_false_not_given') {
        options = ['True', 'False', 'Not Given'];
      }

      questions.push({
        question_number: questionNumber,
        question_type: questionType,
        question_text: questionText,
        options: options.length > 0 ? options : undefined,
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

    try {
      const text = await file.text();
      const questions = parseCSV(text);
      
      if (questions.length === 0) {
        throw new Error('No valid questions found in CSV file');
      }

      onImport(questions);
    } catch (err: any) {
      setError(err.message || 'Failed to parse CSV file');
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <Card className="rounded-2xl border-light-border shadow-soft" style={{ background: 'var(--gradient-card)' }}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <FileText className="w-5 h-5" />
          Bulk CSV Import
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-warm-gray">
          Import multiple questions at once using a CSV file. Download the template to see the required format.
        </div>

        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={downloadTemplate}
            className="rounded-xl border-light-border flex-1"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Template
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
            {importing ? 'Importing...' : 'Upload CSV'}
          </Button>
        </div>

        <div className="text-xs text-warm-gray bg-white/50 p-3 rounded-xl">
          <strong>CSV Format:</strong> {expectedColumns.join(', ')}
          <br />
          <strong>Question Types:</strong> multiple_choice, fill_in_blank, short_answer, matching, true_false_not_given
          <br />
          <strong>Choices:</strong> For multiple choice, separate options with semicolons (A. Option A;B. Option B;...)
        </div>
      </CardContent>
    </Card>
  );
};

export default CSVImport;