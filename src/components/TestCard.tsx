import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Users } from "lucide-react";

interface TestCardProps {
  title: string;
  description: string;
  duration: string;
  icon: React.ReactNode;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  participants?: number;
  onStart: () => void;
}

const TestCard = ({ title, description, duration, icon, difficulty, participants, onStart }: TestCardProps) => {
  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case "Beginner": return "text-green-600 bg-green-50";
      case "Intermediate": return "text-yellow-600 bg-yellow-50";
      case "Advanced": return "text-red-600 bg-red-50";
      default: return "text-muted-foreground bg-muted";
    }
  };

  return (
    <Card className="group hover:shadow-strong transition-all duration-300 hover:-translate-y-1">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-blue-light flex items-center justify-center group-hover:bg-blue-medium transition-colors duration-300">
              {icon}
            </div>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{duration}</span>
              </div>
            </div>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(difficulty)}`}>
            {difficulty}
          </span>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <CardDescription className="mb-4 leading-relaxed">
          {description}
        </CardDescription>
        
        {participants && (
          <div className="flex items-center gap-1 mb-4 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{participants.toLocaleString()} participants this week</span>
          </div>
        )}
        
        <Button 
          onClick={onStart}
          variant="hero" 
          className="w-full group-hover:shadow-medium transition-all duration-300"
        >
          Start Test
        </Button>
      </CardContent>
    </Card>
  );
};

export default TestCard;