# 🚀 AI Speaking Tutor - Quick Start Guide

## ✅ What's Ready Now

**The AI Speaking Tutor is fully implemented and ready to test!**

### Core Features Working:
- ✅ Real-time voice conversation with AI
- ✅ Simultaneous pronunciation analysis (no delays)
- ✅ IELTS-specific coaching feedback
- ✅ Accent, intonation, and stress analysis
- ✅ Hybrid speech recognition (Web Speech + Google Cloud fallback)
- ✅ Professional natural voice responses

---

## 🎯 How to Access

### Option 1: Via IELTS Portal
1. Log in as student
2. Go to **IELTS Portal** → **Sharpening Your Skills**
3. Click **"AI Speaking Tutor"**

### Option 2: Direct URL
- Navigate to: `/ai-speaking`

---

## 📱 How to Use

### 1. Start a Call
- Click **"Start Call"** button
- Grant microphone permission when prompted
- UI will show: 🎤 **Listening** (green)

### 2. Speak
- Say something natural: *"Hello, I want to practice speaking"*
- You'll see **real-time transcript** as you speak
- The text will appear italicized as *interim* results

### 3. AI Responds
- After you finish speaking (pause detection):
  - UI shows: 🤔 **Thinking...**
  - Gemini analyzes your speech simultaneously
  - AI generates coaching response
  - Google TTS creates natural voice audio
  
- **Total time: ~2-3 seconds**

### 4. Listen & Learn
- UI shows: 🔊 **Speaking**
- Hear the AI tutor's voice
- See **pronunciation score** with feedback:
  - 📊 Score: 1-10
  - 🎯 Feedback: Specific improvement tips
  - ✅ Positive: What went well

### 5. Continue Conversation
- Audio stops, UI returns to: 🎤 **Listening**
- Speak again (no clicking needed!)
- Loop continues naturally

### 6. End Call
- Click **"End Call"** when done
- Resets to: ⚫ **Ready**

---

## 🎯 Example Conversation

```
Student: "Hello, I want to practice speaking"
  ↓
AI Tutora: "Great! Let's work on your pronunciation. 
            Try saying 'speaking' - stress the first syllable."
Pronunciation Score: 7/10
Feedback: "Clear pronunciation overall. Work on word stress."

Student: "Speaking"
  ↓
AI Tutora: "Perfect stress! Now try: 'I need to improve my intonation.'"
Pronunciation Score: 8/10
Feedback: "Nice rising intonation! Keep that natural rhythm."

Student: "I need to improve my intonation"
  ↓
[Conversation continues...]
```

---

## 🔧 Technical Details

### How It Works (Behind the Scenes)

```
You speak → Web Speech API captures audio (real-time)
          → Gemini 2.5 Flash processes in PARALLEL:
             • Generates coaching response (1-2 sentences)
             • Analyzes pronunciation (phonetic, intonation, stress, accent)
          → Google Cloud TTS creates natural voice
          → Audio plays while ready for next input
          → Automatic restart for continuous conversation
```

### What Makes It "Simultaneous"?

**NOT:** Upload audio → Wait 5s → Get feedback  
**YES:** Speaking → Instant coaching with pronunciation scores  

Key: **Parallel processing** of coaching + pronunciation analysis = no delay

---

## 🎤 Pronunciation Analysis Explained

### What It Analyzes:

| Aspect | What You Hear | Example |
|--------|--------------|---------|
| **Phonetic Accuracy** | Individual sound clarity | "education" vs "edushun" |
| **Intonation** | Rising/falling pitch patterns | Stress where voice rises/falls |
| **Word Stress** | Emphasis on syllables | SPEAK-ing vs speak-ING |
| **Sentence Stress** | Overall rhythm & flow | Natural English rhythm |
| **Accent** | Native-like pronunciation | American English patterns |

### Score Interpretation:

- **9-10:** Near-native clarity, natural rhythm ⭐
- **7-8:** Good pronunciation, minor improvements needed ✅
- **5-6:** Clear but noticeable non-native patterns ⚠️
- **3-4:** Difficult to understand, needs work ❌
- **1-2:** Very difficult to understand 🆘

---

## 🐛 Debug Mode

### Access Debug Logs:
- Scroll down on the call page
- See **"Debug Logs"** panel
- Shows real-time processing steps

### What Logs Show:
```
[21:28:42] ✅ Web Speech API available
[21:28:42] 🎤 Speech recognition started
[21:28:43] 🔊 Calling gemini-ielts-coach function...
[21:28:44] ✅ Coach response: "Great! Try emphasizing..."
[21:28:45] 📢 Processing student text...
[21:28:46] ⏹️ Audio finished, resuming listening
```

### Indicators:
- 🔌 **Web Speech API** = Primary mode (free, fast)
- ⚡ **Fallback Mode** = Using Google Cloud (if Web Speech fails)

---

## ❓ Troubleshooting

### Problem: "Can't hear AI voice"
**Check:**
1. Volume is on 🔊
2. Browser speaker not muted
3. Microphone permission was granted
4. Check debug logs for TTS errors

### Problem: "Speech recognition stops immediately"
**Auto-handled:**
- If silence detected → Auto-restarts after 500ms ✅
- If network error → Switches to Google Cloud ✅

### Problem: "See livePartial but nothing happens"
**Wait:**
- AI needs ~2 seconds to process
- See 🤔 **Thinking...** in UI
- TTS generates audio simultaneously

### Problem: "No pronunciation feedback showing"
**Check:**
1. Debug logs for errors
2. Ensure GEMINI_API_KEY is set
3. Refresh page and try again

---

## 💡 Tips for Best Results

✅ **DO:**
- Speak naturally at normal pace
- Take small pauses between sentences
- Listen carefully to feedback and apply it
- Try the same sentence multiple times to improve

❌ **DON'T:**
- Speak too quickly (hard to transcribe)
- Long silence (triggers restart)
- Ambient noise in background
- Hold microphone too close

---

## 📊 What Happens with Your Data

### Session Tracking:
- Your conversation is logged (transcript + pronunciation scores)
- Used to estimate costs and track your progress
- Stored in Supabase `voice_sessions` table

### Privacy:
- Only you can see your sessions
- Data deleted after [configurable period]
- No data shared with third parties

---

## 💰 Cost Tracker

**Per hour of practice:**
- Web Speech API: $0.00 (free)
- Gemini coaching: $0.05
- Google TTS: $0.30
- **Total: $0.35/hour**

**Monthly (100 hours):** ~$35

---

## 🎓 Getting the Most Out of It

### Beginner Strategy:
1. Start with simple sentences
2. Get feedback on basic pronunciation
3. Gradually increase complexity
4. Repeat problematic words

### Intermediate Strategy:
1. Practice responses to IELTS Speaking Part 1 questions
2. Focus on connected speech (linking words)
3. Work on natural intonation patterns
4. Build fluency by speaking longer

### Advanced Strategy:
1. Practice IELTS Part 2 (2-minute monologues)
2. Record sessions and compare scores over time
3. Target specific pronunciation weak spots
4. Practice under time pressure

---

## 📞 Support

### If Something's Wrong:
1. Check **Debug Logs** panel
2. Copy logs and include in error report
3. Try refreshing page
4. Check microphone permissions in browser settings

### Performance Tips:
- Use wired headphones for better mic quality
- Minimize background noise
- Use modern browser (Chrome/Edge/Firefox/Safari)
- Check internet connection speed

---

## ✨ That's It!

**You're ready to start practicing IELTS Speaking with AI coaching!**

### Quick Checklist:
- [ ] I can see the AI Speaking Tutor page
- [ ] Microphone works (permission granted)
- [ ] I can click "Start Call"
- [ ] I can see my text as I speak
- [ ] I hear the AI response
- [ ] I see pronunciation feedback

**Happy practicing! 🎤✨**

---

**Questions?** Refer to: `AI_SPEAKING_TUTOR_IMPLEMENTATION.md` for technical details
