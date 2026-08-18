import { initializeApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  Auth,
  setPersistence,
  browserLocalPersistence,
  RecaptchaVerifier,
} from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

// Firebase configuration
// Replace these values with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDemoKeyForJanRakshak",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "janrakshak-demo.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "janrakshak-demo",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "janrakshak-demo.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789:web:abcdef123456",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and set up persistence
export const auth: Auth = getAuth(app);

// Set persistence to LOCAL so users stay signed in
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.warn("Failed to set auth persistence:", error);
});

// Enable Auth emulator in development (optional)
if (import.meta.env.VITE_USE_FIREBASE_EMULATOR === "true") {
  try {
    connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
  } catch (error) {
    console.warn("Auth emulator already connected or not available");
  }
}

// Initialize Firestore (optional - for storing user data)
export const firestore: Firestore = getFirestore(app);

// Initialize RecaptchaVerifier for phone authentication
export function initializeRecaptcha(): void {
  try {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
        callback: (token: string) => {
          console.log("reCAPTCHA token generated:", token);
        },
        "expired-callback": () => {
          console.warn("reCAPTCHA token expired");
          window.recaptchaVerifier = null;
        },
      });
    }
  } catch (error) {
    console.error("Failed to initialize RecaptchaVerifier:", error);
  }
}

export default app;
