// Example Firebase Admin SDK configuration
// Copy this file to firebase-admin.js and add your Firebase service account credentials

const admin = require('firebase-admin');

// Option 1: Use service account key file (for local development)
// Download service account key from Firebase Console:
// Project Settings → Service Accounts → Generate new private key
const serviceAccount = require('./service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Option 2: Use environment variables (for production)
// Set these environment variables in your hosting platform
/*
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});
*/

module.exports = admin;

