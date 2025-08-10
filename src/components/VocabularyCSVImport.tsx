import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface VocabularyCSVImportProps {
  skillTestId: string;
  onImported?: () => void;
}

// Expected headers: QuestionFormat,WordOrSentence,CorrectAnswer,IncorrectAnswer1,IncorrectAnswer2,IncorrectAnswer3
function parseCSV(text: string) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [] as any[];
  const header = lines[0].split(",").map((h) => h.trim());
  const expected = [
    "QuestionFormat",
    "WordOrSentence",
    "CorrectAnswer",
    "IncorrectAnswer1",
    "IncorrectAnswer2",
    "IncorrectAnswer3",
  ];
  const ok = expected.every((e, i) => header[i] === e);
  if (!ok) throw new Error(`Invalid headers. Expected: ${expected.join(", ")}`);

  const rows = lines.slice(1).map((line) => {
    // naive CSV split; acceptable given simple format; avoids external deps
    const cols = line
      .match(/\s*(?:\"([^\"]*)\"|([^,]*))\s*(?:,|$)/g)?.map((c) => c.replace(/^[,\s]*|[,\s]*$/g, "").replace(/^\"|\"$/g, "")) || [];
    const [QuestionFormat, WordOrSentence, CorrectAnswer, IncorrectAnswer1, IncorrectAnswer2, IncorrectAnswer3] = cols;
    return {
      QuestionFormat: QuestionFormat?.trim(),
      WordOrSentence: WordOrSentence?.trim(),
      CorrectAnswer: CorrectAnswer?.trim(),
      Incorrects: [IncorrectAnswer1, IncorrectAnswer2, IncorrectAnswer3].filter(Boolean).map((x) => x.trim()),
    };
  });
  return rows.filter((r) => r.QuestionFormat && r.WordOrSentence && r.CorrectAnswer);
}

export default function VocabularyCSVImport({ skillTestId, onImported }: VocabularyCSVImportProps) {
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handleFile = async (file: File) => {
    try {
      setError(null);
      const text = await file.text();
      const rows = parseCSV(text);
      if (rows.length === 0) {
        setError("No valid rows found in CSV");
        return;
      }
      setPreview(rows);
    } catch (e: any) {
      setError(e.message || "Failed to parse CSV");
    }
  };

  const handleConfirm = async () => {
    if (preview.length === 0) return;
    setImporting(true);
    try {
      const payload = preview.map((r) => ({
        skill_type: "Vocabulary Builder",
        content: r.WordOrSentence,
        question_format: r.QuestionFormat === "SentenceFillIn" ? "SentenceFillIn" : "DefinitionMatch",
        correct_answer: r.CorrectAnswer,
        incorrect_answers: r.Incorrects,
        skill_test_id: skillTestId,
      }));

      const { error } = await (supabase as any)
        .from("skill_practice_questions")
        .insert(payload);

      if (error) throw error;
      toast.success(`Imported ${payload.length} questions`);
      setPreview([]);
      onImported?.();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const header = "QuestionFormat,WordOrSentence,CorrectAnswer,IncorrectAnswer1,IncorrectAnswer2,IncorrectAnswer3\n";
    const sample = [
      'DefinitionMatch,"Ubiquitous","Present, appearing, or found everywhere","Rare","Obscure","Fleeting"',
      'SentenceFillIn,"The new evidence will _______ the detective\'s theory.","corroborate","refute","ignore","confuse"',
    ].join("\n");
    const blob = new Blob([header + sample], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vocabulary-smart-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Upload Vocabulary CSV</CardTitle>
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
            <p className="text-sm text-muted-foreground">Preview: {preview.length} rows parsed. Click Import to save.</p>
            <div className="flex gap-2">
              <Button onClick={handleConfirm} disabled={importing}>{importing ? "Importing..." : "Import"}</Button>
              <Button variant="secondary" onClick={() => setPreview([])}>Cancel</Button>
            </div>
            <div className="max-h-60 overflow-auto rounded border p-2 text-xs">
              {preview.slice(0, 10).map((r, i) => (
                <div key={i} className="py-1 border-b last:border-b-0">
                  <div className="font-medium">{r.QuestionFormat}</div>
                  <div className="text-muted-foreground">{r.WordOrSentence}</div>
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
