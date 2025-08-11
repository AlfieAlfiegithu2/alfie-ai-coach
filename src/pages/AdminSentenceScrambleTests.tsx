import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";

interface SkillTest { id: string; title: string; created_at: string }

const AdminSentenceScrambleTests = () => {
  const [tests, setTests] = useState<SkillTest[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const load = async () => {
    const { data, error } = await (supabase as any)
      .from("skill_tests")
      .select("id,title,created_at")
      .eq("skill_slug", "sentence-structure-scramble")
      .order("created_at", { ascending: false });
    if (!error) setTests((data ?? []) as SkillTest[]);
  };

  useEffect(() => {
    document.title = "Sentence Scramble Tests | Admin";
    const link: HTMLLinkElement = document.querySelector('link[rel="canonical"]') || document.createElement('link');
    link.setAttribute('rel', 'canonical');
    link.setAttribute('href', window.location.origin + '/admin/skills/sentence-scramble');
    if (!document.head.contains(link)) document.head.appendChild(link);
    load();
  }, []);

  const addTest = async () => {
    if (!title.trim()) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("skill_tests")
      .insert({ skill_slug: "sentence-structure-scramble", title: title.trim() })
      .select("id")
      .maybeSingle();
    setLoading(false);
    if (error) {
      toast({ title: "Failed to create test", description: error.message, variant: "destructive" });
      return;
    }
    setTitle("");
    await load();
    if (data?.id) navigate(`/admin/skills/sentence-scramble/${data.id}`);
  };

  return (
    <AdminLayout title="Sentence Structure Scramble Tests" showBackButton>
      <section className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">+ Add New Sentence Scramble Test</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2 items-center">
            <Input placeholder="Test title (e.g., Set 1)" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Button onClick={addTest} disabled={loading}>{loading ? "Adding..." : "Add"}</Button>
          </CardContent>
        </Card>

        <Separator />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tests.map((t) => (
            <Card key={t.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <Button size="sm" variant="secondary" onClick={() => navigate(`/admin/skills/sentence-scramble/${t.id}`)}>
                  Manage Test
                </Button>
              </CardContent>
            </Card>
          ))}
          {tests.length === 0 && (
            <p className="text-sm text-muted-foreground">No tests yet. Create your first one above.</p>
          )}
        </div>
      </section>
    </AdminLayout>
  );
};

export default AdminSentenceScrambleTests;
