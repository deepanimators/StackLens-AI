import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import { authManager } from "./lib/auth";
import { useEffect } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { LayoutProvider } from "@/contexts/layout-context";
import { SettingsProvider } from "@/contexts/settings-context";
import { FirebaseAuthWrapper } from "@/components/firebase-auth-wrapper";
import { usePWA } from "@/hooks/use-pwa";
import { PWAInstallBanner, PWAUpdateBanner } from "@/components/pwa/pwa-components";

// Pages
import Dashboard from "@/pages/dashboard";
import Upload from "@/pages/upload";
import AllErrors from "@/pages/all-errors";
import AnalysisHistory from "@/pages/analysis-history";
import AIAnalysis from "@/pages/ai-analysis";
import EnhancedAIAnalysis from "@/pages/enhanced-ai-analysis";
import AIEnhancedDashboard from "@/pages/ai-enhanced-dashboard";
import Reports from "@/pages/reports";
import Settings from "@/pages/settings";
import Admin from "@/pages/admin";
import StoreKioskManagement from "@/pages/store-kiosk-management";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";

function Router() {
  const { data: user, isLoading, refetch } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: () => authManager.getCurrentUser(),
    retry: false,
    staleTime: 0, // Always check for fresh auth state
    gcTime: 0, // Don't cache auth state
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchOnMount: true, // Always refetch on mount
  });

  // Initialize PWA
  const { canInstall, updateAvailable, isOnline } = usePWA();

  useEffect(() => {
    // Set dark theme by default
    document.documentElement.classList.add("dark");
  }, []);

  // Debug logging
  useEffect(() => {
    console.log("🔍 Auth Query State:", { user, isLoading, hasUser: !!user });
  }, [user, isLoading]);

  if (isLoading) {
    console.log("🔍 Showing loading screen - auth query is loading");
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-primary rounded-full animate-pulse"></div>
          <div className="w-4 h-4 bg-primary rounded-full animate-pulse delay-100"></div>
          <div className="w-4 h-4 bg-primary rounded-full animate-pulse delay-200"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log("🔍 Showing login screen - no user found");
    return <Login />;
  }

  console.log("🔍 Showing main app - user authenticated:", user.username);

  return (
    <div className="min-h-screen">
      {/* PWA Install Banner */}
      {canInstall && (
        <PWAInstallBanner className="m-4 mb-0" />
      )}
      
      {/* PWA Update Banner */}
      {updateAvailable && (
        <PWAUpdateBanner className="m-4 mb-0" />
      )}
      
      {/* Offline Indicator */}
      {!isOnline && (
        <div className="bg-yellow-100 border-b border-yellow-200 px-4 py-2">
          <div className="flex items-center justify-center space-x-2 text-yellow-800">
            <span className="text-sm font-medium">📡 You're offline</span>
            <span className="text-xs">Some features may be limited</span>
          </div>
        </div>
      )}

      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/ai-dashboard" component={AIEnhancedDashboard} />
        <Route path="/upload" component={Upload} />
        <Route path="/all-errors" component={AllErrors} />
        <Route path="/analysis-history" component={AnalysisHistory} />
        <Route path="/ai-analysis" component={AIAnalysis} />
        <Route path="/enhanced-ai-analysis" component={EnhancedAIAnalysis} />
        <Route path="/reports" component={Reports} />
        <Route path="/settings" component={Settings} />
        <Route path="/admin" component={Admin} />
        <Route path="/store-kiosk-management" component={StoreKioskManagement} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="stacklens-ui-theme">
        <LayoutProvider>
          <SettingsProvider>
            <TooltipProvider>
              <FirebaseAuthWrapper>
                <Toaster />
                <Router />
              </FirebaseAuthWrapper>
            </TooltipProvider>
          </SettingsProvider>
        </LayoutProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
