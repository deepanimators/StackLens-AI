import { useEffect, useState, useCallback } from 'react';

// Types
export interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
        outcome: 'accepted' | 'dismissed';
        platform: string;
    }>;
    prompt(): Promise<void>;
}

export interface PWAUpdateInfo {
    type: 'NEW_CONTENT_AVAILABLE' | 'CONTENT_CACHED' | 'UPDATE_READY';
    message: string;
    timestamp: Date;
}

export interface OfflineData {
    type: 'errors' | 'analytics';
    data: any;
    timestamp: Date;
}

export interface PWAState {
    isInstalled: boolean;
    canInstall: boolean;
    isOnline: boolean;
    updateAvailable: boolean;
    registration: ServiceWorkerRegistration | null;
    installPrompt: BeforeInstallPromptEvent | null;
}

// PWA Hook
export function usePWA() {
    const [pwaState, setPwaState] = useState<PWAState>({
        isInstalled: false,
        canInstall: false,
        isOnline: navigator.onLine,
        updateAvailable: false,
        registration: null,
        installPrompt: null
    });

    const [offlineQueue, setOfflineQueue] = useState<OfflineData[]>([]);
    const [updateInfo, setUpdateInfo] = useState<PWAUpdateInfo | null>(null);

    // Register service worker
    const registerServiceWorker = useCallback(async () => {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js', {
                    scope: '/'
                });

                console.log('[PWA] Service Worker registered successfully:', registration);

                setPwaState(prev => ({ ...prev, registration }));

                // Listen for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                // New content available
                                setUpdateInfo({
                                    type: 'UPDATE_READY',
                                    message: 'New version available! Reload to update.',
                                    timestamp: new Date()
                                });
                                setPwaState(prev => ({ ...prev, updateAvailable: true }));
                            }
                        });
                    }
                });

                // Listen for messages from service worker
                navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);

                return registration;
            } catch (error) {
                console.error('[PWA] Service Worker registration failed:', error);
                throw error;
            }
        } else {
            throw new Error('Service Workers not supported');
        }
    }, []);

    // Handle messages from service worker
    const handleServiceWorkerMessage = useCallback((event: MessageEvent) => {
        const { type, data } = event.data;

        switch (type) {
            case 'OFFLINE_SYNC_COMPLETE':
                console.log('[PWA] Offline sync completed:', data);
                // Remove synced items from queue
                setOfflineQueue(prev => prev.filter(item => item.type !== data.type));
                break;

            case 'CACHE_STATUS':
                console.log('[PWA] Cache status:', data);
                break;

            case 'UPDATE_AVAILABLE':
                setUpdateInfo({
                    type: 'NEW_CONTENT_AVAILABLE',
                    message: 'New features available! Update to get the latest improvements.',
                    timestamp: new Date()
                });
                break;
        }
    }, []);

    // Install PWA
    const installPWA = useCallback(async () => {
        if (pwaState.installPrompt) {
            try {
                await pwaState.installPrompt.prompt();
                const choiceResult = await pwaState.installPrompt.userChoice;

                if (choiceResult.outcome === 'accepted') {
                    console.log('[PWA] User accepted the install prompt');
                    setPwaState(prev => ({
                        ...prev,
                        isInstalled: true,
                        canInstall: false,
                        installPrompt: null
                    }));
                } else {
                    console.log('[PWA] User dismissed the install prompt');
                }
            } catch (error) {
                console.error('[PWA] Error during installation:', error);
            }
        }
    }, [pwaState.installPrompt]);

    // Update PWA
    const updatePWA = useCallback(() => {
        if (pwaState.registration?.waiting) {
            // Tell the service worker to skip waiting and activate immediately
            pwaState.registration.waiting.postMessage({ type: 'SKIP_WAITING' });

            // Reload the page to use the new service worker
            window.location.reload();
        }
    }, [pwaState.registration]);

    // Store data for offline sync
    const storeOfflineData = useCallback((type: 'errors' | 'analytics', data: any) => {
        const offlineData: OfflineData = {
            type,
            data,
            timestamp: new Date()
        };

        // Add to local queue
        setOfflineQueue(prev => [...prev, offlineData]);

        // Send to service worker for IndexedDB storage
        if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: 'STORE_OFFLINE_DATA',
                data: { type, payload: data }
            });
        }

        // Register background sync if supported
        if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
            navigator.serviceWorker.ready.then(registration => {
                return registration.sync.register(`${type}-sync`);
            }).catch(error => {
                console.log('[PWA] Background sync registration failed:', error);
            });
        }
    }, []);

    // Get cache status for debugging
    const getCacheStatus = useCallback(() => {
        return new Promise((resolve) => {
            if (navigator.serviceWorker.controller) {
                const messageChannel = new MessageChannel();

                messageChannel.port1.onmessage = (event) => {
                    if (event.data.type === 'CACHE_STATUS') {
                        resolve(event.data.data);
                    }
                };

                navigator.serviceWorker.controller.postMessage(
                    { type: 'GET_CACHE_STATUS' },
                    [messageChannel.port2]
                );
            } else {
                resolve({});
            }
        });
    }, []);

    // Clear all caches
    const clearCache = useCallback(() => {
        return new Promise<void>((resolve) => {
            if (navigator.serviceWorker.controller) {
                const messageChannel = new MessageChannel();

                messageChannel.port1.onmessage = (event) => {
                    if (event.data.type === 'CACHE_CLEARED') {
                        resolve();
                    }
                };

                navigator.serviceWorker.controller.postMessage(
                    { type: 'CLEAR_CACHE' },
                    [messageChannel.port2]
                );
            } else {
                resolve();
            }
        });
    }, []);

    // Check if app is running as PWA
    const isRunningAsPWA = useCallback(() => {
        return window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone === true ||
            document.referrer.includes('android-app://');
    }, []);

    // Request notification permission
    const requestNotificationPermission = useCallback(async () => {
        if ('Notification' in window) {
            try {
                const permission = await Notification.requestPermission();
                return permission === 'granted';
            } catch (error) {
                console.error('[PWA] Notification permission request failed:', error);
                return false;
            }
        }
        return false;
    }, []);

    // Subscribe to push notifications
    const subscribeToPushNotifications = useCallback(async (vapidKey?: string) => {
        if (!pwaState.registration || !('PushManager' in window)) {
            throw new Error('Push notifications not supported');
        }

        try {
            const subscription = await pwaState.registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: vapidKey ? urlBase64ToUint8Array(vapidKey) : undefined
            });

            console.log('[PWA] Push subscription created:', subscription);
            return subscription;
        } catch (error) {
            console.error('[PWA] Push subscription failed:', error);
            throw error;
        }
    }, [pwaState.registration]);

    // Setup effects
    useEffect(() => {
        // Register service worker on mount
        registerServiceWorker().catch(console.error);

        // Listen for install prompt
        const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
            e.preventDefault();
            console.log('[PWA] Install prompt triggered');
            setPwaState(prev => ({
                ...prev,
                canInstall: true,
                installPrompt: e
            }));
        };

        // Listen for app installed event
        const handleAppInstalled = () => {
            console.log('[PWA] App was installed');
            setPwaState(prev => ({
                ...prev,
                isInstalled: true,
                canInstall: false,
                installPrompt: null
            }));
        };

        // Listen for online/offline events
        const handleOnline = () => {
            console.log('[PWA] Back online');
            setPwaState(prev => ({ ...prev, isOnline: true }));
        };

        const handleOffline = () => {
            console.log('[PWA] Gone offline');
            setPwaState(prev => ({ ...prev, isOnline: false }));
        };

        // Add event listeners
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
        window.addEventListener('appinstalled', handleAppInstalled);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Check if already installed
        if (isRunningAsPWA()) {
            setPwaState(prev => ({ ...prev, isInstalled: true }));
        }

        // Cleanup
        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
            window.removeEventListener('appinstalled', handleAppInstalled);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage);
        };
    }, [registerServiceWorker, handleServiceWorkerMessage, isRunningAsPWA]);

    return {
        // State
        ...pwaState,
        offlineQueue,
        updateInfo,
        isRunningAsPWA: isRunningAsPWA(),

        // Actions
        installPWA,
        updatePWA,
        storeOfflineData,
        getCacheStatus,
        clearCache,
        requestNotificationPermission,
        subscribeToPushNotifications,

        // Utilities
        dismissUpdateInfo: () => setUpdateInfo(null)
    };
}

// Utility function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}



export default usePWA;