"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Script from "next/script";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
  Phone,
  CheckCircle2,
  KeyRound,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

type GoogleCredentialResponse = {
  credential: string;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: {
              theme: string;
              size: string;
              shape: string;
              width: number;
              text: string;
            },
          ) => void;
        };
      };
    };
  }
}

export default function RegisterPage() {
  const router = useRouter();

  const [step, setStep] = useState<"register" | "verify">("register");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Google Sign Up
  const [googleScriptLoaded, setGoogleScriptLoaded] = useState(false);
  const [googleCredential, setGoogleCredential] = useState("");
  const [googlePhone, setGooglePhone] = useState("");
  const [googleTermsAccepted, setGoogleTermsAccepted] = useState(false);
  const [googleNeedsPhone, setGoogleNeedsPhone] = useState(false);

  const googleButtonRef = useRef<HTMLDivElement>(null);

  const passwordChecks = [
    { label: "At least 8 characters", valid: password.length >= 8 },
    { label: "One uppercase letter", valid: /[A-Z]/.test(password) },
    { label: "One lowercase letter", valid: /[a-z]/.test(password) },
    { label: "One number", valid: /[0-9]/.test(password) },
    {
      label: "One special character",
      valid: /[^A-Za-z0-9]/.test(password),
    },
  ];

  const passwordStrength = passwordChecks.filter(
    (item) => item.valid,
  ).length;

  const inputClass =
    "w-full min-w-0 bg-transparent py-3.5 text-sm text-[#F4F1E9] outline-none placeholder:text-white/40";

  const labelClass =
    "mb-2 block text-sm font-medium text-[#F4F1E9]";

  const fieldClass =
    "flex items-center gap-3 rounded-xl border border-white/15 bg-transparent px-4 transition focus-within:border-[#B88B48]";

  // Initialize Google button
  useEffect(() => {
    if (
      !googleScriptLoaded ||
      !window.google ||
      !googleButtonRef.current ||
      !GOOGLE_CLIENT_ID ||
      googleNeedsPhone
    ) {
      return;
    }

    googleButtonRef.current.innerHTML = "";

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response: GoogleCredentialResponse) => {
        if (!response.credential) {
          setError("Google authentication failed. Please try again.");
          return;
        }

        setError("");
        setSuccess("");
        setGoogleCredential(response.credential);
        setGoogleNeedsPhone(true);
      },
    });

    window.google.accounts.id.renderButton(
      googleButtonRef.current,
      {
        theme: "filled_black",
        size: "large",
        shape: "pill",
        width: 400,
        text: "signup_with",
      },
    );
  }, [googleScriptLoaded, googleNeedsPhone]);

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();

    if (
      !cleanName ||
      !cleanEmail ||
      !cleanPhone ||
      !password ||
      !confirmPassword
    ) {
      setError("Please complete all fields.");
      return;
    }

    if (passwordChecks.some((item) => !item.valid)) {
      setError(
        "Please create a strong password using all the listed requirements.",
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!termsAccepted) {
      setError("Please accept the Terms & Conditions to continue.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
          password,
          confirmPassword,
          termsAccepted,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to create your account.",
        );
      }

      setEmail(data.email || cleanEmail);
      setStep("verify");
      setSuccess(
        "A verification code has been sent to your email.",
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!/^\d{6}$/.test(otp)) {
      setError("Please enter the 6-digit verification code.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/api/auth/verify-email-otp`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email, otp }),
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Email verification failed.",
        );
      }

      setSuccess(
        "Email verified successfully. Redirecting to sign in...",
      );

      router.push("/login");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to verify your email. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  // Google Sign Up submission
  async function handleGoogleSignup(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!googleCredential) {
      setError("Please continue with Google first.");
      return;
    }

    if (!googlePhone.trim()) {
      setError("Please enter your Bangladesh phone number.");
      return;
    }

    if (!googleTermsAccepted) {
      setError("Please accept the Terms & Conditions.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          credential: googleCredential,
          phone: googlePhone.trim(),
          termsAccepted: googleTermsAccepted,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Google Sign Up failed.",
        );
      }

      setSuccess("Google account verified. Redirecting to dashboard...");

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Google Sign Up failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#171717] text-[#F4F1E9]">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setGoogleScriptLoaded(true)}
      />

      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Brand panel */}
        <section className="relative hidden overflow-hidden bg-[#211D17] p-12 text-[#F4F1E9] lg:flex lg:flex-col lg:justify-between xl:p-16">
          <div className="pointer-events-none absolute -right-32 top-1/4 h-96 w-96 rounded-full border border-[#B88B48]/20" />
          <div className="pointer-events-none absolute -right-20 top-[30%] h-72 w-72 rounded-full border border-[#B88B48]/20" />
          <div className="pointer-events-none absolute -right-8 top-[35%] h-48 w-48 rounded-full bg-[#B88B48]/10 blur-3xl" />

          <Link
            href="/"
            className="relative z-10 inline-flex items-center gap-3"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#B88B48]/60 text-lg font-semibold text-[#D6B878]">
              M
            </span>
            <span className="text-xl font-semibold tracking-[0.18em]">
              MEMBRIX<span className="text-[#D6B878]">®</span>
            </span>
          </Link>

          <div className="relative z-10 max-w-lg py-16">
            <p className="mb-6 text-xs font-medium uppercase tracking-[0.28em] text-[#D6B878]">
              Membership, reimagined
            </p>

            <h1 className="text-5xl font-light leading-[1.15] xl:text-6xl">
              Your community.
              <br />
              <span className="font-semibold text-[#D6B878]">
                Your next chapter.
              </span>
            </h1>

            <p className="mt-7 max-w-md text-base leading-8 text-[#F4F1E9]/70">
              Create your account and discover a simpler way to
              manage your membership, applications, and account
              activity.
            </p>

            <div className="mt-10 flex items-center gap-3 text-sm text-[#F4F1E9]/80">
              <ShieldCheck className="h-5 w-5 text-[#D6B878]" />
              Secure account access
            </div>
          </div>

          <p className="relative z-10 text-xs tracking-wide text-[#F4F1E9]/45">
            © 2026 Membrix. All rights reserved.
          </p>
        </section>

        {/* Registration and verification */}
        <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10 lg:px-12">
          <div className="w-full max-w-md">
            <Link
              href="/"
              className="mb-8 inline-flex items-center gap-2 text-sm text-[#F4F1E9]/65 transition hover:text-[#B88B48] lg:hidden"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>

            {step === "register" ? (
              <>
                <div className="mb-8">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-[#9A7138]">
                    Get started
                  </p>

                  <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                    Create your account
                  </h2>

                  <p className="mt-3 text-sm leading-6 text-[#F4F1E9]/65">
                    Enter your details below to join the Membrix
                    community.
                  </p>
                </div>

                {/* Google registration */}
                {!googleNeedsPhone ? (
                  <>
                    <div className="mb-6">
                      <div
                        ref={googleButtonRef}
                        className="flex min-h-11 justify-center"
                      />

                      {!GOOGLE_CLIENT_ID && (
                        <p className="mt-2 text-center text-xs text-red-400">
                          Google Client ID is not configured.
                        </p>
                      )}
                    </div>

                    <div className="mb-6 flex items-center gap-4">
                      <div className="h-px flex-1 bg-white/15" />
                      <span className="text-xs uppercase tracking-wider text-white/40">
                        Or register with email
                      </span>
                      <div className="h-px flex-1 bg-white/15" />
                    </div>
                  </>
                ) : (
                  <form
                    onSubmit={handleGoogleSignup}
                    className="mb-7 space-y-5 rounded-2xl border border-[#B88B48]/30 bg-[#B88B48]/5 p-5"
                  >
                    <div>
                      <h3 className="text-lg font-semibold text-[#D6B878]">
                        Complete your Google Sign Up
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-white/60">
                        Your Google account is connected. Enter your
                        phone number and accept our terms to continue.
                      </p>
                    </div>

                    <div>
                      <label
                        htmlFor="googlePhone"
                        className={labelClass}
                      >
                        Bangladesh phone number
                      </label>

                      <div className={fieldClass}>
                        <Phone className="h-5 w-5 shrink-0 text-[#9A7138]" />
                        <input
                          id="googlePhone"
                          type="tel"
                          autoComplete="tel"
                          placeholder="01XXXXXXXXX"
                          value={googlePhone}
                          onChange={(event) =>
                            setGooglePhone(event.target.value)
                          }
                          className={inputClass}
                          required
                          maxLength={20}
                        />
                      </div>
                    </div>

                    <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-[#F4F1E9]/70">
                      <input
                        type="checkbox"
                        checked={googleTermsAccepted}
                        onChange={(event) =>
                          setGoogleTermsAccepted(event.target.checked)
                        }
                        className="mt-1 h-4 w-4 shrink-0 accent-[#B88B48]"
                      />
                      <span>
                        I agree to the Membrix Terms &amp; Conditions
                        and Privacy Policy.
                      </span>
                    </label>

                    <button
                      type="submit"
                      disabled={loading}
                      className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#B88B48] px-5 py-4 text-sm font-semibold text-[#F4F1E9] transition hover:bg-[#C99C59] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loading
                        ? "Creating account..."
                        : "Continue to Membrix"}
                      {!loading && (
                        <ArrowRight className="h-4 w-4" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setGoogleCredential("");
                        setGoogleNeedsPhone(false);
                        setGooglePhone("");
                        setGoogleTermsAccepted(false);
                        setError("");
                        setSuccess("");
                      }}
                      className="flex w-full items-center justify-center gap-2 text-sm text-white/50 transition hover:text-[#D6B878]"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back to Google Sign Up
                    </button>
                  </form>
                )}

                {/* Email registration */}
                {!googleNeedsPhone && (
                  <form
                    onSubmit={handleRegister}
                    className="space-y-5"
                  >
                    <div>
                      <label htmlFor="name" className={labelClass}>
                        Full name
                      </label>
                      <div className={fieldClass}>
                        <UserRound className="h-5 w-5 shrink-0 text-[#9A7138]" />
                        <input
                          id="name"
                          type="text"
                          autoComplete="name"
                          placeholder="Enter your full name"
                          value={name}
                          onChange={(event) =>
                            setName(event.target.value)
                          }
                          className={inputClass}
                          required
                          maxLength={100}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="email" className={labelClass}>
                        Email address
                      </label>
                      <div className={fieldClass}>
                        <Mail className="h-5 w-5 shrink-0 text-[#9A7138]" />
                        <input
                          id="email"
                          type="email"
                          autoComplete="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(event) =>
                            setEmail(event.target.value)
                          }
                          className={inputClass}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="phone" className={labelClass}>
                        Bangladesh phone number
                      </label>
                      <div className={fieldClass}>
                        <Phone className="h-5 w-5 shrink-0 text-[#9A7138]" />
                        <input
                          id="phone"
                          type="tel"
                          autoComplete="tel"
                          placeholder="01XXXXXXXXX"
                          value={phone}
                          onChange={(event) =>
                            setPhone(event.target.value)
                          }
                          className={inputClass}
                          required
                          maxLength={20}
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="password"
                        className={labelClass}
                      >
                        Password
                      </label>
                      <div className={fieldClass}>
                        <LockKeyhole className="h-5 w-5 shrink-0 text-[#9A7138]" />
                        <input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          autoComplete="new-password"
                          placeholder="Create a strong password"
                          value={password}
                          onChange={(event) =>
                            setPassword(event.target.value)
                          }
                          className={inputClass}
                          required
                          maxLength={128}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowPassword((current) => !current)
                          }
                          className="shrink-0 text-[#F4F1E9]/50 hover:text-[#9A7138]"
                          aria-label={
                            showPassword
                              ? "Hide password"
                              : "Show password"
                          }
                        >
                          {showPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>

                      {password.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <div className="flex gap-1.5">
                            {passwordChecks.map((item) => (
                              <div
                                key={item.label}
                                className={`h-1.5 flex-1 rounded-full ${
                                  item.valid
                                    ? "bg-emerald-500"
                                    : "bg-white/15"
                                }`}
                              />
                            ))}
                          </div>

                          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                            {passwordChecks.map((item) => (
                              <p
                                key={item.label}
                                className={`flex items-center gap-2 text-xs ${
                                  item.valid
                                    ? "text-emerald-400"
                                    : "text-white/45"
                                }`}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                {item.label}
                              </p>
                            ))}
                          </div>

                          <p className="text-xs text-[#D6B878]">
                            Password strength: {passwordStrength}/5
                          </p>
                        </div>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="confirmPassword"
                        className={labelClass}
                      >
                        Confirm password
                      </label>
                      <div className={fieldClass}>
                        <LockKeyhole className="h-5 w-5 shrink-0 text-[#9A7138]" />
                        <input
                          id="confirmPassword"
                          type={
                            showConfirmPassword ? "text" : "password"
                          }
                          autoComplete="new-password"
                          placeholder="Re-enter your password"
                          value={confirmPassword}
                          onChange={(event) =>
                            setConfirmPassword(event.target.value)
                          }
                          className={inputClass}
                          required
                          maxLength={128}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword(
                              (current) => !current,
                            )
                          }
                          className="shrink-0 text-[#F4F1E9]/50 hover:text-[#9A7138]"
                          aria-label={
                            showConfirmPassword
                              ? "Hide confirm password"
                              : "Show confirm password"
                          }
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>

                      {confirmPassword.length > 0 && (
                        <p
                          className={`mt-2 text-xs ${
                            password === confirmPassword
                              ? "text-emerald-400"
                              : "text-red-400"
                          }`}
                        >
                          {password === confirmPassword
                            ? "Passwords match"
                            : "Passwords do not match"}
                        </p>
                      )}
                    </div>

                    <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-[#F4F1E9]/70">
                      <input
                        type="checkbox"
                        checked={termsAccepted}
                        onChange={(event) =>
                          setTermsAccepted(event.target.checked)
                        }
                        className="mt-1 h-4 w-4 shrink-0 accent-[#B88B48]"
                      />
                      <span>
                        I agree to the Membrix Terms &amp; Conditions
                        and Privacy Policy.
                      </span>
                    </label>

                    {error && (
                      <p
                        role="alert"
                        className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300"
                      >
                        {error}
                      </p>
                    )}

                    {success && (
                      <p
                        role="status"
                        className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300"
                      >
                        {success}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="group flex w-full items-center justify-center gap-3 rounded-xl bg-[#B88B48] px-5 py-4 text-sm font-semibold text-[#F4F1E9] transition hover:bg-[#C99C59] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loading ? "Creating account..." : "Create account"}
                      {!loading && (
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      )}
                    </button>
                  </form>
                )}

                {error && googleNeedsPhone && (
                  <p
                    role="alert"
                    className="mb-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300"
                  >
                    {error}
                  </p>
                )}

                {success && googleNeedsPhone && (
                  <p
                    role="status"
                    className="mb-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300"
                  >
                    {success}
                  </p>
                )}

                <p className="mt-7 text-center text-sm text-[#F4F1E9]/70">
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="font-semibold text-[#8A642F] underline decoration-[#B88B48] underline-offset-4 hover:text-[#F4F1E9]"
                  >
                    Sign in
                  </Link>
                </p>
              </>
            ) : (
              <>
                <div className="mb-8">
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#B88B48]/30 bg-[#B88B48]/10">
                    <Mail className="h-7 w-7 text-[#D6B878]" />
                  </div>

                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-[#9A7138]">
                    Email verification
                  </p>

                  <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                    Verify your email
                  </h2>

                  <p className="mt-3 text-sm leading-6 text-[#F4F1E9]/65">
                    We sent a 6-digit verification code to{" "}
                    <span className="font-semibold text-[#D6B878]">
                      {email}
                    </span>
                    . Enter the code below. It expires in 5 minutes.
                  </p>
                </div>

                <form
                  onSubmit={handleVerify}
                  className="space-y-5"
                >
                  <div>
                    <label htmlFor="otp" className={labelClass}>
                      Verification code
                    </label>
                    <div className={fieldClass}>
                      <KeyRound className="h-5 w-5 shrink-0 text-[#9A7138]" />
                      <input
                        id="otp"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="Enter 6-digit code"
                        value={otp}
                        onChange={(event) =>
                          setOtp(
                            event.target.value
                              .replace(/\D/g, "")
                              .slice(0, 6),
                          )
                        }
                        className={`${inputClass} text-center text-xl tracking-[0.4em]`}
                        required
                        maxLength={6}
                      />
                    </div>
                  </div>

                  {error && (
                    <p
                      role="alert"
                      className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300"
                    >
                      {error}
                    </p>
                  )}

                  {success && (
                    <p
                      role="status"
                      className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300"
                    >
                      {success}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading || otp.length !== 6}
                    className="group flex w-full items-center justify-center gap-3 rounded-xl bg-[#B88B48] px-5 py-4 text-sm font-semibold text-[#F4F1E9] transition hover:bg-[#C99C59] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? "Verifying..." : "Verify email"}
                    {!loading && (
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStep("register");
                      setOtp("");
                      setError("");
                      setSuccess("");
                    }}
                    className="flex w-full items-center justify-center gap-2 py-2 text-sm text-[#F4F1E9]/60 transition hover:text-[#D6B878]"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to registration
                  </button>
                </form>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}