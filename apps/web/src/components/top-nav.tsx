import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authManager } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { authenticatedRequest } from "@/lib/auth";
import { logout as firebaseLogout, isAuthConfigured } from "@/lib/firebase";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import {
  Search,
  LayoutDashboard,
  Upload,
  List,
  History,
  Brain,
  FileText,
  Settings,
  LogOut,
  User,
  Shield,
  Bell,
  Plus,
  Menu,
  LayoutGrid,
  LayoutPanelLeft,
  Activity,
} from "lucide-react";
import { useLayout } from "@/contexts/layout-context";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TopNavProps {
  className?: string;
}

// Primary navigation items (shown in top nav)
const primaryNavigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Real-time", href: "/realtime", icon: Activity },
  { name: "Analysis History", href: "/analysis-history", icon: History },
  
];

// Secondary navigation items (shown in hamburger menu)
const secondaryNavigation = [
  { name: "AI Analysis", href: "/ai-analysis", icon: Brain },
  { name: "All Errors", href: "/all-errors", icon: List },
  { name: "Reports", href: "/reports", icon: FileText },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function TopNav({ className }: TopNavProps) {
  const [location] = useLocation();
  const { toast } = useToast();
  const user = authManager.getUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { layoutType, setLayoutType } = useLayout();

  const toggleLayoutType = () => {
    setLayoutType(layoutType === "sidebar" ? "topnav" : "sidebar");
  };

  // Query for processing analyses to show in notifications
  const { data: processingAnalyses } = useQuery({
    queryKey: ["/api/analysis/processing"],
    queryFn: async () => {
      try {
        console.log("🔍 Fetching processing analyses...");
        const data = await authenticatedRequest("GET", "/api/analysis/history");

        console.log(`📊 Analysis history response:`, data);

        if (!data) {
          console.warn(`⚠️ Analysis history request failed: no data received`);
          return [];
        }

        console.log(`✅ Analysis history data received`);

        const allAnalyses = data.history || data || [];
        const processingItems = Array.isArray(allAnalyses)
          ? allAnalyses.filter(
              (analysis: any) =>
                analysis.status === "processing" ||
                analysis.status === "pending"
            )
          : [];

        console.log(`📈 Found ${processingItems.length} processing analyses`);
        return processingItems;
      } catch (error) {
        console.error("💥 Error fetching processing analyses:", error);
        console.error(
          "Error type:",
          error instanceof Error ? error.constructor.name : typeof error
        );
        console.error(
          "Error message:",
          error instanceof Error ? error.message : String(error)
        );
        return [];
      }
    },
    refetchInterval: 10000, // Check every 10 seconds
    enabled: !!user,
    retry: (failureCount, error) => {
      // Only retry if it's not a fetch error (which suggests network issues)
      if (error.message.includes("Failed to fetch")) {
        console.warn("🌐 Network error detected, reducing retry attempts");
        return failureCount < 2;
      }
      return failureCount < 3;
    },
  });

  // Query for recently completed analyses
  const { data: recentCompletions } = useQuery({
    queryKey: ["/api/analysis/recent-completions"],
    queryFn: async () => {
      try {
        const data = await authenticatedRequest("GET", "/api/analysis/history");
        const allAnalyses = data.history || data || [];
        // Get recently completed analyses (last 2 hours)
        const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
        return allAnalyses
          .filter((analysis: any) => {
            const completedAt = new Date(
              analysis.uploadDate || analysis.analysisDate
            ).getTime();
            return analysis.status === "completed" && completedAt > twoHoursAgo;
          })
          .slice(0, 5); // Limit to 5 recent completions
      } catch (error) {
        console.error("Error fetching recent completions:", error);
        return [];
      }
    },
    refetchInterval: 30000, // Check every 30 seconds
    enabled: !!user,
  });

  const processingCount = processingAnalyses?.length || 0;
  const completionsCount = recentCompletions?.length || 0;
  const totalNotifications = processingCount + completionsCount;

  const handleLogout = async () => {
    try {
      // Try Firebase logout first if configured
      if (isAuthConfigured()) {
        await firebaseLogout();
      }
    } catch (error) {
      console.log("Firebase logout failed or not configured:", error);
    }

    // Always do regular auth logout
    authManager.logout();
    toast({
      title: "Logged out",
      description: "You have been logged out successfully",
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement search functionality
    console.log("Search query:", searchQuery);
  };

  return (
    <nav className={cn("bg-card border-b border-border shadow-sm", className)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/dashboard">
            <div className="flex items-center space-x-3 cursor-pointer">
              <div className="w-8 h-8 bg-gradient-to-br rounded-lg flex items-center justify-center">
                <img
                  src="data:image/png;base64,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"
                  alt="Logo"
                  className="w-8 h-8 mr-2"
                />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">
                  StackLens AI
                </h1>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  Intelligent Log Analysis
                </p>
              </div>
            </div>
          </Link>

          {/* Primary Navigation Links */}
          <div className="hidden md:flex items-center space-x-2">
            {primaryNavigation.map((item) => {
              const Icon = item.icon;
              const isActive =
                location === item.href ||
                (item.href === "/dashboard" && location === "/");

              return (
                <Link key={item.name} href={item.href}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    className={cn(
                      "flex items-center space-x-2 transition-all duration-200",
                      isActive &&
                        "bg-gradient-to-r from-primary to-secondary text-white shadow-sm",
                      !isActive && "hover:bg-muted"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden lg:inline">{item.name}</span>
                  </Button>
                </Link>
              );
            })}

            {/* Hamburger Menu for Secondary Navigation */}
            <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="p-2">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {secondaryNavigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = location === item.href;

                  return (
                    <Link key={item.name} href={item.href}>
                      <DropdownMenuItem
                        className={cn(
                          "flex items-center space-x-2 w-full",
                          isActive && "bg-primary/10"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.name}</span>
                        {item.name === "AI Analysis" && (
                          <Badge
                            variant="secondary"
                            className="ml-auto text-xs"
                          >
                            AI
                          </Badge>
                        )}
                      </DropdownMenuItem>
                    </Link>
                  );
                })}
                <DropdownMenuSeparator />
                {/* Admin access from hamburger menu */}
                {(user?.role === "admin" || user?.role === "super_admin") && (
                  <Link href="/admin">
                    <DropdownMenuItem
                      className={cn(
                        "flex items-center space-x-2 w-full",
                        location === "/admin" && "bg-red-500/10"
                      )}
                    >
                      <Shield className="h-4 w-4" />
                      <span>Admin Panel</span>
                      <Badge variant="destructive" className="ml-auto text-xs">
                        ADMIN
                      </Badge>
                    </DropdownMenuItem>
                  </Link>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Right side actions */}
          <div className="flex items-center space-x-3">
            {/* Enhanced Search - Desktop */}
            <form onSubmit={handleSearch} className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search logs..."
                className="pl-10 pr-4 py-2 w-48 lg:w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>

            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="relative p-2">
                  <Bell className="h-5 w-5" />
                  {totalNotifications > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-5 w-5 text-xs rounded-full p-0 flex items-center justify-center"
                    >
                      {totalNotifications}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <div className="flex items-center justify-between p-3 border-b">
                  <h3 className="font-semibold">Notifications</h3>
                  <span className="text-xs text-muted-foreground">
                    {totalNotifications} active
                  </span>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {totalNotifications === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No new notifications
                    </div>
                  ) : (
                    <>
                      {/* Processing analyses */}
                      {processingAnalyses?.map((analysis: any) => (
                        <div
                          key={`processing-${analysis.id}`}
                          className="p-3 border-b hover:bg-muted/50"
                        >
                          <div className="flex items-start space-x-3">
                            <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0 bg-blue-500 animate-pulse" />
                            <div className="flex-1">
                              <p className="text-sm">
                                Analyzing{" "}
                                {analysis.fileName ||
                                  analysis.filename ||
                                  "Unknown File"}
                                ...
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {analysis.currentStep ||
                                  analysis.current_step ||
                                  "Processing"}{" "}
                                • {analysis.progress || 0}%
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Recent completions */}
                      {recentCompletions?.map((analysis: any) => (
                        <div
                          key={`completed-${analysis.id}`}
                          className="p-3 border-b hover:bg-muted/50"
                        >
                          <div className="flex items-start space-x-3">
                            <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0 bg-green-500" />
                            <div className="flex-1">
                              <p className="text-sm">
                                Analysis completed for{" "}
                                {analysis.filename ||
                                  analysis.fileName ||
                                  "Unknown File"}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {analysis.totalErrors || 0} errors found •{" "}
                                {(() => {
                                  const date = new Date(
                                    analysis.uploadDate || analysis.analysisDate
                                  );
                                  const now = new Date();
                                  const diff = now.getTime() - date.getTime();
                                  const minutes = Math.floor(
                                    diff / (1000 * 60)
                                  );
                                  const hours = Math.floor(minutes / 60);
                                  if (hours > 0) return `${hours}h ago`;
                                  return `${minutes}m ago`;
                                })()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Layout Toggle */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleLayoutType}
                    className="h-8 w-8 p-0"
                  >
                    {layoutType === "sidebar" ? (
                      <LayoutGrid className="h-4 w-4" />
                    ) : (
                      <LayoutPanelLeft className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    Switch to {layoutType === "sidebar" ? "Top Nav" : "Sidebar"}{" "}
                    Layout
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Upload Button */}
            <Link href="/upload">
              <Button
                size="sm"
                className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Upload</span>
              </Button>
            </Link>

            {/* Enhanced Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-8 w-8 rounded-full"
                >
                  <div className="flex items-center justify-center w-full h-full bg-gradient-to-r from-primary to-secondary rounded-full text-white text-sm font-medium">
                    {user?.username
                      ? user.username.charAt(0).toUpperCase()
                      : "U"}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium">{user?.username || "User"}</p>
                    <p className="w-[200px] truncate text-sm text-muted-foreground">
                      {user?.email || "No email"}
                    </p>
                    <Badge variant="secondary" className="text-xs w-fit">
                      {user?.role || "user"}
                    </Badge>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <Link href="/profile">
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                </Link>
                <Link href="/settings">
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {[...primaryNavigation, ...secondaryNavigation].map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    location === item.href ||
                    (item.href === "/dashboard" && location === "/");
                  const isAiFeature = item.name === "AI Analysis";

                  return (
                    <DropdownMenuItem key={item.name} asChild>
                      <Link href={item.href}>
                        <div
                          className={cn(
                            "flex items-center space-x-2 w-full",
                            isActive && "font-medium text-primary"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{item.name}</span>
                          {isAiFeature && (
                            <Badge
                              variant="secondary"
                              className="ml-auto text-xs"
                            >
                              AI
                            </Badge>
                          )}
                        </div>
                      </Link>
                    </DropdownMenuItem>
                  );
                })}

                {/* Admin Navigation - Mobile */}
                {(user?.role === "admin" || user?.role === "super_admin") && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/admin">
                        <div
                          className={cn(
                            "flex items-center space-x-2 w-full",
                            location === "/admin" && "font-medium text-red-600"
                          )}
                        >
                          <Shield className="h-4 w-4" />
                          <span>Admin Dashboard</span>
                          <Badge
                            variant="destructive"
                            className="ml-auto text-xs"
                          >
                            ADMIN
                          </Badge>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}
