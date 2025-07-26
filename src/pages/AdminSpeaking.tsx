import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useAdminContent } from "@/hooks/useAdminContent";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Edit, Trash2 } from "lucide-react";

const AdminSpeaking = () => {
  const navigate = useNavigate();
  const { admin } = useAdminAuth();
  const { listContent, createContent, deleteContent, loading } = useAdminContent();
  const { toast } = useToast();
  const [prompts, setPrompts] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    cambridge_book: "",
    test_number: 1,
    part_number: 1,
    prompt_text: "",
    time_limit: 2,
    sample_answer: ""
  });

  useEffect(() => {
    if (!admin) {
      navigate("/admin/login");
      return;
    }
    loadPrompts();
  }, [admin, navigate]);

  const loadPrompts = async () => {
    try {
      const result = await listContent('speaking_prompts');
      setPrompts(result.data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load speaking prompts",
        variant: "destructive"
      });
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createContent('speaking_prompts', formData);
      toast({
        title: "Success",
        description: "Speaking prompt created successfully"
      });
      setFormData({
        title: "",
        cambridge_book: "",
        test_number: 1,
        part_number: 1,
        prompt_text: "",
        time_limit: 2,
        sample_answer: ""
      });
      setShowCreateForm(false);
      loadPrompts();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create prompt",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id) => {
    if (confirm("Are you sure you want to delete this prompt?")) {
      try {
        await deleteContent('speaking_prompts', id);
        toast({
          title: "Success",
          description: "Prompt deleted successfully"
        });
        loadPrompts();
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete prompt",
          variant: "destructive"
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/admin")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-2xl font-bold">Speaking Prompts</h1>
          </div>
          <Button onClick={() => setShowCreateForm(!showCreateForm)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Prompt
          </Button>
        </div>

        {showCreateForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Create New Speaking Prompt</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <Input
                  placeholder="Title"
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
                <div className="grid grid-cols-2 gap-4">
                  <Select value={formData.part_number.toString()} onValueChange={(value) => setFormData({...formData, part_number: parseInt(value)})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Part Number" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Part 1</SelectItem>
                      <SelectItem value="2">Part 2</SelectItem>
                      <SelectItem value="3">Part 3</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder="Time Limit (minutes)"
                    value={formData.time_limit}
                    onChange={(e) => setFormData({...formData, time_limit: parseInt(e.target.value)})}
                  />
                </div>
                <Textarea
                  placeholder="Prompt Text"
                  value={formData.prompt_text}
                  onChange={(e) => setFormData({...formData, prompt_text: e.target.value})}
                  rows={5}
                  required
                />
                <Textarea
                  placeholder="Sample Answer (optional)"
                  value={formData.sample_answer}
                  onChange={(e) => setFormData({...formData, sample_answer: e.target.value})}
                  rows={8}
                />
                <div className="flex gap-2">
                  <Button type="submit" disabled={loading}>Create Prompt</Button>
                  <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>Cancel</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4">
          {prompts.map((prompt) => (
            <Card key={prompt.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{prompt.title}</CardTitle>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(prompt.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 text-sm text-muted-foreground mb-2">
                  {prompt.cambridge_book && <span>Book: {prompt.cambridge_book}</span>}
                  {prompt.test_number && <span>Test: {prompt.test_number}</span>}
                  <span>Part: {prompt.part_number}</span>
                  <span>Time: {prompt.time_limit}min</span>
                </div>
                <p className="text-sm line-clamp-3">{prompt.prompt_text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminSpeaking;