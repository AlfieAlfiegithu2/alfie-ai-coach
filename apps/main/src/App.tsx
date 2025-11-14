import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { I18nextProvider } from 'react-i18next';
import { HelmetProvider } from 'react-helmet-async';
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
import PersonalPage from "./pages/PersonalPage";
import Dashboard from "./pages/Dashboard";
import TestSelection from "./pages/TestSelection";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import CommunityPage from "./pages/CommunityPage";
import SettingsPage from "./pages/SettingsPage";
import PTEPortal from "./pages/PTEPortal";
import TOEFLPortal from "./pages/TOEFLPortal";
import GeneralPortal from "./pages/GeneralPortal";
import EnhancedGeneralPortal from "./pages/EnhancedGeneralPortal";
import IELTSPortal from "./pages/IELTSPortal";
import IELTSSkillHub from "./pages/IELTSSkillHub";
import IELTSSkillTests from "./pages/IELTSSkillTests";
import AdminIELTSSkillManagement from "./pages/AdminIELTSSkillManagement";
import IELTSTestModules from "./pages/IELTSTestModules";
import QwenTTSTest from "./pages/QwenTTSTest";
import AdminTestManagement from "./pages/AdminTestManagement";
import AdminTestDetails from "./pages/AdminTestDetails";
import AdminSectionManagement from "./pages/AdminSectionManagement";
import AdminReadingManagement from "./pages/AdminReadingManagement";
import AdminIELTSReadingDashboard from "./pages/AdminIELTSReadingDashboard";
import AdminIELTSListening from "./pages/AdminIELTSListening";
import AdminIELTSWriting from "./pages/AdminIELTSWriting";
import AdminIELTSWritingTest from "./pages/AdminIELTSWritingTest";
import AdminIELTSReadingTest from "./pages/AdminIELTSReadingTest";
import AdminIELTSSpeaking from "./pages/AdminIELTSSpeaking";
import IELTSWritingTest from "./pages/IELTSWritingTest";
import IELTSWritingProResults from "./pages/IELTSWritingProResults";
import IELTSWritingResults from "./pages/IELTSWritingResults";
import ReadingResults from "./pages/ReadingResults";
import ListeningResults from "./pages/ListeningResults";
import IELTSSpeakingResults from "./pages/IELTSSpeakingResults";
import IELTSSpeakingTest from "./pages/IELTSSpeakingTest";
import EnhancedReadingTest from "./pages/EnhancedReadingTest";
import Pricing from "./pages/Pricing";
import AdminSkillsPractice from "./pages/AdminSkillsPractice";
import AdminSkillManager from "./pages/AdminSkillManager";
import SkillPractice from "./pages/SkillPractice";
import AISpeakingCall from "./pages/AISpeakingCall";
import AISpeakingTutor from "./pages/AISpeakingTutor";

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

// Student quizzes (kept as direct imports since they are route-split already)
import VocabularyQuiz from "./pages/VocabularyQuiz";
import GrammarQuiz from "./pages/GrammarQuiz";
import ParaphraseQuiz from "./pages/ParaphraseQuiz";
import SentenceScrambleQuiz from "./pages/SentenceScrambleQuiz";
import ListeningQuiz from "./pages/ListeningQuiz";
import VocabularyMap from "./pages/VocabularyMap";
import VocabularyBook from "./pages/VocabularyBook";
import VocabHome from "./pages/VocabHome";
import VocabDeck from "./pages/VocabDeck";
import VocabReview from "./pages/VocabReview";
import VocabLevels from "./pages/VocabLevels";
import VocabTest from "./pages/VocabTest";
import Signup from "./pages/Signup";
import VocabularyMapView from "./components/VocabularyMapView";
import WritingHistory from "./pages/WritingHistory";
import WritingResultsDetail from "./pages/WritingResultsDetail";
import Pay from "./pages/Pay";
import ResetPassword from "./pages/ResetPassword";
import MyWordBook from "./pages/MyWordBook";
import AdminAnalytics from "./pages/AdminAnalytics";
import OnboardingAssessment from "./pages/OnboardingAssessment";
import PlanPage from "./pages/Plan";
import BlogListing from "./pages/BlogListing";
import BlogDetail from "./pages/BlogDetail";
import AdminBlogManagement from "./pages/AdminBlogManagement";
import { useAdminAuth } from './hooks/useAdminAuth';

const queryClient = new QueryClient();

// Protected Admin Route Component
function ProtectedAdminRoute({ children }: { children: React.ReactNode }) {
  const { admin } = useAdminAuth();
  
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
                    <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
                      Loading...
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
            <Route path="/tests" element={<TestSelection />} />
            <Route path="/community" element={<CommunityPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            {/* AI Speaking Tutor (voice calling) */}
            <Route path="/ai-speaking" element={<AISpeakingCall />} />
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
