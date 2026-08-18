# Firebase Phone Authentication Setup Guide

This guide explains how to set up Firebase Phone Authentication for JanRakshak AI.

## Prerequisites
- A Google Cloud/Firebase account
- Admin access to create/configure a Firebase project

## Step-by-Step Setup

### 1. Create a Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Create a new project" or select an existing project
3. Name it "JanRakshak AI" (or your preferred name)
4. Accept the Firebase terms and create the project

### 2. Add a Web App
1. In your Firebase project, click the **Web** icon (</> symbol) to add a web app
2. Register your app with a name (e.g., "JanRakshak Web")
3. Firebase will provide you with the configuration object
4. Copy these values:
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`

### 3. Enable Phone Authentication
1. Go to **Authentication** section in Firebase Console
2. Click the **Sign-in method** tab
3. Click **Phone** in the list of providers
4. Toggle **Enable** to turn on phone authentication
5. (Optional) Add your test phone numbers in the "Phone numbers for testing" section

### 4. Configure reCAPTCHA
1. Phone authentication requires reCAPTCHA verification
2. Firebase automatically manages this, but you need to:
   - Ensure your domain is authorized in Firebase Console
   - For development: add `localhost` to authorized domains
   - For production: add your domain

### 5. Add Environment Variables
1. Copy `.env.example` to `.env.local`
2. Fill in the Firebase configuration values from Step 2:

```bash
VITE_FIREBASE_API_KEY=<your-api-key>
VITE_FIREBASE_AUTH_DOMAIN=<your-auth-domain>
VITE_FIREBASE_PROJECT_ID=<your-project-id>
VITE_FIREBASE_STORAGE_BUCKET=<your-storage-bucket>
VITE_FIREBASE_MESSAGING_SENDER_ID=<your-messaging-sender-id>
VITE_FIREBASE_APP_ID=<your-app-id>
```

### 6. Install Dependencies
```bash
cd frontend
npm install
```

### 7. Run the Application
```bash
npm run dev
```

## Testing Phone Authentication

### Test with Real Phone Numbers
1. Users can enter any phone number in the format: `+91XXXXXXXXXX` (India)
2. Firebase will send a real OTP via SMS
3. User enters the 6-digit OTP to sign in

### Test with Test Phone Numbers (Firebase Emulator)
1. In Firebase Console, add test phone numbers under Phone authentication settings
2. For these numbers, Firebase provides a fixed OTP code
3. Users can use these for testing without sending real SMS

## Troubleshooting

### "RecAPTCHA verifier is not initialized"
- Ensure the app is properly initialized by calling `initializeRecaptcha()` in App.tsx
- Check that the `#recaptcha-container` div exists in the App

### "This domain is not authorized"
- Add your domain to Firebase Console > Project Settings > Authorized Domains
- For localhost development, ensure it's in the list

### "Failed to send OTP"
- Verify phone number format: `+91XXXXXXXXXX` for India
- Check Firebase Console for any quota limits
- Ensure Phone authentication is enabled in Firebase

### "Invalid OTP" on verification
- OTP is time-sensitive (usually 15 minutes)
- Request a new OTP if it expires
- Check that the user entered the correct OTP

## Phone Number Format

The application supports:
- **Input format**: 10-digit number (e.g., `9876543210`)
- **Auto-formatted to**: `+91` prefix (e.g., `+919876543210`)
- **Full format**: `+919876543210`

## Security Notes

1. **Never commit `.env.local`** to version control
2. **API Key exposure**: Firebase API keys are meant to be public (they're embedded in your app)
3. **Phone number privacy**: Ensure compliance with local privacy regulations
4. **Rate limiting**: Firebase automatically limits OTP requests per phone number
5. **Emulator mode**: Use Firebase Emulator for development to avoid SMS charges

## Additional Resources

- [Firebase Phone Authentication Documentation](https://firebase.google.com/docs/auth/web/phone-auth)
- [Firebase Console](https://console.firebase.google.com)
- [Firebase Emulator Setup](https://firebase.google.com/docs/emulator-suite)

## Support

For issues or questions:
1. Check Firebase Console for error logs
2. Review browser console for detailed error messages
3. Consult Firebase documentation
4. Check project issues/discussions
