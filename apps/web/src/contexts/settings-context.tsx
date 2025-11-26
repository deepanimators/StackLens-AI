import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { authenticatedRequest, authManager } from "@/lib/auth";
import { useTheme } from "@/components/theme-provider";
import { useLayout } from "@/contexts/layout-context";

interface AdminUISettings {
  theme?: "light" | "dark" | "system";
  navigationPreferences?: {
    showTopNav?: boolean;
    topNavStyle?: "fixed" | "sticky";
    topNavColor?: string;
    showSideNav?: boolean;
    sideNavStyle?: "collapsible" | "permanent";
    sideNavPosition?: "left" | "right";
    sideNavColor?: string;
    enableBreadcrumbs?: boolean;
  };
  displayPreferences?: {
    primaryColor?: string;
    itemsPerPage?: number;
    defaultView?: "grid" | "list";
  };
  denseMode?: boolean;
  autoRefresh?: boolean;
}

interface AdminAPISettings {
  geminiApiKey?: string;
  webhookUrl?: string;
  maxFileSize?: string;
  autoAnalysis?: boolean;
  defaultTimezone?: string;
  defaultLanguage?: string;
}

interface SettingsContextType {
  uiSettings: AdminUISettings | null;
  apiSettings: AdminAPISettings | null;
  isLoading: boolean;
  refetchSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined
);

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}

interface SettingsProviderProps {
  children: ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const { setTheme } = useTheme();
  const { setLayoutType } = useLayout();

  // Check if user is authenticated before making admin API calls
  const isAuthenticated = !!authManager.getToken();

  // Fetch UI settings
  const {
    data: uiSettings,
    isLoading: uiLoading,
    refetch: refetchUI,
  } = useQuery<AdminUISettings>({
    queryKey: ["/api/admin/ui-settings"],
    queryFn: async () => {
      try {
        const response = await authenticatedRequest(
          "GET",
          "/api/admin/ui-settings"
        );
        return response;
      } catch (error) {
        // Return defaults if not authenticated or error
        return {};
      }
    },
    enabled: isAuthenticated, // Only run if authenticated
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch API settings
  const {
    data: apiSettings,
    isLoading: apiLoading,
    refetch: refetchAPI,
  } = useQuery<AdminAPISettings>({
    queryKey: ["/api/admin/api-settings"],
    queryFn: async () => {
      try {
        const response = await authenticatedRequest(
          "GET",
          "/api/admin/api-settings"
        );
        return response;
      } catch (error) {
        // Return defaults if not authenticated or error
        return {};
      }
    },
    enabled: isAuthenticated, // Only run if authenticated
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Apply settings when they change
  useEffect(() => {
    if (uiSettings) {
      console.log("Applying UI settings:", uiSettings);

      // Apply theme
      if (uiSettings.theme) {
        console.log("Setting theme to:", uiSettings.theme);
        setTheme(uiSettings.theme);
      }

      // Apply layout preferences
      if (uiSettings.navigationPreferences) {
        const nav = uiSettings.navigationPreferences;
        console.log("Navigation preferences:", nav);

        // Determine layout type based on navigation preferences
        if (nav.showTopNav && !nav.showSideNav) {
          console.log("Setting layout to topnav");
          setLayoutType("topnav");
        } else {
          console.log("Setting layout to sidebar");
          setLayoutType("sidebar");
        }
      }

      // Apply custom colors
      if (uiSettings.displayPreferences?.primaryColor) {
        document.documentElement.style.setProperty(
          "--primary",
          uiSettings.displayPreferences.primaryColor
        );
      }

      if (uiSettings.navigationPreferences?.topNavColor) {
        document.documentElement.style.setProperty(
          "--nav-color",
          uiSettings.navigationPreferences.topNavColor
        );
      }

      if (uiSettings.navigationPreferences?.sideNavColor) {
        document.documentElement.style.setProperty(
          "--sidebar-color",
          uiSettings.navigationPreferences.sideNavColor
        );
      }

      // Add visual debugging indicator
      document.body.setAttribute("data-settings-applied", "true");
      document.body.setAttribute("data-theme", uiSettings.theme || "dark");
      if (uiSettings.navigationPreferences) {
        document.body.setAttribute(
          "data-show-sidebar",
          uiSettings.navigationPreferences.showSideNav?.toString() || "true"
        );
        document.body.setAttribute(
          "data-sidebar-position",
          uiSettings.navigationPreferences.sideNavPosition || "left"
        );
      }
    }
  }, [uiSettings, setTheme, setLayoutType]);

  const refetchSettings = () => {
    refetchUI();
    refetchAPI();
  };

  return (
    <SettingsContext.Provider
      value={{
        uiSettings: uiSettings || null,
        apiSettings: apiSettings || null,
        isLoading: uiLoading || apiLoading,
        refetchSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}
