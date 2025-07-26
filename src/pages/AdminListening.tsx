import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useAdminContent } from "@/hooks/useAdminContent";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Edit, Trash2, Upload } from "lucide-react";

const AdminListening = () => {
  const navigate = useNavigate();
  const { admin } = useAdminAuth();
  const { listContent, createContent, deleteContent, uploadAudio, loading } = useAdminContent();
  const { toast } = useToast();
  const [sections, setSections] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    title: "",
    section_number: 1,
    difficulty_level: "intermediate",
    instructions: "",
    transcript: "",
    audio_url: "",
    cambridge_book: "",
    test_number: 1
  });

  useEffect(() => {
    if (!admin) {
      navigate("/admin/login");
      return;
    }
    loadSections();
  }, [admin, navigate]);

  const loadSections = async () => {
    try {
      const result = await listContent('listening_sections');
      setSections(result.data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load listening sections",
        variant: "destructive"
      });
    }
  };

  const handleAudioUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingAudio(true);
    try {
      const result = await uploadAudio(file);
      setFormData({...formData, audio_url: result.url});
      toast({
        title: "Success",
        description: "Audio uploaded successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload audio",
        variant: "destructive"
      });
    } finally {
      setUploadingAudio(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createContent('listening_sections', formData);
      toast({
        title: "Success",
        description: "Listening section created successfully"
      });
      setFormData({
        title: "",
        section_number: 1,
        difficulty_level: "intermediate",
        instructions: "",
        transcript: "",
        audio_url: "",
        cambridge_book: "",
        test_number: 1
      });
      setShowCreateForm(false);
      loadSections();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create section",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id) => {
    if (confirm("Are you sure you want to delete this section?")) {
      try {
        await deleteContent('listening_sections', id);
        toast({
          title: "Success",
          description: "Section deleted successfully"
        });
        loadSections();
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete section",
          variant: "destructive"
        });
      }
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--gradient-hero)' }}>
      <div className="container mx-auto px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/admin")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-2xl font-bold">Listening Sections</h1>
          </div>
          <Button onClick={() => setShowCreateForm(!showCreateForm)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Section
          </Button>
        </div>

        {showCreateForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Create New Listening Section</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <Input
                  placeholder="Section Title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  required
                />
                <div className="grid grid-cols-2 gap-4">
                  <Select value={formData.cambridge_book} onValueChange={(value) => setFormData({...formData, cambridge_book: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Cambridge Book" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({length: 20}, (_, i) => 20 - i).map(num => (
                        <SelectItem key={num} value={`C${num}`}>Cambridge {num}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={formData.test_number.toString()} onValueChange={(value) => setFormData({...formData, test_number: parseInt(value)})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Test Number" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({length: 4}, (_, i) => i + 1).map(num => (
                        <SelectItem key={num} value={num.toString()}>Test {num}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  type="number"
                  placeholder="Section Number"
                  value={formData.section_number}
                  onChange={(e) => setFormData({...formData, section_number: parseInt(e.target.value)})}
                  required
                />
                <Select value={formData.difficulty_level} onValueChange={(value) => setFormData({...formData, difficulty_level: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea
                  placeholder="Instructions"
                  value={formData.instructions}
                  onChange={(e) => setFormData({...formData, instructions: e.target.value})}
                  rows={3}
                />
                <Textarea
                  placeholder="Transcript"
                  value={formData.transcript}
                  onChange={(e) => setFormData({...formData, transcript: e.target.value})}
                  rows={8}
                />
                <div className="space-y-2">
                  <label className="text-sm font-medium">Audio File</label>
                  <div className="flex gap-2 items-center">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="audio/*"
                      onChange={handleAudioUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAudio}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploadingAudio ? "Uploading..." : "Upload Audio"}
                    </Button>
                    {formData.audio_url && (
                      <span className="text-sm text-green-600">Audio uploaded</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={loading}>Create Section</Button>
                  <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>Cancel</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4">
          {sections.map((section) => (
            <Card key={section.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{section.title}</CardTitle>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(section.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 text-sm text-muted-foreground mb-2">
                  {section.cambridge_book && <span>Book: {section.cambridge_book}</span>}
                  {section.test_number && <span>Test: {section.test_number}</span>}
                  <span>Section: {section.section_number}</span>
                  <span>Level: {section.difficulty_level}</span>
                  {section.audio_url && <span className="text-green-600">Has Audio</span>}
                </div>
                <p className="text-sm line-clamp-3">{section.instructions}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminListening;