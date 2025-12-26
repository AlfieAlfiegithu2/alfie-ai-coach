import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Headphones, PenTool, Mic, ArrowLeft, Clock, Target, Zap, Star, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import StudentLayout from "@/components/StudentLayout";

const TestSelection = () => {
  const navigate = useNavigate();
  const [selectedTest, setSelectedTest] = useState<any>(null);
  const [testMode, setTestMode] = useState("practice"); // "practice" or "simulation"
  const [selectedSections, setSelectedSections] = useState(new Set(["listening", "reading", "writing", "speaking"]));

  // Generate Cambridge tests from C20 to C1 (as requested)
  const cambridgeTests = Array.from({ length: 20 }, (_, i) => ({
    version: `C${20 - i}`,
    number: 20 - i,
    tests: [1, 2, 3, 4]
  }));

  const sections = [
    {
      id: "listening",
      name: "Listening",
      icon: Headphones,
      description: "30 minutes",
      color: "from-blue-400 to-blue-600"
    },
    {
      id: "reading",
      name: "Reading",
      icon: BookOpen,
      description: "60 minutes",
      color: "from-green-400 to-green-600"
    },
    {
      id: "writing",
      name: "Writing",
      icon: PenTool,
      description: "60 minutes",
      color: "from-purple-400 to-purple-600"
    },
    {
      id: "speaking",
      name: "Speaking",
      icon: Mic,
      description: "11-14 minutes",
      color: "from-orange-400 to-orange-600"
    }
  ];

  const toggleSection = (section: string) => {
    const newSections = new Set(selectedSections);

    if (testMode === 'practice') {
      // Practice mode: only allow one section at a time
      if (newSections.has(section)) {
        newSections.delete(section);
      } else {
        newSections.clear(); // Clear all other selections
        newSections.add(section);
      }
    } else {
      // Simulation mode: allow multiple sections
      if (newSections.has(section)) {
        newSections.delete(section);
      } else {
        newSections.add(section);
      }
    }

    setSelectedSections(newSections);
  };

  const handleStartTest = () => {
    if (selectedSections.size === 0) return;

    if (testMode === 'practice') {
      // Practice mode: only allow one section at a time
      if (selectedSections.size === 1) {
        const section = Array.from(selectedSections)[0];
        navigate(`/${section}/random`);
      } else {
        // Force single selection for practice mode
        const firstSection = Array.from(selectedSections)[0];
        navigate(`/${firstSection}/random`);
      }
    } else {
      // Simulation mode: allow multiple sections (full test)
      if (selectedSections.size === 1) {
        const section = Array.from(selectedSections)[0];
        navigate(`/${section}/random`);
      } else {
        // Start full test with all selected sections
        navigate("/reading/random", { state: { sections: Array.from(selectedSections), mode: testMode } });
      }
    }
  };

  const handleIndividualTest = (sectionId: string) => {
    navigate(`/${sectionId}/random`);
  };

  // Test Configuration View - Enhanced
  if (selectedTest) {
    return (
      <StudentLayout title={`Cambridge IELTS ${selectedTest.version}`} showBackButton={false}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <Button
              variant="ghost"
              onClick={() => setSelectedTest(null)}
              className="mb-8 hover-lift text-text-secondary"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Book Selection
            </Button>

            <div className="mb-8">
              <h1 className="text-heading-1 mb-4">
                Cambridge IELTS {selectedTest.number}
              </h1>
              <p className="text-body-large mb-6">
                Select your test and configuration to begin your IELTS practice
              </p>

              {/* Test Selection Pills */}
              <div className="flex justify-center gap-3 mb-8">
                {Array.from({ length: 4 }, (_, i) => i + 1).map((testNum) => (
                  <Button
                    key={testNum}
                    variant={selectedTest.testNumber === testNum ? "default" : "outline"}
                    onClick={() => setSelectedTest({ ...selectedTest, testNumber: testNum })}
                    className="rounded-2xl px-6 py-3"
                  >
                    Test {testNum}
                  </Button>
                ))}
              </div>

              <Badge variant="secondary" className="text-sm px-4 py-2">
                Currently configuring: Test {selectedTest.testNumber}
              </Badge>
            </div>
          </div>

          {/* Test Mode Selection */}
          <Card className="mb-8 rounded-2xl border-light-border shadow-soft" style={{ background: 'var(--gradient-card)' }}>
            <CardHeader>
              <CardTitle className="text-2xl font-georgia text-center">Choose Your Test Mode</CardTitle>
              <p className="text-warm-gray text-center">Select how you want to experience this test</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card
                  className={`cursor-pointer transition-all duration-300 rounded-2xl border-2 ${testMode === 'practice'
                      ? 'border-black shadow-lg scale-105 bg-white'
                      : 'border-light-border hover:border-black/50 hover:scale-102 bg-white'
                    }`}
                  onClick={() => setTestMode('practice')}
                >
                  <CardContent className="p-8 text-center">
                    <Target className={`w-12 h-12 mx-auto mb-4 ${testMode === 'practice' ? 'text-black' : 'text-gentle-blue'}`} />
                    <h3 className={`text-xl font-semibold mb-3 ${testMode === 'practice' ? 'text-black' : 'text-foreground'}`}>
                      Practice Mode
                    </h3>
                    <p className={`text-sm leading-relaxed ${testMode === 'practice' ? 'text-black/90' : 'text-warm-gray'}`}>
                      Take your time, get instant feedback, and learn at your own pace. Perfect for building confidence.
                    </p>
                  </CardContent>
                </Card>

                <Card
                  className={`cursor-pointer transition-all duration-300 rounded-2xl border-2 ${testMode === 'simulation'
                      ? 'border-black shadow-lg scale-105 bg-white'
                      : 'border-light-border hover:border-black/50 hover:scale-102 bg-white'
                    }`}
                  onClick={() => setTestMode('simulation')}
                >
                  <CardContent className="p-8 text-center">
                    <Zap className={`w-12 h-12 mx-auto mb-4 ${testMode === 'simulation' ? 'text-black' : 'text-gentle-blue'}`} />
                    <h3 className={`text-xl font-semibold mb-3 ${testMode === 'simulation' ? 'text-black' : 'text-foreground'}`}>
                      Simulation Mode
                    </h3>
                    <p className={`text-sm leading-relaxed ${testMode === 'simulation' ? 'text-black/90' : 'text-warm-gray'}`}>
                      Real test conditions with strict timing and authentic experience. Test your readiness.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* Section Selection */}
          <Card className="mb-8 rounded-2xl border-light-border shadow-soft" style={{ background: 'var(--gradient-card)' }}>
            <CardHeader>
              <CardTitle className="text-2xl font-georgia text-center">Select Test Sections</CardTitle>
              <p className="text-warm-gray text-center">
                {testMode === 'practice'
                  ? 'Choose ONE section for focused practice'
                  : 'Choose sections for full test simulation'
                }
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sections.map((section) => {
                  const Icon = section.icon;
                  const isSelected = selectedSections.has(section.id);
                  return (
                    <Card
                      key={section.id}
                      className={`cursor-pointer transition-all duration-300 rounded-2xl border-2 bg-white/80 hover:shadow-lg hover:scale-105 ${isSelected
                          ? 'border-black shadow-lg scale-105'
                          : 'border-white/20'
                        }`}
                      onClick={() => toggleSection(section.id)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-center space-x-4">
                          <div
                            className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isSelected ? 'bg-black/10' : 'bg-gentle-blue/10'
                              }`}
                          >
                            <Icon className={`w-7 h-7 ${isSelected ? 'text-black' : 'text-gentle-blue'}`} />
                          </div>
                          <div className="flex-1">
                            <h4 className={`text-lg font-semibold mb-1 ${isSelected ? 'text-black' : 'text-foreground'}`}>
                              {section.name}
                            </h4>
                            <p className={`text-sm flex items-center ${isSelected ? 'text-black/90' : 'text-warm-gray'}`}>
                              <Clock className="w-4 h-4 mr-1" />
                              {section.description}
                            </p>
                          </div>
                          {isSelected && (
                            <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center">
                              <div className="w-3 h-3 rounded-full bg-white"></div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Start Test Button */}
          <div className="text-center">
            <Button
              onClick={handleStartTest}
              disabled={selectedSections.size === 0}
              className="w-full max-w-md h-16 text-lg font-semibold rounded-2xl transition-all duration-300 hover:scale-105 bg-white text-black border-2 border-black hover:bg-black hover:text-white"
              style={{
                border: selectedSections.size > 0 ? '2px solid black' : '2px solid #d1d5db',
                background: selectedSections.size > 0 ? 'white' : '#f3f4f6',
                color: selectedSections.size > 0 ? 'black' : '#9ca3af'
              }}
            >
              <Star className="w-5 h-5 mr-2" />
              Start {selectedSections.size === 1 ? Array.from(selectedSections)[0] : 'Full'} Test
            </Button>

            {selectedSections.size === 0 && (
              <p className="text-center text-warm-gray text-sm mt-4">
                Please select at least one section to continue
              </p>
            )}
          </div>
        </div>
      </StudentLayout>
    );
  }

  // Main Test Selection View
  return (
    <StudentLayout title="Cambridge IELTS Practice Tests" showBackButton={false}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4 px-4 py-1 text-brand-blue border-brand-blue/20">
            IELTS MODULE
          </Badge>
          <h1 className="text-5xl font-georgia font-bold text-foreground mb-6">
            Cambridge IELTS Tests
          </h1>
          <p className="text-xl text-warm-gray max-w-3xl mx-auto leading-relaxed">
            Practice with authentic Cambridge materials from C20 (latest) to C1 (classic).
            Experience the real test environment with our modern, intuitive interface.
          </p>
        </div>

        {/* Cambridge Books - Horizontal Scrolling Cards */}
        <div className="mb-16">
          <h2 className="text-heading-2 text-center mb-8">
            Select Your Cambridge Book
          </h2>
          <p className="text-body text-center mb-8 max-w-2xl mx-auto">
            Choose from Cambridge 20 (latest) to Cambridge 1 (classic). Each book contains 4 complete practice tests.
          </p>

          {/* Horizontal scrolling book cards */}
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-6 min-w-max px-4">
              {cambridgeTests.map((cambridge) => (
                <Card
                  key={cambridge.version}
                  className="cursor-pointer transition-all duration-300 rounded-3xl border-border 
                           hover:shadow-xl hover:scale-105 flex-shrink-0 w-64"
                  onClick={() => setSelectedTest({ version: cambridge.version, testNumber: 1, number: cambridge.number })}
                  style={{ background: 'var(--gradient-card)' }}
                >
                  <CardContent className="p-8 text-center">
                    <div className="mb-6">
                      <div
                        className="w-20 h-20 rounded-2xl mx-auto flex items-center justify-center mb-4"
                        style={{ background: 'var(--gradient-hero)' }}
                      >
                        <BookOpen className="w-10 h-10 text-white" />
                      </div>
                      <h3 className="text-2xl font-display font-bold text-text-primary mb-2">
                        Cambridge {cambridge.number}
                      </h3>
                      <Badge
                        variant={cambridge.number >= 17 ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {cambridge.number >= 17 ? 'Latest' : cambridge.number >= 10 ? 'Popular' : 'Classic'}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <p className="text-text-secondary text-sm">4 Complete Tests</p>
                      <p className="text-text-secondary text-xs">
                        All sections: Reading, Listening, Writing, Speaking
                      </p>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-4 w-full text-brand-blue hover:bg-brand-blue/10"
                    >
                      Select Book
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="text-center mt-8">
            <p className="text-caption">
              Swipe or scroll horizontally to view all available books
            </p>
          </div>
        </div>

        {/* Quick Practice Section */}
        <Card className="rounded-2xl border-light-border shadow-soft" style={{ background: 'var(--gradient-card)' }}>
          <CardHeader>
            <CardTitle className="text-3xl font-georgia text-center text-foreground">
              Quick Practice
            </CardTitle>
            <p className="text-warm-gray text-center text-lg">
              Jump into individual sections for focused skill building
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <Card
                    key={section.id}
                    className="cursor-pointer transition-all duration-300 rounded-2xl border-white/20 hover:shadow-lg hover:scale-105 bg-white/80"
                    onClick={() => handleIndividualTest(section.id)}
                  >
                    <CardContent className="p-8 text-center">
                      <div
                        className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-6 bg-black border-2 border-black"
                      >
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                      <h4 className="font-semibold text-foreground text-lg mb-3">{section.name}</h4>
                      <p className="text-sm text-warm-gray flex items-center justify-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {section.description}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  );
};

export default TestSelection;