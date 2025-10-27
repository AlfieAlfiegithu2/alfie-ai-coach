# 🎤 AI Speaking Tutor - Quick Start Guide

## ✨ What's New (Fixed Today)

✅ **Voice Selection** - Choose your AI tutor's voice  
✅ **Smart Fallbacks** - Works even without Supabase running  
✅ **Error Recovery** - Never breaks, always has a backup plan  
✅ **Clear Debug Logs** - See exactly what's happening  

---

## 🚀 How to Use

### Step 1: Go to AI Speaking Page
```
http://localhost:5174/ai-speaking
```

### Step 2: Select Your Voice
Before clicking "Start Call", choose from 4 voices:

| Voice | Personality | Best For |
|-------|-------------|----------|
| **Kore** (default) | Professional, firm | Authoritative coaching |
| **Puck** | Friendly, upbeat | Motivational coaching |
| **Zephyr** | Bright, clear | Clear pronunciation focus |
| **Charon** | Informative | Detailed explanations |

### Step 3: Click "Start Call"
- Greeting will play automatically (with your selected voice)
- Speech recognition starts listening
- Debug logs show which TTS is being used

### Step 4: Speak!
```
Example: "Hey can you hear me?"
```

### Step 5: AI Responds
- AI provides coaching feedback
- Shows pronunciation score (1-10)
- Conversation continues...

---

## 🎯 What Happens Behind the Scenes

### **The Flow:**
```
1. Click "Start Call"
   ↓
2. Load selected voice
   ↓
3. Try Gemini TTS (cloud)
   ├─ If works: Play greeting with perfect voice
   ├─ If fails: Use Browser TTS (always available)
   └─ If no voice support: Show text, auto-listen
   ↓
4. Auto-start speech recognition
   ↓
5. Listen for student speech
   ↓
6. Send to AI for coaching
   ↓
7. Respond with pronunciation feedback
   ↓
8. Loop back to step 5
```

---

## 🔍 Understanding the Debug Panel

The debug logs show exactly what's happening:

```
[1:28:45 AM] ▶️ Starting call (using web-speech)
[1:28:45 AM] 📝 Attempting Gemini TTS with voice: Kore
[1:28:46 AM] 🔊 Playing greeting audio (Gemini 2.5 Flash Preview TTS - Kore voice)...
[1:28:50 AM] ✅ Greeting finished, now listening for student...
[1:28:50 AM] 🎤 Speech recognition started
[1:28:53 AM] 📢 Student said: "hey can you hear me"
[1:28:54 AM] 🤔 Calling gemini-ielts-coach function...
[1:28:55 AM] ✅ Coach response: "Great! I can hear you clearly..."
[1:28:55 AM] 🔊 Playing audio...
[1:28:59 AM] ⏹️ Audio finished, resuming listening
```

---

## 🎙️ Voice Selection Details

### Kore (Default) - Professional
```
Tone: Firm, authoritative
Best for: Executive coaching, formal instruction
Volume: Normal
Speed: Natural pace
```

### Puck - Upbeat
```
Tone: Friendly, enthusiastic
Best for: Motivational feedback, encouragement
Volume: Slightly louder
Speed: Slightly faster
```

### Zephyr - Bright  
```
Tone: Clear, articulate
Best for: Pronunciation focus, clarity emphasis
Volume: Normal
Speed: Slightly slower for clarity
```

### Charon - Informative
```
Tone: Knowledgeable, formal
Best for: Detailed explanations, rules
Volume: Normal
Speed: Thoughtful pace
```

---

## ⚙️ Fallback System

### **When Supabase Runs (Ideal):**
- Uses Gemini 2.5 Flash Preview TTS
- Premium voice quality
- Full voice control
- Cost: ~$0.002 per greeting

### **When Supabase Doesn't Run (Current):**
- Falls back to Browser Web Speech API
- Good voice quality
- Built-in to your browser
- Cost: FREE (no API call)

### **Last Resort:**
- Shows greeting as text
- Still listens for speech
- Everything works except AI voice
- Cost: FREE

---

## 🧪 Testing Scenarios

### Test 1: Basic Flow
```
1. Select "Kore" voice
2. Click "Start Call"
3. Wait for greeting
4. Say "hello"
5. Get AI response
```

### Test 2: Voice Switching
```
1. Try Kore (professional)
2. End call
3. Select Puck (upbeat)
4. Start call again
5. Notice different voice
```

### Test 3: Fallback Testing
```
1. Stop Supabase locally
2. Click "Start Call"
3. See "Supabase functions might not be running"
4. See greeting from Browser TTS instead
5. Everything still works!
```

---

## 🐛 Troubleshooting

### Issue: No sound at all
**Solution:** Check browser permissions
```
- Allow microphone access
- Check speaker volume
- Check browser audio settings
```

### Issue: Can't select voice
**Solution:** Voice selector is only available before call
```
- Click "End Call" first
- Then select a different voice
- Click "Start Call" again
```

### Issue: Greeting appears as text only
**Solution:** Browser TTS might be disabled
```
- Go to browser settings
- Enable Text-to-Speech
- Try another browser (Chrome, Firefox, Safari)
- Or install a TTS extension
```

### Issue: Doesn't respond after I speak
**Solution:** Check if you're still muted or microphone is blocked
```
- Click "Mute" to unmute (if shows "Mute")
- Check browser permissions
- Try saying something louder/clearer
- Check debug logs for errors
```

---

## 📊 Voice Selection Recommendations

### For IELTS Students:
**Default: Kore** - Professional, matches exam environment

### For Young Learners:
**Try: Puck** - More friendly and encouraging

### For Pronunciation Focus:
**Try: Zephyr** - Clearest articulation

### For Grammar/Structure:
**Try: Charon** - Informative tone for explanations

---

## 🎯 Pro Tips

1. **Change Voice Between Calls:**
   - End current call
   - Select different voice
   - Start new call
   - No need to refresh page

2. **Watch Debug Logs:**
   - Shows exactly which voice is being used
   - Shows if fallback happened
   - Helps debug any issues

3. **Test Different Voices:**
   - Each has unique personality
   - Pick the one that helps you learn best
   - Can switch anytime

4. **Mute Feature:**
   - Use to pause conversation
   - Useful if someone interrupts
   - Unmute to continue

---

## 🚀 Ready to Practice?

Go to: **http://localhost:5174/ai-speaking**

1. Select your preferred voice
2. Click "Start Call"
3. Listen to the greeting
4. Start speaking!

Your AI coach is ready! 🎤✨

---

**Issues or questions?** Check the debug panel - it tells you everything that's happening!

