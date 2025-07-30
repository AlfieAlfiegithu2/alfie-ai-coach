import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, BookOpen, FileText, Target, CheckCircle, AlertCircle } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useAdminContent } from "@/hooks/useAdminContent";
import CSVImport from "@/components/CSVImport";
import { toast } from "sonner";

interface ReadingTestData {
  id: string;
  test_number: number;
  parts_uploaded: number;
  total_questions: number;
  status: 'incomplete' | 'complete';
  created_at: string;
}

const AdminReadingManagement = () => {
  const navigate = useNavigate();
  const { testType, testId } = useParams<{ testType: string; testId: string; }>();
  const { admin, loading } = useAdminAuth();
  const { listContent, createContent } = useAdminContent();
  
  const [testData, setTestData] = useState<ReadingTestData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!loading && !admin) {
      navigate('/admin/login');
    }
  }, [admin, loading, navigate]);

  useEffect(() => {
    loadTestData();
  }, [testType, testId]);

  const loadTestData = async () => {
    if (!testType || !testId) return;
    
    setIsLoading(true);
    try {
      // Get passages count for this test
      const passagesResponse = await listContent('reading_passages');
      const passages = passagesResponse?.data?.filter((p: any) => 
        p.test_number === parseInt(testId) && 
        p[`${testType}_book`] === `${testType?.toUpperCase()} Test ${testId}`
      ) || [];

      // Get questions count for this test  
      const questionsResponse = await listContent('reading_questions');
      const questions = questionsResponse?.data?.filter((q: any) => 
        q.cambridge_book === `${testType?.toUpperCase()} Test ${testId}`
      ) || [];

      const uniqueParts = new Set(passages.map((p: any) => p.part_number));
      
      setTestData({
        id: testId,
        test_number: parseInt(testId),
        parts_uploaded: uniqueParts.size,
        total_questions: questions.length,
        status: uniqueParts.size === 3 && questions.length >= 30 ? 'complete' : 'incomplete',
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error loading test data:', error);
      toast.error('Failed to load test data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCSVImport = async (questions: any[]) => {
    setUploading(true);
    try {
      // Group questions by part number to create passages and questions
      const partGroups: {[key: number]: any[]} = {};
      questions.forEach(q => {
        const partNum = q.part_number || Math.ceil(q.question_number / 13); // Auto-assign parts
        if (!partGroups[partNum]) partGroups[partNum] = [];
        partGroups[partNum].push(q);
      });

      // Create passages and questions for each part
      for (const [partNumber, partQuestions] of Object.entries(partGroups)) {
        const partNum = parseInt(partNumber);
        
        // Create passage for this part
        const passageData = {
          title: `${testType?.toUpperCase()} Test ${testId} - Reading Passage ${partNum}`,
          content: partQuestions[0]?.passage_content || `This is Reading Passage ${partNum} content. Please replace with actual passage text.`,
          test_number: parseInt(testId || '1'),
          [`${testType}_book`]: `${testType?.toUpperCase()} Test ${testId}`,
          passage_type: 'Academic',
          part_number: partNum,
          section_number: 1
        };

        const passageResponse = await createContent('reading_passages', passageData);
        const passageId = passageResponse?.data?.[0]?.id;

        if (passageId) {
          // Create questions for this passage
          for (const question of partQuestions) {
            const questionData = {
              question_number: question.question_number,
              question_text: question.question_text,
              question_type: question.question_type,
              options: question.options,
              correct_answer: question.correct_answer,
              explanation: question.explanation,
              passage_id: passageId,
              cambridge_book: `${testType?.toUpperCase()} Test ${testId}`,
              section_number: 1,
              part_number: partNum
            };
            
            await createContent('reading_questions', questionData);
          }
        }
      }
      
      toast.success(`Successfully uploaded reading test with ${questions.length} questions across ${Object.keys(partGroups).length} parts`);
      loadTestData(); // Reload to show updated status
    } catch (error) {
      console.error('Error importing reading test:', error);
      toast.error('Failed to upload reading test');
    } finally {
      setUploading(false);
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
      backPath={`/admin/${testType}/test/${testId}`}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Reading Test Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Upload complete 40-question reading test with 3 parts
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary" className="text-sm">
              Test {testId}
            </Badge>
            <Badge 
              variant={testData?.status === 'complete' ? 'default' : 'outline'} 
              className="text-sm"
            >
              {testData?.status === 'complete' ? 'Complete' : 'Incomplete'}
            </Badge>
          </div>
        </div>

        {/* Status Overview */}
        {testData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Test Progress Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{testData.parts_uploaded}/3</div>
                  <div className="text-sm text-muted-foreground">Parts Uploaded</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{testData.total_questions}</div>
                  <div className="text-sm text-muted-foreground">Total Questions</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-center gap-2">
                    {testData.status === 'complete' ? (
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    ) : (
                      <AlertCircle className="w-6 h-6 text-orange-500" />
                    )}
                    <span className="font-semibold">
                      {testData.status === 'complete' ? 'Ready' : 'In Progress'}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">Test Status</div>
                </div>
              </div>
              
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-2">
                  <span>Progress</span>
                  <span>{Math.round((testData.total_questions / 40) * 100)}%</span>
                </div>
                <Progress 
                  value={(testData.total_questions / 40) * 100} 
                  className="h-2"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* CSV Upload Section */}
        <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload Complete Reading Test
            </CardTitle>
            <CardDescription>
              Upload a CSV file containing all 40 questions divided into 3 parts with passages and questions.
              The system will automatically create passages and link questions to them.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {uploading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-sm text-muted-foreground">Uploading reading test...</p>
              </div>
            ) : (
              <CSVImport
                onImport={handleCSVImport}
                type="reading"
                module={testType as 'ielts' | 'pte' | 'toefl' | 'general'}
                cambridgeBook={`${testType?.toUpperCase()} Test ${testId}`}
                testNumber={parseInt(testId || '1')}
                sectionNumber={1}
              />
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Upload Instructions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="font-semibold mb-2">Part 1: Questions 1-13</div>
                  <div className="text-sm text-muted-foreground">
                    First passage with 13 questions. Usually academic text analysis.
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="font-semibold mb-2">Part 2: Questions 14-26</div>
                  <div className="text-sm text-muted-foreground">
                    Second passage with 13 questions. Often argumentative or descriptive text.
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="font-semibold mb-2">Part 3: Questions 27-40</div>
                  <div className="text-sm text-muted-foreground">
                    Third passage with 14 questions. Typically complex analytical text.
                  </div>
                </div>
              </div>
              
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="font-semibold mb-2">CSV Format Requirements:</div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Question Number: Sequential from 1-40</li>
                  <li>• Part Number: 1, 2, or 3 (auto-assigned if missing)</li>
                  <li>• Question Type: Multiple Choice, True/False/Not Given, etc.</li>
                  <li>• Correct Answer: Exact answer text</li>
                  <li>• Explanation: Brief explanation for the answer</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminReadingManagement;