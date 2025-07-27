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

        // Apply part filter if selected for listening (1-4 parts)
        if (selectedPart !== null) {
          query = query.eq('part_number', selectedPart);
          console.log(`🔍 DEBUG: Filtering listening by part ${selectedPart}`);
        }

        const { data: sections, error } = await query;

        if (error) throw error;

        console.log('✓ DEBUG: Found listening sections with questions:', sections?.length || 0);
        sections?.forEach(s => console.log(`  - ${s.cambridge_book} Section ${s.section_number} Part ${s.part_number}: ${s.listening_questions?.length || 0} questions`));

        const formattedSections = sections?.map(section => ({
          id: section.id,
          title: section.title,
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
      toast({
        title: "Error",
        description: `Failed to load ${module} content: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const groupContentByBook = (items: ContentItem[]) => {
    const grouped = items.reduce((acc, item) => {
      const bookKey = item.cambridge_book || 'Unknown';
      if (!acc[bookKey]) {
        acc[bookKey] = [];
      }
      acc[bookKey].push(item);
      return acc;
    }, {} as Record<string, ContentItem[]>);

    setGroupedContent(grouped);
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
              <span className="text-sm font-medium text-foreground">Filter by Part:</span>
              <Select 
                value={selectedPart?.toString() || "all"} 
                onValueChange={(value) => setSelectedPart(value === "all" ? null : parseInt(value))}
              >
                <SelectTrigger className="w-40 rounded-xl">
                  <SelectValue placeholder="All Parts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Parts</SelectItem>
                  <SelectItem value="1">Part 1</SelectItem>
                  <SelectItem value="2">Part 2</SelectItem>
                  <SelectItem value="3">Part 3</SelectItem>
                  {module === 'listening' && <SelectItem value="4">Part 4</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Random Test Button */}
          <Button 
            onClick={handleRandomTest}
            disabled={contentItems.length === 0}
            className="mb-8 px-8 py-3 text-lg rounded-xl"
            style={{ background: 'var(--gradient-button)' }}
          >
            <Target className="w-5 h-5 mr-2" />
            Start Random Test
          </Button>
        </div>

        {/* Content by Cambridge Books */}
        {Object.keys(groupedContent).length === 0 ? (
          <Card className="rounded-2xl border-light-border shadow-soft" style={{ background: 'var(--gradient-card)' }}>
            <CardContent className="p-12 text-center">
              <div className="mb-4">
                {module === 'reading' ? (
                  <BookOpen className="w-16 h-16 text-warm-gray mx-auto mb-4" />
                ) : (
                  <Headphones className="w-16 h-16 text-warm-gray mx-auto mb-4" />
                )}
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                No {module === 'reading' ? 'Reading' : 'Listening'} Content Available
              </h3>
              <p className="text-warm-gray mb-4">
                No {module} passages or questions have been uploaded yet. Please check back soon or contact your instructor.
              </p>
              <Button 
                variant="outline" 
                onClick={() => navigate('/tests')}
                className="rounded-xl"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Test Selection
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedContent)
              .sort(([a], [b]) => {
                // Sort books in descending order (C20, C19, ..., C1)
                const numA = parseInt(a.replace(/[^0-9]/g, '')) || 0;
                const numB = parseInt(b.replace(/[^0-9]/g, '')) || 0;
                return numB - numA;
              })
              .map(([bookName, items]) => (
                <Card key={bookName} className="rounded-2xl border-light-border shadow-soft" style={{ background: 'var(--gradient-card)' }}>
                  <CardHeader>
                    <CardTitle className="text-2xl font-georgia text-foreground flex items-center gap-3">
                      Cambridge IELTS {bookName}
                      <Badge variant="outline">{items.length} {items.length === 1 ? 'test' : 'tests'}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {items.map((item) => (
                        <Card 
                          key={item.id}
                          className="cursor-pointer transition-all duration-300 rounded-xl border-light-border hover:shadow-md hover:scale-105"
                          onClick={() => handleStartTest(item.id)}
                          style={{ background: 'white' }}
                        >
                          <CardContent className="p-6">
                            <div className="text-center mb-4">
                              <div 
                                className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-3"
                                style={{ background: 'var(--gradient-button)' }}
                              >
                                {module === 'reading' ? (
                                  <BookOpen className="w-6 h-6 text-white" />
                                ) : (
                                  <Headphones className="w-6 h-6 text-white" />
                                )}
                              </div>
                              <h4 className="font-semibold text-foreground text-sm mb-1 truncate" title={item.title}>
                                {item.title}
                              </h4>
                              <p className="text-xs text-warm-gray">
                                Test {item.test_number} - Section {item.section_number} - Part {item.part_number}
                              </p>
                            </div>
                            
                            <div className="space-y-2 text-xs text-warm-gray">
                              {item.test_number && (
                                <div className="flex justify-between">
                                  <span>Test:</span>
                                  <Badge variant="outline" className="text-xs">{item.test_number}</Badge>
                                </div>
                              )}
                              {item.section_number && (
                                <div className="flex justify-between">
                                  <span>Section:</span>
                                  <Badge variant="outline" className="text-xs">{item.section_number}</Badge>
                                </div>
                              )}
                              {item.part_number && (
                                <div className="flex justify-between">
                                  <span>Part:</span>
                                  <Badge variant="outline" className="text-xs">{item.part_number}</Badge>
                                </div>
                              )}
                              <div className="flex justify-between">
                                <span>Questions:</span>
                                <Badge variant="outline" className="text-xs">{item.question_count || 0}</Badge>
                              </div>
                            </div>
                            
                            <Button 
                              className="w-full mt-4 rounded-xl text-xs h-8"
                              style={{ background: 'var(--gradient-button)' }}
                            >
                              <Play className="w-3 h-3 mr-1" />
                              Start Test
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </div>
    </StudentLayout>
  );
};

export default ContentSelection;