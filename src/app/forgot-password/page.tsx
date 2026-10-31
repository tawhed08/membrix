
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

type ApiResponse = {
  success?: boolean;
  message?: string;
};

type Step = "email" | "otp" | "password";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function apiRequest(
    endpoint: string,
    body: Record<string, string>,
  ) {
    const response = await fetch(`${API_URL}/api/auth/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(body),
    });

    const data = (await response.json()) as ApiResponse;

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Something went wrong.");
    }

    return data;
  }

  async function handleSendOTP(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const data = await apiRequest("forgot-password", {
        email: email.trim().toLowerCase(),
      });

      setSuccess(
        data.message || "If an account exists, a code will be sent.",
      );
      setStep("otp");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to send verification code.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOTP(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const data = await apiRequest("verify-reset-otp", {
        email: email.trim().toLowerCase(),
        otp,
      });

      setSuccess(data.message || "Email verified successfully.");
      setStep("password");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to verify the code.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    setError("");
    setSuccess("");

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const data = await apiRequest("reset-password", {
        email: email.trim().toLowerCase(),
        password,
        confirmPassword,
      });

      setSuccess(data.message || "Password changed successfully.");

      setPassword("");
      setConfirmPassword("");
      setOtp("");

      router.push("/login");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to reset password.",
      );
    } finally {
      setLoading(false);
    }
  }

  const title =
    step === "email"
      ? "Forgot your password?"
      : step === "otp"
        ? "Verify your email"
        : "Create new password";

  const description =
    step === "email"
      ? "Enter your registered email address. We will send you a verification code."
      : step === "otp"
        ? `Enter the 6-digit verification code sent to ${email}.`
        : "Your email has been verified. Create a strong new password.";

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="grid min-h-screen lg:grid-cols-2">
        <section className="relative hidden overflow-hidden bg-[#102b46] p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
          <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-[#d6b878]/10 blur-3xl" />

          <Link
            href="/"
            className="relative z-10 inline-flex w-fit items-center gap-3"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#d6b878]/40 bg-[#d6b878]/10 text-[#e6ca8b]">
              <Sparkles size={22} />
            </span>

            <span className="text-2xl font-semibold tracking-tight">
              Membrix<span className="text-[#d6b878]">.</span>
            </span>
          </Link>

          <div className="relative z-10 max-w-xl py-16">
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium uppercase tracking-[0.2em] text-[#e6ca8b]">
              <ShieldCheck size={15} />
              Account security
            </span>

            <h1 className="text-5xl font-semibold leading-[1.12] tracking-tight xl:text-6xl">
              A fresh start.
              <br />
              A secure <span className="text-[#e6ca8b]">account.</span>
            </h1>

            <p className="mt-6 max-w-md text-base leading-8 text-white/65">
              Recover access to your Membrix account with a secure email
              verification process.
            </p>
          </div>

          <p className="relative z-10 text-xs text-white/40">
            © 2026 Membrix. All rights reserved.
          </p>
        </section>

        <section className="flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:px-14 xl:px-20">
          <header>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm text-[var(--muted)] transition hover:text-[var(--foreground)]"
            >
              <ArrowLeft size={16} />
              Back to login
            </Link>
          </header>

          <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">
            <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#d6b878]/30 bg-[#d6b878]/10 text-[#b99a5b]">
              {step === "email" ? (
                <Mail size={25} />
              ) : step === "otp" ? (
                <ShieldCheck size={25} />
              ) : (
                <LockKeyhole size={25} />
              )}
            </div>

            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#b99a5b]">
              Secure account recovery
            </p>

            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {title}
            </h2>

            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              {description}
            </p>

            <div className="mt-7 flex items-center gap-2">
              {(["email", "otp", "password"] as Step[]).map(
                (item, index) => {
                  const active =
                    ["email", "otp", "password"].indexOf(step) >= index;

                  return (
                    <div
                      key={item}
                      className={`h-1.5 flex-1 rounded-full ${
                        active ? "bg-[#d6b878]" : "bg-[var(--border)]"
                      }`}
                    />
                  );
                },
              )}
            </div>

            {error && (
              <p
                role="alert"
                aria-live="polite"
                className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600"
              >
                {error}
              </p>
            )}

            {success && (
              <p
                role="status"
                className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600"
              >
                {success}
              </p>
            )}

            {step === "email" && (
              <form onSubmit={handleSendOTP} className="mt-8 space-y-5">
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-medium"
                  >
                    Email address
                  </label>

                  <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 transition focus-within:border-[#b99a5b]">
                    <Mail
                      size={18}
                      className="shrink-0 text-[var(--muted)]"
                    />

                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      required
                      maxLength={254}
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="h-12 w-full bg-transparent text-sm outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#d6b878] px-5 text-sm font-semibold text-[#172b3d] transition hover:bg-[#e6ca8b] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Sending code..." : "Send verification code"}
                  {!loading && <ArrowRight size={17} />}
                </button>
              </form>
            )}

            {step === "otp" && (
              <form onSubmit={handleVerifyOTP} className="mt-8 space-y-5">
                <div>
                  <label
                    htmlFor="otp"
                    className="mb-2 block text-sm font-medium"
                  >
                    6-digit verification code
                  </label>

                  <input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="000000"
                    required
                    maxLength={6}
                    pattern="[0-9]{6}"
                    value={otp}
                    onChange={(event) =>
                      setOtp(
                        event.target.value.replace(/\D/g, "").slice(0, 6),
                      )
                    }
                    className="h-14 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-center text-2xl font-semibold tracking-[0.5em] outline-none transition focus:border-[#b99a5b]"
                  />

                  <p className="mt-2 text-xs text-[var(--muted)]">
                    The code is valid for 5 minutes.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#d6b878] px-5 text-sm font-semibold text-[#172b3d] transition hover:bg-[#e6ca8b] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Verifying..." : "Verify code"}
                  {!loading && <ArrowRight size={17} />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setOtp("");
                    setError("");
                    setSuccess("");
                  }}
                  className="w-full text-sm font-medium text-[#b99a5b] hover:underline"
                >
                  Change email address
                </button>
              </form>
            )}

            {step === "password" && (
              <form onSubmit={handleResetPassword} className="mt-8 space-y-5">
                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-medium"
                  >
                    New password
                  </label>

                  <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 transition focus-within:border-[#b99a5b]">
                    <LockKeyhole
                      size={18}
                      className="shrink-0 text-[var(--muted)]"
                    />

                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="At least 8 characters"
                      required
                      minLength={8}
                      maxLength={128}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="h-12 w-full bg-transparent text-sm outline-none"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      className="text-[var(--muted)]"
                    >
                      {showPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="mb-2 block text-sm font-medium"
                  >
                    Confirm new password
                  </label>

                  <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 transition focus-within:border-[#b99a5b]">
                    <LockKeyhole
                      size={18}
                      className="shrink-0 text-[var(--muted)]"
                    />

                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Enter password again"
                      required
                      minLength={8}
                      maxLength={128}
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                      className="h-12 w-full bg-transparent text-sm outline-none"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword((value) => !value)
                      }
                      aria-label={
                        showConfirmPassword
                          ? "Hide password"
                          : "Show password"
                      }
                      className="text-[var(--muted)]"
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#d6b878] px-5 text-sm font-semibold text-[#172b3d] transition hover:bg-[#e6ca8b] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Updating password..." : "Reset password"}
                  {!loading && <ArrowRight size={17} />}
                </button>
              </form>
            )}

            <div className="mt-8 border-t border-[var(--border)] pt-6 text-center">
              <p className="text-sm text-[var(--muted)]">
                Remember your password?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-[#b99a5b] transition hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>

          <footer className="pb-2 text-center text-xs text-[var(--muted)]">
            Secure access to your Membrix account.
          </footer>
        </section>
      </div>
    </main>
  );
}
