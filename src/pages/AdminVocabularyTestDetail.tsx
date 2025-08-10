import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import VocabularyCSVImport from "@/components/VocabularyCSVImport";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import VocabularyQuizPreview from "@/components/VocabularyQuizPreview";

interface SkillTest { id: string; title: string }
interface Question { id: string; content: string; question_format: string; correct_answer?: string; incorrect_answers?: string[]; explanation?: string }

const AdminVocabularyTestDetail = () => {
  const { id } = useParams();
  const [test, setTest] = useState<SkillTest | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [editing, setEditing] = useState<Question | null>(null);
  const [form, setForm] = useState({
    content: "",
    question_format: "",
    correct_answer: "",
    incorrect1: "",
    incorrect2: "",
    incorrect3: "",
    explanation: "",
  });

  const startEdit = (q: Question) => {
    setEditing(q);
    setForm({
      content: q.content || "",
      question_format: q.question_format || "",
      correct_answer: q.correct_answer || "",
      incorrect1: q.incorrect_answers?.[0] || "",
      incorrect2: q.incorrect_answers?.[1] || "",
      incorrect3: q.incorrect_answers?.[2] || "",
      explanation: q.explanation || "",
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    const incorrect_answers = [form.incorrect1, form.incorrect2, form.incorrect3].filter(Boolean);
    const { error } = await (supabase as any)
      .from("skill_practice_questions")
      .update({
        content: form.content,
        question_format: form.question_format,
        correct_answer: form.correct_answer,
        incorrect_answers,
        explanation: form.explanation,
      })
      .eq("id", editing.id);
    if (!error) {
      setEditing(null);
      await load();
    }
  };

  const deleteQuestion = async (qid: string) => {
    if (!confirm("Delete this question?")) return;
    await (supabase as any).from("skill_practice_questions").delete().eq("id", qid);
    await load();
  };

  const load = async () => {
    if (!id) return;
    const { data: t } = await (supabase as any)
      .from("skill_tests").select("id,title").eq("id", id).maybeSingle();
    setTest(t ?? null);

    const { data: q } = await (supabase as any)
      .from("skill_practice_questions")
      .select("id,content,question_format,correct_answer,incorrect_answers,explanation")
      .eq("skill_test_id", id)
      .order("created_at", { ascending: false });
    setQuestions((q ?? []) as Question[]);
  };

  useEffect(() => {
    load();
  }, [id]);

  return (
    <AdminLayout title={test ? `Manage: ${test.title}` : "Manage Vocabulary Test"} showBackButton>
      <section className="space-y-6">
        {id && (
          <VocabularyCSVImport skillTestId={id} onImported={load} />
        )}

        <Separator />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Student Preview</CardTitle>
          </CardHeader>
          <CardContent>
            {id && <VocabularyQuizPreview skillTestId={id} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {questions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No questions yet. Upload a CSV to add questions.</p>
            ) : (
              questions.map((q) => (
                <div key={q.id} className="p-3 border rounded-md space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs text-muted-foreground">{q.question_format}</div>
                      <div className="whitespace-pre-wrap">{q.content}</div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" onClick={() => startEdit(q)}>Edit</Button>
                      <Button size="sm" variant="destructive" onClick={() => deleteQuestion(q.id)}>Delete</Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Question</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="question_format">Format</Label>
              <Input id="question_format" value={form.question_format} onChange={(e) => setForm({ ...form, question_format: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="content">Content</Label>
              <Textarea id="content" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="correct_answer">Correct Answer</Label>
              <Input id="correct_answer" value={form.correct_answer} onChange={(e) => setForm({ ...form, correct_answer: e.target.value })} />
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <Label>Incorrect 1</Label>
                <Input value={form.incorrect1} onChange={(e) => setForm({ ...form, incorrect1: e.target.value })} />
              </div>
              <div>
                <Label>Incorrect 2</Label>
                <Input value={form.incorrect2} onChange={(e) => setForm({ ...form, incorrect2: e.target.value })} />
              </div>
              <div>
                <Label>Incorrect 3</Label>
                <Input value={form.incorrect3} onChange={(e) => setForm({ ...form, incorrect3: e.target.value })} />
              </div>
            </div>
            <div>
              <Label htmlFor="explanation">Explanation</Label>
              <Textarea id="explanation" value={form.explanation} onChange={(e) => setForm({ ...form, explanation: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveEdit}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminVocabularyTestDetail;
