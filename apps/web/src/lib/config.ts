// Application configuration
export const config = {
  // API base URL from environment variable, with fallback
  // In development, use relative path to leverage Vite proxy
  // In production, use full URL
  apiBaseUrl:
    import.meta.env.VITE_API_URL ||
    (import.meta.env.DEV
      ? ""  // Use relative path in development (Vite proxy handles /api)
      : (typeof window !== "undefined"
        ? `${window.location.protocol}//${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}`
        : "http://localhost:4000")),

  // Development mode check
  isDevelopment: import.meta.env.DEV,

  // Production mode check
  isProduction: import.meta.env.PROD,

  // Firebase configuration
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  },
};

// Helper function to build full API URL
export const buildApiUrl = (path: string): string => {
  // Remove leading slash if present
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;

  // If the path already includes the base URL, return as is
  if (cleanPath.startsWith("http")) {
    return cleanPath;
  }

  return `${config.apiBaseUrl}/${cleanPath}`;
};

// Debug logging in development
if (config.isDevelopment) {
  console.log("🔧 App Configuration:");
  console.log("  API Base URL:", config.apiBaseUrl);
  console.log(
    "  Environment:",
    config.isDevelopment ? "Development" : "Production"
  );
  console.log("  Firebase Project:", config.firebase.projectId);
}
