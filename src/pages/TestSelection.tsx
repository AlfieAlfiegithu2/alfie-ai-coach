import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Headphones, PenTool, Mic, ArrowLeft, Clock, Target, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const TestSelection = () => {
  const navigate = useNavigate();
  const [selectedTest, setSelectedTest] = useState(null);
  const [testMode, setTestMode] = useState("practice"); // "practice" or "simulation"
  const [selectedSections, setSelectedSections] = useState(new Set(["listening", "reading", "writing", "speaking"]));

  // Generate Cambridge tests from C20 to C1
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
      navigate(`/${section}`);
    } else {
      // Start full test with selected sections
      navigate("/reading", { state: { sections: Array.from(selectedSections), mode: testMode } });
    }
  };

  const handleIndividualTest = (sectionId: string) => {
    navigate(`/${sectionId}`);
  };

  // Test Configuration View
  if (selectedTest) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--gradient-hero)' }}>
        <div className="container mx-auto px-6 py-8">
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <Button 
                variant="ghost" 
                onClick={() => setSelectedTest(null)}
                className="mb-4 hover:bg-gentle-blue/10 rounded-xl"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Test Selection
              </Button>
              <h1 className="text-3xl font-georgia font-bold text-foreground mb-2">
                Cambridge IELTS {selectedTest.version}
              </h1>
              <p className="text-warm-gray">Test {selectedTest.testNumber} Configuration</p>
            </div>

            {/* Test Mode Selection */}
            <Card 
              className="mb-8 rounded-2xl border-light-border shadow-soft"
              style={{ background: 'var(--gradient-card)' }}
            >
              <CardHeader>
                <CardTitle className="text-xl font-georgia text-center">Choose Your Mode</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card 
                    className={`cursor-pointer transition-all duration-200 rounded-xl border-2 ${testMode === 'practice' ? 'border-gentle-blue shadow-md' : 'border-light-border hover:border-gentle-blue/50'}`}
                    onClick={() => setTestMode('practice')}
                    style={{ background: testMode === 'practice' ? 'var(--gradient-button)' : 'var(--gradient-card)' }}
                  >
                    <CardContent className="p-6 text-center">
                      <Target className={`w-8 h-8 mx-auto mb-3 ${testMode === 'practice' ? 'text-white' : 'text-gentle-blue'}`} />
                      <h3 className={`font-semibold mb-2 ${testMode === 'practice' ? 'text-white' : 'text-foreground'}`}>Practice Mode</h3>
                      <p className={`text-sm ${testMode === 'practice' ? 'text-white/90' : 'text-warm-gray'}`}>
                        Take your time, get instant feedback, and learn at your own pace
                      </p>
                    </CardContent>
                  </Card>

                  <Card 
                    className={`cursor-pointer transition-all duration-200 rounded-xl border-2 ${testMode === 'simulation' ? 'border-gentle-blue shadow-md' : 'border-light-border hover:border-gentle-blue/50'}`}
                    onClick={() => setTestMode('simulation')}
                    style={{ background: testMode === 'simulation' ? 'var(--gradient-button)' : 'var(--gradient-card)' }}
                  >
                    <CardContent className="p-6 text-center">
                      <Zap className={`w-8 h-8 mx-auto mb-3 ${testMode === 'simulation' ? 'text-white' : 'text-gentle-blue'}`} />
                      <h3 className={`font-semibold mb-2 ${testMode === 'simulation' ? 'text-white' : 'text-foreground'}`}>Simulation Mode</h3>
                      <p className={`text-sm ${testMode === 'simulation' ? 'text-white/90' : 'text-warm-gray'}`}>
                        Real test conditions with strict timing and authentic experience
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>

            {/* Section Selection */}
            <Card 
              className="mb-8 rounded-2xl border-light-border shadow-soft"
              style={{ background: 'var(--gradient-card)' }}
            >
              <CardHeader>
                <CardTitle className="text-xl font-georgia text-center">Select Test Sections</CardTitle>
                <p className="text-warm-gray text-center">Choose which sections to include in your test</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sections.map((section) => {
                    const Icon = section.icon;
                    const isSelected = selectedSections.has(section.id);
                    return (
                      <Card
                        key={section.id}
                        className={`cursor-pointer transition-all duration-200 rounded-xl border-2 ${isSelected ? 'border-gentle-blue shadow-md' : 'border-light-border hover:border-gentle-blue/50'}`}
                        onClick={() => toggleSection(section.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-3">
                            <div 
                              className={`w-12 h-12 rounded-xl flex items-center justify-center ${isSelected ? 'text-white' : 'text-gentle-blue'}`}
                              style={{ 
                                background: isSelected 
                                  ? 'var(--gradient-button)' 
                                  : 'var(--gentle-blue-light)' 
                              }}
                            >
                              <Icon className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-foreground">{section.name}</h4>
                              <p className="text-sm text-warm-gray flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                {section.description}
                              </p>
                            </div>
                            {isSelected && (
                              <div className="w-6 h-6 rounded-full bg-soft-green flex items-center justify-center">
                                <div className="w-2 h-2 rounded-full bg-white"></div>
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
            <Button 
              onClick={handleStartTest}
              disabled={selectedSections.size === 0}
              className="w-full h-14 text-lg rounded-xl"
              style={{ background: 'var(--gradient-button)', border: 'none' }}
            >
              Start {selectedSections.size === 1 ? Array.from(selectedSections)[0] : 'Full'} Test
            </Button>

            {selectedSections.size === 0 && (
              <p className="text-center text-warm-gray text-sm mt-3">
                Please select at least one section to continue
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main Test Selection View
  return (
    <div className="min-h-screen" style={{ background: 'var(--gradient-hero)' }}>
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="mb-6 hover:bg-gentle-blue/10 rounded-xl"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
          <h1 className="text-4xl font-georgia font-bold text-foreground mb-4">
            Cambridge IELTS Tests
          </h1>
          <p className="text-xl text-warm-gray max-w-2xl mx-auto leading-relaxed">
            Practice with authentic Cambridge materials from the latest editions to the classics
          </p>
        </div>

        {/* Cambridge Tests Grid */}
        <div className="max-w-6xl mx-auto mb-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {cambridgeTests.map((cambridge) => (
              <div key={cambridge.version} className="space-y-3">
                <h3 className="text-lg font-georgia font-bold text-center text-foreground">
                  Cambridge {cambridge.number}
                </h3>
                <div className="space-y-3">
                  {cambridge.tests.map((testNumber) => (
                    <Card 
                      key={`${cambridge.version}-${testNumber}`}
                      className="cursor-pointer gentle-hover rounded-2xl border-light-border shadow-soft hover:shadow-medium transition-all duration-300"
                      onClick={() => setSelectedTest({ version: cambridge.version, testNumber, number: cambridge.number })}
                      style={{ background: 'var(--gradient-card)' }}
                    >
                      <CardContent className="p-4">
                        <div 
                          className="rounded-xl p-4 mb-3 text-center"
                          style={{ background: 'var(--gradient-button)' }}
                        >
                          <div className="text-white text-lg font-bold mb-1">IELTS</div>
                          <div className="text-white/90 text-sm font-medium">
                            {cambridge.version}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-foreground mb-1">Test {testNumber}</div>
                          <div className="text-xs text-warm-gray">4 Sections Available</div>
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
        <div className="max-w-4xl mx-auto">
          <Card 
            className="rounded-2xl border-light-border shadow-soft"
            style={{ background: 'var(--gradient-card)' }}
          >
            <CardHeader>
              <CardTitle className="text-2xl font-georgia text-center text-foreground">
                Quick Practice
              </CardTitle>
              <p className="text-warm-gray text-center">
                Jump into individual sections for focused practice
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {sections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <Card
                      key={section.id}
                      className="cursor-pointer gentle-hover rounded-2xl border-light-border hover:border-gentle-blue/30 transition-all duration-300"
                      onClick={() => handleIndividualTest(section.id)}
                    >
                      <CardContent className="p-6 text-center">
                        <div 
                          className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4"
                          style={{ background: 'var(--gradient-button)' }}
                        >
                          <Icon className="w-8 h-8 text-white" />
                        </div>
                        <h4 className="font-semibold text-foreground mb-2">{section.name}</h4>
                        <p className="text-sm text-warm-gray flex items-center justify-center">
                          <Clock className="w-3 h-3 mr-1" />
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
      </div>
    </div>
  );
};

export default TestSelection;