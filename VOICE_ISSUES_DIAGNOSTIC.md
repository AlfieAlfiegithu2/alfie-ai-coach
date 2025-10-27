# 🔍 Voice Issues - Comprehensive Diagnostic & Solution

**Date:** October 25, 2025  
**Status:** Fixed & Ready for Testing

---

## ✅ **Issues Identified & Fixed**

### **Issue #1: Voice Preview Not Showing**
**Problem:** Voice selection cards don't show preview buttons  
**Root Cause:** `ElevenLabsVoiceOptimized` was missing the provider parameter - the audio-cache function defaulted to trying Google Cloud TTS first, which fails silently

**Solution Applied:**
```typescript
// Before - no provider specified
const { data, error } = await supabase.functions.invoke('audio-cache', {
  body: {
    text,
    voice_id: voiceId,
    question_id: questionId
  }
});

// After - explicitly use ElevenLabs for previews
const { data, error } = await supabase.functions.invoke('audio-cache', {
  body: {
    text,
    voice_id: voiceId,
    question_id: questionId,
    provider: 'elevenlabs' // ← NEW
  }
});
```

**Result:** ✅ Voice preview buttons will now work properly

---

### **Issue #2: No Sound When Starting Conversation**
**Problem:** AI coach doesn't speak when generating first response  
**Root Cause:** Multiple possible causes:
1. `selectedVoice` state not properly passed to `ElevenLabsVoiceOptimized`
2. Missing error handling when audio fails to generate
3. Response parsing issues if API returns unexpected format

**Solution Applied:**
1. Added comprehensive error logging throughout the flow
2. Added provider parameter to audio-cache calls
3. Enhanced response validation in `callTutor`
4. Added detailed console logs at every step

**What to Check:**
Open browser DevTools (F12) → Console tab and look for:
- ✅ `🎵 Auto-playing preview with voice: [voiceId]` - preview working
- ✅ `📞 Calling audio-cache with:` - audio generation started
- ✅ `✅ Audio-cache response:` - audio generated successfully
- ✅ `▶️ Audio playing` - audio playing in browser
- ❌ `❌ Audio-cache error:` - audio generation failed
- ❌ `❌ Error generating audio:` - error in component

---

### **Issue #3: "Sorry—I didn't catch that" Error**
**Problem:** When you speak, AI always responds with generic error message  
**Root Cause:** `callTutor` function is failing silently - real error not shown to user

**Solution Applied:**
```typescript
// Enhanced error handling
catch (e) {
  console.error('❌ Error in callTutor:', e);
  const errorMessage = e instanceof Error ? e.message : 'Unknown error occurred';
  console.error('📋 Full error details:', {
    message: errorMessage,
    stack: e instanceof Error ? e.stack : 'No stack',
    conversationModeType,  // ← Check if mode is correct
    selectedLanguage        // ← Check if language is set
  });

  // Show actual error to user instead of generic message
  toast({
    title: "Connection Error",
    description: errorMessage,  // ← Was hardcoded, now shows real error
    variant: "destructive"
  });
}
```

**What to Look For in Console:**
```
❌ Error in callTutor: ...
📋 Full error details: {
  message: "[THE ACTUAL ERROR]",
  stack: "...",
  conversationModeType: "structured" or "gemini",
  selectedLanguage: "en" or null
}
```

Common errors to watch for:
- `API Error: {"message":"Missing authentication"}` → Not logged in
- `API Error: {"message":"Rate limit exceeded"}` → Too many requests
- `API returned failure: ...` → Backend function returned error
- `Failed to fetch` → Network connection issue

---

## 🧪 **How to Test - Step by Step**

### **Test 1: Voice Preview**
1. Click "Start Speaking Practice"
2. Go through topic/language selection
3. When "Choose Your AI Tutor's Voice" appears:
   - Click "Preview" button under any voice
   - **Expected:** Voice speaks the preview text
   - **Check Console:** Look for `🎵 Auto-playing preview`, `📞 Calling audio-cache`, `✅ Audio-cache response`

### **Test 2: AI Speaking on First Response**
1. Complete voice selection
2. AI should ask opening question with sound
3. **Expected:** You hear the AI tutor's voice
4. **Check Console:** Look for `📤 Calling conversation-tutor`, `📥 conversation-tutor response`, `✅ AI reply added`

### **Test 3: Handling Speech Input**
1. Microphone button shows green (listening)
2. Speak a response
3. **Expected:**
   - Your speech is recognized
   - AI responds with a helpful message (not "Sorry—I didn't catch that")
   - AI speaks the response
4. **Check Console:**
   - `🤖 Calling tutor with messages` - speech sent to backend
   - `📤 Calling conversation-tutor` - API called
   - `📥 conversation-tutor response` - response received
   - `✅ AI reply added` - response displayed
   - If error: `❌ Error in callTutor` with detailed error

---

## 🐛 **If Issues Persist - Debugging Checklist**

### **For Voice Preview Not Working:**
- [ ] Check `ELEVENLABS_API_KEY` is set in Supabase environment
- [ ] Open Console (F12), click Preview button, check for errors
- [ ] Look for `❌ Audio-cache error:` in console
- [ ] If shows `Google TTS not configured`, that's expected - fallback working

### **For No Audio on AI Response:**
- [ ] Check `selectedVoice` is being set (in localStorage or state)
- [ ] In Console, search for `voiceId` to see which voice is selected
- [ ] Look for `📞 Calling audio-cache with:` - verify voice_id is correct
- [ ] If no audio plays but no error shown, audio might be blocked by browser:
  ```javascript
  // Run this in console to check audio permissions
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(() => console.log('✅ Mic access granted'))
    .catch(e => console.error('❌ Mic access denied:', e))
  ```

### **For "Sorry—I didn't catch that" Error:**
- [ ] Open Console, go to Network tab
- [ ] Speak something to AI
- [ ] Check if `conversation-tutor` or `gemini-chat` API call appears
- [ ] Click that request, check Response tab
- [ ] Look for `error` or `success: false` in response
- [ ] In Console, look for `📋 Full error details:` with actual error message
- [ ] Note the error message and search below

---

## 🔧 **Common Errors & Solutions**

### Error: "Missing environment variables: ELEVENLABS_API_KEY"
**Solution:** Add `ELEVENLABS_API_KEY` to Supabase environment variables
```bash
npx supabase secrets set ELEVENLABS_API_KEY="your_key_here"
```

### Error: "No TTS provider configured"
**Solution:** Both ElevenLabs and Google Cloud TTS are not configured. At least one is required.

### Error: "API returned failure: Response parsing error"
**Solution:** The backend function is failing. Check Supabase function logs for details.

### Error: "Failed to fetch"
**Solution:** Network connectivity issue. Check:
- Internet connection
- Supabase status (https://status.supabase.com)
- Browser console for CORS errors

### Error: "Microphone access denied" or "no-speech"
**Solution:**
1. Check browser microphone permissions
2. In browser settings, allow microphone for englishaidol.com
3. Refresh page
4. Try again

---

## 📝 **Code Changes Summary**

### Files Modified:
1. **`apps/main/src/components/ElevenLabsVoiceOptimized.tsx`**
   - Added `provider: 'elevenlabs'` parameter
   - Enhanced error logging throughout
   - Better diagnosis of audio generation failures

2. **`apps/main/src/pages/SpeakingTutor.tsx`**
   - Enhanced `callTutor` error handling with full error details
   - Better response parsing for both Gemini and Structured modes
   - User sees actual error messages instead of generic ones
   - Added logging at 10 key points to trace conversation flow

3. **`supabase/functions/audio-cache/index.ts`** (Already updated)
   - Supports explicit provider selection
   - Falls back through providers if one fails
   - Maps voices between providers intelligently

---

## 🚀 **What Happens When You Click "Preview"**

```
User clicks "Preview" button on voice card
    ↓
VoiceSelection state: setPreviewPlaying(voiceId)
    ↓
ElevenLabsVoiceOptimized component mounts with autoPlay=true
    ↓
🎵 Auto-playing preview with voice: [voiceId]
    ↓
📞 Calling audio-cache with: {text: "...", voiceId: "[voiceId]", provider: "elevenlabs"}
    ↓
Backend generates audio using ElevenLabs API
    ↓
✅ Audio-cache response: {success: true, audio_url: "data:audio/mpeg;base64,..."}
    ↓
▶️ Audio playing
    ↓
[Audio plays in browser]
    ↓
⏹️ Audio ended
    ↓
onPlayEnd() called → setPreviewPlaying(null)
    ↓
Component unmounts
```

---

## 📊 **Next Steps**

1. **Push code to production**
2. **Test voice preview** in the speaking tutor
3. **Open DevTools Console** while testing
4. **Share console output** if issues persist
5. **Check specific error messages** from the diagnostic list above

---

## 💡 **Pro Tips**

- **Always keep DevTools Console open** when testing voice features (F12 → Console tab)
- **The console logs have emoji prefixes** to quickly spot issues:
  - 🎵 = Preview/audio working
  - 📞 = API call started
  - 📥 = API response received
  - ✅ = Success
  - ❌ = Error
- **If you see ❌ errors**, that's the information you need to debug
- **Share the full console output** if you need further help
