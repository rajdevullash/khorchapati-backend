# 🔥 Firebase Admin SDK Quick Setup

## Current Status
✅ Backend code is ready  
⚠️ Firebase Admin SDK credentials needed

## Quick Steps (5 minutes)

### Step 1: Download Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **khorochkhata**
3. Click ⚙️ **Project Settings** (gear icon)
4. Go to **Service Accounts** tab
5. Click **Generate new private key**
6. Click **Generate key** (JSON file will download)

### Step 2: Save the File

1. Save the downloaded JSON file as:
   ```
   ay-bay/backend/src/config/service-account-key.json
   ```

### Step 3: Restart Backend

```bash
cd ay-bay/backend
npm install firebase-admin  # If not already installed
npm start  # or npm run dev
```

### Step 4: Verify

Look for this in backend logs:
- ✅ `Firebase Admin SDK initialized successfully` - Success!
- ⚠️ `Firebase Admin SDK: No credentials found` - Check file path

### Step 5: Test

1. Add a transaction in Flutter app
2. Check backend logs for:
   - ✅ `FCM push notification sent successfully` - Working!
   - ⚠️ `FCM token detected but Firebase Admin SDK not configured` - Still need setup

## Alternative: Environment Variables (for Production)

If you're deploying to a server (like Render), use environment variables instead:

```env
FIREBASE_PROJECT_ID=khorochkhata
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@khorochkhata.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Get these values from the downloaded service account JSON file.

## Project Info

- **Project ID**: khorochkhata
- **Project Number**: 895131053128
- **Config file location**: `ay-bay/backend/src/config/firebase-admin.js`
- **Service account key**: `ay-bay/backend/src/config/service-account-key.json`

⚠️ **Important**: Never commit `service-account-key.json` to git! It's already in `.gitignore`.

