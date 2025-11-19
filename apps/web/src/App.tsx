import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import { authManager } from "./lib/auth";
import { useEffect, Suspense, lazy, Component, ReactNode } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { LayoutProvider } from "@/contexts/layout-context";
import { SettingsProvider } from "@/contexts/settings-context";
import { FirebaseAuthWrapper } from "@/components/firebase-auth-wrapper";

// Lazy load heavy pages to reduce initial bundle
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Upload = lazy(() => import("@/pages/upload"));
const AllErrors = lazy(() => import("@/pages/all-errors"));
const AnalysisHistory = lazy(() => import("@/pages/analysis-history"));
const AIAnalysis = lazy(() => import("@/pages/ai-analysis"));
const EnhancedAIAnalysis = lazy(() => import("@/pages/enhanced-ai-analysis"));
const AIEnhancedDashboard = lazy(() => import("@/pages/ai-enhanced-dashboard"));
const Realtime = lazy(() => import("@/pages/realtime"));
const Reports = lazy(() => import("@/pages/reports"));
const Settings = lazy(() => import("@/pages/settings"));
const Admin = lazy(() => import("@/pages/admin"));
const StoreKioskManagement = lazy(() => import("@/pages/store-kiosk-management"));

// Keep Login and NotFound as synchronous to avoid loading delay on auth pages
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";

// Error Boundary for catching module loading errors
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error?: Error }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error("ErrorBoundary caught:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
            <p className="text-muted-foreground mb-4">{this.state.error?.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Loading skeleton component
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

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
    <Switch>
      <Route path="/" component={() => <Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
      <Route path="/dashboard" component={() => <Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
      <Route path="/realtime" component={() => <Suspense fallback={<PageLoader />}><Realtime /></Suspense>} />
      <Route path="/ai-dashboard" component={() => <Suspense fallback={<PageLoader />}><AIEnhancedDashboard /></Suspense>} />
      <Route path="/upload" component={() => <Suspense fallback={<PageLoader />}><Upload /></Suspense>} />
      <Route path="/all-errors" component={() => <Suspense fallback={<PageLoader />}><AllErrors /></Suspense>} />
      <Route path="/analysis-history" component={() => <Suspense fallback={<PageLoader />}><AnalysisHistory /></Suspense>} />
      <Route path="/ai-analysis" component={() => <Suspense fallback={<PageLoader />}><AIAnalysis /></Suspense>} />
      <Route path="/enhanced-ai-analysis" component={() => <Suspense fallback={<PageLoader />}><EnhancedAIAnalysis /></Suspense>} />
      <Route path="/reports" component={() => <Suspense fallback={<PageLoader />}><Reports /></Suspense>} />
      <Route path="/settings" component={() => <Suspense fallback={<PageLoader />}><Settings /></Suspense>} />
      <Route path="/admin" component={() => <Suspense fallback={<PageLoader />}><Admin /></Suspense>} />
      <Route path="/store-kiosk-management" component={() => <Suspense fallback={<PageLoader />}><StoreKioskManagement /></Suspense>} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}

export default App;
