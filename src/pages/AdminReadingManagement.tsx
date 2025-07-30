import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckCircle, ChevronDown, Upload, Circle } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useAdminContent } from "@/hooks/useAdminContent";
import CSVImport from "@/components/CSVImport";
import { toast } from "sonner";

interface PartData {
  title: string;
  content: string;
  questions: any[];
  saved: boolean;
}

interface TestPart {
  number: number;
  title: string;
  content: string;
  csvFile: File | null;
  saved: boolean;
}

const AdminReadingManagement = () => {
  const navigate = useNavigate();
  const { testType, testId } = useParams<{ testType: string; testId: string; }>();
  const { admin, loading } = useAdminAuth();
  const { listContent, createContent, updateContent } = useAdminContent();
  
  const [parts, setParts] = useState<TestPart[]>([
    { number: 1, title: "", content: "", csvFile: null, saved: false },
    { number: 2, title: "", content: "", csvFile: null, saved: false },
    { number: 3, title: "", content: "", csvFile: null, saved: false }
  ]);
  const [openParts, setOpenParts] = useState<Set<number>>(new Set([1]));
  const [savingPart, setSavingPart] = useState<number | null>(null);

  useEffect(() => {
    if (!loading && !admin) {
      navigate('/admin/login');
    }
  }, [admin, loading, navigate]);

  useEffect(() => {
    loadExistingData();
  }, [testType, testId]);

  const loadExistingData = async () => {
    if (!testType || !testId) return;
    
    try {
      // Load existing passages and questions for this test
      const [passagesResponse, questionsResponse] = await Promise.all([
        listContent('reading_passages'),
        listContent('reading_questions')
      ]);

      const passages = passagesResponse?.data?.filter((p: any) => 
        p.test_number === parseInt(testId) && 
        p[`${testType}_book`] === `${testType?.toUpperCase()} Test ${testId}`
      ) || [];

      const questions = questionsResponse?.data?.filter((q: any) => 
        q.cambridge_book === `${testType?.toUpperCase()} Test ${testId}`
      ) || [];

      // Update parts with existing data
      const updatedParts = parts.map(part => {
        const partPassage = passages.find((p: any) => p.part_number === part.number);
        const partQuestions = questions.filter((q: any) => q.part_number === part.number);
        
        return {
          ...part,
          title: partPassage?.title || "",
          content: partPassage?.content || "",
          saved: !!(partPassage && partQuestions.length > 0)
        };
      });

      setParts(updatedParts);
    } catch (error) {
      console.error('Error loading existing data:', error);
      toast.error('Failed to load existing data');
    }
  };

  const togglePart = (partNumber: number) => {
    const newOpen = new Set(openParts);
    if (newOpen.has(partNumber)) {
      newOpen.delete(partNumber);
    } else {
      newOpen.add(partNumber);
    }
    setOpenParts(newOpen);
  };

  const updatePart = (partNumber: number, field: keyof TestPart, value: any) => {
    setParts(prevParts => 
      prevParts.map(part => 
        part.number === partNumber 
          ? { ...part, [field]: value, saved: false }
          : part
      )
    );
  };

  const handleCSVUpload = (partNumber: number, questions: any[]) => {
    console.log('CSV uploaded for part', partNumber, 'with questions:', questions);
    // Create a mock file object to store questions data
    const questionsData = JSON.stringify(questions);
    const file = new File([questionsData], `part-${partNumber}-questions.json`, {
      type: 'application/json'
    });
    updatePart(partNumber, 'csvFile', file);
  };

  const savePart = async (partNumber: number) => {
    const part = parts.find(p => p.number === partNumber);
    if (!part) return;

    if (!part.title.trim() || !part.content.trim() || !part.csvFile) {
      toast.error('Please fill in all fields and upload a CSV file');
      return;
    }

    setSavingPart(partNumber);
    try {
      // Parse questions from file
      const fileContent = await part.csvFile.text();
      let questions;
      
      try {
        // Try to parse as JSON first (from our CSV import component)
        questions = JSON.parse(fileContent);
      } catch {
        // Fall back to CSV parsing
        const lines = fileContent.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        
        questions = lines.slice(1).map((line, index) => {
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
          const question: any = {};
          headers.forEach((header, i) => {
            question[header] = values[i] || '';
          });
          return question;
        }).filter(q => q.question_text && q.correct_answer);
      }

      // Get or create test in universal tests table
      const testsResponse = await listContent('tests');
      let test = testsResponse?.data?.find((t: any) => 
        t.test_type === testType?.toUpperCase() && 
        t.module === 'Reading' && 
        t.test_number === parseInt(testId || '1')
      );

      if (!test) {
        // Create test if it doesn't exist
        const testData = {
          test_name: `${testType?.toUpperCase()} Test ${testId}`,
          test_type: testType?.toUpperCase() || 'IELTS',
          module: 'Reading',
          test_number: parseInt(testId || '1'),
          status: 'incomplete',
          parts_completed: 0,
          total_questions: 0
        };
        
        const testResult = await createContent('tests', testData);
        test = testResult.data;
      }

      if (!test) {
        throw new Error('Failed to create or find test');
      }

      // Format questions for universal questions table
      const questionsData = questions.map((q: any, index: number) => ({
        test_id: test.id,
        part_number: partNumber,
        question_number_in_part: index + 1,
        question_text: q.question_text || q['Question Text'] || q.QuestionText || '',
        question_type: q.question_type || q['Question Type'] || q.QuestionType || 'Multiple Choice',
        correct_answer: q.correct_answer || q['Correct Answer'] || q.CorrectAnswer || '',
        explanation: q.explanation || q.Explanation || '',
        choices: q.options || q.Options || q.choices || '',
        passage_text: part.content // Include passage text with each question
      }));

      // Upload questions using CSV upload endpoint
      const result = await createContent('csv_upload', {
        csvData: questionsData,
        testId: test.id,
        testType: testType?.toUpperCase() || 'IELTS',
        partNumber: partNumber
      });

      if (!result.success) {
        throw new Error('Failed to upload questions');
      }

      // Update test progress
      const updateData = {
        id: test.id,
        parts_completed: Math.max(test.parts_completed || 0, partNumber),
        total_questions: (test.total_questions || 0) + questionsData.length,
        status: partNumber === 3 ? 'complete' : 'incomplete'
      };

      await updateContent('tests', updateData);

      // Update part status
      setParts(prevParts => 
        prevParts.map(p => 
          p.number === partNumber 
            ? { ...p, saved: true }
            : p
        )
      );

      toast.success(`Part ${partNumber} saved successfully with ${questions.length} questions!`);
    } catch (error: any) {
      console.error('Error saving part:', error);
      const errorMessage = error.message || `Failed to save Part ${partNumber}`;
      toast.error(`Error: ${errorMessage}. Please check your data and try again.`);
    } finally {
      setSavingPart(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading Reading Management...</p>
        </div>
      </div>
    );
  }

  if (!admin) return null;

  return (
    <AdminLayout 
      title={`${testType?.toUpperCase()} Test ${testId} - Reading Management`}
      showBackButton={true}
      backPath={`/admin/${testType}/reading`}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              {testType?.toUpperCase()} Test {testId} - Reading Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Create a complete 3-part reading test with passages and questions
            </p>
          </div>
          <Badge variant="secondary" className="text-sm">
            Test {testId}
          </Badge>
        </div>

        {/* Test Parts */}
        <div className="space-y-4">
          {parts.map((part) => (
            <Card key={part.number} className="border border-border">
              <Collapsible 
                open={openParts.has(part.number)} 
                onOpenChange={() => togglePart(part.number)}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <ChevronDown 
                          className={`w-5 h-5 transition-transform ${
                            openParts.has(part.number) ? '' : '-rotate-90'
                          }`} 
                        />
                        <CardTitle className="flex items-center gap-2">
                          {part.saved ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <Circle className="w-5 h-5 text-muted-foreground" />
                          )}
                          Part {part.number}
                        </CardTitle>
                      </div>
                      <Badge variant={part.saved ? "default" : "outline"}>
                        {part.saved ? 'Saved' : 'Not Saved'}
                      </Badge>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <CardContent className="space-y-6">
                    {/* Passage Title */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Passage Title (Optional)
                      </label>
                      <Input
                        placeholder={`Reading Passage ${part.number} Title`}
                        value={part.title}
                        onChange={(e) => updatePart(part.number, 'title', e.target.value)}
                      />
                    </div>

                    {/* Passage Text */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Passage Text *
                      </label>
                      <Textarea
                        placeholder="Enter the complete reading passage text here..."
                        value={part.content}
                        onChange={(e) => updatePart(part.number, 'content', e.target.value)}
                        rows={8}
                        className="resize-none"
                      />
                    </div>

                    {/* Questions CSV Upload */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Questions CSV File *
                      </label>
                      <div className="border-2 border-dashed border-border rounded-lg p-6">
                        <CSVImport
                          onImport={(questions) => handleCSVUpload(part.number, questions)}
                          type="reading"
                          module={testType as 'ielts' | 'pte' | 'toefl' | 'general'}
                          cambridgeBook={`${testType?.toUpperCase()} Test ${testId}`}
                          testNumber={parseInt(testId || '1')}
                          sectionNumber={1}
                          hideDownloadSample={true}
                        />
                        {part.csvFile && (
                          <p className="text-sm text-muted-foreground mt-2">
                            File: {part.csvFile.name}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end">
                      <Button 
                        onClick={() => savePart(part.number)}
                        disabled={savingPart === part.number || !part.title.trim() || !part.content.trim() || !part.csvFile}
                        className="bg-primary hover:bg-primary/90"
                      >
                        {savingPart === part.number ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Saving Part {part.number}...
                          </>
                        ) : (
                          `Save Part ${part.number}`
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminReadingManagement;