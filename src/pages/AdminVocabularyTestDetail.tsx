import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import VocabularyCSVImport from "@/components/VocabularyCSVImport";
import { supabase } from "@/integrations/supabase/client";

interface SkillTest { id: string; title: string }
interface Question { id: string; content: string; question_format: string }

const AdminVocabularyTestDetail = () => {
  const { id } = useParams();
  const [test, setTest] = useState<SkillTest | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);

  const load = async () => {
    if (!id) return;
    const { data: t } = await (supabase as any)
      .from("skill_tests").select("id,title").eq("id", id).maybeSingle();
    setTest(t ?? null);

    const { data: q } = await (supabase as any)
      .from("skill_practice_questions")
      .select("id,content,question_format")
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
            <CardTitle className="text-base">Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {questions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No questions yet. Upload a CSV to add questions.</p>
            ) : (
              questions.map((q) => (
                <div key={q.id} className="p-3 border rounded-md">
                  <div className="text-xs text-muted-foreground">{q.question_format}</div>
                  <div className="whitespace-pre-wrap">{q.content}</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </AdminLayout>
  );
};

export default AdminVocabularyTestDetail;
