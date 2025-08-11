import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";

interface PronTest { id: string; title: string; created_at: string }

const AdminPronunciationTests = () => {
  const [tests, setTests] = useState<PronTest[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const load = async () => {
    const { data, error } = await (supabase as any)
      .from("pronunciation_tests")
      .select("id,title,created_at")
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      toast({ title: "Failed to load tests", description: error.message, variant: "destructive" });
      return;
    }
    setTests((data ?? []) as PronTest[]);
  };

  useEffect(() => {
    document.title = "Pronunciation Tests | Admin";
    load();
  }, []);

  const addTest = async () => {
    if (!title.trim()) return;
    setLoading(true);
    const { data: userResp } = await supabase.auth.getUser();
    const userId = userResp?.user?.id;
    const { data, error } = await (supabase as any)
      .from("pronunciation_tests")
      .insert({ title: title.trim(), created_by: userId })
      .select("id")
      .maybeSingle();
    setLoading(false);
    if (error) {
      toast({ title: "Failed to create test", description: error.message, variant: "destructive" });
      return;
    }
    setTitle("");
    await load();
    if (data?.id) navigate(`/admin/skills/pronunciation-repeat-after-me/${data.id}`);
  };

  return (
    <AdminLayout title="Pronunciation: Repeat After Me" showBackButton>
      <section className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">+ Create Pronunciation Test</CardTitle>
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
                <Button size="sm" variant="secondary" onClick={() => navigate(`/admin/skills/pronunciation-repeat-after-me/${t.id}`)}>
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

export default AdminPronunciationTests;
