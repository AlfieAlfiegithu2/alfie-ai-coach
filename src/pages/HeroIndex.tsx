import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Play, BookOpen, Headphones, PenTool, Mic, Users, Target, Zap, Star, Globe, Bot, Award, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import LanguagePicker from "@/components/LanguagePicker";
import MinimalisticChatbot from "@/components/MinimalisticChatbot";
import { TypewriterText } from "@/components/TypewriterText";
import HeroAnimation from "@/components/animations/HeroAnimation";
const HeroIndex = () => {
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [searchQuery, setSearchQuery] = useState('');
  useEffect(() => {
    const getUser = async () => {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);
  const handleAuthAction = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/auth');
    }
  };
  const testTypes = [{
    title: "IELTS",
    description: "International English Language Testing System",
    path: "/ielts-portal",
    // Main IELTS portal
    icon: <BookOpen className="w-6 h-6 text-foreground" />,
    sections: ["Reading", "Listening", "Writing", "Speaking"]
  }, {
    title: "PTE Academic",
    description: "Pearson Test of English Academic",
    path: "/pte-portal",
    icon: <Target className="w-6 h-6 text-foreground" />,
    sections: ["Reading", "Listening", "Writing", "Speaking"]
  }, {
    title: "TOEFL iBT",
    description: "Test of English as a Foreign Language",
    path: "/toefl-portal",
    icon: <Globe className="w-6 h-6 text-foreground" />,
    sections: ["Reading", "Listening", "Writing", "Speaking"]
  }, {
    title: "General English",
    description: "Daily English improvement lessons",
    path: "/general-portal",
    icon: <Users className="w-6 h-6 text-foreground" />,
    sections: ["Vocabulary", "Grammar", "Conversation", "Practice"]
  }];
  const ieltsModules = [{
    title: "Reading",
    icon: <BookOpen className="w-6 h-6 text-foreground" />,
    description: "Cambridge IELTS passages with AI analysis",
    path: "/reading",
    questions: "40+ questions"
  }, {
    title: "Listening",
    icon: <Headphones className="w-6 h-6 text-foreground" />,
    description: "Audio practice with transcription support",
    path: "/listening",
    questions: "40+ questions"
  }, {
    title: "Writing",
    icon: <PenTool className="w-6 h-6 text-foreground" />,
    description: "Task 1 & 2 with detailed AI feedback",
    path: "/writing",
    questions: "2 tasks"
  }, {
    title: "Speaking",
    icon: <Mic className="w-6 h-6 text-foreground" />,
    description: "Voice analysis with pronunciation feedback",
    path: "/speaking",
    questions: "3 parts"
  }];
  const additionalPortals = [{
    title: "PTE Academic",
    description: "Comprehensive PTE test preparation",
    path: "/pte-portal",
    badge: "New"
  }, {
    title: "TOEFL iBT",
    description: "Complete TOEFL preparation suite",
    path: "/toefl-portal",
    badge: "Popular"
  }, {
    title: "General English",
    description: "Daily English improvement lessons",
    path: "/general-portal",
    badge: "AI Generated"
  }];
  return <div className="min-h-screen bg-gradient-to-br from-white to-blue-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-100 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-blue-500 rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-800">EnglishAI</span>
            </div>
            
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-gray-600 hover:text-blue-600 transition-colors font-medium">Features</a>
              <a href="#tests" className="text-gray-600 hover:text-blue-600 transition-colors font-medium">Tests</a>
              <a href="#community" className="text-gray-600 hover:text-blue-600 transition-colors font-medium">Community</a>
            </div>

            <div className="flex items-center gap-4">
              <Button 
                onClick={() => navigate('/auth')}
                variant="outline"
                className="border-2 border-blue-500 text-blue-600 hover:bg-blue-50 px-6 py-2 rounded-xl font-bold"
              >
                Log In
              </Button>
              <Button 
                onClick={() => navigate('/dashboard')}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-200"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-16 px-4 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <h1 className="text-4xl md:text-6xl font-bold mb-6 text-gray-800 leading-tight">
                <TypewriterText text="Learn English the fun way!" />
              </h1>
              
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Master English tests with AI-powered coaching. Practice with fun, 
                bite-sized lessons that help you reach your goals faster.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
                <Button 
                  size="lg" 
                  onClick={() => navigate('/ielts-portal')} 
                  className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 rounded-2xl"
                >
                  Get Started
                </Button>
                <Button 
                  size="lg" 
                  onClick={() => navigate('/auth')} 
                  variant="outline"
                  className="border-2 border-blue-500 text-blue-600 hover:bg-blue-50 px-8 py-4 text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 rounded-2xl"
                >
                  I Have An Account
                </Button>
              </div>

              {/* Language flags */}
              <div className="flex items-center justify-center lg:justify-start gap-2 text-sm text-gray-500">
                <span>🇺🇸</span>
                <span>🇬🇧</span>
                <span>🇨🇦</span>
                <span>🇦🇺</span>
                <span>🇮🇳</span>
                <span>🇿🇦</span>
                <span className="ml-2">Free fun effective</span>
              </div>
            </div>

            <div className="relative">
              <div className="bg-white rounded-3xl p-8 shadow-2xl border-4 border-green-400 transform rotate-2 hover:rotate-0 transition-transform duration-300">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">AI Language Coach</h3>
                    <p className="text-gray-600 text-sm">Your personal tutor</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Award className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="text-gray-700">Personalized lessons</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Target className="w-4 h-4 text-purple-600" />
                    </div>
                    <span className="text-gray-700">Real-time feedback</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <Star className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="text-gray-700">Track your progress</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-800">
              Free. Fun. Effective.
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Practice with bite-sized lessons and get instant feedback with our AI coach
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-12 items-center">
            {/* Feature 1 */}
            <div className="text-center lg:text-left">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto lg:mx-0 mb-6">
                <BookOpen className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">Bite-sized lessons</h3>
              <p className="text-gray-600">
                Learn English with short, fun lessons that fit into your daily routine. 
                Each lesson is designed to help you progress step by step.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="text-center lg:text-left">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto lg:mx-0 mb-6">
                <Target className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">Backed by science</h3>
              <p className="text-gray-600">
                Our AI uses proven methods to help you learn faster and remember better. 
                Get personalized feedback that adapts to your learning style.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="text-center lg:text-left">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto lg:mx-0 mb-6">
                <Star className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">Stay motivated</h3>
              <p className="text-gray-600">
                Track your progress, earn achievements, and stay motivated with our 
                engaging learning system designed to keep you coming back.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Test Modules Section */}
      <section id="tests" className="py-20 px-4 bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-800">
              Learn anytime, anywhere.
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Practice all test sections with Cambridge materials and AI-powered feedback
            </p>
          </div>

          {/* Test Types Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {testTypes.map((test, index) => {
              const colors = ['bg-green-500', 'bg-blue-500', 'bg-purple-500', 'bg-orange-500'];
              const lightColors = ['bg-green-50', 'bg-blue-50', 'bg-purple-50', 'bg-orange-50'];
              return (
                <Card 
                  key={index} 
                  className="bg-white border-2 border-gray-100 hover:border-gray-200 hover:shadow-xl transition-all cursor-pointer group transform hover:-translate-y-2"
                  onClick={() => navigate(test.path)}
                >
                  <CardHeader className="text-center pb-6">
                    <div className={`w-16 h-16 ${colors[index]} rounded-2xl flex items-center justify-center mx-auto mb-4 transform group-hover:scale-110 transition-transform`}>
                      <div className="text-white text-2xl font-bold">
                        {test.title.charAt(0)}
                      </div>
                    </div>
                    <CardTitle className="text-gray-800 group-hover:text-blue-600 transition-colors text-xl">
                      {test.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-gray-600 mb-6 text-sm">{test.description}</p>
                    
                    <Button 
                      className={`w-full ${colors[index]} hover:opacity-90 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200`}
                    >
                      Start Learning
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Personalized Learning Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-green-50 to-yellow-50">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <div className="bg-white rounded-3xl p-8 shadow-2xl border-4 border-yellow-400 transform -rotate-2 hover:rotate-0 transition-transform duration-300">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Star className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">Personalized Learning</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Speaking Practice</span>
                    <div className="flex gap-1">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-gray-200 rounded-full"></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Grammar Skills</span>
                    <div className="flex gap-1">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-gray-200 rounded-full"></div>
                      <div className="w-3 h-3 bg-gray-200 rounded-full"></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Reading Speed</span>
                    <div className="flex gap-1">
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2 text-center lg:text-left">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-800">
                Personalized learning
              </h2>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Combine the best of AI and language science to create personalized 
                lessons that adapt to your level and learning style. Our AI tracks 
                your progress and adjusts difficulty in real-time.
              </p>
              <Button 
                size="lg"
                onClick={() => navigate('/ielts-portal')}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-8 py-4 text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 rounded-2xl"
              >
                Start Learning
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Community Section */}
      <section id="community" className="py-20 px-4 bg-white">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-800">
            Join our global community
          </h2>
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
            Connect with millions of learners worldwide. Practice together, 
            share tips, and celebrate achievements.
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {[{
              title: "IELTS Learners",
              members: "2.5M+",
              color: "bg-green-500",
              lightColor: "bg-green-50"
            }, {
              title: "PTE Community", 
              members: "850K+",
              color: "bg-blue-500",
              lightColor: "bg-blue-50"
            }, {
              title: "TOEFL Group",
              members: "1.2M+",
              color: "bg-purple-500", 
              lightColor: "bg-purple-50"
            }, {
              title: "General English",
              members: "3.1M+",
              color: "bg-orange-500",
              lightColor: "bg-orange-50"
            }].map((group, index) => (
              <Card key={index} className="bg-white border-2 border-gray-100 hover:shadow-lg transition-all">
                <CardContent className="pt-6 text-center">
                  <div className={`w-12 h-12 ${group.color} rounded-xl flex items-center justify-center mx-auto mb-4`}>
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-gray-800 font-bold mb-2">{group.title}</h3>
                  <p className="text-gray-600 text-2xl font-bold">{group.members}</p>
                  <p className="text-gray-500 text-sm">active learners</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Button 
            size="lg" 
            onClick={() => navigate('/community')} 
            className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-4 text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 rounded-2xl"
          >
            Join the Community
          </Button>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-indigo-600 to-purple-700">
        <div className="container mx-auto text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
              Start your English journey today
            </h2>
            <p className="text-xl text-indigo-100 mb-8">
              Join millions of learners using EnglishAI to reach their goals. 
              It's fun, it's effective, and it's free.
            </p>
            
            <Button 
              size="lg" 
              onClick={handleAuthAction} 
              className="bg-green-500 hover:bg-green-600 text-white px-12 py-6 text-xl font-bold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 rounded-2xl"
            >
              Get Started
            </Button>

            <p className="text-sm text-indigo-200 mt-6">
              Free • Fun • Effective
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-gray-900 text-white">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold">EnglishAI</span>
              </div>
              <p className="text-gray-400 text-sm">
                The fun, effective way to learn English with AI-powered lessons.
              </p>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-3">Tests</h4>
              <div className="space-y-2 text-sm text-gray-400">
                <button onClick={() => navigate('/ielts-portal')} className="block hover:text-white transition-colors">IELTS</button>
                <button onClick={() => navigate('/pte-portal')} className="block hover:text-white transition-colors">PTE Academic</button>
                <button onClick={() => navigate('/toefl-portal')} className="block hover:text-white transition-colors">TOEFL iBT</button>
                <button onClick={() => navigate('/general-portal')} className="block hover:text-white transition-colors">General English</button>
              </div>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-3">Features</h4>
              <div className="space-y-2 text-sm text-gray-400">
                <div className="hover:text-white transition-colors cursor-pointer">AI Feedback</div>
                <div className="hover:text-white transition-colors cursor-pointer">Progress Tracking</div>
                <button onClick={() => navigate('/community')} className="block hover:text-white transition-colors">Community</button>
                <div className="hover:text-white transition-colors cursor-pointer">Daily Practice</div>
              </div>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-3">Support</h4>
              <div className="space-y-2 text-sm text-gray-400">
                <div className="hover:text-white transition-colors cursor-pointer">Help Center</div>
                <button onClick={() => navigate('/community')} className="block hover:text-white transition-colors">Contact</button>
                <div className="hover:text-white transition-colors cursor-pointer">Privacy</div>
                <div className="hover:text-white transition-colors cursor-pointer">Terms</div>
              </div>
            </div>
          </div>
          
          <div className="text-center pt-8 border-t border-gray-800">
            <p className="text-gray-400 text-sm">
              © 2024 EnglishAI. Made with ❤️ for language learners worldwide.
            </p>
          </div>
        </div>
      </footer>
      
      {/* AI Chatbot */}
      <MinimalisticChatbot 
        selectedLanguage={selectedLanguage}
        onLanguageChange={setSelectedLanguage}
      />
    </div>;
};
export default HeroIndex;