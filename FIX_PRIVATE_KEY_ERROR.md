# Fix: "secretOrPrivateKey must be an asymmetric key when using RS256"

## Error Message
```
❌ Error sending FCM push notification: Error: secretOrPrivateKey must be an asymmetric key when using RS256
```

## Cause
The `FIREBASE_PRIVATE_KEY` environment variable in Render has incorrect format.

## Solution

### Step 1: Get the Correct Private Key

1. Download your service account JSON file from Firebase Console
2. Open the JSON file
3. Find the `private_key` field - it should look like this:

```json
{
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n...more lines...\n-----END PRIVATE KEY-----\n"
}
```

### Step 2: Copy the ENTIRE Value

**Important:** Copy the COMPLETE `private_key` value, including:
- `-----BEGIN PRIVATE KEY-----`
- All the encoded content in between
- `-----END PRIVATE KEY-----`
- The `\n` characters (keep them as `\n`, don't convert to actual newlines)

### Step 3: Set in Render

1. Go to Render Dashboard → Your Backend Service → Environment tab
2. Find `FIREBASE_PRIVATE_KEY` variable
3. Click Edit
4. **Delete the old value completely**
5. Paste the new value in this format:

```
"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n...more lines...\n-----END PRIVATE KEY-----\n"
```

**Key Points:**
- ✅ Wrap in double quotes (`"`)
- ✅ Keep `\n` as literal characters (don't convert to actual newlines)
- ✅ Include BEGIN and END markers
- ✅ Copy the ENTIRE value from JSON file

### Step 4: Save and Redeploy

1. Click **Save Changes**
2. Render will automatically redeploy
3. Check logs - you should see:
   - ✅ `FIREBASE ADMIN SDK INITIALIZED`
   - ✅ `FCM push notifications are ENABLED`

### Step 5: Test

Add a transaction in Flutter app. You should see:
- ✅ `FCM push notification sent successfully`

## Common Mistakes

❌ **Wrong:** Missing BEGIN/END markers
```
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
```

✅ **Correct:** With BEGIN/END markers
```
"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

❌ **Wrong:** Converting `\n` to actual newlines
```
"-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
-----END PRIVATE KEY-----"
```

✅ **Correct:** Keep `\n` as literal characters
```
"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

## Quick Check

After updating, check Render logs. If you see:
- `⚠️ Private key format issue: Missing BEGIN marker` → Add BEGIN marker
- `⚠️ Private key format issue: Missing END marker` → Add END marker
- `✅ FIREBASE ADMIN SDK INITIALIZED` → Success!

## Still Having Issues?

1. Double-check the JSON file - make sure `private_key` field exists
2. Copy the value exactly as it appears in JSON (including quotes)
3. In Render, make sure there are no extra spaces before/after
4. Try removing and re-adding the environment variable

