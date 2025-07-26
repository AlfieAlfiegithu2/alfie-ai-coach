import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Headphones, PenTool, Mic, ArrowLeft, Clock, Target, Zap, Star } from "lucide-react";
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
    if (newSections.has(section)) {
      newSections.delete(section);
    } else {
      newSections.add(section);
    }
    setSelectedSections(newSections);
  };

  const handleStartTest = () => {
    if (selectedSections.size === 0) return;
    
    if (selectedSections.size === 1) {
      const section = Array.from(selectedSections)[0];
      navigate(`/${section}/random`);
    } else {
      // Start full test with selected sections
      navigate("/reading/random", { state: { sections: Array.from(selectedSections), mode: testMode } });
    }
  };

  const handleIndividualTest = (sectionId: string) => {
    navigate(`/${sectionId}/random`);
  };

  // Test Configuration View
  if (selectedTest) {
    return (
      <StudentLayout title={`Cambridge IELTS ${selectedTest.version} - Test ${selectedTest.testNumber}`} showBackButton={false}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <Button 
              variant="ghost" 
              onClick={() => setSelectedTest(null)}
              className="mb-6 hover:bg-gentle-blue/10 rounded-xl"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Test Selection
            </Button>
            <div className="mb-4">
              <h1 className="text-4xl font-georgia font-bold text-foreground mb-2">
                Cambridge IELTS {selectedTest.version}
              </h1>
              <p className="text-xl text-warm-gray">Test {selectedTest.testNumber} Configuration</p>
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
                  className={`cursor-pointer transition-all duration-300 rounded-2xl border-2 ${
                    testMode === 'practice' 
                      ? 'border-gentle-blue shadow-lg scale-105' 
                      : 'border-light-border hover:border-gentle-blue/50 hover:scale-102'
                  }`}
                  onClick={() => setTestMode('practice')}
                  style={{ background: testMode === 'practice' ? 'var(--gradient-button)' : 'var(--gradient-card)' }}
                >
                  <CardContent className="p-8 text-center">
                    <Target className={`w-12 h-12 mx-auto mb-4 ${testMode === 'practice' ? 'text-white' : 'text-gentle-blue'}`} />
                    <h3 className={`text-xl font-semibold mb-3 ${testMode === 'practice' ? 'text-white' : 'text-foreground'}`}>
                      Practice Mode
                    </h3>
                    <p className={`text-sm leading-relaxed ${testMode === 'practice' ? 'text-white/90' : 'text-warm-gray'}`}>
                      Take your time, get instant feedback, and learn at your own pace. Perfect for building confidence.
                    </p>
                  </CardContent>
                </Card>

                <Card 
                  className={`cursor-pointer transition-all duration-300 rounded-2xl border-2 ${
                    testMode === 'simulation' 
                      ? 'border-gentle-blue shadow-lg scale-105' 
                      : 'border-light-border hover:border-gentle-blue/50 hover:scale-102'
                  }`}
                  onClick={() => setTestMode('simulation')}
                  style={{ background: testMode === 'simulation' ? 'var(--gradient-button)' : 'var(--gradient-card)' }}
                >
                  <CardContent className="p-8 text-center">
                    <Zap className={`w-12 h-12 mx-auto mb-4 ${testMode === 'simulation' ? 'text-white' : 'text-gentle-blue'}`} />
                    <h3 className={`text-xl font-semibold mb-3 ${testMode === 'simulation' ? 'text-white' : 'text-foreground'}`}>
                      Simulation Mode
                    </h3>
                    <p className={`text-sm leading-relaxed ${testMode === 'simulation' ? 'text-white/90' : 'text-warm-gray'}`}>
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
              <p className="text-warm-gray text-center">Choose which sections to include in your test experience</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sections.map((section) => {
                  const Icon = section.icon;
                  const isSelected = selectedSections.has(section.id);
                  return (
                    <Card
                      key={section.id}
                      className={`cursor-pointer transition-all duration-300 rounded-2xl border-2 ${
                        isSelected 
                          ? 'border-gentle-blue shadow-lg scale-105' 
                          : 'border-light-border hover:border-gentle-blue/50 hover:scale-102'
                      }`}
                      onClick={() => toggleSection(section.id)}
                      style={{ background: isSelected ? 'var(--gradient-button)' : 'var(--gradient-card)' }}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-center space-x-4">
                          <div 
                            className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                              isSelected ? 'bg-white/20' : 'bg-gentle-blue/10'
                            }`}
                          >
                            <Icon className={`w-7 h-7 ${isSelected ? 'text-white' : 'text-gentle-blue'}`} />
                          </div>
                          <div className="flex-1">
                            <h4 className={`text-lg font-semibold mb-1 ${isSelected ? 'text-white' : 'text-foreground'}`}>
                              {section.name}
                            </h4>
                            <p className={`text-sm flex items-center ${isSelected ? 'text-white/90' : 'text-warm-gray'}`}>
                              <Clock className="w-4 h-4 mr-1" />
                              {section.description}
                            </p>
                          </div>
                          {isSelected && (
                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                              <div className="w-3 h-3 rounded-full bg-gentle-blue"></div>
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
              className="w-full max-w-md h-16 text-lg font-semibold rounded-2xl transition-all duration-300 hover:scale-105"
              style={{ 
                background: selectedSections.size > 0 ? 'var(--gradient-button)' : 'var(--warm-gray)', 
                border: 'none' 
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
          <h1 className="text-5xl font-georgia font-bold text-foreground mb-6">
            Cambridge IELTS Tests
          </h1>
          <p className="text-xl text-warm-gray max-w-3xl mx-auto leading-relaxed">
            Practice with authentic Cambridge materials from C20 (latest) to C1 (classic). 
            Experience the real test environment with our modern, intuitive interface.
          </p>
        </div>

        {/* Cambridge Tests Grid */}
        <div className="mb-16">
          <h2 className="text-3xl font-georgia font-bold text-center text-foreground mb-8">
            Select Your Cambridge Book
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {cambridgeTests.map((cambridge) => (
              <div key={cambridge.version} className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-georgia font-bold text-foreground mb-2">
                    Cambridge {cambridge.number}
                  </h3>
                  <Badge variant="outline" className="text-xs">
                    {cambridge.number >= 17 ? 'Latest' : cambridge.number >= 10 ? 'Popular' : 'Classic'}
                  </Badge>
                </div>
                <div className="space-y-3">
                  {cambridge.tests.map((testNumber) => (
                    <Card 
                      key={`${cambridge.version}-${testNumber}`}
                      className="cursor-pointer transition-all duration-300 rounded-2xl border-light-border shadow-soft hover:shadow-lg hover:scale-105"
                      onClick={() => setSelectedTest({ version: cambridge.version, testNumber, number: cambridge.number })}
                      style={{ background: 'var(--gradient-card)' }}
                    >
                      <CardContent className="p-6">
                        <div 
                          className="rounded-xl p-4 mb-4 text-center"
                          style={{ background: 'var(--gradient-button)' }}
                        >
                          <div className="text-white text-lg font-bold mb-1">IELTS</div>
                          <div className="text-white/90 text-sm font-medium">
                            {cambridge.version}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-foreground mb-2 text-lg">Test {testNumber}</div>
                          <div className="text-sm text-warm-gray">4 Sections Available</div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
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
                    className="cursor-pointer transition-all duration-300 rounded-2xl border-light-border hover:border-gentle-blue/30 hover:scale-105"
                    onClick={() => handleIndividualTest(section.id)}
                    style={{ background: 'white' }}
                  >
                    <CardContent className="p-8 text-center">
                      <div 
                        className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-6"
                        style={{ background: 'var(--gradient-button)' }}
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