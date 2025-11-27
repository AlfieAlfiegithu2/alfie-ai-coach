import { useState, useEffect } from 'react';
import { Upload, Image as ImageIcon, Sparkles, Eye, Check, X, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ExtractedQuestion {
    question_number: number;
    question_text: string;
    question_type: string;
    options: string[] | null;
    correct_answer: string;
    explanation: string;
}

interface ImageQuestionExtractorProps {
    testId: string;
    testType: string;
    onQuestionsExtracted: (questions: ExtractedQuestion[]) => void;
    initialImageFile?: File | null;
    onImageSelected?: (file: File) => void;
}

export const ImageQuestionExtractor = ({ testId, testType, onQuestionsExtracted, initialImageFile, onImageSelected }: ImageQuestionExtractorProps) => {
    const [image, setImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>('');
    const [extractionType, setExtractionType] = useState('questions');
    const [questionType, setQuestionType] = useState('Multiple Choice');
    const [extracting, setExtracting] = useState(false);
    const [extractedQuestions, setExtractedQuestions] = useState<ExtractedQuestion[]>([]);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editedQuestion, setEditedQuestion] = useState<ExtractedQuestion | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        if (initialImageFile) {
            handleImageUpload(initialImageFile);
        }
    }, [initialImageFile]);

    const handleImageUpload = (file: File) => {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file (JPG, PNG, WebP)');
            return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            toast.error('Image size should be less than 10MB');
            return;
        }

        setImage(file);
        if (onImageSelected) onImageSelected(file);

        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
        toast.success('Image uploaded successfully!');
    };

    // Drag and drop handlers
    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        // Only set dragging to false if leaving the drop zone itself
        if (e.currentTarget === e.target) {
            setIsDragging(false);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            const file = files[0];
            handleImageUpload(file);
        }
    };

    const extractQuestions = async () => {
        if (!image) {
            toast.error('Please upload an image');
            return;
        }

        setExtracting(true);
        try {
            // Convert image to base64
            const base64 = imagePreview.split(',')[1]; // Remove data:image/jpeg;base64, prefix

            // Use fixed range 1-40 for IELTS Listening
            const questionRange = '1-40';
            const finalQuestionType = questionType && questionType !== 'auto' ? questionType : '';

            console.log('📤 Sending to Gemini:', {
                extractionType,
                questionRange,
                questionType: finalQuestionType || 'AUTO-DETECT',
                imageSize: base64.length
            });

            // Call Gemini extraction function
            const { data, error } = await supabase.functions.invoke('gemini-question-extractor', {
                body: {
                    imageBase64: base64,
                    questionRange,
                    questionType: finalQuestionType,
                    extractionType,
                    testType,
                    testId
                }
            });

            if (error) {
                console.error('❌ Extraction error:', error);
                throw error;
            }

            if (!data.success) {
                throw new Error(data.error || 'Extraction failed');
            }

            console.log('✅ Extracted questions:', data);

            setExtractedQuestions(data.questions);

            // Show success with detected info
            const detectedInfo = data.autoDetected
                ? `\nDetected: ${data.range} (${data.questionType})`
                : `Range: ${data.range}`;

            toast.success(
                `✨ Successfully extracted ${data.count} questions!`,
                { description: detectedInfo }
            );

        } catch (error: any) {
            console.error('❌ Extraction failed:', error);
            toast.error(
                'Failed to extract questions',
                { description: error.message || 'Please try again or check the image quality' }
            );
        } finally {
            setExtracting(false);
        }
    };

    const startEditing = (index: number) => {
        setEditingIndex(index);
        setEditedQuestion({ ...extractedQuestions[index] });
    };

    const cancelEditing = () => {
        setEditingIndex(null);
        setEditedQuestion(null);
    };

    const saveEdit = () => {
        if (editingIndex !== null && editedQuestion) {
            const updated = [...extractedQuestions];
            updated[editingIndex] = editedQuestion;
            setExtractedQuestions(updated);
            setEditingIndex(null);
            setEditedQuestion(null);
            toast.success('Question updated');
        }
    };

    const removeQuestion = (index: number) => {
        const updated = extractedQuestions.filter((_, i) => i !== index);
        setExtractedQuestions(updated);
        toast.success('Question removed');
    };

    return (
        <div className="space-y-6">
            <Card className="border-2 border-purple-200 dark:border-purple-800">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950">
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-600" />
                        AI Question Extraction (Gemini Vision)
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                        Upload an image of IELTS questions and let Gemini AI extract them automatically
                    </p>
                </CardHeader>

                <CardContent className="pt-6 space-y-6">
                    {/* Image Upload - Drag and Drop */}
                    <div
                        className={`border-2 border-dashed rounded-lg p-8 transition-all duration-200 ${isDragging
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 scale-[1.02]'
                            : 'border-border hover:border-purple-400'
                            }`}
                        onDragEnter={handleDragEnter}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        {!imagePreview ? (
                            <div className="text-center">
                                <div className={`transition-transform duration-200 ${isDragging ? 'scale-110' : ''}`}>
                                    <ImageIcon className={`w-16 h-16 mx-auto mb-4 ${isDragging ? 'text-purple-600' : 'text-purple-400'
                                        }`} />
                                </div>
                                <h4 className="font-medium mb-2">
                                    {isDragging ? '📎 Drop image here!' : 'Upload Question Image'}
                                </h4>
                                <p className="text-sm text-muted-foreground mb-4">
                                    {isDragging
                                        ? 'Release to upload'
                                        : 'Drag & drop or click to browse • JPG, PNG, WebP (max 10MB)'
                                    }
                                </p>
                                {!isDragging && (
                                    <>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) handleImageUpload(file);
                                            }}
                                            className="hidden"
                                            id="question-image-upload"
                                        />
                                        <Button
                                            onClick={() => document.getElementById('question-image-upload')?.click()}
                                            variant="outline"
                                            className="border-purple-300 hover:bg-purple-50"
                                        >
                                            <Upload className="w-4 h-4 mr-2" />
                                            Choose Image
                                        </Button>
                                        <p className="text-xs text-muted-foreground mt-3">
                                            💡 Tip: Clear, high-resolution images work best
                                        </p>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="relative max-h-96 overflow-hidden rounded-lg border">
                                    <img
                                        src={imagePreview}
                                        alt="Questions Preview"
                                        className="w-full object-contain"
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                                        <Check className="w-4 h-4 text-green-500" />
                                        {image?.name} ({(image!.size / 1024).toFixed(0)} KB)
                                    </p>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setImage(null);
                                            setImagePreview('');
                                            setExtractedQuestions([]);
                                        }}
                                    >
                                        Change Image
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Configuration */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                Extraction Type
                            </label>
                            <Select value={extractionType} onValueChange={setExtractionType}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select extraction type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="questions">📝 Questions (Full questions with options)</SelectItem>
                                    <SelectItem value="answers">✓ Answers Only (Answer keys for 1-40)</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                💡 Choose whether to extract full questions or just the answer keys
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                Question Type <span className="text-muted-foreground font-normal">(Optional - AI will detect)</span>
                            </label>
                            <Select value={questionType} onValueChange={setQuestionType}>
                                <SelectTrigger>
                                    <SelectValue placeholder="AI will auto-detect type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="auto">🤖 Auto-Detect (Recommended)</SelectItem>
                                    <SelectItem value="Listening Question Type 1 – Multiple choice">Type 1 – Multiple choice</SelectItem>
                                    <SelectItem value="Listening Question Type 2 – Matching">Type 2 – Matching</SelectItem>
                                    <SelectItem value="Listening Question Type 3 – Plan/map/diagram labelling">Type 3 – Plan/map/diagram labelling</SelectItem>
                                    <SelectItem value="Listening Question Type 4 – Form/note/table/flow chart/summary completion">Type 4 – Form/note/table/flow chart/summary completion</SelectItem>
                                    <SelectItem value="Listening Question Type 5 – Sentence completion">Type 5 – Sentence completion</SelectItem>
                                    <SelectItem value="Listening Question Type 6 – Short-answer questions">Type 6 – Short-answer questions</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                💡 AI analyzes the image to identify question types
                            </p>
                        </div>
                    </div>

                    {/* Extract Button */}
                    <Button
                        onClick={extractQuestions}
                        disabled={!image || extracting}
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                        size="lg"
                    >
                        {extracting ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                                Gemini AI is analyzing the image...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-5 h-5 mr-2" />
                                Extract Questions with AI
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* Preview Extracted Questions */}
            {extractedQuestions.length > 0 && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Eye className="w-5 h-5" />
                                    Extracted Questions ({extractedQuestions.length})
                                </CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Review and edit if needed, then save to database
                                </p>
                            </div>
                            <Badge variant="secondary" className="text-sm">
                                {extractionType === 'questions' ? 'Questions 1-40' : 'Answers 1-40'}
                            </Badge>
                        </div>
                    </CardHeader>

                    <CardContent>
                        <div className="max-h-[600px] overflow-y-auto space-y-4">
                            {extractedQuestions.map((q, index) => (
                                <div key={index} className="border rounded-lg overflow-hidden">
                                    {editingIndex === index ? (
                                        // Edit Mode
                                        <div className="p-4 space-y-3 bg-muted/30">
                                            <div>
                                                <label className="text-xs font-medium">Question {q.question_number}</label>
                                                <Textarea
                                                    value={editedQuestion?.question_text || ''}
                                                    onChange={(e) => setEditedQuestion(prev => prev ? { ...prev, question_text: e.target.value } : null)}
                                                    rows={3}
                                                    className="mt-1"
                                                />
                                            </div>
                                            {editedQuestion?.options && (
                                                <div>
                                                    <label className="text-xs font-medium">Options (one per line)</label>
                                                    <Textarea
                                                        value={editedQuestion.options.join('\n')}
                                                        onChange={(e) => setEditedQuestion(prev => prev ? { ...prev, options: e.target.value.split('\n') } : null)}
                                                        rows={4}
                                                        className="mt-1"
                                                    />
                                                </div>
                                            )}
                                            <div>
                                                <label className="text-xs font-medium">Correct Answer</label>
                                                <Input
                                                    value={editedQuestion?.correct_answer || ''}
                                                    onChange={(e) => setEditedQuestion(prev => prev ? { ...prev, correct_answer: e.target.value } : null)}
                                                    className="mt-1"
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                <Button size="sm" onClick={saveEdit}>
                                                    <Check className="w-4 h-4 mr-1" />
                                                    Save
                                                </Button>
                                                <Button size="sm" variant="outline" onClick={cancelEditing}>
                                                    <X className="w-4 h-4 mr-1" />
                                                    Cancel
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        // View Mode - Student Preview
                                        <div>
                                            {/* Header with controls */}
                                            <div className="flex items-center justify-between p-3 bg-muted/50 border-b">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="font-mono">Q{q.question_number}</Badge>
                                                    <Badge
                                                        variant="secondary"
                                                        className={
                                                            q.question_type === 'Multiple Choice' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                                                                q.question_type === 'Fill in the blank' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                                                                    q.question_type === 'True/False/Not Given' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' :
                                                                        'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                                                        }
                                                    >
                                                        {q.question_type}
                                                    </Badge>
                                                </div>
                                                <div className="flex gap-1">
                                                    <Button size="sm" variant="ghost" onClick={() => startEditing(index)}>
                                                        <Edit2 className="w-3 h-3" />
                                                    </Button>
                                                    <Button size="sm" variant="ghost" onClick={() => removeQuestion(index)} className="text-red-500 hover:text-red-700">
                                                        <X className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Student-Facing Preview */}
                                            <div className="p-4 bg-white dark:bg-gray-900">
                                                <div className="mb-3">
                                                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                                        Question {q.question_number}
                                                    </p>
                                                    <p className="text-base leading-relaxed">{q.question_text}</p>
                                                </div>

                                                {/* Multiple Choice Preview */}
                                                {q.options && q.options.length > 0 && (
                                                    <div className="space-y-2 pl-2">
                                                        {q.options.map((opt, j) => (
                                                            <label
                                                                key={j}
                                                                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${opt === q.correct_answer
                                                                    ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                                                                    : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                                    }`}
                                                            >
                                                                <input
                                                                    type="radio"
                                                                    name={`question-${index}`}
                                                                    checked={opt === q.correct_answer}
                                                                    readOnly
                                                                    className="w-4 h-4"
                                                                />
                                                                <span className={opt === q.correct_answer ? 'font-medium text-green-700 dark:text-green-300' : ''}>
                                                                    {opt}
                                                                </span>
                                                                {opt === q.correct_answer && (
                                                                    <Badge variant="default" className="ml-auto text-xs">✓ Correct</Badge>
                                                                )}
                                                            </label>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Fill in the Blank Preview */}
                                                {!q.options && q.correct_answer && (
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-2">
                                                            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Answer:</label>
                                                            <Input
                                                                value={q.correct_answer}
                                                                readOnly
                                                                className="max-w-xs bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 font-medium"
                                                            />
                                                            <Badge variant="default" className="text-xs">✓ Correct Answer</Badge>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Explanation if available */}
                                                {q.explanation && (
                                                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                                        <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">Explanation:</p>
                                                        <p className="text-sm text-blue-600 dark:text-blue-400">{q.explanation}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 flex gap-3">
                            <Button
                                onClick={() => onQuestionsExtracted(extractedQuestions)}
                                className="flex-1 bg-green-600 hover:bg-green-700"
                                size="lg"
                            >
                                <Check className="w-5 h-5 mr-2" />
                                Save {extractedQuestions.length} Questions to Database
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setExtractedQuestions([])}
                            >
                                Clear All
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};
