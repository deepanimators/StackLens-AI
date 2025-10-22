#!/usr/bin/env node

/**
 * Firebase Token Generator for Testing
 * 
 * This script helps you generate a Firebase ID token for testing purposes.
 * 
 * Usage:
 *   1. Run: node scripts/generate-firebase-token.js
 *   2. Follow the prompts to sign in with Google
 *   3. Copy the generated token to your .env file as TEST_FIREBASE_TOKEN
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import readline from 'readline';

// Firebase configuration from your .env
const firebaseConfig = {
  apiKey: "AIzaSyCNq08Tzd1y8R8QbfGJ_7KmwMY3HEe3bUU",
  authDomain: "error-analysis-f46c6.firebaseapp.com",
  projectId: "error-analysis-f46c6",
  storageBucket: "error-analysis-f46c6.firebasestorage.app",
  messagingSenderId: "619626851108",
  appId: "1:619626851108:web:12ce0834c163c3a23421b1",
  measurementId: "G-7CN6THR8DP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function generateToken() {
  console.log('🔐 Firebase Token Generator\n');
  console.log('Choose authentication method:');
  console.log('1. Email/Password');
  console.log('2. Create a custom token (requires Admin SDK)');
  console.log('3. Use existing credentials\n');

  const choice = await question('Enter your choice (1-3): ');

  try {
    if (choice === '1') {
      console.log('\n📧 Email/Password Sign-In');
      const email = await question('Enter email: ');
      const password = await question('Enter password: ');

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const token = await userCredential.user.getIdToken();

      console.log('\n✅ Token generated successfully!\n');
      console.log('════════════════════════════════════════════════════════════');
      console.log('Copy this token to your .env file as TEST_FIREBASE_TOKEN:');
      console.log('════════════════════════════════════════════════════════════\n');
      console.log(token);
      console.log('\n════════════════════════════════════════════════════════════');
      console.log('\nToken will expire in 1 hour. Regenerate when needed.');
      console.log('User:', userCredential.user.email);
      console.log('UID:', userCredential.user.uid);

    } else if (choice === '2') {
      console.log('\n⚠️  Custom token generation requires Firebase Admin SDK');
      console.log('Please use option 3 instead or set up Admin SDK separately.');
      
    } else if (choice === '3') {
      console.log('\n📋 Manual Token Retrieval Steps:\n');
      console.log('1. Open your application in a browser');
      console.log('2. Sign in with your Google account');
      console.log('3. Open browser DevTools (F12)');
      console.log('4. Go to Console tab');
      console.log('5. Run this command:\n');
      console.log('   firebase.auth().currentUser.getIdToken().then(token => console.log(token))\n');
      console.log('6. Copy the output token');
      console.log('7. Add it to .env file as TEST_FIREBASE_TOKEN=<token>\n');
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code === 'auth/user-not-found') {
      console.log('\n💡 User not found. Please create an account first or use a different method.');
    } else if (error.code === 'auth/wrong-password') {
      console.log('\n💡 Incorrect password. Please try again.');
    } else if (error.code === 'auth/invalid-email') {
      console.log('\n💡 Invalid email format. Please check and try again.');
    }
  } finally {
    rl.close();
    process.exit(0);
  }
}

generateToken();
