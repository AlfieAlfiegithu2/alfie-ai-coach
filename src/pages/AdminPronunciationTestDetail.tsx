import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

interface Item { id: string; reference_text: string; audio_url: string; order_index: number; accent?: 'american' | 'british' }

const AdminPronunciationTestDetail = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState({ reference_text: "" });
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [testTitle, setTestTitle] = useState<string>("");
  const [isPublished, setIsPublished] = useState<boolean>(false);
  const [publishing, setPublishing] = useState(false);

  const maxItems = 10;
  const hasReachedLimit = items.length >= maxItems;

  const load = async () => {
    if (!id) return;
    const { data: it, error: ie } = await (supabase as any)
      .from("pronunciation_items")
      .select("id,reference_text,audio_url,order_index,accent")
      .eq("test_id", id)
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: true });
    if (ie) {
      toast({ title: "Failed to load items", description: ie.message, variant: "destructive" });
    }
    setItems((it ?? []) as Item[]);

    const { data: test, error: te } = await (supabase as any)
      .from("pronunciation_tests")
      .select("title,is_published")
      .eq("id", id)
      .maybeSingle();
    if (te) {
      console.error(te);
    } else if (test) {
      setTestTitle(test.title);
      setIsPublished(!!test.is_published);
    }
  };

  useEffect(() => {
    document.title = "Pronunciation Items | Admin";
    load();
  }, [id]);

  const [accent, setAccent] = useState<'american' | 'british'>('american');

  const addItem = async () => {
    if (!id) return;
    if (items.length >= 10) {
      toast({ title: "Limit reached (10 items max)", variant: "destructive" });
      return;
    }
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

      const nextOrder = items.length + 1;
      const { error: insErr } = await (supabase as any)
        .from('pronunciation_items')
        .insert({ test_id: id, reference_text: form.reference_text.trim(), audio_url, order_index: nextOrder, accent });
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

  const togglePublish = async () => {
    if (!id) return;
    try {
      setPublishing(true);
      const { error } = await (supabase as any)
        .from('pronunciation_tests')
        .update({ is_published: !isPublished })
        .eq('id', id);
      if (error) throw error;
      setIsPublished(!isPublished);
      toast({ title: !isPublished ? 'Published' : 'Unpublished', description: !isPublished ? 'Students can now see this test.' : 'Test hidden from students.' });
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Update failed', description: e.message, variant: 'destructive' });
    } finally {
      setPublishing(false);
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
    <AdminLayout title="Pronunciation: Repeat After Me" showBackButton backPath="/admin/skills/pronunciation-repeat-after-me">
      <section className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Test: {testTitle || "Untitled"} — {isPublished ? "Published" : "Unpublished"}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <Button size="sm" onClick={togglePublish} disabled={publishing}>
              {isPublished ? "Unpublish" : "Publish"}
            </Button>
            <p className="text-sm text-muted-foreground">
              {isPublished ? "Visible to students" : "Hidden from students"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add Item (Reference Text + Voice-over) — {items.length}/10</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {hasReachedLimit && (
              <p className="text-sm text-muted-foreground">You have reached the maximum of 10 items. Delete an item to add another.</p>
            )}
            <div>
              <Label htmlFor="ref">Reference text (what students should say)</Label>
              <Textarea id="ref" rows={3} value={form.reference_text}
                onChange={(e) => setForm({ reference_text: e.target.value })} disabled={hasReachedLimit || saving} />
            </div>
            <div className="space-y-2">
              <Label>Voice-over file (mp3, wav, m4a...)</Label>
              <Input ref={fileInputRef} type="file" accept="audio/*" onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)} disabled={hasReachedLimit || saving} />
            </div>
            <div className="space-y-2">
              <Label>Accent</Label>
              <select className="border rounded-md px-2 py-2"
                value={accent}
                onChange={(e) => setAccent((e.target.value as 'american' | 'british'))}
                disabled={hasReachedLimit || saving}
              >
                <option value="american">American</option>
                <option value="british">British</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Button onClick={addItem} disabled={saving || hasReachedLimit}>{saving ? 'Uploading...' : 'Add Item'}</Button>
              <Button variant="secondary" onClick={() => { setForm({ reference_text: "" }); setAudioFile(null); if (fileInputRef.current) fileInputRef.current.value=''; }}>Clear</Button>
            </div>
          </CardContent>
        </Card>

        <Separator />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Items ({items.length}/10)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No items yet. Add the first one above.</p>
            ) : (
              items.map((it) => (
                <div key={it.id} className="p-3 border rounded-md space-y-2">
                  <div className="space-y-2">
                    <p className="text-sm whitespace-pre-wrap">{it.reference_text}</p>
                    <audio src={it.audio_url} controls preload="none" />
                    <p className="text-xs text-muted-foreground">Accent: {it.accent || 'american'}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="destructive" onClick={() => deleteItem(it.id)}>Delete</Button>
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
