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
  const { listContent, createContent } = useAdminContent();
  
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

  const handleCSVUpload = (partNumber: number, file: File) => {
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
      // Parse CSV file
      const csvText = await part.csvFile.text();
      const lines = csvText.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      
      const questions = lines.slice(1).map((line, index) => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const question: any = {};
        headers.forEach((header, i) => {
          question[header] = values[i] || '';
        });
        return question;
      }).filter(q => q.question_text && q.correct_answer);

      // Create passage
      const passageData = {
        title: part.title,
        content: part.content,
        test_number: parseInt(testId || '1'),
        [`${testType}_book`]: `${testType?.toUpperCase()} Test ${testId}`,
        passage_type: 'Academic',
        part_number: partNumber,
        section_number: 1
      };

      const passageResponse = await createContent('reading_passages', passageData);
      const passageId = passageResponse?.data?.[0]?.id;

      if (!passageId) {
        throw new Error('Failed to create passage');
      }

      // Create questions
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        const questionNumber = ((partNumber - 1) * 13) + (i + 1); // Calculate question number based on part
        
        const questionData = {
          question_number: questionNumber,
          question_text: question.question_text || '',
          question_type: question.question_type || 'Multiple Choice',
          options: question.options ? JSON.parse(question.options) : null,
          correct_answer: question.correct_answer || '',
          explanation: question.explanation || '',
          passage_id: passageId,
          cambridge_book: `${testType?.toUpperCase()} Test ${testId}`,
          section_number: 1,
          part_number: partNumber
        };
        
        await createContent('reading_questions', questionData);
      }

      // Update part status
      setParts(prevParts => 
        prevParts.map(p => 
          p.number === partNumber 
            ? { ...p, saved: true }
            : p
        )
      );

      toast.success(`Part ${partNumber} saved successfully with ${questions.length} questions`);
    } catch (error) {
      console.error('Error saving part:', error);
      toast.error(`Failed to save Part ${partNumber}`);
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
                          onImport={(questions) => {
                            // Create a mock file for the questions data
                            const csvContent = questions.map(q => 
                              Object.values(q).join(',')
                            ).join('\n');
                            const file = new File([csvContent], `part-${part.number}-questions.csv`, {
                              type: 'text/csv'
                            });
                            handleCSVUpload(part.number, file);
                          }}
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