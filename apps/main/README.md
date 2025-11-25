# 🎓 Alfie AI Coach - IELTS & Language Learning Platform

[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-2.0-green.svg)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.3-blue.svg)](https://tailwindcss.com/)

A comprehensive AI-powered language learning platform with IELTS preparation, vocabulary building, and multi-language support for 22 languages.

## ✨ Features

### 🎯 Core Learning Features
- **📚 Vocabulary Builder** - 8,000+ words with 22-language translations
- **📖 IELTS Reading** - Practice tests with AI explanations
- **✍️ IELTS Writing** - AI-powered feedback and suggestions
- **🗣️ IELTS Speaking** - Pronunciation analysis and practice
- **📝 Grammar Exercises** - Interactive grammar learning
- **🎧 Listening Practice** - Audio-based comprehension exercises

### 🌍 Multi-Language Support
- **22 Languages** - Arabic, Bengali, German, English, Spanish, Persian, French, Hindi, Indonesian, Japanese, Kazakh, Korean, Malay, Nepali, Portuguese, Russian, Tamil, Thai, Turkish, Urdu, Vietnamese, Yue (Cantonese), Chinese
- **AI-Powered Translations** - Automatic translation generation using DeepSeek API
- **Cultural Context** - Localized content and examples

### 🤖 AI Features
- **Smart Vocabulary Generation** - AI creates contextual examples and sentences
- **Pronunciation Analysis** - Real-time feedback on speaking
- **Writing Assessment** - IELTS-style grading and suggestions
- **Personalized Learning** - Adaptive difficulty and recommendations

### 📊 Progress Tracking
- **Study Analytics** - Detailed progress reports
- **Achievement System** - Gamified learning experience
- **Study Plans** - Personalized learning schedules
- **Performance Insights** - Weak area identification

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern React with hooks and concurrent features
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **Shadcn/UI** - Beautiful, accessible component library
- **React Router** - Client-side routing

### Backend
- **Supabase** - PostgreSQL database with real-time subscriptions
- **Supabase Edge Functions** - Serverless functions for AI processing
- **Row Level Security (RLS)** - Database-level security
- **Authentication** - Built-in auth with social providers

### AI & External Services
- **DeepSeek API** - Primary AI for translations and content generation
- **ElevenLabs** - Text-to-speech for pronunciation practice
- **OpenAI** - Alternative AI services
- **Stripe** - Payment processing for premium features

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn or pnpm
- Git

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd alfie-ai-coach
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. **Start development server**
```bash
npm run dev
```

5. **Open your browser**
Navigate to `http://localhost:3000`

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
├── hooks/              # Custom React hooks
├── lib/                # Utility functions and configurations
├── pages/              # Page components and routes
└── integrations/       # External service integrations

supabase/
├── functions/          # Edge Functions for AI processing
├── migrations/         # Database schema migrations
└── config.toml        # Supabase project configuration

public/
└── locales/           # Translation files for 22 languages
```

## 🔧 Development

### Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run preview         # Preview production build

# Code Quality
npm run lint            # Run ESLint
npm run type-check      # Run TypeScript checks

# Database
npm run db:reset        # Reset local database
npm run db:migrate      # Run migrations
npm run db:seed         # Seed database

# Deployment
npm run deploy:supabase # Deploy Supabase functions
```

### Key Development Features

- **Hot Module Replacement** - Instant updates during development
- **TypeScript** - Full type safety across the application
- **ESLint** - Code quality and consistency
- **Prettier** - Automatic code formatting
- **Environment Variables** - Secure configuration management

## 🌐 Internationalization

The app supports 22 languages with full translation coverage:

- **Arabic (ar)**, **Bengali (bn)**, **German (de)**
- **English (en)**, **Spanish (es)**, **Persian (fa)**
- **French (fr)**, **Hindi (hi)**, **Indonesian (id)**
- **Japanese (ja)**, **Kazakh (kk)**, **Korean (ko)**
- **Malay (ms)**, **Nepali (ne)**, **Portuguese (pt)**
- **Russian (ru)**, **Tamil (ta)**, **Thai (th)**
- **Turkish (tr)**, **Urdu (ur)**, **Vietnamese (vi)**
- **Yue/Cantonese (yue)**, **Chinese (zh)**

## 🚀 Deployment

### Frontend Deployment

**Recommended: Vercel**
```bash
npm install -g vercel
vercel --prod
```

**Alternative: Netlify**
```bash
npm run build
# Deploy the dist/ folder to Netlify
```

### Backend (Supabase)

The Supabase backend is automatically deployed when you push to your repository:

1. **Connect GitHub** → Go to Supabase Dashboard → Project Settings → GitHub Integration
2. **Auto-deploy** → Functions deploy automatically on git push
3. **Environment Variables** → Set in Supabase Dashboard → Settings → Environment Variables

## 📚 Database Schema

### Core Tables
- `vocab_cards` - Vocabulary words with levels and metadata
- `vocab_translations` - Translations for all 22 languages
- `vocab_decks` - Organized vocabulary collections
- `user_progress` - Learning progress tracking
- `ielts_tests` - IELTS practice tests and results

### AI-Related Tables
- `vocab_translation_queue` - Pending translation jobs
- `audio_cache` - Cached pronunciation audio
- `writing_feedback` - AI writing analysis results

## 🔒 Security

- **Row Level Security (RLS)** - Database-level access control
- **JWT Authentication** - Secure user sessions
- **Environment Variables** - Sensitive data protection
- **CORS Configuration** - Proper cross-origin policies

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Supabase** - Amazing backend-as-a-service platform
- **DeepSeek AI** - Powerful language model for translations
- **React Community** - Excellent ecosystem and tools
- **Open Source Contributors** - Thank you for making great tools!

## 📞 Support

For support, email support@alfie-ai-coach.com or join our Discord community.

---

**Built with ❤️ for language learners worldwide** 🌍📚
