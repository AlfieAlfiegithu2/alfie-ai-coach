import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Reading from "./pages/Reading";
import ReadingTest from "./pages/ReadingTest";
import Listening from "./pages/Listening";
import ListeningTest from "./pages/ListeningTest";
import ContentSelection from "./pages/ContentSelection";
import Writing from "./pages/Writing";
import Speaking from "./pages/Speaking";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminReading from "./pages/AdminReading";
import AdminListening from "./pages/AdminListening";
import AdminWriting from "./pages/AdminWriting";
import AdminSpeaking from "./pages/AdminSpeaking";
import PersonalPage from "./pages/PersonalPage";
import TestSelection from "./pages/TestSelection";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/reading" element={<ContentSelection />} />
          <Route path="/reading/:testId" element={<ReadingTest />} />
          <Route path="/listening" element={<ContentSelection />} />
          <Route path="/listening/:testId" element={<ListeningTest />} />
          <Route path="/writing" element={<Writing />} />
          <Route path="/speaking" element={<Speaking />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/reading" element={<AdminReading />} />
          <Route path="/admin/listening" element={<AdminListening />} />
          <Route path="/admin/writing" element={<AdminWriting />} />
          <Route path="/admin/speaking" element={<AdminSpeaking />} />
          <Route path="/personal-page" element={<PersonalPage />} />
          <Route path="/tests" element={<TestSelection />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
