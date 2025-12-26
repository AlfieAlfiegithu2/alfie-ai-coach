import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const LAUNCH_DATE = new Date("2025-12-31T00:00:00Z");
const DISMISS_KEY = "comingSoonDismissedV1";
const SUBSCRIBED_KEY = "comingSoonSubscribedV1";
const SNOOZE_KEY = "comingSoonSnoozedUntilV1";

const isBeforeLaunch = () => {
  try {
    return new Date() < LAUNCH_DATE;
  } catch {
    return true;
  }
};

const ComingSoonModal = () => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  // Show with IELTS Speaking visual language and respect 24h snooze
  useEffect(() => {
    if (!isBeforeLaunch()) return;

    try {
      const dismissed = localStorage.getItem(DISMISS_KEY) === "true";
      const subscribed = localStorage.getItem(SUBSCRIBED_KEY) === "true";
      const snoozedUntilRaw = localStorage.getItem(SNOOZE_KEY);
      const snoozedUntil = snoozedUntilRaw ? new Date(snoozedUntilRaw) : null;
      const now = new Date();

      const isSnoozed =
        snoozedUntil instanceof Date &&
        !isNaN(snoozedUntil.getTime()) &&
        snoozedUntil > now;

      if (!dismissed && !subscribed && !isSnoozed) {
        setOpen(true);
      }
    } catch {
      setOpen(true);
    }
  }, []);

  const close = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "true");
    } catch {
      // ignore
    }
    setOpen(false);
  };

  const snooze24h = () => {
    try {
      const until = new Date();
      until.setHours(until.getHours() + 24);
      localStorage.setItem(SNOOZE_KEY, until.toISOString());
    } catch {
      // ignore
    }
    setOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }

    setSubmitting(true);
    try {
      const userAgent =
        typeof navigator !== "undefined" ? navigator.userAgent : null;
      const pagePath =
        typeof window !== "undefined" ? window.location.pathname : null;

      // Use generic typing so it compiles even before table is added to generated types
      const { error: insertError } = await supabase
        .from("coming_soon_signups" as any)
        .insert(
          {
            email: trimmed,
            user_agent: userAgent,
            page_path: pagePath,
          } as any
        );

      if (insertError) {
        // Treat duplicate as success
        const msg = insertError.message?.toLowerCase?.() || "";
        if (insertError.code === "23505" || msg.includes("duplicate")) {
          setSubmitted(true);
          try {
            localStorage.setItem(SUBSCRIBED_KEY, "true");
          } catch {
            // ignore
          }
          return;
        }

        console.error("Error saving coming soon signup:", insertError);
        setError("Something went wrong. Please try again in a moment.");
        return;
      }

      setSubmitted(true);
      try {
        localStorage.setItem(SUBSCRIBED_KEY, "true");
      } catch {
        // ignore
      }
    } catch (err) {
      console.error("Unexpected signup error:", err);
      setError("Something went wrong. Please try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || !isBeforeLaunch()) {
    return null;
  }

  // Styling notes:
  // - Uses soft blue/sky/indigo gradient, rounded-3xl, and Nunito-style text hierarchy
  // - Mirrors the polished IELTS Speaking test UI as the design language core

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#5D4E37]/20 backdrop-blur-sm">
      <div className="relative w-full max-w-[720px] mx-4 sm:mx-6 rounded-3xl bg-[#FEF9E7] shadow-xl border border-[#E6E0D4] p-5 sm:p-7 md:p-8 overflow-hidden">
        {/* Paper texture overlay for Note theme */}
        <div
          className="pointer-events-none absolute inset-0 rounded-3xl opacity-40 z-0"
          style={{
            backgroundImage: 'url("https://www.transparenttextures.com/patterns/rice-paper-2.png")',
            mixBlendMode: 'multiply'
          }}
        />

        <div className="relative flex flex-col gap-4 z-10">
          {/* Close button */}
          <button
            onClick={close}
            className="absolute right-2 top-2 sm:right-3 sm:top-3 text-[#8C7B62] hover:text-[#5D4E37] transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Pill label */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFFDF5] border border-[#E6E0D4] text-[10px] sm:text-xs font-semibold text-[#D97757] tracking-[0.1em] uppercase shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D97757] animate-pulse" />
            <span>IELTS Speaking Preview</span>
          </div>

          {/* Headline */}
          <h2 className="text-2xl sm:text-3xl md:text-[32px] font-bold font-handwriting text-[#5D4E37] leading-tight mt-1">
            Your AI IELTS Speaking coach is almost ready.
          </h2>

          {/* Body copy */}
          <p className="text-[13px] sm:text-sm md:text-base text-[#5D4E37]/90 leading-relaxed max-w-3xl font-medium">
            We are finalizing an examiner-level IELTS Speaking journey: smart
            part 1–3 question flows, real-time scoring, and feedback that feels
            like a real speaking room, not a chatbot demo. Public launch is
            targeted for{" "}
            <span className="font-bold text-[#D97757] border-b-2 border-[#D97757]/20">
              31st of December
            </span>
            . Leave your email for early access and launch-only speaking bonuses.
          </p>

          {/* Form / success */}
          {submitted ? (
            <div className="mt-2 sm:mt-3 text-[11px] sm:text-sm text-[#5D4E37] bg-[#E6E0D4]/30 border border-[#D97757]/20 rounded-2xl px-4 py-3 font-medium flex items-center">
              <span className="mr-2 text-lg">✨</span>
              You're in. We'll email you as soon as your IELTS Speaking coach is live.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div>
                <label
                  htmlFor="coming-soon-email"
                  className="block text-[11px] sm:text-xs font-bold text-[#5D4E37] mb-1.5 uppercase tracking-wide"
                >
                  Get first access to the IELTS Speaking launch
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    id="coming-soon-email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 text-[13px] sm:text-sm h-10 sm:h-11 rounded-xl border-[#E6E0D4] bg-[#FFFDF5] text-[#5D4E37] placeholder:text-[#8C7B62]/60 focus-visible:ring-[#D97757]"
                  />
                  <Button
                    type="submit"
                    className="h-10 sm:h-11 px-5 sm:px-6 rounded-xl bg-[#D97757] hover:bg-[#C56A4B] text-white text-[12px] sm:text-sm font-bold shadow-md hover:shadow-lg transition-all"
                    disabled={submitting}
                  >
                    {submitting ? "Saving..." : "Notify me"}
                  </Button>
                </div>
              </div>

              {error && (
                <p className="text-[10px] sm:text-xs text-red-600 font-medium bg-red-50 p-1.5 rounded-lg border border-red-100 inline-block">
                  {error}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3 justify-between mt-2 pt-2 border-t border-[#5D4E37]/10">
                <p className="text-[10px] sm:text-[11px] text-[#8C7B62] leading-snug">
                  We'll only use your email for launch updates. No spam.
                </p>
                <button
                  type="button"
                  onClick={snooze24h}
                  className="text-[10px] sm:text-[11px] text-[#8C7B62] hover:text-[#D97757] underline-offset-2 hover:underline font-medium transition-colors"
                >
                  Remind me later (24h)
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComingSoonModal;