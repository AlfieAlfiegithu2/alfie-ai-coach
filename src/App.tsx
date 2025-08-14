import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import MinimalisticChatbot from "./components/MinimalisticChatbot";
import GlobalTextSelection from "./components/GlobalTextSelection";
import Index from "./pages/Index";
import Reading from "./pages/Reading";
import ReadingTest from "./pages/ReadingTest";
import Listening from "./pages/Listening";
import ListeningTest from "./pages/ListeningTest";
import ContentSelection from "./pages/ContentSelection";
import Writing from "./pages/Writing";
import WritingTest from "./pages/WritingTest";
import Speaking from "./pages/Speaking";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminReading from "./pages/AdminReading";
import AdminListening from "./pages/AdminListening";
import AdminWriting from "./pages/AdminWriting";
import AdminSpeaking from "./pages/AdminSpeaking";
import AdminIELTS from "./pages/AdminIELTS";
import AdminPTE from "./pages/AdminPTE";
import AdminTOEFL from "./pages/AdminTOEFL";
import AdminGeneral from "./pages/AdminGeneral";
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
import IELTSTestModules from "./pages/IELTSTestModules";
import AdminTestManagement from "./pages/AdminTestManagement";
import AdminTestDetails from "./pages/AdminTestDetails";
import AdminSectionManagement from "./pages/AdminSectionManagement";
import AdminReadingManagement from "./pages/AdminReadingManagement";
import AdminIELTSReadingDashboard from "./pages/AdminIELTSReadingDashboard";
import AdminIELTSListening from "./pages/AdminIELTSListening";
import AdminIELTSWriting from "./pages/AdminIELTSWriting";
import AdminIELTSWritingTest from "./pages/AdminIELTSWritingTest";
import AdminIELTSSpeaking from "./pages/AdminIELTSSpeaking";
import IELTSWritingTest from "./pages/IELTSWritingTest";
import IELTSWritingResults from "./pages/IELTSWritingResults";
import IELTSWritingProResults from "./pages/IELTSWritingProResults";
import IELTSSpeakingTest from "./pages/IELTSSpeakingTest";
import IELTSSpeakingResults from "./pages/IELTSSpeakingResults";
import EnhancedReadingTest from "./pages/EnhancedReadingTest";
import Pricing from "./pages/Pricing";
import AdminSkillsPractice from "./pages/AdminSkillsPractice";
import AdminSkillManager from "./pages/AdminSkillManager";
import SkillPractice from "./pages/SkillPractice";
import AdminVocabularyTests from "./pages/AdminVocabularyTests";
import AdminVocabularyTestDetail from "./pages/AdminVocabularyTestDetail";
import VocabularyQuiz from "./pages/VocabularyQuiz";
import AdminGrammarTests from "./pages/AdminGrammarTests";
import AdminGrammarTestDetail from "./pages/AdminGrammarTestDetail";
import GrammarQuiz from "./pages/GrammarQuiz";
import AdminParaphrasingTests from "./pages/AdminParaphrasingTests";
import AdminParaphrasingTestDetail from "./pages/AdminParaphrasingTestDetail";
import ParaphraseQuiz from "./pages/ParaphraseQuiz";
import AdminPronunciationTests from "./pages/AdminPronunciationTests";
import AdminPronunciationTestDetail from "./pages/AdminPronunciationTestDetail";
import AdminSentenceScrambleTests from "./pages/AdminSentenceScrambleTests";
import AdminSentenceScrambleTestDetail from "./pages/AdminSentenceScrambleTestDetail";
import SentenceScrambleQuiz from "./pages/SentenceScrambleQuiz";
import AdminListeningForDetailsTests from "./pages/AdminListeningForDetailsTests";
import AdminListeningForDetailsTestDetail from "./pages/AdminListeningForDetailsTestDetail";
import ListeningQuiz from "./pages/ListeningQuiz";
import VocabularyMap from "./pages/VocabularyMap";
import VocabularyMapView from "./components/VocabularyMapView";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <TooltipProvider>
          <GlobalTextSelection>
            <Toaster />
            <Sonner />
            <Routes>
            <Route path="/" element={<Index />} />
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
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/reading" element={<AdminReading />} />
            <Route path="/admin/listening" element={<AdminListening />} />
            <Route path="/admin/writing" element={<AdminWriting />} />
            <Route path="/admin/speaking" element={<AdminSpeaking />} />
            <Route path="/admin/ielts" element={<AdminIELTS />} />
            <Route path="/admin/pte" element={<AdminPTE />} />
            <Route path="/admin/toefl" element={<AdminTOEFL />} />
            <Route path="/admin/general" element={<AdminGeneral />} />
            <Route path="/admin/:testType/tests" element={<AdminTestManagement />} />
            <Route path="/admin/:testType/test/:testId" element={<AdminTestDetails />} />
            <Route path="/admin/:testType/test/:testId/:sectionId" element={<AdminSectionManagement />} />
            <Route path="/admin/ielts/reading" element={<AdminIELTSReadingDashboard />} />
            <Route path="/admin/:testType/test/:testId/reading" element={<AdminReadingManagement />} />
            <Route path="/admin/:testType/test/:testId/listening" element={<AdminIELTSListening />} />
            <Route path="/admin/ielts/test/:testId/writing" element={<AdminIELTSWritingTest />} />
            <Route path="/admin/ielts/writing" element={<AdminIELTSWriting />} />
            <Route path="/admin/ielts/writing/test/:testId" element={<AdminIELTSWritingTest />} />
            <Route path="/admin/ielts/test/:testId/speaking" element={<AdminIELTSSpeaking />} />
            {/* Skills Practice Admin */}
            <Route path="/admin/skills" element={<AdminSkillsPractice />} />
            <Route path="/admin/skills/vocabulary/tests" element={<AdminVocabularyTests />} />
            <Route path="/admin/skills/vocabulary/tests/:id" element={<AdminVocabularyTestDetail />} />
            {/* aliases for direct access */}
            <Route path="/admin/skills/vocabulary-builder" element={<AdminVocabularyTests />} />
            <Route path="/admin/skills/vocabulary-builder/tests/:id" element={<AdminVocabularyTestDetail />} />
            {/* Grammar Fix-it admin routes */}
            <Route path="/admin/skills/grammar/tests" element={<AdminGrammarTests />} />
            <Route path="/admin/skills/grammar/tests/:id" element={<AdminGrammarTestDetail />} />
            <Route path="/admin/skills/grammar-fix-it" element={<AdminGrammarTests />} />
            <Route path="/admin/skills/grammar-fix-it/tests/:id" element={<AdminGrammarTestDetail />} />
            {/* Paraphrasing Challenge admin routes */}
            <Route path="/admin/skills/paraphrasing-challenge" element={<AdminParaphrasingTests />} />
            <Route path="/admin/skills/paraphrasing-challenge/:id" element={<AdminParaphrasingTestDetail />} />
            {/* Sentence Scramble admin routes */}
            <Route path="/admin/skills/sentence-scramble" element={<AdminSentenceScrambleTests />} />
            <Route path="/admin/skills/sentence-scramble/:id" element={<AdminSentenceScrambleTestDetail />} />
            {/* Sentence Scramble admin routes (alias) */}
            <Route path="/admin/skills/sentence-structure-scramble" element={<AdminSentenceScrambleTests />} />
            <Route path="/admin/skills/sentence-structure-scramble/:id" element={<AdminSentenceScrambleTestDetail />} />
            {/* Listening for Details admin routes */}
            <Route path="/admin/skills/listening-for-details" element={<AdminListeningForDetailsTests />} />
            <Route path="/admin/skills/listening-for-details/:id" element={<AdminListeningForDetailsTestDetail />} />
            {/* Pronunciation admin routes */}
            <Route path="/admin/skills/pronunciation-repeat-after-me" element={<AdminPronunciationTests />} />
            <Route path="/admin/skills/pronunciation-repeat-after-me/:id" element={<AdminPronunciationTestDetail />} />
            <Route path="/admin/skills/:slug" element={<AdminSkillManager />} />
            <Route path="/ielts-writing-test/:testId" element={<IELTSWritingTest />} />
            <Route path="/ielts-writing-results" element={<IELTSWritingResults />} />
            <Route path="/ielts-writing-results-pro" element={<IELTSWritingProResults />} />
            <Route path="/ielts-speaking-test/:testName" element={<IELTSSpeakingTest />} />
            <Route path="/ielts-speaking-results" element={<IELTSSpeakingResults />} />
            <Route path="/enhanced-reading-test/:testId" element={<EnhancedReadingTest />} />
            {/* PTE Admin Routes */}
            <Route path="/admin/pte/listening" element={<AdminListening />} />
            <Route path="/admin/pte/reading" element={<AdminReading />} />
            <Route path="/admin/pte/writing" element={<AdminWriting />} />
            <Route path="/admin/pte/speaking" element={<AdminSpeaking />} />
            <Route path="/admin/pte/reading-writing" element={<AdminWriting />} />
            <Route path="/admin/pte/speaking-writing" element={<AdminWriting />} />
            {/* TOEFL Admin Routes */}
            <Route path="/admin/toefl/listening" element={<AdminListening />} />
            <Route path="/admin/toefl/reading" element={<AdminReading />} />
            <Route path="/admin/toefl/writing" element={<AdminWriting />} />
            <Route path="/admin/toefl/speaking" element={<AdminSpeaking />} />
            <Route path="/admin/toefl/integrated-writing" element={<AdminWriting />} />
            <Route path="/admin/toefl/independent-writing" element={<AdminWriting />} />
            {/* General English Admin Routes */}
            <Route path="/admin/general/grammar" element={<AdminGeneral />} />
            <Route path="/admin/general/vocabulary" element={<AdminGeneral />} />
            <Route path="/admin/general/pronunciation" element={<AdminGeneral />} />
            {/* Missing portal routes that were causing 404s */}
            <Route path="/ielts-portal" element={<IELTSPortal />} />
            <Route path="/ielts-test-modules/:testId" element={<IELTSTestModules />} />
            <Route path="/pte-portal" element={<PTEPortal />} />
            <Route path="/toefl-portal" element={<TOEFLPortal />} />
            <Route path="/general-portal" element={<GeneralPortal />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/user-dashboard" element={<PersonalPage />} />
            <Route path="/practice" element={<TestSelection />} />
            <Route path="/personal-page" element={<PersonalPage />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/tests" element={<TestSelection />} />
            <Route path="/community" element={<CommunityPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            {/* Skills Practice (Student) */}
            <Route path="/skills/:slug" element={<SkillPractice />} />
            <Route path="/skills/vocabulary-builder/map" element={<VocabularyMap />} />
            <Route path="/skills/vocabulary-builder" element={<VocabularyMapView />} />
            <Route path="/skills/vocabulary-builder/test/:testId" element={<VocabularyQuiz />} />
            <Route path="/skills/paraphrasing-challenge/test/:testId" element={<ParaphraseQuiz />} />
            <Route path="/skills/sentence-structure-scramble/test/:testId" element={<SentenceScrambleQuiz />} />
            <Route path="/skills/listening-for-details/test/:testId" element={<ListeningQuiz />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="*" element={<NotFound />} />
            </Routes>
            <MinimalisticChatbot />
          </GlobalTextSelection>
        </TooltipProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
