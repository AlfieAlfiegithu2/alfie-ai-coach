import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
  const [uploadedUrl, setUploadedUrl] = useState<string>("");
  const audioObjRef = useRef<HTMLAudioElement | null>(null);
  const [autoplayFailed, setAutoplayFailed] = useState(false);

  const onRecordingComplete = (blob: Blob) => {
    setRecordingBlob(blob);
    setTranscription("");
    setAnalysis("");
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
      a.play()
        .then(() => setAutoplayFailed(false))
        .catch(() => setAutoplayFailed(true));
    } catch (e) {
      setAutoplayFailed(true);
    }
    return () => {
      try { audioObjRef.current?.pause(); } catch {}
    };
  }, [item.audio_url]);

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

      // 4) Save to DB
      const { error: insErr } = await (supabase as any)
        .from("pronunciation_results")
        .insert({
          user_id: userId,
          test_id: testId,
          item_id: item.id,
          audio_url,
          analysis_json: { transcription: trans, analysis: anal },
          overall_score: null,
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

      <div className="flex justify-center">
        <Card className="border-light-border w-full max-w-xl">
          <CardContent className="p-6 space-y-4">
            <div className="flex justify-center">
              <AudioRecorder onRecordingComplete={onRecordingComplete} autoFocus />
            </div>
            <div className="flex justify-center">
              <Button onClick={handleAnalyze} disabled={loading || !recordingBlob}>
                {loading ? "Analyzing..." : "Get Analysis"}
              </Button>
            </div>
            {uploadedUrl && (
              <p className="text-xs text-muted-foreground break-all text-center">Saved: {uploadedUrl}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {(transcription || analysis) && (
        <Card className="border-light-border">
          <CardContent className="p-4 space-y-2">
            {transcription && (
              <div>
                <p className="text-xs font-medium">Transcription</p>
                <p className="text-sm whitespace-pre-wrap">{transcription}</p>
              </div>
            )}
            {analysis && (
              <div>
                <p className="text-xs font-medium">Feedback</p>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{analysis}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PronunciationPracticeItem;
