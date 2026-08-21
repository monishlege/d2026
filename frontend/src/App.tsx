import { useEffect, useState } from "react";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";

import SecureLogin from "@/components/SecureLogin";
import Home from "@/pages/Home";
import { signOutUser, subscribeToAuthState } from "@/lib/firebaseAuth";

export default function App() {
  const [user, setUser] = useState<import("firebase/auth").User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    return subscribeToAuthState((nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
    });
  }, []);

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0D1117] text-sm text-slate-300">
        Checking secure access...
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            user ? <Home user={user} onLogout={() => void signOutUser()} /> : <SecureLogin />
          }
        />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route
          path="*"
          element={<div className="p-10 text-center text-sm text-slate-300">Route not found.</div>}
        />
      </Routes>
    </Router>
  );
}
