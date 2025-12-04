import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { BookOpen, Upload, Wand2, Pause, Play, Trash2, Eye, Image, Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CHUNK_SIZE = 5000; // Characters per chunk

interface Book {
  id: string;
  title: string;
  author: string;
  original_author: string | null;
  company: string | null;
  original_company: string | null;
  description: string | null;
  cover_url: string | null;
  status: string;
  processing_model: string | null;
  total_chapters: number;
  created_at: string;
}

interface ProcessingJob {
  id: string;
  book_id: string;
  total_chunks: number;
  processed_chunks: number;
  current_chunk: number;
  status: string;
  error_message: string | null;
}

const AdminBookCreation = () => {
  const navigate = useNavigate();
  const { admin, loading: authLoading } = useAdminAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [title, setTitle] = useState("");
  const [newAuthor, setNewAuthor] = useState("");
  const [originalAuthor, setOriginalAuthor] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [originalCompany, setOriginalCompany] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [selectedModel, setSelectedModel] = useState<'gemini-3-pro-preview' | 'deepseek-v3'>('gemini-3-pro-preview');
  
  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentBookId, setCurrentBookId] = useState<string | null>(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processedChunks, setProcessedChunks] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [processingStatus, setProcessingStatus] = useState<string>("");
  
  // Cover upload state
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  
  // Books list
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoadingBooks, setIsLoadingBooks] = useState(true);

  // Abort controller for pausing
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!authLoading && !admin) {
      navigate('/admin/login');
    } else if (admin) {
      loadBooks();
    }
  }, [admin, authLoading, navigate]);

  const loadBooks = async () => {
    setIsLoadingBooks(true);
    try {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBooks(data || []);
    } catch (error) {
      console.error('Error loading books:', error);
      toast.error('Failed to load books');
    } finally {
      setIsLoadingBooks(false);
    }
  };

  const splitIntoChunks = (text: string): string[] => {
    const chunks: string[] = [];
    let currentIndex = 0;

    while (currentIndex < text.length) {
      let endIndex = currentIndex + CHUNK_SIZE;
      
      // Try to break at a paragraph or sentence boundary
      if (endIndex < text.length) {
        // Look for paragraph break
        const paragraphBreak = text.lastIndexOf('\n\n', endIndex);
        if (paragraphBreak > currentIndex + CHUNK_SIZE * 0.7) {
          endIndex = paragraphBreak + 2;
        } else {
          // Look for sentence break
          const sentenceBreak = text.lastIndexOf('. ', endIndex);
          if (sentenceBreak > currentIndex + CHUNK_SIZE * 0.7) {
            endIndex = sentenceBreak + 2;
          }
        }
      }

      chunks.push(text.slice(currentIndex, endIndex).trim());
      currentIndex = endIndex;
    }

    return chunks.filter(chunk => chunk.length > 0);
  };

  const processChunk = async (
    chunk: string,
    index: number,
    total: number,
    bookId: string,
    chapterId: string
  ): Promise<string> => {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL || 'https://cuumxmfzhwljylbdlflj.supabase.co'}/functions/v1/book-process-chunk`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chunkText: chunk,
          chunkIndex: index,
          totalChunks: total,
          bookId,
          chapterId,
          newAuthor,
          originalAuthor: originalAuthor || undefined,
          newCompany: newCompany || undefined,
          originalCompany: originalCompany || undefined,
          model: selectedModel,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to process chunk');
    }

    const data = await response.json();
    return data.processedText;
  };

  const startProcessing = async () => {
    if (!title.trim() || !newAuthor.trim() || !content.trim()) {
      toast.error('Please fill in Title, New Author, and Content');
      return;
    }

    setIsProcessing(true);
    setIsPaused(false);
    setProcessingStatus('Creating book...');
    abortControllerRef.current = new AbortController();

    try {
      // Create the book record
      const { data: book, error: bookError } = await supabase
        .from('books')
        .insert({
          title,
          author: newAuthor,
          original_author: originalAuthor || null,
          company: newCompany || null,
          original_company: originalCompany || null,
          description: description || null,
          status: 'processing',
          processing_model: selectedModel,
        })
        .select()
        .single();

      if (bookError) throw bookError;
      setCurrentBookId(book.id);

      // Split content into chunks
      const chunks = splitIntoChunks(content);
      setTotalChunks(chunks.length);
      setProcessedChunks(0);

      // Create chapters for each chunk
      const chapterInserts = chunks.map((chunk, index) => ({
        book_id: book.id,
        chapter_number: index + 1,
        chapter_title: `Chapter ${index + 1}`,
        original_content: chunk,
        status: 'pending',
      }));

      const { data: chapters, error: chaptersError } = await supabase
        .from('book_chapters')
        .insert(chapterInserts)
        .select();

      if (chaptersError) throw chaptersError;

      // Create processing job
      const { error: jobError } = await supabase
        .from('book_processing_jobs')
        .insert({
          book_id: book.id,
          total_chunks: chunks.length,
          processed_chunks: 0,
          current_chunk: 0,
          status: 'processing',
          processing_model: selectedModel,
          started_at: new Date().toISOString(),
        });

      if (jobError) throw jobError;

      // Update book with total chapters
      await supabase
        .from('books')
        .update({ total_chapters: chunks.length })
        .eq('id', book.id);

      // Process each chunk sequentially
      for (let i = 0; i < chunks.length; i++) {
        if (isPaused || abortControllerRef.current?.signal.aborted) {
          setProcessingStatus('Processing paused');
          break;
        }

        setProcessingStatus(`Processing chunk ${i + 1} of ${chunks.length}...`);
        
        try {
          const processedText = await processChunk(
            chunks[i],
            i,
            chunks.length,
            book.id,
            chapters![i].id
          );

          setProcessedChunks(i + 1);
          setProcessingProgress(((i + 1) / chunks.length) * 100);

          // Small delay to prevent rate limiting
          if (i < chunks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error: any) {
          console.error(`Error processing chunk ${i + 1}:`, error);
          
          // Update chapter status to failed
          await supabase
            .from('book_chapters')
            .update({ status: 'failed', error_message: error.message })
            .eq('id', chapters![i].id);

          // Continue with next chunk or stop based on error severity
          if (error.message.includes('rate limit')) {
            toast.error('Rate limit reached. Pausing for 30 seconds...');
            await new Promise(resolve => setTimeout(resolve, 30000));
            i--; // Retry this chunk
          }
        }
      }

      // Processing complete
      if (!isPaused && !abortControllerRef.current?.signal.aborted) {
        setProcessingStatus('Processing complete!');
        toast.success('Book processing complete!');
        
        // Update book status
        await supabase
          .from('books')
          .update({ status: 'draft' })
          .eq('id', book.id);

        // Refresh books list
        loadBooks();
        
        // Reset form
        resetForm();
      }

    } catch (error: any) {
      console.error('Error during processing:', error);
      toast.error(`Processing failed: ${error.message}`);
      setProcessingStatus('Processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const pauseProcessing = () => {
    setIsPaused(true);
    abortControllerRef.current?.abort();
    toast.info('Processing paused');
  };

  const resumeProcessing = async () => {
    // TODO: Implement resume from last successful chunk
    toast.info('Resume feature coming soon. Please restart processing.');
  };

  const resetForm = () => {
    setTitle("");
    setNewAuthor("");
    setOriginalAuthor("");
    setNewCompany("");
    setOriginalCompany("");
    setDescription("");
    setContent("");
    setCoverFile(null);
    setCoverPreview(null);
    setCurrentBookId(null);
    setProcessingProgress(0);
    setProcessedChunks(0);
    setTotalChunks(0);
    setProcessingStatus("");
  };

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const uploadCover = async (bookId: string) => {
    if (!coverFile) return null;

    setIsUploadingCover(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      const formData = new FormData();
      formData.append('file', coverFile);
      formData.append('path', `books/covers/${bookId}/${coverFile.name}`);
      formData.append('contentType', coverFile.type);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL || 'https://cuumxmfzhwljylbdlflj.supabase.co'}/functions/v1/r2-upload`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sessionData?.session?.access_token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error('Failed to upload cover');
      }

      const data = await response.json();
      
      // Update book with cover URL
      await supabase
        .from('books')
        .update({ cover_url: data.url })
        .eq('id', bookId);

      toast.success('Cover uploaded successfully!');
      loadBooks();
      return data.url;
    } catch (error: any) {
      console.error('Error uploading cover:', error);
      toast.error(`Failed to upload cover: ${error.message}`);
      return null;
    } finally {
      setIsUploadingCover(false);
    }
  };

  const publishBook = async (bookId: string) => {
    try {
      const { error } = await supabase
        .from('books')
        .update({ 
          status: 'published',
          published_at: new Date().toISOString()
        })
        .eq('id', bookId);

      if (error) throw error;
      toast.success('Book published successfully!');
      loadBooks();
    } catch (error: any) {
      toast.error(`Failed to publish: ${error.message}`);
    }
  };

  const deleteBook = async (bookId: string) => {
    try {
      const { error } = await supabase
        .from('books')
        .delete()
        .eq('id', bookId);

      if (error) throw error;
      toast.success('Book deleted successfully!');
      loadBooks();
    } catch (error: any) {
      toast.error(`Failed to delete: ${error.message}`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" />Draft</Badge>;
      case 'processing':
        return <Badge variant="default" className="bg-yellow-500"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Processing</Badge>;
      case 'published':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Published</Badge>;
      case 'archived':
        return <Badge variant="outline"><XCircle className="w-3 h-3 mr-1" />Archived</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!admin) return null;

  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const estimatedChunks = Math.ceil(content.length / CHUNK_SIZE);
  const estimatedTime = estimatedChunks * 15; // ~15 seconds per chunk

  return (
    <AdminLayout title="Book Creation" showBackButton={true} backPath="/admin/ielts">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Book Creation Studio
            </h1>
            <p className="text-muted-foreground">
              Paraphrase and publish educational books with AI assistance
            </p>
          </div>
          <Badge variant="secondary" className="text-sm">
            <Wand2 className="w-4 h-4 mr-1" />
            AI-Powered
          </Badge>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Book Creation Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Create New Book
                </CardTitle>
                <CardDescription>
                  Paste your content and let AI paraphrase it while replacing author and company names
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Book Title *</Label>
                  <Input
                    id="title"
                    placeholder="Enter the book title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={isProcessing}
                  />
                </div>

                {/* Author fields */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="newAuthor">New Author Name *</Label>
                    <Input
                      id="newAuthor"
                      placeholder="Your author name"
                      value={newAuthor}
                      onChange={(e) => setNewAuthor(e.target.value)}
                      disabled={isProcessing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="originalAuthor">Original Author (to replace)</Label>
                    <Input
                      id="originalAuthor"
                      placeholder="Original author name to find & replace"
                      value={originalAuthor}
                      onChange={(e) => setOriginalAuthor(e.target.value)}
                      disabled={isProcessing}
                    />
                  </div>
                </div>

                {/* Company fields */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="newCompany">New Company/Publisher</Label>
                    <Input
                      id="newCompany"
                      placeholder="Your company name"
                      value={newCompany}
                      onChange={(e) => setNewCompany(e.target.value)}
                      disabled={isProcessing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="originalCompany">Original Company (to replace)</Label>
                    <Input
                      id="originalCompany"
                      placeholder="Original company to find & replace"
                      value={originalCompany}
                      onChange={(e) => setOriginalCompany(e.target.value)}
                      disabled={isProcessing}
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Book Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of the book..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={isProcessing}
                    rows={2}
                  />
                </div>

                {/* AI Model Selection */}
                <div className="space-y-2">
                  <Label>AI Model</Label>
                  <Select
                    value={selectedModel}
                    onValueChange={(value: 'gemini-3-pro-preview' | 'deepseek-v3') => setSelectedModel(value)}
                    disabled={isProcessing}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gemini-3-pro-preview">
                        Gemini 3 Pro (Google) - Best Quality
                      </SelectItem>
                      <SelectItem value="deepseek-v3">
                        DeepSeek V3 (OpenRouter) - Fast & Efficient
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Content Input */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="content">Book Content *</Label>
                    <span className="text-sm text-muted-foreground">
                      {wordCount.toLocaleString()} words | ~{estimatedChunks} chunks | ~{Math.ceil(estimatedTime / 60)} min
                    </span>
                  </div>
                  <Textarea
                    id="content"
                    placeholder="Paste your entire book content here (supports 100-200+ pages)..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    disabled={isProcessing}
                    rows={15}
                    className="font-mono text-sm"
                  />
                </div>

                {/* Processing Progress */}
                {isProcessing && (
                  <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{processingStatus}</span>
                      <span className="text-sm text-muted-foreground">
                        {processedChunks} / {totalChunks} chunks
                      </span>
                    </div>
                    <Progress value={processingProgress} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      Processing with {selectedModel}. This may take several minutes for large books.
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  {!isProcessing ? (
                    <Button onClick={startProcessing} disabled={!title || !newAuthor || !content}>
                      <Wand2 className="w-4 h-4 mr-2" />
                      Start Processing
                    </Button>
                  ) : (
                    <>
                      {!isPaused ? (
                        <Button variant="secondary" onClick={pauseProcessing}>
                          <Pause className="w-4 h-4 mr-2" />
                          Pause
                        </Button>
                      ) : (
                        <Button onClick={resumeProcessing}>
                          <Play className="w-4 h-4 mr-2" />
                          Resume
                        </Button>
                      )}
                    </>
                  )}
                  <Button variant="outline" onClick={resetForm} disabled={isProcessing && !isPaused}>
                    Clear Form
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Cover Upload & Quick Stats */}
          <div className="space-y-6">
            {/* Cover Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="w-5 h-5" />
                  Book Cover
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCoverSelect}
                  className="hidden"
                />
                
                {coverPreview ? (
                  <div className="relative">
                    <img
                      src={coverPreview}
                      alt="Cover preview"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        setCoverFile(null);
                        setCoverPreview(null);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div
                    className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload cover image
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PNG, JPG up to 5MB
                    </p>
                  </div>
                )}

                {currentBookId && coverFile && (
                  <Button
                    className="w-full"
                    onClick={() => uploadCover(currentBookId)}
                    disabled={isUploadingCover}
                  >
                    {isUploadingCover ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Cover
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Processing Info */}
            <Card>
              <CardHeader>
                <CardTitle>Processing Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Chunk Size</span>
                  <span>{CHUNK_SIZE.toLocaleString()} chars</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Est. Processing</span>
                  <span>~15s per chunk</span>
                </div>
                <Separator />
                <p className="text-xs text-muted-foreground">
                  Content is split into manageable chunks to avoid timeouts. 
                  Progress is saved after each chunk.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        <Separator />

        {/* Existing Books List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Your Books</h2>
          
          {isLoadingBooks ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : books.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No books created yet</p>
                <p className="text-sm text-muted-foreground">Create your first book above!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {books.map((book) => (
                <Card key={book.id} className="overflow-hidden">
                  <div className="h-32 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                    {book.cover_url ? (
                      <img
                        src={book.cover_url}
                        alt={book.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <BookOpen className="w-12 h-12 text-muted-foreground" />
                    )}
                  </div>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg line-clamp-1">{book.title}</CardTitle>
                      {getStatusBadge(book.status)}
                    </div>
                    <CardDescription className="line-clamp-1">
                      by {book.author}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{book.total_chapters} chapters</span>
                      <span>{book.processing_model}</span>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => navigate(`/books/${book.id}?preview=true`)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Preview
                      </Button>
                      
                      {book.status === 'draft' && (
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => publishBook(book.id)}
                        >
                          Publish
                        </Button>
                      )}
                      
                      {!book.cover_url && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setCurrentBookId(book.id);
                            fileInputRef.current?.click();
                          }}
                        >
                          <Image className="w-4 h-4" />
                        </Button>
                      )}
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost">
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Book</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{book.title}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteBook(book.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminBookCreation;

