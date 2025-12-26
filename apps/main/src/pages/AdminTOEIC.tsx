import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { BookOpen, Headphones, Plus, Edit3, Check, X, Trash2, Users, BarChart3, FileText, Image, Eye, EyeOff } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface TOEICTest {
  id: string;
  test_name: string;
  test_type: string;
  module: string;
  skill_category: string | null;
  test_subtype: string | null;
  created_at: string;
}

const AdminTOEIC = () => {
  const navigate = useNavigate();
  const { admin, loading } = useAdminAuth();
  const [listeningTests, setListeningTests] = useState<TOEICTest[]>([]);
  const [readingTests, setReadingTests] = useState<TOEICTest[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [listeningTestName, setListeningTestName] = useState("");
  const [readingTestName, setReadingTestName] = useState("");
  const [selectedReadingPart, setSelectedReadingPart] = useState<string>("Part5");
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const [editingTestName, setEditingTestName] = useState("");
  const [activeTab, setActiveTab] = useState("listening");
  const [stats, setStats] = useState({
    totalTests: 0,
    listeningTests: 0,
    readingTests: 0,
    totalQuestions: 0
  });

  const loadTests = async () => {
    try {
      // Load TOEIC Listening tests
      let { data: listening, error: listeningError } = await supabase
        .from('tests')
        .select('*')
        .eq('test_type', 'TOEIC')
        .eq('skill_category', 'Listening')
        .order('created_at', { ascending: false });

      if (listeningError) throw listeningError;
      setListeningTests(listening || []);

      // Load TOEIC Reading tests
      let { data: reading, error: readingError } = await supabase
        .from('tests')
        .select('*')
        .eq('test_type', 'TOEIC')
        .eq('skill_category', 'Reading')
        .order('created_at', { ascending: false });

      if (readingError) throw readingError;
      setReadingTests(reading || []);

      // Update stats
      setStats({
        totalTests: (listening?.length || 0) + (reading?.length || 0),
        listeningTests: listening?.length || 0,
        readingTests: reading?.length || 0,
        totalQuestions: 0 // Could be calculated from questions table
      });
    } catch (error) {
      console.error('Error loading tests:', error);
      toast.error('Failed to load tests');
    }
  };

  const createNewTest = async (skillCategory: 'Listening' | 'Reading') => {
    const testName = skillCategory === 'Listening' ? listeningTestName : readingTestName;

    if (!testName.trim()) {
      toast.error('Please enter a test name');
      return;
    }

    setIsCreating(true);
    try {
      // Build the request body
      const requestBody: any = {
        test_name: testName,
        test_type: 'TOEIC',
        module: skillCategory,
        skill_category: skillCategory
      };

      // Add test_subtype for Reading tests
      if (skillCategory === 'Reading') {
        requestBody.test_subtype = selectedReadingPart;
      }

      // Use edge function to bypass RLS
      const { data: result, error: invokeError } = await supabase.functions.invoke('create-test', {
        body: requestBody
      });

      if (invokeError) {
        throw new Error(invokeError.message || 'Failed to create test');
      }

      if (result.error) {
        throw new Error(result.error);
      }

      const partLabel = skillCategory === 'Reading' ? ` (${selectedReadingPart.replace('Part', 'Part ')})` : '';
      toast.success(`TOEIC ${skillCategory}${partLabel} test created successfully`);
      if (skillCategory === 'Listening') setListeningTestName('');
      else setReadingTestName('');
      loadTests();

      // Navigate to the test management page
      if (result.data) {
        navigate(`/admin/toeic/${skillCategory.toLowerCase()}/${result.data.id}`);
      }
    } catch (error) {
      console.error('Error creating test:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create test');
    } finally {
      setIsCreating(false);
    }
  };

  const startEditingTest = (test: TOEICTest) => {
    setEditingTestId(test.id);
    setEditingTestName(test.test_name);
  };

  const cancelEditingTest = () => {
    setEditingTestId(null);
    setEditingTestName("");
  };

  const saveEditedTestName = async () => {
    if (!editingTestName.trim()) {
      toast.error('Test name cannot be empty');
      return;
    }

    try {
      const { error } = await supabase
        .from('tests')
        .update({ test_name: editingTestName })
        .eq('id', editingTestId);

      if (error) throw error;

      toast.success('Test name updated successfully');
      setEditingTestId(null);
      setEditingTestName("");
      loadTests();
    } catch (error) {
      console.error('Error updating test name:', error);
      toast.error('Failed to update test name');
    }
  };

  const deleteTest = async (testId: string, testName: string) => {
    try {
      // Use edge function to bypass RLS
      const { data: result, error: invokeError } = await supabase.functions.invoke('delete-test', {
        body: { testId }
      });

      if (invokeError) {
        throw new Error(invokeError.message || 'Failed to delete test');
      }

      if (result.error) {
        throw new Error(result.error);
      }

      toast.success(`Test "${testName}" deleted successfully`);
      loadTests();
    } catch (error) {
      console.error('Error deleting test:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete test');
    }
  };

  useEffect(() => {
    if (!loading) {
      if (!admin) {
        navigate('/admin/login');
      } else {
        loadTests();
      }
    }
  }, [admin, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading TOEIC Admin...</p>
        </div>
      </div>
    );
  }

  if (!admin) {
    return null;
  }

  const TestCard = ({ test, skillCategory }: { test: TOEICTest; skillCategory: string }) => (
    <Card
      key={test.id}
      className="hover:shadow-lg transition-shadow border-l-4 border-l-[#A68B5B] bg-[#FFFAF0] border-[#E8D5A3]"
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {skillCategory === 'Listening' ? (
              <Headphones className="w-5 h-5 text-[#8B6914]" />
            ) : (
              <BookOpen className="w-5 h-5 text-[#8B6914]" />
            )}
            {editingTestId === test.id ? (
              <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                <Input
                  value={editingTestName}
                  onChange={(e) => setEditingTestName(e.target.value)}
                  className="text-lg font-semibold h-8 bg-white/50 border-[#E8D5A3]"
                  onKeyPress={(e) => e.key === 'Enter' && saveEditedTestName()}
                />
                <Button size="sm" variant="ghost" onClick={saveEditedTestName}>
                  <Check className="w-4 h-4 text-green-600" />
                </Button>
                <Button size="sm" variant="ghost" onClick={cancelEditingTest}>
                  <X className="w-4 h-4 text-red-600" />
                </Button>
              </div>
            ) : (
              <span
                className="text-[#5D4E37] font-semibold hover:underline cursor-pointer"
                onClick={() => navigate(`/admin/toeic/${skillCategory.toLowerCase()}/${test.id}`)}
              >
                {test.test_name}
              </span>
            )}
          </div>
          {editingTestId !== test.id && (
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  startEditingTest(test);
                }}
              >
                <Edit3 className="w-4 h-4 text-[#8B6914]" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-[#FFFAF0] border-[#E8D5A3]">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-[#5D4E37]">Delete Test</AlertDialogTitle>
                    <AlertDialogDescription className="text-[#8B6914]">
                      Are you sure you want to delete "{test.test_name}"? This will also delete all questions. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel
                      className="bg-white border-[#E8D5A3] text-[#5D4E37]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTest(test.id, test.test_name);
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </CardTitle>
        <CardDescription className="text-[#8B6914]">
          Created: {new Date(test.created_at).toLocaleDateString()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-sm text-[#8B6914]">
          <Badge variant="outline" className="bg-[#FFFAF0] text-[#8B6914] border-[#E8D5A3]">
            {skillCategory}
          </Badge>
          <span>
            {skillCategory === 'Listening'
              ? 'Parts 1-4 (100 Q)'
              : test.test_subtype
                ? `${test.test_subtype.replace('Part', 'Part ')} (${test.test_subtype === 'Part5' ? '30' : test.test_subtype === 'Part6' ? '16' : '54'} Q)`
                : 'Parts 5-7'
            }
          </span>
        </div>
        <Button
          size="sm"
          className="w-full mt-3 bg-[#A68B5B] hover:bg-[#8B6914] text-white"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/admin/toeic/${skillCategory.toLowerCase()}/${test.id}`);
          }}
          disabled={editingTestId === test.id}
        >
          Manage Test
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <AdminLayout title="TOEIC Administration" showBackButton={true} backPath="/admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#5D4E37]">
              TOEIC Admin Portal
            </h1>
            <p className="text-[#8B6914]">
              Manage TOEIC Listening and Reading tests
            </p>
          </div>
          <Badge variant="secondary" className="text-sm bg-[#A68B5B] text-white">
            TOEIC Module
          </Badge>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-[#A68B5B] bg-[#FFFAF0] border-[#E8D5A3]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-[#5D4E37]">Total Tests</CardTitle>
              <FileText className="h-4 w-4 text-[#8B6914]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#5D4E37]">{stats.totalTests}</div>
              <p className="text-xs text-[#8B6914]">
                TOEIC practice tests
              </p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-[#C97D60] bg-[#FFFAF0] border-[#E8D5A3]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-[#5D4E37]">Listening Tests</CardTitle>
              <Headphones className="h-4 w-4 text-[#8B6914]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#5D4E37]">{stats.listeningTests}</div>
              <p className="text-xs text-[#8B6914]">
                Parts 1-4 (100 questions each)
              </p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-[#8B6914] bg-[#FFFAF0] border-[#E8D5A3]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-[#5D4E37]">Reading Tests</CardTitle>
              <BookOpen className="h-4 w-4 text-[#8B6914]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#5D4E37]">{stats.readingTests}</div>
              <p className="text-xs text-[#8B6914]">
                Parts 5-7 (100 questions each)
              </p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-[#5D4E37] bg-[#FFFAF0] border-[#E8D5A3]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-[#5D4E37]">TOEIC Structure</CardTitle>
              <BarChart3 className="h-4 w-4 text-[#8B6914]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#5D4E37]">200</div>
              <p className="text-xs text-[#8B6914]">
                Questions per full test
              </p>
            </CardContent>
          </Card>
        </div>

        {/* TOEIC Structure Overview */}
        <Card className="bg-[#FFFAF0] border-[#E8D5A3]">
          <CardHeader>
            <CardTitle className="text-[#5D4E37]">TOEIC Test Structure</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold flex items-center gap-2 mb-3 text-[#5D4E37]">
                  <Headphones className="w-4 h-4 text-[#8B6914]" />
                  Listening (45 min, 100 Q)
                </h4>
                <ul className="space-y-2 text-sm text-[#8B6914]">
                  <li className="flex justify-between"><span>Part 1: Photos</span><span className="font-medium text-[#5D4E37]">6 Q</span></li>
                  <li className="flex justify-between"><span>Part 2: Question-Response</span><span className="font-medium text-[#5D4E37]">25 Q</span></li>
                  <li className="flex justify-between"><span>Part 3: Conversations</span><span className="font-medium text-[#5D4E37]">39 Q</span></li>
                  <li className="flex justify-between"><span>Part 4: Talks</span><span className="font-medium text-[#5D4E37]">30 Q</span></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold flex items-center gap-2 mb-3 text-[#5D4E37]">
                  <BookOpen className="w-4 h-4 text-[#8B6914]" />
                  Reading (75 min, 100 Q)
                </h4>
                <ul className="space-y-2 text-sm text-[#8B6914]">
                  <li className="flex justify-between"><span>Part 5: Incomplete Sentences</span><span className="font-medium text-[#5D4E37]">40 Q</span></li>
                  <li className="flex justify-between"><span>Part 6: Text Completion</span><span className="font-medium text-[#5D4E37]">12 Q</span></li>
                  <li className="flex justify-between"><span>Part 7: Reading Comprehension</span><span className="font-medium text-[#5D4E37]">48 Q</span></li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator className="bg-[#E8D5A3]" />

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 bg-[#E8D5A3]/20 border border-[#E8D5A3]">
            <TabsTrigger value="listening" className="flex items-center gap-2 data-[state=active]:bg-[#FFFAF0] data-[state=active]:text-[#5D4E37] text-[#8B6914]">
              <Headphones className="w-4 h-4" />
              Listening Tests
            </TabsTrigger>
            <TabsTrigger value="reading" className="flex items-center gap-2 data-[state=active]:bg-[#FFFAF0] data-[state=active]:text-[#5D4E37] text-[#8B6914]">
              <BookOpen className="w-4 h-4" />
              Reading Tests
            </TabsTrigger>
          </TabsList>

          <TabsContent value="listening" className="space-y-4">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-[#5D4E37]">TOEIC Listening Tests</h3>
                  <p className="text-[#8B6914]">
                    Parts 1-4: Photos, Question-Response, Conversations, Talks
                  </p>
                </div>
                <div className="flex gap-3 items-end">
                  <Input
                    placeholder="Test name (e.g., TOEIC Listening Test 1)"
                    value={listeningTestName}
                    onChange={(e) => setListeningTestName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && createNewTest('Listening')}
                    className="max-w-sm bg-white/50 border-[#E8D5A3] focus:border-[#8B6914] focus:ring-[#8B6914]"
                  />
                  <Button
                    onClick={() => createNewTest('Listening')}
                    disabled={isCreating}
                    className="bg-[#A68B5B] hover:bg-[#8B6914] text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {isCreating ? "Creating..." : "Create Test"}
                  </Button>
                </div>
              </div>

              {listeningTests.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {listeningTests.map((test) => (
                    <TestCard key={test.id} test={test} skillCategory="Listening" />
                  ))}
                </div>
              ) : (
                <Card className="border-dashed border-[#E8D5A3] bg-[#FFFAF0]/50">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Headphones className="w-12 h-12 text-[#A68B5B] mb-4" />
                    <h3 className="text-lg font-semibold mb-2 text-[#5D4E37]">No Listening tests yet</h3>
                    <p className="text-[#8B6914] mb-4 text-center">
                      Create your first TOEIC Listening test with Parts 1-4
                    </p>
                    <div className="flex gap-3 items-center">
                      <Input
                        placeholder="Test name"
                        value={listeningTestName}
                        onChange={(e) => setListeningTestName(e.target.value)}
                        className="max-w-xs bg-white/50 border-[#E8D5A3]"
                      />
                      <Button
                        onClick={() => createNewTest('Listening')}
                        className="bg-[#A68B5B] hover:bg-[#8B6914] text-white"
                      >
                        Create First Test
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="reading" className="space-y-4">
            <div className="space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-[#5D4E37]">TOEIC Reading Tests</h3>
                  <p className="text-[#8B6914]">
                    Create separate tests for Part 5, 6, or 7
                  </p>
                </div>
                <div className="flex gap-3 items-end flex-wrap">
                  {/* Part Selection */}
                  <div className="space-y-1">
                    <label className="text-xs text-[#8B6914] font-medium">Select Part *</label>
                    <select
                      value={selectedReadingPart}
                      onChange={(e) => setSelectedReadingPart(e.target.value)}
                      className="h-10 px-3 rounded-md border border-[#E8D5A3] bg-white/50 text-[#5D4E37] focus:border-[#8B6914] focus:ring-[#8B6914] focus:outline-none"
                    >
                      <option value="Part5">Part 5 - Incomplete Sentences (30 Q)</option>
                      <option value="Part6">Part 6 - Text Completion (16 Q)</option>
                      <option value="Part7">Part 7 - Reading Comprehension (54 Q)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-[#8B6914] font-medium">Test Name</label>
                    <Input
                      placeholder={`e.g., TOEIC ${selectedReadingPart.replace('Part', 'Part ')} - Test 1`}
                      value={readingTestName}
                      onChange={(e) => setReadingTestName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && createNewTest('Reading')}
                      className="w-64 bg-white/50 border-[#E8D5A3] focus:border-[#8B6914] focus:ring-[#8B6914]"
                    />
                  </div>
                  <Button
                    onClick={() => createNewTest('Reading')}
                    disabled={isCreating}
                    className="bg-[#A68B5B] hover:bg-[#8B6914] text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {isCreating ? "Creating..." : "Create Test"}
                  </Button>
                </div>
              </div>

              {readingTests.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {readingTests.map((test) => (
                    <TestCard key={test.id} test={test} skillCategory="Reading" />
                  ))}
                </div>
              ) : (
                <Card className="border-dashed border-[#E8D5A3] bg-[#FFFAF0]/50">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <BookOpen className="w-12 h-12 text-[#A68B5B] mb-4" />
                    <h3 className="text-lg font-semibold mb-2 text-[#5D4E37]">No Reading tests yet</h3>
                    <p className="text-[#8B6914] mb-4 text-center">
                      Create separate tests for Part 5, 6, or 7
                    </p>
                    <div className="flex gap-3 items-center flex-wrap justify-center">
                      <select
                        value={selectedReadingPart}
                        onChange={(e) => setSelectedReadingPart(e.target.value)}
                        className="h-10 px-3 rounded-md border border-[#E8D5A3] bg-white/50 text-[#5D4E37]"
                      >
                        <option value="Part5">Part 5</option>
                        <option value="Part6">Part 6</option>
                        <option value="Part7">Part 7</option>
                      </select>
                      <Input
                        placeholder="Test name"
                        value={readingTestName}
                        onChange={(e) => setReadingTestName(e.target.value)}
                        className="max-w-xs bg-white/50 border-[#E8D5A3]"
                      />
                      <Button
                        onClick={() => createNewTest('Reading')}
                        className="bg-[#A68B5B] hover:bg-[#8B6914] text-white"
                      >
                        Create First Test
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Features Overview */}
        <div className="grid md:grid-cols-2 gap-4 mt-6">
          <Card className="border-2 border-dashed border-[#E8D5A3] bg-[#FFFAF0] hover:bg-[#FDF6E3] transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-[#5D4E37]">
                <Image className="w-5 h-5 text-[#8B6914]" />
                AI Screenshot Parsing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[#8B6914]">
                Upload screenshots of TOEIC tests and let AI extract questions automatically.
                Supports all question types including passages with multiple questions.
              </p>
            </CardContent>
          </Card>
          <Card className="border-2 border-dashed border-[#E8D5A3] bg-[#FFFAF0] hover:bg-[#FDF6E3] transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-[#5D4E37]">
                <FileText className="w-5 h-5 text-[#8B6914]" />
                Copy-Paste Import
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[#8B6914]">
                Paste questions directly from text. AI will parse the format and create
                structured questions with options. Perfect for Part 5 & 6.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminTOEIC;

