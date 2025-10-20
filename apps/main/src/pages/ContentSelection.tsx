import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Headphones, ArrowLeft, Clock, Target, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StudentLayout from "@/components/StudentLayout";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  const { module } = useParams(); // 'reading' or 'listening'
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupedContent, setGroupedContent] = useState<Record<string, ContentItem[]>>({});
  const [selectedPart, setSelectedPart] = useState<number | null>(null);

  useEffect(() => {
    fetchContent();
  }, [module, selectedPart]);

  const fetchContent = async () => {
    try {
      setLoading(true);
      
      // Fetch from universal tables only
      console.log('🔍 DEBUG: Fetching content from universal tables...');
      
      // Get all tests that have questions
      const { data: tests, error: testsError } = await supabase
        .from('tests')
        .select('*')
        .eq('test_type', 'IELTS')
        .eq('module', module === 'reading' ? 'Reading' : 'Listening')
        .order('test_number', { ascending: true });

      if (testsError) throw testsError;

      // Get all questions for these tests
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('test_id, part_number, id');

      if (questionsError) throw questionsError;

      // Group tests with their question counts
      const testItems: ContentItem[] = [];
      
      tests?.forEach(test => {
        const testQuestions = questions?.filter(q => q.test_id === test.id) || [];
        
        // Group by part number
        const partCounts = testQuestions.reduce((acc: Record<number, number>, q) => {
          acc[q.part_number] = (acc[q.part_number] || 0) + 1;
          return acc;
        }, {});

        // Create items for each part that has questions
        Object.entries(partCounts).forEach(([partNum, count]) => {
          const partNumber = parseInt(partNum);
          
          // Apply part filter if selected
          if (selectedPart !== null && partNumber !== selectedPart) {
            return;
          }

          testItems.push({
            id: `${test.id}-${partNumber}`,
            title: `${test.test_name} - Part ${partNumber}`,
            cambridge_book: test.test_name.includes('Cambridge') ? test.test_name : `Cambridge ${parseInt(test.test_name.match(/\d+/)?.[0] || '1')}`,
            test_number: parseInt(test.test_name.match(/\d+/)?.[0] || '1'),
            section_number: 1, // Default section
            part_number: partNumber,
            question_count: count
          });
        });
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
    const grouped: Record<string, ContentItem[]> = {};
    items.forEach(item => {
      const bookKey = item.cambridge_book || 'Unknown';
      if (!grouped[bookKey]) {
        grouped[bookKey] = [];
      }
      grouped[bookKey].push(item);
    });
    setGroupedContent(grouped);
  };

  const handleTestSelect = (item: ContentItem) => {
    navigate(`/${module}/${item.id}`);
  };

  const handleStartTest = (contentId: string) => {
    navigate(`/${module}/${contentId}`);
  };

  const handleRandomTest = () => {
    if (contentItems.length > 0) {
      navigate(`/${module}/random`);
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
      <StudentLayout title={`${module?.charAt(0).toUpperCase()}${module?.slice(1)} Tests`} showBackButton backPath="/tests">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-warm-gray">Loading {module} content...</p>
          </div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout title={`${module?.charAt(0).toUpperCase()}${module?.slice(1)} Tests`} showBackButton backPath="/tests">
      <div className="max-w-7xl mx-auto p-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            {module === 'reading' ? (
              <BookOpen className="w-8 h-8 text-primary" />
            ) : (
              <Headphones className="w-8 h-8 text-primary" />
            )}
            <h1 className="text-4xl font-georgia font-bold text-foreground">
              {module === 'reading' ? 'Reading' : 'Listening'} Practice
            </h1>
          </div>
          <p className="text-lg text-warm-gray mb-6">
            Practice with uploaded Cambridge IELTS materials
          </p>

          {/* Part Filter */}
          <div className="mb-6">
            <div className="flex items-center justify-center gap-4">
              <label className="text-sm font-medium text-foreground">Filter by Part:</label>
              <Select value={selectedPart?.toString() || "all"} onValueChange={(value) => setSelectedPart(value === "all" ? null : parseInt(value))}>
                <SelectTrigger className="w-32 rounded-xl border-light-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-light-border bg-card">
                  <SelectItem value="all">All Parts</SelectItem>
                  {(module === 'reading' ? [1, 2, 3] : [1, 2, 3, 4]).map(part => (
                    <SelectItem key={part} value={part.toString()}>Part {part}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Random Test Button */}
          <Button
            onClick={handleRandomTest}
            size="lg"
            className="rounded-xl mb-8"
            style={{ background: 'var(--gradient-button)', border: 'none' }}
          >
            <Play className="w-5 h-5 mr-2" />
            Start Random Test
          </Button>
        </div>

        {/* Cambridge Books - Horizontal Layout */}
        <div className="space-y-6">
          {Object.values(groupedContent)
            .sort((a, b) => parseInt(b[0]?.cambridge_book?.replace(/\D/g, '') || '0') - parseInt(a[0]?.cambridge_book?.replace(/\D/g, '') || '0'))
            .map((bookItems) => {
              const bookNumber = bookItems[0]?.cambridge_book || 'Unknown';
              const totalQuestions = bookItems.reduce((sum, item) => sum + (item.question_count || 0), 0);
              
              return (
                <Card key={bookNumber} className="rounded-2xl border-light-border bg-white shadow-soft">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {module === 'reading' ? (
                          <BookOpen className="w-5 h-5 text-gentle-blue" />
                        ) : (
                          <Headphones className="w-5 h-5 text-warm-coral" />
                        )}
                        <CardTitle className="text-xl font-georgia">
                          {bookNumber}
                        </CardTitle>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {totalQuestions} questions
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Horizontal grid for sections/tests within each book */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                      {bookItems.map((item) => (
                        <Button 
                          key={item.id}
                          variant="outline" 
                          onClick={() => handleTestSelect(item)}
                          className="rounded-xl text-center hover:bg-gentle-blue/10 transition-colors h-auto p-3 flex flex-col items-center justify-center min-h-[80px]"
                        >
                          <div className="text-center">
                            <div className="flex items-center justify-center mb-1">
                              <span className="font-medium text-sm">
                                S{item.section_number} P{item.part_number}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
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
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              {module === 'reading' ? (
                <BookOpen className="w-16 h-16 text-warm-gray mx-auto mb-4" />
              ) : (
                <Headphones className="w-16 h-16 text-warm-gray mx-auto mb-4" />
              )}
              <h3 className="text-xl font-semibold text-foreground mb-2">No Content Available</h3>
              <p className="text-warm-gray mb-6">
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
    </StudentLayout>
  );
};

export default ContentSelection;