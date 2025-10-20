import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { normalizeGrammarCSV, type NormalizedOutput } from "@/lib/grammarCSVNormalizer";

interface GrammarCSVImportProps {
  skillTestId: string;
  onImported?: () => void;
}

export default function GrammarCSVImport({ skillTestId, onImported }: GrammarCSVImportProps) {
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [normalized, setNormalized] = useState<NormalizedOutput | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handleFile = async (file: File) => {
    try {
      setError(null);
      setPreview([]);
      setNormalized(null);
      const text = await file.text();
      const result = normalizeGrammarCSV(text, "Grammar Fix-it", skillTestId);
      setNormalized(result);
      if (result.insert.length === 0) {
        const headerErr = result.errors[0]?.message || "No valid rows found in CSV";
        setError(headerErr);
        return;
      }
      if (result.errors.length > 0) {
        toast.warning(`${result.errors.length} row(s) have errors and will be skipped`);
      }
      if (result.warnings.length > 0) {
        toast.message(`${result.warnings.length} warning(s) during normalization`);
      }
      setPreview(result.insert);
    } catch (e: any) {
      setError(e.message || "Failed to parse CSV");
    }
  };

  const handleConfirm = async () => {
    if (!normalized || normalized.insert.length === 0) return;
    setImporting(true);
    try {
      const { error } = await (supabase as any)
        .from("skill_practice_questions")
        .insert(normalized.insert);
      if (error) throw error;
      toast.success(`Imported ${normalized.insert.length} questions`);
      setPreview([]);
      setNormalized(null);
      onImported?.();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const header = "QuestionFormat,WordOrSentence,CorrectAnswer,IncorrectAnswer1,IncorrectAnswer2,IncorrectAnswer3,Explanation\n";
    const sample = [
      'SentenceFillIn,"She has been _______ English for five years.","studying","study","studies","studied","Use present perfect continuous for ongoing actions"',
      'DefinitionMatch,"Subject-verb agreement","The subject and verb must agree in number","A tense that shows completed actions","A clause that cannot stand alone","A verb form used as a noun","Basic grammar rule"'
    ].join("\n");
    const blob = new Blob([header + sample], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "grammar-fix-it-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Upload Grammar CSV</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <Button onClick={() => fileRef.current?.click()}>Choose CSV</Button>
          <Button variant="secondary" onClick={downloadTemplate}>Download Template</Button>
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {preview.length > 0 && (
          <div className="space-y-2">
            {normalized && (
              <p className="text-sm text-muted-foreground">
                Parsed: {preview.length} valid row(s)
                {normalized.warnings.length > 0 && ` • ${normalized.warnings.length} warning(s)`}
                {normalized.errors.length > 0 && ` • ${normalized.errors.length} error row(s) skipped`}
              </p>
            )}
            <div className="flex gap-2">
              <Button onClick={handleConfirm} disabled={importing}>{importing ? "Importing..." : "Import"}</Button>
              <Button variant="secondary" onClick={() => { setPreview([]); setNormalized(null); }}>Cancel</Button>
            </div>
            <div className="max-h-60 overflow-auto rounded border p-2 text-xs">
              {preview.slice(0, 10).map((r, i) => (
                <div key={i} className="py-1 border-b last:border-b-0">
                  <div className="font-medium">{r.question_format ?? r.QuestionFormat}</div>
                  <div className="text-muted-foreground">{r.content ?? r.WordOrSentence}</div>
                </div>
              ))}
              {preview.length > 10 && (
                <div className="text-muted-foreground">...and {preview.length - 10} more</div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
