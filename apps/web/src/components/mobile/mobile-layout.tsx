import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { 
  Menu, 
  X, 
  Home,
  Search,
  BarChart3,
  Brain,
  Upload,
  Settings,
  User,
  Wifi,
  WifiOff,
  Download,
  Smartphone
} from 'lucide-react';
import { usePWA } from '@/hooks/use-pwa';
import { PWAInstallBanner, PWAUpdateBanner } from '../pwa/pwa-components';

interface MobileLayoutProps {
  children: React.ReactNode;
  currentPath?: string;
}

export function MobileLayout({ children, currentPath = '/' }: MobileLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { isOnline, canInstall, updateAvailable, isRunningAsPWA } = usePWA();

  // Detect mobile screen
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Navigation items
  const navItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/search', label: 'Search', icon: Search },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/error-intelligence', label: 'AI Intelligence', icon: Brain },
    { path: '/upload', label: 'Upload', icon: Upload },
    { path: '/settings', label: 'Settings', icon: Settings },
    { path: '/profile', label: 'Profile', icon: User }
  ];

  const isActive = (path: string) => currentPath === path;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* PWA Install Banner */}
      {canInstall && !isRunningAsPWA && (
        <PWAInstallBanner className="m-4 mb-0" />
      )}
      
      {/* PWA Update Banner */}
      {updateAvailable && (
        <PWAUpdateBanner className="m-4 mb-0" />
      )}

      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="px-4 h-16 flex items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center space-x-3">
            {isMobile && (
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-md hover:bg-gray-100 transition-colors"
              >
                {isMobileMenuOpen ? (
                  <X className="h-6 w-6 text-gray-600" />
                ) : (
                  <Menu className="h-6 w-6 text-gray-600" />
                )}
              </button>
            )}
            
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">StackLens AI</h1>
                {isMobile && (
                  <p className="text-xs text-gray-500">Error Intelligence</p>
                )}
              </div>
            </div>
          </div>

          {/* Status Indicators */}
          <div className="flex items-center space-x-2">
            {/* Online/Offline Status */}
            <div className={cn(
              "flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium",
              isOnline 
                ? "bg-green-100 text-green-700" 
                : "bg-red-100 text-red-700"
            )}>
              {isOnline ? (
                <Wifi className="h-3 w-3" />
              ) : (
                <WifiOff className="h-3 w-3" />
              )}
              <span className="hidden sm:inline">
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>

            {/* PWA Mode Indicator */}
            {isRunningAsPWA && (
              <div className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
                <Smartphone className="h-3 w-3" />
                <span className="hidden sm:inline">PWA</span>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobile && isMobileMenuOpen && (
          <div className="border-t border-gray-200 bg-white">
            <nav className="px-4 py-2">
              <div className="grid grid-cols-2 gap-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.path}
                      onClick={() => {
                        // Handle navigation here
                        setIsMobileMenuOpen(false);
                      }}
                      className={cn(
                        "flex items-center space-x-3 p-3 rounded-lg text-left transition-colors",
                        isActive(item.path)
                          ? "bg-purple-100 text-purple-700"
                          : "text-gray-600 hover:bg-gray-100"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex">
        {/* Desktop Sidebar */}
        {!isMobile && (
          <aside className="w-64 bg-white border-r border-gray-200">
            <nav className="p-4">
              <div className="space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.path}
                      onClick={() => {
                        // Handle navigation here
                      }}
                      className={cn(
                        "w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-colors",
                        isActive(item.path)
                          ? "bg-purple-100 text-purple-700"
                          : "text-gray-600 hover:bg-gray-100"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </nav>
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <nav className="bg-white border-t border-gray-200 px-4 py-2">
          <div className="flex justify-around">
            {navItems.slice(0, 5).map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => {
                    // Handle navigation here
                  }}
                  className={cn(
                    "flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors",
                    isActive(item.path)
                      ? "text-purple-600"
                      : "text-gray-600"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}

// Mobile-optimized Card Component
interface MobileCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
  collapsible?: boolean;
}

export function MobileCard({ 
  title, 
  children, 
  className, 
  actions, 
  collapsible = false 
}: MobileCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className={cn(
      "bg-white border border-gray-200 rounded-lg overflow-hidden",
      className
    )}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="font-semibold text-gray-900">{title}</h3>
            {collapsible && (
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-1 rounded hover:bg-gray-200 transition-colors"
              >
                {isCollapsed ? '📂' : '📁'}
              </button>
            )}
          </div>
          {actions && (
            <div className="flex items-center space-x-2">
              {actions}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="p-4">
          {children}
        </div>
      )}
    </div>
  );
}

// Mobile-optimized Grid Component
interface MobileGridProps {
  children: React.ReactNode;
  className?: string;
  cols?: 1 | 2 | 3;
}

export function MobileGrid({ children, className, cols = 1 }: MobileGridProps) {
  return (
    <div className={cn(
      "grid gap-4",
      {
        "grid-cols-1": cols === 1,
        "grid-cols-1 sm:grid-cols-2": cols === 2,
        "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3": cols === 3
      },
      className
    )}>
      {children}
    </div>
  );
}

// Mobile-optimized Stats Component
interface MobileStatsProps {
  stats: Array<{
    label: string;
    value: string | number;
    change?: number;
    icon?: React.ComponentType<any>;
  }>;
  className?: string;
}

export function MobileStats({ stats, className }: MobileStatsProps) {
  return (
    <div className={cn("grid grid-cols-2 lg:grid-cols-4 gap-4", className)}>
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 uppercase tracking-wide">
                  {stat.label}
                </p>
                <p className="text-lg font-bold text-gray-900 mt-1">
                  {stat.value}
                </p>
                {stat.change !== undefined && (
                  <p className={cn(
                    "text-xs mt-1",
                    stat.change >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {stat.change >= 0 ? '↗' : '↘'} {Math.abs(stat.change)}%
                  </p>
                )}
              </div>
              {Icon && (
                <Icon className="h-8 w-8 text-gray-400" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Touch-friendly Button Component
interface TouchButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
}

export function TouchButton({ 
  children, 
  onClick, 
  variant = 'primary',
  size = 'md',
  className,
  disabled 
}: TouchButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "font-medium rounded-lg transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation",
        {
          // Variants
          "bg-purple-600 text-white hover:bg-purple-700": variant === 'primary',
          "bg-gray-200 text-gray-900 hover:bg-gray-300": variant === 'secondary',
          "border-2 border-purple-600 text-purple-600 hover:bg-purple-50": variant === 'outline',
          
          // Sizes (touch-friendly)
          "px-3 py-2 text-sm min-h-[40px]": size === 'sm',
          "px-4 py-3 text-base min-h-[48px]": size === 'md',
          "px-6 py-4 text-lg min-h-[56px]": size === 'lg'
        },
        className
      )}
    >
      {children}
    </button>
  );
}