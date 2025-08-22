import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import LottieLoadingAnimation from "@/components/animations/LottieLoadingAnimation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { AudioRecorder } from "@/components/AudioRecorder";
import { supabase } from "@/integrations/supabase/client";

export interface PronItem {
  id: string;
  reference_text: string;
  audio_url: string;
  order_index: number;
}

interface Props {
  item: PronItem;
  testId: string;
  onAnalyzed?: (result: { transcription: string; analysis: string; audioUrl: string }) => void;
}

const PronunciationPracticeItem: React.FC<Props> = ({ item, testId, onAnalyzed }) => {
  const { toast } = useToast();
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);
  const [transcription, setTranscription] = useState<string>("");
  const [analysis, setAnalysis] = useState<string>("");
  const [analysisJson, setAnalysisJson] = useState<any | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string>("");
  const audioObjRef = useRef<HTMLAudioElement | null>(null);
  const [autoplayFailed, setAutoplayFailed] = useState(false);
  const [hasAutoPlayed, setHasAutoPlayed] = useState(false);

  const onRecordingComplete = (blob: Blob) => {
    setRecordingBlob(blob);
    setTranscription("");
    setAnalysis("");
    setAnalysisJson(null);
    setUploadedUrl("");
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const playSample = async () => {
    try {
      await audioObjRef.current?.play();
      setAutoplayFailed(false);
    } catch (e) {
      setAutoplayFailed(true);
    }
  };

  useEffect(() => {
    try {
      if (audioObjRef.current) {
        audioObjRef.current.pause();
        audioObjRef.current = null;
      }
      const a = new Audio(item.audio_url);
      a.preload = "auto";
      (a as any).playsInline = true;
      audioObjRef.current = a;
      if (!hasAutoPlayed) {
        a.play()
          .then(() => { setAutoplayFailed(false); setHasAutoPlayed(true); })
          .catch(() => setAutoplayFailed(true));
      }
    } catch (e) {
      setAutoplayFailed(true);
    }
    return () => {
      try { audioObjRef.current?.pause(); } catch {}
    };
  }, [item.audio_url, hasAutoPlayed]);

  useEffect(() => {
    // Reset UI when moving to a new item
    setRecordingBlob(null);
    setLoading(false);
    setTranscription("");
    setAnalysis("");
    setAnalysisJson(null);
    setUploadedUrl("");
    setAutoplayFailed(false);
    setHasAutoPlayed(false);
  }, [item.id]);

  const handleAnalyze = async () => {
    try {
      if (!recordingBlob) {
        toast({ title: "No recording", description: "Please record your voice first.", variant: "destructive" });
        return;
      }
      const { data: userResp } = await supabase.auth.getUser();
      const userId = userResp?.user?.id;
      if (!userId) {
        toast({ title: "Sign in required", description: "Please log in to save and analyze your recording.", variant: "destructive" });
        return;
      }

      setLoading(true);
      // 1) Upload audio to storage
      const path = `user-recordings/pronunciation/${testId}/${item.id}/${Date.now()}.webm`;
      const { error: upErr } = await supabase.storage
        .from("audio-files")
        .upload(path, recordingBlob, { upsert: false, contentType: "audio/webm" });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("audio-files").getPublicUrl(path);
      const audio_url = pub.publicUrl;
      setUploadedUrl(audio_url);

      // 2) Convert to base64 for analysis function
      const base64 = await blobToBase64(recordingBlob);

      // 3) Call edge function for analysis
      const { data: analysisResp, error: fnErr } = await supabase.functions.invoke("pronunciation-analysis", {
        body: {
          audio: base64,
          referenceText: item.reference_text,
        },
      });
      if (fnErr) throw fnErr;

      const trans = analysisResp?.transcription ?? "";
      const anal = analysisResp?.analysis ?? "";
      setTranscription(trans);
      setAnalysis(anal);
      try {
        setAnalysisJson(analysisResp?.analysis_json ?? JSON.parse(anal));
      } catch {
        setAnalysisJson(null);
      }

      // 4) Save to DB
      const overallScore = analysisResp?.analysis_json?.overallScore ?? null;
      const { error: insErr } = await (supabase as any)
        .from("pronunciation_results")
        .insert({
          user_id: userId,
          test_id: testId,
          item_id: item.id,
          audio_url,
          analysis_json: analysisResp?.analysis_json ?? { transcription: trans, analysis: anal },
          overall_score: overallScore,
        });
      if (insErr) throw insErr;

      toast({ title: "Analysis complete", description: "Your feedback is ready." });
      onAnalyzed?.({ transcription: trans, analysis: anal, audioUrl: audio_url });
    } catch (e: any) {
      console.error(e);
      toast({ title: "Analysis failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-center">
        <Button size="sm" variant="outline" onClick={playSample}>
          {autoplayFailed ? "Play sample" : "Replay sample"}
        </Button>
      </div>

      <div className="space-y-4 w-full max-w-xl mx-auto">
        <div className="flex justify-center">
          <AudioRecorder key={item.id} onRecordingComplete={onRecordingComplete} autoFocus />
        </div>
        <div className="flex justify-center">
          <Button onClick={handleAnalyze} disabled={loading || !recordingBlob}>
            {loading ? "Analyzing..." : "Get Analysis"}
          </Button>
        </div>
        {loading && (
          <div className="flex justify-center animate-fade-in">
            <LottieLoadingAnimation size="md" message="Analyzing pronunciation..." />
          </div>
        )}
      </div>

      {analysisJson && (
        <Card className="border-light-border w-full max-w-xl mx-auto">
          <CardContent className="p-6 space-y-4">
            <div className="text-center">
              <p className="text-xs font-medium">Overall Score</p>
              <p className="text-3xl font-semibold text-primary">{analysisJson?.overallScore ?? '-'} / 100</p>
              {analysisJson?.overallSummary && (
                <p className="text-sm text-muted-foreground mt-1">{analysisJson.overallSummary}</p>
              )}
            </div>

            {Array.isArray(analysisJson?.wordAnalysis) && analysisJson.wordAnalysis.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-2">Word Analysis</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {analysisJson.wordAnalysis.slice(0, 8).map((w: any, idx: number) => (
                    <div key={idx} className="rounded-md border border-light-border p-2 text-sm">
                      <div className="font-medium">
                        {w.word}
                        <span className="ml-2 text-xs text-muted-foreground">{w.status}</span>
                      </div>
                      {w.feedback && <div className="text-xs text-muted-foreground">{w.feedback}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {Array.isArray(analysisJson?.detailedFeedback) && analysisJson.detailedFeedback.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-medium">Detailed Feedback</p>
                {analysisJson.detailedFeedback.map((d: any, idx: number) => (
                  <div key={idx} className="rounded-md border border-light-border p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{d.area}</p>
                      {typeof d.score === 'number' && (
                        <span className="text-xs text-muted-foreground">{d.score}/100</span>
                      )}
                    </div>
                    {d.positive && <p className="text-sm mt-1">+ {d.positive}</p>}
                    {d.improvement && <p className="text-sm mt-1">→ {d.improvement}</p>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}


    </div>
  );
};

export default PronunciationPracticeItem;
