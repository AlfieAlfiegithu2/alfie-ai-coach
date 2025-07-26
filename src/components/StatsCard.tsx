
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
}

const StatsCard = ({ title, value, change, icon, trend = "neutral" }: StatsCardProps) => {
  const getTrendColor = () => {
    switch (trend) {
      case "up": return "text-neon-green";
      case "down": return "text-destructive";
      default: return "text-muted-foreground";
    }
  };

  const getCardGlow = () => {
    switch (trend) {
      case "up": return "hover:shadow-success";
      case "down": return "hover:shadow-destructive";
      default: return "hover:shadow-neon";
    }
  };

  return (
    <Card className={`tech-hover transition-all duration-300 border-electric-blue/10 hover:border-electric-blue/30 ${getCardGlow()}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground font-mono">
          {title}
        </CardTitle>
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-electric-blue/20 to-neon-cyan/20 flex items-center justify-center border border-electric-blue/20">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-electric-blue font-orbitron mb-1">{value}</div>
        {change && (
          <p className={`text-xs font-mono ${getTrendColor()}`}>
            {change}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default StatsCard;
