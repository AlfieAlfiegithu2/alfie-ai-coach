import { useEffect, useRef, useState } from "react";
import StudentLayout from "@/components/StudentLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

export default function VocabSeed() {
  const { user } = useAuth();
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<{ completed?: number; total?: number; last_term?: string; last_error?: string; id?: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    let stop = false;
    const poll = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('vocab-bulk-status');
        if (!stop && data?.success) setStatus(data.job || {});
      } catch {}
    };
    const id = setInterval(poll, 3000);
    poll();
    return () => { stop = true; clearInterval(id); };
  }, []);

  const start = async () => {
    if (!user || running) return;
    setErr(null);
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('vocab-bulk-seed', {
        body: { total: 5000, language: 'en', translateTo: 'ko', levels: { 1: 1800, 2: 1700, 3: 1100, 4: 300, 5: 100 } }
      });
      if (error || !data?.success) throw new Error(data?.error || error?.message || 'Failed to start');
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setRunning(false);
    }
  };

  // Auto-start once when page loads and user is present
  useEffect(() => {
    if (!user) return;
    if (startedRef.current) return;
    const completed = status?.completed ?? 0;
    const total = status?.total ?? 0;
    if (total > 0 && completed >= total) return; // already done
    startedRef.current = true;
    start();
  }, [user, status?.completed, status?.total]);

  return (
    <StudentLayout title="Seed 5,000 Vocabulary" showBackButton>
      <div className="space-y-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            {!user && (
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-muted-foreground">Please sign in to start seeding.</div>
                <Button asChild>
                  <Link to="/auth">Sign in</Link>
                </Button>
              </div>
            )}
            {user && (
              <>
                <div className="text-sm text-muted-foreground">This will generate 5,000 EN→KO cards into your account, grouped by 20‑word decks.</div>
                <Button disabled={running} onClick={start}>{running ? 'Starting…' : 'Start 5,000-word Seeding'}</Button>
                {err && <div className="text-xs text-red-500">{err}</div>}
                {status && (
                  <div className="text-xs text-muted-foreground">
                    Progress: {status.completed ?? 0} / {status.total ?? 0}
                    {status.last_term ? <div>Last term: {status.last_term}</div> : null}
                    {status.last_error ? <div className="text-red-500">Last error: {status.last_error}</div> : null}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  );
}


