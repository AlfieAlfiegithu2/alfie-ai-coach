import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckCircle, ChevronDown, Upload, Circle, Headphones, Image } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useAdminContent } from "@/hooks/useAdminContent";
import CSVImport from "@/components/CSVImport";
import { toast } from "sonner";

interface ListeningPart {
  number: number;
  title: string;
  instructions: string;
  audioFile: File | null;
  imageFile: File | null;
  csvFile: File | null;
  saved: boolean;
}

const AdminIELTSListening = () => {
  const navigate = useNavigate();
  const { testType, testId } = useParams<{ testType: string; testId: string; }>();
  const { admin, loading } = useAdminAuth();
  const { listContent, createContent, uploadAudio } = useAdminContent();
  
  const [parts, setParts] = useState<ListeningPart[]>([
    { number: 1, title: "", instructions: "", audioFile: null, imageFile: null, csvFile: null, saved: false },
    { number: 2, title: "", instructions: "", audioFile: null, imageFile: null, csvFile: null, saved: false },
    { number: 3, title: "", instructions: "", audioFile: null, imageFile: null, csvFile: null, saved: false },
    { number: 4, title: "", instructions: "", audioFile: null, imageFile: null, csvFile: null, saved: false }
  ]);
  const [openParts, setOpenParts] = useState<Set<number>>(new Set([1]));
  const [savingPart, setSavingPart] = useState<number | null>(null);

  useEffect(() => {
    if (!loading && !admin) {
      navigate('/admin/login');
    }
  }, [admin, loading, navigate]);

  useEffect(() => {
    loadExistingData();
  }, [testType, testId]);

  const loadExistingData = async () => {
    if (!testType || !testId) return;
    
    try {
      // Load existing listening sections and questions for this test
      const [sectionsResponse, questionsResponse] = await Promise.all([
        listContent('listening_sections'),
        listContent('listening_questions')
      ]);

      const sections = sectionsResponse?.data?.filter((s: any) => 
        s.test_number === parseInt(testId) && 
        s.cambridge_book === `${testType?.toUpperCase()} Test ${testId}`
      ) || [];

      const questions = questionsResponse?.data?.filter((q: any) => 
        q.cambridge_book === `${testType?.toUpperCase()} Test ${testId}`
      ) || [];

      // Update parts with existing data
      const updatedParts = parts.map(part => {
        const partSection = sections.find((s: any) => s.part_number === part.number);
        const partQuestions = questions.filter((q: any) => q.part_number === part.number);
        
        return {
          ...part,
          title: partSection?.title || "",
          instructions: partSection?.instructions || "",
          saved: !!(partSection && partQuestions.length > 0)
        };
      });

      setParts(updatedParts);
    } catch (error) {
      console.error('Error loading existing data:', error);
      toast.error('Failed to load existing data');
    }
  };

  const togglePart = (partNumber: number) => {
    const newOpen = new Set(openParts);
    if (newOpen.has(partNumber)) {
      newOpen.delete(partNumber);
    } else {
      newOpen.add(partNumber);
    }
    setOpenParts(newOpen);
  };

  const updatePart = (partNumber: number, field: keyof ListeningPart, value: any) => {
    setParts(prevParts => 
      prevParts.map(part => 
        part.number === partNumber 
          ? { ...part, [field]: value, saved: false }
          : part
      )
    );
  };

  const handleCSVUpload = (partNumber: number, questions: any[]) => {
    console.log('CSV uploaded for part', partNumber, 'with questions:', questions);
    const questionsData = JSON.stringify(questions);
    const file = new File([questionsData], `part-${partNumber}-questions.json`, {
      type: 'application/json'
    });
    updatePart(partNumber, 'csvFile', file);
  };

  const handleAudioUpload = (partNumber: number, file: File) => {
    updatePart(partNumber, 'audioFile', file);
    toast.success(`Audio file uploaded for Part ${partNumber}`);
  };

  const handleImageUpload = (partNumber: number, file: File) => {
    updatePart(partNumber, 'imageFile', file);
    toast.success(`Image uploaded for Part ${partNumber}`);
  };

  const savePart = async (partNumber: number) => {
    const part = parts.find(p => p.number === partNumber);
    if (!part) return;

    if (!part.title.trim() || !part.instructions.trim() || !part.csvFile) {
      toast.error('Please fill in title, instructions and upload a CSV file');
      return;
    }

    setSavingPart(partNumber);
    try {
      let audioUrl = null;
      let imageUrl = null;

      // Upload audio file if provided
      if (part.audioFile) {
        const audioResult = await uploadAudio(part.audioFile);
        audioUrl = audioResult.url;
      }

      // Upload image file if provided (using same upload method for now)
      if (part.imageFile) {
        const imageResult = await uploadAudio(part.imageFile);
        imageUrl = imageResult.url;
      }

      // Parse questions from file
      const fileContent = await part.csvFile.text();
      let questions;
      
      try {
        questions = JSON.parse(fileContent);
      } catch {
        const lines = fileContent.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        
        questions = lines.slice(1).map((line, index) => {
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
          const question: any = {};
          headers.forEach((header, i) => {
            question[header] = values[i] || '';
          });
          return question;
        }).filter(q => q.question_text && q.correct_answer);
      }

      // Create listening section
      const sectionData = {
        title: part.title,
        instructions: part.instructions,
        test_number: parseInt(testId || '1'),
        cambridge_book: `${testType?.toUpperCase()} Test ${testId}`,
        part_number: partNumber,
        section_number: partNumber,
        audio_url: audioUrl,
        photo_url: imageUrl
      };

      const sectionResponse = await createContent('listening_sections', sectionData);
      const sectionId = sectionResponse?.data?.id;

      if (!sectionId) {
        throw new Error('Failed to create listening section');
      }

      // Create questions in bulk
      const questionsBatch = questions.map((question: any, i: number) => {
        const questionNumber = ((partNumber - 1) * 10) + (i + 1);
        
        return {
          question_number: questionNumber,
          question_text: question.question_text || '',
          question_type: question.question_type || 'Multiple Choice',
          options: question.options || null,
          correct_answer: question.correct_answer || '',
          explanation: question.explanation || '',
          section_id: sectionId,
          part_number: partNumber
        };
      });

      await createContent('listening_questions', questionsBatch);

      // Update part status
      setParts(prevParts => 
        prevParts.map(p => 
          p.number === partNumber 
            ? { ...p, saved: true }
            : p
        )
      );

      toast.success(`Part ${partNumber} saved successfully with ${questions.length} questions`);
    } catch (error: any) {
      console.error('Error saving part:', error);
      const errorMessage = error.message || `Failed to save Part ${partNumber}`;
      toast.error(`Error: ${errorMessage}. Please check your data and try again.`);
    } finally {
      setSavingPart(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading Listening Management...</p>
        </div>
      </div>
    );
  }

  if (!admin) return null;

  return (
    <AdminLayout 
      title={`${testType?.toUpperCase()} Test ${testId} - Listening Management`}
      showBackButton={true}
      backPath={`/admin/${testType}/listening`}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              {testType?.toUpperCase()} Test {testId} - Listening Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Create a complete 4-part listening test with audio, questions and optional images
            </p>
          </div>
          <Badge variant="secondary" className="text-sm">
            Test {testId}
          </Badge>
        </div>

        {/* Test Parts */}
        <div className="space-y-4">
          {parts.map((part) => (
            <Card key={part.number} className="border border-border">
              <Collapsible 
                open={openParts.has(part.number)} 
                onOpenChange={() => togglePart(part.number)}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <ChevronDown 
                          className={`w-5 h-5 transition-transform ${
                            openParts.has(part.number) ? '' : '-rotate-90'
                          }`} 
                        />
                        <CardTitle className="flex items-center gap-2">
                          {part.saved ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <Circle className="w-5 h-5 text-muted-foreground" />
                          )}
                          Part {part.number}
                        </CardTitle>
                      </div>
                      <Badge variant={part.saved ? "default" : "outline"}>
                        {part.saved ? 'Saved' : 'Not Saved'}
                      </Badge>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <CardContent className="space-y-6">
                    {/* Section Title */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Section Title *
                      </label>
                      <Input
                        placeholder={`Listening Section ${part.number} Title`}
                        value={part.title}
                        onChange={(e) => updatePart(part.number, 'title', e.target.value)}
                      />
                    </div>

                    {/* Instructions */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Instructions *
                      </label>
                      <Textarea
                        placeholder="Enter the instructions for this listening section..."
                        value={part.instructions}
                        onChange={(e) => updatePart(part.number, 'instructions', e.target.value)}
                        rows={3}
                        className="resize-none"
                      />
                    </div>

                    {/* Audio Upload */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Audio File *
                      </label>
                      <div className="border-2 border-dashed border-border rounded-lg p-4">
                        <div className="flex items-center justify-center">
                          <div className="text-center">
                            <Headphones className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground mb-2">
                              Upload MP3 or WAV audio file
                            </p>
                            <input
                              type="file"
                              accept="audio/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleAudioUpload(part.number, file);
                              }}
                              className="hidden"
                              id={`audio-${part.number}`}
                            />
                            <Button
                              variant="outline"
                              onClick={() => document.getElementById(`audio-${part.number}`)?.click()}
                            >
                              <Upload className="w-4 h-4 mr-2" />
                              Choose Audio File
                            </Button>
                          </div>
                        </div>
                        {part.audioFile && (
                          <p className="text-sm text-muted-foreground mt-2 text-center">
                            Audio: {part.audioFile.name}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Image Upload (Optional) */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Image File (Optional)
                      </label>
                      <div className="border-2 border-dashed border-border rounded-lg p-4">
                        <div className="flex items-center justify-center">
                          <div className="text-center">
                            <Image className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground mb-2">
                              Upload image for visual questions (maps, diagrams, etc.)
                            </p>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImageUpload(part.number, file);
                              }}
                              className="hidden"
                              id={`image-${part.number}`}
                            />
                            <Button
                              variant="outline"
                              onClick={() => document.getElementById(`image-${part.number}`)?.click()}
                            >
                              <Upload className="w-4 h-4 mr-2" />
                              Choose Image
                            </Button>
                          </div>
                        </div>
                        {part.imageFile && (
                          <p className="text-sm text-muted-foreground mt-2 text-center">
                            Image: {part.imageFile.name}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Questions CSV Upload */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Questions CSV File *
                      </label>
                      <div className="border-2 border-dashed border-border rounded-lg p-6">
                        <CSVImport
                          onImport={(questions) => handleCSVUpload(part.number, questions)}
                          type="listening"
                          module={testType as 'ielts' | 'pte' | 'toefl' | 'general'}
                          cambridgeBook={`${testType?.toUpperCase()} Test ${testId}`}
                          testNumber={parseInt(testId || '1')}
                          sectionNumber={part.number}
                          hideDownloadSample={true}
                        />
                        {part.csvFile && (
                          <p className="text-sm text-muted-foreground mt-2">
                            File: {part.csvFile.name}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end">
                      <Button 
                        onClick={() => savePart(part.number)}
                        disabled={savingPart === part.number || !part.title.trim() || !part.instructions.trim() || !part.csvFile}
                        className="bg-primary hover:bg-primary/90"
                      >
                        {savingPart === part.number ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Saving Part {part.number}...
                          </>
                        ) : (
                          `Save Part ${part.number}`
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminIELTSListening;