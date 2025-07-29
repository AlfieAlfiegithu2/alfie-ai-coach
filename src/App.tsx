import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import MinimalisticChatbot from "./components/MinimalisticChatbot";
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
import TestSelection from "./pages/TestSelection";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import CommunityPage from "./pages/CommunityPage";
import SettingsPage from "./pages/SettingsPage";
import PTEPortal from "./pages/PTEPortal";
import TOEFLPortal from "./pages/TOEFLPortal";
import GeneralPortal from "./pages/GeneralPortal";
import EnhancedGeneralPortal from "./pages/EnhancedGeneralPortal";
import Pricing from "./pages/Pricing";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <TooltipProvider>
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
            <Route path="/pte-portal" element={<PTEPortal />} />
            <Route path="/toefl-portal" element={<TOEFLPortal />} />
            <Route path="/general-portal" element={<EnhancedGeneralPortal />} />
            <Route path="/dashboard" element={<PersonalPage />} />
            <Route path="/practice" element={<TestSelection />} />
            <Route path="/personal-page" element={<PersonalPage />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/tests" element={<TestSelection />} />
            <Route path="/community" element={<CommunityPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <MinimalisticChatbot />
        </TooltipProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
