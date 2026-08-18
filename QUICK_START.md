# JanRakshak AI - Quick Start Guide

## What's New?

✅ **Brand Name**: Changed from "Jansahayak AI" to "JanRakshak AI"
✅ **Authentication**: New Firebase phone number + OTP login system

## Quick Setup (5 minutes)

### Step 1: Install Firebase Dependency
```bash
cd frontend
npm install
```

### Step 2: Get Firebase Credentials
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project or use existing one
3. Add a Web App
4. Copy the configuration

### Step 3: Create Environment File
Create `frontend/.env.local`:
```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### Step 4: Enable Phone Authentication
1. In Firebase Console → Authentication → Sign-in method
2. Enable "Phone" option

### Step 5: Run the App
```bash
npm run dev
```

## How to Use Phone Authentication

1. **Enter Phone Number**: Enter your 10-digit Indian phone number
2. **Send OTP**: Click "Send OTP" button
3. **Receive OTP**: Firebase sends SMS to your phone
4. **Enter OTP**: Enter the 6-digit code received
5. **Optional**: Add your full name
6. **Sign In**: Click "Verify OTP"
7. **Welcome**: You're now signed in to JanRakshak AI!

## Testing Without Real Phone Numbers

### Option 1: Use Firebase Emulator
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Set env variable
# Set VITE_USE_FIREBASE_EMULATOR=true in .env.local

# Run emulator
firebase emulator:start
```

### Option 2: Add Test Phone Numbers
1. Firebase Console → Authentication → Phone
2. Add test phone numbers (e.g., +919876543210)
3. Firebase will show fixed OTP for testing

## File Changes Overview

### Updated Files (Brand Name)
- 11 files updated with "JanRakshak AI" branding
- Backend, frontend, and documentation

### New Authentication Files
- `src/lib/firebase.ts` - Firebase setup
- `src/lib/firebaseAuth.ts` - OTP functions
- `src/types/firebase.d.ts` - Type definitions
- `FIREBASE_SETUP.md` - Detailed setup guide

### Modified Components
- `SecureLogin.tsx` - Phone + OTP UI
- `App.tsx` - Firebase integration
- `Home.tsx` - User info display

## Troubleshooting

### "RecAPTCHA verifier not initialized"
→ Ensure Firebase is configured in `.env.local`

### "Domain not authorized"
→ Add your domain in Firebase Console > Settings > Authorized Domains

### "OTP not received"
→ Check phone number format (+91XXXXXXXXXX)
→ Ensure Phone auth is enabled in Firebase

### "Invalid OTP"
→ OTP expires in 15 minutes - request new one
→ Check that you entered correct code

## Next Steps

1. ✅ Install dependencies
2. ✅ Configure Firebase
3. ✅ Set environment variables
4. ✅ Run `npm run dev`
5. ✅ Test phone login
6. 🔄 (Optional) Integrate backend with Firebase tokens

## Documentation

- **Setup Details**: See `FIREBASE_SETUP.md`
- **Full Summary**: See `IMPLEMENTATION_SUMMARY.md`
- **Firebase Docs**: https://firebase.google.com/docs/auth/web/phone-auth

## Important Notes

⚠️ **Never commit `.env.local`** - It contains sensitive Firebase keys
⚠️ **Phone format**: Only Indian numbers (+91) are currently configured
⚠️ **Production**: Add your production domain to Firebase authorized domains

## Support

1. Check browser console for error messages
2. Review Firebase Console logs
3. See detailed troubleshooting in `FIREBASE_SETUP.md`

---

**Enjoy using JanRakshak AI with secure phone authentication!** 🚀
