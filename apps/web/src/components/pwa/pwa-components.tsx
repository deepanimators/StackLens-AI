import React, { useState } from 'react';
import { usePWA } from '../hooks/use-pwa';

// PWA Install Banner Component
export interface PWAInstallBannerProps {
  onInstall?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function PWAInstallBanner({ onInstall, onDismiss, className }: PWAInstallBannerProps) {
  const { canInstall, installPWA } = usePWA();
  const [dismissed, setDismissed] = useState(false);

  const handleInstall = async () => {
    await installPWA();
    onInstall?.();
    setDismissed(true);
  };

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  if (!canInstall || dismissed) {
    return null;
  }

  return (
    <div className={`bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-lg shadow-lg ${className || ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="text-2xl">📱</div>
          <div>
            <h3 className="font-semibold">Install StackLens AI</h3>
            <p className="text-sm opacity-90">Get the full app experience with offline support!</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleInstall}
            className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Install
          </button>
          <button
            onClick={handleDismiss}
            className="bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg text-sm transition-colors"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

// PWA Update Banner Component
export interface PWAUpdateBannerProps {
  onUpdate?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function PWAUpdateBanner({ onUpdate, onDismiss, className }: PWAUpdateBannerProps) {
  const { updateAvailable, updatePWA, updateInfo, dismissUpdateInfo } = usePWA();

  const handleUpdate = () => {
    updatePWA();
    onUpdate?.();
  };

  const handleDismiss = () => {
    dismissUpdateInfo();
    onDismiss?.();
  };

  if (!updateAvailable || !updateInfo) {
    return null;
  }

  return (
    <div className={`bg-gradient-to-r from-green-600 to-teal-600 text-white p-4 rounded-lg shadow-lg ${className || ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="text-2xl">🚀</div>
          <div>
            <h3 className="font-semibold">Update Available</h3>
            <p className="text-sm opacity-90">{updateInfo.message}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleUpdate}
            className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Update
          </button>
          <button
            onClick={handleDismiss}
            className="bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg text-sm transition-colors"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}

// PWA Status Component - Shows current PWA status and controls
export interface PWAStatusProps {
  className?: string;
  showDetails?: boolean;
}

export function PWAStatus({ className, showDetails = false }: PWAStatusProps) {
  const { 
    isInstalled, 
    canInstall, 
    isOnline, 
    updateAvailable, 
    offlineQueue,
    isRunningAsPWA,
    getCacheStatus,
    clearCache
  } = usePWA();

  const [cacheInfo, setCacheInfo] = useState<any>(null);
  const [showCacheDetails, setShowCacheDetails] = useState(false);

  const handleGetCacheInfo = async () => {
    const info = await getCacheStatus();
    setCacheInfo(info);
    setShowCacheDetails(true);
  };

  const handleClearCache = async () => {
    await clearCache();
    setCacheInfo(null);
    setShowCacheDetails(false);
  };

  return (
    <div className={`bg-white border rounded-lg p-4 ${className || ''}`}>
      <h3 className="font-semibold text-lg mb-4">PWA Status</h3>
      
      <div className="space-y-3">
        {/* Installation Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Installation Status:</span>
          <div className="flex items-center space-x-2">
            {isInstalled ? (
              <span className="text-green-600 text-sm font-medium">✓ Installed</span>
            ) : canInstall ? (
              <span className="text-blue-600 text-sm font-medium">📱 Can Install</span>
            ) : (
              <span className="text-gray-500 text-sm">Not Available</span>
            )}
          </div>
        </div>

        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Connection:</span>
          <div className="flex items-center space-x-2">
            {isOnline ? (
              <span className="text-green-600 text-sm font-medium">🟢 Online</span>
            ) : (
              <span className="text-red-600 text-sm font-medium">🔴 Offline</span>
            )}
          </div>
        </div>

        {/* Running Mode */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Running Mode:</span>
          <span className="text-sm font-medium">
            {isRunningAsPWA ? '📱 PWA Mode' : '🌐 Browser Mode'}
          </span>
        </div>

        {/* Update Status */}
        {updateAvailable && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Updates:</span>
            <span className="text-orange-600 text-sm font-medium">🚀 Available</span>
          </div>
        )}

        {/* Offline Queue */}
        {offlineQueue.length > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Offline Queue:</span>
            <span className="text-blue-600 text-sm font-medium">
              {offlineQueue.length} items
            </span>
          </div>
        )}

        {/* Cache Management */}
        {showDetails && (
          <div className="border-t pt-3 mt-3">
            <h4 className="text-sm font-medium mb-2">Cache Management</h4>
            <div className="flex space-x-2">
              <button
                onClick={handleGetCacheInfo}
                className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200 transition-colors"
              >
                View Cache
              </button>
              <button
                onClick={handleClearCache}
                className="px-3 py-1 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200 transition-colors"
              >
                Clear Cache
              </button>
            </div>

            {showCacheDetails && cacheInfo && (
              <div className="mt-2 text-xs bg-gray-50 p-2 rounded">
                <pre className="whitespace-pre-wrap">
                  {JSON.stringify(cacheInfo, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// PWA Controls Component - Installation and update controls
export interface PWAControlsProps {
  className?: string;
}

export function PWAControls({ className }: PWAControlsProps) {
  const { 
    canInstall, 
    updateAvailable, 
    installPWA, 
    updatePWA,
    requestNotificationPermission 
  } = usePWA();

  const [notificationPermission, setNotificationPermission] = useState<string>('default');

  React.useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const handleRequestNotifications = async () => {
    const granted = await requestNotificationPermission();
    setNotificationPermission(granted ? 'granted' : 'denied');
  };

  return (
    <div className={`space-y-3 ${className || ''}`}>
      {/* Install Button */}
      {canInstall && (
        <button
          onClick={installPWA}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all duration-200 flex items-center justify-center space-x-2"
        >
          <span>📱</span>
          <span>Install StackLens AI</span>
        </button>
      )}

      {/* Update Button */}
      {updateAvailable && (
        <button
          onClick={updatePWA}
          className="w-full bg-gradient-to-r from-green-600 to-teal-600 text-white py-2 px-4 rounded-lg font-medium hover:from-green-700 hover:to-teal-700 transition-all duration-200 flex items-center justify-center space-x-2"
        >
          <span>🚀</span>
          <span>Update Available - Install Now</span>
        </button>
      )}

      {/* Notification Permission */}
      {notificationPermission !== 'granted' && (
        <button
          onClick={handleRequestNotifications}
          className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2"
        >
          <span>🔔</span>
          <span>Enable Notifications</span>
        </button>
      )}
    </div>
  );
}