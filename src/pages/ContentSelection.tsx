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
      
      if (module === 'reading') {
        // Enhanced fetching with generalized C19 fix approach for all books
        console.log('🔍 DEBUG: Fetching reading content with questions using generalized sync method...');
        
        let query = supabase
          .from('reading_passages')
          .select(`
            id,
            title,
            cambridge_book,
            test_number,
            section_number,
            part_number,
            reading_questions!inner(id)
          `)
          .order('cambridge_book', { ascending: false })
          .order('test_number', { ascending: true })
          .order('section_number', { ascending: true })
          .order('part_number', { ascending: true });

        // Apply part filter if selected
        if (selectedPart !== null) {
          query = query.eq('part_number', selectedPart);
          console.log(`🔍 DEBUG: Filtering by part ${selectedPart}`);
        }

        const { data: passages, error } = await query;

        if (error) throw error;

        console.log('✓ DEBUG: Found reading passages with questions:', passages?.length || 0);
        passages?.forEach(p => console.log(`  - ${p.cambridge_book} Section ${p.section_number} Part ${p.part_number}: ${p.reading_questions?.length || 0} questions`));

        const formattedPassages = passages?.map(passage => ({
          id: passage.id,
          title: passage.title,
          cambridge_book: passage.cambridge_book,
          test_number: passage.test_number,
          section_number: passage.section_number,
          part_number: passage.part_number || 1,
          question_count: passage.reading_questions?.length || 0
        })) || [];

        setContentItems(formattedPassages);
        groupContentByBook(formattedPassages);
        
      } else if (module === 'listening') {
        // Enhanced listening fetching with generalized sync and part filtering
        console.log('🔍 DEBUG: Fetching listening content with questions using generalized sync method...');
        
        let query = supabase
          .from('listening_sections')
          .select(`
            *,
            listening_questions!inner(id)
          `)
          .order('cambridge_book', { ascending: false })
          .order('test_number', { ascending: true })
          .order('section_number', { ascending: true })
          .order('part_number', { ascending: true });

        // Apply part filter if selected
        if (selectedPart !== null) {
          query = query.eq('part_number', selectedPart);
          console.log(`🔍 DEBUG: Filtering by part ${selectedPart}`);
        }

        const { data: sections, error } = await query;

        if (error) throw error;

        console.log('✓ DEBUG: Found listening sections with questions:', sections?.length || 0);
        sections?.forEach(s => console.log(`  - ${s.cambridge_book} Section ${s.section_number} Part ${s.part_number}: ${s.listening_questions?.length || 0} questions`));

        const formattedSections = sections?.map(section => ({
          id: section.id,
          title: section.title || `Section ${section.section_number} Part ${section.part_number}`,
          cambridge_book: section.cambridge_book,
          test_number: section.test_number,
          section_number: section.section_number,
          part_number: section.part_number || 1,
          question_count: section.listening_questions?.length || 0
        })) || [];

        setContentItems(formattedSections);
        groupContentByBook(formattedSections);
      }
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