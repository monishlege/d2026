import { useState } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

import SecureLogin from "@/components/SecureLogin";
import Home from "@/pages/Home";
import { login } from "@/utils/api";

const AUTH_TOKEN_KEY = "jansahayak-auth-token";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(localStorage.getItem(AUTH_TOKEN_KEY)));
  const [authError, setAuthError] = useState("");

  async function handleLogin(username: string, password: string) {
    const response = await login({ username, password });
    localStorage.setItem(AUTH_TOKEN_KEY, response.token);
    setAuthError("");
    setIsAuthenticated(true);
  }

  function handleLogout() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setIsAuthenticated(false);
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Home onLogout={handleLogout} />
            ) : (
              <SecureLogin onLogin={handleLogin} authError={authError} />
            )
          }
        />
        <Route
          path="*"
          element={<div className="p-10 text-center text-sm text-slate-300">Route not found.</div>}
        />
      </Routes>
    </Router>
  );
}
