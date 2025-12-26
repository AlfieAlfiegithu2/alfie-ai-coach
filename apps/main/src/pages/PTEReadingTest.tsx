import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Clock,
  SkipForward,
  Send,
  CheckCircle,
  XCircle,
  GripVertical,
  ArrowRight
} from 'lucide-react';
import StudentLayout from '@/components/StudentLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import LoadingAnimation from '@/components/animations/LoadingAnimation';
import { useThemeStyles } from '@/hooks/useThemeStyles';

// Type configurations
const TYPE_CONFIG: Record<string, {
  name: string;
  isDropdown: boolean;
  isDragDrop: boolean;
  isReorder: boolean;
  isMultipleAnswer: boolean;
  isSingleAnswer: boolean;
  instructions: string;
}> = {
  'fill_blanks_dropdown': {
    name: 'Fill in the Blanks (Dropdown)',
    isDropdown: true,
    isDragDrop: false,
    isReorder: false,
    isMultipleAnswer: false,
    isSingleAnswer: false,
    instructions: 'In the text below some words are missing. From each drop-down list, choose the option that best completes the text.'
  },
  'mcq_multiple_answers': {
    name: 'Multiple Choice, Multiple Answers',
    isDropdown: false,
    isDragDrop: false,
    isReorder: false,
    isMultipleAnswer: true,
    isSingleAnswer: false,
    instructions: 'Read the text and answer the question by selecting all the correct responses. More than one response is correct.'
  },
  'reorder_paragraph': {
    name: 'Reorder Paragraph',
    isDropdown: false,
    isDragDrop: false,
    isReorder: true,
    isMultipleAnswer: false,
    isSingleAnswer: false,
    instructions: 'The text boxes below have been placed in a random order. Restore the original order by arranging them correctly.'
  },
  'fill_blanks_drag_drop': {
    name: 'Fill in the Blanks (Drag and Drop)',
    isDropdown: false,
    isDragDrop: true,
    isReorder: false,
    isMultipleAnswer: false,
    isSingleAnswer: false,
    instructions: 'In the text below some words are missing. Drag words from the box below to the appropriate place in the text. There are more words than you need to fill the gaps.'
  },
  'mcq_single_answer': {
    name: 'Multiple Choice, Single Answer',
    isDropdown: false,
    isDragDrop: false,
    isReorder: false,
    isMultipleAnswer: false,
    isSingleAnswer: true,
    instructions: 'Read the text and answer the multiple-choice question by selecting the correct response. Only one response is correct.'
  }
};

interface PTEItem {
  id: string;
  title: string;
  prompt_text: string;
  passage_text?: string;
  options?: string[];
  correct_answer?: string;
  paragraphs?: { id: string; text: string }[];
  blanks?: { position: number; options: string[]; correct: string }[];
  explanation?: string;
  difficulty: string;
}

const PTEReadingTest = () => {
  const navigate = useNavigate();
  const { type } = useParams<{ type: string }>();
  const { user } = useAuth();

  const themeStyles = useThemeStyles();
  const isNoteTheme = themeStyles.theme.name === 'note';

  const [items, setItems] = useState<PTEItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes per item by default
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  // Answer states
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [singleAnswer, setSingleAnswer] = useState<string>('');
  const [dropdownAnswers, setDropdownAnswers] = useState<Record<number, string>>({});
  const [dragDropAnswers, setDragDropAnswers] = useState<Record<number, string>>({});
  const [orderedParagraphs, setOrderedParagraphs] = useState<{ id: string; text: string }[]>([]);
  const [availableWords, setAvailableWords] = useState<string[]>([]);

  const config = type ? TYPE_CONFIG[type] : null;
  const currentItem = items[currentIndex];

  useEffect(() => {
    if (type) {
      loadItems();
    }
  }, [type]);

  useEffect(() => {
    if (currentItem && config) {
      resetAnswers();
      setShowFeedback(false);
      setIsTimerRunning(true);
      setTimeLeft(600);
    }
  }, [currentIndex, currentItem]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timeLeft]);

  const loadItems = async () => {
    if (!type) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('pte_items')
        .select('*')
        .eq('pte_section_type', type)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.error('No items available for this type');
        navigate('/pte-portal');
        return;
      }

      setItems(data as unknown as PTEItem[]);
    } catch (error) {
      console.error('Error loading items:', error);
      toast.error('Failed to load practice items');
    } finally {
      setIsLoading(false);
    }
  };

  const resetAnswers = () => {
    setSelectedAnswers([]);
    setSingleAnswer('');
    setDropdownAnswers({});
    setDragDropAnswers({});

    if (config?.isReorder && currentItem?.paragraphs) {
      // Shuffle paragraphs
      const shuffled = [...currentItem.paragraphs].sort(() => Math.random() - 0.5);
      setOrderedParagraphs(shuffled);
    }

    if (config?.isDragDrop && currentItem?.options) {
      setAvailableWords([...currentItem.options]);
    }
  };

  const handleMultipleAnswerToggle = (option: string) => {
    setSelectedAnswers(prev => {
      if (prev.includes(option)) {
        return prev.filter(a => a !== option);
      }
      return [...prev, option];
    });
  };

  const handleDragWordToBlank = (word: string, blankIndex: number) => {
    // Remove word from available words
    setAvailableWords(prev => prev.filter(w => w !== word));

    // If there was already a word in this blank, return it to available
    if (dragDropAnswers[blankIndex]) {
      setAvailableWords(prev => [...prev, dragDropAnswers[blankIndex]]);
    }

    // Set the new word
    setDragDropAnswers(prev => ({ ...prev, [blankIndex]: word }));
  };

  const handleRemoveFromBlank = (blankIndex: number) => {
    const word = dragDropAnswers[blankIndex];
    if (word) {
      setAvailableWords(prev => [...prev, word]);
      setDragDropAnswers(prev => {
        const newAnswers = { ...prev };
        delete newAnswers[blankIndex];
        return newAnswers;
      });
    }
  };

  const moveParagraph = (fromIndex: number, toIndex: number) => {
    const newOrder = [...orderedParagraphs];
    const [removed] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, removed);
    setOrderedParagraphs(newOrder);
  };

  const checkAnswer = (): boolean => {
    if (!currentItem?.correct_answer) return false;

    const correctAnswers = currentItem.correct_answer.split(',').map(a => a.trim().toUpperCase());

    if (config?.isSingleAnswer) {
      return correctAnswers.includes(singleAnswer.toUpperCase());
    }

    if (config?.isMultipleAnswer) {
      const selected = selectedAnswers.map(a => a.toUpperCase()).sort();
      return JSON.stringify(selected) === JSON.stringify(correctAnswers.sort());
    }

    if (config?.isReorder) {
      const currentOrder = orderedParagraphs.map(p => p.id).join(',');
      return currentOrder.toUpperCase() === currentItem.correct_answer.toUpperCase();
    }

    if (config?.isDropdown || config?.isDragDrop) {
      const answers = Object.values(config.isDropdown ? dropdownAnswers : dragDropAnswers);
      return JSON.stringify(answers.map(a => a.toUpperCase())) === JSON.stringify(correctAnswers);
    }

    return false;
  };

  const submitResponse = async () => {
    if (!user || !currentItem) return;

    setIsSubmitting(true);
    try {
      const correct = checkAnswer();
      setIsCorrect(correct);

      // Build response text
      let responseText = '';
      if (config?.isSingleAnswer) {
        responseText = singleAnswer;
      } else if (config?.isMultipleAnswer) {
        responseText = selectedAnswers.join(', ');
      } else if (config?.isReorder) {
        responseText = orderedParagraphs.map(p => p.id).join(', ');
      } else if (config?.isDropdown) {
        responseText = Object.values(dropdownAnswers).join(', ');
      } else if (config?.isDragDrop) {
        responseText = Object.values(dragDropAnswers).join(', ');
      }

      // Save progress
      const { error: progressError } = await supabase
        .from('pte_user_progress')
        .insert({
          user_id: user.id,
          pte_skill: 'reading',
          pte_section_type: type,
          item_id: currentItem.id,
          completed: true,
          score: correct ? 100 : 0,
          response_text: responseText,
          time_taken: 600 - timeLeft
        });

      if (progressError) throw progressError;

      setIsTimerRunning(false);
      setShowFeedback(true);
      toast.success(correct ? 'Correct!' : 'Incorrect');
    } catch (error) {
      console.error('Error submitting response:', error);
      toast.error('Failed to submit response');
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextItem = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      toast.success('You have completed all items!');
      navigate('/pte-portal');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Parse passage with blanks for dropdown/drag-drop
  const renderPassageWithBlanks = () => {
    if (!currentItem?.passage_text) return null;

    const parts = currentItem.passage_text.split(/\[BLANK\]/g);

    return (
      <div className="prose dark:prose-invert max-w-none">
        {parts.map((part, index) => (
          <span key={index}>
            {part}
            {index < parts.length - 1 && (
              config?.isDropdown ? (
                <Select
                  value={dropdownAnswers[index] || ''}
                  onValueChange={(value) => setDropdownAnswers(prev => ({ ...prev, [index]: value }))}
                >
                  <SelectTrigger className="w-40 inline-flex mx-1">
                    <SelectValue placeholder={`Blank ${index + 1}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {currentItem.options?.map((option, i) => (
                      <SelectItem key={i} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : config?.isDragDrop ? (
                <span
                  className={`inline-block min-w-[100px] px-2 py-1 mx-1 rounded border-2 ${dragDropAnswers[index]
                    ? 'bg-violet-100 border-violet-300 dark:bg-violet-900 dark:border-violet-700'
                    : 'border-dashed border-gray-300 dark:border-gray-600'
                    }`}
                  onClick={() => dragDropAnswers[index] && handleRemoveFromBlank(index)}
                >
                  {dragDropAnswers[index] || `[${index + 1}]`}
                </span>
              ) : null
            )}
          </span>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingAnimation />
      </div>
    );
  }

  if (!config || !currentItem) {
    return (
      <StudentLayout title="PTE Practice" showBackButton>
        <div className="text-center py-12">
          <p className="text-muted-foreground">No items available</p>
          <Button onClick={() => navigate('/pte-portal')} className="mt-4">
            Back to PTE Portal
          </Button>
        </div>
      </StudentLayout>
    );
  }

  return (
    <div
      className={`min-h-screen relative ${isNoteTheme ? 'font-serif' : ''}`}
      style={isNoteTheme ? { backgroundColor: themeStyles.theme.colors.background } : {}}
    >
      {/* Background Texture for Note Theme - ENHANCED NOTEBOOK EFFECT */}
      {isNoteTheme && (
        <>
          <div
            className="absolute inset-0 pointer-events-none opacity-50 z-0"
            style={{
              backgroundColor: '#FEF9E7',
              backgroundImage: `url("https://www.transparenttextures.com/patterns/cream-paper.png")`,
              mixBlendMode: 'multiply'
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none opacity-30 z-0"
            style={{
              backgroundImage: `url("https://www.transparenttextures.com/patterns/notebook.png")`,
              mixBlendMode: 'multiply',
              filter: 'contrast(1.2)'
            }}
          />
        </>
      )}

      <StudentLayout title={config.name} showBackButton transparentBackground={true}>
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Progress Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="text-blue-600 border-blue-600">
                {currentIndex + 1} / {items.length}
              </Badge>
              <Badge variant="secondary">{currentItem.difficulty}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className={`font-mono text-lg ${timeLeft < 60 ? 'text-red-500' : ''}`}>
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>

          <Progress value={(currentIndex / items.length) * 100} className="h-2" />

          {/* Instructions */}
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
            <CardContent className="pt-4">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {config.instructions}
              </p>
            </CardContent>
          </Card>

          {/* Main Content */}
          <Card>
            <CardHeader>
              <CardTitle>{currentItem.title || config.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Question/Prompt */}
              <div className="text-lg font-medium">{currentItem.prompt_text}</div>

              {/* Passage for MCQ types */}
              {(config.isSingleAnswer || config.isMultipleAnswer) && currentItem.passage_text && (
                <Card className="bg-gray-50 dark:bg-gray-900">
                  <CardContent className="pt-4">
                    <p className="whitespace-pre-wrap">{currentItem.passage_text}</p>
                  </CardContent>
                </Card>
              )}

              {/* Fill in Blanks - Dropdown/Drag-Drop */}
              {(config.isDropdown || config.isDragDrop) && (
                <Card className="bg-gray-50 dark:bg-gray-900">
                  <CardContent className="pt-4">
                    {renderPassageWithBlanks()}
                  </CardContent>
                </Card>
              )}

              {/* Word Bank for Drag and Drop */}
              {config.isDragDrop && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Word Bank (click to place in blank)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {availableWords.map((word, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Find first empty blank
                            const firstEmptyBlank = Object.keys(dragDropAnswers).length;
                            const parts = currentItem.passage_text?.split(/\[BLANK\]/g) || [];
                            if (firstEmptyBlank < parts.length - 1) {
                              handleDragWordToBlank(word, firstEmptyBlank);
                            }
                          }}
                        >
                          {word}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Single Answer MCQ */}
              {config.isSingleAnswer && currentItem.options && (
                <RadioGroup value={singleAnswer} onValueChange={setSingleAnswer}>
                  <div className="space-y-3">
                    {currentItem.options.map((option, index) => (
                      <div key={index} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-900">
                        <RadioGroupItem value={String.fromCharCode(65 + index)} id={`option-${index}`} />
                        <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                          <span className="font-medium mr-2">{String.fromCharCode(65 + index)}.</span>
                          {option}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              )}

              {/* Multiple Answer MCQ */}
              {config.isMultipleAnswer && currentItem.options && (
                <div className="space-y-3">
                  {currentItem.options.map((option, index) => {
                    const letter = String.fromCharCode(65 + index);
                    return (
                      <div
                        key={index}
                        className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedAnswers.includes(letter)
                          ? 'bg-violet-50 border-violet-300 dark:bg-violet-950 dark:border-violet-700'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-900'
                          }`}
                        onClick={() => handleMultipleAnswerToggle(letter)}
                      >
                        <Checkbox
                          checked={selectedAnswers.includes(letter)}
                          onCheckedChange={() => handleMultipleAnswerToggle(letter)}
                        />
                        <Label className="flex-1 cursor-pointer">
                          <span className="font-medium mr-2">{letter}.</span>
                          {option}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Reorder Paragraph */}
              {config.isReorder && (
                <div className="space-y-3">
                  {orderedParagraphs.map((para, index) => (
                    <Card
                      key={para.id}
                      className="cursor-move hover:shadow-md transition-shadow"
                    >
                      <CardContent className="p-4 flex items-start gap-3">
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            disabled={index === 0}
                            onClick={() => moveParagraph(index, index - 1)}
                          >
                            ↑
                          </Button>
                          <GripVertical className="w-4 h-4 text-gray-400" />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            disabled={index === orderedParagraphs.length - 1}
                            onClick={() => moveParagraph(index, index + 1)}
                          >
                            ↓
                          </Button>
                        </div>
                        <div className="flex-1">
                          <Badge variant="outline" className="mb-2">{para.id}</Badge>
                          <p className="text-sm">{para.text}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Submit Button */}
              {!showFeedback && (
                <div className="flex justify-end">
                  <Button
                    onClick={submitResponse}
                    disabled={isSubmitting}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {isSubmitting ? 'Checking...' : 'Submit Answer'}
                  </Button>
                </div>
              )}

              {/* Feedback */}
              {showFeedback && (
                <div className="space-y-4">
                  <Card className={`${isCorrect ? 'bg-green-50 border-green-200 dark:bg-green-950/20' : 'bg-red-50 border-red-200 dark:bg-red-950/20'}`}>
                    <CardHeader>
                      <CardTitle className={`flex items-center gap-2 ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                        {isCorrect ? (
                          <><CheckCircle className="w-5 h-5" /> Correct!</>
                        ) : (
                          <><XCircle className="w-5 h-5" /> Incorrect</>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p>
                        <span className="font-medium">Correct answer: </span>
                        {currentItem.correct_answer}
                      </p>
                      {currentItem.explanation && (
                        <p className="text-sm text-muted-foreground">
                          {currentItem.explanation}
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <div className="flex justify-end">
                    <Button onClick={nextItem} className="bg-blue-600 hover:bg-blue-700">
                      {currentIndex < items.length - 1 ? (
                        <>
                          <SkipForward className="w-4 h-4 mr-2" />
                          Next Item
                        </>
                      ) : (
                        'Complete'
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </StudentLayout>
    </div>
  );
};

export default PTEReadingTest;

