
"use client";

import Link from "next/link";
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
  UserRound,
} from "lucide-react";

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }

    if (!acceptedTerms) {
      setError("Please accept the Terms of Service to continue.");
      return;
    }

    setError("Your details are validated. Account creation will be available when authentication is connected.");
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="grid min-h-screen lg:grid-cols-2">
        <section className="relative hidden overflow-hidden bg-[#102b46] p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
          <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-[#d6b878]/10 blur-3xl" />

          <Link href="/" className="relative z-10 inline-flex w-fit items-center gap-3">
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
              Become a member
            </span>

            <h1 className="text-5xl font-semibold leading-[1.12] tracking-tight xl:text-6xl">
              Belong to
              <br />
              something <span className="text-[#e6ca8b]">greater.</span>
            </h1>

            <p className="mt-6 max-w-md text-base leading-8 text-white/65">
              Create your Membrix account and take the first step toward a
              more connected membership experience.
            </p>

            <div className="mt-12 space-y-5">
              {[
                "Manage your membership in one place",
                "Keep your profile and details organized",
                "Stay connected with your community",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm text-white/75">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[#d6b878]/40 text-[#e6ca8b]">
                    <ShieldCheck size={14} />
                  </span>
                  {item}
                </div>
              ))}
            </div>
          </div>

          <p className="relative z-10 text-xs text-white/40">
            © 2026 Membrix. All rights reserved.
          </p>
        </section>

        <section className="flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:px-14 xl:px-20">
          <header className="flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-[var(--muted)] transition hover:text-[var(--foreground)]"
            >
              <ArrowLeft size={16} />
              Back to home
            </Link>

            <Link
              href="/login"
              className="text-sm font-medium transition hover:text-[#b99a5b]"
            >
              Sign in
            </Link>
          </header>

          <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
            <div className="mb-7 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#d6b878]/30 bg-[#d6b878]/10 text-[#b99a5b]">
              <UserRound size={25} />
            </div>

            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#b99a5b]">
              Get started
            </p>

            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Create your account
            </h2>

            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              Join Membrix and make your membership experience better.
            </p>

            <form onSubmit={handleSubmit} className="mt-7 space-y-4">
              <div>
                <label htmlFor="fullName" className="mb-2 block text-sm font-medium">
                  Full name
                </label>
                <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 transition focus-within:border-[#b99a5b] focus-within:ring-2 focus-within:ring-[#d6b878]/15">
                  <UserRound size={18} className="shrink-0 text-[var(--muted)]" />
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    placeholder="Enter your full name"
                    required
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-[var(--muted)]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium">
                  Email address
                </label>
                <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 transition focus-within:border-[#b99a5b] focus-within:ring-2 focus-within:ring-[#d6b878]/15">
                  <Mail size={18} className="shrink-0 text-[var(--muted)]" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-[var(--muted)]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium">
                  Password
                </label>
                <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 transition focus-within:border-[#b99a5b] focus-within:ring-2 focus-within:ring-[#d6b878]/15">
                  <LockKeyhole size={18} className="shrink-0 text-[var(--muted)]" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    minLength={8}
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-[var(--muted)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="shrink-0 text-[var(--muted)] transition hover:text-[var(--foreground)]"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium">
                  Confirm password
                </label>
                <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 transition focus-within:border-[#b99a5b] focus-within:ring-2 focus-within:ring-[#d6b878]/15">
                  <LockKeyhole size={18} className="shrink-0 text-[var(--muted)]" />
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Re-enter your password"
                    required
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-[var(--muted)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((current) => !current)}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    className="shrink-0 text-[var(--muted)] transition hover:text-[var(--foreground)]"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <label className="flex cursor-pointer items-start gap-3 pt-1 text-sm leading-6 text-[var(--muted)]">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(event) => setAcceptedTerms(event.target.checked)}
                  className="mt-1 h-4 w-4 accent-[#b99a5b]"
                />
                <span>
                  I agree to the{" "}
                  <Link href="/contact" className="font-medium text-[#b99a5b] hover:underline">
                    Terms of Service
                  </Link>{" "}
                  and acknowledge the privacy policy.
                </span>
              </label>

              {error && (
                <p
                  role="status"
                  className="rounded-xl border border-[#b99a5b]/30 bg-[#d6b878]/10 px-4 py-3 text-sm leading-6"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#d6b878] px-5 text-sm font-semibold text-[#172b3d] shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-[#e6ca8b] hover:shadow-lg hover:shadow-[#d6b878]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b99a5b] focus-visible:ring-offset-2"
              >
                Create account
                <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
              </button>
            </form>

            <div className="mt-7 border-t border-[var(--border)] pt-6 text-center">
              <p className="text-sm text-[var(--muted)]">
                Already have an account?{" "}
                <Link href="/login" className="font-semibold text-[#b99a5b] hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </div>

          <footer className="pb-2 text-center text-xs text-[var(--muted)]">
            Secure membership starts with your account.
          </footer>
        </section>
      </div>
    </main>
  );
}
