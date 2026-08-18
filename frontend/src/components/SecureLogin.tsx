import { LockKeyhole, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { sendOTP, verifyOTP } from "@/lib/firebaseAuth";

interface SecureLoginProps {
  authError?: string;
}

export default function SecureLogin({ authError }: SecureLoginProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(authError ?? "");
  const [otpSent, setOtpSent] = useState(false);

  async function handleSendOTP(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    
    if (!phoneNumber.trim()) {
      setMessage("Please enter a valid phone number");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      // Format phone number with country code if not already present
      let formattedPhone = phoneNumber.trim();
      if (!formattedPhone.startsWith("+")) {
        formattedPhone = "+91" + formattedPhone.replace(/\D/g, "");
      }

      await sendOTP(formattedPhone);
      setOtpSent(true);
      setMessage("OTP sent successfully! Check your phone.");
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to send OTP. Please try again.";
      setMessage(errorMessage);
      setOtpSent(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOTP(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!otp.trim() || otp.length !== 6) {
      setMessage("Please enter a valid 6-digit OTP");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      await verifyOTP(otp, displayName.trim() || undefined);
      setMessage("Login successful!");
    } catch (error: any) {
      const errorMessage = error?.message || "Invalid OTP. Please try again.";
      setMessage(errorMessage);
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
          Protected JanRakshak dashboard for authorised officers.
        </p>

        {!otpSent ? (
          <form className="mt-7 space-y-4" onSubmit={handleSendOTP}>
            <div>
              <label htmlFor="phoneNumber" className="mb-2 block text-sm font-medium text-slate-200">
                Phone Number
              </label>
              <div className="flex gap-2">
                <span className="inline-flex items-center rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-slate-400">
                  +91
                </span>
                <input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none ring-0 transition focus:border-cyan-400"
                  placeholder="Enter 10-digit phone number"
                  pattern="[0-9]{10}"
                  required
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">Enter your 10-digit mobile number</p>
            </div>

            {message ? (
              <div className={`rounded-2xl border px-4 py-3 text-sm ${
                message.includes("successfully") 
                  ? "border-green-400/20 bg-green-500/10 text-green-200" 
                  : "border-red-400/20 bg-red-500/10 text-red-200"
              }`}>
                {message}
              </div>
            ) : null}

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={loading}
            >
              <LockKeyhole className="h-4 w-4" />
              {loading ? "Sending OTP..." : "Send OTP"}
            </button>
          </form>
        ) : (
          <form className="mt-7 space-y-4" onSubmit={handleVerifyOTP}>
            <div>
              <label htmlFor="displayName" className="mb-2 block text-sm font-medium text-slate-200">
                Full Name (Optional)
              </label>
              <input
                id="displayName"
                name="displayName"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none ring-0 transition focus:border-cyan-400"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label htmlFor="otp" className="mb-2 block text-sm font-medium text-slate-200">
                Enter OTP
              </label>
              <input
                id="otp"
                name="otp"
                type="text"
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-center text-sm text-white outline-none ring-0 transition focus:border-cyan-400"
                placeholder="000000"
                maxLength={6}
                required
              />
              <p className="mt-1 text-xs text-slate-500">
                OTP sent to {phoneNumber}
              </p>
            </div>

            {message ? (
              <div className={`rounded-2xl border px-4 py-3 text-sm ${
                message.includes("successful") 
                  ? "border-green-400/20 bg-green-500/10 text-green-200" 
                  : "border-red-400/20 bg-red-500/10 text-red-200"
              }`}>
                {message}
              </div>
            ) : null}

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={loading}
            >
              <LockKeyhole className="h-4 w-4" />
              {loading ? "Verifying..." : "Verify OTP"}
            </button>

            <button
              type="button"
              className="w-full text-center text-sm text-cyan-400 transition hover:text-cyan-300"
              onClick={() => {
                setOtpSent(false);
                setOtp("");
                setMessage("");
              }}
            >
              Use different phone number
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
