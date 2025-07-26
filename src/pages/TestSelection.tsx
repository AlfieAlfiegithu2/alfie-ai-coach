import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Headphones, PenTool, Mic } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const TestSelection = () => {
  const navigate = useNavigate();
  const [selectedMode, setSelectedMode] = useState("simulation"); // "easy" or "simulation"
  const [selectedSections, setSelectedSections] = useState(new Set(["listening", "reading", "writing", "speaking"]));
  const [selectedTest, setSelectedTest] = useState(null);

  const handleStartTest = (testType: string) => {
    navigate(`/${testType}`);
  };

  const toggleSection = (section: string) => {
    const newSections = new Set(selectedSections);
    if (newSections.has(section)) {
      newSections.delete(section);
    } else {
      newSections.add(section);
    }
    setSelectedSections(newSections);
  };

  const handleConfirmTest = () => {
    if (selectedSections.size === 0) return;
    
    if (selectedSections.size === 1) {
      const section = Array.from(selectedSections)[0];
      navigate(`/${section}`);
    } else {
      // Start full test with selected sections
      navigate("/reading", { state: { sections: Array.from(selectedSections) } });
    }
  };

  const cambridgeTests = [
    { version: "C20", tests: [1, 2, 3, 4] },
    { version: "C19", tests: [1, 2, 3, 4] },
    { version: "C18", tests: [1, 2, 3, 4] },
    { version: "C17", tests: [1, 2, 3, 4] }
  ];

  const sections = [
    { id: "listening", name: "Listening", icon: Headphones, color: "bg-blue-500" },
    { id: "reading", name: "Reading", icon: BookOpen, color: "bg-green-500" },
    { id: "writing", name: "Writing", icon: PenTool, color: "bg-purple-500" },
    { id: "speaking", name: "Speaking", icon: Mic, color: "bg-orange-500" }
  ];

  if (selectedTest) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <Card className="mb-6">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl text-blue-600">New Computer Test</CardTitle>
                <CardDescription className="text-gray-600">
                  IELTS officially announced the upgrade to the new computer test system by the end of March 2024<br/>
                  (Recommended)
                </CardDescription>
                <div className="bg-gray-100 rounded-lg p-4 mt-4">
                  <div className="text-sm text-gray-600 mb-1">IELTS</div>
                  <div className="text-lg font-bold">{selectedTest.version}</div>
                  <div className="text-sm text-gray-600">Test {selectedTest.testNumber} · Listening Reading Writing Speaking</div>
                </div>
                <div className="mt-4">
                  <span className="text-sm text-gray-500 border border-gray-300 rounded px-2 py-1">Multiple selection available</span>
                </div>
              </CardHeader>
            </Card>

            {/* Mode Toggle */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant={selectedMode === "easy" ? "default" : "outline"}
                    onClick={() => setSelectedMode("easy")}
                    className="flex-1 rounded-full"
                    style={{
                      backgroundColor: selectedMode === "easy" ? "#3b82f6" : "transparent",
                      color: selectedMode === "easy" ? "white" : "#374151"
                    }}
                  >
                    Easy Mode
                  </Button>
                  <Button
                    variant={selectedMode === "simulation" ? "default" : "outline"}
                    onClick={() => setSelectedMode("simulation")}
                    className="flex-1 rounded-full"
                    style={{
                      backgroundColor: selectedMode === "simulation" ? "#000000" : "transparent",
                      color: selectedMode === "simulation" ? "white" : "#374151"
                    }}
                  >
                    Simulation Mode
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Section Selection */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="text-center mb-4">
                  <Badge variant="secondary" className="mb-2 bg-purple-100 text-purple-700">AI Feedback</Badge>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {sections.map((section) => {
                    const Icon = section.icon;
                    const isSelected = selectedSections.has(section.id);
                    return (
                      <Button
                        key={section.id}
                        variant={isSelected ? "default" : "outline"}
                        onClick={() => toggleSection(section.id)}
                        className="h-20 flex flex-col gap-2"
                        style={{
                          backgroundColor: isSelected ? "#f59e0b" : "transparent",
                          color: isSelected ? "white" : "#374151",
                          borderColor: isSelected ? "#f59e0b" : "#d1d5db"
                        }}
                      >
                        <Icon className="w-6 h-6" />
                        <span>{section.name}</span>
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Confirm Button */}
            <Button 
              onClick={handleConfirmTest}
              disabled={selectedSections.size === 0}
              className="w-full h-12 text-lg rounded-full"
              style={{ backgroundColor: "#3b82f6", color: "white" }}
            >
              Confirm
            </Button>

            <p className="text-center text-sm text-red-500 mt-4">
              * You need to complete all selected test sections to view results
            </p>

            <Button
              variant="ghost"
              onClick={() => setSelectedTest(null)}
              className="w-full mt-4"
            >
              Back to Test Selection
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">IELTS Cambridge Tests</h1>
          <p className="text-xl text-gray-600">
            Choose from official Cambridge IELTS practice tests
          </p>
        </div>

        {/* Cambridge Test Grid */}
        <div className="max-w-6xl mx-auto space-y-6">
          {cambridgeTests.map((cambridge) => (
            <div key={cambridge.version} className="space-y-4">
              <h2 className="text-2xl font-bold text-center text-gray-700">{cambridge.version}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {cambridge.tests.map((testNumber) => (
                  <Card 
                    key={`${cambridge.version}-${testNumber}`}
                    className="cursor-pointer hover:shadow-lg transition-shadow duration-300 border-2 hover:border-blue-300"
                    onClick={() => setSelectedTest({ version: cambridge.version, testNumber })}
                  >
                    <CardContent className="p-6">
                      <div 
                        className="text-white rounded-lg p-4 mb-4"
                        style={{
                          background: "linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)"
                        }}
                      >
                        <div className="text-white text-2xl font-bold mb-1">IELTS</div>
                        <div 
                          className="text-lg font-semibold"
                          style={{ color: "#fbbf24" }}
                        >
                          {cambridge.version.substring(1)}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-gray-800">Test {testNumber}</div>
                        <div className="text-sm text-gray-600">Listening Reading Writing Speaking</div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Access to Individual Tests */}
        <div className="mt-12 text-center">
          <h3 className="text-xl font-semibold mb-6 text-gray-700">Or choose individual practice</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <Button
                  key={section.id}
                  variant="outline"
                  onClick={() => handleStartTest(section.id)}
                  className="h-20 flex flex-col gap-2 border-2 hover:border-blue-300 hover:bg-blue-50"
                >
                  <Icon className="w-6 h-6" />
                  <span>{section.name}</span>
                </Button>
              );
            })}
          </div>
        </div>

        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="w-full mt-8"
        >
          Back to Home
        </Button>
      </div>
    </div>
  );
};

export default TestSelection;