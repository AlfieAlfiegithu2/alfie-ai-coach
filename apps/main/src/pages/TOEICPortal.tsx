import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Headphones, 
  BookOpen, 
  Clock, 
  Target, 
  Trophy,
  ArrowRight,
  CheckCircle,
  Play
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useThemeStyles } from '@/hooks/useThemeStyles';

interface TOEICTest {
  id: string;
  test_name: string;
  skill_category: string;
  created_at: string;
}

const TOEICPortal = () => {
  const navigate = useNavigate();
  const themeStyles = useThemeStyles();
  const isNoteTheme = themeStyles.theme.name === 'note';
  
  const [listeningTests, setListeningTests] = useState<TOEICTest[]>([]);
  const [readingTests, setReadingTests] = useState<TOEICTest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTests();
  }, []);

  const loadTests = async () => {
    try {
      // Load Listening tests
      const { data: listening, error: listeningError } = await supabase
        .from('tests')
        .select('*')
        .eq('test_type', 'TOEIC')
        .eq('skill_category', 'Listening')
        .order('created_at', { ascending: false });

      if (listeningError) throw listeningError;
      setListeningTests(listening || []);

      // Load Reading tests
      const { data: reading, error: readingError } = await supabase
        .from('tests')
        .select('*')
        .eq('test_type', 'TOEIC')
        .eq('skill_category', 'Reading')
        .order('created_at', { ascending: false });

      if (readingError) throw readingError;
      setReadingTests(reading || []);
    } catch (error) {
      console.error('Error loading tests:', error);
      toast.error('Failed to load tests');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className={`min-h-screen ${isNoteTheme ? 'font-serif' : 'bg-gradient-to-br from-orange-50 via-white to-amber-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950'}`}
      style={isNoteTheme ? { backgroundColor: themeStyles.theme.colors.background } : undefined}
    >
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <Badge 
            className={`mb-4 ${isNoteTheme ? '' : 'bg-orange-100 text-orange-700 hover:bg-orange-200'}`}
            style={isNoteTheme ? { backgroundColor: 'transparent', border: `1px solid ${themeStyles.border}`, color: themeStyles.textSecondary } : undefined}
          >
            TOEIC Practice
          </Badge>
          <h1 
            className={`text-4xl md:text-5xl font-bold mb-4 ${isNoteTheme ? '' : 'bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent'}`}
            style={{ color: themeStyles.textPrimary }}
          >
            TOEIC Test Portal
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Practice for the Test of English for International Communication with realistic test simulations
          </p>
        </div>

        {/* TOEIC Overview */}
        <Card 
          className={`mb-8 ${isNoteTheme ? '' : 'bg-gradient-to-r from-orange-500 to-amber-500 text-white'} border-none`}
          style={isNoteTheme ? { backgroundColor: themeStyles.theme.colors.cardBackground, border: `1px solid ${themeStyles.border}`, color: themeStyles.textPrimary } : undefined}
        >
          <CardContent className="p-6">
            <div className="grid md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold">200</div>
                <div className={`text-sm ${isNoteTheme ? 'text-muted-foreground' : 'opacity-90'}`}>Total Questions</div>
              </div>
              <div>
                <div className="text-3xl font-bold">2hr</div>
                <div className={`text-sm ${isNoteTheme ? 'text-muted-foreground' : 'opacity-90'}`}>Test Duration</div>
              </div>
              <div>
                <div className="text-3xl font-bold">7</div>
                <div className={`text-sm ${isNoteTheme ? 'text-muted-foreground' : 'opacity-90'}`}>Parts</div>
              </div>
              <div>
                <div className="text-3xl font-bold">990</div>
                <div className={`text-sm ${isNoteTheme ? 'text-muted-foreground' : 'opacity-90'}`}>Max Score</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test Structure Overview */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Listening Section */}
          <Card 
            className={`hover:shadow-lg transition-shadow ${isNoteTheme ? '' : 'border-l-4 border-l-blue-500'}`}
            style={{ backgroundColor: themeStyles.theme.colors.cardBackground, borderColor: themeStyles.border }}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2" style={{ color: themeStyles.textPrimary }}>
                {!isNoteTheme && <Headphones className="w-6 h-6 text-blue-500" />}
                Listening Section
              </CardTitle>
              <CardDescription>45 minutes • 100 questions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: themeStyles.border }}>
                  <span style={{ color: themeStyles.textPrimary }}>Part 1: Photos</span>
                  <Badge variant="outline" style={{ borderColor: themeStyles.border, color: themeStyles.textSecondary }}>6 Q</Badge>
                </div>
                <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: themeStyles.border }}>
                  <span style={{ color: themeStyles.textPrimary }}>Part 2: Question-Response</span>
                  <Badge variant="outline" style={{ borderColor: themeStyles.border, color: themeStyles.textSecondary }}>25 Q</Badge>
                </div>
                <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: themeStyles.border }}>
                  <span style={{ color: themeStyles.textPrimary }}>Part 3: Conversations</span>
                  <Badge variant="outline" style={{ borderColor: themeStyles.border, color: themeStyles.textSecondary }}>39 Q</Badge>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span style={{ color: themeStyles.textPrimary }}>Part 4: Talks</span>
                  <Badge variant="outline" style={{ borderColor: themeStyles.border, color: themeStyles.textSecondary }}>30 Q</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reading Section */}
          <Card 
            className={`hover:shadow-lg transition-shadow ${isNoteTheme ? '' : 'border-l-4 border-l-green-500'}`}
            style={{ backgroundColor: themeStyles.theme.colors.cardBackground, borderColor: themeStyles.border }}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2" style={{ color: themeStyles.textPrimary }}>
                {!isNoteTheme && <BookOpen className="w-6 h-6 text-green-500" />}
                Reading Section
              </CardTitle>
              <CardDescription>75 minutes • 100 questions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: themeStyles.border }}>
                  <span style={{ color: themeStyles.textPrimary }}>Part 5: Incomplete Sentences</span>
                  <Badge variant="outline" style={{ borderColor: themeStyles.border, color: themeStyles.textSecondary }}>40 Q</Badge>
                </div>
                <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: themeStyles.border }}>
                  <span style={{ color: themeStyles.textPrimary }}>Part 6: Text Completion</span>
                  <Badge variant="outline" style={{ borderColor: themeStyles.border, color: themeStyles.textSecondary }}>12 Q</Badge>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span style={{ color: themeStyles.textPrimary }}>Part 7: Reading Comprehension</span>
                  <Badge variant="outline" style={{ borderColor: themeStyles.border, color: themeStyles.textSecondary }}>48 Q</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Available Tests */}
        <div className="space-y-8">
          {/* Listening Tests */}
          <div>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2" style={{ color: themeStyles.textPrimary }}>
              {!isNoteTheme && <Headphones className="w-6 h-6 text-blue-500" />}
              Listening Tests
            </h2>
            {loading ? (
              <div className="grid md:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <Card key={i} className="animate-pulse" style={{ backgroundColor: themeStyles.theme.colors.cardBackground, borderColor: themeStyles.border }}>
                    <CardContent className="p-6">
                      <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : listeningTests.length > 0 ? (
              <div className="grid md:grid-cols-3 gap-4">
                {listeningTests.map((test) => (
                  <Card 
                    key={test.id} 
                    className={`hover:shadow-lg transition-all cursor-pointer ${isNoteTheme ? '' : 'border-l-4 border-l-blue-500'}`}
                    style={{ backgroundColor: themeStyles.theme.colors.cardBackground, borderColor: themeStyles.border }}
                    onClick={() => navigate(`/toeic/listening/${test.id}`)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold" style={{ color: themeStyles.textPrimary }}>{test.test_name}</h3>
                          <p className="text-sm text-muted-foreground">Parts 1-4</p>
                        </div>
                        <Badge variant="secondary" style={{ borderColor: themeStyles.border, color: themeStyles.textSecondary }}>100 Q</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          {!isNoteTheme && <Clock className="w-4 h-4" />}
                          {isNoteTheme && <span>Time:</span>}
                          45 min
                        </span>
                        <Button size="sm" className={isNoteTheme ? '' : "bg-blue-500 hover:bg-blue-600"} style={isNoteTheme ? { backgroundColor: themeStyles.theme.colors.buttonPrimary } : undefined}>
                          {!isNoteTheme && <Play className="w-4 h-4 mr-1" />}
                          Start
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-dashed" style={{ backgroundColor: themeStyles.theme.colors.cardBackground, borderColor: themeStyles.border }}>
                <CardContent className="p-8 text-center text-muted-foreground">
                  {!isNoteTheme && <Headphones className="w-12 h-12 mx-auto mb-4 opacity-50" />}
                  <p>No listening tests available yet.</p>
                  <p className="text-sm">Check back later for practice tests.</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Reading Tests */}
          <div>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2" style={{ color: themeStyles.textPrimary }}>
              {!isNoteTheme && <BookOpen className="w-6 h-6 text-green-500" />}
              Reading Tests
            </h2>
            {loading ? (
              <div className="grid md:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <Card key={i} className="animate-pulse" style={{ backgroundColor: themeStyles.theme.colors.cardBackground, borderColor: themeStyles.border }}>
                    <CardContent className="p-6">
                      <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : readingTests.length > 0 ? (
              <div className="grid md:grid-cols-3 gap-4">
                {readingTests.map((test) => (
                  <Card 
                    key={test.id} 
                    className={`hover:shadow-lg transition-all cursor-pointer ${isNoteTheme ? '' : 'border-l-4 border-l-green-500'}`}
                    style={{ backgroundColor: themeStyles.theme.colors.cardBackground, borderColor: themeStyles.border }}
                    onClick={() => navigate(`/toeic/reading/${test.id}`)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold" style={{ color: themeStyles.textPrimary }}>{test.test_name}</h3>
                          <p className="text-sm text-muted-foreground">Parts 5-7</p>
                        </div>
                        <Badge variant="secondary" style={{ borderColor: themeStyles.border, color: themeStyles.textSecondary }}>100 Q</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          {!isNoteTheme && <Clock className="w-4 h-4" />}
                          {isNoteTheme && <span>Time:</span>}
                          75 min
                        </span>
                        <Button size="sm" className={isNoteTheme ? '' : "bg-green-500 hover:bg-green-600"} style={isNoteTheme ? { backgroundColor: themeStyles.theme.colors.buttonPrimary } : undefined}>
                          {!isNoteTheme && <Play className="w-4 h-4 mr-1" />}
                          Start
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-dashed" style={{ backgroundColor: themeStyles.theme.colors.cardBackground, borderColor: themeStyles.border }}>
                <CardContent className="p-8 text-center text-muted-foreground">
                  {!isNoteTheme && <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />}
                  <p>No reading tests available yet.</p>
                  <p className="text-sm">Check back later for practice tests.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Tips Section */}
        <Card 
          className={`mt-8 ${isNoteTheme ? '' : 'bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20'}`}
          style={{ backgroundColor: themeStyles.theme.colors.cardBackground, borderColor: themeStyles.border }}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={{ color: themeStyles.textPrimary }}>
              {!isNoteTheme && <Target className="w-5 h-5 text-orange-500" />}
              TOEIC Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                {!isNoteTheme && <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />}
                {isNoteTheme && <span style={{ color: themeStyles.textSecondary }}>•</span>}
                <div>
                  <h4 className="font-medium" style={{ color: themeStyles.textPrimary }}>Time Management</h4>
                  <p className="text-sm text-muted-foreground">Don't spend too long on difficult questions. Move on and come back if time permits.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                {!isNoteTheme && <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />}
                {isNoteTheme && <span style={{ color: themeStyles.textSecondary }}>•</span>}
                <div>
                  <h4 className="font-medium" style={{ color: themeStyles.textPrimary }}>Read All Options</h4>
                  <p className="text-sm text-muted-foreground">Always read all answer choices before selecting. The best answer may not be the first correct-looking one.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                {!isNoteTheme && <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />}
                {isNoteTheme && <span style={{ color: themeStyles.textSecondary }}>•</span>}
                <div>
                  <h4 className="font-medium" style={{ color: themeStyles.textPrimary }}>Listening Focus</h4>
                  <p className="text-sm text-muted-foreground">Read questions quickly before the audio plays to know what information to listen for.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                {!isNoteTheme && <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />}
                {isNoteTheme && <span style={{ color: themeStyles.textSecondary }}>•</span>}
                <div>
                  <h4 className="font-medium" style={{ color: themeStyles.textPrimary }}>Vocabulary Building</h4>
                  <p className="text-sm text-muted-foreground">Focus on business vocabulary and common expressions used in professional settings.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default TOEICPortal;