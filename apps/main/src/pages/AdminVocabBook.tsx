import { useEffect, useRef, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";

type PreviewRow = { word: string; language_code: string; translation: string };

export default function AdminVocabBook() {
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [totalPreview, setTotalPreview] = useState(0);
  const [importing, setImporting] = useState(false);
  const [stats, setStats] = useState<{ total: number } | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const downloadSample = () => {
    const url = "/examples/vocabulary-sample.csv";
    const a = document.createElement("a");
    a.href = url;
    a.download = "vocab-book-sample.csv";
    a.click();
  };

  const loadStats = async () => {
    try {
      console.log("📊 Loading vocabulary stats from vocab_cards...");
      // Count public vocabulary cards - this table has proper RLS policies
      const { count, error: statsError } = await (supabase as any)
        .from("vocab_cards")
        .select("id", { count: "exact", head: true })
        .eq("is_public", true);
      
      if (statsError) {
        console.error("❌ Error loading stats:", statsError);
        setStats({ total: 0 });
      } else {
        console.log(`✅ Loaded stats: ${count} public vocabulary cards`);
        setStats({ total: count || 0 });
      }
    } catch (err) {
      console.error("❌ Exception loading stats:", err);
      setStats({ total: 0 });
    }
  };

  useEffect(() => { loadStats(); }, []);

  const handleFile = async (file: File) => {
    setError(null);
    setPreview([]);
    const text = await file.text();
    const { data, error } = await supabase.functions.invoke("vocab-import", { body: { csvText: text, previewOnly: true } });
    if (error) { setError(error.message || "Preview failed"); return; }
    setPreview(data.preview || []);
    setTotalPreview(data.totalRows || 0);
  };

  const confirmImport = async () => {
    if (preview.length === 0) return;
    setImporting(true);
    try {
      const csvText = preview.map((r) => `${r.word},${r.language_code},${r.translation}`).join("\n");
      const file = fileRef.current?.files?.[0];
      if (!file) { setError("Please re-select the CSV file before importing."); setImporting(false); return; }
      const text = await file.text();
      const { error } = await supabase.functions.invoke("vocab-import", { body: { csvText: text, previewOnly: false } });
      if (error) { setError(error.message || "Import failed"); return; }
      setPreview([]);
      await loadStats();
    } finally {
      setImporting(false);
    }
  };

  return (
    <AdminLayout title="Vocabulary Book" showBackButton>
      <section className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bulk Upload Words (CSV)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Format: first column <code>word</code>, then language columns such as <code>ko</code>, <code>ja</code>, <code>vi</code>, <code>zh</code>, <code>es</code>.
              Each language column should contain the translation for that word. Duplicates are upserted.
            </p>
            <div className="flex gap-2">
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              <Button onClick={() => fileRef.current?.click()}>Choose CSV</Button>
              <Button variant="secondary" onClick={downloadSample}>Download Sample CSV</Button>
            </div>
            {error && (
              <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
            )}
            {preview.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm">Previewing {preview.length} of {totalPreview} rows</div>
                <div className="max-h-56 overflow-auto border rounded-md text-xs">
                  {preview.slice(0, 50).map((r, i) => (
                    <div key={i} className="px-3 py-2 border-b last:border-b-0">
                      <span className="font-medium mr-2">{r.word}</span>
                      <span className="text-muted-foreground">[{r.language_code}]</span>
                      <span className="ml-2">{r.translation}</span>
                    </div>
                  ))}
                </div>
                <Button onClick={confirmImport} disabled={importing}>{importing ? "Importing..." : "Confirm Import"}</Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Current Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              {stats === null ? "Loading..." : `Total public vocabulary words: ${stats.total}`}
            </div>
          </CardContent>
        </Card>
      </section>
    </AdminLayout>
  );
}

