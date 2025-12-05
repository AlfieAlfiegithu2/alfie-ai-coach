import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { 
  BookOpen, 
  Headphones, 
  PenTool, 
  Mic, 
  Upload, 
  Users, 
  BarChart3, 
  Image,
  MessageSquare,
  Volume2,
  FileText,
  ListOrdered,
  CheckSquare,
  ArrowLeftRight,
  Type,
  Highlighter,
  AlertCircle,
  Plus
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// PTE Question Types Configuration
// hasAIFeedback: true = Gemini 2.5 Flash provides AI evaluation
// hasAIFeedback: false = Manual scoring / sample answer comparison only
const PTE_SPEAKING_WRITING_TYPES = [
  { 
    id: 'read_aloud', 
    name: 'Read Aloud', 
    description: 'Read a text aloud with correct pronunciation and intonation',
    icon: Volume2,
    skill: 'speaking_writing',
    timeLimit: 40,
    hasAIFeedback: true,
    feedbackNote: 'AI evaluates pronunciation, fluency, and content'
  },
  { 
    id: 'repeat_sentence', 
    name: 'Repeat Sentence', 
    description: 'Listen and repeat the sentence exactly',
    icon: MessageSquare,
    skill: 'speaking_writing',
    timeLimit: 15,
    hasAIFeedback: true,
    feedbackNote: 'AI evaluates accuracy and pronunciation'
  },
  { 
    id: 'describe_image', 
    name: 'Describe Image', 
    description: 'Describe an image in detail',
    icon: Image,
    skill: 'speaking_writing',
    timeLimit: 40,
    hasAIFeedback: true,
    feedbackNote: 'AI evaluates content, fluency, and vocabulary'
  },
  { 
    id: 'retell_lecture', 
    name: 'Retell Lecture', 
    description: 'Listen to a lecture and retell it in your own words',
    icon: Mic,
    skill: 'speaking_writing',
    timeLimit: 40,
    hasAIFeedback: true,
    feedbackNote: 'AI evaluates content accuracy, fluency, and pronunciation'
  },
  { 
    id: 'answer_short_question', 
    name: 'Answer Short Question', 
    description: 'Answer a question with one or a few words',
    icon: MessageSquare,
    skill: 'speaking_writing',
    timeLimit: 10,
    hasAIFeedback: true,
    feedbackNote: 'AI checks answer correctness'
  },
  { 
    id: 'summarize_group_discussion', 
    name: 'Summarize Group Discussion', 
    description: 'Summarize the main points of a group discussion',
    icon: Users,
    skill: 'speaking_writing',
    timeLimit: 70,
    hasAIFeedback: true,
    feedbackNote: 'AI evaluates content coverage and speaking skills'
  },
  { 
    id: 'respond_to_situation', 
    name: 'Respond to a Situation', 
    description: 'Respond appropriately to a given situation',
    icon: MessageSquare,
    skill: 'speaking_writing',
    timeLimit: 40,
    hasAIFeedback: true,
    feedbackNote: 'AI evaluates appropriateness and fluency'
  },
  { 
    id: 'summarize_written_text', 
    name: 'Summarize Written Text', 
    description: 'Write a one-sentence summary of a passage',
    icon: FileText,
    skill: 'speaking_writing',
    timeLimit: 600,
    wordLimit: 75,
    hasAIFeedback: true,
    feedbackNote: 'AI evaluates grammar, vocabulary, and content'
  },
  { 
    id: 'write_essay', 
    name: 'Write Essay', 
    description: 'Write a 200-300 word argumentative essay',
    icon: PenTool,
    skill: 'speaking_writing',
    timeLimit: 1200,
    wordLimit: 300,
    hasAIFeedback: true,
    feedbackNote: 'AI evaluates structure, grammar, vocabulary, and content'
  }
];

const PTE_READING_TYPES = [
  { 
    id: 'fill_blanks_dropdown', 
    name: 'Fill in the Blanks (Dropdown)', 
    description: 'Select the correct word from dropdown options',
    icon: ListOrdered,
    skill: 'reading',
    hasAIFeedback: false,
    feedbackNote: 'Auto-scored based on correct answers'
  },
  { 
    id: 'mcq_multiple_answers', 
    name: 'Multiple Choice, Multiple Answers', 
    description: 'Select all correct answers from the options',
    icon: CheckSquare,
    skill: 'reading',
    hasAIFeedback: false,
    feedbackNote: 'Auto-scored based on correct answers'
  },
  { 
    id: 'reorder_paragraph', 
    name: 'Reorder Paragraph', 
    description: 'Arrange text boxes in the correct order',
    icon: ArrowLeftRight,
    skill: 'reading',
    hasAIFeedback: false,
    feedbackNote: 'Auto-scored based on correct order'
  },
  { 
    id: 'fill_blanks_drag_drop', 
    name: 'Fill in the Blanks (Drag and Drop)', 
    description: 'Drag words to fill in the blanks',
    icon: Type,
    skill: 'reading',
    hasAIFeedback: false,
    feedbackNote: 'Auto-scored based on correct answers'
  },
  { 
    id: 'mcq_single_answer', 
    name: 'Multiple Choice, Single Answer', 
    description: 'Select the single correct answer',
    icon: CheckSquare,
    skill: 'reading',
    hasAIFeedback: false,
    feedbackNote: 'Auto-scored based on correct answer'
  }
];

const PTE_LISTENING_TYPES = [
  { 
    id: 'summarize_spoken_text', 
    name: 'Summarize Spoken Text', 
    description: 'Write a 50-70 word summary of what you heard',
    icon: FileText,
    skill: 'listening',
    timeLimit: 600,
    hasAIFeedback: true,
    feedbackNote: 'AI evaluates content, grammar, and vocabulary'
  },
  { 
    id: 'listening_mcq_multiple', 
    name: 'Multiple Choice, Multiple Answers', 
    description: 'Select all correct answers based on the audio',
    icon: CheckSquare,
    skill: 'listening',
    hasAIFeedback: false,
    feedbackNote: 'Auto-scored based on correct answers'
  },
  { 
    id: 'fill_blanks_type_in', 
    name: 'Fill in the Blanks (Type In)', 
    description: 'Type the missing words you hear',
    icon: Type,
    skill: 'listening',
    hasAIFeedback: false,
    feedbackNote: 'Auto-scored based on correct words'
  },
  { 
    id: 'highlight_correct_summary', 
    name: 'Highlight Correct Summary', 
    description: 'Select the paragraph that best summarizes the audio',
    icon: Highlighter,
    skill: 'listening',
    hasAIFeedback: false,
    feedbackNote: 'Auto-scored based on correct selection'
  },
  { 
    id: 'listening_mcq_single', 
    name: 'Multiple Choice, Single Answer', 
    description: 'Select the single correct answer based on the audio',
    icon: CheckSquare,
    skill: 'listening',
    hasAIFeedback: false,
    feedbackNote: 'Auto-scored based on correct answer'
  },
  { 
    id: 'select_missing_word', 
    name: 'Select Missing Word', 
    description: 'Select the word that completes the recording',
    icon: AlertCircle,
    skill: 'listening',
    hasAIFeedback: false,
    feedbackNote: 'Auto-scored based on correct selection'
  },
  { 
    id: 'highlight_incorrect_words', 
    name: 'Highlight Incorrect Words', 
    description: 'Click on words that differ from the transcript',
    icon: Highlighter,
    skill: 'listening',
    hasAIFeedback: false,
    feedbackNote: 'Auto-scored based on correct highlights'
  },
  { 
    id: 'write_from_dictation', 
    name: 'Write from Dictation', 
    description: 'Type the sentence you hear',
    icon: PenTool,
    skill: 'listening',
    hasAIFeedback: false,
    feedbackNote: 'Auto-scored based on accuracy'
  }
];

interface ItemCounts {
  [key: string]: number;
}

const AdminPTE = () => {
  const navigate = useNavigate();
  const { admin, loading } = useAdminAuth();
  const [activeTab, setActiveTab] = useState("speaking-writing");
  const [itemCounts, setItemCounts] = useState<ItemCounts>({});
  const [listeningTests, setListeningTests] = useState<any[]>([]);
  const [newListeningTestName, setNewListeningTestName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [stats, setStats] = useState({
    totalItems: 0,
    speakingWritingItems: 0,
    readingItems: 0,
    listeningTests: 0
  });

  useEffect(() => {
    if (!loading && !admin) {
      navigate('/admin/login');
    } else if (admin) {
      loadItemCounts();
      loadListeningTests();
    }
  }, [admin, loading, navigate]);

  const loadItemCounts = async () => {
    try {
      // Get counts for each section type
      const { data, error } = await supabase
        .from('pte_items')
        .select('pte_section_type');

      if (error) throw error;

      const counts: ItemCounts = {};
      data?.forEach(item => {
        counts[item.pte_section_type] = (counts[item.pte_section_type] || 0) + 1;
      });

      setItemCounts(counts);

      // Calculate stats
      let speakingWriting = 0;
      let reading = 0;

      PTE_SPEAKING_WRITING_TYPES.forEach(type => {
        speakingWriting += counts[type.id] || 0;
      });

      PTE_READING_TYPES.forEach(type => {
        reading += counts[type.id] || 0;
      });

      setStats(prev => ({
        ...prev,
        totalItems: speakingWriting + reading,
        speakingWritingItems: speakingWriting,
        readingItems: reading
      }));
    } catch (error) {
      console.error('Error loading item counts:', error);
    }
  };

  const loadListeningTests = async () => {
    try {
      const { data, error } = await supabase
        .from('pte_listening_tests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setListeningTests(data || []);
      setStats(prev => ({ ...prev, listeningTests: data?.length || 0 }));
    } catch (error) {
      console.error('Error loading listening tests:', error);
    }
  };

  const createListeningTest = async () => {
    if (!newListeningTestName.trim()) {
      toast.error('Please enter a test name');
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from('pte_listening_tests')
        .insert({ test_name: newListeningTestName })
        .select()
        .single();

      if (error) throw error;

      toast.success('Listening test created');
      setNewListeningTestName('');
      loadListeningTests();

      if (data) {
        navigate(`/admin/pte/listening/${data.id}`);
      }
    } catch (error) {
      console.error('Error creating listening test:', error);
      toast.error('Failed to create listening test');
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading PTE Admin...</p>
        </div>
      </div>
    );
  }

  if (!admin) {
    return null;
  }

  const TypeCard = ({ type, count }: { type: any; count: number }) => {
    const Icon = type.icon;
    return (
      <Card 
        className="cursor-pointer hover:shadow-lg transition-all duration-300 border-l-4 border-l-violet-500 hover:scale-[1.02]"
        onClick={() => {
          if (type.skill === 'listening') {
            // For listening, go to the listening management page
            navigate('/admin/pte/listening');
          } else {
            navigate(`/admin/pte/${type.skill}/${type.id}`);
          }
        }}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
                <Icon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <CardTitle className="text-base">{type.name}</CardTitle>
              </div>
            </div>
            {count > 0 ? (
              <Badge variant="secondary" className="bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
                {count} items
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground border-dashed">
                No items
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">{type.description}</p>
          
          {/* AI Feedback Status */}
          <div className="flex items-center gap-2">
            {type.hasAIFeedback ? (
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 text-xs">
                ✨ AI Feedback (Gemini)
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs">
                Auto-scored
              </Badge>
            )}
          </div>
          
          {type.feedbackNote && (
            <p className="text-xs text-muted-foreground italic">
              {type.feedbackNote}
            </p>
          )}
          
          {type.timeLimit && (
            <p className="text-xs text-muted-foreground">
              Time: {type.timeLimit >= 60 ? `${Math.floor(type.timeLimit / 60)} min` : `${type.timeLimit} sec`}
              {type.wordLimit && ` | Words: ${type.wordLimit}`}
            </p>
          )}
          
          {/* Call to action when no items */}
          {count === 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full mt-2 border-dashed hover:bg-violet-50 dark:hover:bg-violet-900/20"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add First {type.name} Item
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <AdminLayout title="PTE Administration" showBackButton={true} backPath="/admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-500 to-purple-500 bg-clip-text text-transparent">
              PTE Admin Portal
            </h1>
            <p className="text-muted-foreground">
              Manage PTE Academic content by question type
            </p>
          </div>
          <Badge variant="secondary" className="text-sm bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
            PTE Academic
          </Badge>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-violet-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalItems}</div>
              <p className="text-xs text-muted-foreground">
                Practice items created
              </p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-pink-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Speaking & Writing</CardTitle>
              <Mic className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.speakingWritingItems}</div>
              <p className="text-xs text-muted-foreground">
                9 question types
              </p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reading</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.readingItems}</div>
              <p className="text-xs text-muted-foreground">
                5 question types
              </p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Listening Tests</CardTitle>
              <Headphones className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.listeningTests}</div>
              <p className="text-xs text-muted-foreground">
                8 question types per test
              </p>
            </CardContent>
          </Card>
        </div>

        {/* AI Feedback Info */}
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-green-700 dark:text-green-400 flex items-center gap-2 text-lg">
              ✨ AI-Powered Feedback (Gemini 2.5 Flash)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-semibold text-green-700 dark:text-green-400 mb-2">Speaking Tasks with AI Feedback:</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Read Aloud - pronunciation, fluency, content</li>
                  <li>• Repeat Sentence - accuracy, pronunciation</li>
                  <li>• Describe Image - content, fluency, vocabulary</li>
                  <li>• Retell Lecture - accuracy, fluency, pronunciation</li>
                  <li>• Answer Short Question - correctness</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-green-700 dark:text-green-400 mb-2">Writing Tasks with AI Feedback:</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Summarize Written Text - grammar, vocabulary, content</li>
                  <li>• Write Essay - structure, grammar, vocabulary, content</li>
                  <li>• Summarize Spoken Text - content, grammar, vocabulary</li>
                </ul>
                <p className="mt-2 text-xs italic">Reading & MCQ tasks are auto-scored based on correct answers.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PTE Structure Overview */}
        <Card className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20">
          <CardHeader>
            <CardTitle className="text-violet-700 dark:text-violet-400">PTE Academic Test Structure</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-semibold flex items-center gap-2 mb-3">
                  <Mic className="w-4 h-4 text-pink-500" />
                  Speaking & Writing (77-93 min)
                </h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {PTE_SPEAKING_WRITING_TYPES.map(type => (
                    <li key={type.id} className="flex justify-between">
                      <span>{type.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold flex items-center gap-2 mb-3">
                  <BookOpen className="w-4 h-4 text-blue-500" />
                  Reading (32-41 min)
                </h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {PTE_READING_TYPES.map(type => (
                    <li key={type.id}>{type.name}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold flex items-center gap-2 mb-3">
                  <Headphones className="w-4 h-4 text-green-500" />
                  Listening (45-57 min)
                </h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {PTE_LISTENING_TYPES.map(type => (
                    <li key={type.id}>{type.name}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="speaking-writing" className="flex items-center gap-2">
              <Mic className="w-4 h-4" />
              Speaking & Writing
            </TabsTrigger>
            <TabsTrigger value="reading" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Reading
            </TabsTrigger>
            <TabsTrigger value="listening" className="flex items-center gap-2">
              <Headphones className="w-4 h-4" />
              Listening
            </TabsTrigger>
          </TabsList>

          {/* Speaking & Writing Tab */}
          <TabsContent value="speaking-writing" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold">Speaking & Writing Question Types</h3>
                <p className="text-muted-foreground">
                  Click on a type to manage its content
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {PTE_SPEAKING_WRITING_TYPES.map((type) => (
                <TypeCard 
                  key={type.id} 
                  type={type} 
                  count={itemCounts[type.id] || 0} 
                />
              ))}
            </div>
          </TabsContent>

          {/* Reading Tab */}
          <TabsContent value="reading" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold">Reading Question Types</h3>
                <p className="text-muted-foreground">
                  Upload screenshots or enter content manually
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {PTE_READING_TYPES.map((type) => (
                <TypeCard 
                  key={type.id} 
                  type={type} 
                  count={itemCounts[type.id] || 0} 
                />
              ))}
            </div>
          </TabsContent>

          {/* Listening Tab */}
          <TabsContent value="listening" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold">PTE Listening Tests</h3>
                <p className="text-muted-foreground">
                  Upload audio and add questions for each type
                </p>
              </div>
              <div className="flex gap-3 items-center">
                <Input
                  placeholder="Test name (e.g., PTE Listening Test 1)"
                  value={newListeningTestName}
                  onChange={(e) => setNewListeningTestName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && createListeningTest()}
                  className="max-w-xs"
                />
                <Button 
                  onClick={createListeningTest}
                  disabled={isCreating}
                  className="bg-violet-600 hover:bg-violet-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {isCreating ? 'Creating...' : 'Create Test'}
                </Button>
              </div>
            </div>

            {/* Listening Question Types Info */}
            <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-green-700 dark:text-green-400">
                  Listening Question Types (8)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {PTE_LISTENING_TYPES.map((type) => {
                    const Icon = type.icon;
                    return (
                      <div key={type.id} className="flex items-center gap-2 text-sm">
                        <Icon className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <span className="text-muted-foreground">{type.name}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Listening Tests List */}
            {listeningTests.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {listeningTests.map((test) => (
                  <Card 
                    key={test.id}
                    className="cursor-pointer hover:shadow-lg transition-all duration-300 border-l-4 border-l-green-500"
                    onClick={() => navigate(`/admin/pte/listening/${test.id}`)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <Headphones className="w-5 h-5 text-green-600 dark:text-green-400" />
                          </div>
                          <CardTitle className="text-base">{test.test_name}</CardTitle>
                        </div>
                        {test.audio_url && (
                          <Badge variant="secondary" className="bg-green-100 text-green-700">
                            Audio ✓
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Created: {new Date(test.created_at).toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Headphones className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Listening Tests Yet</h3>
                  <p className="text-muted-foreground mb-4 text-center max-w-md">
                    Create your first PTE Listening test. Each test includes all 8 question types 
                    with audio upload support and mixed AI/auto-scoring.
                  </p>
                  <div className="flex gap-3 items-center">
                    <Input
                      placeholder="e.g., PTE Listening Test 1"
                      value={newListeningTestName}
                      onChange={(e) => setNewListeningTestName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && createListeningTest()}
                      className="max-w-xs"
                    />
                    <Button 
                      onClick={createListeningTest}
                      disabled={isCreating}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {isCreating ? 'Creating...' : 'Create First Listening Test'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Features Overview */}
        <div className="grid md:grid-cols-2 gap-4 mt-6">
          <Card className="border-2 border-dashed hover:border-violet-300 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Image className="w-5 h-5 text-violet-500" />
                AI Screenshot Parsing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Upload screenshots of PTE tests and let AI extract questions automatically.
                Supports all reading and listening question types.
              </p>
            </CardContent>
          </Card>
          <Card className="border-2 border-dashed hover:border-violet-300 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Upload className="w-5 h-5 text-violet-500" />
                Media Upload
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Upload images for Describe Image tasks, audio for listening sections,
                and manage all content types in one place.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminPTE;
