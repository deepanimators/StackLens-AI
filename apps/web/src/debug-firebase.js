// Debug Firebase configuration
console.log("=== Firebase Configuration Debug ===");
console.log("Environment Variables:");
console.log("VITE_FIREBASE_API_KEY:", import.meta.env.VITE_FIREBASE_API_KEY);
console.log(
  "VITE_FIREBASE_PROJECT_ID:",
  import.meta.env.VITE_FIREBASE_PROJECT_ID
);
console.log("VITE_FIREBASE_APP_ID:", import.meta.env.VITE_FIREBASE_APP_ID);

// Check if Firebase is configured
const isFirebaseConfigured =
  import.meta.env.VITE_FIREBASE_API_KEY &&
  import.meta.env.VITE_FIREBASE_PROJECT_ID &&
  import.meta.env.VITE_FIREBASE_APP_ID;

console.log("isFirebaseConfigured:", isFirebaseConfigured);

// Show the actual config being used
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-api-key",
  authDomain: `${
    import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-project"
  }.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-project",
  storageBucket: `${
    import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-project"
  }.firebasestorage.app`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "demo-app-id",
};

console.log("Firebase Config:", firebaseConfig);
console.log("==========================================");
