import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import StudentLayout from "@/components/StudentLayout";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Search, Library, Clock, User, Building2 } from "lucide-react";
import SEO from "@/components/SEO";
import { useThemeStyles } from '@/hooks/useThemeStyles';

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

const BooksLibrary = () => {
  const navigate = useNavigate();
  const themeStyles = useThemeStyles();
  const isNoteTheme = themeStyles.theme.name === 'note';
  
  const [books, setBooks] = useState<Book[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadBooks();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = books.filter(
        (book) =>
          book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
          book.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredBooks(filtered);
    } else {
      setFilteredBooks(books);
    }
  }, [searchQuery, books]);

  const loadBooks = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('books')
        .select('id, title, author, company, description, cover_url, total_chapters, published_at')
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      if (error) throw error;
      setBooks(data || []);
      setFilteredBooks(data || []);
    } catch (error) {
      console.error('Error loading books:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <StudentLayout>
      <SEO 
        title="Books Library | English AIdol"
        description="Browse our collection of educational books to sharpen your English skills"
      />
      
      <div 
        className={`container max-w-7xl mx-auto px-4 py-8 space-y-8 ${isNoteTheme ? 'font-serif' : ''}`}
        style={isNoteTheme ? { backgroundColor: themeStyles.theme.colors.background } : undefined}
      >
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            {!isNoteTheme && <Library className="w-10 h-10 text-primary" />}
            <h1 
              className={`text-4xl font-bold ${!isNoteTheme ? 'bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent' : ''}`}
              style={{ color: themeStyles.textPrimary }}
            >
              Books Library
            </h1>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto" style={{ color: isNoteTheme ? themeStyles.textSecondary : undefined }}>
            Explore our collection of educational books designed to help you master English 
            and excel in your IELTS preparation.
          </p>
        </div>

        {/* Search */}
        <div className="max-w-md mx-auto">
          <div className="relative">
            {!isNoteTheme && <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />}
            <Input
              placeholder="Search books by title, author, or topic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={!isNoteTheme ? "pl-10" : ""}
              style={isNoteTheme ? { borderColor: themeStyles.border, color: themeStyles.textPrimary } : undefined}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2" style={{ color: isNoteTheme ? themeStyles.textSecondary : undefined }}>
            {!isNoteTheme && <BookOpen className="w-4 h-4" />}
            <span>{books.length} books available</span>
          </div>
        </div>

        {/* Books Grid */}
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="overflow-hidden" style={isNoteTheme ? { backgroundColor: themeStyles.theme.colors.cardBackground, borderColor: themeStyles.border } : undefined}>
                <Skeleton className="h-48 w-full" />
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2 mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3 mt-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="text-center py-16">
            {!isNoteTheme && <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />}
            {searchQuery ? (
              <>
                <h3 className="text-xl font-semibold mb-2" style={{ color: themeStyles.textPrimary }}>No books found</h3>
                <p className="text-muted-foreground mb-4" style={{ color: isNoteTheme ? themeStyles.textSecondary : undefined }}>
                  No books match your search "{searchQuery}"
                </p>
                <Button variant="outline" onClick={() => setSearchQuery("")} style={isNoteTheme ? { borderColor: themeStyles.border, color: themeStyles.textPrimary } : undefined}>
                  Clear search
                </Button>
              </>
            ) : (
              <>
                <h3 className="text-xl font-semibold mb-2" style={{ color: themeStyles.textPrimary }}>No books available yet</h3>
                <p className="text-muted-foreground" style={{ color: isNoteTheme ? themeStyles.textSecondary : undefined }}>
                  Check back soon for new educational content!
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredBooks.map((book) => (
              <Card 
                key={book.id} 
                className={`overflow-hidden cursor-pointer transition-all duration-300 ${!isNoteTheme ? 'hover:shadow-xl hover:-translate-y-1' : ''} group`}
                onClick={() => navigate(`/books/${book.id}`)}
                style={isNoteTheme ? { backgroundColor: themeStyles.theme.colors.cardBackground, borderColor: themeStyles.border } : undefined}
              >
                {/* Cover Image */}
                <div 
                  className={`h-48 flex items-center justify-center overflow-hidden ${!isNoteTheme ? 'bg-gradient-to-br from-primary/20 via-secondary/10 to-primary/5' : ''}`}
                  style={isNoteTheme ? { backgroundColor: 'transparent', borderBottom: `1px solid ${themeStyles.border}` } : undefined}
                >
                  {book.cover_url ? (
                    <img
                      src={book.cover_url}
                      alt={book.title}
                      className={`w-full h-full object-cover ${!isNoteTheme ? 'group-hover:scale-105' : ''} transition-transform duration-300`}
                    />
                  ) : (
                    !isNoteTheme && <BookOpen className="w-16 h-16 text-primary/30" />
                  )}
                  {isNoteTheme && !book.cover_url && (
                    <span className="text-xl font-serif italic" style={{ color: themeStyles.textSecondary }}>{book.title}</span>
                  )}
                </div>

                <CardHeader className="pb-2">
                  <CardTitle 
                    className={`text-lg line-clamp-2 ${!isNoteTheme ? 'group-hover:text-primary' : ''} transition-colors`}
                    style={{ color: themeStyles.textPrimary }}
                  >
                    {book.title}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1" style={{ color: isNoteTheme ? themeStyles.textSecondary : undefined }}>
                    {!isNoteTheme && <User className="w-3 h-3" />}
                    {book.author}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  {book.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2" style={{ color: isNoteTheme ? themeStyles.textSecondary : undefined }}>
                      {book.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1" style={{ color: isNoteTheme ? themeStyles.textSecondary : undefined }}>
                      {!isNoteTheme && <BookOpen className="w-3 h-3" />}
                      <span>{book.total_chapters} chapters</span>
                    </div>
                    {book.published_at && (
                      <div className="flex items-center gap-1" style={{ color: isNoteTheme ? themeStyles.textSecondary : undefined }}>
                        {!isNoteTheme && <Clock className="w-3 h-3" />}
                        <span>{formatDate(book.published_at)}</span>
                      </div>
                    )}
                  </div>

                  {book.company && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground" style={{ color: isNoteTheme ? themeStyles.textSecondary : undefined }}>
                      {!isNoteTheme && <Building2 className="w-3 h-3" />}
                      <span>{book.company}</span>
                    </div>
                  )}

                  <Button className="w-full mt-2" size="sm" style={isNoteTheme ? { backgroundColor: themeStyles.theme.colors.buttonPrimary, color: '#FFF' } : undefined}>
                    Start Reading
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Back Button */}
        <div className="text-center pt-8">
          <Button variant="outline" onClick={() => navigate('/ielts')} style={isNoteTheme ? { borderColor: themeStyles.border, color: themeStyles.textPrimary } : undefined}>
            ← Back to IELTS Portal
          </Button>
        </div>
      </div>
    </StudentLayout>
  );
};

export default BooksLibrary;