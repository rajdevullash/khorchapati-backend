// Firebase Admin SDK configuration for FCM push notifications
// This file loads Firebase Admin SDK using service account credentials

console.log('🔧 Loading Firebase Admin SDK configuration...');
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Path to service account key file
const serviceAccountPath = path.join(__dirname, 'service-account-key.json');

// Check if service account key file exists

  // File not found, try environment variables as fallback
  const hasProjectId = !!process.env.FIREBASE_PROJECT_ID;
  const hasClientEmail = !!process.env.FIREBASE_CLIENT_EMAIL;
  const hasPrivateKey = !!process.env.FIREBASE_PRIVATE_KEY;
  
  if (hasProjectId && hasClientEmail && hasPrivateKey) {
    try {
      // Only initialize if not already initialized
      if (!admin.apps || admin.apps.length === 0) {
        // Clean and format private key properly
        let privateKey = process.env.FIREBASE_PRIVATE_KEY;
        
        // Remove surrounding quotes if present (both single and double)
        privateKey = privateKey.replace(/^["']|["']$/g, '');
        
        // Replace escaped newlines with actual newlines
        // Handle both \\n and \n cases
        privateKey = privateKey.replace(/\\n/g, '\n');
        
        // Debug: Check if BEGIN/END markers are present (without logging the actual key)
        const hasBegin = privateKey.includes('BEGIN PRIVATE KEY');
        const hasEnd = privateKey.includes('END PRIVATE KEY');
        
        if (!hasBegin || !hasEnd) {
          console.error('⚠️ Private key format issue:');
          if (!hasBegin) console.error('   Missing BEGIN PRIVATE KEY marker');
          if (!hasEnd) console.error('   Missing END PRIVATE KEY marker');
          console.error('   Make sure to copy the ENTIRE private_key value from JSON file');
        }
        
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey,
          }),
        });
        console.log('');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ FIREBASE ADMIN SDK INITIALIZED');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`   Project ID: ${process.env.FIREBASE_PROJECT_ID}`);
        console.log(`   Client Email: ${process.env.FIREBASE_CLIENT_EMAIL}`);
        console.log('   FCM push notifications are ENABLED');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('');
      }
    } catch (error) {
      console.log('');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ FIREBASE ADMIN SDK INITIALIZATION FAILED');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error(`   Error: ${error.message}`);
      if (error.message.includes('secretOrPrivateKey')) {
        console.error('');
        console.error('   🔍 Private Key Format Issue Detected!');
        console.error('   Common causes:');
        console.error('   1. Private key missing BEGIN/END markers');
        console.error('   2. Newlines not properly escaped (should be \\n)');
        console.error('   3. Extra quotes or spaces');
        console.error('');
        console.error('   💡 Solution:');
        console.error('   - Copy the ENTIRE private_key value from JSON file');
        console.error('   - Include -----BEGIN PRIVATE KEY----- and -----END PRIVATE KEY-----');
        console.error('   - Keep all \\n characters as they are');
        console.error('   - Wrap in double quotes in Render environment variable');
      }
      if (error.stack) {
        console.error('   Stack:', error.stack.split('\n')[1]?.trim());
      }
      console.log('   FCM notifications will be DISABLED');
      console.log('   📖 See: backend/RENDER_ENV_SETUP.md for troubleshooting');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      // Don't throw - allow app to continue without FCM
    }
  } else {
    // Neither file nor env vars found
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚠️  FIREBASE ADMIN SDK: No Credentials Found');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('   ❌ service-account-key.json file not found');
    console.log('');
    console.log('   Missing environment variables (fallback):');
    if (!hasProjectId) {
      console.log('   ❌ FIREBASE_PROJECT_ID is missing');
    } else {
      console.log('   ✅ FIREBASE_PROJECT_ID is set');
    }
    if (!hasClientEmail) {
      console.log('   ❌ FIREBASE_CLIENT_EMAIL is missing');
    } else {
      console.log('   ✅ FIREBASE_CLIENT_EMAIL is set');
    }
    if (!hasPrivateKey) {
      console.log('   ❌ FIREBASE_PRIVATE_KEY is missing');
    } else {
      console.log('   ✅ FIREBASE_PRIVATE_KEY is set');
    }
    console.log('');
    console.log('   📝 To fix: Add service-account-key.json file to src/config/');
    console.log('   📖 See: backend/FIREBASE_QUICK_SETUP.md for guide');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
  }


module.exports = admin;
