import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mic, Clock, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Speaking = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background shadow-soft">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Button>
              <div className="flex items-center gap-2">
                <Mic className="w-5 h-5 text-blue-deep" />
                <span className="font-semibold">Speaking Test</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>14:00</span>
              </div>
              <Button variant="hero" size="sm">
                Submit Test
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-center text-2xl">IELTS Academic Speaking Test</CardTitle>
            <p className="text-center text-muted-foreground">
              Time: 11-14 minutes | 3 parts | Record your responses
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-light/30 p-6 rounded-lg">
              <h3 className="font-semibold mb-2">Instructions</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Part 1: Introduction and general questions (4-5 minutes)</li>
                <li>• Part 2: Long turn with preparation time (3-4 minutes)</li>
                <li>• Part 3: Discussion of abstract topics (4-5 minutes)</li>
                <li>• Record your responses using your microphone</li>
              </ul>
            </div>
            
            <div className="text-center py-12">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-blue-light flex items-center justify-center">
                <Mic className="w-12 h-12 text-blue-deep" />
              </div>
              <h2 className="text-xl font-semibold mb-4">Speaking Test Coming Soon</h2>
              <p className="text-muted-foreground mb-6">
                We're building advanced speech recognition and AI assessment for pronunciation, fluency, and coherence
              </p>
              <Button variant="hero">
                Get Notified When Ready
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Speaking;