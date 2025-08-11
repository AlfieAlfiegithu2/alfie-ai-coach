import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import ListeningCSVImport from "@/components/ListeningCSVImport";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface SkillTest { id: string; title: string }
interface Question { id: string; content: string; question_format: string; correct_answer?: string; incorrect_answers?: string[]; explanation?: string; original_sentence?: string | null; audio_url?: string }

const AdminListeningForDetailsTestDetail = () => {
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
    original_sentence: "",
    audio_url: "",
  });
  const [audioFiles, setAudioFiles] = useState<{ name: string; url: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const load = async () => {
    if (!id) return;
    const { data: t } = await (supabase as any).from("skill_tests").select("id,title").eq("id", id).maybeSingle();
    setTest(t ?? null);
    const { data: q } = await (supabase as any)
      .from("skill_practice_questions")
      .select("id,content,question_format,correct_answer,incorrect_answers,explanation,original_sentence,audio_url")
      .eq("skill_test_id", id)
      .order("created_at", { ascending: false });
    setQuestions((q ?? []) as Question[]);

    // List audio files for this test
    const { data: files, error } = await supabase.storage.from('listening-audio').list(`${id}`, { limit: 100 });
    if (!error) {
      const list = (files || []).filter(f => f.name).map((f) => {
        const { data: pub } = supabase.storage.from('listening-audio').getPublicUrl(`${id}/${f.name}`);
        return { name: f.name, url: pub.publicUrl };
      });
      setAudioFiles(list);
    }
  };

  useEffect(() => { load(); }, [id]);

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
      original_sentence: q.original_sentence || "",
      audio_url: q.audio_url || "",
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
        original_sentence: form.original_sentence || null,
        audio_url: form.audio_url,
      })
      .eq("id", editing.id);
    if (!error) { setEditing(null); await load(); }
  };

  const deleteQuestion = async (qid: string) => { if (!confirm("Delete this question?")) return; await (supabase as any).from("skill_practice_questions").delete().eq("id", qid); await load(); };

  const uploadAudio = async () => {
    if (!file || !id) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'mp3';
      const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, "_");
      const path = `${id}/${safeName}`;
      const { error: upErr } = await supabase.storage.from('listening-audio').upload(path, file, { upsert: true, contentType: `audio/${ext}` });
      if (upErr) throw upErr;
      await load();
    } catch (e: any) { console.error(e); }
    finally { setUploading(false); setFile(null); }
  };

  const deleteAudio = async (name: string) => { if (!id) return; await supabase.storage.from('listening-audio').remove([`${id}/${name}`]); await load(); };

  return (
    <AdminLayout title={test ? `Manage: ${test.title}` : "Manage Listening Test"} showBackButton>
      <section className="space-y-6">
        {id && (<ListeningCSVImport skillTestId={id} onImported={load} />)}

        <Separator />

        <Card>
          <CardHeader><CardTitle className="text-base">Manage Audio Files</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Input type="file" accept="audio/mpeg,audio/mp3,audio/wav,audio/webm" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              <Button onClick={uploadAudio} disabled={!file || uploading}>{uploading ? "Uploading..." : "Upload Audio"}</Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {audioFiles.map((f) => (
                <div key={f.name} className="border rounded-md p-2 text-sm">
                  <div className="font-medium break-words">{f.name}</div>
                  <audio controls className="w-full mt-1">
                    <source src={f.url} />
                  </audio>
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant="destructive" onClick={() => deleteAudio(f.name)}>Delete</Button>
                  </div>
                </div>
              ))}
              {audioFiles.length === 0 && (<p className="text-sm text-muted-foreground">No audio yet. Upload MP3s before importing CSV.</p>)}
            </div>
          </CardContent>
        </Card>

        <Separator />

        <Card>
          <CardHeader><CardTitle className="text-base">Question Library</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {questions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No questions yet. Upload a CSV to add questions.</p>
            ) : (
              questions.map((q) => (
                <div key={q.id} className="p-3 border rounded-md space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground">{q.question_format}</div>
                      {q.original_sentence && (<div className="text-sm text-muted-foreground whitespace-pre-wrap break-words"><span className="font-medium">Transcript:</span> {q.original_sentence}</div>)}}
                      {q.audio_url && (
                        <audio controls className="w-full my-2">
                          <source src={supabase.storage.from('listening-audio').getPublicUrl(q.audio_url).data.publicUrl} />
                        </audio>
                      )}
                      <div className="whitespace-pre-wrap break-words">{q.content}</div>
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

        <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>Edit Question</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label htmlFor="question_format">Format</Label>
                <Input id="question_format" value={form.question_format} onChange={(e)=>setForm({ ...form, question_format: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="original_sentence">Transcript (optional)</Label>
                <Textarea id="original_sentence" value={form.original_sentence} onChange={(e)=>setForm({ ...form, original_sentence: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="content">Instruction / Question</Label>
                <Textarea id="content" value={form.content} onChange={(e)=>setForm({ ...form, content: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="audio_url">Audio file (path in bucket)</Label>
                <Input id="audio_url" value={form.audio_url} onChange={(e)=>setForm({ ...form, audio_url: e.target.value })} placeholder={`${id}/file.mp3`} />
              </div>
              <div>
                <Label htmlFor="correct_answer">Correct Answer</Label>
                <Input id="correct_answer" value={form.correct_answer} onChange={(e)=>setForm({ ...form, correct_answer: e.target.value })} />
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                <div><Label>Incorrect 1</Label><Input value={form.incorrect1} onChange={(e)=>setForm({ ...form, incorrect1: e.target.value })} /></div>
                <div><Label>Incorrect 2</Label><Input value={form.incorrect2} onChange={(e)=>setForm({ ...form, incorrect2: e.target.value })} /></div>
                <div><Label>Incorrect 3</Label><Input value={form.incorrect3} onChange={(e)=>setForm({ ...form, incorrect3: e.target.value })} /></div>
              </div>
              <div>
                <Label htmlFor="explanation">Explanation</Label>
                <Textarea id="explanation" value={form.explanation} onChange={(e)=>setForm({ ...form, explanation: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={saveEdit}>Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </section>
    </AdminLayout>
  );
};

export default AdminListeningForDetailsTestDetail;
