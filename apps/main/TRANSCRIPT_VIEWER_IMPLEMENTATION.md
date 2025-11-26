# 🎯 Transcript Viewer with Timestamp Sync - Implementation Guide

## Overview
Add a live transcript viewer to IELTS Listening tests that highlights words as the audio plays, helping students follow along and improve comprehension.

## ✨ Features
- **Word-by-word highlighting** synced with audio playback
- **Click words to jump** to that moment in audio
- **Progress scrub bar** shows playback position
- **Play/Pause controls** integrated with transcript
- **Optional feature** - admins can enable/disable per test

## 🏗️ Architecture

### 1. **Admin Side** - Upload Transcript with Timestamps
Admin uploads:
- Audio file (already supported)
- JSON file with word-level timestamps

### 2. **Student Side** - Interactive Transcript Viewer
Students see:
- Scrolling transcript with word highlighting
- Audio player controls
- Synchronized playback

## 📝 Implementation Steps

### Step 1: Update Database Schema

Add transcript column to `listening_sections` table:

```sql
ALTER TABLE listening_sections
ADD COLUMN transcript_json JSONB DEFAULT NULL;

COMMENT ON COLUMN listening_sections.transcript_json IS 'Word-level timestamp data for transcript viewer';
```

### Step 2: Install Transcript Viewer Component

The component you showed looks perfect! You'll need:

```bash
# If not already installed
npm install lucide-react
```

### Step 3: Create Transcript Upload in Admin

Add to `AdminIELTSListening.tsx`:

```typescript
const [transcriptFile, setTranscriptFile] = useState<File | null>(null);

const handleTranscriptUpload = (file: File) => {
  setTranscriptFile(file);
  toast.success(`Transcript uploaded: ${file.name}`);
};

// In the save function:
let transcriptJson = null;
if (transcriptFile) {
  const transcriptContent = await transcriptFile.text();
  transcriptJson = JSON.parse(transcriptContent);
}

// Add to sectionData:
transcript_json: transcriptJson
```

Add UI in the admin form:

```tsx
{/* Transcript Upload (Optional) */}
<div className="space-y-2">
  <label className="text-sm font-medium">
    Transcript with Timestamps (Optional)
  </label>
  <p className="text-xs text-muted-foreground">
    Upload JSON file with word-level timestamps for interactive transcript viewer
  </p>
  <div className="border-2 border-dashed border-border rounded-lg p-4">
    <input
      type="file"
      accept=".json"
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) handleTranscriptUpload(file);
      }}
      className="hidden"
      id="transcript-upload"
    />
    <Button
      variant="outline"
      onClick={() => document.getElementById('transcript-upload')?.click()}
    >
      <Upload className="w-4 h-4 mr-2" />
      Upload Transcript JSON
    </Button>
    {transcriptFile && (
      <p className="text-sm text-green-600 mt-2">
        ✓ {transcriptFile.name}
      </p>
    )}
  </div>
</div>
```

### Step 4: JSON Format for Transcripts

The transcript JSON should follow this format:

```json
{
  "characters": ["H", "e", "l", "l", "o", " ", "w", "o", "r", "l", "d"],
  "characterStartTimesSeconds": [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
  "characterEndTimesSeconds": [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1]
}
```

### Step 5: Generate Timestamps with Gemini

Use Gemini to generate timestamps from audio! Add this Edge Function:

```typescript
// supabase/functions/generate-transcript-timestamps/index.ts
import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0";

Deno.serve(async (req) => {
  const { audioUrl, transcript } = await req.json();
  
  const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY')!);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

  // Fetch audio
  const audioResponse = await fetch(audioUrl);
  const audioBuffer = await audioResponse.arrayBuffer();
  const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));

  const prompt = `Analyze this audio and the provided transcript. Generate character-level timestamps.

Transcript: "${transcript}"

Return JSON format:
{
  "characters": ["char1", "char2", ...],
  "characterStartTimesSeconds": [0.0, 0.1, ...],
  "characterEndTimesSeconds": [0.1, 0.2, ...]
}`;

  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        mimeType: "audio/mpeg",
        data: audioBase64
      }
    }
  ]);

  const response = result.response.text();
  const timestamps = JSON.parse(response.replace(/```json\n?/g, '').replace(/```\n?/g, ''));

  return new Response(JSON.stringify({ success: true, timestamps }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

### Step 6: Add Transcript Viewer to Student Page

Create `components/ListeningTranscriptViewer.tsx`:

```typescript
import { TranscriptViewerContainer, TranscriptViewerAudio, TranscriptViewerWords, TranscriptViewerScrubBar, TranscriptViewerPlayPauseButton } from "@/components/ui/transcript-viewer";
import { PlayIcon, PauseIcon } from "lucide-react";

interface Props {
  audioUrl: string;
  transcriptData: {
    characters: string[];
    characterStartTimesSeconds: number[];
    characterEndTimesSeconds: number[];
  };
}

export const ListeningTranscriptViewer = ({ audioUrl, transcriptData }: Props) => {
  return (
    <TranscriptViewerContainer
      className="bg-card w-full rounded-xl border p-6"
      audioSrc={audioUrl}
      audioType="audio/mpeg"
      alignment={transcriptData}
    >
      <h3 className="text-lg font-semibold mb-4">Live Transcript</h3>
      <TranscriptViewerAudio className="sr-only" />
      <TranscriptViewerWords className="text-base leading-7" />
      <div className="flex items-center gap-3 mt-4">
        <TranscriptViewerScrubBar />
      </div>
      <TranscriptViewerPlayPauseButton
        className="w-full mt-4"
        size="lg"
      >
        {({ isPlaying }) => (
          <>
            {isPlaying ? <><PauseIcon /> Pause</> : <><PlayIcon /> Play</>}
          </>
        )}
      </TranscriptViewerPlayPauseButton>
    </TranscriptViewerContainer>
  );
};
```

### Step 7: Integration in Student Listening Test

In `IELTSListeningTest.tsx` (or similar):

```typescript
{section.transcript_json && (
  <div className="mb-6">
    <ListeningTranscriptViewer
      audioUrl={section.audio_url}
      transcriptData={section.transcript_json}
    />
  </div>
)}
```

## 🎨 Benefits

### For Students:
✅ **Better comprehension** - see what's being said in real-time
✅ **Improved focus** - visual + audio engagement  
✅ **Learning tool** - can click words to replay sections
✅ **Accessibility** - helps students with hearing difficulties

### For Learning:
✅ **Vocabulary building** - students can see spelling while listening
✅ **Pronunciation** - connect written/spoken forms
✅ **Catch up if lost** - easy to find your place again

## 💡 Best Practices

1. **Make it optional** - Toggle per test (some tests shouldn't have transcripts)
2. **Mobile responsive** - Ensure transcript is readable on all devices
3. **Loading states** - Show skeleton while transcript loads
4. **Error handling** - Gracefully handle missing/invalid transcript data

## 🚀 Quick Start

1. Add transcript upload to admin panel
2. Upload a test transcript JSON file
3. Enable transcript viewer in student test
4. Test with audio playback!

## 📖 Example Workflow

**Admin:**
1. Upload audio file
2. Upload questions CSV
3. (Optional) Upload transcript JSON
4. Save test

**Student:**
1. Start listening test
2. Audio plays automatically
3. Transcript highlights in sync
4. Student can pause/play
5. Click any word to jump to that moment
6. Answer questions while listening

## 🎯 Result

Students get a **premium learning experience** with visual feedback synced to audio, making IELTS listening practice more effective and engaging!

Would you like me to implement the full transcript viewer feature?
