
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
    <Card className="group hover:shadow-neon-strong transition-all duration-500 hover:-translate-y-2 h-full flex flex-col border-electric-blue/10 hover:border-electric-blue/30">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-electric-blue/20 to-neon-cyan/20 flex items-center justify-center group-hover:shadow-neon transition-all duration-300 border border-electric-blue/20">
              {icon}
            </div>
            <div>
              <CardTitle className="text-lg text-electric-blue group-hover:text-neon-cyan transition-colors">
                {title}
              </CardTitle>
              <div className="flex items-center gap-2 mt-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{duration}</span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 flex-1 flex flex-col">
        <CardDescription className="mb-6 leading-relaxed flex-1 text-base">
          {description}
        </CardDescription>

        {participants && (
          <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground">
            <Users className="w-4 h-4 text-electric-blue" />
            <span>{participants.toLocaleString()} active users</span>
          </div>
        )}

        <Button
          onClick={onStart}
          variant="tech"
          className="w-full group-hover:bg-gradient-to-r group-hover:from-electric-blue group-hover:to-neon-cyan group-hover:text-white transition-all duration-300 mt-auto font-semibold"
        >
          <Zap className="w-4 h-4 mr-2" />
          Initialize Module
        </Button>
      </CardContent>
    </Card>
  );
};

export default TestCard;
