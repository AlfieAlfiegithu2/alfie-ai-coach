import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Zap, Heart, Users } from "lucide-react";
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
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [clickedCard, setClickedCard] = useState<number | null>(null);
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
    animal: "🦉",
    sections: ["Reading", "Listening", "Writing", "Speaking"]
  }, {
    title: "PTE Academic", 
    description: "Pearson Test of English Academic",
    path: "/pte-portal",
    animal: "🐨",
    sections: ["Reading", "Listening", "Writing", "Speaking"]
  }, {
    title: "TOEFL iBT",
    description: "Test of English as a Foreign Language", 
    path: "/toefl-portal",
    animal: "🦘",
    sections: ["Reading", "Listening", "Writing", "Speaking"]
  }, {
    title: "General English",
    description: "Daily English improvement lessons",
    path: "/general-portal", 
    animal: "🐼",
    sections: ["Vocabulary", "Grammar", "Conversation", "Practice"]
  }];
  const features = [{
    title: "Bite-sized lessons",
    description: "Learn English with short, fun lessons that fit into your daily routine.",
    animal: "🐰"
  }, {
    title: "AI-powered feedback", 
    description: "Get instant, personalized feedback that adapts to your learning style.",
    animal: "🦊"
  }, {
    title: "Track progress",
    description: "Stay motivated with achievements and progress tracking.",
    animal: "🐸"
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
      <section className="py-16 px-4 bg-gradient-to-br from-blue-50 to-purple-50 relative overflow-hidden">
        {/* Floating Animals Animation */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-10 animate-bounce" style={{animationDelay: '0s', animationDuration: '3s'}}>
            <span className="text-4xl">🦋</span>
          </div>
          <div className="absolute top-40 right-20 animate-bounce" style={{animationDelay: '1s', animationDuration: '4s'}}>
            <span className="text-3xl">🐝</span>
          </div>
          <div className="absolute bottom-40 left-20 animate-bounce" style={{animationDelay: '2s', animationDuration: '3.5s'}}>
            <span className="text-3xl">🐱</span>
          </div>
        </div>

        <div className="container mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <h1 className="text-4xl md:text-6xl font-bold mb-6 text-gray-800 leading-tight">
                <TypewriterText text="Learn English the fun way!" />
                <div className="inline-block ml-4 animate-pulse">🎉</div>
              </h1>
              
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Master English with your cute AI animal friends! 🐾 
                Fun, bite-sized lessons that make learning feel like playing.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
                <Button 
                  size="lg" 
                  onClick={() => {
                    setClickedCard(0);
                    setTimeout(() => navigate('/ielts-portal'), 300);
                  }}
                  className="bg-primary hover:bg-primary/90 text-white px-8 py-4 text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 rounded-2xl group"
                >
                  Start Learning <span className="ml-2 group-hover:animate-bounce">🚀</span>
                </Button>
                <Button 
                  size="lg" 
                  onClick={() => navigate('/auth')} 
                  variant="outline"
                  className="border-2 border-primary text-primary hover:bg-primary/5 px-8 py-4 text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 rounded-2xl"
                >
                  Sign In <Heart className="ml-2 w-5 h-5 inline" />
                </Button>
              </div>

              {/* Interactive Fun Fact */}
              <div 
                className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 cursor-pointer hover:bg-white/90 transition-all duration-300 hover:scale-105"
                onClick={() => toast({ title: "🎉 Fun Fact!", description: "Learning with animal friends increases retention by 40%!" })}
              >
                <div className="flex items-center justify-center lg:justify-start gap-2 text-primary font-medium">
                  <span className="animate-spin">🌟</span>
                  <span>Click for a fun learning fact!</span>
                  <span className="animate-pulse">✨</span>
                </div>
              </div>
            </div>

            <div className="relative">
              {/* Main Animal Animation */}
              <div className="text-center mb-8">
                <div className="text-8xl animate-bounce" style={{animationDuration: '2s'}}>
                  🦁
                </div>
                <p className="text-lg font-bold text-gray-700 mt-2">Leo, your AI Learning Buddy!</p>
              </div>

              {/* Interactive Learning Card */}
              <div 
                className="bg-white rounded-3xl p-6 shadow-2xl border-2 border-primary/20 hover:border-primary/40 transition-all duration-300 cursor-pointer group"
                onClick={() => toast({ title: "🎯 Let's Start!", description: "Choose a test below to begin your adventure!" })}
              >
                <div className="text-center">
                  <div className="text-4xl mb-4 group-hover:animate-spin transition-all duration-300">🎯</div>
                  <h3 className="font-bold text-gray-800 mb-2">Ready to Learn?</h3>
                  <p className="text-gray-600 text-sm mb-4">Pick your favorite animal friend below!</p>
                  <div className="flex justify-center gap-2">
                    <span className="animate-pulse">🐰</span>
                    <span className="animate-pulse" style={{animationDelay: '0.5s'}}>🦊</span>
                    <span className="animate-pulse" style={{animationDelay: '1s'}}>🐼</span>
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
              Learn with Animal Friends! <span className="animate-bounce inline-block">🎈</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Each feature comes with a cute animal companion to guide your learning journey
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="text-center group cursor-pointer"
                onMouseEnter={() => setHoveredCard(index)}
                onMouseLeave={() => setHoveredCard(null)}
                onClick={() => toast({ 
                  title: `${feature.animal} ${feature.title}`, 
                  description: "This feature makes learning super fun!" 
                })}
              >
                <div className={`relative mb-6 transition-all duration-300 ${hoveredCard === index ? 'scale-110' : ''}`}>
                  <div className="text-6xl mb-4 filter drop-shadow-lg">
                    {feature.animal}
                  </div>
                  {hoveredCard === index && (
                    <div className="absolute -top-2 -right-2 text-2xl animate-bounce">
                      ❤️
                    </div>
                  )}
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4 group-hover:text-primary transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
                {hoveredCard === index && (
                  <div className="mt-4 text-sm text-primary font-medium animate-pulse">
                    Click me! 🎉
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Test Modules Section */}
      <section id="tests" className="py-20 px-4 bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-800">
              Choose Your Learning Adventure! <span className="animate-pulse">🌟</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Each test type has its own adorable animal mascot to guide you through your journey
            </p>
          </div>

          {/* Test Types Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {testTypes.map((test, index) => (
              <Card 
                key={index} 
                className={`bg-white/80 backdrop-blur-sm border-2 border-gray-100 hover:border-primary/30 hover:shadow-xl transition-all cursor-pointer group transform hover:-translate-y-3 hover:scale-105 ${clickedCard === index ? 'animate-pulse' : ''}`}
                onClick={() => {
                  setClickedCard(index);
                  toast({ 
                    title: `${test.animal} Welcome!`, 
                    description: `Let's start your ${test.title} journey together!` 
                  });
                  setTimeout(() => navigate(test.path), 500);
                }}
                onMouseEnter={() => setHoveredCard(index)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <CardHeader className="text-center pb-6">
                  <div className="relative">
                    <div className={`text-6xl mb-4 transition-all duration-300 ${hoveredCard === index ? 'animate-bounce' : ''}`}>
                      {test.animal}
                    </div>
                    {hoveredCard === index && (
                      <div className="absolute top-0 right-6 text-xl animate-ping">
                        ✨
                      </div>
                    )}
                  </div>
                  <CardTitle className="text-gray-800 group-hover:text-primary transition-colors text-xl font-bold">
                    {test.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-gray-600 mb-6 text-sm leading-relaxed">{test.description}</p>
                  
                  <div className={`w-full bg-primary/5 hover:bg-primary/10 text-primary border-2 border-primary/20 hover:border-primary/40 font-bold py-3 rounded-xl transition-all duration-300 group-hover:shadow-lg ${hoveredCard === index ? 'animate-pulse' : ''}`}>
                    Start Adventure {hoveredCard === index ? '🚀' : '🎯'}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Personalized Learning Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-green-50 to-yellow-50 relative overflow-hidden">
        {/* Floating Hearts */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 left-1/4 animate-float" style={{animationDelay: '0s'}}>
            <span className="text-2xl">💚</span>
          </div>
          <div className="absolute top-20 right-1/4 animate-float" style={{animationDelay: '2s'}}>
            <span className="text-2xl">💙</span>
          </div>
          <div className="absolute bottom-20 left-1/3 animate-float" style={{animationDelay: '4s'}}>
            <span className="text-2xl">💜</span>
          </div>
        </div>

        <div className="container mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <div 
                className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border-2 border-primary/20 transition-all duration-500 hover:scale-105 cursor-pointer group"
                onClick={() => toast({ 
                  title: "🎉 Amazing Progress!", 
                  description: "Your animal friends are so proud of you!" 
                })}
              >
                <div className="text-center mb-6">
                  <div className="text-6xl mb-4 animate-bounce group-hover:animate-spin transition-all duration-300">
                    🏆
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">Your Learning Journey</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between group-hover:scale-105 transition-transform">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🗣️</span>
                      <span className="text-gray-700">Speaking with 🦜 Polly</span>
                    </div>
                    <div className="flex gap-1">
                      <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
                      <div className="w-3 h-3 bg-primary rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                      <div className="w-3 h-3 bg-primary rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                      <div className="w-3 h-3 bg-gray-200 rounded-full"></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between group-hover:scale-105 transition-transform">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">📚</span>
                      <span className="text-gray-700">Reading with 🐰 Bunny</span>
                    </div>
                    <div className="flex gap-1">
                      <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
                      <div className="w-3 h-3 bg-primary rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                      <div className="w-3 h-3 bg-gray-200 rounded-full"></div>
                      <div className="w-3 h-3 bg-gray-200 rounded-full"></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between group-hover:scale-105 transition-transform">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">✍️</span>
                      <span className="text-gray-700">Writing with 🦉 Ollie</span>
                    </div>
                    <div className="flex gap-1">
                      <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
                      <div className="w-3 h-3 bg-primary rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                      <div className="w-3 h-3 bg-primary rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                      <div className="w-3 h-3 bg-primary rounded-full animate-pulse" style={{animationDelay: '0.6s'}}></div>
                    </div>
                  </div>
                </div>
                <div className="mt-6 text-center text-sm text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Tap to celebrate! 🎉
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2 text-center lg:text-left">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-800">
                Learn with Your Animal Squad! <span className="animate-spin inline-block">🎪</span>
              </h2>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Our adorable AI animal friends create personalized lessons just for you! 
                Each animal has special powers to help you master different skills. 🌟
              </p>
              <Button 
                size="lg"
                onClick={() => {
                  toast({ title: "🚀 Adventure Time!", description: "Your animal friends are waiting!" });
                  setTimeout(() => navigate('/ielts-portal'), 500);
                }}
                className="bg-primary hover:bg-primary/90 text-white px-8 py-4 text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 rounded-2xl group"
              >
                Meet Your Squad <span className="ml-2 group-hover:animate-bounce">🐾</span>
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