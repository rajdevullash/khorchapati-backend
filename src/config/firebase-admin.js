// Firebase Admin SDK configuration for FCM push notifications
// This file loads Firebase Admin SDK using service account credentials

console.log('🔧 Loading Firebase Admin SDK configuration...');
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');


  // File not found, try environment variables as fallback
  // Try using environment variables (for production)
  const hasProjectId = !!process.env.FIREBASE_PROJECT_ID
  const hasClientEmail = !!process.env.FIREBASE_CLIENT_EMAIL
  const hasPrivateKey = !!process.env.FIREBASE_PRIVATE_KEY
  
  if (hasProjectId && hasClientEmail && hasPrivateKey) {
    try {
      // Only initialize if not already initialized
      if (!admin.apps || admin.apps.length === 0) {
        const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
        
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

