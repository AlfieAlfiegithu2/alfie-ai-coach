import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { I18nextProvider } from 'react-i18next';
import { HelmetProvider } from 'react-helmet-async';
// @ts-ignore - Types might be missing for this package
import { Analytics } from "@vercel/analytics/react";
import i18n from './lib/i18n';
import { Suspense, lazy, useEffect } from 'react';
import { ThemeProvider as DashboardThemeProvider } from '@/contexts/ThemeContext';
// Import supabase client dynamically to avoid bundling conflicts
import MinimalisticChatbot from "./components/MinimalisticChatbot";
import GlobalTextSelection from "./components/GlobalTextSelection";
import LanguageWelcomeBanner from "./components/LanguageWelcomeBanner";
import ComingSoonModal from "./components/ComingSoonModal";
import Index from "./pages/Index";
import HeroIndex from "./pages/HeroIndex";

import Reading from "./pages/Reading";
import ReadingTest from "./pages/ReadingTest";
import Listening from "./pages/Listening";
import ListeningTest from "./pages/ListeningTest";
import ContentSelection from "./pages/ContentSelection";
import Writing from "./pages/Writing";
import WritingTest from "./pages/WritingTest";
import Speaking from "./pages/Speaking";
import AdminLogin from "./pages/AdminLogin";

// Lazily loaded heavy/admin/test pages to reduce initial bundle size & TBT
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminReading = lazy(() => import("./pages/AdminReading"));
const AdminListening = lazy(() => import("./pages/AdminListening"));
const AdminWriting = lazy(() => import("./pages/AdminWriting"));
const AdminSpeaking = lazy(() => import("./pages/AdminSpeaking"));
const AdminIELTS = lazy(() => import("./pages/AdminIELTS"));
const AdminPTE = lazy(() => import("./pages/AdminPTE"));
const AdminTOEFL = lazy(() => import("./pages/AdminTOEFL"));
const AdminGeneral = lazy(() => import("./pages/AdminGeneral"));
// Lazy load student pages to improve initial load performance
const PersonalPage = lazy(() => import("./pages/PersonalPage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const TestSelection = lazy(() => import("./pages/TestSelection"));
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));
const CommunityPage = lazy(() => import("./pages/CommunityPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const PTEPortal = lazy(() => import("./pages/PTEPortal"));
const TOEFLPortal = lazy(() => import("./pages/TOEFLPortal"));
const GeneralPortal = lazy(() => import("./pages/GeneralPortal"));
const EnhancedGeneralPortal = lazy(() => import("./pages/EnhancedGeneralPortal"));
const IELTSPortal = lazy(() => import("./pages/IELTSPortal"));
const IELTSSkillHub = lazy(() => import("./pages/IELTSSkillHub"));
const IELTSSkillTests = lazy(() => import("./pages/IELTSSkillTests"));
const AdminIELTSSkillManagement = lazy(() => import("./pages/AdminIELTSSkillManagement"));
const IELTSTestModules = lazy(() => import("./pages/IELTSTestModules"));
const QwenTTSTest = lazy(() => import("./pages/QwenTTSTest"));
const AdminTestManagement = lazy(() => import("./pages/AdminTestManagement"));
const AdminTestDetails = lazy(() => import("./pages/AdminTestDetails"));
const AdminSectionManagement = lazy(() => import("./pages/AdminSectionManagement"));
const AdminReadingManagement = lazy(() => import("./pages/AdminReadingManagement"));
const AdminIELTSReadingDashboard = lazy(() => import("./pages/AdminIELTSReadingDashboard"));
const AdminIELTSListening = lazy(() => import("./pages/AdminIELTSListening"));
const AdminIELTSWriting = lazy(() => import("./pages/AdminIELTSWriting"));
const AdminIELTSWritingTest = lazy(() => import("./pages/AdminIELTSWritingTest"));
const AdminIELTSReadingTest = lazy(() => import("./pages/AdminIELTSReadingTest"));
const AdminIELTSSpeaking = lazy(() => import("./pages/AdminIELTSSpeaking"));
const IELTSWritingTest = lazy(() => import("./pages/IELTSWritingTest"));
const IELTSWritingProResults = lazy(() => import("./pages/IELTSWritingProResults"));
const IELTSWritingResults = lazy(() => import("./pages/IELTSWritingResults"));
const ReadingResults = lazy(() => import("./pages/ReadingResults"));
const ListeningResults = lazy(() => import("./pages/ListeningResults"));
const IELTSSpeakingResults = lazy(() => import("./pages/IELTSSpeakingResults"));
const IELTSSpeakingTest = lazy(() => import("./pages/IELTSSpeakingTest"));
const EnhancedReadingTest = lazy(() => import("./pages/EnhancedReadingTest"));
const Pricing = lazy(() => import("./pages/Pricing"));
const AdminSkillsPractice = lazy(() => import("./pages/AdminSkillsPractice"));
const AdminSkillManager = lazy(() => import("./pages/AdminSkillManager"));
const SkillPractice = lazy(() => import("./pages/SkillPractice"));
const AISpeakingCall = lazy(() => import("./pages/AISpeakingCall"));
const AISpeakingTutor = lazy(() => import("./pages/AISpeakingTutor"));

// Admin / heavy tools (lazy)
const AdminVocabularyTests = lazy(() => import("./pages/AdminVocabularyTests"));
const AdminVocabBook = lazy(() => import("./pages/AdminVocabBook"));
const AdminVocabManager = lazy(() => import("./pages/AdminVocabManager"));
const AdminVocabularyTestDetail = lazy(() => import("./pages/AdminVocabularyTestDetail"));
const AdminGrammarTests = lazy(() => import("./pages/AdminGrammarTests"));
const AdminGrammarTestDetail = lazy(() => import("./pages/AdminGrammarTestDetail"));
const AdminParaphrasingTests = lazy(() => import("./pages/AdminParaphrasingTests"));
const AdminParaphrasingTestDetail = lazy(() => import("./pages/AdminParaphrasingTestDetail"));
const AdminPronunciationTests = lazy(() => import("./pages/AdminPronunciationTests"));
const AdminPronunciationTestDetail = lazy(() => import("./pages/AdminPronunciationTestDetail"));
const AdminSentenceScrambleTests = lazy(() => import("./pages/AdminSentenceScrambleTests"));
const AdminSentenceScrambleTestDetail = lazy(() => import("./pages/AdminSentenceScrambleTestDetail"));
const AdminListeningForDetailsTests = lazy(() => import("./pages/AdminListeningForDetailsTests"));
const AdminListeningForDetailsTestDetail = lazy(() => import("./pages/AdminListeningForDetailsTestDetail"));

// Student quizzes (lazy loaded for performance)
const VocabularyQuiz = lazy(() => import("./pages/VocabularyQuiz"));
const GrammarQuiz = lazy(() => import("./pages/GrammarQuiz"));
const ParaphraseQuiz = lazy(() => import("./pages/ParaphraseQuiz"));
const SentenceScrambleQuiz = lazy(() => import("./pages/SentenceScrambleQuiz"));
const ListeningQuiz = lazy(() => import("./pages/ListeningQuiz"));
const VocabularyMap = lazy(() => import("./pages/VocabularyMap"));
const VocabularyBook = lazy(() => import("./pages/VocabularyBook"));
const VocabHome = lazy(() => import("./pages/VocabHome"));
const VocabDeck = lazy(() => import("./pages/VocabDeck"));
const VocabReview = lazy(() => import("./pages/VocabReview"));
const VocabLevels = lazy(() => import("./pages/VocabLevels"));
const VocabTest = lazy(() => import("./pages/VocabTest"));
const Signup = lazy(() => import("./pages/Signup"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const VocabularyMapView = lazy(() => import("./components/VocabularyMapView"));
const WritingHistory = lazy(() => import("./pages/WritingHistory"));
const WritingResultsDetail = lazy(() => import("./pages/WritingResultsDetail"));
const Pay = lazy(() => import("./pages/Pay"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const MyWordBook = lazy(() => import("./pages/MyWordBook"));
const AdminAnalytics = lazy(() => import("./pages/AdminAnalytics"));
const OnboardingAssessment = lazy(() => import("./pages/OnboardingAssessment"));
const PlanPage = lazy(() => import("./pages/Plan"));
const BlogListing = lazy(() => import("./pages/BlogListing"));
const BlogDetail = lazy(() => import("./pages/BlogDetail"));
const AdminBlogManagement = lazy(() => import("./pages/AdminBlogManagement"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
import { useAdminAuth } from './hooks/useAdminAuth';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false, // Disable refetch on window focus for mobile performance
    },
  },
});

// Protected Admin Route Component
function ProtectedAdminRoute({ children }: { children: React.ReactNode }) {
  const { admin, loading: authLoading } = useAdminAuth();

  // Check localStorage directly as primary indicator of admin session
  const hasAdminSession = typeof window !== 'undefined' &&
    localStorage.getItem('admin_session') === 'true';

  // If session exists in localStorage, user is admin - render immediately
  if (hasAdminSession) {
    return <>{children}</>;
  }

  // If we already know there's no admin and no stored session, redirect
  if (!admin && !hasAdminSession) {
    return <Navigate to="/admin/login" replace />;
  }

  // Fallback: allow access (avoids blocking on a non-existent authLoading flag)
  return <>{children}</>;
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
                  <GlobalTextSelection>
                    <LanguageWelcomeBanner />
                    <Toaster />
                    <Sonner />
                    <ComingSoonModal />
                    <Suspense
                      fallback={
                        <div className="min-h-screen flex flex-col items-center justify-center bg-background">
                          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                          <p className="mt-4 text-sm text-muted-foreground animate-pulse">Loading...</p>
                        </div>
                      }
                    >
                      <Routes>
                        <Route path="/" element={<Index />} />
                        <Route path="/hero" element={<HeroIndex />} />
                        <Route path="/hero/" element={<HeroIndex />} />

                        <Route path="/reading" element={<ContentSelection />} />
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
                        {/* IELTS Routes - New Skill-Based Structure */}
                        <Route path="/ielts-portal" element={<IELTSPortal />} />
                        <Route path="/ielts" element={<IELTSSkillHub />} />
                        <Route path="/ielts/:skill" element={<IELTSSkillTests />} />

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
                        <Route path="/admin/pte/listening" element={<ProtectedAdminRoute><AdminListening /></ProtectedAdminRoute>} />
                        <Route path="/admin/pte/reading" element={<ProtectedAdminRoute><AdminReading /></ProtectedAdminRoute>} />
                        <Route path="/admin/pte/writing" element={<ProtectedAdminRoute><AdminWriting /></ProtectedAdminRoute>} />
                        <Route path="/admin/pte/speaking" element={<ProtectedAdminRoute><AdminSpeaking /></ProtectedAdminRoute>} />
                        <Route path="/admin/pte/reading-writing" element={<ProtectedAdminRoute><AdminWriting /></ProtectedAdminRoute>} />
                        <Route path="/admin/pte/speaking-writing" element={<ProtectedAdminRoute><AdminWriting /></ProtectedAdminRoute>} />
                        {/* TOEFL Admin Routes */}
                        <Route path="/admin/toefl/listening" element={<ProtectedAdminRoute><AdminListening /></ProtectedAdminRoute>} />
                        <Route path="/admin/toefl/reading" element={<ProtectedAdminRoute><AdminReading /></ProtectedAdminRoute>} />
                        <Route path="/admin/toefl/writing" element={<ProtectedAdminRoute><AdminWriting /></ProtectedAdminRoute>} />
                        <Route path="/admin/toefl/speaking" element={<ProtectedAdminRoute><AdminSpeaking /></ProtectedAdminRoute>} />
                        <Route path="/admin/toefl/integrated-writing" element={<ProtectedAdminRoute><AdminWriting /></ProtectedAdminRoute>} />
                        <Route path="/admin/toefl/independent-writing" element={<ProtectedAdminRoute><AdminWriting /></ProtectedAdminRoute>} />
                        {/* General English Admin Routes */}
                        <Route path="/admin/general/grammar" element={<ProtectedAdminRoute><AdminGeneral /></ProtectedAdminRoute>} />
                        <Route path="/admin/general/vocabulary" element={<ProtectedAdminRoute><AdminGeneral /></ProtectedAdminRoute>} />
                        <Route path="/admin/general/pronunciation" element={<ProtectedAdminRoute><AdminGeneral /></ProtectedAdminRoute>} />
                        {/* Missing portal routes that were causing 404s */}
                        <Route path="/reading-results" element={<ReadingResults />} />
                        <Route path="/listening-results" element={<ListeningResults />} />
                        <Route path="/ielts-speaking-results" element={<IELTSSpeakingResults />} />
                        <Route path="/ielts-writing-pro-results" element={<IELTSWritingProResults />} />
                        <Route path="/pay" element={<Pay />} />
                        <Route path="/reset-password" element={<ResetPassword />} />
                        <Route path="/onboarding/assessment" element={<OnboardingAssessment />} />
                        <Route path="/plan" element={<PlanPage />} />
                        <Route path="/ielts-portal" element={<IELTSPortal />} />
                        <Route path="/ielts-test-modules/:testId" element={<IELTSTestModules />} />
                        <Route path="/pte-portal" element={<PTEPortal />} />
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
                        <Route path="/pricing" element={<Pricing />} />
                        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                        {/* Blog Routes - Language-aware */}
                        <Route path="/blog" element={<Navigate to="/en/blog" replace />} />
                        <Route path="/:lang/blog" element={<BlogListing />} />
                        <Route path="/:lang/blog/:slug" element={<BlogDetail />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Suspense>
                    <MinimalisticChatbot />
                  </GlobalTextSelection>
                </TooltipProvider>
              </BrowserRouter>
            </DashboardThemeProvider>
          </QueryClientProvider>
        </I18nextProvider>
      </HelmetProvider>
      <Analytics />
    </ThemeProvider>
  );
};

export default App;
