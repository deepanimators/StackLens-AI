import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  className?: string;
  isLoading?: boolean;
}

export default function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  className,
  isLoading = false
}: StatsCardProps) {
  return (
    <Card className={cn("hover:shadow-lg transition-all duration-200 border-0 shadow-md", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              {isLoading ? (
                <div className="flex items-center space-x-1 my-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                </div>
              ) : (
                value
              )}
            </p>
          </div>
          <div className="w-14 h-14 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl flex items-center justify-center ring-2 ring-primary/10">
            <Icon className="w-7 h-7 text-primary" />
          </div>
        </div>
        {trend && (
          <div className="mt-4 flex items-center">
            <span className={cn(
              "text-sm font-semibold px-2 py-1 rounded-full text-xs",
              trend.isPositive 
                ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400" 
                : "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
            )}>
              {isLoading ? (
                <div className="flex items-center space-x-0.5 py-1">
                  <div className="w-1 h-1 bg-current rounded-full animate-pulse"></div>
                  <div className="w-1 h-1 bg-current rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-1 h-1 bg-current rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                </div>
              ) : (
                trend.value
              )}
            </span>
            <span className="text-sm text-muted-foreground ml-2">
              from last month
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
