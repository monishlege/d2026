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
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDQLjICU0eq3Bl2foHV-yk65hYn6Ju1jgc",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "decodesih26.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "decodesih26",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "decodesih26.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "341205801623",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:341205801623:web:eafcceefb00676bf2a67d2",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-9277BGKHV9",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

if (typeof window !== "undefined") {
  isSupported()
    .then((supported) => {
      if (supported) getAnalytics(app);
    })
    .catch(() => undefined);
}

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
        callback: () => undefined,
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
