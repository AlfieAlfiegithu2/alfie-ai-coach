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

const AdminReading = () => {
  const navigate = useNavigate();
  const { admin } = useAdminAuth();
  const { listContent, createContent, deleteContent, loading } = useAdminContent();
  const { toast } = useToast();
  const [passages, setPassages] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    difficulty_level: "intermediate",
    passage_type: "academic"
  });

  useEffect(() => {
    if (!admin) {
      navigate("/admin/login");
      return;
    }
    loadPassages();
  }, [admin, navigate]);

  const loadPassages = async () => {
    try {
      const result = await listContent('reading_passages');
      setPassages(result.data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load reading passages",
        variant: "destructive"
      });
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createContent('reading_passages', formData);
      toast({
        title: "Success",
        description: "Reading passage created successfully"
      });
      setFormData({ title: "", content: "", difficulty_level: "intermediate", passage_type: "academic" });
      setShowCreateForm(false);
      loadPassages();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create passage",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id) => {
    if (confirm("Are you sure you want to delete this passage?")) {
      try {
        await deleteContent('reading_passages', id);
        toast({
          title: "Success",
          description: "Passage deleted successfully"
        });
        loadPassages();
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete passage",
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
            <h1 className="text-2xl font-bold">Reading Passages</h1>
          </div>
          <Button onClick={() => setShowCreateForm(!showCreateForm)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Passage
          </Button>
        </div>

        {showCreateForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Create New Reading Passage</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <Input
                  placeholder="Passage Title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
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
                <Select value={formData.passage_type} onValueChange={(value) => setFormData({...formData, passage_type: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="academic">Academic</SelectItem>
                    <SelectItem value="general">General Training</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea
                  placeholder="Passage Content"
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  rows={10}
                  required
                />
                <div className="flex gap-2">
                  <Button type="submit" disabled={loading}>Create Passage</Button>
                  <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>Cancel</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4">
          {passages.map((passage) => (
            <Card key={passage.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{passage.title}</CardTitle>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(passage.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 text-sm text-muted-foreground mb-2">
                  <span>Level: {passage.difficulty_level}</span>
                  <span>Type: {passage.passage_type}</span>
                </div>
                <p className="text-sm line-clamp-3">{passage.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminReading;