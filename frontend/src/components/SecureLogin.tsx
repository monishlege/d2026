import { LockKeyhole, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";

interface SecureLoginProps {
  onLogin: (username: string, password: string) => Promise<void>;
  authError?: string;
}

export default function SecureLogin({ onLogin, authError }: SecureLoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(authError ?? "");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      await onLogin(username.trim(), password);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.22),_transparent_45%),linear-gradient(135deg,_#020617,_#111827)] px-4 py-10 text-slate-100">
      <div className="w-full max-w-md rounded-[32px] border border-white/10 bg-slate-950/80 p-8 shadow-2xl shadow-cyan-950/30 backdrop-blur">
        <div className="flex items-center gap-3 text-cyan-200">
          <ShieldCheck className="h-6 w-6" />
          <span className="text-xs uppercase tracking-[0.3em]">Secure access</span>
        </div>

        <h1 className="mt-6 font-display text-3xl text-white">Secure access</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Protected JanSahayak dashboard for authorised officers.
        </p>

        <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="username" className="mb-2 block text-sm font-medium text-slate-200">
              Username
            </label>
            <input
              id="username"
              name="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none ring-0 transition focus:border-cyan-400"
              placeholder="Enter username"
              autoComplete="username"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-200">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
              placeholder="Enter password"
              autoComplete="current-password"
              required
            />
          </div>

          {message ? (
            <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {message}
            </div>
          ) : null}

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={loading}
          >
            <LockKeyhole className="h-4 w-4" />
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
