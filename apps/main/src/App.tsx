import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { I18nextProvider } from 'react-i18next';
import { HelmetProvider } from 'react-helmet-async';
// Vercel Analytics – guarded to avoid localhost ping spam without an ID
// @ts-ignore - Types might be missing for this package
import { Analytics } from "@vercel/analytics/react";
import i18n from './lib/i18n';
import { Suspense, lazy, useEffect } from 'react';
import { ThemeProvider as DashboardThemeProvider } from '@/contexts/ThemeContext';
// Import supabase client dynamically to avoid bundling conflicts
const MinimalisticChatbot = lazy(() => import("./components/MinimalisticChatbot"));
const GlobalTextSelection = lazy(() => import("./components/GlobalTextSelection"));
// LanguageWelcomeBanner removed - language is now auto-detected without confirmation
import ComingSoonModal from "./components/ComingSoonModal";
import Index from "./pages/Index";
import HeroIndex from "./pages/HeroIndex";


import UnknownSession from "./pages/UnknownSession";
import ContentSelection from "./pages/ContentSelection";
import AdminLogin from "./pages/AdminLogin";

// Helper to retry lazy imports on chunk load failure (handles deployment updates)
const lazyWithRetry = (importFn: () => Promise<any>) => {
  return lazy(async () => {
    try {
      return await importFn();
    } catch (error: any) {
      // Check if the error is related to chunk loading failure (404 on old hash)
      const isChunkError = error.message?.includes("Failed to fetch dynamically imported module") ||
        error.message?.includes("Importing a module script failed");

      if (isChunkError) {
        // Only refresh once per session to avoid loops
        if (!sessionStorage.getItem('chunk-load-refreshed')) {
          console.log("Chunk load failed, reloading page to get new chunks...");
          sessionStorage.setItem('chunk-load-refreshed', 'true');
          window.location.reload();
          // Return non-resolving promise to suspend indefinitely while reloading
          return new Promise(() => { });
        }
      }
      throw error;
    }
  });
};

// Lazily loaded heavy/admin/test pages to reduce initial bundle size & TBT
const AdminDashboard = lazyWithRetry(() => import("./pages/AdminDashboard"));
const AdminReading = lazyWithRetry(() => import("./pages/AdminReading"));
const AdminListening = lazyWithRetry(() => import("./pages/AdminListening"));
const AdminWriting = lazyWithRetry(() => import("./pages/AdminWriting"));
const AdminSpeaking = lazyWithRetry(() => import("./pages/AdminSpeaking"));
const AdminIELTS = lazyWithRetry(() => import("./pages/AdminIELTS"));
const AdminPTE = lazyWithRetry(() => import("./pages/AdminPTE"));
const AdminTOEFL = lazyWithRetry(() => import("./pages/AdminTOEFL"));
const AdminTOEIC = lazyWithRetry(() => import("./pages/AdminTOEIC"));
const AdminTOEICListening = lazyWithRetry(() => import("./pages/AdminTOEICListening"));
const AdminTOEICReading = lazyWithRetry(() => import("./pages/AdminTOEICReading"));
const TOEICListeningTest = lazyWithRetry(() => import("./pages/TOEICListeningTest"));
const TOEICReadingTest = lazyWithRetry(() => import("./pages/TOEICReadingTest"));
const TOEICReadingResult = lazyWithRetry(() => import("./pages/TOEICReadingResult"));
const TOEICPortal = lazyWithRetry(() => import("./pages/TOEICPortal"));
// PTE Admin Pages
const AdminPTESpeakingWriting = lazyWithRetry(() => import("./pages/AdminPTESpeakingWriting"));
const AdminPTEReading = lazyWithRetry(() => import("./pages/AdminPTEReading"));
const AdminPTEListening = lazyWithRetry(() => import("./pages/AdminPTEListening"));
// PTE Student Pages
const PTESpeakingWritingTest = lazyWithRetry(() => import("./pages/PTESpeakingWritingTest"));
const PTEReadingTest = lazyWithRetry(() => import("./pages/PTEReadingTest"));
const PTEListeningTest = lazyWithRetry(() => import("./pages/PTEListeningTest"));
const AdminGeneral = lazyWithRetry(() => import("./pages/AdminGeneral"));
// Lazy load student pages to improve initial load performance
const PersonalPage = lazyWithRetry(() => import("./pages/PersonalPage"));
const Dashboard = lazyWithRetry(() => import("./pages/Dashboard"));
const TestSelection = lazyWithRetry(() => import("./pages/TestSelection"));
const Auth = lazyWithRetry(() => import("./pages/Auth"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const CommunityPage = lazyWithRetry(() => import("./pages/CommunityPage"));
const SettingsPage = lazyWithRetry(() => import("./pages/SettingsPage"));
const PTEPortal = lazyWithRetry(() => import("./pages/PTEPortal"));
const TOEFLPortal = lazyWithRetry(() => import("./pages/TOEFLPortal"));
const GeneralPortal = lazyWithRetry(() => import("./pages/GeneralPortal"));
const EnhancedGeneralPortal = lazyWithRetry(() => import("./pages/EnhancedGeneralPortal"));
const IELTSPortal = lazyWithRetry(() => import("./pages/IELTSPortal"));
const ExamSelectionPortal = lazyWithRetry(() => import("./pages/ExamSelectionPortal"));
const IELTSSkillHub = lazyWithRetry(() => import("./pages/IELTSSkillHub"));
const IELTSSkillTests = lazyWithRetry(() => import("./pages/IELTSSkillTests"));
const AdminIELTSSkillManagement = lazyWithRetry(() => import("./pages/AdminIELTSSkillManagement"));
const IELTSTestModules = lazyWithRetry(() => import("./pages/IELTSTestModules"));
const QwenTTSTest = lazyWithRetry(() => import("./pages/QwenTTSTest"));
const AdminTestManagement = lazyWithRetry(() => import("./pages/AdminTestManagement"));
const AdminTestDetails = lazyWithRetry(() => import("./pages/AdminTestDetails"));
const AdminSectionManagement = lazyWithRetry(() => import("./pages/AdminSectionManagement"));
const AdminReadingManagement = lazyWithRetry(() => import("./pages/AdminReadingManagement"));
const AdminIELTSReadingDashboard = lazyWithRetry(() => import("./pages/AdminIELTSReadingDashboard"));
const AdminIELTSListening = lazyWithRetry(() => import("./pages/AdminIELTSListening"));
const AdminIELTSWriting = lazyWithRetry(() => import("./pages/AdminIELTSWriting"));
const AdminIELTSWritingTest = lazyWithRetry(() => import("./pages/AdminIELTSWritingTest"));
const AdminIELTSReadingTest = lazyWithRetry(() => import("./pages/AdminIELTSReadingTest"));
const AdminIELTSSpeaking = lazyWithRetry(() => import("./pages/AdminIELTSSpeaking"));
const IELTSWritingTest = lazyWithRetry(() => import("./pages/IELTSWritingTest"));
const IELTSWritingProResults = lazyWithRetry(() => import("./pages/IELTSWritingProResults"));
const IELTSWritingResults = lazyWithRetry(() => import("./pages/IELTSWritingResults"));
const ReadingResults = lazyWithRetry(() => import("./pages/ReadingResults"));
const ListeningResults = lazyWithRetry(() => import("./pages/ListeningResults"));
const IELTSSpeakingResults = lazyWithRetry(() => import("./pages/IELTSSpeakingResults"));
const IELTSSpeakingTest = lazyWithRetry(() => import("./pages/IELTSSpeakingTest"));
const ReadingTest = lazyWithRetry(() => import("./pages/ReadingTest"));
const Reading = lazyWithRetry(() => import("./pages/Reading"));
const Listening = lazyWithRetry(() => import("./pages/Listening"));
const ListeningTest = lazyWithRetry(() => import("./pages/ListeningTest"));
const Writing = lazyWithRetry(() => import("./pages/Writing"));
const WritingTest = lazyWithRetry(() => import("./pages/WritingTest"));
const Speaking = lazyWithRetry(() => import("./pages/Speaking"));
const EnhancedReadingTest = lazyWithRetry(() => import("./pages/EnhancedReadingTest"));
const Pricing = lazyWithRetry(() => import("./pages/Pricing"));
const AdminSkillsPractice = lazyWithRetry(() => import("./pages/AdminSkillsPractice"));
const AdminSkillManager = lazyWithRetry(() => import("./pages/AdminSkillManager"));
const SkillPractice = lazyWithRetry(() => import("./pages/SkillPractice"));
const AISpeakingCall = lazyWithRetry(() => import("./pages/AISpeakingCall"));
const AISpeakingTutor = lazyWithRetry(() => import("./pages/AISpeakingTutor"));

// Admin / heavy tools (lazy)
const AdminVocabularyTests = lazyWithRetry(() => import("./pages/AdminVocabularyTests"));
const AdminVocabBook = lazyWithRetry(() => import("./pages/AdminVocabBook"));
const AdminVocabManager = lazyWithRetry(() => import("./pages/AdminVocabManager"));
const AdminVocabularyTestDetail = lazyWithRetry(() => import("./pages/AdminVocabularyTestDetail"));
const AdminGrammarTests = lazyWithRetry(() => import("./pages/AdminGrammarTests"));
const AdminGrammarTestDetail = lazyWithRetry(() => import("./pages/AdminGrammarTestDetail"));
const AdminParaphrasingTests = lazyWithRetry(() => import("./pages/AdminParaphrasingTests"));
const AdminParaphrasingTestDetail = lazyWithRetry(() => import("./pages/AdminParaphrasingTestDetail"));
const AdminPronunciationTests = lazyWithRetry(() => import("./pages/AdminPronunciationTests"));
const AdminPronunciationTestDetail = lazyWithRetry(() => import("./pages/AdminPronunciationTestDetail"));
const AdminSentenceScrambleTests = lazyWithRetry(() => import("./pages/AdminSentenceScrambleTests"));
const AdminSentenceScrambleTestDetail = lazyWithRetry(() => import("./pages/AdminSentenceScrambleTestDetail"));
const AdminListeningForDetailsTests = lazyWithRetry(() => import("./pages/AdminListeningForDetailsTests"));
const AdminListeningForDetailsTestDetail = lazyWithRetry(() => import("./pages/AdminListeningForDetailsTestDetail"));

// Student quizzes (lazy loaded for performance)
const VocabularyQuiz = lazyWithRetry(() => import("./pages/VocabularyQuiz"));
const GrammarQuiz = lazyWithRetry(() => import("./pages/GrammarQuiz"));
const ParaphraseQuiz = lazyWithRetry(() => import("./pages/ParaphraseQuiz"));
const SentenceScrambleQuiz = lazyWithRetry(() => import("./pages/SentenceScrambleQuiz"));
const ListeningQuiz = lazyWithRetry(() => import("./pages/ListeningQuiz"));
const SynonymMatchQuiz = lazyWithRetry(() => import("./pages/SynonymMatchQuiz"));
const VocabularyMap = lazyWithRetry(() => import("./pages/VocabularyMap"));
const VocabularyBook = lazyWithRetry(() => import("./pages/VocabularyBook"));
const VocabHome = lazyWithRetry(() => import("./pages/VocabHome"));
const VocabDeck = lazyWithRetry(() => import("./pages/VocabDeck"));
const VocabReview = lazyWithRetry(() => import("./pages/VocabReview"));
const VocabLevels = lazyWithRetry(() => import("./pages/VocabLevels"));
const VocabTest = lazyWithRetry(() => import("./pages/VocabTest"));
const Signup = lazyWithRetry(() => import("./pages/Signup"));
const AuthCallback = lazyWithRetry(() => import("./pages/AuthCallback"));
const VocabularyMapView = lazyWithRetry(() => import("./components/VocabularyMapView"));
const WritingHistory = lazyWithRetry(() => import("./pages/WritingHistory"));
const WritingResultsDetail = lazyWithRetry(() => import("./pages/WritingResultsDetail"));
const Pay = lazyWithRetry(() => import("./pages/Pay"));
const ResetPassword = lazyWithRetry(() => import("./pages/ResetPassword"));
const MyWordBook = lazyWithRetry(() => import("./pages/MyWordBook"));
const AdminAnalytics = lazyWithRetry(() => import("./pages/AdminAnalytics"));
const OnboardingAssessment = lazyWithRetry(() => import("./pages/OnboardingAssessment"));
const PlanPage = lazyWithRetry(() => import("./pages/Plan"));
const BlogListing = lazyWithRetry(() => import("./pages/BlogListing"));
const BlogDetail = lazyWithRetry(() => import("./pages/BlogDetail"));
const AdminBlogManagement = lazyWithRetry(() => import("./pages/AdminBlogManagement"));
const AdminBookCreation = lazyWithRetry(() => import("./pages/AdminBookCreation"));
const AdminTemplates = lazyWithRetry(() => import("./pages/AdminTemplates"));
// Affiliate Management
const AdminAffiliates = lazyWithRetry(() => import("./pages/AdminAffiliates"));
const AdminAffiliateDetail = lazyWithRetry(() => import("./pages/AdminAffiliateDetail"));
// Grammar Learning Center
const GrammarPortal = lazyWithRetry(() => import("./pages/GrammarPortal"));
const GrammarLesson = lazyWithRetry(() => import("./pages/GrammarLesson"));
const AdminGrammarDashboard = lazyWithRetry(() => import("./pages/AdminGrammarDashboard"));
const AdminGrammarLessonEditor = lazyWithRetry(() => import("./pages/AdminGrammarLessonEditor"));
// Business English Module
const BusinessPortal = lazyWithRetry(() => import("./pages/BusinessPortal"));
const ResumeBuilder = lazyWithRetry(() => import("./pages/ResumeBuilder"));
const EmailPractice = lazyWithRetry(() => import("./pages/EmailPractice"));
const InterviewPractice = lazyWithRetry(() => import("./pages/InterviewPractice"));
// NCLEX Module
const NCLEXPortal = lazyWithRetry(() => import("./pages/NCLEXPortal"));
const NCLEXTest = lazyWithRetry(() => import("./pages/NCLEXTest"));
const AdminNCLEX = lazyWithRetry(() => import("./pages/AdminNCLEX"));
const AdminNCLEXTestDetail = lazyWithRetry(() => import("./pages/AdminNCLEXTestDetail"));
const BooksLibrary = lazyWithRetry(() => import("./pages/BooksLibrary"));
const BookReader = lazyWithRetry(() => import("./pages/BookReader"));
const TemplatesGallery = lazyWithRetry(() => import("./pages/TemplatesGallery"));
const PrivacyPolicy = lazyWithRetry(() => import("./pages/PrivacyPolicy"));
const RefundPolicy = lazyWithRetry(() => import("./pages/RefundPolicy"));
const TermsOfService = lazyWithRetry(() => import("./pages/TermsOfService"));
const Support = lazyWithRetry(() => import("./pages/Support"));
// Podcast Module
const PodcastListing = lazyWithRetry(() => import("./pages/PodcastListing"));
const AdminPodcast = lazyWithRetry(() => import("./pages/AdminPodcast"));
// Dictation Practice Module
const AdminDictationDashboard = lazyWithRetry(() => import("./pages/AdminDictationDashboard"));
const AdminDictationLevel = lazyWithRetry(() => import("./pages/AdminDictationLevel"));
const AdminDictationTopic = lazyWithRetry(() => import("./pages/AdminDictationTopic"));
const DictationLevels = lazyWithRetry(() => import("./pages/DictationLevels"));
const DictationTopics = lazyWithRetry(() => import("./pages/DictationTopics"));
const DictationPractice = lazyWithRetry(() => import("./pages/DictationPractice"));
import { useAdminAuth } from './hooks/useAdminAuth';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: 2, // Retry failed requests twice
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // Exponential backoff: 1s, 2s, max 5s
      refetchOnWindowFocus: false, // Disable refetch on window focus for mobile performance
      networkMode: 'online', // Only fetch when online
    },
  },
});

// Protected Admin Route Component
function ProtectedAdminRoute({ children }: { children: React.ReactNode }) {
  const { admin, loading } = useAdminAuth();

  // Check localStorage for session token (new secure format)
  const hasAdminSession = typeof window !== 'undefined' &&
    !!localStorage.getItem('admin_session_token');

  // Show loading state while validating session
  if (loading && hasAdminSession) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If admin is authenticated (validated session), allow access
  if (admin) {
    return <>{children}</>;
  }

  // If session token exists but admin not yet validated, wait for loading
  if (hasAdminSession && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // No valid session, redirect to login
  return <Navigate to="/admin/login" replace />;
}

const App = () => {
  // ⛔ REMOVED: Auto-translation watchdog that was causing massive edge function invocations
  // Translations are now ONLY triggered manually from Admin Vocab Manager

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <HelmetProvider>
        <I18nextProvider i18n={i18n}>
          <QueryClientProvider client={queryClient}>
            <DashboardThemeProvider>
              <BrowserRouter>
                <TooltipProvider>
                  <Suspense fallback={null}>
                    <GlobalTextSelection>
                      {/* Language auto-detection is handled by i18n - no banner needed */}
                      <Toaster />
                      <Sonner />
                      <ComingSoonModal />
                      <Suspense
                        fallback={
                          <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden" style={{ backgroundColor: '#FFFAF0' }}>
                            {/* Paper texture overlays for Note theme */}
                            <div
                              className="absolute inset-0 pointer-events-none opacity-30 z-0"
                              style={{
                                backgroundImage: `url("https://www.transparenttextures.com/patterns/rice-paper-2.png")`,
                                mixBlendMode: 'multiply'
                              }}
                            />
                            <div
                              className="absolute inset-0 pointer-events-none opacity-10 z-0"
                              style={{
                                backgroundImage: `url("https://www.transparenttextures.com/patterns/natural-paper.png")`,
                                mixBlendMode: 'multiply',
                                filter: 'contrast(1.2)'
                              }}
                            />
                            {/* DotLottie animation - same as translation popup */}
                            <div className="relative z-10 flex flex-col items-center">
                              <dotlottie-wc
                                src="https://lottie.host/f9eec83f-15c9-410c-937c-c3a0d2024d6a/EoOyrmY8jW.lottie"
                                style={{ width: '120px', height: '120px' }}
                                speed="1"
                                autoplay
                                loop
                              />
                            </div>
                          </div>
                        }
                      >
                        <Routes>
                          <Route path="/" element={<Index />} />
                          <Route path="/hero" element={<HeroIndex />} />
                          <Route path="/hero/" element={<HeroIndex />} />

                          <Route path="/reading" element={<ReadingTest />} />
                          <Route path="/reading/:testId" element={<ReadingTest />} />
                          <Route path="/listening" element={<ContentSelection />} />
                          <Route path="/listening/:testId" element={<ListeningTest />} />
                          <Route path="/writing" element={<Writing />} />
                          <Route path="/writing/random" element={<Writing />} />
                          <Route path="/writing-test" element={<WritingTest />} />
                          <Route path="/writing/:book/:test" element={<WritingTest />} />
                          <Route path="/speaking" element={<Speaking />} />
                          <Route path="/speaking/random" element={<Speaking />} />
                          <Route path="/speaking/:book/:test" element={<Speaking />} />
                          <Route path="/qwen-tts-test" element={<QwenTTSTest />} />
                          {/* PTE specific routes */}
                          <Route path="/pte/writing" element={<Writing />} />
                          <Route path="/pte/speaking" element={<Speaking />} />
                          <Route path="/pte/reading" element={<Reading />} />
                          <Route path="/pte/listening" element={<Listening />} />
                          {/* TOEFL specific routes */}
                          <Route path="/toefl/writing" element={<Writing />} />
                          <Route path="/toefl/speaking" element={<Speaking />} />
                          <Route path="/toefl/reading" element={<Reading />} />
                          <Route path="/toefl/listening" element={<Listening />} />
                          {/* General English routes */}
                          <Route path="/general/grammar" element={<EnhancedGeneralPortal />} />
                          <Route path="/general/vocabulary" element={<EnhancedGeneralPortal />} />
                          <Route path="/general/conversation" element={<EnhancedGeneralPortal />} />
                          <Route path="/general/listening" element={<EnhancedGeneralPortal />} />
                          <Route path="/general/speaking" element={<EnhancedGeneralPortal />} />
                          {/* Exam Selection Portal - Choose your test */}
                          <Route path="/exam-selection" element={<ExamSelectionPortal />} />
                          {/* IELTS Routes - New Skill-Based Structure */}
                          <Route path="/ielts-portal" element={<IELTSPortal />} />
                          <Route path="/ielts" element={<IELTSSkillHub />} />
                          <Route path="/ielts/:skill" element={<IELTSSkillTests />} />
                          {/* Books Routes */}
                          <Route path="/books" element={<BooksLibrary />} />
                          <Route path="/books/:bookId" element={<BookReader />} />
                          {/* Templates Routes */}
                          <Route path="/templates" element={<TemplatesGallery />} />
                          {/* Grammar Learning Center Routes */}
                          <Route path="/grammar" element={<GrammarPortal />} />
                          <Route path="/grammar/:topicSlug" element={<GrammarLesson />} />
                          {/* Business English Module Routes */}
                          <Route path="/business-portal" element={<BusinessPortal />} />
                          <Route path="/business/resume" element={<ResumeBuilder />} />
                          <Route path="/business/email" element={<EmailPractice />} />
                          <Route path="/business/interview" element={<InterviewPractice />} />
                          {/* NCLEX Module Routes */}
                          <Route path="/nclex" element={<NCLEXPortal />} />
                          <Route path="/nclex/test/:testId" element={<NCLEXTest />} />
                          {/* Dictation Practice Routes */}
                          <Route path="/dictation" element={<DictationLevels />} />
                          <Route path="/dictation/:levelSlug" element={<DictationTopics />} />
                          <Route path="/dictation/:levelSlug/:topicSlug" element={<DictationPractice />} />

                          <Route path="/skills/listening-for-details" element={<DictationLevels />} />
                          <Route path="/skills/listening-for-details/:levelSlug" element={<DictationTopics />} />
                          <Route path="/skills/listening-for-details/:levelSlug/:topicSlug" element={<DictationPractice />} />

                          <Route path="/admin/login" element={<AdminLogin />} />
                          <Route path="/admin" element={<ProtectedAdminRoute><AdminDashboard /></ProtectedAdminRoute>} />
                          <Route path="/admin/analytics" element={<ProtectedAdminRoute><AdminAnalytics /></ProtectedAdminRoute>} />
                          <Route path="/admin/reading" element={<ProtectedAdminRoute><AdminReading /></ProtectedAdminRoute>} />
                          <Route path="/admin/listening" element={<ProtectedAdminRoute><AdminListening /></ProtectedAdminRoute>} />
                          <Route path="/admin/writing" element={<ProtectedAdminRoute><AdminWriting /></ProtectedAdminRoute>} />
                          <Route path="/admin/speaking" element={<ProtectedAdminRoute><AdminSpeaking /></ProtectedAdminRoute>} />
                          <Route path="/admin/ielts" element={<ProtectedAdminRoute><AdminIELTS /></ProtectedAdminRoute>} />
                          <Route path="/admin/ielts/:skill" element={<ProtectedAdminRoute><AdminIELTSSkillManagement /></ProtectedAdminRoute>} />
                          <Route path="/admin/pte" element={<ProtectedAdminRoute><AdminPTE /></ProtectedAdminRoute>} />
                          <Route path="/admin/toefl" element={<ProtectedAdminRoute><AdminTOEFL /></ProtectedAdminRoute>} />
                          <Route path="/admin/general" element={<ProtectedAdminRoute><AdminGeneral /></ProtectedAdminRoute>} />
                          <Route path="/admin/blog" element={<ProtectedAdminRoute><AdminBlogManagement /></ProtectedAdminRoute>} />
                          <Route path="/admin/books" element={<ProtectedAdminRoute><AdminBookCreation /></ProtectedAdminRoute>} />
                          <Route path="/admin/templates" element={<ProtectedAdminRoute><AdminTemplates /></ProtectedAdminRoute>} />
                          {/* Affiliate Management */}
                          <Route path="/admin/affiliates" element={<ProtectedAdminRoute><AdminAffiliates /></ProtectedAdminRoute>} />
                          <Route path="/admin/affiliates/:affiliateId" element={<ProtectedAdminRoute><AdminAffiliateDetail /></ProtectedAdminRoute>} />
                          {/* Grammar Learning Center Admin Routes */}
                          <Route path="/admin/grammar" element={<ProtectedAdminRoute><AdminGrammarDashboard /></ProtectedAdminRoute>} />
                          <Route path="/admin/grammar/:topicId" element={<ProtectedAdminRoute><AdminGrammarLessonEditor /></ProtectedAdminRoute>} />
                          {/* NCLEX Admin Routes */}
                          <Route path="/admin/nclex" element={<ProtectedAdminRoute><AdminNCLEX /></ProtectedAdminRoute>} />
                          <Route path="/admin/nclex/test/:testId" element={<ProtectedAdminRoute><AdminNCLEXTestDetail /></ProtectedAdminRoute>} />
                          {/* Dictation Practice Admin Routes */}
                          <Route path="/admin/dictation" element={<ProtectedAdminRoute><AdminDictationDashboard /></ProtectedAdminRoute>} />
                          <Route path="/admin/dictation/:levelSlug" element={<ProtectedAdminRoute><AdminDictationLevel /></ProtectedAdminRoute>} />
                          <Route path="/admin/dictation/:levelSlug/:topicSlug" element={<ProtectedAdminRoute><AdminDictationTopic /></ProtectedAdminRoute>} />
                          <Route path="/admin/:testType/tests" element={<ProtectedAdminRoute><AdminTestManagement /></ProtectedAdminRoute>} />
                          <Route path="/admin/:testType/test/:testId" element={<ProtectedAdminRoute><AdminTestDetails /></ProtectedAdminRoute>} />
                          <Route path="/admin/:testType/test/:testId/:sectionId" element={<ProtectedAdminRoute><AdminSectionManagement /></ProtectedAdminRoute>} />
                          <Route path="/admin/ielts/reading" element={<ProtectedAdminRoute><AdminIELTSReadingDashboard /></ProtectedAdminRoute>} />
                          <Route path="/admin/:testType/test/:testId/reading" element={<ProtectedAdminRoute><AdminReadingManagement /></ProtectedAdminRoute>} />
                          <Route path="/admin/:testType/test/:testId/listening" element={<ProtectedAdminRoute><AdminIELTSListening /></ProtectedAdminRoute>} />
                          <Route path="/admin/ielts/test/:testId/writing" element={<ProtectedAdminRoute><AdminIELTSWritingTest /></ProtectedAdminRoute>} />
                          <Route path="/admin/ielts/test/:testId/speaking" element={<ProtectedAdminRoute><AdminIELTSSpeaking /></ProtectedAdminRoute>} />
                          <Route path="/admin/ielts/test/:testId/reading" element={<ProtectedAdminRoute><AdminIELTSReadingTest /></ProtectedAdminRoute>} />
                          <Route path="/admin/ielts/test/:testId/listening" element={<ProtectedAdminRoute><AdminIELTSListening /></ProtectedAdminRoute>} />
                          {/* Skills Practice Admin */}
                          <Route path="/admin/skills" element={<ProtectedAdminRoute><AdminSkillsPractice /></ProtectedAdminRoute>} />
                          <Route path="/admin/vocab" element={<ProtectedAdminRoute><AdminVocabManager /></ProtectedAdminRoute>} />
                          <Route path="/admin/vocab/" element={<ProtectedAdminRoute><AdminVocabManager /></ProtectedAdminRoute>} />
                          <Route path="/admin/skills/vocabulary/tests" element={<ProtectedAdminRoute><AdminVocabularyTests /></ProtectedAdminRoute>} />
                          <Route path="/admin/vocab-book" element={<ProtectedAdminRoute><AdminVocabBook /></ProtectedAdminRoute>} />
                          <Route path="/admin/skills/vocabulary/tests/:id" element={<ProtectedAdminRoute><AdminVocabularyTestDetail /></ProtectedAdminRoute>} />
                          {/* aliases for direct access */}
                          <Route path="/admin/skills/vocabulary-builder" element={<ProtectedAdminRoute><AdminVocabularyTests /></ProtectedAdminRoute>} />
                          <Route path="/admin/skills/vocabulary-builder/tests/:id" element={<ProtectedAdminRoute><AdminVocabularyTestDetail /></ProtectedAdminRoute>} />
                          {/* Grammar Fix-it admin routes */}
                          <Route path="/admin/skills/grammar/tests" element={<ProtectedAdminRoute><AdminGrammarTests /></ProtectedAdminRoute>} />
                          <Route path="/admin/skills/grammar/tests/:id" element={<ProtectedAdminRoute><AdminGrammarTestDetail /></ProtectedAdminRoute>} />
                          <Route path="/admin/skills/grammar-fix-it" element={<ProtectedAdminRoute><AdminGrammarTests /></ProtectedAdminRoute>} />
                          <Route path="/admin/skills/grammar-fix-it/tests/:id" element={<ProtectedAdminRoute><AdminGrammarTestDetail /></ProtectedAdminRoute>} />
                          {/* Paraphrasing Challenge admin routes */}
                          <Route path="/admin/skills/paraphrasing-challenge" element={<ProtectedAdminRoute><AdminParaphrasingTests /></ProtectedAdminRoute>} />
                          <Route path="/admin/skills/paraphrasing-challenge/:id" element={<ProtectedAdminRoute><AdminParaphrasingTestDetail /></ProtectedAdminRoute>} />
                          {/* Sentence Scramble admin routes */}
                          <Route path="/admin/skills/sentence-scramble" element={<ProtectedAdminRoute><AdminSentenceScrambleTests /></ProtectedAdminRoute>} />
                          <Route path="/admin/skills/sentence-scramble/:id" element={<ProtectedAdminRoute><AdminSentenceScrambleTestDetail /></ProtectedAdminRoute>} />
                          {/* Sentence Scramble admin routes (alias) */}
                          <Route path="/admin/skills/sentence-structure-scramble" element={<ProtectedAdminRoute><AdminSentenceScrambleTests /></ProtectedAdminRoute>} />
                          <Route path="/admin/skills/sentence-structure-scramble/:id" element={<ProtectedAdminRoute><AdminSentenceScrambleTestDetail /></ProtectedAdminRoute>} />
                          {/* Listening for Details admin routes */}
                          <Route path="/admin/skills/listening-for-details" element={<ProtectedAdminRoute><AdminListeningForDetailsTests /></ProtectedAdminRoute>} />
                          <Route path="/admin/skills/listening-for-details/:id" element={<ProtectedAdminRoute><AdminListeningForDetailsTestDetail /></ProtectedAdminRoute>} />
                          {/* Pronunciation admin routes */}
                          <Route path="/admin/skills/pronunciation-repeat-after-me" element={<ProtectedAdminRoute><AdminPronunciationTests /></ProtectedAdminRoute>} />
                          <Route path="/admin/skills/pronunciation-repeat-after-me/:id" element={<ProtectedAdminRoute><AdminPronunciationTestDetail /></ProtectedAdminRoute>} />
                          <Route path="/admin/skills/:slug" element={<ProtectedAdminRoute><AdminSkillManager /></ProtectedAdminRoute>} />
                          <Route path="/ielts-writing-test/:testId" element={<IELTSWritingTest />} />
                          <Route path="/ielts-writing-test" element={<IELTSWritingTest />} />
                          <Route path="/ielts-writing-results" element={<IELTSWritingResults />} />
                          <Route path="/ielts-writing-results-pro" element={<IELTSWritingProResults />} />
                          <Route path="/ielts-speaking-test" element={<IELTSSpeakingTest />} />
                          <Route path="/ielts-speaking-test/:testId" element={<IELTSSpeakingTest />} />
                          <Route path="/ielts-speaking-test/:testName" element={<IELTSSpeakingTest />} />
                          <Route path="/ielts-speaking-results" element={<IELTSSpeakingResults />} />
                          <Route path="/enhanced-reading-test/:testId" element={<EnhancedReadingTest />} />
                          {/* PTE Admin Routes */}
                          <Route path="/admin/pte/speaking_writing/:type" element={<ProtectedAdminRoute><AdminPTESpeakingWriting /></ProtectedAdminRoute>} />
                          <Route path="/admin/pte/reading/:type" element={<ProtectedAdminRoute><AdminPTEReading /></ProtectedAdminRoute>} />
                          <Route path="/admin/pte/listening/:testId" element={<ProtectedAdminRoute><AdminPTEListening /></ProtectedAdminRoute>} />
                          {/* Legacy PTE Admin Routes - redirect to new structure */}
                          <Route path="/admin/pte/listening" element={<ProtectedAdminRoute><AdminPTE /></ProtectedAdminRoute>} />
                          <Route path="/admin/pte/reading" element={<ProtectedAdminRoute><AdminPTE /></ProtectedAdminRoute>} />
                          <Route path="/admin/pte/writing" element={<ProtectedAdminRoute><AdminPTE /></ProtectedAdminRoute>} />
                          <Route path="/admin/pte/speaking" element={<ProtectedAdminRoute><AdminPTE /></ProtectedAdminRoute>} />
                          {/* TOEFL Admin Routes */}
                          <Route path="/admin/toefl/listening" element={<ProtectedAdminRoute><AdminListening /></ProtectedAdminRoute>} />
                          <Route path="/admin/toefl/reading" element={<ProtectedAdminRoute><AdminReading /></ProtectedAdminRoute>} />
                          <Route path="/admin/toefl/writing" element={<ProtectedAdminRoute><AdminWriting /></ProtectedAdminRoute>} />
                          <Route path="/admin/toefl/speaking" element={<ProtectedAdminRoute><AdminSpeaking /></ProtectedAdminRoute>} />
                          <Route path="/admin/toefl/integrated-writing" element={<ProtectedAdminRoute><AdminWriting /></ProtectedAdminRoute>} />
                          <Route path="/admin/toefl/independent-writing" element={<ProtectedAdminRoute><AdminWriting /></ProtectedAdminRoute>} />
                          {/* TOEIC Admin Routes */}
                          <Route path="/admin/toeic" element={<ProtectedAdminRoute><AdminTOEIC /></ProtectedAdminRoute>} />
                          <Route path="/admin/toeic/listening/:testId" element={<ProtectedAdminRoute><AdminTOEICListening /></ProtectedAdminRoute>} />
                          <Route path="/admin/toeic/reading/:testId" element={<ProtectedAdminRoute><AdminTOEICReading /></ProtectedAdminRoute>} />
                          {/* TOEIC Student Routes */}
                          <Route path="/toeic" element={<TOEICPortal />} />
                          <Route path="/toeic-portal" element={<TOEICPortal />} />
                          <Route path="/toeic/listening/:testId" element={<TOEICListeningTest />} />
                          <Route path="/toeic/reading/:testId" element={<TOEICReadingTest />} />
                          <Route path="/toeic/reading/result" element={<TOEICReadingResult />} />
                          {/* General English Admin Routes */}
                          <Route path="/admin/general/grammar" element={<ProtectedAdminRoute><AdminGeneral /></ProtectedAdminRoute>} />
                          <Route path="/admin/general/vocabulary" element={<ProtectedAdminRoute><AdminGeneral /></ProtectedAdminRoute>} />
                          <Route path="/admin/general/pronunciation" element={<ProtectedAdminRoute><AdminGeneral /></ProtectedAdminRoute>} />
                          {/* Missing portal routes that were causing 404s */}
                          <Route path="/reading-results" element={<ReadingResults />} />
                          <Route path="/listening-results" element={<ListeningResults />} />

                          <Route path="/ielts-writing-pro-results" element={<IELTSWritingProResults />} />
                          <Route path="/pay" element={<Pay />} />
                          <Route path="/reset-password" element={<ResetPassword />} />
                          <Route path="/onboarding/assessment" element={<OnboardingAssessment />} />
                          <Route path="/plan" element={<PlanPage />} />
                          <Route path="/ielts-portal" element={<IELTSPortal />} />
                          <Route path="/ielts-test-modules/:testId" element={<IELTSTestModules />} />
                          <Route path="/pte-portal" element={<PTEPortal />} />
                          {/* PTE Student Practice Routes */}
                          <Route path="/pte-speaking/:type" element={<PTESpeakingWritingTest />} />
                          <Route path="/pte-reading/:type" element={<PTEReadingTest />} />
                          <Route path="/pte-listening/:testId" element={<PTEListeningTest />} />
                          <Route path="/toefl-portal" element={<TOEFLPortal />} />
                          <Route path="/general-portal" element={<GeneralPortal />} />
                          <Route path="/dashboard" element={<Dashboard />} />
                          <Route path="/dashboard/writing-history" element={<WritingHistory />} />
                          <Route path="/dashboard/my-word-book" element={<MyWordBook />} />
                          <Route path="/results/writing/:submissionId" element={<WritingResultsDetail />} />
                          <Route path="/user-dashboard" element={<PersonalPage />} />
                          <Route path="/practice" element={<TestSelection />} />
                          <Route path="/personal-page" element={<PersonalPage />} />
                          <Route path="/auth" element={<Auth />} />
                          <Route path="/auth/callback" element={<AuthCallback />} />
                          <Route path="/unknown-session" element={<UnknownSession />} />
                          <Route path="/tests" element={<TestSelection />} />
                          <Route path="/community" element={<CommunityPage />} />
                          <Route path="/settings" element={<SettingsPage />} />
                          {/* AI Speaking Tutor (voice calling) */}
                          <Route path="/ai-speaking" element={<AISpeakingCall />} />
                          {/* Earthworm AI Speaking Tutor */}
                          <Route path="/earthworm" element={<AISpeakingTutor />} />
                          {/* Skills Practice (Student) */}
                          <Route path="/skills/:slug" element={<SkillPractice />} />
                          <Route path="/skills/vocabulary-builder/map" element={<VocabularyMap />} />
                          <Route path="/skills/vocabulary-builder" element={<VocabularyMapView />} />
                          <Route path="/vocabulary" element={<VocabLevels />} />
                          <Route path="/vocabulary/levels" element={<VocabLevels />} />
                          <Route path="/vocabulary/book" element={<VocabularyBook />} />
                          <Route path="/vocabulary/deck/:deckId" element={<VocabDeck />} />
                          <Route path="/vocabulary/test/:deckId" element={<VocabTest />} />
                          <Route path="/vocabulary/review/:deckId" element={<VocabReview />} />
                          <Route path="/signup" element={<Signup />} />
                          <Route path="/skills/vocabulary-builder/test/:testId" element={<VocabularyQuiz />} />
                          <Route path="/skills/paraphrasing-challenge/test/:testId" element={<ParaphraseQuiz />} />
                          <Route path="/skills/sentence-structure-scramble/test/:testId" element={<SentenceScrambleQuiz />} />
                          <Route path="/skills/listening-for-details/test/:testId" element={<ListeningQuiz />} />
                          <Route path="/skills/synonym-match/test/:testId" element={<SynonymMatchQuiz />} />
                          <Route path="/pricing" element={<Pricing />} />
                          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                          <Route path="/refund-policy" element={<RefundPolicy />} />
                          <Route path="/terms-of-service" element={<TermsOfService />} />
                          <Route path="/support" element={<Support />} />
                          {/* Podcast Routes */}
                          <Route path="/podcasts" element={<PodcastListing />} />
                          <Route path="/admin/podcasts" element={<ProtectedAdminRoute><AdminPodcast /></ProtectedAdminRoute>} />
                          {/* Blog Routes - Language-aware */}
                          <Route path="/blog" element={<Navigate to="/en/blog" replace />} />
                          <Route path="/:lang/blog" element={<BlogListing />} />
                          <Route path="/:lang/blog/:slug" element={<BlogDetail />} />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </Suspense>
                      <Suspense fallback={null}>
                        <MinimalisticChatbot />
                      </Suspense>
                    </GlobalTextSelection>
                  </Suspense>
                </TooltipProvider>
              </BrowserRouter>
            </DashboardThemeProvider>
          </QueryClientProvider>
        </I18nextProvider>
      </HelmetProvider>
      {import.meta.env.VERCEL_ANALYTICS_ID && typeof window !== 'undefined' && window.location.hostname !== 'localhost' && (
        <Analytics />
      )}
    </ThemeProvider>
  );
};

export default App;
