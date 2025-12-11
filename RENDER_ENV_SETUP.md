# Render Environment Variables Setup for Firebase Admin SDK

## Current Issue
Environment variables add korar por o Firebase Admin SDK initialize hocche na.

## Step-by-Step Fix

### 1. Render Dashboard e Check Korun

1. Go to: https://dashboard.render.com
2. Your backend service select korun
3. **Environment** tab e click korun
4. Check korun ei 3 ta variable ache kina:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`

### 2. Environment Variables Add/Edit

#### FIREBASE_PROJECT_ID
```
FIREBASE_PROJECT_ID=khorochkhata
```

#### FIREBASE_CLIENT_EMAIL
Downloaded JSON file theke `client_email` er value copy korun:
```
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@khorochkhata.iam.gserviceaccount.com
```

#### FIREBASE_PRIVATE_KEY
**⚠️ Most Important:** Downloaded JSON file theke `private_key` er **pura value** copy korun, including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`.

**Correct format:**
```
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n...more lines...\n-----END PRIVATE KEY-----\n"
```

**Important points:**
- Double quotes (`"`) er bhitore rakhte hobe
- `\n` characters intact rakhte hobe (Render automatically handle korbe)
- BEGIN and END lines must be included

### 3. Example from JSON File

Your downloaded `service-account-key.json` file er moddhe:

```json
{
  "project_id": "khorochkhata",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@khorochkhata.iam.gserviceaccount.com"
}
```

**Convert to environment variables:**
```
FIREBASE_PROJECT_ID=khorochkhata
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@khorochkhata.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

### 4. Save and Deploy

1. All 3 variables add/edit korar por **Save Changes** click korun
2. Service automatically redeploy korbe
3. **Logs** tab e check korun

### 5. Check Logs

**Success logs:**
```
✅ Firebase Admin SDK initialized from environment variables
   Project ID: khorochkhata
   Client Email: firebase-adminsdk-xxxxx@khorochkhata.iam.gserviceaccount.com
✅ Firebase Admin SDK initialized for FCM support
```

**Error logs (missing variables):**
```
⚠️ Firebase Admin SDK: Missing environment variables:
   - FIREBASE_PROJECT_ID is missing
   - FIREBASE_CLIENT_EMAIL is missing
   - FIREBASE_PRIVATE_KEY is missing
```

**Error logs (initialization failed):**
```
❌ Error initializing Firebase Admin SDK from env: ...
   Full error: ...
```

### 6. Common Issues

#### Issue: "Missing environment variables"
**Solution:** All 3 variables properly set korun. Check spelling - must be exact:
- `FIREBASE_PROJECT_ID` (not `FIREBASE_PROJECT`)
- `FIREBASE_CLIENT_EMAIL` (not `FIREBASE_EMAIL`)
- `FIREBASE_PRIVATE_KEY` (not `FIREBASE_KEY`)

#### Issue: "Error initializing Firebase Admin SDK"
**Solution:** 
- `FIREBASE_PRIVATE_KEY` er format check korun
- Double quotes use korun
- Private key er pura value copy korun (BEGIN/END lines shoho)

#### Issue: Variables set but still not working
**Solution:**
- Service ta **restart** korun (Manual Deploy → Deploy latest commit)
- Logs tab e exact error message check korun

### 7. Test After Setup

1. Transaction add korun Flutter app e
2. Backend logs e dekhte pabe:
   - ✅ `FCM push notification sent successfully` - Working!
   - ⚠️ `FCM token detected but Firebase Admin SDK not configured` - Still need setup

## Quick Checklist

- [ ] All 3 environment variables added in Render
- [ ] Variable names are exact (case-sensitive)
- [ ] `FIREBASE_PRIVATE_KEY` includes BEGIN/END lines
- [ ] `FIREBASE_PRIVATE_KEY` is in double quotes
- [ ] Service restarted after adding variables
- [ ] Checked logs for success/error messages

