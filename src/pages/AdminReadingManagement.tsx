// src/pages/AdminReadingManagement.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Upload, FileText, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';
import AdminLayout from '@/components/AdminLayout';
import { useAdminAuth } from '@/hooks/useAdminAuth';

interface Question {
  question_number_in_part: number;
  question_text: string;
  question_type: string;
  choices?: string;
  correct_answer: string;
  explanation?: string;
}

// Manual Question Form Component
const ManualQuestionForm = ({ 
  partNumber, 
  testId, 
  onQuestionAdded 
}: { 
  partNumber: number; 
  testId: string; 
  onQuestionAdded: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState<Question>({
    question_number_in_part: 1,
    question_text: '',
    question_type: 'multiple_choice',
    choices: '',
    correct_answer: '',
    explanation: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!question.question_text || !question.correct_answer) {
      toast.error('Please fill in required fields');
      return;
    }

    setIsLoading(true);
    try {
      const questionData = {
        ...question,
        test_id: testId,
        part_number: partNumber,
      };

      const { data, error: functionError } = await supabase.functions.invoke('admin-content', {
        body: {
          action: 'upload_questions',
          payload: [questionData]
        },
      });

      if (functionError) throw functionError;
      if (data.error) throw new Error(data.error);

      toast.success('Question added successfully');
      setOpen(false);
      setQuestion({
        question_number_in_part: question.question_number_in_part + 1,
        question_text: '',
        question_type: 'multiple_choice',
        choices: '',
        correct_answer: '',
        explanation: ''
      });
      onQuestionAdded();
    } catch (err: any) {
      console.error('Error adding question:', err);
      toast.error(`Failed to add question: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Question Manually
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Question to Part {partNumber}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="questionNumber">Question Number</Label>
              <Input
                id="questionNumber"
                type="number"
                value={question.question_number_in_part}
                onChange={(e) => setQuestion({ ...question, question_number_in_part: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div>
              <Label htmlFor="questionType">Question Type</Label>
              <Select 
                value={question.question_type} 
                onValueChange={(value) => setQuestion({ ...question, question_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                  <SelectItem value="true_false">True/False</SelectItem>
                  <SelectItem value="fill_in_blank">Fill in the Blank</SelectItem>
                  <SelectItem value="matching">Matching</SelectItem>
                  <SelectItem value="short_answer">Short Answer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <Label htmlFor="questionText">Question Text *</Label>
            <Textarea
              id="questionText"
              placeholder="Enter the question text here..."
              value={question.question_text}
              onChange={(e) => setQuestion({ ...question, question_text: e.target.value })}
              rows={3}
            />
          </div>

          {question.question_type === 'multiple_choice' && (
            <div>
              <Label htmlFor="choices">Choices (A, B, C, D)</Label>
              <Textarea
                id="choices"
                placeholder="A) Option 1&#10;B) Option 2&#10;C) Option 3&#10;D) Option 4"
                value={question.choices}
                onChange={(e) => setQuestion({ ...question, choices: e.target.value })}
                rows={4}
              />
            </div>
          )}

          <div>
            <Label htmlFor="correctAnswer">Correct Answer *</Label>
            <Input
              id="correctAnswer"
              placeholder="Enter the correct answer"
              value={question.correct_answer}
              onChange={(e) => setQuestion({ ...question, correct_answer: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="explanation">Explanation (Optional)</Label>
            <Textarea
              id="explanation"
              placeholder="Explain why this is the correct answer..."
              value={question.explanation}
              onChange={(e) => setQuestion({ ...question, explanation: e.target.value })}
              rows={2}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? 'Adding...' : 'Add Question'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Enhanced Part Uploader Component
const PartUploader = ({ 
  partNumber, 
  testId, 
  onQuestionsUpdated 
}: { 
  partNumber: number; 
  testId: string; 
  onQuestionsUpdated: () => void;
}) => {
  const [passage, setPassage] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [existingQuestions, setExistingQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Load existing questions for this part
  useEffect(() => {
    const loadExistingQuestions = async () => {
      try {
        const { data, error } = await supabase
          .from('questions')
          .select('*')
          .eq('test_id', testId)
          .eq('part_number', partNumber)
          .order('question_number_in_part');

        if (!error && data) {
          setExistingQuestions(data);
        }
      } catch (err) {
        console.error('Error loading existing questions:', err);
      }
    };
    loadExistingQuestions();
  }, [testId, partNumber]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const parsedQuestions = results.data.map((row: any) => ({
            question_number_in_part: parseInt(row['Question Number'], 10) || 1,
            question_text: row['Question Text'] || '',
            question_type: row['Type'] || 'multiple_choice',
            choices: row['Choices'] || '',
            correct_answer: row['Correct Answer'] || '',
            explanation: row['Explanation'] || '',
          }));
          setQuestions(parsedQuestions);
          setSuccess(false);
          toast.success(`${parsedQuestions.length} questions loaded from CSV`);
        },
        error: (error) => {
          console.error('CSV parsing error:', error);
          toast.error('Failed to parse CSV file');
        }
      });
    }
  };

  const handleSavePart = async () => {
    if (questions.length === 0) {
      toast.error('No questions to upload. Please select a valid CSV file or add questions manually.');
      return;
    }

    setIsLoading(true);
    setSuccess(false);

    const questionsWithData = questions.map(q => ({
      ...q,
      test_id: testId,
      part_number: partNumber,
      passage_text: q.question_number_in_part === 1 ? passage : null,
    }));

    try {
      const { data, error: functionError } = await supabase.functions.invoke('admin-content', {
        body: { questions: questionsWithData },
      });

      if (functionError) throw functionError;
      if (data.error) throw new Error(data.error);

      setSuccess(true);
      toast.success(`Part ${partNumber} saved successfully`);
      onQuestionsUpdated();
      
      // Refresh existing questions
      const { data: newQuestions } = await supabase
        .from('questions')
        .select('*')
        .eq('test_id', testId)
        .eq('part_number', partNumber)
        .order('question_number_in_part');
      
      if (newQuestions) setExistingQuestions(newQuestions);
    } catch (err: any) {
      console.error(`Error saving Part ${partNumber}:`, err);
      toast.error(`Upload Failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Part {partNumber}
            {success && <span className="ml-3 text-green-500 text-sm">(✓ Saved)</span>}
          </div>
          <div className="flex space-x-2">
            <ManualQuestionForm 
              partNumber={partNumber} 
              testId={testId} 
              onQuestionAdded={onQuestionsUpdated}
            />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor={`passage-${partNumber}`}>Reading Passage</Label>
          <Textarea
            id={`passage-${partNumber}`}
            placeholder="Paste the passage text for this part here..."
            rows={8}
            value={passage}
            onChange={(e) => setPassage(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor={`csv-${partNumber}`}>Upload Questions CSV</Label>
          <div className="flex items-center space-x-4">
            <input
              id={`csv-${partNumber}`}
              type="file"
              accept=".csv"
              className="flex-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              onChange={handleFileUpload}
            />
          </div>
          {questions.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {questions.length} questions parsed from CSV
            </p>
          )}
        </div>

        {existingQuestions.length > 0 && (
          <div>
            <Label>Existing Questions ({existingQuestions.length})</Label>
            <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
              {existingQuestions.map((q, index) => (
                <div key={index} className="text-xs p-2 bg-muted rounded">
                  <strong>Q{q.question_number_in_part}:</strong> {q.question_text.substring(0, 100)}...
                </div>
              ))}
            </div>
          </div>
        )}

        <Button
          onClick={handleSavePart}
          disabled={isLoading}
          className="w-full"
        >
          <Save className="w-4 h-4 mr-2" />
          {isLoading ? 'Saving...' : `Save Part ${partNumber}`}
        </Button>
      </CardContent>
    </Card>
  );
};

// Main Page Component
export default function AdminReadingManagement() {
  const { testId } = useParams<{ testId: string }>();
  const [testName, setTestName] = useState('');
  const navigate = useNavigate();
  const { admin, loading: authLoading } = useAdminAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!authLoading && !admin) {
      navigate('/admin/login');
    }
  }, [admin, authLoading, navigate]);

  useEffect(() => {
    const fetchTestDetails = async () => {
      if (testId) {
        const { data, error } = await supabase
          .from('tests')
          .select('test_name')
          .eq('id', testId)
          .single();
        if (error) {
          console.error('Error fetching test name:', error);
          navigate('/admin/ielts/reading');
        } else {
          setTestName(data.test_name);
        }
      }
    };
    fetchTestDetails();
  }, [testId, navigate]);

  const handleQuestionsUpdated = () => {
    setRefreshKey(prev => prev + 1);
  };

  if (authLoading) {
    return (
      <AdminLayout title="Loading..." showBackButton={true} backPath="/admin/ielts/reading">
        <div className="text-center">Loading...</div>
      </AdminLayout>
    );
  }

  if (!admin || !testId) {
    return (
      <AdminLayout title="Error" showBackButton={true} backPath="/admin/ielts/reading">
        <div className="text-center">Loading or invalid test ID...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={`Manage Test: ${testName}`} showBackButton={true} backPath="/admin/ielts/reading">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Manage Test: {testName}</h1>
          <p className="text-muted-foreground">
            Upload CSV files or add questions manually for each part of the reading test.
          </p>
        </div>
        
        <PartUploader 
          key={`part-1-${refreshKey}`}
          partNumber={1} 
          testId={testId} 
          onQuestionsUpdated={handleQuestionsUpdated}
        />
        <PartUploader 
          key={`part-2-${refreshKey}`}
          partNumber={2} 
          testId={testId} 
          onQuestionsUpdated={handleQuestionsUpdated}
        />
        <PartUploader 
          key={`part-3-${refreshKey}`}
          partNumber={3} 
          testId={testId} 
          onQuestionsUpdated={handleQuestionsUpdated}
        />
      </div>
    </AdminLayout>
  );
}