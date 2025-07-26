import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Users } from "lucide-react";

interface TestCardProps {
  title: string;
  description: string;
  duration: string;
  icon: React.ReactNode;
  participants?: number;
  onStart: () => void;
}

const TestCard = ({ title, description, duration, icon, participants, onStart }: TestCardProps) => {
  return (
    <Card className="group hover:shadow-strong transition-all duration-300 hover:-translate-y-1 h-full flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-light to-blue-medium/50 flex items-center justify-center group-hover:from-blue-medium group-hover:to-blue-deep transition-all duration-300">
              {icon}
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">{title}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{duration}</span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 flex-1 flex flex-col">
        <CardDescription className="mb-6 leading-relaxed flex-1">
          {description}
        </CardDescription>
        
        {participants && (
          <div className="flex items-center gap-1 mb-6 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{participants.toLocaleString()} participants this week</span>
          </div>
        )}
        
        <Button 
          onClick={onStart}
          variant="hero" 
          className="w-full group-hover:shadow-medium transition-all duration-300 mt-auto"
        >
          Start Test
        </Button>
      </CardContent>
    </Card>
  );
};

export default TestCard;