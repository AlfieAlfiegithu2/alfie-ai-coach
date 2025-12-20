import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import {
  Plus,
  Save,
  Trash2,
  BookOpen,
  Target,
  Edit,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Languages,
  Lightbulb,
  AlertCircle,
  CheckCircle,
  Wand2,
  Sparkles
} from 'lucide-react';

// Supported languages
const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'zh', name: '中文 (Chinese)' },
  { code: 'hi', name: 'हिंदी (Hindi)' },
  { code: 'es', name: 'Español (Spanish)' },
  { code: 'fr', name: 'Français (French)' },
  { code: 'ar', name: 'العربية (Arabic)' },
  { code: 'bn', name: 'বাংলা (Bengali)' },
  { code: 'pt', name: 'Português (Portuguese)' },
  { code: 'ru', name: 'Русский (Russian)' },
  { code: 'ja', name: '日本語 (Japanese)' },
  { code: 'de', name: 'Deutsch (German)' },
  { code: 'ko', name: '한국어 (Korean)' },
  { code: 'vi', name: 'Tiếng Việt (Vietnamese)' },
  { code: 'tr', name: 'Türkçe (Turkish)' },
  { code: 'it', name: 'Italiano (Italian)' },
  { code: 'th', name: 'ไทย (Thai)' },
  { code: 'pl', name: 'Polski (Polish)' },
  { code: 'nl', name: 'Nederlands (Dutch)' },
  { code: 'id', name: 'Bahasa Indonesia' },
  { code: 'uk', name: 'Українська (Ukrainian)' },
  { code: 'tl', name: 'Tagalog (Filipino)' },
  { code: 'ms', name: 'Bahasa Melayu (Malay)' },
  { code: 'ro', name: 'Română (Romanian)' },
  { code: 'cs', name: 'Čeština (Czech)' },
  { code: 'el', name: 'Ελληνικά (Greek)' },
  { code: 'hu', name: 'Magyar (Hungarian)' },
  { code: 'sv', name: 'Svenska (Swedish)' },
  { code: 'he', name: 'עברית (Hebrew)' },
  { code: 'fa', name: 'فارسی (Persian)' },
];

const EXERCISE_TYPES = [
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'fill_in_blank', label: 'Fill in the Blank' },
  { value: 'error_correction', label: 'Error Correction' },
  { value: 'sentence_transformation', label: 'Sentence Transformation' },
  { value: 'drag_drop_reorder', label: 'Drag & Drop Reorder' },
];

interface Topic {
  id: string | number;
  slug: string;
  level: string;
  translations: { language_code: string; title: string; description: string }[];
}

interface Lesson {
  id: string | number;
  topic_id: string;
  lesson_order: number;
}

interface LessonTranslation {
  id?: string;
  lesson_id: string | number;
  language_code: string;
  theory_title: string;
  theory_definition: string;
  theory_formation: string;
  theory_usage: string;
  theory_common_mistakes: string;
  rules: { title: string; formula: string; example: string }[];
  examples: { sentence: string; translation?: string; correct: boolean }[];
  localized_tips: string;
}

interface Exercise {
  id: string | number;
  topic_id: string;
  exercise_type: string;
  difficulty: number;
  exercise_order: number;
  correct_order?: string[];
  transformation_type?: string;
}

interface ExerciseTranslation {
  id?: string;
  exercise_id: string | number;
  language_code: string;
  question: string;
  instruction?: string;
  correct_answer: string;
  incorrect_answers: string[];
  explanation?: string;
  hint?: string;
  sentence_with_blank?: string;
  incorrect_sentence?: string;
  original_sentence?: string;
}

const AdminGrammarLessonEditor = () => {
  const { topicId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [topic, setTopic] = useState<Topic | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [isSaving, setIsSaving] = useState(false);

  // Lesson translation state
  const [lessonTranslation, setLessonTranslation] = useState<any>({
    theory_title: '',
    theory_definition: '',
    theory_formation: '',
    theory_usage: '',
    theory_common_mistakes: '',
    rules: [],
    examples: [],
    localized_tips: '',
  });

  // Exercise dialog state
  const [showExerciseDialog, setShowExerciseDialog] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [exerciseForm, setExerciseForm] = useState({
    exercise_type: 'multiple_choice',
    difficulty: 1,
    correct_order: [] as string[],
    transformation_type: '',
  });
  const [exerciseTranslation, setExerciseTranslation] = useState<any>({
    question: '',
    instruction: '',
    correct_answer: '',
    incorrect_answers: ['', '', ''],
    explanation: '',
    hint: '',
    sentence_with_blank: '',
    incorrect_sentence: '',
    original_sentence: '',
  });

  useEffect(() => {
    if (topicId) {
      loadData();
    }
  }, [topicId]);

  useEffect(() => {
    if (lesson) {
      loadLessonTranslation();
    }
  }, [lesson, selectedLanguage]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load topic
      const { data: topicData, error: topicError } = await (supabase as any)
        .from('grammar_topics')
        .select(`
            id,
            slug,
            level,
            grammar_topic_translations(language_code, title, description)
          `)
        .eq('id', topicId)
        .single();

      if (topicError) throw topicError;
      setTopic({
        ...topicData,
        translations: (topicData as any).grammar_topic_translations || [],
      } as any);

      // Load or create lesson
      const { data: lessonData, error: lessonError } = await (supabase as any)
        .from('grammar_lessons')
        .select('*')
        .eq('topic_id', topicId)
        .order('lesson_order')
        .limit(1)
        .maybeSingle();

      if (lessonError) throw lessonError;

      if (lessonData) {
        setLesson(lessonData as any);
      } else {
        // Create a new lesson for this topic
        const { data: newLesson, error: createError } = await (supabase as any)
          .from('grammar_lessons')
          .insert({ topic_id: topicId, lesson_order: 1 })
          .select()
          .single();

        if (createError) throw createError;
        setLesson(newLesson as any);
      }

      // Load exercises
      const { data: exercisesData } = await (supabase as any)
        .from('grammar_exercises')
        .select('*')
        .eq('topic_id', topicId)
        .order('exercise_order');

      setExercises((exercisesData as any) || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load topic data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadLessonTranslation = async () => {
    if (!lesson) return;

    const { data, error } = await (supabase as any)
      .from('grammar_lesson_translations')
      .select('*')
      .eq('lesson_id', lesson.id)
      .eq('language_code', selectedLanguage)
      .maybeSingle();

    if (data) {
      setLessonTranslation({
        ...(data as any),
        rules: (data as any).rules || [],
        examples: (data as any).examples || [],
      });
    } else {
      // Reset to empty for new language
      setLessonTranslation({
        theory_title: '',
        theory_definition: '',
        theory_formation: '',
        theory_usage: '',
        theory_common_mistakes: '',
        rules: [],
        examples: [],
        localized_tips: '',
      });
    }
  };

  const handleGenerateContent = async () => {
    if (!lesson) return;

    // Confirm if overwriting existing content (if title exists)
    if (lessonTranslation.theory_title && !confirm('This will overwrite existing content for this language. Continue?')) {
      return;
    }

    setIsSaving(true);
    toast({
      title: 'Generating Content...',
      description: `AI is writing comprehensive grammar content for ${LANGUAGES.find(l => l.code === selectedLanguage)?.name}...`,
    });

    try {
      const languageName = LANGUAGES.find(l => l.code === selectedLanguage)?.name || 'English';

      const { data, error } = await supabase.functions.invoke('enhance-grammar-lesson', {
        body: {
          lesson_id: lesson.id,
          language_code: selectedLanguage,
          language_name: languageName
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to generate content');

      // Update local state with generated content
      const enhanced = data.data;
      setLessonTranslation({
        ...lessonTranslation,
        theory_title: enhanced.theory_title,
        theory_definition: enhanced.theory_definition,
        theory_formation: enhanced.theory_formation,
        theory_usage: enhanced.theory_usage,
        theory_common_mistakes: enhanced.theory_common_mistakes,
        rules: enhanced.rules,
        examples: enhanced.examples,
        localized_tips: enhanced.localized_tips,
      });

      toast({
        title: 'Content Generated! ✨',
        description: 'Review the content and click Save to persist changes.',
      });

    } catch (error: any) {
      console.error('Generation error:', error);
      toast({
        title: 'Generation Failed',
        description: error.message || 'Failed to generate content. Ensure English content exists first.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const saveLessonTranslation = async () => {
    if (!lesson) return;
    setIsSaving(true);

    try {
      const { error } = await (supabase as any)
        .from('grammar_lesson_translations')
        .upsert({
          lesson_id: lesson.id,
          language_code: selectedLanguage,
          theory_title: lessonTranslation.theory_title,
          theory_definition: lessonTranslation.theory_definition,
          theory_formation: lessonTranslation.theory_formation,
          theory_usage: lessonTranslation.theory_usage,
          theory_common_mistakes: lessonTranslation.theory_common_mistakes,
          rules: lessonTranslation.rules,
          examples: lessonTranslation.examples,
          localized_tips: lessonTranslation.localized_tips,
        }, { onConflict: 'lesson_id,language_code' });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Lesson content saved for ${LANGUAGES.find(l => l.code === selectedLanguage)?.name}`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save lesson',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const addRule = () => {
    setLessonTranslation(prev => ({
      ...prev,
      rules: [...(prev.rules || []), { title: '', formula: '', example: '' }],
    }));
  };

  const updateRule = (index: number, field: string, value: string) => {
    setLessonTranslation(prev => ({
      ...prev,
      rules: (prev.rules || []).map((rule, i) =>
        i === index ? { ...rule, [field]: value } : rule
      ),
    }));
  };

  const removeRule = (index: number) => {
    setLessonTranslation(prev => ({
      ...prev,
      rules: (prev.rules || []).filter((_, i) => i !== index),
    }));
  };

  const addExample = () => {
    setLessonTranslation(prev => ({
      ...prev,
      examples: [...(prev.examples || []), { sentence: '', translation: '', correct: true }],
    }));
  };

  const updateExample = (index: number, field: string, value: any) => {
    setLessonTranslation(prev => ({
      ...prev,
      examples: (prev.examples || []).map((ex, i) =>
        i === index ? { ...ex, [field]: value } : ex
      ),
    }));
  };

  const removeExample = (index: number) => {
    setLessonTranslation(prev => ({
      ...prev,
      examples: (prev.examples || []).filter((_, i) => i !== index),
    }));
  };

  // Exercise management
  const openExerciseDialog = async (exercise?: Exercise) => {
    if (exercise) {
      setEditingExercise(exercise);
      setExerciseForm({
        exercise_type: exercise.exercise_type,
        difficulty: exercise.difficulty,
        correct_order: exercise.correct_order || [],
        transformation_type: exercise.transformation_type || '',
      });

      // Load translation
      const { data } = await (supabase as any)
        .from('grammar_exercise_translations')
        .select('*')
        .eq('exercise_id', exercise.id)
        .eq('language_code', selectedLanguage)
        .maybeSingle();

      if (data) {
        setExerciseTranslation(data);
      } else {
        resetExerciseTranslation();
      }
    } else {
      setEditingExercise(null);
      setExerciseForm({
        exercise_type: 'multiple_choice',
        difficulty: 1,
        correct_order: [],
        transformation_type: '',
      });
      resetExerciseTranslation();
    }
    setShowExerciseDialog(true);
  };

  const resetExerciseTranslation = () => {
    setExerciseTranslation({
      question: '',
      instruction: '',
      correct_answer: '',
      incorrect_answers: ['', '', ''],
      explanation: '',
      hint: '',
      sentence_with_blank: '',
      incorrect_sentence: '',
      original_sentence: '',
    });
  };

  const saveExercise = async () => {
    if (!topicId) return;
    setIsSaving(true);

    try {
      let exerciseId = editingExercise?.id;

      if (editingExercise) {
        // Update exercise
        const { error } = await (supabase as any)
          .from('grammar_exercises')
          .update({
            exercise_type: exerciseForm.exercise_type,
            difficulty: exerciseForm.difficulty,
            correct_order: exerciseForm.exercise_type === 'drag_drop_reorder' ? exerciseForm.correct_order : null,
            transformation_type: exerciseForm.exercise_type === 'sentence_transformation' ? exerciseForm.transformation_type : null,
          })
          .eq('id', editingExercise.id);

        if (error) throw error;
      } else {
        // Create exercise
        const maxOrder = exercises.length > 0 ? Math.max(...exercises.map(e => e.exercise_order)) : 0;
        const { data, error } = await (supabase as any)
          .from('grammar_exercises')
          .insert({
            topic_id: topicId,
            exercise_type: exerciseForm.exercise_type,
            difficulty: exerciseForm.difficulty,
            exercise_order: maxOrder + 1,
            correct_order: exerciseForm.exercise_type === 'drag_drop_reorder' ? exerciseForm.correct_order : null,
            transformation_type: exerciseForm.exercise_type === 'sentence_transformation' ? exerciseForm.transformation_type : null,
          })
          .select()
          .single();

        if (error) throw error;
        exerciseId = (data as any).id;
      }

      // Save translation
      const { error: transError } = await (supabase as any)
        .from('grammar_exercise_translations')
        .upsert({
          exercise_id: exerciseId,
          language_code: selectedLanguage,
          question: exerciseTranslation.question,
          instruction: exerciseTranslation.instruction,
          correct_answer: exerciseTranslation.correct_answer,
          incorrect_answers: exerciseTranslation.incorrect_answers?.filter((a: string) => a.trim()),
          explanation: exerciseTranslation.explanation,
          hint: exerciseTranslation.hint,
          sentence_with_blank: exerciseTranslation.sentence_with_blank,
          incorrect_sentence: exerciseTranslation.incorrect_sentence,
          original_sentence: exerciseTranslation.original_sentence,
        }, { onConflict: 'exercise_id,language_code' });

      if (transError) throw transError;

      toast({
        title: 'Success',
        description: editingExercise ? 'Exercise updated' : 'Exercise created',
      });

      setShowExerciseDialog(false);
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save exercise',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteExercise = async (exerciseId: string | number) => {
    if (!confirm('Delete this exercise?')) return;

    try {
      const { error } = await (supabase as any)
        .from('grammar_exercises')
        .delete()
        .eq('id', exerciseId);

      if (error) throw error;

      toast({ title: 'Success', description: 'Exercise deleted' });
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete exercise',
        variant: 'destructive',
      });
    }
  };

  const getTopicTitle = () => {
    const trans = topic?.translations.find(t => t.language_code === 'en');
    return trans?.title || topic?.slug || 'Topic';
  };

  if (isLoading) {
    return (
      <AdminLayout title="Loading..." showBackButton>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={`Edit: ${getTopicTitle()}`} showBackButton backPath="/admin/grammar">
      <div className="space-y-6">
        {/* Language Selector */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Languages className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">Content Language:</span>
              </div>
              <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map(lang => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="theory">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="theory">
              <BookOpen className="w-4 h-4 mr-2" />
              Theory & Content
            </TabsTrigger>
            <TabsTrigger value="exercises">
              <Target className="w-4 h-4 mr-2" />
              Exercises ({exercises.length})
            </TabsTrigger>
          </TabsList>

          {/* Theory Tab */}
          <TabsContent value="theory" className="space-y-6 mt-6">
            {/* Definition */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-amber-500" />
                  Definition
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={lessonTranslation.theory_title || ''}
                    onChange={(e) => setLessonTranslation({ ...lessonTranslation, theory_title: e.target.value })}
                    placeholder="What is Present Simple?"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Definition / Explanation</Label>
                  <Textarea
                    value={lessonTranslation.theory_definition || ''}
                    onChange={(e) => setLessonTranslation({ ...lessonTranslation, theory_definition: e.target.value })}
                    placeholder="The present simple tense is used to describe..."
                    rows={5}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Formation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-500" />
                  How to Form It
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Formation Explanation</Label>
                  <Textarea
                    value={lessonTranslation.theory_formation || ''}
                    onChange={(e) => setLessonTranslation({ ...lessonTranslation, theory_formation: e.target.value })}
                    placeholder="To form the present simple, use the base form of the verb..."
                    rows={4}
                  />
                </div>

                {/* Rules */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Grammar Rules / Formulas</Label>
                    <Button variant="outline" size="sm" onClick={addRule}>
                      <Plus className="w-4 h-4 mr-1" />
                      Add Rule
                    </Button>
                  </div>
                  {(lessonTranslation.rules || []).map((rule, index) => (
                    <div key={index} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Rule {index + 1}</span>
                        <Button variant="ghost" size="sm" onClick={() => removeRule(index)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                      <Input
                        placeholder="Rule title (e.g., Affirmative)"
                        value={rule.title}
                        onChange={(e) => updateRule(index, 'title', e.target.value)}
                      />
                      <Input
                        placeholder="Formula (e.g., Subject + Verb(s/es) + Object)"
                        value={rule.formula}
                        onChange={(e) => updateRule(index, 'formula', e.target.value)}
                        className="font-mono"
                      />
                      <Input
                        placeholder="Example sentence"
                        value={rule.example}
                        onChange={(e) => updateRule(index, 'example', e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Usage */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  When to Use It
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={lessonTranslation.theory_usage || ''}
                  onChange={(e) => setLessonTranslation({ ...lessonTranslation, theory_usage: e.target.value })}
                  placeholder="Use present simple when talking about habits, facts, schedules..."
                  rows={5}
                />
              </CardContent>
            </Card>

            {/* Examples */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-purple-500" />
                    Examples
                  </span>
                  <Button variant="outline" size="sm" onClick={addExample}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Example
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(lessonTranslation.examples || []).map((example, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Example {index + 1}</span>
                        <Badge
                          variant={example.correct ? 'default' : 'destructive'}
                          className="cursor-pointer"
                          onClick={() => updateExample(index, 'correct', !example.correct)}
                        >
                          {example.correct ? 'Correct' : 'Incorrect'}
                        </Badge>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeExample(index)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                    <Input
                      placeholder="Example sentence"
                      value={example.sentence}
                      onChange={(e) => updateExample(index, 'sentence', e.target.value)}
                    />
                    <Input
                      placeholder="Translation (optional)"
                      value={example.translation || ''}
                      onChange={(e) => updateExample(index, 'translation', e.target.value)}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Common Mistakes */}
            <Card className="border-amber-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-700">
                  <AlertCircle className="w-5 h-5" />
                  Common Mistakes to Avoid
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={lessonTranslation.theory_common_mistakes || ''}
                  onChange={(e) => setLessonTranslation({ ...lessonTranslation, theory_common_mistakes: e.target.value })}
                  placeholder="Common mistakes learners make..."
                  rows={4}
                />
              </CardContent>
            </Card>

            {/* Localized Tips */}
            <Card className="border-purple-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-700">
                  <Languages className="w-5 h-5" />
                  Tips for {LANGUAGES.find(l => l.code === selectedLanguage)?.name} Speakers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={lessonTranslation.localized_tips || ''}
                  onChange={(e) => setLessonTranslation({ ...lessonTranslation, localized_tips: e.target.value })}
                  placeholder="Specific tips for speakers of this language..."
                  rows={4}
                />
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button onClick={saveLessonTranslation} disabled={isSaving}>
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Lesson Content'}
              </Button>
            </div>

            {/* AI Generation Helper */}
            <div className="mt-8 p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 dark:from-indigo-950/20 dark:to-purple-950/20 dark:border-indigo-900">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                  <Wand2 className="w-6 h-6 text-indigo-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-indigo-900 dark:text-indigo-300 mb-2">
                    AI Content Generator
                  </h3>
                  <p className="text-sm text-indigo-700 dark:text-indigo-400 mb-4">
                    Automatically generate comprehensive, localized theory content for <strong>{LANGUAGES.find(l => l.code === selectedLanguage)?.name}</strong>.
                    This will create deep definitions, usage rules, and comparison tables adapted for native speakers of this language.
                  </p>
                  <Button
                    onClick={handleGenerateContent}
                    disabled={isSaving}
                    variant="secondary"
                    className="bg-white text-indigo-600 hover:bg-indigo-50 border border-indigo-200 shadow-sm"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate {LANGUAGES.find(l => l.code === selectedLanguage)?.name} Content
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Exercises Tab */}
          <TabsContent value="exercises" className="space-y-6 mt-6">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Create interactive exercises for students to practice.
              </p>
              <Button onClick={() => openExerciseDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Add Exercise
              </Button>
            </div>

            {exercises.length === 0 ? (
              <Card className="p-8 text-center">
                <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Exercises Yet</h3>
                <p className="text-muted-foreground mb-4">Add exercises to help students practice this grammar topic.</p>
                <Button onClick={() => openExerciseDialog()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Exercise
                </Button>
              </Card>
            ) : (
              <div className="space-y-3">
                {exercises.map((exercise, index) => (
                  <Card key={exercise.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">
                                {EXERCISE_TYPES.find(t => t.value === exercise.exercise_type)?.label}
                              </Badge>
                              <Badge variant="outline">
                                Difficulty: {exercise.difficulty}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => openExerciseDialog(exercise as any)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteExercise(exercise.id as any)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Exercise Dialog */}
        <Dialog open={showExerciseDialog} onOpenChange={setShowExerciseDialog}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingExercise ? 'Edit Exercise' : 'Add New Exercise'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Exercise Type</Label>
                  <Select
                    value={exerciseForm.exercise_type}
                    onValueChange={(v) => setExerciseForm({ ...exerciseForm, exercise_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXERCISE_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Difficulty (1-3)</Label>
                  <Select
                    value={String(exerciseForm.difficulty)}
                    onValueChange={(v) => setExerciseForm({ ...exerciseForm, difficulty: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Easy</SelectItem>
                      <SelectItem value="2">2 - Medium</SelectItem>
                      <SelectItem value="3">3 - Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Common fields */}
              <div className="space-y-2">
                <Label>Question / Prompt</Label>
                <Textarea
                  value={exerciseTranslation.question || ''}
                  onChange={(e) => setExerciseTranslation({ ...exerciseTranslation, question: e.target.value })}
                  placeholder="Enter the question or prompt..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Instruction (optional)</Label>
                <Input
                  value={exerciseTranslation.instruction || ''}
                  onChange={(e) => setExerciseTranslation({ ...exerciseTranslation, instruction: e.target.value })}
                  placeholder="Choose the correct answer..."
                />
              </div>

              {/* Type-specific fields */}
              {exerciseForm.exercise_type === 'fill_in_blank' && (
                <div className="space-y-2">
                  <Label>Sentence with blank (use ___ for blank)</Label>
                  <Input
                    value={exerciseTranslation.sentence_with_blank || ''}
                    onChange={(e) => setExerciseTranslation({ ...exerciseTranslation, sentence_with_blank: e.target.value })}
                    placeholder="She ___ to school every day."
                  />
                </div>
              )}

              {exerciseForm.exercise_type === 'error_correction' && (
                <div className="space-y-2">
                  <Label>Incorrect Sentence (with error)</Label>
                  <Input
                    value={exerciseTranslation.incorrect_sentence || ''}
                    onChange={(e) => setExerciseTranslation({ ...exerciseTranslation, incorrect_sentence: e.target.value })}
                    placeholder="She go to school every day."
                  />
                </div>
              )}

              {exerciseForm.exercise_type === 'sentence_transformation' && (
                <>
                  <div className="space-y-2">
                    <Label>Transformation Type</Label>
                    <Input
                      value={exerciseForm.transformation_type || ''}
                      onChange={(e) => setExerciseForm({ ...exerciseForm, transformation_type: e.target.value })}
                      placeholder="Active to Passive"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Original Sentence</Label>
                    <Input
                      value={exerciseTranslation.original_sentence || ''}
                      onChange={(e) => setExerciseTranslation({ ...exerciseTranslation, original_sentence: e.target.value })}
                      placeholder="The cat eats the fish."
                    />
                  </div>
                </>
              )}

              {exerciseForm.exercise_type === 'drag_drop_reorder' && (
                <div className="space-y-2">
                  <Label>Correct Word Order (comma-separated)</Label>
                  <Input
                    value={exerciseForm.correct_order.join(', ')}
                    onChange={(e) => setExerciseForm({
                      ...exerciseForm,
                      correct_order: e.target.value.split(',').map(w => w.trim()).filter(Boolean)
                    })}
                    placeholder="She, goes, to, school, every, day"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Correct Answer</Label>
                <Input
                  value={exerciseTranslation.correct_answer || ''}
                  onChange={(e) => setExerciseTranslation({ ...exerciseTranslation, correct_answer: e.target.value })}
                  placeholder="The correct answer..."
                />
              </div>

              {exerciseForm.exercise_type === 'multiple_choice' && (
                <div className="space-y-2">
                  <Label>Incorrect Answers (one per line)</Label>
                  {(exerciseTranslation.incorrect_answers || ['', '', '']).map((ans, i) => (
                    <Input
                      key={i}
                      value={ans}
                      onChange={(e) => {
                        const newAnswers = [...(exerciseTranslation.incorrect_answers || ['', '', ''])];
                        newAnswers[i] = e.target.value;
                        setExerciseTranslation({ ...exerciseTranslation, incorrect_answers: newAnswers });
                      }}
                      placeholder={`Incorrect answer ${i + 1}`}
                    />
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <Label>Explanation (shown after answering)</Label>
                <Textarea
                  value={exerciseTranslation.explanation || ''}
                  onChange={(e) => setExerciseTranslation({ ...exerciseTranslation, explanation: e.target.value })}
                  placeholder="Explain why this is the correct answer..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Hint (optional)</Label>
                <Input
                  value={exerciseTranslation.hint || ''}
                  onChange={(e) => setExerciseTranslation({ ...exerciseTranslation, hint: e.target.value })}
                  placeholder="A helpful hint..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowExerciseDialog(false)}>
                Cancel
              </Button>
              <Button onClick={saveExercise} disabled={isSaving}>
                {isSaving ? 'Saving...' : editingExercise ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminGrammarLessonEditor;

