
"use client";

import { useState, type FormEvent } from "react";
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
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || !cleanEmail || !password || !confirmPassword) {
      setError("Please complete all fields.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to create your account. Please try again."
        );
      }

      setSuccess("Your account has been created. Redirecting to sign in...");

      window.setTimeout(() => {
        router.push("/login");
      }, 900);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

const inputClass =
  "w-full min-w-0 bg-transparent py-3.5 text-sm text-[#F4F1E9] outline-none shadow-none ring-0 placeholder:text-white/40 focus:outline-none focus:ring-0 focus:shadow-none";

  const labelClass = "mb-2 block text-sm font-medium text-[#F4F1E9]";

 const fieldClass =
  "flex items-center gap-3 rounded-xl border border-white/15 bg-transparent px-4 shadow-none ring-0 transition focus-within:border-[#B88B48] focus-within:shadow-none focus-within:ring-0";
  return (
    <main className="min-h-screen bg-[#171717] text-[#F4F1E9]">
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
              MEMBRIX
              <span className="text-[#D6B878]">®</span>
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
              Create your account and discover a simpler way to manage your
              membership, applications, and account activity.
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

        {/* Registration form */}
        <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10 lg:px-12">
          <div className="w-full max-w-md">
            <Link
              href="/"
              className="mb-8 inline-flex items-center gap-2 text-sm text-[#F4F1E9]/65 transition hover:text-[#B88B48] lg:hidden"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>

            <div className="mb-8">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-[#9A7138]">
                Get started
              </p>

              <h2 className="text-3xl font-semibold tracking-tight text-[#F4F1E9] sm:text-4xl">
                Create your account
              </h2>

              <p className="mt-3 text-sm leading-6 text-[#F4F1E9]/65">
                Enter your details below to join the Membrix community.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="name" className={labelClass}>
                  Full name
                </label>

                <div className={fieldClass}>
                  <UserRound className="h-5 w-5 shrink-0 text-[#9A7138]" />
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
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
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className={inputClass}
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className={labelClass}>
                  Password
                </label>

                <div className={fieldClass}>
                  <LockKeyhole className="h-5 w-5 shrink-0 text-[#9A7138]" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className={inputClass}
                    required
                    minLength={8}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="shrink-0 text-[#F4F1E9]/50 transition hover:text-[#9A7138]"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className={labelClass}>
                  Confirm password
                </label>

                <div className={fieldClass}>
                  <LockKeyhole className="h-5 w-5 shrink-0 text-[#9A7138]" />
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className={inputClass}
                    required
                    minLength={8}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword((current) => !current)
                    }
                    className="shrink-0 text-[#F4F1E9]/50 transition hover:text-[#9A7138]"
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
              </div>

              {error && (
                <p
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  {error}
                </p>
              )}

              {success && (
                <p
                  role="status"
                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
                >
                  {success}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="group flex w-full items-center justify-center gap-3 rounded-xl bg-[#B88B48] px-5 py-4 text-sm font-semibold text-[#F4F1E9] transition hover:bg-[#C99C59] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B88B48] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Creating account..." : "Create account"}
                {!loading && (
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                )}
              </button>
            </form>

            <p className="mt-7 text-center text-sm text-[#F4F1E9]/70">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-[#8A642F] underline decoration-[#B88B48] underline-offset-4 transition hover:text-[#F4F1E9]"
              >
                Sign in
              </Link>
            </p>

            <p className="mt-8 text-center text-xs leading-5 text-[#F4F1E9]/55">
              By creating an account, you agree to use Membrix in accordance
              with its applicable terms and policies.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
