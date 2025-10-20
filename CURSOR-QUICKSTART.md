# 🚀 Cursor Quick Start Guide

## For Cursor Users - Start Your Dev Servers in 5 Minutes!

---

## 📋 Prerequisites
✅ You have Cursor open with the project  
✅ You're in the main project directory: `/Users/alfie/this is real ai/alfie-ai-coach-1`

---

## ⚡ THE EASIEST WAY - Option 1 (Recommended)

### Step 1️⃣: Open Terminal in Cursor
```
Press: Ctrl + ` (backtick)
OR: View → Terminal
```
You'll see a terminal panel at the bottom of Cursor.

### Step 2️⃣: Verify You're in the Right Directory
```bash
pwd
```
Should output: `/Users/alfie/this is real ai/alfie-ai-coach-1`

If not, type:
```bash
cd /Users/alfie/this\ is\ real\ ai/alfie-ai-coach-1
```

### Step 3️⃣: Run the Magic Command
```bash
./START-DEV-SERVERS.sh
```

**That's it!** The script will:
- 🧹 Clean up old processes
- 📦 Install dependencies
- 🚀 Start both servers
- 🌐 Show you the URLs

### Step 4️⃣: Wait ~10 seconds
You'll see this in the terminal:
```
✅ All servers are running!
Main App: http://localhost:5173
Earthworm: http://localhost:3000
```

### Step 5️⃣: Open Your Browser
Open a new tab and visit:
```
http://localhost:5173
```

✅ You should see your app load (NO white screen!)

---

## 🎯 Test Sentence Mastery
1. Click "IELTS Portal" or dashboard
2. Look for "Sharpening Your Skills" section
3. Click on "Sentence Mastery"
4. Earthworm should load! 🎉

---

## 🆘 Common Issues

### Issue: "White screen still showing"
```bash
# Hard refresh your browser
Mac:     Cmd + Shift + R
Windows: Ctrl + Shift + F5
```

### Issue: "Port already in use"
```bash
# Kill old processes
killall -9 vite nuxt node

# Then restart
./START-DEV-SERVERS.sh
```

### Issue: "Command not found"
```bash
# Make sure file is executable
chmod +x START-DEV-SERVERS.sh

# Try again
./START-DEV-SERVERS.sh
```

### Issue: Check logs for errors
```bash
tail -f /tmp/vite.log           # Main app logs
tail -f /tmp/earthworm.log      # Earthworm logs
```

---

## 🛑 To Stop Servers
In the Cursor terminal where servers are running:
```bash
Press: Ctrl + C
```

---

## 💾 Making Code Changes

### ✨ Auto-Reload Magic
When you edit files in Cursor:
1. Save the file (Ctrl + S)
2. The browser automatically reloads! 🔄
3. No need to restart servers

### Where to Edit
- **Main App**: `apps/main/src/` files
- **Sentence Mastery**: `apps/earthworm/apps/client/` files

---

## 🔗 Important URLs

| App | URL | Purpose |
|-----|-----|---------|
| Main App | http://localhost:5173 | English AIdol website |
| Earthworm | http://localhost:3000 | Sentence Mastery (direct) |
| Proxy | http://localhost:5173/earthworm | Sentence Mastery via main app |

---

## 📚 Next Steps

1. ✅ Run: `./START-DEV-SERVERS.sh`
2. ✅ Visit: http://localhost:5173
3. ✅ Test Sentence Mastery feature
4. ✅ Make changes in Cursor (auto-reloads!)
5. ✅ Commit to GitHub when done

---

## 🎓 Key Points to Remember

| ✅ DO | ❌ DON'T |
|------|----------|
| Run from PROJECT ROOT | Run from `apps/main` directory |
| Use `./START-DEV-SERVERS.sh` | Manual terminal commands |
| Keep terminal running | Close terminal while developing |
| Edit in Cursor | Edit files in terminal |
| Hard refresh on white screen | Reload normally |

---

## 🆘 Still Having Issues?

Check these files for more help:
- `MONOREPO-SETUP.md` - Complete setup guide
- `DEPLOY-WITH-LOVABLE.md` - Deployment info
- Terminal output - Usually shows exactly what's wrong

---

**You're all set! 🚀 Run `./START-DEV-SERVERS.sh` and start building!**
