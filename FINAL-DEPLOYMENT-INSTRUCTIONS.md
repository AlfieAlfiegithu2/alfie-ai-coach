# 🚀 FINAL DEPLOYMENT INSTRUCTIONS

**Your App Will Be Live in 15 Minutes!**

---

## ✅ WHAT'S READY

- ✅ Earthworm configured with Supabase
- ✅ Docker images ready to build
- ✅ AWS EC2 running at: **16.170.247.201**
- ✅ Docker Hub configured: **ryanbigbang15**

---

## 🎯 DEPLOYMENT STEPS (COPY & PASTE)

### Step 1: Make Key Pair Readable
```bash
chmod 400 ~/Downloads/english-aidol-key.pem
```

### Step 2: SSH into AWS Server
```bash
ssh -i ~/Downloads/english-aidol-key.pem ubuntu@16.170.247.201
```

**You should see a prompt like:** `ubuntu@ip-172-31-xx-xx:~$`

### Step 3: Install Docker on Server
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu
newgrp docker
```

### Step 4: Create docker-compose.prod.yml
Copy and paste this into the terminal:

```bash
cat > docker-compose.prod.yml << 'COMPOSE'
version: "3.8"

services:
  main:
    image: ryanbigbang15/english-aidol:main.v1.0.0
    ports:
      - "80:80"
    networks:
      - english-aidol-network
    restart: always

  earthworm-api:
    image: ryanbigbang15/english-aidol:earthworm.v1.0.0
    ports:
      - "3001:3001"
    environment:
      - SUPABASE_URL=https://cuumxmfzhwljylbdlflj.supabase.co
      - SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI
      - ENABLE_SUPABASE_AUTH=true
    networks:
      - english-aidol-network
    restart: always

networks:
  english-aidol-network:
    driver: bridge
COMPOSE
```

### Step 5: Pull and Start Containers
```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

### Step 6: Verify Running
```bash
docker compose -f docker-compose.prod.yml ps
```

Should show both containers as "running"

---

## 🌐 ACCESS YOUR APP

Once running:

- **Main App**: http://16.170.247.201
- **Earthworm**: http://16.170.247.201/earthworm
- **API Health**: http://16.170.247.201:3001/swagger

---

## 🔧 TROUBLESHOOTING

If you get permission errors:
```bash
sudo docker compose -f docker-compose.prod.yml ps
```

To check logs:
```bash
docker compose -f docker-compose.prod.yml logs -f
```

---

## ✨ THAT'S IT!

Your Earthworm integration is now LIVE! 🎉

Users can:
- ✅ Login with Supabase auth
- ✅ Access main app
- ✅ Click "Sentence Mastery" → go to Earthworm
- ✅ Practice sentence building with SSO

---

**Timeline**: 15 minutes from now your app is production-ready!

**Questions?** Check Docker logs or SSH back into server anytime.
