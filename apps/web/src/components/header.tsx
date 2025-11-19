import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Bell,
  Plus,
  Menu,
  LayoutGrid,
  LayoutPanelLeft,
  Activity,
} from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useLayout } from "@/contexts/layout-context";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface HeaderProps {
  title: string;
  subtitle?: string;
  onUploadClick?: () => void;
  onSidebarToggle?: () => void;
  isSidebarOpen?: boolean;
}

export default function Header({
  title,
  subtitle,
  onUploadClick,
  onSidebarToggle,
  isSidebarOpen,
}: HeaderProps) {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const { layoutType, setLayoutType } = useLayout();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement search functionality
    console.log("Search query:", searchQuery);
  };

  const toggleLayoutType = () => {
    setLayoutType(layoutType === "sidebar" ? "topnav" : "sidebar");
  };

  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Sidebar Toggle Button (only show in sidebar mode) */}
          {layoutType === "sidebar" && onSidebarToggle && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onSidebarToggle}
                  className="lg:hidden"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isSidebarOpen ? "Close sidebar" : "Open sidebar"}</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Title Section */}
          <div>
            <h2 className="text-2xl font-bold">{title}</h2>
            {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search logs..."
              className="pl-10 pr-4 py-2 w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>

          {/* Layout Toggle Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={toggleLayoutType}
                className="hidden sm:flex"
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
                Switch to{" "}
                {layoutType === "sidebar" ? "top navigation" : "sidebar"}
              </p>
            </TooltipContent>
          </Tooltip>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Notifications */}
          <Button variant="outline" size="icon" className="relative">
            <Bell className="h-4 w-4" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full"></div>
          </Button>

          {/* Real-time Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => setLocation("/realtime")}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
              >
                <Activity className="h-4 w-4" />
                <span>Real-time</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Live monitoring and analytics</p>
            </TooltipContent>
          </Tooltip>

          {/* Upload Button */}
          <Button
            onClick={onUploadClick || (() => setLocation("/upload"))}
            className="flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Upload Files</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
