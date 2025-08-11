import React, { useState } from "react";
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
}

const PronunciationPracticeItem: React.FC<Props> = ({ item, testId }) => {
  const { toast } = useToast();
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);
  const [transcription, setTranscription] = useState<string>("");
  const [analysis, setAnalysis] = useState<string>("");
  const [uploadedUrl, setUploadedUrl] = useState<string>("");

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
      const { data: analysisResp, error: fnErr } = await supabase.functions.invoke("speech-analysis", {
        body: {
          audio: base64,
          prompt: item.reference_text,
          speakingPart: "Pronunciation Repeat After Me",
          questionTranscription: item.reference_text,
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
    } catch (e: any) {
      console.error(e);
      toast({ title: "Analysis failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-sm"><span className="font-medium">{item.order_index}.</span> {item.reference_text}</p>
      <audio controls preload="none" className="w-full">
        <source src={item.audio_url} />
        Your browser does not support the audio element.
      </audio>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="border-light-border">
          <CardContent className="p-4">
            <AudioRecorder onRecordingComplete={onRecordingComplete} />
          </CardContent>
        </Card>
        <Card className="border-light-border">
          <CardContent className="p-4 space-y-2">
            <Button onClick={handleAnalyze} disabled={loading || !recordingBlob}>
              {loading ? "Analyzing..." : "Get Analysis"}
            </Button>
            {uploadedUrl && (
              <p className="text-xs text-muted-foreground break-all">Saved: {uploadedUrl}</p>
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
