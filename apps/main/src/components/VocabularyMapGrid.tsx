import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Flag, Lock, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SkillTest { id: string; title: string }

const GRID_ROWS = 5;
const GRID_COLS = 4;

const VocabularyMapGrid = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tests, setTests] = useState<SkillTest[]>([]);
  const [unlocked, setUnlocked] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: userResp } = await supabase.auth.getUser();
      const uid = userResp?.user?.id;

      const { data: t } = await (supabase as any)
        .from("skill_tests")
        .select("id,title,created_at")
        .eq("skill_slug", "vocabulary-builder")
        .order("created_at", { ascending: true });
      setTests(((t ?? []) as any[]).map(({ id, title }) => ({ id, title })));

      if (!uid) {
        setUnlocked(1);
        setLoading(false);
        return;
      }
      const { data: prog } = await (supabase as any)
        .from("user_skill_progress")
        .select("max_unlocked_level")
        .eq("user_id", uid)
        .eq("skill_slug", "vocabulary-builder")
        .maybeSingle();
      if (prog) setUnlocked(Math.max(1, prog.max_unlocked_level || 1));
      else await (supabase as any).from("user_skill_progress").insert({ user_id: uid, skill_slug: "vocabulary-builder", max_unlocked_level: 1 });
      setLoading(false);
    };
    load();
  }, []);

  const nodes = useMemo(() => {
    const arr: Array<{ level: number; test?: SkillTest }>[] = [];
    let level = 1;
    for (let r = 0; r < GRID_ROWS; r++) {
      const row: Array<{ level: number; test?: SkillTest }> = [];
      for (let c = 0; c < GRID_COLS; c++) {
        const test = tests[level - 1];
        row.push({ level, test });
        level++;
      }
      if (r % 2 === 1) row.reverse();
      arr.push(row);
    }
    return arr;
  }, [tests]);

  const handleStart = (lvl: number, test?: SkillTest) => {
    if (lvl > unlocked) {
      toast({ title: "Level locked", description: "Clear previous levels to unlock this one." });
      return;
    }
    if (!test) {
      toast({ title: "Coming soon", description: `Level ${lvl} content is not available yet.` });
      return;
    }
    navigate(`/skills/vocabulary-builder/test/${test.id}`);
  };

  const unlockNext = async () => {
    const { data: userResp } = await supabase.auth.getUser();
    const uid = userResp?.user?.id;
    if (!uid) {
      toast({ title: "Sign in required", description: "Please sign in to save your progress." });
      return;
    }
    const next = Math.min(20, unlocked + 1);
    const { error } = await (supabase as any)
      .from("user_skill_progress")
      .upsert({ user_id: uid, skill_slug: "vocabulary-builder", max_unlocked_level: next }, { onConflict: "user_id,skill_slug" });
    if (!error) {
      setUnlocked(next);
      toast({ title: "Unlocked!", description: `Level ${next} is now available.` });
    }
  };

  const progressPct = Math.min(100, (unlocked - 1) / 19 * 100);

  return (
    <Card className="border-light-border">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Flag className="h-4 w-4" />
            <span>Start at Level 1 — reach the castle at Level 20</span>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => navigate('/skills/vocabulary-builder')}>List View</Button>
            <Button onClick={unlockNext}>Unlock Next</Button>
          </div>
        </div>
        <Progress value={progressPct} />
        {loading ? (
          <div className="flex justify-center items-center min-h-[30vh]">
            <p className="text-muted-foreground">Loading map...</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {nodes.map((row, rIdx) => (
              <div key={rIdx} className="grid grid-cols-4 gap-4">
                {row.map(({ level, test }) => {
                  const isCastle = level === 20;
                  const isLocked = level > unlocked;
                  return (
                    <button
                      key={level}
                      onClick={() => handleStart(level, test)}
                      className={`relative rounded-lg border p-4 text-left transition-colors hover:bg-muted ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                      aria-disabled={isLocked}
                      aria-label={isCastle ? `Level ${level} Castle` : `Level ${level}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">{level}</span>
                          <div className="font-medium">{isCastle ? 'Castle' : (test?.title || `Level ${level}`)}</div>
                        </div>
                        {isCastle ? (
                          <Trophy className="h-5 w-5 text-primary" />
                        ) : isLocked ? (
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        ) : null}
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        {isLocked ? 'Locked' : test ? 'Play' : 'Coming soon'}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VocabularyMapGrid;
