import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";

interface Test { id: string; title: string; description: string | null; is_published: boolean }
interface Item { id: string; reference_text: string; audio_url: string; order_index: number }

const AdminPronunciationTestDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [test, setTest] = useState<Test | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState({ reference_text: "" });
  const [audioFile, setAudioFile] = useState<File | null>(null);

  const load = async () => {
    if (!id) return;
    const { data: t, error: te } = await (supabase as any)
      .from("pronunciation_tests")
      .select("id,title,description,is_published")
      .eq("id", id)
      .maybeSingle();
    if (te) {
      toast({ title: "Failed to load test", description: te.message, variant: "destructive" });
    }
    setTest(t ?? null);

    const { data: it, error: ie } = await (supabase as any)
      .from("pronunciation_items")
      .select("id,reference_text,audio_url,order_index")
      .eq("test_id", id)
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: true });
    if (ie) {
      toast({ title: "Failed to load items", description: ie.message, variant: "destructive" });
    }
    setItems((it ?? []) as Item[]);
  };

  useEffect(() => { load(); }, [id]);

  const saveTestMeta = async () => {
    if (!test) return;
    setSaving(true);
    const { error } = await (supabase as any)
      .from("pronunciation_tests")
      .update({ title: test.title, description: test.description, is_published: test.is_published })
      .eq("id", test.id);
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Saved" });
    await load();
  };

  const addItem = async () => {
    if (!id) return;
    if (!form.reference_text.trim()) {
      toast({ title: "Reference text required", variant: "destructive" });
      return;
    }
    if (!audioFile) {
      toast({ title: "Audio file required", variant: "destructive" });
      return;
    }

    try {
      setSaving(true);
      const ext = audioFile.name.split('.').pop()?.toLowerCase() || 'mp3';
      const path = `pronunciation/${id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('audio-files').upload(path, audioFile, { upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('audio-files').getPublicUrl(path);
      const audio_url = pub.publicUrl;

      const { error: insErr } = await (supabase as any)
        .from('pronunciation_items')
        .insert({ test_id: id, reference_text: form.reference_text.trim(), audio_url });
      if (insErr) throw insErr;

      setForm({ reference_text: "" });
      setAudioFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast({ title: "Item added" });
      await load();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Add failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (itemId: string) => {
    if (!confirm('Delete this item?')) return;
    const { error } = await (supabase as any).from('pronunciation_items').delete().eq('id', itemId);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Item deleted" });
    await load();
  };

  return (
    <AdminLayout title={test ? `Manage: ${test.title}` : "Manage Pronunciation Test"} showBackButton backPath="/admin/skills/pronunciation-repeat-after-me">
      <section className="space-y-6">
        {test && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Test Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" value={test.title}
                    onChange={(e) => setTest({ ...test, title: e.target.value })} />
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <Switch id="is_published" checked={!!test.is_published}
                    onCheckedChange={(v) => setTest({ ...test, is_published: v })} />
                  <Label htmlFor="is_published">Published</Label>
                </div>
              </div>
              <div>
                <Label htmlFor="desc">Description</Label>
                <Textarea id="desc" rows={3} value={test.description ?? ''}
                  onChange={(e) => setTest({ ...test, description: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <Button onClick={saveTestMeta} disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</Button>
                <Button variant="secondary" onClick={() => navigate('/admin/skills/pronunciation-repeat-after-me')}>Back to Tests</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Separator />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add Item (Voice-over + Reference Text)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="ref">Reference text (what students should say)</Label>
              <Textarea id="ref" rows={3} value={form.reference_text}
                onChange={(e) => setForm({ reference_text: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Voice-over file (mp3, wav, m4a...)</Label>
              <Input ref={fileInputRef} type="file" accept="audio/*" onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)} />
            </div>
            <div className="flex gap-2">
              <Button onClick={addItem} disabled={saving}>{saving ? 'Uploading...' : 'Add Item'}</Button>
              <Button variant="secondary" onClick={() => { setForm({ reference_text: "" }); setAudioFile(null); if (fileInputRef.current) fileInputRef.current.value=''; }}>Clear</Button>
            </div>
          </CardContent>
        </Card>

        <Separator />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No items yet. Add the first one above.</p>
            ) : (
              items.map((it) => (
                <div key={it.id} className="p-3 border rounded-md space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <p className="text-sm whitespace-pre-wrap">{it.reference_text}</p>
                      <audio src={it.audio_url} controls preload="none" />
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="destructive" onClick={() => deleteItem(it.id)}>Delete</Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </AdminLayout>
  );
};

export default AdminPronunciationTestDetail;
