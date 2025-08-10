import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { getSkillBySlug } from "@/lib/skills";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
const db = supabase as any;

interface Question {
  id: string;
  content: string;
  skill_type: string;
  created_at: string;
}

const AdminSkillManager = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const skill = useMemo(() => (slug ? getSkillBySlug(slug) : undefined), [slug]);

  const [newContent, setNewContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");

  useEffect(() => {
    if (skill) {
      document.title = `Manage: ${skill.label} | Admin`;
      loadQuestions();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skill?.label]);

  const loadQuestions = async () => {
    if (!skill) return;
    const { data, error } = await db
      .from("skill_practice_questions" as any)
      .select("id, content, skill_type, created_at")
      .eq("skill_type" as any, skill.label)
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      toast({ title: "Failed to load questions", variant: "destructive" });
      return;
    }
    setQuestions(((data as unknown) as Question[]) || []);
  };

  const addQuestion = async () => {
    if (!skill || !newContent.trim()) return;
    setLoading(true);
    const { error } = await db
      .from("skill_practice_questions" as any)
      .insert({ skill_type: skill.label, content: newContent.trim() });
    setLoading(false);
    if (error) {
      console.error(error);
      toast({ title: "Unable to save question", description: error.message, variant: "destructive" });
      return;
    }
    setNewContent("");
    toast({ title: "Question added" });
    await loadQuestions();
  };

  const startEdit = (q: Question) => {
    setEditingId(q.id);
    setEditingContent(q.content);
  };

  const saveEdit = async () => {
    if (!editingId || !editingContent.trim()) return;
    const { error } = await db
      .from("skill_practice_questions" as any)
      .update({ content: editingContent.trim() })
      .eq("id" as any, editingId);
    if (error) {
      console.error(error);
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    setEditingId(null);
    setEditingContent("");
    toast({ title: "Question updated" });
    await loadQuestions();
  };

  const remove = async (id: string) => {
    const { error } = await db
      .from("skill_practice_questions")
      .delete()
      .eq("id", id);
    if (error) {
      console.error(error);
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Question deleted" });
    await loadQuestions();
  };

  if (!skill) {
    return (
      <AdminLayout title="Skill not found" showBackButton>
        <Button onClick={() => navigate("/admin/skills")}>Back to Skills</Button>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={`Manage: ${skill.label}`} showBackButton>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add New Question</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Question Content"
              rows={4}
            />
            <div className="flex gap-2">
              <Button onClick={addQuestion} disabled={loading}>
                {loading ? "Saving..." : "Save"}
              </Button>
              <Button variant="secondary" onClick={() => setNewContent("")}>Clear</Button>
            </div>
          </CardContent>
        </Card>

        <Separator />

        <section className="space-y-3">
          <h3 className="text-lg font-semibold">Question Library</h3>
          {questions.length === 0 ? (
            <p className="text-muted-foreground text-sm">No questions yet. Add your first one above.</p>
          ) : (
            <div className="space-y-3">
              {questions.map((q) => (
                <Card key={q.id}>
                  <CardContent className="pt-4">
                    {editingId === q.id ? (
                      <div className="space-y-3">
                        <Textarea value={editingContent} onChange={(e) => setEditingContent(e.target.value)} rows={4} />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={saveEdit}>Save</Button>
                          <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-4">
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{q.content}</p>
                        <div className="shrink-0 flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => startEdit(q)}>Edit</Button>
                          <Button size="sm" variant="destructive" onClick={() => remove(q.id)}>Delete</Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  );
};

export default AdminSkillManager;
