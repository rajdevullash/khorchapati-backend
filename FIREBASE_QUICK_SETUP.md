# 🔥 Firebase Admin SDK Quick Setup

## Current Status
✅ Backend code is ready  
⚠️ Firebase Admin SDK credentials needed

## Two Options:

### Option 1: Local Development (File-based)

For local development, use the service account key file:

1. Download service account key from Firebase Console
2. Save as: `ay-bay/backend/src/config/service-account-key.json`
3. File is in `.gitignore` - will NOT be committed

### Option 2: Production/Render (Environment Variables) ⭐ Recommended

For production (Render), use environment variables (more secure):

## Quick Steps for Render

### Step 1: Download Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **khorochkhata**
3. Click ⚙️ **Project Settings** (gear icon)
4. Go to **Service Accounts** tab
5. Click **Generate new private key**
6. Click **Generate key** (JSON file will download)

### Step 2: Extract Values from JSON

Open the downloaded JSON file. You need these 3 values:

```json
{
  "project_id": "khorochkhata",
  "client_email": "firebase-adminsdk-xxxxx@khorochkhata.iam.gserviceaccount.com",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
}
```

### Step 3: Add to Render Environment Variables

1. Go to Render Dashboard
2. Select your backend service
3. Go to **Environment** tab
4. Add these 3 variables:

```
FIREBASE_PROJECT_ID=khorochkhata
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@khorochkhata.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

⚠️ **Important for FIREBASE_PRIVATE_KEY:**
- Copy the ENTIRE private_key value from JSON (including `-----BEGIN...` and `-----END...`)
- Keep it in double quotes (`"`)
- Keep all `\n` characters as they are

### Step 4: Deploy

Render will automatically redeploy. Check logs for:
- ✅ `FIREBASE ADMIN SDK INITIALIZED` - Success!
- ❌ `Missing environment variables` - Check your variables

### Step 5: Test

1. Add a transaction in Flutter app
2. Check backend logs for:
   - ✅ `FCM push notification sent successfully` - Working!

## How It Works

- **Local**: Uses `service-account-key.json` file (if exists)
- **Production**: Falls back to environment variables if file not found
- **Priority**: File first, then environment variables

## Project Info

- **Project ID**: khorochkhata
- **Project Number**: 895131053128
- **Config file**: `ay-bay/backend/src/config/firebase-admin.js`
- **Service account key**: `ay-bay/backend/src/config/service-account-key.json` (local only, gitignored)

📖 **Detailed Render setup guide**: See [`RENDER_ENV_SETUP.md`](./RENDER_ENV_SETUP.md)
