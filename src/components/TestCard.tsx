
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Users, Zap } from "lucide-react";

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
    <Card className="group hover:glow-blue transition-all duration-500 hover:-translate-y-2 h-full flex flex-col hover-glow-blue">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl glass-effect flex items-center justify-center group-hover:glow-blue transition-all duration-300">
              <div className="text-primary group-hover:text-primary">
                {icon}
              </div>
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-text-primary group-hover:text-primary transition-colors">
                {title}
              </CardTitle>
              <div className="flex items-center gap-2 mt-2">
                <Clock className="w-4 h-4 text-text-tertiary" />
                <span className="text-sm text-text-tertiary">{duration}</span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 flex-1 flex flex-col">
        <CardDescription className="mb-6 leading-relaxed flex-1 text-base text-text-secondary">
          {description}
        </CardDescription>
        
        {participants && (
          <div className="flex items-center gap-2 mb-6 text-sm text-text-tertiary">
            <Users className="w-4 h-4 text-primary" />
            <span>{participants.toLocaleString()} active users</span>
          </div>
        )}
        
        <Button 
          onClick={onStart}
          variant="premium"
          className="w-full mt-auto font-semibold"
        >
          <Zap className="w-4 h-4 mr-2" />
          Initialize Module
        </Button>
      </CardContent>
    </Card>
  );
};

export default TestCard;
