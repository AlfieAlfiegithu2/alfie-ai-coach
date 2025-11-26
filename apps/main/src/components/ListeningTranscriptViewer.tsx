import { TranscriptViewerContainer, TranscriptViewerAudio, TranscriptViewerWords, TranscriptViewerScrubBar, TranscriptViewerPlayPauseButton } from "@/components/ui/transcript-viewer";
import { PlayIcon, PauseIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
    audioUrl: string;
    transcriptData: {
        characters: string[];
        characterStartTimesSeconds: number[];
        characterEndTimesSeconds: number[];
    } | null;
}

export const ListeningTranscriptViewer = ({ audioUrl, transcriptData }: Props) => {
    if (!transcriptData) {
        return (
            <div className="flex w-full flex-col gap-3 p-6 border rounded-xl bg-card">
                <Skeleton className="h-6 w-1/3 mb-4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <div className="flex items-center gap-3 mt-4">
                    <Skeleton className="h-10 w-full" />
                </div>
            </div>
        );
    }

    return (
        <TranscriptViewerContainer
            className="bg-card w-full rounded-xl border p-6 shadow-sm"
            audioSrc={audioUrl}
            audioType="audio/mpeg"
            alignment={transcriptData}
        >
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Live Transcript</h3>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                    Click words to jump
                </span>
            </div>

            <TranscriptViewerAudio className="sr-only" />

            <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                <TranscriptViewerWords className="text-base leading-relaxed" />
            </div>

            <div className="flex flex-col gap-4 mt-6 pt-4 border-t">
                <div className="w-full">
                    <TranscriptViewerScrubBar />
                </div>

                <TranscriptViewerPlayPauseButton
                    className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 rounded-md transition-colors"
                >
                    {({ isPlaying }) => (
                        <>
                            {isPlaying ? (
                                <>
                                    <PauseIcon className="w-4 h-4" /> Pause Audio
                                </>
                            ) : (
                                <>
                                    <PlayIcon className="w-4 h-4" /> Play Audio
                                </>
                            )}
                        </>
                    )}
                </TranscriptViewerPlayPauseButton>
            </div>
        </TranscriptViewerContainer>
    );
};
