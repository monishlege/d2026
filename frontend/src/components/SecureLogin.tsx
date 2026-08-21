import { ArrowRight, Building2, Camera, CheckCircle2, Languages, LockKeyhole, Phone, ShieldCheck, Sparkles, UserCircle2 } from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { initializeRecaptcha } from "@/lib/firebase";
import { sendOTP, verifyOTP } from "@/lib/firebaseAuth";

const STORAGE_KEY_AVATAR = "jansahayak.avatar.base64";

const AVATAR_PRESETS: Array<{ label: string; emoji: string; gradient: string }> = [
  { label: "Citizen", emoji: "🧑🏽‍🌾", gradient: "from-cyan-500/40 via-sky-500/30 to-blue-500/40" },
  { label: "Farmer", emoji: "👩🏽‍🌾", gradient: "from-emerald-500/40 via-lime-500/30 to-green-500/40" },
  { label: "Worker", emoji: "👷🏽", gradient: "from-amber-500/40 via-orange-500/30 to-yellow-500/40" },
  { label: "Officer", emoji: "👨🏽‍💼", gradient: "from-violet-500/40 via-fuchsia-500/30 to-purple-500/40" },
  { label: "Elder", emoji: "🧓🏽", gradient: "from-rose-500/40 via-pink-500/30 to-red-500/40" },
  { label: "Student", emoji: "👩🏽‍🎓", gradient: "from-teal-500/40 via-emerald-500/30 to-green-500/40" },
];

const HERO_STATS = [
  { label: "Languages", value: "7+", description: "Regional dialect Bhashini", accent: "from-cyan-400 to-sky-300" },
  { label: "Verified docs", value: "DigiLocker", description: "100% signed sync", accent: "from-emerald-400 to-lime-300" },
  { label: "Anti-Phishing", value: "Guard", description: "Spoof + fraud shield", accent: "from-fuchsia-400 to-rose-300" },
  { label: "Scheme cover", value: "28+", description: "National + state feed", accent: "from-amber-400 to-orange-300" },
];

interface SecureLoginProps {
  authError?: string;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function readStoredAvatar(): string {
  if (typeof window === "undefined") return "";
  try {
    return typeof window.localStorage?.getItem === "function"
      ? window.localStorage.getItem(STORAGE_KEY_AVATAR) ?? ""
      : "";
  } catch {
    return "";
  }
}

function getFirebaseErrorMessage(error: unknown, fallback: string): string {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";

  if (code === "auth/operation-not-allowed") {
    return "Phone sign-in is disabled for this Firebase project. Enable Phone in Firebase Console > Authentication > Sign-in method.";
  }

  return error instanceof Error ? error.message : fallback;
}

export default function SecureLogin({ authError }: SecureLoginProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(authError ?? "");
  const [otpSent, setOtpSent] = useState(false);

  const [avatarBase64, setAvatarBase64] = useState<string>(() => {
    return readStoredAvatar();
  });
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (authError) setMessage(authError);
  }, [authError]);

  useEffect(() => {
    initializeRecaptcha();
  }, []);

  useEffect(() => {
    try {
      if (avatarBase64) {
        window.localStorage.setItem(STORAGE_KEY_AVATAR, avatarBase64);
      } else {
        window.localStorage.removeItem(STORAGE_KEY_AVATAR);
      }
    } catch {
      /* Storage may be unavailable in private or embedded contexts. */
    }
  }, [avatarBase64]);

  async function handleAvatarFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage("Please upload an image file (JPG, PNG, or WebP).");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setMessage("Profile picture should be less than 2 MB.");
      return;
    }
    try {
      const b64 = await fileToBase64(file);
      setAvatarBase64(b64);
      setAvatarPickerOpen(false);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not read image.");
    }
  }

  function setPresetAvatar(preset: (typeof AVATAR_PRESETS)[number]) {
    const svg = encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stop-color="rgba(56,189,248,0.7)"/><stop offset="100%" stop-color="rgba(251,146,60,0.7)"/></linearGradient></defs><rect width="160" height="160" rx="80" fill="url(#g)"/><text x="50%" y="58%" dominant-baseline="middle" text-anchor="middle" font-size="76">${preset.emoji}</text></svg>`,
    );
    setAvatarBase64(`data:image/svg+xml;charset=utf-8,${svg}`);
    setAvatarPickerOpen(false);
  }

  async function handleSendOTP(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\d{10}$/.test(phoneNumber)) {
      setMessage("Please enter exactly 10 digits for your phone number.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      await sendOTP(`+91${phoneNumber}`);
      setOtpSent(true);
      setMessage("OTP sent successfully! Check your phone.");
    } catch (error: any) {
      const errorMessage = getFirebaseErrorMessage(error, "Failed to send OTP. Please try again.");
      setMessage(errorMessage);
      setOtpSent(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOTP(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\d{6}$/.test(otp)) {
      setMessage("Please enter a valid 6-digit OTP.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      await verifyOTP(otp, displayName.trim() || undefined);
      setMessage("Login successful!");
    } catch (error: any) {
      const errorMessage = getFirebaseErrorMessage(error, "Invalid OTP. Please try again.");
      setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  const heroBackgroundImage =
    "https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=1800&q=80";

  return (
    <div className="min-h-screen w-full bg-[#0D1117] text-slate-100">
      <div className="relative flex min-h-screen flex-col-reverse lg:flex-row">
        <section
          className="relative flex flex-1 flex-col justify-between overflow-hidden px-6 py-8 lg:flex-[6] lg:px-14 lg:py-12"
          aria-label="Hero and product overview"
        >
          <div className="absolute inset-0">
            <img
              src={heroBackgroundImage}
              alt="Digital inclusion for rural governance"
              className="h-full w-full object-cover opacity-50"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-[#0D1117] via-[#0D1117]/85 to-[#0D1117]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.22),_transparent_55%),radial-gradient(circle_at_bottom_right,_rgba(251,146,60,0.18),_transparent_55%)]" />
          </div>

          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/30 bg-[#111827] shadow-[0_0_30px_rgba(56,189,248,0.25)]">
                <div className="absolute inset-[3px] rounded-[14px] bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.35),_transparent_65%)]" />
                <Building2 className="relative h-6 w-6 text-cyan-100" />
                <div className="absolute -right-1 -bottom-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-emerald-300/40 bg-emerald-400 text-[9px] font-bold text-slate-950">
                  ज
                </div>
              </div>
              <div>
                <p className="font-display text-2xl leading-none text-white">JanSahayak AI</p>
                <p className="mt-1 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.24em] text-cyan-200/80">
                  <Sparkles className="h-3 w-3" />
                  Powered by Bhashini & Digital India
                </p>
              </div>
            </div>

            <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-slate-300 md:inline-flex">
              <ShieldCheck className="h-3.5 w-3.5 text-cyan-200" />
              WCAG AAA · Secure sandbox
            </div>
          </div>

          <div className="relative z-10 my-10 max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-300/25 bg-orange-300/10 px-4 py-2 text-[11px] uppercase tracking-[0.28em] text-orange-100">
              <Languages className="h-3.5 w-3.5" />
              Citizens & grassroots officers · voice-first
            </div>
            <h1 className="font-display text-5xl leading-[1.05] text-white md:text-7xl">
              Welfare guidance,
              <br />
              <span className="bg-gradient-to-r from-cyan-200 via-white to-orange-200 bg-clip-text text-transparent">
                in your own language.
              </span>
            </h1>
            <p className="max-w-xl text-base leading-7 text-slate-300 md:text-lg">
              A multilingual voice assistant for discovering, applying and verifying the right government
              schemes — from PM-KISAN and Ayushman Bharat down to your state and district level programmes.
            </p>
            <div className="grid max-w-xl gap-3 pt-2 sm:grid-cols-2">
              {HERO_STATS.map((stat) => (
                <div
                  key={stat.label}
                  className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-md transition hover:border-cyan-300/30 hover:bg-white/[0.07]"
                >
                  <div className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${stat.accent} opacity-20 blur-2xl transition group-hover:opacity-40`} />
                  <div className="relative">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400">{stat.label}</p>
                    <p className="mt-2 font-display text-4xl text-white">{stat.value}</p>
                    <p className="mt-2 text-xs leading-5 text-slate-300">{stat.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 grid gap-3 text-xs text-slate-400 md:grid-cols-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              End-to-end DigiLocker verified records
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              Anti-phishing link safety scanner
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              Privacy-first voice processing
            </div>
          </div>
        </section>

        <section
          className="relative flex flex-1 items-center justify-center bg-[radial-gradient(circle_at_top_right,_rgba(251,146,60,0.12),_transparent_50%),linear-gradient(180deg,_#0B1220_0%,_#0D1117_100%)] px-5 py-10 lg:flex-[4] lg:px-10 lg:py-12"
          aria-label="Sign in and account creation"
        >
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20120%20120%22%3E%3Cpath%20d%3D%22M0%2060h120M60%200v120%22%20fill%3D%22none%22%20stroke%3D%22%23ffffff%22%20stroke-opacity%3D%22.04%22%20stroke-width%3D%221%22%2F%3E%3C%2Fsvg%3E')]" />

          <div className="relative w-full max-w-lg">
            <div className="rounded-[36px] border border-white/10 bg-[#161B22]/80 p-7 shadow-[0_30px_120px_rgba(0,0,0,0.6)] backdrop-blur-xl md:p-9">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-cyan-200/80">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Secure access
                  </p>
                  <h2 className="mt-3 font-display text-4xl text-white">Sign in to JanSahayak</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-400">
                    Access your saved applications, scanned documents and scheme recommendations.
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setAvatarPickerOpen((v) => !v)}
                      className="group relative inline-flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition hover:border-cyan-300/50 hover:bg-white/10"
                      aria-label="Change profile picture"
                    >
                      {avatarBase64 ? (
                        <img src={avatarBase64} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <UserCircle2 className="h-9 w-9 text-slate-400 transition group-hover:text-cyan-200" />
                      )}
                      <span className="absolute inset-x-0 bottom-0 flex h-6 items-center justify-center bg-slate-950/70 text-[9px] uppercase tracking-[0.18em] text-cyan-100 opacity-0 transition group-hover:opacity-100">
                        Edit
                      </span>
                    </button>
                    <span
                      className="pointer-events-none absolute -bottom-1 -right-1 inline-flex h-6 w-6 items-center justify-center rounded-full border border-cyan-300/40 bg-slate-900 text-cyan-200 shadow-lg"
                      aria-hidden="true"
                    >
                      <Camera className="h-3 w-3" />
                    </span>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarFile}
                  />
                </div>
              </div>

              {avatarPickerOpen ? (
                <div className="mt-5 rounded-[24px] border border-white/10 bg-[#0B1220]/80 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Choose your avatar</p>
                    <button
                      type="button"
                      onClick={() => {
                        setAvatarBase64("");
                        setAvatarPickerOpen(false);
                      }}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-300 transition hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-200"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="mt-3 grid grid-cols-6 gap-2">
                    {AVATAR_PRESETS.map((preset) => {
                      const svgSrc = encodeURIComponent(
                        `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><defs><linearGradient id="${preset.label}" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stop-color="rgba(56,189,248,0.6)"/><stop offset="100%" stop-color="rgba(251,146,60,0.55)"/></linearGradient></defs><rect width="80" height="80" rx="40" fill="url(#${preset.label})"/><text x="50%" y="58%" dominant-baseline="middle" text-anchor="middle" font-size="38">${preset.emoji}</text></svg>`,
                      );
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setPresetAvatar(preset)}
                          className="group aspect-square rounded-2xl border border-white/10 bg-white/5 p-1 transition hover:scale-105 hover:border-cyan-300/40 hover:bg-white/10"
                          aria-label={`Select ${preset.label} avatar`}
                        >
                          <img
                            src={`data:image/svg+xml;charset=utf-8,${svgSrc}`}
                            alt=""
                            className="h-full w-full rounded-xl object-cover"
                          />
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-cyan-300/30 bg-cyan-300/5 px-4 py-3 text-sm text-cyan-100 transition hover:border-cyan-300/60 hover:bg-cyan-300/10"
                  >
                    <Camera className="h-4 w-4" />
                    Upload custom photo
                  </button>
                </div>
              ) : null}

              {!otpSent ? (
                  <form className="mt-7 space-y-4" onSubmit={handleSendOTP}>
                    <div>
                      <label htmlFor="login-phone" className="mb-2 block text-sm font-medium text-slate-200">
                        Phone Number
                      </label>
                      <div className="flex gap-2">
                        <span className="inline-flex items-center rounded-2xl border border-white/10 bg-[#0B1220]/80 px-4 py-3 text-sm text-slate-400">
                          <span aria-hidden="true">+91</span>
                          <span className="sr-only">India country code</span>
                        </span>
                        <input
                          id="login-phone"
                          name="phoneNumber"
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                          className="w-full rounded-2xl border border-white/10 bg-[#0B1220]/80 px-4 py-3 text-base text-white outline-none transition focus:border-cyan-400"
                          placeholder="98765 43210"
                          inputMode="numeric"
                          autoComplete="tel-national"
                          pattern="[0-9]{10}"
                          required
                          style={{ fontSize: "16px" }}
                        />
                      </div>
                      <p className="mt-1.5 text-xs text-slate-500">We&apos;ll send a one-time password for secure login.</p>
                    </div>

                    {message ? (
                      <div
                        className={`rounded-2xl border px-4 py-3 text-sm ${
                          message.toLowerCase().includes("success") || message.includes("sent")
                            ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                            : "border-red-400/20 bg-red-500/10 text-red-200"
                        }`}
                      >
                        {message}
                      </div>
                    ) : null}

                    <button
                      type="submit"
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-sky-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                      disabled={loading || !/^\d{10}$/.test(phoneNumber)}
                    >
                      <LockKeyhole className="h-4 w-4" />
                      {loading ? "Sending OTP…" : "Send secure OTP"}
                    </button>
                  </form>
                ) : (
                  <form className="mt-7 space-y-4" onSubmit={handleVerifyOTP}>
                    <div>
                      <label htmlFor="login-display" className="mb-2 block text-sm font-medium text-slate-200">
                        Full Name <span className="text-slate-500">(optional)</span>
                      </label>
                      <input
                        id="login-display"
                        name="displayName"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full rounded-2xl border border-white/10 bg-[#0B1220]/80 px-4 py-3 text-base text-white outline-none transition focus:border-cyan-400"
                        placeholder="e.g. Ananya Sharma"
                        style={{ fontSize: "16px" }}
                      />
                    </div>
                    <div>
                      <label htmlFor="login-otp" className="mb-2 block text-sm font-medium text-slate-200">
                        Enter 6-digit OTP
                      </label>
                      <input
                        id="login-otp"
                        name="otp"
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        className="w-full rounded-2xl border border-white/10 bg-[#0B1220]/80 px-4 py-4 text-center text-2xl font-semibold tracking-[0.6em] text-white outline-none transition focus:border-cyan-400"
                        placeholder="000000"
                        inputMode="numeric"
                        maxLength={6}
                        autoComplete="one-time-code"
                        required
                        style={{ fontSize: "20px" }}
                      />
                      <p className="mt-1.5 text-xs text-slate-500">
                        OTP sent to{" "}
                        <span className="font-semibold text-slate-300">
                          +91 {phoneNumber.slice(0, 5)} {phoneNumber.slice(5)}
                        </span>
                      </p>
                    </div>

                    {message ? (
                      <div
                        className={`rounded-2xl border px-4 py-3 text-sm ${
                          message.toLowerCase().includes("success") || message.includes("Login successful")
                            ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                            : "border-red-400/20 bg-red-500/10 text-red-200"
                        }`}
                      >
                        {message}
                      </div>
                    ) : null}

                    <button
                      type="submit"
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-400 to-amber-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                      disabled={loading || !/^\d{6}$/.test(otp)}
                    >
                      <ArrowRight className="h-4 w-4" />
                      {loading ? "Verifying…" : "Verify OTP & continue"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setOtpSent(false);
                        setOtp("");
                        setMessage("");
                      }}
                      className="w-full text-center text-sm text-cyan-300 transition hover:text-cyan-200"
                    >
                      ← Use a different phone number
                    </button>
                  </form>
                )}

              <div id="recaptcha-container" aria-hidden="true" />

              <p className="mt-6 text-center text-xs leading-6 text-slate-500">
                By continuing you agree to the JanSahayak{" "}
                <a href="#" className="text-cyan-300 hover:text-cyan-200">
                  Terms
                </a>{" "}
                &{" "}
                <a href="#" className="text-cyan-300 hover:text-cyan-200">
                  Privacy Policy
                </a>
                . Data stays in India. Government-grade security.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
