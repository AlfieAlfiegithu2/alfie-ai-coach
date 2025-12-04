import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Check, Loader2, Play, Volume2, Trash2 } from "lucide-react";

interface Item {
  id: string;
  reference_text: string;
  audio_url_uk: string | null;
  audio_url_us: string | null;
  order_index: number;
}

const AdminPronunciationTestDetail = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ reference_text: "" });
  const [testTitle, setTestTitle] = useState<string>("");
  const [isPublished, setIsPublished] = useState<boolean>(false);
  const [publishing, setPublishing] = useState(false);
  const [generatingUK, setGeneratingUK] = useState<string | null>(null);
  const [generatingUS, setGeneratingUS] = useState<string | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);

  const maxItems = 10;
  const hasReachedLimit = items.length >= maxItems;

  const load = async () => {
    if (!id) return;
    const { data: it, error: ie } = await (supabase as any)
      .from("pronunciation_items")
      .select("id,reference_text,audio_url_uk,audio_url_us,order_index")
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

  const addItem = async () => {
    if (!id) return;
    if (items.length >= 10) {
      toast({ title: "Limit reached (10 items max)", variant: "destructive" });
      return;
    }
    if (!form.reference_text.trim()) {
      toast({ title: "Sentence text required", variant: "destructive" });
      return;
    }

    try {
      setSaving(true);
      const nextOrder = items.length + 1;
      const { data, error: insErr } = await (supabase as any)
        .from('pronunciation_items')
        .insert({ 
          test_id: id, 
          reference_text: form.reference_text.trim(), 
          order_index: nextOrder 
        })
        .select('id')
        .single();
      if (insErr) throw insErr;

      setForm({ reference_text: "" });
      toast({ title: "Sentence added", description: "Now generate audio for UK and US accents." });
      await load();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Add failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const generateAudio = async (itemId: string, text: string, accent: 'uk' | 'us') => {
    if (!id) return;
    
    const setGenerating = accent === 'uk' ? setGeneratingUK : setGeneratingUS;
    setGenerating(itemId);

    try {
      const { data, error } = await supabase.functions.invoke('pronunciation-generate-audio', {
        body: {
          text,
          accent,
          test_id: id,
          item_id: itemId
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Generation failed');

      toast({ 
        title: `${accent.toUpperCase()} Audio Generated`, 
        description: "Audio has been saved successfully." 
      });
      await load();
    } catch (e: any) {
      console.error(e);
      toast({ 
        title: `${accent.toUpperCase()} Audio Generation Failed`, 
        description: e.message, 
        variant: "destructive" 
      });
    } finally {
      setGenerating(null);
    }
  };

  const generateBothAudios = async (itemId: string, text: string) => {
    await generateAudio(itemId, text, 'uk');
    await generateAudio(itemId, text, 'us');
  };

  const playAudio = (url: string, itemId: string, accent: string) => {
    const audioKey = `${itemId}-${accent}`;
    if (playingAudio === audioKey) {
      setPlayingAudio(null);
      return;
    }
    setPlayingAudio(audioKey);
    const audio = new Audio(url);
    audio.play();
    audio.onended = () => setPlayingAudio(null);
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
      toast({ 
        title: !isPublished ? 'Published' : 'Unpublished', 
        description: !isPublished ? 'Students can now see this test.' : 'Test hidden from students.' 
      });
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Update failed', description: e.message, variant: 'destructive' });
    } finally {
      setPublishing(false);
    }
  };

  const deleteItem = async (itemId: string) => {
    if (!confirm('Delete this sentence and its audio files?')) return;
    const { error } = await (supabase as any).from('pronunciation_items').delete().eq('id', itemId);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Sentence deleted" });
    await load();
  };

  return (
    <AdminLayout title="PTE Repeat Sentence" showBackButton backPath="/admin/skills/pronunciation-repeat-after-me">
      <section className="space-y-6">
        {/* Test Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              Test: {testTitle || "Untitled"}
              <span className={`text-xs px-2 py-1 rounded ${isPublished ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {isPublished ? "Published" : "Draft"}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <Button size="sm" onClick={togglePublish} disabled={publishing}>
              {publishing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {isPublished ? "Unpublish" : "Publish"}
            </Button>
            <p className="text-sm text-muted-foreground">
              {isPublished ? "Visible to students" : "Hidden from students"}
            </p>
          </CardContent>
        </Card>

        {/* Add New Sentence Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add Sentence — {items.length}/10</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasReachedLimit ? (
              <p className="text-sm text-muted-foreground">Maximum 10 sentences reached. Delete one to add more.</p>
            ) : (
              <>
                <div>
                  <Label htmlFor="sentence">Sentence Text (PTE difficulty)</Label>
                  <Textarea 
                    id="sentence" 
                    rows={3} 
                    value={form.reference_text}
                    onChange={(e) => setForm({ reference_text: e.target.value })} 
                    disabled={saving}
                    placeholder="Enter a PTE-difficulty sentence that students will repeat..."
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Tip: Use complex academic or professional sentences, 10-20 words in length.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={addItem} disabled={saving || !form.reference_text.trim()}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                    {saving ? 'Adding...' : 'Add Sentence'}
                  </Button>
                  <Button variant="secondary" onClick={() => setForm({ reference_text: "" })}>
                    Clear
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Separator />

        {/* Sentences List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sentences ({items.length}/10)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sentences yet. Add the first one above.</p>
            ) : (
              items.map((item, index) => (
                <div key={item.id} className="p-4 border rounded-lg space-y-3 bg-muted/30">
                  {/* Sentence Number and Text */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <span className="text-xs font-medium text-muted-foreground">#{index + 1}</span>
                      <p className="text-sm mt-1">{item.reference_text}</p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteItem(item.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Audio Generation Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* UK Audio */}
                    <div className="flex items-center gap-2 p-2 border rounded bg-background">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium">🇬🇧 UK</span>
                          {item.audio_url_uk ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <span className="text-xs text-muted-foreground">Not generated</span>
                          )}
                        </div>
                      </div>
                      {item.audio_url_uk ? (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => playAudio(item.audio_url_uk!, item.id, 'uk')}
                        >
                          <Play className="w-4 h-4 mr-1" />
                          Play
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => generateAudio(item.id, item.reference_text, 'uk')}
                          disabled={generatingUK === item.id}
                        >
                          {generatingUK === item.id ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-1" />
                          ) : (
                            <Volume2 className="w-4 h-4 mr-1" />
                          )}
                          Generate
                        </Button>
                      )}
                    </div>

                    {/* US Audio */}
                    <div className="flex items-center gap-2 p-2 border rounded bg-background">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium">🇺🇸 US</span>
                          {item.audio_url_us ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <span className="text-xs text-muted-foreground">Not generated</span>
                          )}
                        </div>
                      </div>
                      {item.audio_url_us ? (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => playAudio(item.audio_url_us!, item.id, 'us')}
                        >
                          <Play className="w-4 h-4 mr-1" />
                          Play
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => generateAudio(item.id, item.reference_text, 'us')}
                          disabled={generatingUS === item.id}
                        >
                          {generatingUS === item.id ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-1" />
                          ) : (
                            <Volume2 className="w-4 h-4 mr-1" />
                          )}
                          Generate
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Generate Both Button */}
                  {(!item.audio_url_uk || !item.audio_url_us) && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="w-full"
                      onClick={() => generateBothAudios(item.id, item.reference_text)}
                      disabled={generatingUK === item.id || generatingUS === item.id}
                    >
                      {(generatingUK === item.id || generatingUS === item.id) ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-1" />
                      ) : null}
                      Generate Both UK & US Audio
                    </Button>
                  )}

                  {/* Status Badge */}
                  {item.audio_url_uk && item.audio_url_us && (
                    <div className="flex items-center gap-1 text-xs text-green-600">
                      <Check className="w-3 h-3" />
                      Ready for students
                    </div>
                  )}
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
