import { ReactNode, useState, useEffect } from "react";
import { useLayout } from "@/contexts/layout-context";
import { useSettings } from "@/contexts/settings-context";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import TopNav from "@/components/top-nav";
import { cn } from "@/lib/utils";

interface AdaptiveLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  onUploadClick?: () => void;
}

export default function AdaptiveLayout({
  children,
  title,
  subtitle,
  onUploadClick,
}: AdaptiveLayoutProps) {
  const { layoutType } = useLayout();
  const { uiSettings } = useSettings();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false); // Close sidebar on mobile by default
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Check navigation preferences from settings
  const showTopNav = uiSettings?.navigationPreferences?.showTopNav ?? true;
  const showSideNav = uiSettings?.navigationPreferences?.showSideNav ?? true;
  const topNavStyle = uiSettings?.navigationPreferences?.topNavStyle ?? "fixed";
  const sideNavPosition =
    uiSettings?.navigationPreferences?.sideNavPosition ?? "left";

  console.log("AdaptiveLayout render:", {
    showTopNav,
    showSideNav,
    layoutType,
  });

  // Use top nav layout if:
  // 1. Layout type is explicitly set to topnav, OR
  // 2. Top nav is enabled and sidebar is disabled, OR
  // 3. Both are disabled (fallback to top nav)
  if (
    layoutType === "topnav" ||
    (showTopNav && !showSideNav) ||
    (!showTopNav && !showSideNav)
  ) {
    return (
      <div className={`min-h-screen bg-background`}>
        {(showTopNav || (!showTopNav && !showSideNav)) && (
          <TopNav
            className={
              topNavStyle === "sticky"
                ? "sticky top-0 z-50"
                : "fixed top-0 left-0 right-0 z-50"
            }
          />
        )}
        <main
          className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ${
            topNavStyle === "fixed" ? "pt-16" : ""
          }`}
        >
          <div className="space-y-6">
            {title && (
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold">{title}</h1>
                  {subtitle && (
                    <p className="text-muted-foreground">{subtitle}</p>
                  )}
                </div>
              </div>
            )}
            {children}
          </div>
        </main>
      </div>
    );
  }

  // Default sidebar layout - when sidebar is enabled
  return (
    <div
      className={`flex h-screen bg-background ${
        sideNavPosition === "right" ? "flex-row-reverse" : ""
      }`}
    >
      {/* Overlay for mobile */}
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {showSideNav && (
        <div
          className={cn(
            "transition-all duration-300 ease-in-out z-50",
            sideNavPosition === "right" ? "order-2" : "order-1",
            isMobile ? "fixed inset-y-0 left-0" : "relative",
            isMobile && !isSidebarOpen && "-translate-x-full",
            isMobile && isSidebarOpen && "translate-x-0"
          )}
        >
          <Sidebar />
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        {title && (
          <Header
            title={title}
            subtitle={subtitle}
            onUploadClick={onUploadClick}
            onSidebarToggle={toggleSidebar}
            isSidebarOpen={isSidebarOpen}
          />
        )}
        <main className="flex-1 overflow-auto p-6 space-y-6">{children}</main>
      </div>
    </div>
  );
}
