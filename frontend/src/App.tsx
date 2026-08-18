import { useEffect, useState } from "react";
import { User } from "firebase/auth";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

import SecureLogin from "@/components/SecureLogin";
import Home from "@/pages/Home";
import { subscribeToAuthState, signOutUser } from "@/lib/firebaseAuth";
import { initializeRecaptcha } from "@/lib/firebase";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  // Initialize Firebase and RecaptchaVerifier on mount
  useEffect(() => {
    initializeRecaptcha();
  }, []);

  // Subscribe to auth state changes
  useEffect(() => {
    const unsubscribe = subscribeToAuthState((user) => {
      setCurrentUser(user);
      setIsLoading(false);
    });

    // Clean up subscription
    return () => unsubscribe();
  }, []);

  async function handleLogout() {
    try {
      setAuthError("");
      await signOutUser();
    } catch (error) {
      console.error("Logout error:", error);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900">
        <div className="text-center text-white">
          <div className="mb-4 text-lg">Loading...</div>
          <div className="h-2 w-32 animate-pulse bg-slate-700"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div id="recaptcha-container"></div>
      <Router>
        <Routes>
          <Route
            path="/"
            element={
              currentUser ? (
                <Home onLogout={handleLogout} user={currentUser} />
              ) : (
                <SecureLogin authError={authError} />
              )
            }
          />
          <Route
            path="*"
            element={<div className="p-10 text-center text-sm text-slate-300">Route not found.</div>}
          />
        </Routes>
      </Router>
    </>
  );
}
