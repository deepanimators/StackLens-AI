import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLayout } from "@/contexts/layout-context";
import { useToast } from "@/hooks/use-toast";
import { Sidebar, Navigation, Check } from "lucide-react";

export default function LayoutSelector() {
  const { layoutType, setLayoutType } = useLayout();
  const { toast } = useToast();

  const handleLayoutChange = (type: 'sidebar' | 'topnav') => {
    setLayoutType(type);
    toast({
      title: "Layout Updated",
      description: `Navigation layout changed to ${type === 'sidebar' ? 'sidebar' : 'top navigation'}`,
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Sidebar Layout Option */}
      <Card 
        className={`cursor-pointer transition-all duration-200 ${
          layoutType === 'sidebar' 
            ? 'ring-2 ring-primary bg-primary/5' 
            : 'hover:bg-muted/50'
        }`}
        onClick={() => handleLayoutChange('sidebar')}
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Sidebar className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Sidebar Navigation</h3>
            </div>
            {layoutType === 'sidebar' && (
              <Badge variant="default" className="flex items-center space-x-1">
                <Check className="h-3 w-3" />
                <span>Active</span>
              </Badge>
            )}
          </div>
          
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Traditional sidebar navigation with fixed left panel
            </p>
            
            {/* Preview */}
            <div className="bg-background border rounded-lg p-3">
              <div className="flex">
                <div className="w-16 bg-primary/10 rounded-md mr-2 flex flex-col space-y-1 p-2">
                  <div className="h-2 bg-primary/30 rounded"></div>
                  <div className="h-1.5 bg-primary/20 rounded"></div>
                  <div className="h-1.5 bg-primary/20 rounded"></div>
                  <div className="h-1.5 bg-primary/20 rounded"></div>
                </div>
                <div className="flex-1 space-y-1">
                  <div className="h-2 bg-muted rounded"></div>
                  <div className="h-1.5 bg-muted/70 rounded"></div>
                  <div className="h-1.5 bg-muted/50 rounded"></div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>✓ More vertical space</span>
              <span>✓ Classic layout</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Navigation Layout Option */}
      <Card 
        className={`cursor-pointer transition-all duration-200 ${
          layoutType === 'topnav' 
            ? 'ring-2 ring-primary bg-primary/5' 
            : 'hover:bg-muted/50'
        }`}
        onClick={() => handleLayoutChange('topnav')}
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Navigation className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Top Navigation</h3>
            </div>
            {layoutType === 'topnav' && (
              <Badge variant="default" className="flex items-center space-x-1">
                <Check className="h-3 w-3" />
                <span>Active</span>
              </Badge>
            )}
          </div>
          
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Modern top navigation bar with horizontal layout
            </p>
            
            {/* Preview */}
            <div className="bg-background border rounded-lg p-3">
              <div className="space-y-2">
                <div className="flex items-center space-x-2 p-2 bg-primary/10 rounded-md">
                  <div className="h-2 w-6 bg-primary/30 rounded"></div>
                  <div className="h-1.5 w-8 bg-primary/20 rounded"></div>
                  <div className="h-1.5 w-8 bg-primary/20 rounded"></div>
                  <div className="h-1.5 w-8 bg-primary/20 rounded"></div>
                </div>
                <div className="space-y-1">
                  <div className="h-2 bg-muted rounded"></div>
                  <div className="h-1.5 bg-muted/70 rounded"></div>
                  <div className="h-1.5 bg-muted/50 rounded"></div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>✓ More horizontal space</span>
              <span>✓ Modern design</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}