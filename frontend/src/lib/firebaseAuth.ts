import {
  signInWithPhoneNumber,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  ConfirmationResult,
  updateProfile,
} from "firebase/auth";
import { auth } from "./firebase";

let confirmationResult: ConfirmationResult | null = null;

/**
 * Send OTP to phone number
 */
export async function sendOTP(phoneNumber: string): Promise<string> {
  try {
    // Create an invisible reCAPTCHA verifier
    const recaptchaVerifier = window.recaptchaVerifier;
    if (!recaptchaVerifier) {
      throw new Error("RecAPTCHA verifier is not initialized. Make sure RecaptchaVerifier is set up in your app.");
    }

    const result = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
    confirmationResult = result;
    return "OTP sent successfully";
  } catch (error) {
    console.error("Error sending OTP:", error);
    throw error;
  }
}

/**
 * Verify OTP and sign in user
 */
export async function verifyOTP(otp: string, displayName?: string): Promise<User> {
  try {
    if (!confirmationResult) {
      throw new Error("OTP was not sent. Please request OTP first.");
    }

    const userCredential = await confirmationResult.confirm(otp);
    const user = userCredential.user;

    if (displayName) {
      await updateProfile(user, { displayName });
    }

    return user;
  } catch (error) {
    console.error("OTP verification error:", error);
    throw error;
  }
}

/**
 * Sign out the current user
 */
export async function signOutUser(): Promise<void> {
  try {
    await firebaseSignOut(auth);
    confirmationResult = null;
  } catch (error) {
    console.error("Sign out error:", error);
    throw error;
  }
}

/**
 * Get the current authenticated user
 */
export function getCurrentUser(): User | null {
  return auth.currentUser;
}

/**
 * Subscribe to auth state changes
 */
export function subscribeToAuthState(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

/**
 * Check if OTP has been sent
 */
export function isOTPSent(): boolean {
  return confirmationResult !== null;
}

/**
 * Get the ID token for authenticated requests to backend
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    const user = auth.currentUser;
    if (user) {
      return await user.getIdToken();
    }
    return null;
  } catch (error) {
    console.error("Get auth token error:", error);
    return null;
  }
}
