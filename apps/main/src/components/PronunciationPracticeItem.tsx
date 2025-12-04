import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import LottieLoadingAnimation from "@/components/animations/LottieLoadingAnimation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { AudioRecorder } from "@/components/AudioRecorder";
import { supabase } from "@/integrations/supabase/client";
import { Volume2 } from "lucide-react";

export interface PronItem {
  id: string;
  reference_text: string;
  audio_url: string | null;
  order_index: number;
  audio_url_uk?: string | null;
  audio_url_us?: string | null;
}

interface Props {
  item: PronItem;
  testId: string;
  selectedAccent?: 'uk' | 'us';
  onAnalyzed?: (result: { transcription: string; analysis: string; audioUrl: string }) => void;
}

const PronunciationPracticeItem: React.FC<Props> = ({ item, testId, selectedAccent = 'us', onAnalyzed }) => {
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
  const [isPlaying, setIsPlaying] = useState(false);

  // Get the audio URL based on selected accent
  const audioUrl = item.audio_url || (selectedAccent === 'uk' ? item.audio_url_uk : item.audio_url_us);

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
    if (!audioUrl) {
      toast({ title: "No audio available", description: "Audio for this accent hasn't been generated yet.", variant: "destructive" });
      return;
    }
    try {
      if (isPlaying && audioObjRef.current) {
        audioObjRef.current.pause();
        setIsPlaying(false);
        return;
      }
      await audioObjRef.current?.play();
      setAutoplayFailed(false);
      setIsPlaying(true);
    } catch (e) {
      setAutoplayFailed(true);
    }
  };

  useEffect(() => {
    if (!audioUrl) return;
    
    try {
      if (audioObjRef.current) {
        audioObjRef.current.pause();
        audioObjRef.current = null;
      }
      const a = new Audio(audioUrl);
      a.preload = "auto";
      (a as any).playsInline = true;
      audioObjRef.current = a;
      
      a.onended = () => setIsPlaying(false);
      a.onerror = () => setAutoplayFailed(true);
      
      if (!hasAutoPlayed) {
        a.play()
          .then(() => { setAutoplayFailed(false); setHasAutoPlayed(true); setIsPlaying(true); })
          .catch(() => setAutoplayFailed(true));
      }
    } catch (e) {
      setAutoplayFailed(true);
    }
    return () => {
      try { audioObjRef.current?.pause(); } catch {}
    };
  }, [audioUrl, hasAutoPlayed]);

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
    setIsPlaying(false);
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
      // TODO: Implement R2 upload instead of Supabase storage
      console.log('Pronunciation upload disabled - implement R2 upload');
      const audio_url = `https://your-bucket.your-domain.com/${path}`;
      setUploadedUrl(audio_url);

      // 2) Convert to base64 for analysis function
      const base64 = await blobToBase64(recordingBlob);

      // 3) Call edge function for analysis - pass the selected accent
      const accentForAnalysis = selectedAccent === 'uk' ? 'british' : 'american';
      const { data: analysisResp, error: fnErr } = await supabase.functions.invoke("pronunciation-analysis", {
        body: {
          audio: base64,
          referenceText: item.reference_text,
          accent: accentForAnalysis,
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
    <div className="space-y-4">
      {/* Listen Button */}
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm text-muted-foreground">Listen carefully and repeat exactly what you hear</p>
        <Button 
          size="lg" 
          variant={isPlaying ? "default" : "outline"} 
          onClick={playSample}
          disabled={!audioUrl}
          className="gap-2"
        >
          <Volume2 className={`w-5 h-5 ${isPlaying ? 'animate-pulse' : ''}`} />
          {!audioUrl ? "Audio not available" : isPlaying ? "Playing..." : autoplayFailed ? "Play Audio" : "Play Again"}
        </Button>
      </div>

      {/* Recording Section */}
      <div className="space-y-4 w-full max-w-xl mx-auto">
        <div className="flex justify-center">
          <AudioRecorder key={item.id} onRecordingComplete={onRecordingComplete} autoFocus />
        </div>
        <div className="flex justify-center">
          <Button onClick={handleAnalyze} disabled={loading || !recordingBlob} size="lg">
            {loading ? "Analyzing..." : "Get Feedback"}
          </Button>
        </div>
        {loading && (
          <div className="flex justify-center animate-fade-in">
            <LottieLoadingAnimation size="md" message="Analyzing your pronunciation..." />
          </div>
        )}
      </div>

      {/* Results Section */}
      {analysisJson && (
        <Card className="border-light-border w-full max-w-xl mx-auto animate-fade-in">
          <CardContent className="p-6 space-y-4">
            <div className="text-center">
              <p className="text-xs font-medium text-muted-foreground">Overall Score</p>
              <p className="text-4xl font-bold text-primary">{analysisJson?.overallScore ?? '-'}</p>
              <p className="text-xs text-muted-foreground">out of 100</p>
              {analysisJson?.overallSummary && (
                <p className="text-sm text-muted-foreground mt-2">{analysisJson.overallSummary}</p>
              )}
            </div>

            {Array.isArray(analysisJson?.wordAnalysis) && analysisJson.wordAnalysis.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-2">Word-by-Word Analysis</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {analysisJson.wordAnalysis.slice(0, 10).map((w: any, idx: number) => (
                    <div key={idx} className={`rounded-md border p-2 text-sm ${
                      w.status === 'correct' ? 'border-green-200 bg-green-50' : 
                      w.status === 'incorrect' ? 'border-red-200 bg-red-50' : 
                      'border-yellow-200 bg-yellow-50'
                    }`}>
                      <div className="font-medium flex items-center justify-between">
                        <span>{w.word}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          w.status === 'correct' ? 'bg-green-100 text-green-700' : 
                          w.status === 'incorrect' ? 'bg-red-100 text-red-700' : 
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {w.status}
                        </span>
                      </div>
                      {w.feedback && <div className="text-xs text-muted-foreground mt-1">{w.feedback}</div>}
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
                    {d.positive && <p className="text-sm mt-1 text-green-600">✓ {d.positive}</p>}
                    {d.improvement && <p className="text-sm mt-1 text-amber-600">→ {d.improvement}</p>}
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
