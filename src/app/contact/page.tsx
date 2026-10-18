"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Mail,
  MapPin,
  MessageCircle,
  Send,
  ShieldCheck,
} from "lucide-react";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "Membership inquiry",
    message: "",
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setForm({
      name: "",
      email: "",
      subject: "Membership inquiry",
      message: "",
    });
  }

  const inputClass =
    "w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3.5 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--gold)] focus:ring-2 focus:ring-[var(--gold)]/15";

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Navigation */}
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8 lg:px-12">
          <Link href="/" className="group flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)] text-sm font-bold text-[var(--gold)]">
              M
            </span>
            <span className="text-xl font-semibold tracking-tight">
              Membrix<span className="text-[var(--gold)]">.</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            <Link
              href="/"
              className="text-sm text-[var(--muted)] transition hover:text-[var(--gold)]"
            >
              Home
            </Link>
            <Link
              href="/about"
              className="text-sm text-[var(--muted)] transition hover:text-[var(--gold)]"
            >
              About
            </Link>
            <Link
              href="/membership"
              className="text-sm text-[var(--muted)] transition hover:text-[var(--gold)]"
            >
              Membership
            </Link>
            <Link
              href="/contact"
              aria-current="page"
              className="text-sm font-medium text-[var(--gold)]"
            >
              Contact
            </Link>
          </nav>

          <Link href="/login" className="button button-outline">
            Sign in <ArrowRight size={15} />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[var(--gold)]/10 blur-3xl" />

        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-end lg:px-12 lg:py-28">
          <div>
            <Link
              href="/"
              className="mb-10 inline-flex items-center gap-2 text-sm text-[var(--muted)] transition hover:text-[var(--gold)]"
            >
              <ArrowLeft size={15} />
              Back to home
            </Link>

            <p className="mb-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.25em] text-[var(--gold)]">
              <span className="h-px w-8 bg-[var(--gold)]" />
              We&apos;re here to help
            </p>

            <h1 className="max-w-3xl text-5xl font-semibold leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl">
              Let&apos;s start a{" "}
              <span className="font-serif italic text-[var(--gold)]">
                conversation.
              </span>
            </h1>

            <p className="mt-7 max-w-xl text-base leading-8 text-[var(--muted)] sm:text-lg">
              Have a question about membership, need assistance, or want to
              explore Membrix? Send us a message and let&apos;s find the right
              way forward.
            </p>
          </div>

          <div className="relative rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7 sm:p-9">
            <div className="mb-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--gold)]/15 text-[var(--gold)]">
              <MessageCircle size={25} strokeWidth={1.6} />
            </div>

            <p className="text-2xl font-semibold tracking-tight">
              Every good connection starts somewhere.
            </p>

            <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
              Tell us what you need. We&apos;ll help you understand your
              membership options and find the information you&apos;re looking
              for.
            </p>

            <div className="mt-8 flex items-center justify-between border-t border-[var(--border)] pt-5">
              <span className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                Your next step
              </span>
              <ArrowDownRight className="text-[var(--gold)]" size={22} />
            </div>
          </div>
        </div>
      </section>

      {/* Contact information and form */}
      <section className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20 lg:px-12 lg:py-24">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--gold)]">
            Get in touch
          </p>

          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            How can we help you?
          </h2>

          <p className="mt-4 max-w-md text-sm leading-7 text-[var(--muted)]">
            Choose the most convenient way to reach our team, or use the
            message form and tell us a little about what you need.
          </p>

          <div className="mt-9 space-y-4">
            <div className="flex gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--gold)]/15 text-[var(--gold)]">
                <Mail size={20} />
              </div>

              <div>
                <h3 className="font-medium">Email support</h3>
                <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                  Send us your questions through the contact form.
                </p>
                <p className="mt-2 text-xs text-[var(--muted)]">
                  Official support email details can be added when available.
                </p>
              </div>
            </div>

            <div className="flex gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--gold)]/15 text-[var(--gold)]">
                <Clock3 size={20} />
              </div>

              <div>
                <h3 className="font-medium">Response time</h3>
                <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                  We aim to make membership support clear, helpful, and
                  straightforward.
                </p>
                <p className="mt-2 text-xs text-[var(--muted)]">
                  Support hours will be announced soon.
                </p>
              </div>
            </div>

            <div className="flex gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--gold)]/15 text-[var(--gold)]">
                <ShieldCheck size={20} />
              </div>

              <div>
                <h3 className="font-medium">Membership assistance</h3>
                <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                  Get guidance on registration, account access, and membership
                  options.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex items-start gap-3 rounded-xl bg-[var(--surface)] p-4">
            <MapPin size={18} className="mt-0.5 shrink-0 text-[var(--gold)]" />
            <p className="text-sm leading-6 text-[var(--muted)]">
              Membrix is an organization membership platform. Official office
              address and contact details can be published here once confirmed.
            </p>
          </div>
        </div>

        {/* Contact form */}
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-9 lg:p-10">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gold)]">
              Send a message
            </p>

            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              Tell us what&apos;s on your mind.
            </h2>

            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              Fill in the details below. All fields are required.
            </p>
          </div>

          {submitted && (
            <div
              role="status"
              className="mb-6 flex gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm"
            >
              <CheckCircle2
                size={20}
                className="shrink-0 text-emerald-500"
              />
              <div>
                <p className="font-medium">Form submitted successfully.</p>
                <p className="mt-1 leading-6 text-[var(--muted)]">
                  This is a frontend demo. Your message has not been sent to a
                  server yet.
                </p>
              </div>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            onChange={() => submitted && setSubmitted(false)}
            className="space-y-5"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-medium"
                >
                  Full name
                </label>

                <input
                  id="name"
                  name="name"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={100}
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  placeholder="Your full name"
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium"
                >
                  Email address
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  value={form.email}
                  onChange={(event) =>
                    setForm({ ...form, email: event.target.value })
                  }
                  placeholder="you@example.com"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="subject"
                className="mb-2 block text-sm font-medium"
              >
                What is this about?
              </label>

              <select
                id="subject"
                name="subject"
                value={form.subject}
                onChange={(event) =>
                  setForm({ ...form, subject: event.target.value })
                }
                className={inputClass}
              >
                <option>Membership inquiry</option>
                <option>Account access</option>
                <option>Payment question</option>
                <option>Technical support</option>
                <option>Partnership opportunity</option>
                <option>Other</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="message"
                className="mb-2 block text-sm font-medium"
              >
                Your message
              </label>

              <textarea
                id="message"
                name="message"
                required
                minLength={10}
                maxLength={3000}
                rows={5}
                value={form.message}
                onChange={(event) =>
                  setForm({ ...form, message: event.target.value })
                }
                placeholder="Tell us how we can help..."
                className={`${inputClass} resize-y`}
              />

              <p className="mt-2 text-right text-xs text-[var(--muted)]">
                {form.message.length}/3000
              </p>
            </div>

            {/* Use Membrix homepage's shared button styles */}
            <button
              type="submit"
              className="button button-gold w-full"
            >
              Submit message
              <Send size={16} />
            </button>

            <p className="text-center text-xs leading-6 text-[var(--muted)]">
              By submitting, you agree to use this form for legitimate
              inquiries. Server-side processing is not connected yet.
            </p>
          </form>
        </div>
      </section>

      {/* Membership CTA */}
      <section className="px-5 pb-16 sm:px-8 sm:pb-20 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-7 rounded-3xl bg-[var(--primary)] p-8 text-[var(--primary-foreground)] sm:p-10 md:flex-row md:items-center lg:p-14">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gold)]">
              Ready to join?
            </p>

            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Your membership journey starts here.
            </h2>

            <p className="mt-3 max-w-xl text-sm leading-7 opacity-70">
              Explore membership options and find the plan that fits your goals.
            </p>
          </div>

          <Link
            href="/membership"
            className="button button-gold shrink-0 self-start md:self-center"
          >
            Explore membership <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Membrix<span className="text-[var(--gold)]">.</span>
          </Link>

          <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-[var(--muted)]">
            <Link
              href="/about"
              className="transition hover:text-[var(--gold)]"
            >
              About
            </Link>
            <Link
              href="/membership"
              className="transition hover:text-[var(--gold)]"
            >
              Membership
            </Link>
            <Link
              href="/login"
              className="transition hover:text-[var(--gold)]"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="transition hover:text-[var(--gold)]"
            >
              Register
            </Link>
          </div>

          <p className="text-xs text-[var(--muted)]">
            © 2026 Membrix. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}