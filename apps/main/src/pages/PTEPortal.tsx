import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BookOpen, 
  Volume2, 
  PenTool, 
  MessageSquare, 
  Target, 
  Award, 
  Clock, 
  BarChart3,
  Headphones,
  Mic,
  FileText,
  CheckSquare,
  ListOrdered,
  ArrowLeftRight,
  Type,
  Highlighter,
  AlertCircle
} from 'lucide-react';
import StudentLayout from '@/components/StudentLayout';
import LightRays from '@/components/animations/LightRays';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import LoadingAnimation from '@/components/animations/LoadingAnimation';
import { useThemeStyles } from '@/hooks/useThemeStyles';

// PTE Question Types Configuration
const PTE_SPEAKING_WRITING_TYPES = [
  { id: 'read_aloud', name: 'Read Aloud', icon: Volume2, description: 'Read text aloud clearly' },
  { id: 'repeat_sentence', name: 'Repeat Sentence', icon: MessageSquare, description: 'Repeat exactly what you hear' },
  { id: 'describe_image', name: 'Describe Image', icon: Target, description: 'Describe an image in detail' },
  { id: 'retell_lecture', name: 'Retell Lecture', icon: Mic, description: 'Retell a lecture in your words' },
  { id: 'answer_short_question', name: 'Answer Short Question', icon: MessageSquare, description: 'Give a brief answer' },
  { id: 'summarize_group_discussion', name: 'Summarize Discussion', icon: MessageSquare, description: 'Summarize group discussion' },
  { id: 'respond_to_situation', name: 'Respond to Situation', icon: MessageSquare, description: 'Respond appropriately' },
  { id: 'summarize_written_text', name: 'Summarize Written Text', icon: FileText, description: 'Write a one-sentence summary' },
  { id: 'write_essay', name: 'Write Essay', icon: PenTool, description: 'Write a 200-300 word essay' }
];

const PTE_READING_TYPES = [
  { id: 'fill_blanks_dropdown', name: 'Fill Blanks (Dropdown)', icon: ListOrdered, description: 'Select from dropdown options' },
  { id: 'mcq_multiple_answers', name: 'MCQ Multiple Answers', icon: CheckSquare, description: 'Select all correct answers' },
  { id: 'reorder_paragraph', name: 'Reorder Paragraph', icon: ArrowLeftRight, description: 'Arrange paragraphs correctly' },
  { id: 'fill_blanks_drag_drop', name: 'Fill Blanks (Drag & Drop)', icon: Type, description: 'Drag words to fill blanks' },
  { id: 'mcq_single_answer', name: 'MCQ Single Answer', icon: CheckSquare, description: 'Select one correct answer' }
];

const PTE_LISTENING_TYPES = [
  { id: 'summarize_spoken_text', name: 'Summarize Spoken Text', icon: FileText, description: 'Write 50-70 word summary' },
  { id: 'listening_mcq_multiple', name: 'MCQ Multiple Answers', icon: CheckSquare, description: 'Select all correct answers' },
  { id: 'fill_blanks_type_in', name: 'Fill Blanks (Type In)', icon: Type, description: 'Type the missing words' },
  { id: 'highlight_correct_summary', name: 'Highlight Summary', icon: Highlighter, description: 'Select best summary' },
  { id: 'listening_mcq_single', name: 'MCQ Single Answer', icon: CheckSquare, description: 'Select one correct answer' },
  { id: 'select_missing_word', name: 'Select Missing Word', icon: AlertCircle, description: 'Select completing word' },
  { id: 'highlight_incorrect_words', name: 'Highlight Incorrect', icon: Highlighter, description: 'Click differing words' },
  { id: 'write_from_dictation', name: 'Write from Dictation', icon: PenTool, description: 'Type the sentence you hear' }
];

interface ItemCounts {
  [key: string]: number;
}

interface ListeningTest {
  id: string;
  test_name: string;
  audio_url: string | null;
  created_at: string;
}

const PTEPortal = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const themeStyles = useThemeStyles();
  const isNoteTheme = themeStyles.theme.name === 'note';
  
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('speaking-writing');
  const [itemCounts, setItemCounts] = useState<ItemCounts>({});
  const [listeningTests, setListeningTests] = useState<ListeningTest[]>([]);
  const [userProgress, setUserProgress] = useState<Record<string, number>>({});

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadItemCounts(),
        loadListeningTests(),
        user ? loadUserProgress() : Promise.resolve()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadItemCounts = async () => {
    try {
      const { data, error } = await supabase
        .from('pte_items')
        .select('pte_section_type');

      if (error) throw error;

      const counts: ItemCounts = {};
      data?.forEach(item => {
        counts[item.pte_section_type] = (counts[item.pte_section_type] || 0) + 1;
      });
      setItemCounts(counts);
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
    } catch (error) {
      console.error('Error loading listening tests:', error);
    }
  };

  const loadUserProgress = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('pte_user_progress')
        .select('pte_section_type')
        .eq('user_id', user.id)
        .eq('completed', true);

      if (error) throw error;

      const progress: Record<string, number> = {};
      data?.forEach(item => {
        progress[item.pte_section_type] = (progress[item.pte_section_type] || 0) + 1;
      });
      setUserProgress(progress);
    } catch (error) {
      console.error('Error loading user progress:', error);
    }
  };

  const handleTypeClick = (type: any, skill: 'speaking_writing' | 'reading') => {
    const count = itemCounts[type.id] || 0;
    if (count === 0) {
      return; // No items available
    }
    
    if (skill === 'speaking_writing') {
      navigate(`/pte-speaking/${type.id}`);
    } else {
      navigate(`/pte-reading/${type.id}`);
    }
  };

  const handleListeningTestClick = (testId: string) => {
    navigate(`/pte-listening/${testId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: themeStyles.theme.colors.background }}>
        <LoadingAnimation />
      </div>
    );
  }

  const TypeCard = ({ type, skill, count }: { type: any; skill: 'speaking_writing' | 'reading'; count: number }) => {
    const Icon = type.icon;
    const completed = userProgress[type.id] || 0;
    const isAvailable = count > 0;

    return (
      <Card 
        className={`relative rounded-2xl p-4 transition-all duration-200 ${
          isAvailable ? 'cursor-pointer hover:scale-[1.02]' : 'opacity-50'
        } ${!isNoteTheme ? 'bg-white/5 border-white/10 backdrop-blur-xl hover:bg-white/10' : ''}`}
        onClick={() => isAvailable && handleTypeClick(type, skill)}
        style={isNoteTheme ? { 
          backgroundColor: themeStyles.theme.colors.cardBackground, 
          borderColor: themeStyles.border,
          borderWidth: '1px'
        } : undefined}
      >
        <CardContent className="p-0 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!isNoteTheme && (
                <div className={`p-2 rounded-lg ${
                  skill === 'speaking_writing' ? 'bg-pink-500/20' : 'bg-blue-500/20'
                }`}>
                  <Icon className={`w-5 h-5 ${
                    skill === 'speaking_writing' ? 'text-pink-400' : 'text-blue-400'
                  }`} />
                </div>
              )}
              <div>
                <h3 className="font-semibold text-sm" style={{ color: themeStyles.textPrimary }}>{type.name}</h3>
                <p className="text-xs" style={{ color: isNoteTheme ? themeStyles.textSecondary : 'rgb(156 163 175)' }}>{type.description}</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-xs" style={isNoteTheme ? { backgroundColor: 'transparent', border: `1px solid ${themeStyles.border}`, color: themeStyles.textSecondary } : {
              backgroundColor: isAvailable ? 'rgba(255,255,255,0.1)' : 'rgba(55,65,81,1)',
              color: isAvailable ? 'white' : 'rgb(156,163,175)'
            }}>
              {count} items
            </Badge>
            {completed > 0 && (
              <Badge variant="secondary" className="text-xs" style={isNoteTheme ? { backgroundColor: 'transparent', border: `1px solid ${themeStyles.border}`, color: themeStyles.textSecondary } : {
                backgroundColor: 'rgba(34,197,94,0.2)',
                color: 'rgb(74,222,128)'
              }}>
                {completed} completed
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div 
      className={`min-h-screen relative ${isNoteTheme ? 'font-serif' : 'bg-gray-950'}`}
      style={isNoteTheme ? { backgroundColor: themeStyles.theme.colors.background } : undefined}
    >
      {!isNoteTheme && <LightRays 
        raysOrigin="top-center" 
        raysColor="#7C3AED" 
        raysSpeed={0.6} 
        lightSpread={2.0} 
        rayLength={1.2} 
        pulsating={false} 
        fadeDistance={0.8} 
        saturation={0.4} 
        followMouse={true} 
        mouseInfluence={0.05} 
        noiseAmount={0.02} 
        distortion={0.02} 
        className="absolute inset-0 z-0" 
      />}
      <div className="relative z-10">
        <StudentLayout title="PTE Academic Portal" showBackButton>
          <div className="space-y-8">
            {/* Header */}
            <div className="text-center">
              <Badge variant="outline" className={`mb-4 px-4 py-1 ${!isNoteTheme ? 'text-violet-400 border-violet-400/20' : ''}`}
                style={isNoteTheme ? { borderColor: themeStyles.border, color: themeStyles.textSecondary } : undefined}
              >
                PTE ACADEMIC
              </Badge>
              <h1 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: themeStyles.textPrimary }}>
                PTE Academic Test Preparation
              </h1>
              <p className="max-w-2xl mx-auto" style={{ color: isNoteTheme ? themeStyles.textSecondary : 'rgb(209 213 219)' }}>
                Practice all 22 PTE question types with AI-powered feedback
              </p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className={!isNoteTheme ? 'bg-white/5 border-white/10 backdrop-blur-xl' : ''}
                style={isNoteTheme ? { backgroundColor: themeStyles.theme.colors.cardBackground, borderColor: themeStyles.border } : undefined}
              >
                <CardContent className="p-4 text-center">
                  {!isNoteTheme && <Mic className="w-6 h-6 text-pink-400 mx-auto mb-2" />}
                  <p className="text-2xl font-bold" style={{ color: themeStyles.textPrimary }}>
                    {PTE_SPEAKING_WRITING_TYPES.reduce((sum, t) => sum + (itemCounts[t.id] || 0), 0)}
                  </p>
                  <p className="text-xs" style={{ color: isNoteTheme ? themeStyles.textSecondary : 'rgb(156 163 175)' }}>Speaking & Writing</p>
                </CardContent>
              </Card>
              <Card className={!isNoteTheme ? 'bg-white/5 border-white/10 backdrop-blur-xl' : ''}
                style={isNoteTheme ? { backgroundColor: themeStyles.theme.colors.cardBackground, borderColor: themeStyles.border } : undefined}
              >
                <CardContent className="p-4 text-center">
                  {!isNoteTheme && <BookOpen className="w-6 h-6 text-blue-400 mx-auto mb-2" />}
                  <p className="text-2xl font-bold" style={{ color: themeStyles.textPrimary }}>
                    {PTE_READING_TYPES.reduce((sum, t) => sum + (itemCounts[t.id] || 0), 0)}
                  </p>
                  <p className="text-xs" style={{ color: isNoteTheme ? themeStyles.textSecondary : 'rgb(156 163 175)' }}>Reading Items</p>
                </CardContent>
              </Card>
              <Card className={!isNoteTheme ? 'bg-white/5 border-white/10 backdrop-blur-xl' : ''}
                style={isNoteTheme ? { backgroundColor: themeStyles.theme.colors.cardBackground, borderColor: themeStyles.border } : undefined}
              >
                <CardContent className="p-4 text-center">
                  {!isNoteTheme && <Headphones className="w-6 h-6 text-green-400 mx-auto mb-2" />}
                  <p className="text-2xl font-bold" style={{ color: themeStyles.textPrimary }}>{listeningTests.length}</p>
                  <p className="text-xs" style={{ color: isNoteTheme ? themeStyles.textSecondary : 'rgb(156 163 175)' }}>Listening Tests</p>
                </CardContent>
              </Card>
              <Card className={!isNoteTheme ? 'bg-white/5 border-white/10 backdrop-blur-xl' : ''}
                style={isNoteTheme ? { backgroundColor: themeStyles.theme.colors.cardBackground, borderColor: themeStyles.border } : undefined}
              >
                <CardContent className="p-4 text-center">
                  {!isNoteTheme && <Award className="w-6 h-6 text-yellow-400 mx-auto mb-2" />}
                  <p className="text-2xl font-bold" style={{ color: themeStyles.textPrimary }}>
                    {Object.values(userProgress).reduce((sum, n) => sum + n, 0)}
                  </p>
                  <p className="text-xs" style={{ color: isNoteTheme ? themeStyles.textSecondary : 'rgb(156 163 175)' }}>Completed</p>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className={`grid w-full grid-cols-3 ${!isNoteTheme ? 'bg-white/5 border border-white/10' : ''}`}
                style={isNoteTheme ? { backgroundColor: 'transparent', borderBottom: `1px solid ${themeStyles.border}` } : undefined}
              >
                <TabsTrigger 
                  value="speaking-writing" 
                  className={!isNoteTheme ? "data-[state=active]:bg-pink-500/20 data-[state=active]:text-pink-400" : ""}
                  style={isNoteTheme ? { 
                    backgroundColor: activeTab === 'speaking-writing' ? themeStyles.theme.colors.cardBackground : 'transparent',
                    color: activeTab === 'speaking-writing' ? themeStyles.textPrimary : themeStyles.textSecondary,
                    border: activeTab === 'speaking-writing' ? `1px solid ${themeStyles.border}` : 'none',
                    borderBottom: 'none'
                  } : undefined}
                >
                  {!isNoteTheme && <Mic className="w-4 h-4 mr-2" />}
                  Speaking & Writing
                </TabsTrigger>
                <TabsTrigger 
                  value="reading"
                  className={!isNoteTheme ? "data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400" : ""}
                  style={isNoteTheme ? { 
                    backgroundColor: activeTab === 'reading' ? themeStyles.theme.colors.cardBackground : 'transparent',
                    color: activeTab === 'reading' ? themeStyles.textPrimary : themeStyles.textSecondary,
                    border: activeTab === 'reading' ? `1px solid ${themeStyles.border}` : 'none',
                    borderBottom: 'none'
                  } : undefined}
                >
                  {!isNoteTheme && <BookOpen className="w-4 h-4 mr-2" />}
                  Reading
                </TabsTrigger>
                <TabsTrigger 
                  value="listening"
                  className={!isNoteTheme ? "data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400" : ""}
                  style={isNoteTheme ? { 
                    backgroundColor: activeTab === 'listening' ? themeStyles.theme.colors.cardBackground : 'transparent',
                    color: activeTab === 'listening' ? themeStyles.textPrimary : themeStyles.textSecondary,
                    border: activeTab === 'listening' ? `1px solid ${themeStyles.border}` : 'none',
                    borderBottom: 'none'
                  } : undefined}
                >
                  {!isNoteTheme && <Headphones className="w-4 h-4 mr-2" />}
                  Listening
                </TabsTrigger>
              </TabsList>

              {/* Speaking & Writing Tab */}
              <TabsContent value="speaking-writing" className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold" style={{ color: themeStyles.textPrimary }}>Speaking & Writing (9 types)</h2>
                    <p className="text-sm" style={{ color: isNoteTheme ? themeStyles.textSecondary : 'rgb(156 163 175)' }}>Practice speaking fluency and written expression</p>
                  </div>
                  <Badge className={!isNoteTheme ? "bg-pink-500/20 text-pink-400 border-pink-400/30" : ""}
                    style={isNoteTheme ? { backgroundColor: 'transparent', border: `1px solid ${themeStyles.border}`, color: themeStyles.textSecondary } : undefined}
                  >
                    77-93 minutes in real test
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {PTE_SPEAKING_WRITING_TYPES.map((type) => (
                    <TypeCard 
                      key={type.id} 
                      type={type} 
                      skill="speaking_writing"
                      count={itemCounts[type.id] || 0}
                    />
                  ))}
                </div>
              </TabsContent>

              {/* Reading Tab */}
              <TabsContent value="reading" className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold" style={{ color: themeStyles.textPrimary }}>Reading (5 types)</h2>
                    <p className="text-sm" style={{ color: isNoteTheme ? themeStyles.textSecondary : 'rgb(156 163 175)' }}>Test your reading comprehension skills</p>
                  </div>
                  <Badge className={!isNoteTheme ? "bg-blue-500/20 text-blue-400 border-blue-400/30" : ""}
                    style={isNoteTheme ? { backgroundColor: 'transparent', border: `1px solid ${themeStyles.border}`, color: themeStyles.textSecondary } : undefined}
                  >
                    32-41 minutes in real test
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {PTE_READING_TYPES.map((type) => (
                    <TypeCard 
                      key={type.id} 
                      type={type} 
                      skill="reading"
                      count={itemCounts[type.id] || 0}
                    />
                  ))}
                </div>
              </TabsContent>

              {/* Listening Tab */}
              <TabsContent value="listening" className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold" style={{ color: themeStyles.textPrimary }}>Listening (8 types)</h2>
                    <p className="text-sm" style={{ color: isNoteTheme ? themeStyles.textSecondary : 'rgb(156 163 175)' }}>Practice with audio-based questions</p>
                  </div>
                  <Badge className={!isNoteTheme ? "bg-green-500/20 text-green-400 border-green-400/30" : ""}
                    style={isNoteTheme ? { backgroundColor: 'transparent', border: `1px solid ${themeStyles.border}`, color: themeStyles.textSecondary } : undefined}
                  >
                    45-57 minutes in real test
                  </Badge>
                </div>

                {/* Question Types Overview */}
                <Card className={!isNoteTheme ? "bg-green-500/5 border-green-500/20" : ""}
                  style={isNoteTheme ? { backgroundColor: themeStyles.theme.colors.cardBackground, borderColor: themeStyles.border } : undefined}
                >
                  <CardContent className="pt-4">
                    <h3 className={`font-medium mb-3 ${!isNoteTheme ? 'text-green-400' : ''}`} style={isNoteTheme ? { color: themeStyles.textPrimary } : undefined}>Question Types in Each Test:</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {PTE_LISTENING_TYPES.map((type) => {
                        const Icon = type.icon;
                        return (
                          <div key={type.id} className="flex items-center gap-2 text-sm">
                            {!isNoteTheme && <Icon className="w-4 h-4 text-green-400" />}
                            <span style={{ color: isNoteTheme ? themeStyles.textSecondary : 'rgb(209 213 219)' }}>{type.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Listening Tests */}
                {listeningTests.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {listeningTests.map((test) => (
                      <Card 
                        key={test.id}
                        className={`rounded-2xl p-4 transition-all duration-200 cursor-pointer ${!isNoteTheme ? 'bg-white/5 border-white/10 backdrop-blur-xl hover:bg-white/10' : ''}`}
                        onClick={() => handleListeningTestClick(test.id)}
                        style={isNoteTheme ? { backgroundColor: themeStyles.theme.colors.cardBackground, borderColor: themeStyles.border } : undefined}
                      >
                        <CardContent className="p-0 space-y-3">
                          <div className="flex items-center gap-3">
                            {!isNoteTheme && (
                              <div className="p-2 bg-green-500/20 rounded-lg">
                                <Headphones className="w-5 h-5 text-green-400" />
                              </div>
                            )}
                            <div>
                              <h3 className="font-semibold" style={{ color: themeStyles.textPrimary }}>{test.test_name}</h3>
                              <p className="text-xs" style={{ color: isNoteTheme ? themeStyles.textSecondary : 'rgb(156 163 175)' }}>8 question types</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            {test.audio_url ? (
                              <Badge className={!isNoteTheme ? "bg-green-500/20 text-green-400 text-xs" : ""}
                                style={isNoteTheme ? { backgroundColor: 'transparent', border: `1px solid ${themeStyles.border}`, color: themeStyles.textSecondary } : undefined}
                              >
                                Audio ready
                              </Badge>
                            ) : (
                              <Badge className={!isNoteTheme ? "bg-yellow-500/20 text-yellow-400 text-xs" : ""}
                                style={isNoteTheme ? { backgroundColor: 'transparent', border: `1px solid ${themeStyles.border}`, color: themeStyles.textSecondary } : undefined}
                              >
                                No audio
                              </Badge>
                            )}
                            <span className="text-xs" style={{ color: isNoteTheme ? themeStyles.textSecondary : 'rgb(107 114 128)' }}>
                              {new Date(test.created_at).toLocaleDateString()}
                            </span>
                          </div>

                          <Button 
                            className={`w-full ${!isNoteTheme ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
                            size="sm"
                            style={isNoteTheme ? { backgroundColor: themeStyles.theme.colors.buttonPrimary, color: '#FFF' } : undefined}
                          >
                            Start Practice
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className={`border-dashed ${!isNoteTheme ? 'bg-white/5 border-white/10' : ''}`}
                    style={isNoteTheme ? { backgroundColor: themeStyles.theme.colors.cardBackground, borderColor: themeStyles.border } : undefined}
                  >
                    <CardContent className="py-12 text-center">
                      {!isNoteTheme && <Headphones className="w-12 h-12 text-gray-500 mx-auto mb-4" />}
                      <p style={{ color: isNoteTheme ? themeStyles.textPrimary : 'rgb(156 163 175)' }}>No listening tests available yet</p>
                      <p className="text-sm" style={{ color: isNoteTheme ? themeStyles.textSecondary : 'rgb(107 114 128)' }}>Check back later for new content</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>

            {/* Bottom CTA */}
            <section className={`rounded-3xl p-8 backdrop-blur-xl ${!isNoteTheme ? 'bg-white/5 border border-white/10' : ''}`}
              style={isNoteTheme ? { backgroundColor: themeStyles.theme.colors.cardBackground, borderColor: themeStyles.border } : undefined}
            >
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-4" style={{ color: themeStyles.textPrimary }}>Ready to Start?</h3>
                <p className="mb-6" style={{ color: isNoteTheme ? themeStyles.textSecondary : 'rgb(156 163 175)' }}>
                  Choose a question type above to begin practicing
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button 
                    onClick={() => navigate('/dashboard')}
                    variant="outline"
                    className={!isNoteTheme ? "border-white/20 text-white hover:bg-white/10" : ""}
                    style={isNoteTheme ? { borderColor: themeStyles.border, color: themeStyles.textPrimary } : undefined}
                  >
                    My Dashboard
                  </Button>
                  <Button 
                    onClick={() => navigate('/ielts-portal')}
                    className={!isNoteTheme ? "bg-violet-600 hover:bg-violet-700 text-white" : ""}
                    style={isNoteTheme ? { backgroundColor: themeStyles.theme.colors.buttonPrimary, color: '#FFF' } : undefined}
                  >
                    Try IELTS Instead
                  </Button>
                </div>
              </div>
            </section>
          </div>
        </StudentLayout>
      </div>
    </div>
  );
};

export default PTEPortal;