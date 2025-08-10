import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import StudentLayout from "@/components/StudentLayout";
import { Card, CardContent } from "@/components/ui/card";
import { getSkillBySlug } from "@/lib/skills";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
const db = supabase as any;

interface Question {
  id: string;
  content: string;
}

const SkillPractice = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const skill = useMemo(() => (slug ? getSkillBySlug(slug) : undefined), [slug]);
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    if (skill) {
      document.title = `${skill.label} | Practice`;
      loadQuestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skill?.label]);

  const loadQuestions = async () => {
    if (!skill) return;
    const { data, error } = await db
      .from("skill_practice_questions")
      .select("id, content")
      .eq("skill_type", skill.label)
      .order("created_at", { ascending: false });
    if (!error) setQuestions(((data ?? []) as Question[]));
  };

  if (!skill) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Button onClick={() => navigate("/ielts-portal")}>Back</Button>
      </div>
    );
  }

  return (
    <StudentLayout title={skill.label} showBackButton>
      <section className="space-y-4 max-w-3xl mx-auto">
        {questions.length === 0 ? (
          <p className="text-muted-foreground text-sm">No questions yet. Please check back soon.</p>
        ) : (
          questions.map((q) => (
            <Card key={q.id} className="border-light-border">
              <CardContent className="p-4">
                <p className="whitespace-pre-wrap leading-relaxed">{q.content}</p>
              </CardContent>
            </Card>
          ))
        )}
      </section>
    </StudentLayout>
  );
};

export default SkillPractice;
