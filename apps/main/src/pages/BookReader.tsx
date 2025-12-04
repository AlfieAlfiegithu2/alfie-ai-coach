import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import StudentLayout from "@/components/StudentLayout";
import { supabase } from "@/integrations/supabase/client";
import { 
  BookOpen, 
  ChevronLeft, 
  ChevronRight, 
  Menu, 
  Home, 
  User, 
  Building2, 
  Calendar,
  BookMarked,
  ArrowLeft
} from "lucide-react";
import SEO from "@/components/SEO";

interface Book {
  id: string;
  title: string;
  author: string;
  company: string | null;
  description: string | null;
  cover_url: string | null;
  total_chapters: number;
  published_at: string;
}

interface Chapter {
  id: string;
  chapter_number: number;
  chapter_title: string | null;
  processed_content: string | null;
  word_count: number | null;
}

const BookReader = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isPreviewMode = searchParams.get('preview') === 'true';
  
  const [book, setBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isChaptersOpen, setIsChaptersOpen] = useState(false);

  useEffect(() => {
    if (bookId) {
      loadBook();
      loadChapters();
    }
  }, [bookId]);

  const loadBook = async () => {
    try {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('id', bookId)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        console.error('Book not found');
        goBack();
        return;
      }
      
      // Allow viewing if:
      // 1. Book is published (for all users)
      // 2. Preview mode is enabled (for admins)
      if (data.status !== 'published' && !isPreviewMode) {
        console.error('Book is not published yet');
        goBack();
        return;
      }
      
      setBook(data);
    } catch (error) {
      console.error('Error loading book:', error);
      goBack();
    }
  };
  
  const goBack = () => {
    // Go back to previous page if there's history, otherwise go to /books
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/books');
    }
  };

  const loadChapters = async () => {
    setIsLoading(true);
    try {
      // In preview mode, load all chapters including pending ones
      // In normal mode, only load completed chapters
      let query = supabase
        .from('book_chapters')
        .select('id, chapter_number, chapter_title, processed_content, word_count')
        .eq('book_id', bookId)
        .order('chapter_number', { ascending: true });
      
      if (!isPreviewMode) {
        query = query.eq('status', 'completed');
      }

      const { data, error } = await query;

      if (error) throw error;
      setChapters(data || []);
    } catch (error) {
      console.error('Error loading chapters:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const currentChapter = chapters[currentChapterIndex];
  
  const goToChapter = (index: number) => {
    setCurrentChapterIndex(index);
    setIsChaptersOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const nextChapter = () => {
    if (currentChapterIndex < chapters.length - 1) {
      goToChapter(currentChapterIndex + 1);
    }
  };

  const prevChapter = () => {
    if (currentChapterIndex > 0) {
      goToChapter(currentChapterIndex - 1);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Format content with proper paragraphs
  const formatContent = (content: string) => {
    return content
      .split('\n\n')
      .filter(p => p.trim())
      .map((paragraph, index) => (
        <p key={index} className="mb-4 leading-relaxed">
          {paragraph.trim()}
        </p>
      ));
  };

  if (isLoading && !book) {
    return (
      <StudentLayout>
        <div className="container max-w-4xl mx-auto px-4 py-8">
          <Skeleton className="h-12 w-3/4 mb-4" />
          <Skeleton className="h-6 w-1/2 mb-8" />
          <div className="space-y-4">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </div>
      </StudentLayout>
    );
  }

  if (!book) {
    return (
      <StudentLayout>
        <div className="container max-w-4xl mx-auto px-4 py-16 text-center">
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Book not found</h2>
          <p className="text-muted-foreground mb-4">
            This book may have been removed or is not available.
          </p>
          <Button onClick={goBack}>
            Go Back
          </Button>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <SEO 
        title={`${book.title} | English AIdol Books`}
        description={book.description || `Read ${book.title} by ${book.author}`}
      />

      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        {/* Preview Mode Banner */}
        {isPreviewMode && (
          <div className="bg-amber-500/90 text-white text-center py-2 text-sm font-medium">
            📖 Preview Mode - This book is not published yet
          </div>
        )}
        
        {/* Top Navigation Bar */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b">
          <div className="container max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goBack}
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  {isPreviewMode ? 'Back' : 'Library'}
                </Button>
                <Separator orientation="vertical" className="h-6" />
                <span className="text-sm font-medium text-muted-foreground truncate max-w-[200px]">
                  {book.title}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  Chapter {currentChapterIndex + 1} of {chapters.length}
                </span>
                
                {/* Mobile Chapter Menu */}
                <Sheet open={isChaptersOpen} onOpenChange={setIsChaptersOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Menu className="w-4 h-4 mr-2" />
                      Chapters
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-80">
                    <SheetHeader>
                      <SheetTitle className="flex items-center gap-2">
                        <BookMarked className="w-5 h-5" />
                        Chapters
                      </SheetTitle>
                    </SheetHeader>
                    <ScrollArea className="h-[calc(100vh-100px)] mt-4">
                      <div className="space-y-1 pr-4">
                        {chapters.map((chapter, index) => (
                          <Button
                            key={chapter.id}
                            variant={index === currentChapterIndex ? "secondary" : "ghost"}
                            className="w-full justify-start text-left h-auto py-3"
                            onClick={() => goToChapter(index)}
                          >
                            <div>
                              <div className="font-medium">
                                Chapter {chapter.chapter_number}
                              </div>
                              {chapter.chapter_title && (
                                <div className="text-xs text-muted-foreground truncate">
                                  {chapter.chapter_title}
                                </div>
                              )}
                              {chapter.word_count && (
                                <div className="text-xs text-muted-foreground">
                                  {chapter.word_count.toLocaleString()} words
                                </div>
                              )}
                            </div>
                          </Button>
                        ))}
                      </div>
                    </ScrollArea>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </div>
        </div>

        <div className="container max-w-4xl mx-auto px-4 py-8">
          {/* Book Header (shown on first chapter) */}
          {currentChapterIndex === 0 && (
            <Card className="mb-8 overflow-hidden">
              <div className="md:flex">
                {book.cover_url && (
                  <div className="md:w-1/3">
                    <img
                      src={book.cover_url}
                      alt={book.title}
                      className="w-full h-64 md:h-full object-cover"
                    />
                  </div>
                )}
                <CardContent className={`p-6 ${book.cover_url ? 'md:w-2/3' : 'w-full'}`}>
                  <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    {book.title}
                  </h1>
                  
                  <div className="space-y-2 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>By {book.author}</span>
                    </div>
                    {book.company && (
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        <span>{book.company}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      <span>{book.total_chapters} chapters</span>
                    </div>
                    {book.published_at && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>Published {formatDate(book.published_at)}</span>
                      </div>
                    )}
                  </div>

                  {book.description && (
                    <p className="text-muted-foreground">
                      {book.description}
                    </p>
                  )}
                </CardContent>
              </div>
            </Card>
          )}

          {/* Chapter Content */}
          {currentChapter ? (
            <div className="space-y-6">
              {/* Chapter Header */}
              <div className="text-center py-8 border-b">
                <p className="text-sm text-muted-foreground uppercase tracking-wider mb-2">
                  Chapter {currentChapter.chapter_number}
                </p>
                {currentChapter.chapter_title && (
                  <h2 className="text-2xl font-semibold">
                    {currentChapter.chapter_title}
                  </h2>
                )}
                {currentChapter.word_count && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {currentChapter.word_count.toLocaleString()} words
                  </p>
                )}
              </div>

              {/* Chapter Text */}
              <article className="prose prose-lg dark:prose-invert max-w-none">
                {currentChapter.processed_content ? (
                  formatContent(currentChapter.processed_content)
                ) : (
                  <p className="text-muted-foreground italic">
                    This chapter's content is not available.
                  </p>
                )}
              </article>

              {/* Chapter Navigation */}
              <div className="flex items-center justify-between pt-8 border-t">
                <Button
                  variant="outline"
                  onClick={prevChapter}
                  disabled={currentChapterIndex === 0}
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>

                <span className="text-sm text-muted-foreground">
                  {currentChapterIndex + 1} / {chapters.length}
                </span>

                <Button
                  onClick={nextChapter}
                  disabled={currentChapterIndex === chapters.length - 1}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>

              {/* End of Book */}
              {currentChapterIndex === chapters.length - 1 && (
                <Card className="mt-8 text-center p-8 bg-gradient-to-br from-primary/10 to-secondary/10">
                  <BookOpen className="w-12 h-12 mx-auto mb-4 text-primary" />
                  <h3 className="text-xl font-semibold mb-2">
                    You've finished the book!
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Great job completing "{book.title}"
                  </p>
                  <div className="flex justify-center gap-3">
                    <Button variant="outline" onClick={() => goToChapter(0)}>
                      <Home className="w-4 h-4 mr-2" />
                      Back to Start
                    </Button>
                    <Button onClick={goBack}>
                      {isPreviewMode ? 'Back to Admin' : 'Browse More Books'}
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          ) : (
            <div className="text-center py-16">
              <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No chapters available</h3>
              <p className="text-muted-foreground">
                This book doesn't have any readable chapters yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </StudentLayout>
  );
};

export default BookReader;

