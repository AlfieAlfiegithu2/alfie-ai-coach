import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Headphones, ArrowLeft, Clock, Target, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StudentLayout from "@/components/StudentLayout";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { useThemeStyles } from '@/hooks/useThemeStyles';

interface ContentItem {
  id: string;
  title: string;
  cambridge_book?: string;
  test_number?: number;
  section_number?: number;
  part_number?: number;
  
  question_count?: number;
}

const ContentSelection = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  // Detect module from URL path: /reading or /listening
  const module = location.pathname.includes('/reading') ? 'reading' : 'listening';
  const resolvedModule = module;
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupedContent, setGroupedContent] = useState<Record<string, ContentItem[]>>({});
  const [selectedPart, setSelectedPart] = useState<number | null>(null);
  const themeStyles = useThemeStyles();

  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const MAX_RETRIES = 2;
    
    const loadWithRetry = async (): Promise<void> => {
      try {
        await fetchContent();
      } catch (error) {
        console.error('Error loading content:', error);
        
        // Retry on failure
        if (isMounted && retryCount < MAX_RETRIES) {
          retryCount++;
          console.log(`🔄 Retrying content fetch (attempt ${retryCount}/${MAX_RETRIES})...`);
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
          if (isMounted) {
            return loadWithRetry();
          }
        }
      }
    };
    
    loadWithRetry();
    
    return () => {
      isMounted = false;
    };
  }, [module, selectedPart]);

  const fetchContent = async () => {
    try {
      setLoading(true);
      
      // Fetch from universal tables only
      console.log('🔍 DEBUG: Fetching content from universal tables...');
      
      // Get all IELTS tests - match admin panel filter exactly (module only, not skill_category)
      const moduleCapitalized = resolvedModule === 'reading' ? 'Reading' : 'Listening';
      const { data: tests, error: testsError } = await supabase
        .from('tests')
        .select('*')
        .eq('test_type', 'IELTS')
        .eq('module', moduleCapitalized)
        .order('created_at', { ascending: false });

      if (testsError) throw testsError;

      console.log(`🔍 DEBUG: Found ${tests?.length || 0} ${moduleCapitalized} tests`);

      let finalTests = tests || [];

      if (finalTests.length === 0) {
        console.log('✗ No tests found for module:', resolvedModule);
        setContentItems([]);
        setGroupedContent({});
        return;
      }

      // Get questions only for these specific tests
      const testIds = finalTests.map(t => t.id);
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('test_id, part_number, id')
        .in('test_id', testIds);

      if (questionsError) throw questionsError;

      // Group tests with their question counts - only include tests WITH questions
      const testItems: ContentItem[] = [];
      
      finalTests.forEach(test => {
        const testQuestions = questions?.filter(q => q.test_id === test.id) || [];
        // Only include tests that have at least 1 question
        if (testQuestions.length > 0) {
          const partCount = Math.max(...testQuestions.map(q => q.part_number || 1), 0);
          
          testItems.push({
            id: test.id,
            title: test.test_name || `Test ${test.test_number}`,
            cambridge_book: test.test_name || `Test ${test.test_number}`,
            test_number: test.test_number,
            section_number: 1,
            part_number: partCount,
            question_count: testQuestions.length
          });
        }
      });

      console.log('✓ DEBUG: Found tests with questions:', testItems.length);

      setContentItems(testItems);
      groupContentByBook(testItems);
      
    } catch (error: any) {
      console.error('Error fetching content:', error);
      toast({
        title: "Error",
        description: "Failed to load content",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const groupContentByBook = (items: ContentItem[]) => {
    // For now, group all tests together since they're individual full tests
    const grouped: Record<string, ContentItem[]> = {};
    const allTestsKey = 'Available Tests';
    grouped[allTestsKey] = items;
    setGroupedContent(grouped);
  };

  const handleTestSelect = (item: ContentItem) => {
    navigate(`/${resolvedModule}/${item.id}`);
  };

  const handleStartTest = (contentId: string) => {
    navigate(`/${resolvedModule}/${contentId}`);
  };

  const handleRandomTest = () => {
    if (contentItems.length > 0) {
      navigate(`/${resolvedModule}/random`);
    } else {
      toast({
        title: "No Content Available",
        description: `No ${module} content is available yet.`,
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: themeStyles.cardBackground }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading {module} content...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`min-h-screen relative ${themeStyles.theme.name === 'note' ? 'font-serif' : ''}`}
      style={{
        backgroundColor: themeStyles.theme.name === 'dark' ? themeStyles.theme.colors.background : 'transparent'
      }}
    >
      <StudentLayout title={`${resolvedModule.charAt(0).toUpperCase()}${resolvedModule.slice(1)} Tests`} showBackButton backPath="/tests" transparentBackground={true}>
        <div className="flex-1 flex justify-center py-8">
          <div className="w-full max-w-5xl mx-auto space-y-8 px-4">
            
            {/* Header Card - Like Speaking.tsx */}
            <Card 
              className="border shadow-lg"
              style={{
                backgroundColor: themeStyles.theme.name === 'dark' ? 'rgba(30, 41, 59, 0.5)' : 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(12px)',
                borderColor: themeStyles.border
              }}
            >
              <CardHeader className="pb-6">
                 <div className="text-center space-y-3">
                    <div className="w-16 h-16 mx-auto rounded-3xl bg-primary/10 flex items-center justify-center mb-2">
                       {resolvedModule === 'reading' ? (
                          <BookOpen className="w-8 h-8 text-primary" />
                        ) : (
                          <Headphones className="w-8 h-8 text-primary" />
                        )}
                    </div>
                    <CardTitle className="text-3xl font-medium bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                       {resolvedModule === 'reading' ? 'IELTS Reading' : 'IELTS Listening'} Practice
                    </CardTitle>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                      Practice with official Cambridge IELTS materials. Select a test below or start a random session.
                    </p>
                 </div>

                 <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
                    <div className="flex items-center gap-3 bg-background/50 border rounded-xl px-4 py-2 shadow-sm w-full sm:w-auto justify-between sm:justify-start" style={{ borderColor: themeStyles.border }}>
                      <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">Filter Part:</label>
                      <Select value={selectedPart?.toString() || "all"} onValueChange={(value) => setSelectedPart(value === "all" ? null : parseInt(value))}>
                        <SelectTrigger className="w-32 border-none bg-transparent shadow-none h-8 px-0 focus:ring-0 text-right sm:text-left">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border shadow-lg">
                          <SelectItem value="all">All Parts</SelectItem>
                          {(resolvedModule === 'reading' ? [1, 2, 3] : [1, 2, 3, 4]).map(part => (
                            <SelectItem key={part} value={part.toString()}>Part {part}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      onClick={handleRandomTest}
                      size="default"
                      className="rounded-xl bg-primary text-primary-foreground shadow-md hover:shadow-lg transition-all w-full sm:w-auto h-11"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Start Random Test
                    </Button>
                 </div>
              </CardHeader>
            </Card>

            {/* Content Grid */}
            <div className="space-y-6">
              {Object.values(groupedContent)
                .sort((a, b) => parseInt(b[0]?.cambridge_book?.replace(/\D/g, '') || '0') - parseInt(a[0]?.cambridge_book?.replace(/\D/g, '') || '0'))
                .map((bookItems) => {
                  const bookNumber = bookItems[0]?.cambridge_book || 'Unknown Book';
                  const totalQuestions = bookItems.reduce((sum, item) => sum + (item.question_count || 0), 0);
                  
                  return (
                    <Card 
                      key={bookNumber} 
                      className="overflow-hidden border shadow-sm rounded-3xl transition-all hover:shadow-md"
                      style={{
                         backgroundColor: themeStyles.cardBackground,
                         borderColor: themeStyles.border
                      }}
                    >
                      <CardHeader className="pb-4 border-b bg-muted/20" style={{ borderColor: themeStyles.border }}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="bg-background/50 backdrop-blur">
                              {resolvedModule === 'reading' ? 'Reading' : 'Listening'}
                            </Badge>
                            <CardTitle className="text-lg font-bold font-georgia" style={{ color: themeStyles.textPrimary }}>
                              {bookNumber}
                            </CardTitle>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono bg-background/50 px-2 py-1 rounded-md border" style={{ borderColor: themeStyles.border }}>
                            <Target className="w-3 h-3" />
                            {totalQuestions} Questions
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                          {bookItems.map((item) => (
                            <Button
                              key={item.id}
                              variant="outline"
                              onClick={() => handleTestSelect(item)}
                              className="h-auto py-4 flex flex-col gap-2 rounded-2xl hover:bg-primary/5 hover:border-primary/30 transition-all group"
                              style={{ 
                                borderColor: themeStyles.border,
                                backgroundColor: themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.03)' : 'white'
                              }}
                            >
                               <div className="w-10 h-10 rounded-full bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                                  <span className="font-bold text-sm group-hover:text-primary" style={{ color: themeStyles.textPrimary }}>
                                    {item.test_number || '?'}
                                  </span>
                               </div>
                               <div className="text-center">
                                 <div className="text-sm font-medium group-hover:text-primary transition-colors" style={{ color: themeStyles.textPrimary }}>
                                   Test {item.test_number}
                                 </div>
                                 <div className="text-xs text-muted-foreground mt-0.5">
                                   {item.question_count} Qs
                                 </div>
                               </div>
                            </Button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>

            {contentItems.length === 0 && !loading && (
              <div className="text-center py-20 bg-muted/20 rounded-3xl border border-dashed" style={{ borderColor: themeStyles.border }}>
                <div className="max-w-md mx-auto">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    {resolvedModule === 'reading' ? (
                      <BookOpen className="w-8 h-8 text-muted-foreground" />
                    ) : (
                      <Headphones className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  <h3 className="text-lg font-medium mb-2" style={{ color: themeStyles.textPrimary }}>No Content Available</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    No {module} tests have been uploaded yet. Please check back soon.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/tests')}
                    className="rounded-xl"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Tests
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </StudentLayout>
    </div>
  );
};

export default ContentSelection;