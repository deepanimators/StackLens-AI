#!/usr/bin/env node

/**
 * Generate a mock Firebase token for testing
 * This creates a JWT with the same structure as Firebase tokens
 * Note: This is for development/testing ONLY and should not be used in production
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a mock JWT token with standard Firebase claims
function generateMockFirebaseToken() {
  const header = {
    alg: 'HS256', // Use HS256 for mock tokens (easier to verify)
    kid: 'mock-key-id',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: 'https://securetoken.google.com/error-analysis-f46c6',
    aud: 'error-analysis-f46c6',
    auth_time: now,
    user_id: 'test-user-001',
    sub: 'test-user-001',
    iat: now,
    exp: now + (7 * 24 * 60 * 60), // Valid for 7 days
    email: 'test@stacklens.ai',
    email_verified: false,
    firebase: {
      identities: {
        email: ['test@stacklens.ai']
      },
      sign_in_provider: 'password'
    }
  };

  // Use a simple HMAC signature for mock token
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64').replace(/=/g, '');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64').replace(/=/g, '');
  const signature = crypto
    .createHmac('sha256', 'mock-secret-key')
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64')
    .replace(/=/g, '');

  const token = `${headerB64}.${payloadB64}.${signature}`;

  return {
    token,
    payload,
    expiresAt: new Date(payload.exp * 1000).toISOString()
  };
}

// Check if token is valid
function validateToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, reason: 'Invalid token format' };
    }

    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    const now = Math.floor(Date.now() / 1000);
    
    if (payload.exp < now) {
      return { valid: false, reason: 'Token expired', expiresAt: new Date(payload.exp * 1000).toISOString() };
    }

    const daysLeft = Math.floor((payload.exp - now) / (24 * 60 * 60));
    return { valid: true, daysLeft, expiresAt: new Date(payload.exp * 1000).toISOString() };
  } catch (error) {
    return { valid: false, reason: 'Could not parse token' };
  }
}

// Main execution
function main() {
  const envPath = path.join(__dirname, '..', '.env');
  
  // Check if .env exists and has a token
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const tokenMatch = envContent.match(/TEST_FIREBASE_TOKEN=(.+?)(?:\n|$)/);
    
    if (tokenMatch && tokenMatch[1]) {
      const currentToken = tokenMatch[1];
      const validation = validateToken(currentToken);
      
      if (validation.valid) {
        console.log('✅ Token is valid');
        console.log(`⏰ Expires in ${validation.daysLeft} days (${validation.expiresAt})`);
        return; // Token is still valid, no need to regenerate
      } else {
        console.log(`⚠️  Current token is invalid: ${validation.reason}`);
        if (validation.expiresAt) {
          console.log(`   Expired at: ${validation.expiresAt}`);
        }
      }
    }
  }

  console.log('🔑 Generating new Firebase test token...\n');
  
  const { token, payload, expiresAt } = generateMockFirebaseToken();

  console.log('✅ Token generated successfully!');
  console.log(`\n📧 Email: ${payload.email}`);
  console.log(`👤 User ID: ${payload.user_id}`);
  console.log(`⏰ Expires: ${expiresAt}`);
  console.log(`\n🔑 Token:\n${token}\n`);

  // Update .env file
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, 'utf-8');
    
    // Replace or add TEST_FIREBASE_TOKEN
    if (envContent.includes('TEST_FIREBASE_TOKEN=')) {
      envContent = envContent.replace(
        /TEST_FIREBASE_TOKEN=.*/,
        `TEST_FIREBASE_TOKEN=${token}`
      );
    } else {
      envContent += `\n# Test Firebase Token (Mock - Valid for 7 days)\nTEST_FIREBASE_TOKEN=${token}\n`;
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Updated .env with new token\n');
  } else {
    console.warn('⚠️  .env file not found. Token not saved.\n');
  }

  console.log('💡 Usage:');
  console.log(`   export TEST_FIREBASE_TOKEN=${token}`);
  console.log('   npm run test');
}

main();
