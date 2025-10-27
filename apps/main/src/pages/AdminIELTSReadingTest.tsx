import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { BookOpen, Save, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import AdminLayout from "@/components/AdminLayout";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const AdminIELTSReadingTest = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [test, setTest] = useState<any>(null);
  const [passages, setPassages] = useState<any[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [isModifying, setIsModifying] = useState(false);

  useEffect(() => {
    if (testId) {
      loadTestData();
    }
  }, [testId]);

  const loadTestData = async () => {
    try {
      console.log('📖 Loading reading test data for testId:', testId);
      if (!testId) {
        console.error('❌ No testId provided!');
        setPageLoading(false);
        return;
      }
      
      setPageLoading(true);
      
      const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI';
      const baseUrl = supabase.supabaseUrl;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        // Fetch test details
        console.log('📖 Fetching test details via REST API...');
        const testResponse = await fetch(
          `${baseUrl}/rest/v1/tests?id=eq.${testId}`,
          {
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json'
            },
            signal: controller.signal
          }
        );

        if (!testResponse.ok) {
          throw new Error(`Test fetch failed: ${testResponse.status}`);
        }

        const testResults = await testResponse.json();
        const testData = testResults?.[0];

        if (!testData) {
          console.error('❌ Test not found:', testId);
          setPageLoading(false);
          setTest({});
          return;
        }

        console.log('✅ Test loaded:', testData);
        setTest(testData);

        // Fetch questions for reading
        console.log('📖 Fetching reading questions via REST API...');
        let questions: any[] = [];
        const questionsResponse = await fetch(
          `${baseUrl}/rest/v1/questions?test_id=eq.${testId}&order=part_number.asc&order=question_number_in_part.asc&limit=1000`,
          {
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json'
            },
            signal: controller.signal
          }
        );

        if (questionsResponse.ok) {
          questions = await questionsResponse.json();
        } else {
          console.warn('REST questions fetch failed with status', questionsResponse.status, '- falling back to supabase client');
          const { data: qFallback, error: qErr } = await supabase
            .from('questions')
            .select('*')
            .eq('test_id', testId)
            .order('part_number', { ascending: true })
            .order('question_number_in_part', { ascending: true });
          if (qErr) {
            console.error('Fallback questions query error:', qErr);
          }
          questions = qFallback || [];
        }

        if (questions && questions.length >= 0) {
          console.log('✅ Questions loaded:', questions?.length || 0);
          
          // Group by passage (part_number)
          const passageMap = new Map();
          questions?.forEach((q: any) => {
            if (!passageMap.has(q.part_number)) {
              passageMap.set(q.part_number, {
                part_number: q.part_number,
                passage_text: q.passage_text || "",
                questions: []
              });
            }
            passageMap.get(q.part_number).questions.push(q);
          });
          
          setPassages(Array.from(passageMap.values()));
          
          // Lock if has content
          const hasCompleteContent = questions && questions.length > 0 && 
                                    questions.some((q: any) => q.passage_text);
          setIsLocked(Boolean(hasCompleteContent));
        }

        console.log('✅ Test data loading complete');
      } finally {
        clearTimeout(timeoutId);
        setPageLoading(false);
      }
    } catch (error) {
      console.error('❌ Error loading test data:', error);
    }
  };

  const savePassage = async (partNumber: number) => {
    try {
      const passage = passages.find(p => p.part_number === partNumber);
      if (!passage) return;

      console.log(`💾 Saving reading passage ${partNumber}...`);

      // Update all questions in this passage with the passage text
      for (const question of passage.questions) {
        const { error } = await supabase
          .from('questions')
          .update({ passage_text: passage.passage_text })
          .eq('id', question.id);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `Passage ${partNumber} saved successfully`
      });

      setIsLocked(true);
    } catch (error: any) {
      console.error('Error saving passage:', error);
      toast({
        title: "Error",
        description: "Failed to save passage",
        variant: "destructive"
      });
    }
  };

  const handleModifyTest = () => {
    setIsModifying(true);
    setIsLocked(false);
  };

  if (pageLoading) {
    return (
      <AdminLayout title="Loading Reading Test..." showBackButton>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Loading reading test data...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!test) {
    return (
      <AdminLayout title="Reading Test Not Found" showBackButton>
        <Card className="max-w-md mx-auto mt-8">
          <CardHeader>
            <CardTitle>Test Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">The reading test you're looking for doesn't exist.</p>
            <Button onClick={() => navigate('/admin/ielts/reading')} variant="outline" className="w-full">
              Back to Reading Tests
            </Button>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={`Reading Test: ${test.test_name}`} showBackButton backPath="/admin/ielts/reading">
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <BookOpen className="w-8 h-8" />
              {test.test_name}
            </h1>
            <p className="text-muted-foreground mt-2">Manage reading passages and questions</p>
          </div>
          <div className="flex gap-2">
            {isLocked && !isModifying && (
              <Button onClick={handleModifyTest} variant="outline">
                Modify
              </Button>
            )}
            {(isModifying || !isLocked) && (
              <Button onClick={() => { setIsModifying(false); setIsLocked(true); }} variant="default">
                Lock
              </Button>
            )}
          </div>
        </div>

        <Separator />

        {passages.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">No reading passages have been added yet.</p>
              <p className="text-sm text-muted-foreground mt-2">Add passages through the questions interface.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {passages.map((passage, idx) => (
              <Card key={idx}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Badge variant="outline">Passage {passage.part_number}</Badge>
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-2">
                        {passage.questions.length} question{passage.questions.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Passage Text</Label>
                    <Textarea
                      value={passage.passage_text}
                      onChange={(e) => {
                        const updated = [...passages];
                        updated[idx].passage_text = e.target.value;
                        setPassages(updated);
                      }}
                      placeholder="Enter the reading passage text..."
                      className="min-h-40 font-mono text-sm"
                      disabled={isLocked && !isModifying}
                    />
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <p className="font-medium mb-2">Questions in this passage:</p>
                    <ul className="space-y-1 text-sm">
                      {passage.questions.map((q: any, qIdx: number) => (
                        <li key={qIdx} className="text-muted-foreground">
                          Q{qIdx + 1}: {q.question_text?.substring(0, 50)}...
                        </li>
                      ))}
                    </ul>
                  </div>

                  {!isLocked || isModifying ? (
                    <Button 
                      onClick={() => savePassage(passage.part_number)}
                      className="w-full gap-2"
                    >
                      <Save className="w-4 h-4" />
                      Save Passage {passage.part_number}
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminIELTSReadingTest;
