import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SEVERITY_COLORS, SEVERITY_LABELS } from "@/lib/constants";

interface SeverityData {
  severity: keyof typeof SEVERITY_LABELS;
  count: number;
  percentage: number;
}

interface SeverityChartProps {
  data: SeverityData[];
  totalErrors: number;
}

export default function SeverityChart({ data, totalErrors }: SeverityChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Severity Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((item) => (
            <div key={item.severity} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: SEVERITY_COLORS[item.severity] }}
                  />
                  <span className="font-medium">
                    {SEVERITY_LABELS[item.severity]}
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {item.count} ({item.percentage.toFixed(1)}%)
                </span>
              </div>
              <Progress 
                value={item.percentage} 
                className="h-2"
                style={{
                  '--progress-background': SEVERITY_COLORS[item.severity],
                } as React.CSSProperties}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
