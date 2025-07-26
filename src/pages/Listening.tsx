import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Headphones, Clock, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Listening = () => {
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
                <Headphones className="w-5 h-5 text-blue-deep" />
                <span className="font-semibold">Listening Test</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>30:00</span>
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
            <CardTitle className="text-center text-2xl">IELTS Academic Listening Test</CardTitle>
            <p className="text-center text-muted-foreground">
              Time: 30 minutes | 4 sections | 40 questions
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-light/30 p-6 rounded-lg">
              <h3 className="font-semibold mb-2">Instructions</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Listen to four recorded sections</li>
                <li>• Each section is played only once</li>
                <li>• Answer questions as you listen</li>
                <li>• You have 10 minutes to transfer answers</li>
              </ul>
            </div>
            
            <div className="text-center py-12">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-blue-light flex items-center justify-center">
                <Headphones className="w-12 h-12 text-blue-deep" />
              </div>
              <h2 className="text-xl font-semibold mb-4">Listening Test Coming Soon</h2>
              <p className="text-muted-foreground mb-6">
                We're preparing high-quality audio materials with various accents and AI feedback
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

export default Listening;