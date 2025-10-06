import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  onAuthStateChanged,
  User,
  getRedirectResult,
} from "firebase/auth";

// Firebase configuration with fallback values
const firebaseConfig = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY ||
    "AIzaSyCNq08Tzd1y8R8QbfGJ_7KmwMY3HEe3bUU",
  authDomain: `${
    import.meta.env.VITE_FIREBASE_PROJECT_ID || "error-analysis-f46c6"
  }.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "error-analysis-f46c6",
  storageBucket: `${
    import.meta.env.VITE_FIREBASE_PROJECT_ID || "error-analysis-f46c6"
  }.firebasestorage.app`,
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ||
    "1:619626851108:web:12ce0834c163c3a23421b1",
};

// Check if Firebase is configured - be more permissive for development
const isFirebaseConfigured = !!(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.appId &&
  firebaseConfig.apiKey !== "demo-api-key" &&
  firebaseConfig.projectId !== "demo-project" &&
  firebaseConfig.appId !== "demo-app-id"
);

// Debug logging only in development
if (import.meta.env.DEV) {
  console.log("=== Firebase Environment Debug ===");
  console.log("VITE_FIREBASE_API_KEY:", import.meta.env.VITE_FIREBASE_API_KEY);
  console.log(
    "VITE_FIREBASE_PROJECT_ID:",
    import.meta.env.VITE_FIREBASE_PROJECT_ID
  );
  console.log("VITE_FIREBASE_APP_ID:", import.meta.env.VITE_FIREBASE_APP_ID);
  console.log("isFirebaseConfigured:", isFirebaseConfigured);
}

// Initialize Firebase only if properly configured
let app: any = null;
let auth: any = null;
let googleProvider: any = null;

if (import.meta.env.DEV) {
  console.log("Attempting Firebase initialization...");
  console.log("Firebase config:", {
    apiKey: firebaseConfig.apiKey ? "***PRESENT***" : "MISSING",
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket,
    appId: firebaseConfig.appId ? "***PRESENT***" : "MISSING",
  });
}

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);

    // Google Auth Provider
    googleProvider = new GoogleAuthProvider();
    googleProvider.addScope("email");
    googleProvider.addScope("profile");

    if (import.meta.env.DEV) {
      console.log("✅ Firebase initialized successfully");
    }
  } catch (error) {
    console.error("❌ Firebase initialization failed:", error);
  }
} else {
  if (import.meta.env.DEV) {
    console.warn(
      "❌ Firebase is not properly configured. Missing required environment variables."
    );
  }
}

// Export auth and provider (may be null if not configured)
export { auth, googleProvider };

// Auth methods with safety checks
export const signInWithGoogle = async () => {
  if (!auth || !googleProvider || !isFirebaseConfigured) {
    throw new Error(
      "Firebase authentication is not configured. Please add Firebase credentials to your .env file."
    );
  }

  try {
    // Set additional provider settings for better popup handling
    googleProvider.setCustomParameters({
      prompt: "select_account",
    });

    const result = await signInWithPopup(auth, googleProvider);
    return result;
  } catch (error: any) {
    console.error("Google sign-in popup error:", error);

    // Handle specific popup errors and fallback to redirect
    if (error.code === "auth/popup-closed-by-user") {
      console.log("Popup closed by user, trying redirect method...");
      await signInWithRedirect(auth, googleProvider);
      throw new Error("Redirecting to Google sign-in...");
    } else if (error.code === "auth/popup-blocked") {
      console.log("Popup blocked, using redirect method...");
      await signInWithRedirect(auth, googleProvider);
      throw new Error("Redirecting to Google sign-in...");
    } else if (error.code === "auth/cancelled-popup-request") {
      throw new Error("Another sign-in popup is already open.");
    }

    throw error;
  }
};

// Alternative method using redirect (for popup issues)
export const signInWithGoogleRedirect = async () => {
  if (!auth || !googleProvider || !isFirebaseConfigured) {
    throw new Error(
      "Firebase authentication is not configured. Please add Firebase credentials to your .env file."
    );
  }

  googleProvider.setCustomParameters({
    prompt: "select_account",
  });

  await signInWithRedirect(auth, googleProvider);
};

export const logout = () => {
  if (!auth || !isFirebaseConfigured) {
    throw new Error(
      "Firebase authentication is not configured. Please add Firebase credentials to your .env file."
    );
  }
  return signOut(auth);
};

// Auth state observer
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  if (!auth || !isFirebaseConfigured) {
    console.warn("Firebase authentication is not configured");
    callback(null);
    return () => {}; // Return empty unsubscribe function
  }
  return onAuthStateChanged(auth, callback);
};

// Check if Firebase is properly configured
export const isAuthConfigured = () => isFirebaseConfigured;

// Handle redirect result (for compatibility)
export const handleRedirectResult = () => {
  if (!auth || !isFirebaseConfigured) {
    console.warn("Firebase auth not configured, skipping redirect result");
    return Promise.resolve(null);
  }
  return getRedirectResult(auth);
};

export default app;
