
"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
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
              Account security
            </span>

            <h1 className="text-5xl font-semibold leading-[1.12] tracking-tight xl:text-6xl">
              A fresh start.
              <br />
              A <span className="text-[#e6ca8b]">secure</span> return.
            </h1>

            <p className="mt-6 max-w-md text-base leading-8 text-white/65">
              Forgot your password? You can get back on track with a secure
              password reset process.
            </p>

            <div className="mt-10 flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#d6b878]/10 text-[#e6ca8b]">
                <LockKeyhole size={21} />
              </span>
              <div>
                <h2 className="font-medium">Your account matters</h2>
                <p className="mt-1 text-sm leading-6 text-white/55">
                  Keep your account secure and never share your password or
                  reset link with anyone.
                </p>
              </div>
            </div>
          </div>

          <p className="relative z-10 text-xs text-white/40">
            © 2026 Membrix. All rights reserved.
          </p>
        </section>

        <section className="flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:px-14 xl:px-20">
          <header className="flex items-center justify-between">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm text-[var(--muted)] transition hover:text-[var(--foreground)]"
            >
              <ArrowLeft size={16} />
              Back to sign in
            </Link>

            <Link
              href="/"
              className="text-sm font-medium transition hover:text-[#b99a5b]"
            >
              Home
            </Link>
          </header>

          <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">
            <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#d6b878]/30 bg-[#d6b878]/10 text-[#b99a5b]">
              {submitted ? (
                <CheckCircle2 size={26} />
              ) : (
                <LockKeyhole size={25} />
              )}
            </div>

            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#b99a5b]">
              Password recovery
            </p>

            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {submitted ? "Check your next step" : "Forgot your password?"}
            </h1>

            <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
              {submitted
                ? "Your email has been entered successfully. Password recovery will be available once the authentication service is connected."
                : "Enter the email address associated with your Membrix account to begin the password recovery process."}
            </p>

            {!submitted ? (
              <form onSubmit={handleSubmit} className="mt-9 space-y-5">
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

                <button
                  type="submit"
                  className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#d6b878] px-5 text-sm font-semibold text-[#172b3d] shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-[#e6ca8b] hover:shadow-lg hover:shadow-[#d6b878]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b99a5b] focus-visible:ring-offset-2"
                >
                  Continue
                  <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
                </button>
              </form>
            ) : (
              <div className="mt-8 rounded-xl border border-[#b99a5b]/30 bg-[#d6b878]/10 p-4">
                <p className="text-sm font-medium">Email entered</p>
                <p className="mt-1 break-all text-sm text-[var(--muted)]">{email}</p>
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="mt-4 text-sm font-semibold text-[#b99a5b] hover:underline"
                >
                  Try another email
                </button>
              </div>
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
            Need assistance?{" "}
            <Link href="/contact" className="font-medium transition hover:text-[var(--foreground)]">
              Contact us
            </Link>
          </footer>
        </section>
      </div>
    </main>
  );
}
