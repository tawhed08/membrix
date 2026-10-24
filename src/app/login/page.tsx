"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
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

type LoginResponse = {
  success?: boolean;
  message?: string;
  user?: {
    id?: string;
    name?: string;
    email?: string;
    role?: "member" | "admin";
    isActive?: boolean;
  };
};

export default function LoginPage() {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function checkExistingSession() {
      try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) return;

        const data = (await response.json()) as LoginResponse;

        if (data.success && data.user && !cancelled) {
          router.replace(
            data.user.role === "admin" ? "/admin" : "/dashboard",
          );
        }
      } catch {
        // Not authenticated, stay on login page
      }
    }

    void checkExistingSession();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) {
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",

        // Required so the browser accepts the backend auth cookie.
        credentials: "include",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = (await response.json()) as LoginResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Login failed. Please check your details.",
        );
      }

      // The backend sets an HttpOnly membrix_token cookie.
      // Do not store the authentication token in localStorage.
      setPassword("");
router.replace(
  data.user?.role === "admin" ? "/admin" : "/dashboard",
);
router.refresh();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect to the server. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Left brand panel */}
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
              Your membership, elevated
            </span>

            <h1 className="text-5xl font-semibold leading-[1.12] tracking-tight xl:text-6xl">
              Your community.
              <br />
              Your next <span className="text-[#e6ca8b]">chapter.</span>
            </h1>

            <p className="mt-6 max-w-md text-base leading-8 text-white/65">
              Sign in to access your membership, manage your profile, and stay
              connected with the community that moves you forward.
            </p>

            <div className="mt-12 flex items-center gap-4 border-t border-white/15 pt-6">
              <div className="flex -space-x-2">
                {["M", "A", "R"].map((letter, index) => (
                  <span
                    key={letter}
                    className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#102b46] bg-white/10 text-sm font-semibold text-[#e6ca8b]"
                    style={{ opacity: 1 - index * 0.15 }}
                  >
                    {letter}
                  </span>
                ))}
              </div>

              <p className="text-sm text-white/60">
                A better way to belong.
              </p>
            </div>
          </div>

          <p className="relative z-10 text-xs text-white/40">
            © 2026 Membrix. All rights reserved.
          </p>
        </section>

        {/* Login form */}
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
              href="/register"
              className="text-sm font-medium text-[var(--foreground)] transition hover:text-[#b99a5b]"
            >
              Create account
            </Link>
          </header>

          <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">
            <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#d6b878]/30 bg-[#d6b878]/10 text-[#b99a5b]">
              <LockKeyhole size={25} />
            </div>

            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#b99a5b]">
              Secure account access
            </p>

            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Welcome back
            </h2>

            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              Enter your details below to access your Membrix account.
            </p>

            <form onSubmit={handleSubmit} className="mt-9 space-y-5">
              {error && (
                <p
                  role="alert"
                  aria-live="polite"
                  className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600"
                >
                  {error}
                </p>
              )}

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium"
                >
                  Email address
                </label>

                <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 transition focus-within:border-[#b99a5b] focus-within:ring-2 focus-within:ring-[#d6b878]/15">
                  <Mail
                    size={18}
                    className="shrink-0 text-[var(--muted)]"
                  />

                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="you@example.com"
                    required
                    maxLength={254}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-[var(--muted)]"
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label
                    htmlFor="password"
                    className="text-sm font-medium"
                  >
                    Password
                  </label>

                  <Link
                    href="/forgot-password"
                    className="text-xs font-medium text-[#b99a5b] transition hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 transition focus-within:border-[#b99a5b] focus-within:ring-2 focus-within:ring-[#d6b878]/15">
                  <LockKeyhole
                    size={18}
                    className="shrink-0 text-[var(--muted)]"
                  />

                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    required
                    minLength={1}
                    maxLength={128}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-[var(--muted)]"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    aria-pressed={showPassword}
                    className="shrink-0 rounded-md p-1 text-[var(--muted)] transition hover:text-[var(--foreground)]"
                  >
                    {showPassword ? (
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
                className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#d6b878] px-5 text-sm font-semibold text-[#172b3d] shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-[#e6ca8b] hover:shadow-lg hover:shadow-[#d6b878]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b99a5b] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Sign in"}

                {!loading && (
                  <ArrowRight
                    size={17}
                    className="transition-transform group-hover:translate-x-1"
                  />
                )}
              </button>

              <p className="text-center text-xs leading-6 text-[var(--muted)]">
                Secure access to your membership account.
              </p>
            </form>

            <div className="mt-8 border-t border-[var(--border)] pt-6 text-center">
              <p className="text-sm text-[var(--muted)]">
                Don&apos;t have an account?{" "}
                <Link
                  href="/register"
                  className="font-semibold text-[#b99a5b] transition hover:underline"
                >
                  Join Membrix
                </Link>
              </p>
            </div>
          </div>

          <footer className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 pb-2 text-xs text-[var(--muted)]">
            <span>Made for membership communities</span>

            <Link
              href="/contact"
              className="transition hover:text-[var(--foreground)]"
            >
              Need help?
            </Link>
          </footer>
        </section>
      </div>
    </main>
  );
}