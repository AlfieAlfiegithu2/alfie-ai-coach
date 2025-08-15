import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { 
  BookOpen, 
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  Eye,
  ChevronDown,
  ChevronRight,
  Search,
  Filter,
  TrendingDown,
  Bookmark,
  BookmarkCheck
} from "lucide-react";
import Header from '@/components/Header';
import LoadingAnimation from '@/components/animations/LoadingAnimation';
import QuestionReviewModal from '@/components/QuestionReviewModal';

interface ReadingResult {
  id: string;
  created_at: string;
  passage_title: string;
  passage_text?: string;
  questions_data: any;
  user_answers?: any;
  reading_time_seconds: number;
  comprehension_score: number;
  question_type_performance: any;
  detailed_feedback: string;
}

interface ProcessedQuestion {
  questionNumber: number;
  question: string;
  text?: string;
  userAnswer: string;
  correctAnswer: string;
  explanation?: string;
  options?: string[];
  type?: string;
  isCorrect: boolean;
}

const ReadingResults = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [results, setResults] = useState<ReadingResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState<ProcessedQuestion | null>(null);
  const [selectedPassage, setSelectedPassage] = useState<string>('');
  const [removedQuestions, setRemovedQuestions] = useState<Set<string>>(new Set());
  const [processedResultsMap, setProcessedResultsMap] = useState<{ [key: string]: ProcessedQuestion[] }>({});
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadReadingResults();
      loadBookmarks();
    }
  }, [user]);

  useEffect(() => {
    // Process questions when results change
    const processAllResults = async () => {
      const newProcessedMap: { [key: string]: ProcessedQuestion[] } = {};
      
      for (const result of results) {
        newProcessedMap[result.id] = await processQuestions(result);
      }
      
      setProcessedResultsMap(newProcessedMap);
    };

    if (results.length > 0) {
      processAllResults();
    }
  }, [results]);

  const loadReadingResults = async () => {
    try {
      // Fetch reading test results
      const { data: readingResults, error } = await supabase
        .from('reading_test_results')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching reading results:', error);
        return;
      }

      setResults(readingResults || []);
    } catch (error) {
      console.error('Error loading reading results:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const loadBookmarks = async () => {
    if (!user?.id) return;
    
    try {
      const { data: bookmarks, error } = await supabase
        .from('question_bookmarks')
        .select('question_id, test_result_id')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching bookmarks:', error);
        return;
      }

      const bookmarkKeys = new Set(
        bookmarks?.map(b => `${b.test_result_id}-${b.question_id}`) || []
      );
      setBookmarkedQuestions(bookmarkKeys);
    } catch (error) {
      console.error('Error loading bookmarks:', error);
    }
  };

  const isQuestionBookmarked = (resultId: string, question: ProcessedQuestion) => {
    return bookmarkedQuestions.has(`${resultId}-${question.questionNumber}`);
  };

  const toggleBookmark = async (result: ReadingResult, question: ProcessedQuestion) => {
    if (!user?.id) return;

    const bookmarkKey = `${result.id}-${question.questionNumber}`;
    const isCurrentlyBookmarked = bookmarkedQuestions.has(bookmarkKey);

    try {
      if (isCurrentlyBookmarked) {
        // Remove bookmark
        const { error } = await supabase
          .from('question_bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('question_id', question.questionNumber.toString())
          .eq('test_result_id', result.id);

        if (error) throw error;

        setBookmarkedQuestions(prev => {
          const newSet = new Set(prev);
          newSet.delete(bookmarkKey);
          return newSet;
        });

        toast({
          title: "Bookmark removed",
          description: "Question removed from your bookmarks",
        });
      } else {
        // Add bookmark
        const { error } = await supabase
          .from('question_bookmarks')
          .insert({
            user_id: user.id,
            question_id: question.questionNumber.toString(),
            question_text: question.question,
            question_type: question.type || '',
            user_answer: question.userAnswer,
            correct_answer: question.correctAnswer,
            explanation: question.explanation || '',
            options: question.options || [],
            passage_title: result.passage_title,
            passage_text: result.passage_text || '',
            test_result_id: result.id
          });

        if (error) throw error;

        setBookmarkedQuestions(prev => new Set([...prev, bookmarkKey]));

        toast({
          title: "Question bookmarked",
          description: "Added to your bookmarks for later review",
        });
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      toast({
        title: "Error",
        description: "Failed to update bookmark",
        variant: "destructive",
      });
    }
  };

  const processQuestions = async (result: ReadingResult): Promise<ProcessedQuestion[]> => {
    if (!result.questions_data) return [];
    
    const processedQuestions: ProcessedQuestion[] = [];
    const questions = result.questions_data.questions || result.questions_data;
    
    if (Array.isArray(questions)) {
      questions.forEach((question: any, index: number) => {
        // Extract data from the question object itself
        const userAnswer = question.user_answer || '';
        const correctAnswer = question.correct_answer || question.answer || '';
        const isCorrect = question.is_correct !== undefined ? question.is_correct : (userAnswer === correctAnswer);
        
        // Only include incorrect answers for this "Incorrect Answer Notes" page
        if (!isCorrect) {
          // Use stored options directly if available
          const options = question.options && Array.isArray(question.options) ? question.options : [];
          
          processedQuestions.push({
            questionNumber: index + 1,
            question: question.question_text || question.question || question.text || '',
            text: question.question_text || question.text,
            userAnswer: userAnswer,
            correctAnswer: correctAnswer,
            explanation: question.explanation || '',
            options: options,
            type: question.type || question.question_type || '',
            isCorrect: isCorrect
          });
        }
      });
    }
    
    return processedQuestions;
  };

  const handleQuestionClick = (question: ProcessedQuestion, passage: string) => {
    setSelectedQuestion(question);
    setSelectedPassage(passage);
  };

  const removeQuestion = (resultId: string, questionNumber: number) => {
    const questionKey = `${resultId}-${questionNumber}`;
    setRemovedQuestions(prev => new Set([...prev, questionKey]));
  };

  const removeAllIncorrectAnswers = (resultId: string, questions: ProcessedQuestion[]) => {
    const incorrectQuestionKeys = questions
      .filter(q => !q.isCorrect)
      .map(q => `${resultId}-${q.questionNumber}`);
    
    setRemovedQuestions(prev => {
      const newSet = new Set(prev);
      incorrectQuestionKeys.forEach(key => newSet.add(key));
      return newSet;
    });
  };

  const isQuestionRemoved = (resultId: string, questionNumber: number) => {
    return removedQuestions.has(`${resultId}-${questionNumber}`);
  };

  const toggleResultExpansion = (resultId: string) => {
    setExpandedResults(prev => {
      const newSet = new Set(prev);
      if (newSet.has(resultId)) {
        newSet.delete(resultId);
      } else {
        newSet.add(resultId);
      }
      return newSet;
    });
  };

  const filteredResults = results.filter(result => {
    const questions = processedResultsMap[result.id] || [];
    const visibleQuestions = questions.filter(q => !isQuestionRemoved(result.id, q.questionNumber));
    
    if (visibleQuestions.length === 0) return false;
    
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const titleMatch = result.passage_title?.toLowerCase().includes(searchLower);
      const questionMatch = visibleQuestions.some(q => 
        q.question.toLowerCase().includes(searchLower) ||
        q.userAnswer.toLowerCase().includes(searchLower) ||
        q.correctAnswer.toLowerCase().includes(searchLower)
      );
      if (!titleMatch && !questionMatch) return false;
    }
    
    // Type filter
    if (filterType !== 'all') {
      if (filterType === 'bookmarked') {
        // Show only questions that are bookmarked
        const hasBookmarkedQuestion = visibleQuestions.some(q => 
          isQuestionBookmarked(result.id, q)
        );
        if (!hasBookmarkedQuestion) return false;
      } else {
        // Filter by question type
        const hasFilterType = visibleQuestions.some(q => 
          q.type?.toLowerCase().includes(filterType.toLowerCase())
        );
        if (!hasFilterType) return false;
      }
    }
    
    return true;
  });

  const getUniqueQuestionTypes = () => {
    const types = new Set<string>();
    results.forEach(result => {
      const questions = processedResultsMap[result.id] || [];
      questions.forEach(q => {
        if (q.type) types.add(q.type);
      });
    });
    return Array.from(types);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingAnimation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-b border-border/20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-2">
            <Button variant="ghost" onClick={() => navigate('/dashboard')} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Incorrect Answer Notes</h1>
              <p className="text-muted-foreground">Review and manage your incorrect answers to improve learning</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Search and Filter Controls */}
        {results.length > 0 && (
          <div className="mb-8 space-y-4">
            <div className="flex gap-4 items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search questions, answers, or passages..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <select 
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
                >
                  <option value="all">All Questions</option>
                  <option value="bookmarked">🔖 Bookmarked Only ({
                    results.reduce((count, result) => {
                      const questions = processedResultsMap[result.id] || [];
                      return count + questions.filter(q => isQuestionBookmarked(result.id, q)).length;
                    }, 0)
                  })</option>
                  {getUniqueQuestionTypes().map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Stats Summary */}
            <div className="flex gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary"></div>
                <span className="text-muted-foreground">Tests: <span className="text-foreground font-medium">{results.length}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span className="text-muted-foreground">Incorrect Notes: <span className="text-foreground font-medium">{
                  filteredResults.reduce((acc, result) => {
                    const questions = processedResultsMap[result.id] || [];
                    const visibleQuestions = questions.filter(q => !isQuestionRemoved(result.id, q.questionNumber));
                    return acc + visibleQuestions.length;
                  }, 0)
                }</span></span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                <span className="text-muted-foreground">Bookmarked: <span className="text-foreground font-medium">{
                  results.reduce((count, result) => {
                    const questions = processedResultsMap[result.id] || [];
                    return count + questions.filter(q => isQuestionBookmarked(result.id, q)).length;
                  }, 0)
                }</span></span>
              </div>
            </div>
          </div>
        )}

        {/* Test Results List - Collapsible */}
        <div className="space-y-6">
          {filteredResults.length > 0 ? (
            filteredResults.map((result) => {
              const questions = processedResultsMap[result.id];
              const safeQuestions = Array.isArray(questions) ? questions : [];
              const allQuestions = result.questions_data.questions || result.questions_data || [];
              const totalQuestions = Array.isArray(allQuestions) ? allQuestions.length : 0;
              const incorrectCount = safeQuestions.length;
              let visibleQuestions = safeQuestions.filter(q => !isQuestionRemoved(result.id, q.questionNumber));
              
              // If filtering by bookmarked, only show bookmarked questions
              if (filterType === 'bookmarked') {
                visibleQuestions = visibleQuestions.filter(q => isQuestionBookmarked(result.id, q));
              }
              
              const isExpanded = expandedResults.has(result.id);
              
              // Skip if no visible questions
              if (visibleQuestions.length === 0) return null;

              return (
                <Collapsible key={result.id} open={isExpanded} onOpenChange={() => toggleResultExpansion(result.id)}>
                  <Card className="overflow-hidden transition-all duration-200 hover:shadow-md">
                    <CollapsibleTrigger className="w-full">
                      <CardHeader className="hover:bg-muted/30 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                              <TrendingDown className="w-5 h-5 text-red-600" />
                            </div>
                            <div className="text-left">
                              <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                                {result.passage_title || 'Reading Test'}
                                <Badge variant="destructive" className="text-xs">
                                  {visibleQuestions.length} to review
                                </Badge>
                                {visibleQuestions.some(q => isQuestionBookmarked(result.id, q)) && (
                                  <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-200">
                                    🔖 {visibleQuestions.filter(q => isQuestionBookmarked(result.id, q)).length} bookmarked
                                  </Badge>
                                )}
                              </CardTitle>
                              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                                <span>{new Date(result.created_at).toLocaleDateString()}</span>
                                <span className="text-foreground font-medium">
                                  {totalQuestions - incorrectCount}/{totalQuestions} correct
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {visibleQuestions.length > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeAllIncorrectAnswers(result.id, visibleQuestions);
                                }}
                                className="text-red-600 border-red-200 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Clear All
                              </Button>
                            )}
                            {isExpanded ? (
                              <ChevronDown className="w-5 h-5 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <CardContent className="pt-0 px-6 pb-6">
                        <div className="space-y-4">
                          {visibleQuestions.map((question, index) => (
                             <div
                              key={index}
                              className={`p-4 border rounded-lg hover:shadow-sm transition-all ${
                                isQuestionBookmarked(result.id, question) 
                                  ? 'bg-yellow-50 border-yellow-200' 
                                  : 'bg-red-50 border-red-200'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <span className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center text-xs font-semibold text-red-700">
                                    {question.questionNumber}
                                  </span>
                                  {isQuestionBookmarked(result.id, question) && (
                                    <BookmarkCheck className="w-4 h-4 text-yellow-600" />
                                  )}
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground mb-2 leading-relaxed">
                                    {question.question}
                                  </p>
                                  
                                  {/* Answer Options Display */}
                                  {question.options && question.options.length > 0 && (
                                    <div className="mb-3 p-2 bg-background/60 rounded border border-border/50">
                                      <div className="grid grid-cols-1 gap-1">
                                        {question.options.map((option, optIndex) => (
                                          <div key={optIndex} className="text-xs text-foreground/80">
                                            {option}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  
                                  <div className="flex gap-3 mb-2">
                                    <div className="flex-1">
                                      <span className="text-xs text-muted-foreground">Your Answer:</span>
                                      <div className="text-sm font-medium text-red-600 mt-1">
                                        {question.userAnswer || 'No answer'}
                                      </div>
                                    </div>
                                    <div className="flex-1">
                                      <span className="text-xs text-muted-foreground">Correct:</span>
                                      <div className="text-sm font-medium text-green-600 mt-1">
                                        {question.correctAnswer}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {question.explanation && (
                                    <div className="mt-2 p-2 bg-blue-50/80 rounded border border-blue-200/50">
                                      <p className="text-xs text-blue-700 leading-relaxed">
                                        {question.explanation}
                                      </p>
                                    </div>
                                  )}
                                </div>
                                
                                <div className="flex gap-1 flex-shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleBookmark(result, question);
                                    }}
                                    className={`h-8 w-8 p-0 ${
                                      isQuestionBookmarked(result.id, question)
                                        ? 'text-yellow-600 hover:text-yellow-700 hover:bg-yellow-100'
                                        : 'text-gray-400 hover:text-yellow-600 hover:bg-yellow-50'
                                    }`}
                                  >
                                    {isQuestionBookmarked(result.id, question) ? (
                                      <BookmarkCheck className="w-4 h-4" />
                                    ) : (
                                      <Bookmark className="w-4 h-4" />
                                    )}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleQuestionClick(question, result.passage_text || '')}
                                    className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeQuestion(result.id, question.questionNumber)}
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })
          ) : results.length > 0 ? (
            <div className="text-center py-12">
              <Search className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No results found</h3>
              <p className="text-muted-foreground mb-4">Try adjusting your search or filter criteria</p>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('');
                  setFilterType('all');
                }}
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No reading test results yet</h3>
              <p className="text-muted-foreground mb-4">Start practicing to see your progress here</p>
              <Button onClick={() => navigate('/ielts-portal')}>
                Start Reading Practice
              </Button>
            </div>
          )}
        </div>

        {/* Question Review Modal */}
        <QuestionReviewModal
          isOpen={!!selectedQuestion}
          onClose={() => setSelectedQuestion(null)}
          question={selectedQuestion}
          passage={selectedPassage}
        />
      </div>
    </div>
  );
};

export default ReadingResults;