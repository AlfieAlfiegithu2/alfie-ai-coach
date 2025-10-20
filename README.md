# 🎯 English AIdol - Learn English with AI

A comprehensive English learning platform with AI-powered feedback, adaptive learning, and now integrated with **Sentence Mastery** (Earthworm).

## 🌟 Features

- 📝 **AI-Powered Feedback** - Real-time analysis of English skills
- 🎯 **Adaptive Learning** - Smart algorithms that adjust to your pace
- 🗣️ **Pronunciation Training** - Get feedback on your pronunciation
- 📚 **Vocabulary Builder** - Expand your English vocabulary
- 🔊 **Listening Practice** - Improve listening comprehension
- 📖 **Reading Exercises** - Read real IELTS passages
- ✍️ **Writing Feedback** - Get detailed essay feedback
- 🆕 **Sentence Mastery** - Master English sentence construction
- 🌍 **23 Languages Supported** - Learn in your native language

## 🏗️ Architecture

This is a **monorepo** containing two applications:

```
alfie-ai-coach-1/
├── apps/
│   ├── main/              # Main React + Supabase app
│   └── earthworm/         # Sentence Mastery (Vue 3 + Nuxt)
├── package.json           # Root scripts
└── ecosystem.config.js    # PM2 production config
```

## 🚀 Quick Start

### Development

```bash
# Install dependencies
pnpm install

# Start both apps in development
pnpm run dev

# Or start individually:
pnpm run dev:main        # Main app on localhost:5173
pnpm run dev:earthworm   # Sentence Mastery on localhost:3000
```

### Production

```bash
# Build both applications
pnpm run build:all

# Test production build
pnpm run preview         # Main app
pnpm run preview:earthworm  # Sentence Mastery

# Deploy to production
# See DEPLOY-WITH-LOVABLE.md for detailed instructions
```

## 📋 Project Structure

```
apps/main/
├── src/
│   ├── pages/
│   │   ├── HeroIndex.tsx       # Landing page
│   │   ├── IELTSPortal.tsx      # Main dashboard with "Sharpening Your Skills"
│   │   ├── SentenceMastery.tsx  # Sentence Mastery integration page
│   │   └── ...
│   ├── components/
│   ├── hooks/
│   │   └── useSentenceMasteryAuth.ts  # Auth bridge for Sentence Mastery
│   └── App.tsx
├── vite.config.ts          # Configured for dev & production
└── dist/                   # Production build

apps/earthworm/
├── apps/
│   └── client/            # Vue 3 + Nuxt frontend
├── server/                # Backend services
└── ...
```

## 🔗 Integration Points

### Sentence Mastery Access

Users can access Sentence Mastery from two places:

1. **Header Navigation** - Direct link in the top navigation
2. **Sharpening Your Skills** - As a learning skill in the dashboard

The `useSentenceMasteryAuth` hook handles authentication and navigation.

### Routing

- **Development**: `/earthworm` proxies to `localhost:3000` (Vite proxy)
- **Production**: `/sentence-mastery` serves the built Earthworm app

## 🌐 Deployment

### For Lovable Users

1. **See `DEPLOY-WITH-LOVABLE.md`** for complete step-by-step instructions
2. Quick build: `pnpm run build:all`
3. Choose deployment method (Vercel, Netlify, VPS)

### For VPS/Dedicated Server

```bash
# 1. Build
pnpm run deploy:production

# 2. Use PM2
pm2 start ecosystem.config.js

# 3. Configure Nginx (see DEPLOY-WITH-LOVABLE.md)
```

### For Docker

```bash
docker compose up -d
```

## 📚 Documentation

- **[DEPLOY-WITH-LOVABLE.md](./DEPLOY-WITH-LOVABLE.md)** - Production deployment guide
- **[PRODUCTION-DEPLOYMENT.md](./PRODUCTION-DEPLOYMENT.md)** - Detailed deployment strategies
- **[EARTHWORM-SETUP-GUIDE.md](./EARTHWORM-SETUP-GUIDE.md)** - Local development setup
- **[SENTENCE-MASTERY-REBRAND.md](./SENTENCE-MASTERY-REBRAND.md)** - Integration details

## 🛠️ Tech Stack

### Main App
- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **Build**: Vite
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **i18n**: react-i18next (23 languages)

### Sentence Mastery
- **Frontend**: Vue 3 + Nuxt 3
- **Styling**: Tailwind CSS + DaisyUI
- **Build**: Nitro
- **Database**: PostgreSQL
- **Cache**: Redis

## 🔐 Authentication

- Main app: Supabase Auth
- Sentence Mastery: JWT via Supabase session
- Cross-app auth via `useSentenceMasteryAuth` hook

## 🌍 Internationalization

- **23 supported languages**
- Translations in `/public/locales/`
- Automatic language detection
- Easy to add new languages

## 📊 Scoring System

- **AI-Calibrated to IELTS standards**
- **98% correlation with real exams**
- Instant feedback on essays
- Detailed breakdown of weaknesses

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test locally: `pnpm run dev`
4. Build: `pnpm run build:all`
5. Push and create a PR

## 📝 License

MIT License - See LICENSE file

## 🆘 Support

- **Issues**: GitHub Issues
- **Questions**: See documentation files
- **Production Help**: See DEPLOY-WITH-LOVABLE.md

---

**Built with ❤️ by the English AIdol Team**

Last Updated: October 20, 2025
