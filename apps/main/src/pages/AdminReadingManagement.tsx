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
import { Plus, Upload, FileText, Save, X, Edit, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';
import AdminLayout from '@/components/AdminLayout';
import { useAdminAuth } from '@/hooks/useAdminAuth';

interface Question {
  id?: string;
  question_number_in_part: number;
  question_text: string;
  question_type: string;
  choices?: string;
  correct_answer: string;
  explanation?: string;
  original_type?: string;
  section?: string;
}

interface Part {
  title: string;
  passage: string;
  questions: Question[];
}

// Student Preview Component
const StudentPreview = ({ 
  title, 
  passage, 
  questions, 
  partNumber 
}: { 
  title: string;
  passage: string;
  questions: Question[];
  partNumber: number;
}) => {
  const renderQuestion = (question: Question, index: number) => {
    const { question_type, question_text, choices, original_type } = question;
    
    switch (question_type) {
      case 'multiple_choice':
        const choiceOptions = choices ? choices.split(';') : [];
        return (
          <div key={index} className="mb-4 p-4 border rounded-lg">
            <p className="font-medium mb-3">
              {question.question_number_in_part}. {question_text}
            </p>
            <div className="space-y-2">
              {choiceOptions.map((choice, i) => (
                <label key={i} className="flex items-center space-x-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name={`question-${question.question_number_in_part}`}
                    className="w-4 h-4" 
                    disabled 
                  />
                  <span className="text-sm">{choice.trim()}</span>
                </label>
              ))}
            </div>
          </div>
        );
        
      case 'true_false_not_given':
        return (
          <div key={index} className="mb-4 p-4 border rounded-lg">
            <p className="font-medium mb-3">
              {question.question_number_in_part}. {question_text}
            </p>
            <div className="space-y-2">
              {['True', 'False', 'Not Given'].map((option, i) => (
                <label key={i} className="flex items-center space-x-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name={`question-${question.question_number_in_part}`}
                    className="w-4 h-4" 
                    disabled 
                  />
                  <span className="text-sm">{option}</span>
                </label>
              ))}
            </div>
          </div>
        );
        
      case 'short_answer':
      case 'completion':
        return (
          <div key={index} className="mb-4 p-4 border rounded-lg">
            <p className="font-medium mb-3">
              {question.question_number_in_part}. {question_text}
            </p>
            <input 
              type="text" 
              className="w-full p-2 border rounded" 
              placeholder="Enter your answer..."
              disabled
            />
          </div>
        );
        
      case 'matching':
        return (
          <div key={index} className="mb-4 p-4 border rounded-lg">
            <p className="font-medium mb-3">
              {question.question_number_in_part}. {question_text}
            </p>
            <select className="w-full p-2 border rounded" disabled>
              <option>Select an option...</option>
            </select>
          </div>
        );
        
      default:
        return (
          <div key={index} className="mb-4 p-4 border rounded-lg">
            <p className="font-medium mb-3">
              {question.question_number_in_part}. {question_text}
            </p>
            <input 
              type="text" 
              className="w-full p-2 border rounded" 
              placeholder="Enter your answer..."
              disabled
            />
          </div>
        );
    }
  };

  return (
    <div className="mt-6 p-6 bg-gray-50 rounded-lg border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Student Preview - Part {partNumber}</h3>
        <span className="text-sm text-gray-500">Read-only preview</span>
      </div>
      
      {title && (
        <div className="mb-6">
          <h2 className="text-xl font-bold text-center mb-4">{title}</h2>
        </div>
      )}
      
      {passage && (
        <div className="mb-6 p-4 bg-white rounded border">
          <h3 className="font-semibold mb-3">Reading Passage</h3>
          <div className="prose max-w-none">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{passage}</p>
          </div>
        </div>
      )}
      
      {questions.length > 0 && (
        <div className="bg-white rounded border p-4">
          <h3 className="font-semibold mb-4">Questions</h3>
          <div className="space-y-4">
            {questions
              .filter(q => q.question_number_in_part > 0) // Filter out title questions
              .sort((a, b) => a.question_number_in_part - b.question_number_in_part)
              .map((question, index) => renderQuestion(question, index))}
          </div>
        </div>
      )}
      
      {!title && !passage && questions.length === 0 && (
        <p className="text-center text-gray-500 py-8">No content to preview yet</p>
      )}
    </div>
  );
};

// Main Page Component
export default function AdminReadingManagement() {
  const { testId } = useParams<{ testId: string }>();
  const [testName, setTestName] = useState('');
  const navigate = useNavigate();
  const { admin, loading: authLoading } = useAdminAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [partLocked, setPartLocked] = useState<{ [key: number]: boolean }>({
    1: false,
    2: false,
    3: false
  });
  const [editMode, setEditMode] = useState<{ [key: number]: boolean }>({
    1: false,
    2: false,
    3: false
  });
  const [partTitles, setPartTitles] = useState<{ [key: number]: string }>({
    1: '',
    2: '',
    3: ''
  });
  const [passages, setPassages] = useState<{ [key: number]: string }>({
    1: '',
    2: '',
    3: ''
  });
  const [existingQuestions, setExistingQuestions] = useState<{ [key: number]: Question[] }>({
    1: [],
    2: [],
    3: []
  });
  const [showPreview, setShowPreview] = useState<{ [key: number]: boolean }>({
    1: false,
    2: false,
    3: false
  });

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
    loadPartData();
  }, [testId, navigate]);

  const loadPartData = async () => {
    if (!testId) return;
    
    try {
      const partPromises = [1, 2, 3].map(async (partNumber) => {
        const { data, error } = await supabase
          .from('questions')
          .select('*')
          .eq('test_id', testId)
          .eq('part_number', partNumber)
          .order('question_number_in_part', { ascending: true });

        if (error) throw error;
        return { partNumber, data: data || [] };
      });

      const results = await Promise.all(partPromises);
      const newTitles = { 1: '', 2: '', 3: '' };
      const newPassages = { 1: '', 2: '', 3: '' };
      const newLocked = { 1: false, 2: false, 3: false };
      const newQuestions = { 1: [], 2: [], 3: [] };
      
      results.forEach(({ partNumber, data }) => {
        // Extract title and passage from title question if it exists
        if (data.length > 0) {
          const titleQuestion = data.find(q => q.question_type === 'title');
          if (titleQuestion) {
            newTitles[partNumber as keyof typeof newTitles] = titleQuestion.question_text || '';
            newPassages[partNumber as keyof typeof newPassages] = titleQuestion.passage_text || '';
          } else if (data[0]) {
            newPassages[partNumber as keyof typeof newPassages] = data[0].passage_text || '';
          }
          
          // Filter out title questions for display
          const actualQuestions = data.filter(q => q.question_type !== 'title');
          newQuestions[partNumber as keyof typeof newQuestions] = actualQuestions;
          
          // Check if part is locked (has questions or title/passage)
          newLocked[partNumber as keyof typeof newLocked] = data.length > 0;
        }
      });

      setPartTitles(newTitles);
      setPassages(newPassages);
      setPartLocked(newLocked);
      setExistingQuestions(newQuestions);
    } catch (error) {
      console.error('Error loading part data:', error);
    }
  };

  const handleSavePart = async (partNumber: number) => {
    try {
      const partTitle = partTitles[partNumber as keyof typeof partTitles];
      const partPassage = passages[partNumber as keyof typeof passages];
      
      if (!partTitle && !partPassage) {
        toast.error('Please add a title or passage before saving');
        return;
      }
      
      // Create or update title question
      if (partTitle || partPassage) {
        const { data: existingTitle } = await supabase
          .from('questions')
          .select('id')
          .eq('test_id', testId)
          .eq('part_number', partNumber)
          .eq('question_type', 'title')
          .single();

        if (existingTitle) {
          // Update existing title
          const { error } = await supabase
            .from('questions')
            .update({ 
              question_text: partTitle,
              passage_text: partPassage 
            })
            .eq('id', existingTitle.id);
          
          if (error) throw error;
        } else {
          // Create new title question
          const { error } = await supabase
            .from('questions')
            .insert({
              test_id: testId,
              part_number: partNumber,
              question_number_in_part: 0,
              question_text: partTitle,
              question_type: 'title',
              correct_answer: '',
              passage_text: partPassage
            });
          
          if (error) throw error;
        }
      }
      
      // Lock the part and disable edit mode
      setPartLocked(prev => ({ ...prev, [partNumber]: true }));
      setEditMode(prev => ({ ...prev, [partNumber]: false }));
      
      toast.success(`Part ${partNumber} saved and locked successfully!`);
      loadPartData();
    } catch (error) {
      console.error('Error saving part:', error);
      toast.error('Failed to save part');
    }
  };

  const handleModifyPart = (partNumber: number) => {
    setEditMode(prev => ({ ...prev, [partNumber]: true }));
    setPartLocked(prev => ({ ...prev, [partNumber]: false }));
  };

  const handleUploadCSV = async (partNumber: number, file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const parsedQuestions = results.data.map((row: any, index: number) => {
            const questionNumber = parseInt(row['question_number_in_part'], 10) || (index + 1);
            const questionType = row['question_type'] || 'multiple_choice';
            
            return {
              test_id: testId,
              part_number: parseInt(row['part_number'], 10) || partNumber,
              question_number_in_part: questionNumber,
              question_text: row['question_text'] || '',
              question_type: questionType,
              choices: row['choices'] || '',
              correct_answer: row['correct_answer'] || '',
              explanation: row['explanation'] || '',
              passage_text: row['passage_text'] || passages[partNumber as keyof typeof passages] || null,
            };
          }).filter(q => q.question_text.trim() !== '');

          // Upload questions via edge function
          const { data, error } = await supabase.functions.invoke('admin-content', {
            body: { 
              action: 'upload_questions',
              payload: parsedQuestions,
              adminKeypass: 'myye65402086'
            },
          });

          if (error) throw error;
          if (data?.error) throw new Error(data.error);

          toast.success(`${parsedQuestions.length} questions uploaded for Part ${partNumber}`);
          loadPartData();
        } catch (err: any) {
          console.error('Error uploading CSV:', err);
          toast.error(`Upload failed: ${err.message}`);
        }
      },
      error: (error) => {
        console.error('CSV parsing error:', error);
        toast.error('Failed to parse CSV file');
      }
    });
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
            Add titles, passages and upload CSV files for each part of the reading test.
          </p>
        </div>
        
        {[1, 2, 3].map((partNumber) => (
          <Card key={`${partNumber}-${refreshKey}`} className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Part {partNumber}
                  {partLocked[partNumber] && !editMode[partNumber] && (
                    <span className="ml-3 text-green-500 text-sm">(✓ Locked)</span>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor={`title-${partNumber}`}>Part Title</Label>
                <Input
                  id={`title-${partNumber}`}
                  placeholder={`Enter title for Part ${partNumber}...`}
                  value={partTitles[partNumber]}
                  onChange={(e) => setPartTitles(prev => ({ ...prev, [partNumber]: e.target.value }))}
                  disabled={partLocked[partNumber] && !editMode[partNumber]}
                />
              </div>

              <div>
                <Label htmlFor={`passage-${partNumber}`}>Reading Passage</Label>
                <Textarea
                  id={`passage-${partNumber}`}
                  placeholder="Paste the passage text for this part here..."
                  rows={8}
                  value={passages[partNumber]}
                  onChange={(e) => setPassages(prev => ({ ...prev, [partNumber]: e.target.value }))}
                  disabled={partLocked[partNumber] && !editMode[partNumber]}
                />
              </div>

              <div>
                <Label htmlFor={`csv-${partNumber}`}>Upload Questions CSV</Label>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-blue-800">Need help with CSV format?</span>
                    <a 
                      href="/examples/ielts-reading-example.csv" 
                      download="ielts-reading-example.csv"
                      className="text-blue-600 hover:text-blue-800 underline text-sm font-medium"
                    >
                      Download Example CSV
                    </a>
                  </div>
                  <input
                    id={`csv-${partNumber}`}
                    type="file"
                    accept=".csv"
                    className="flex-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleUploadCSV(partNumber, file);
                      }
                    }}
                    disabled={partLocked[partNumber] && !editMode[partNumber]}
                  />
                  <p className="text-xs text-muted-foreground">
                    Required columns: question_text, question_type, passage_text, correct_answer, choices, explanation, part_number, question_number_in_part, passage_title, cambridge_book, section_number
                  </p>
                </div>
              </div>

              {existingQuestions[partNumber].length > 0 && (
                <div>
                  <Label>Existing Questions ({existingQuestions[partNumber].length})</Label>
                  <div className="mt-2 space-y-2 max-h-40 overflow-y-auto border rounded p-3">
                    {existingQuestions[partNumber].map((q, index) => (
                      <div key={q.id || index} className="text-xs p-2 bg-blue-50 rounded border">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">Q{q.question_number_in_part}: {q.question_type}</span>
                        </div>
                        <p className="text-gray-700 mb-1">{q.question_text.substring(0, 100)}...</p>
                        <p className="text-green-600"><strong>Answer:</strong> {q.correct_answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex space-x-2">
                {partLocked[partNumber] && !editMode[partNumber] ? (
                  <Button
                    onClick={() => handleModifyPart(partNumber)}
                    variant="outline"
                    className="flex-1"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Modify Part {partNumber}
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleSavePart(partNumber)}
                    className="flex-1"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Part {partNumber}
                  </Button>
                )}
                
                {(partTitles[partNumber] || passages[partNumber] || existingQuestions[partNumber].length > 0) && (
                  <Button
                    variant="outline"
                    onClick={() => setShowPreview(prev => ({ ...prev, [partNumber]: !prev[partNumber] }))}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {showPreview[partNumber] ? 'Hide Preview' : 'Preview'}
                  </Button>
                )}
              </div>

              {showPreview[partNumber] && (
                <StudentPreview 
                  title={partTitles[partNumber]}
                  passage={passages[partNumber]}
                  questions={existingQuestions[partNumber]}
                  partNumber={partNumber}
                />
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminLayout>
  );
}