import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminContent } from "@/hooks/useAdminContent";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2 } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";

const AdminReading = () => {
  const { listContent, createContent, deleteContent, loading } = useAdminContent();
  const { toast } = useToast();
  const [passages, setPassages] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    difficulty_level: "intermediate",
    passage_type: "academic",
    cambridge_book: "",
    test_number: 1
  });

  useEffect(() => {
    loadPassages();
  }, []);

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createContent('reading_passages', formData);
      toast({
        title: "Success",
        description: "Reading passage created successfully"
      });
      setFormData({ 
        title: "", 
        content: "", 
        difficulty_level: "intermediate", 
        passage_type: "academic", 
        cambridge_book: "", 
        test_number: 1 
      });
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

  const handleDelete = async (id: string) => {
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
    <AdminLayout title="Reading Passages">
      <div className="max-w-6xl mx-auto">
        {/* Header with Create Button */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-georgia font-bold text-foreground mb-2">Reading Passages</h1>
            <p className="text-warm-gray">Manage reading passages from Cambridge books C20 to C1</p>
          </div>
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="rounded-xl"
            style={{ background: 'var(--gradient-button)', border: 'none' }}
          >
            <Plus className="w-4 h-4 mr-2" />
            {showCreateForm ? 'Cancel' : 'Create New Passage'}
          </Button>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <Card 
            className="mb-8 rounded-2xl border-light-border shadow-soft"
            style={{ background: 'var(--gradient-card)' }}
          >
            <CardHeader>
              <CardTitle className="text-2xl font-georgia text-foreground">Create New Reading Passage</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-6">
                <Input
                  placeholder="Passage Title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  required
                  className="rounded-xl border-light-border"
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Select value={formData.cambridge_book} onValueChange={(value) => setFormData({...formData, cambridge_book: value})}>
                      <SelectTrigger className="rounded-xl border-light-border">
                        <SelectValue placeholder="Select Cambridge Book" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-light-border bg-card">
                        {Array.from({length: 20}, (_, i) => 20 - i).map(num => (
                          <SelectItem key={num} value={`C${num}`}>Cambridge {num}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Select value={formData.test_number.toString()} onValueChange={(value) => setFormData({...formData, test_number: parseInt(value)})}>
                      <SelectTrigger className="rounded-xl border-light-border">
                        <SelectValue placeholder="Select Test Number" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-light-border bg-card">
                        {Array.from({length: 4}, (_, i) => i + 1).map(num => (
                          <SelectItem key={num} value={num.toString()}>Test {num}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <Select value={formData.difficulty_level} onValueChange={(value) => setFormData({...formData, difficulty_level: value})}>
                    <SelectTrigger className="rounded-xl border-light-border">
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-light-border bg-card">
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={formData.passage_type} onValueChange={(value) => setFormData({...formData, passage_type: value})}>
                    <SelectTrigger className="rounded-xl border-light-border">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-light-border bg-card">
                      <SelectItem value="academic">Academic</SelectItem>
                      <SelectItem value="general">General Training</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Textarea
                  placeholder="Passage Content"
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  rows={12}
                  required
                  className="rounded-xl border-light-border"
                />
                
                <div className="flex gap-3">
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="rounded-xl"
                    style={{ background: 'var(--gradient-button)', border: 'none' }}
                  >
                    Create Passage
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowCreateForm(false)}
                    className="rounded-xl border-light-border hover:bg-gentle-blue/10"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Passages List */}
        <div className="grid gap-6">
          {passages.map((passage: any) => (
            <Card 
              key={passage.id}
              className="rounded-2xl border-light-border shadow-soft hover:shadow-medium transition-all duration-300"
              style={{ background: 'var(--gradient-card)' }}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-georgia text-foreground">{passage.title}</CardTitle>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="rounded-xl border-light-border hover:bg-gentle-blue/10"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      onClick={() => handleDelete(passage.id)}
                      className="rounded-xl"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 text-sm text-warm-gray mb-4">
                  {passage.cambridge_book && <span className="font-medium">Book: {passage.cambridge_book}</span>}
                  {passage.test_number && <span className="font-medium">Test: {passage.test_number}</span>}
                  <span>Level: {passage.difficulty_level}</span>
                  <span>Type: {passage.passage_type}</span>
                </div>
                <p className="text-foreground line-clamp-3 leading-relaxed">{passage.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminReading;