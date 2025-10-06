import { initializeApp, cert } from "firebase-admin/app";
import { getAuth, UserRecord } from "firebase-admin/auth";
import { storage } from "../../database/database-storage.js";

// Initialize Firebase Admin
let firebaseApp: any = null;

try {
  // For production, you would use a service account key
  // For development, we'll use the client config with admin SDK
  firebaseApp = initializeApp({
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  });
} catch (error) {
  console.error("Firebase admin initialization error:", error);
}

export const firebaseAuth = firebaseApp ? getAuth(firebaseApp) : null;

export interface FirebaseUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
}

export async function verifyFirebaseToken(idToken: string): Promise<FirebaseUser | null> {
  if (!firebaseAuth) {
    console.error("Firebase auth not initialized");
    return null;
  }

  try {
    const decodedToken = await firebaseAuth.verifyIdToken(idToken);
    
    return {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
      displayName: decodedToken.name || '',
      photoURL: decodedToken.picture
    };
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
}

export async function syncFirebaseUser(firebaseUser: FirebaseUser): Promise<any> {
  try {
    // Check if user exists in our database
    let user = await storage.getUserByEmail(firebaseUser.email);
    
    if (!user) {
      // Create new user
      user = await storage.createUser({
        username: firebaseUser.displayName || firebaseUser.email.split('@')[0],
        email: firebaseUser.email,
        password: '', // No password for Firebase users
        firstName: firebaseUser.displayName?.split(' ')[0] || '',
        lastName: firebaseUser.displayName?.split(' ').slice(1).join(' ') || '',
        profileImageUrl: firebaseUser.photoURL,
        role: 'user',
        isActive: true,
        lastLogin: new Date()
      });
    } else {
      // Update existing user
      await storage.updateUser(user.id, {
        profileImageUrl: firebaseUser.photoURL,
        lastLogin: new Date()
      });
    }
    
    return user;
  } catch (error) {
    console.error("User sync failed:", error);
    throw error;
  }
}