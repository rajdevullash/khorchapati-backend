# Firebase Admin SDK Setup for FCM Push Notifications

## Overview
This guide explains how to set up Firebase Admin SDK in the ay-bay backend to support FCM (Firebase Cloud Messaging) push notifications for Flutter apps.

## Steps

### 1. Install Firebase Admin SDK

```bash
cd backend
npm install firebase-admin
```

### 2. Get Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create a new one)
3. Go to **Project Settings** → **Service Accounts**
4. Click **Generate new private key**
5. Save the JSON file as `backend/src/config/service-account-key.json`

⚠️ **Important**: Add `service-account-key.json` to `.gitignore` - never commit this file!

### 3. Create Firebase Admin Config

1. Copy `backend/src/config/firebase-admin.example.js` to `backend/src/config/firebase-admin.js`
2. The file should automatically load your service account key

### 4. Verify Setup

Restart your backend server. You should see:
- `✅ Firebase Admin SDK initialized` - Success!
- `⚠️ Firebase Admin SDK not configured...` - Check your config file

## How It Works

The updated `notificationService.js` now supports **both**:
- **Expo Push Tokens** (for React Native/Expo apps) - Uses `expo-server-sdk`
- **FCM Tokens** (for Flutter apps) - Uses `firebase-admin`

The service automatically detects the token type and uses the appropriate method to send push notifications.

## Testing

1. Login to Flutter app (FCM token will be saved)
2. Add a transaction
3. Check backend logs:
   - `✅ FCM push notification sent successfully` - Working!
   - `❌ Error sending FCM push notification` - Check error message

## Environment Variables (Alternative for Production)

Instead of using a JSON file, you can use environment variables:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Then update `firebase-admin.js` to use environment variables (see the example file).

## Troubleshooting

### Error: "Firebase Admin SDK not configured"
- Check if `firebase-admin.js` exists in `backend/src/config/`
- Verify service account key file is correct
- Check file paths are correct

### Error: "messaging/invalid-registration-token"
- FCM token might be expired or invalid
- App will automatically remove invalid tokens
- User needs to login again to get new token

### Error: "Permission denied"
- Check Firebase service account has proper permissions
- Verify project ID matches

## Notes

- The backend supports **both** Expo and FCM tokens simultaneously
- If Firebase Admin SDK is not configured, FCM tokens will be saved but notifications won't be sent
- Expo tokens will continue to work normally regardless of Firebase setup

