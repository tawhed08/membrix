"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Building2,
  Check,
  Clock3,
  Mail,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const inquiryCategories = [
  {
    label: "Membership Support",
    icon: UsersRound,
    description: "Memberships and certificates",
  },
  {
    label: "Account & Profile",
    icon: ShieldCheck,
    description: "Your Membrix account",
  },
  {
    label: "Payment Assistance",
    icon: Building2,
    description: "Payments and billing",
  },
  {
    label: "Partnership & Business",
    icon: Sparkles,
    description: "Working together",
  },
  {
    label: "General Inquiry",
    icon: MessageCircle,
    description: "Something else",
  },
] as const;

type FormState = {
  name: string;
  email: string;
  phone: string;
  organization: string;
  subject: string;
  message: string;
  website: string;
};

const initialForm: FormState = {
  name: "",
  email: "",
  phone: "",
  organization: "",
  subject: "",
  message: "",
  website: "",
};

const fieldClass =
  "mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] hover:border-[var(--gold)]/60 focus-visible:border-[var(--gold)] focus-visible:ring-2 focus-visible:ring-[var(--gold)]/25 disabled:cursor-not-allowed disabled:opacity-60";

export default function ContactPage() {
  const pageRef = useRef<HTMLElement>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useGSAP(
    () => {
      const motion = gsap.matchMedia();
      motion.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-reveal]", {
          y: 22,
          autoAlpha: 0,
          duration: 0.75,
          stagger: 0.09,
          ease: "power2.out",
          clearProps: "all",
        });
      });

      return () => motion.revert();
    },
    { scope: pageRef },
  );

  function updateField(
    event: ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) {
    const { name, value } = event.currentTarget;
    setForm((current) => ({ ...current, [name]: value }));
    setFeedback(null);
  }

  function chooseCategory(category: string) {
    setForm((current) => ({ ...current, subject: category }));
    setFeedback(null);
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch(`${API_URL}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload: unknown = await response.json().catch(() => null);
      const message =
        typeof payload === "object" &&
        payload !== null &&
        "message" in payload &&
        typeof payload.message === "string"
          ? payload.message
          : null;

      if (!response.ok) {
        throw new Error(
          message || "Your message could not be sent. Please try again.",
        );
      }

      setForm(initialForm);
      setFeedback({
        type: "success",
        message:
          message || "Your message has been sent. Thank you for reaching out.",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Your message could not be sent. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main
      ref={pageRef}
      className="overflow-hidden bg-[var(--background)] text-[var(--foreground)]"
    >
      <section className="relative border-b border-[var(--border)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-36 -top-44 h-[460px] w-[460px] rounded-full border border-[var(--gold)]/10"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-28 h-[320px] w-[320px] rounded-full border border-[var(--gold)]/15"
        />
        <div className="container-shell relative grid min-h-[440px] items-center gap-12 py-20 md:grid-cols-[1fr_auto] md:py-28">
          <div className="max-w-3xl">
            <p
              data-reveal
              className="mb-6 inline-flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-[var(--gold)]"
            >
              <span className="h-px w-8 bg-[var(--gold)]" />
              LET&apos;S TALK
            </p>
            <h1
              data-reveal
              className="max-w-3xl font-sans text-4xl font-medium leading-[1.08] tracking-[-0.045em] sm:text-5xl md:text-6xl"
            >
              Let&apos;s Make Membership Management{" "}
              <span className="text-[var(--gold)]">Better.</span>
            </h1>
            <p
              data-reveal
              className="mt-7 max-w-2xl text-base leading-7 text-[var(--muted)] md:text-lg md:leading-8"
            >
              Have a question about Membrix? Our team is here to help you find
              the right solution, answer your questions, and make your
              membership experience better.
            </p>
            <a
              data-reveal
              href="#contact-form"
              className="mt-9 inline-flex min-h-12 items-center gap-3 rounded-xl bg-[var(--gold)] px-5 text-sm font-semibold text-[var(--gold-contrast)] transition hover:-translate-y-0.5 hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--gold)]"
            >
              Start a conversation
              <ArrowDown size={16} aria-hidden="true" />
            </a>
          </div>
          <div
            data-reveal
            aria-hidden="true"
            className="hidden h-36 w-36 items-center justify-center rounded-full border border-[var(--gold)]/25 bg-[var(--surface)] text-[var(--gold)] shadow-[0_20px_80px_color-mix(in_srgb,var(--gold)_8%,transparent)] md:flex"
          >
            <MessageCircle size={46} strokeWidth={1.1} />
          </div>
        </div>
      </section>

      <section className="container-shell py-20 md:py-28">
        <div className="grid items-start gap-12 lg:grid-cols-[0.78fr_1.22fr] lg:gap-16">
          <aside data-reveal className="lg:sticky lg:top-10">
            <p className="text-xs font-semibold tracking-[0.18em] text-[var(--gold)]">
              GET IN TOUCH
            </p>
            <h2 className="mt-4 text-3xl font-medium tracking-[-0.035em] sm:text-4xl">
              A better experience starts with a conversation.
            </h2>
            <p className="mt-5 max-w-lg text-sm leading-7 text-[var(--muted)]">
              Tell us what you need and include a few details that will help us
              understand your question. We&apos;ll make sure your message reaches
              the right place.
            </p>

            <div className="mt-9 divide-y divide-[var(--border)] border-y border-[var(--border)]">
              <div className="flex gap-4 py-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--gold)]">
                  <Mail size={18} aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold">Contact form</h3>
                  <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                    Send an inquiry securely through this page.
                  </p>
                </div>
              </div>
              <div className="flex gap-4 py-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--gold)]">
                  <Clock3 size={18} aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold">Helpful details</h3>
                  <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                    Include your account email and relevant membership or
                    payment reference when applicable.
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-5 text-xs leading-5 text-[var(--muted)]">
              A public phone number, office address, and business hours are not
              currently listed.
            </p>
          </aside>

          <div
            id="contact-form"
            data-reveal
            className="scroll-mt-24 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_20px_70px_color-mix(in_srgb,var(--foreground)_5%,transparent)] sm:p-9"
          >
            <div className="mb-8 border-b border-[var(--border)] pb-6">
              <p className="text-xs font-semibold tracking-[0.16em] text-[var(--gold)]">
                SEND A MESSAGE
              </p>
              <h2 className="mt-3 text-2xl font-medium tracking-[-0.03em]">
                How can we help?
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Complete the form and our team will receive your inquiry.
              </p>
            </div>

            <form onSubmit={submitForm} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block text-sm font-medium">
                  Full name <span className="text-[var(--gold)]">*</span>
                  <input
                    className={fieldClass}
                    name="name"
                    autoComplete="name"
                    required
                    minLength={2}
                    maxLength={120}
                    value={form.name}
                    onChange={updateField}
                    placeholder="Your name"
                  />
                </label>
                <label className="block text-sm font-medium">
                  Work email / email address{" "}
                  <span className="text-[var(--gold)]">*</span>
                  <input
                    className={fieldClass}
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={254}
                    value={form.email}
                    onChange={updateField}
                    placeholder="you@organization.com"
                  />
                </label>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block text-sm font-medium">
                  Phone number{" "}
                  <span className="font-normal text-[var(--muted)]">
                    (optional)
                  </span>
                  <input
                    className={fieldClass}
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    maxLength={40}
                    value={form.phone}
                    onChange={updateField}
                    placeholder="Your phone number"
                  />
                </label>
                <label className="block text-sm font-medium">
                  Organization{" "}
                  <span className="font-normal text-[var(--muted)]">
                    (optional)
                  </span>
                  <input
                    className={fieldClass}
                    name="organization"
                    autoComplete="organization"
                    maxLength={120}
                    value={form.organization}
                    onChange={updateField}
                    placeholder="Organization name"
                  />
                </label>
              </div>

              <label className="block text-sm font-medium">
                Subject <span className="text-[var(--gold)]">*</span>
                <select
                  className={fieldClass}
                  name="subject"
                  required
                  value={form.subject}
                  onChange={updateField}
                >
                  <option value="" disabled>
                    Choose a topic
                  </option>
                  {inquiryCategories.map(({ label }) => (
                    <option key={label} value={label}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <div>
                <p className="text-sm font-medium">What can we help you with?</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {inquiryCategories.map(({ label, icon: Icon, description }) => (
                    <button
                      key={label}
                      type="button"
                      aria-pressed={form.subject === label}
                      onClick={() => chooseCategory(label)}
                      className={`flex min-h-[68px] items-center gap-3 rounded-xl border px-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)] ${
                        form.subject === label
                          ? "border-[var(--gold)] bg-[color-mix(in_srgb,var(--gold)_9%,var(--surface))]"
                          : "border-[var(--border)] hover:border-[var(--gold)]/60 hover:bg-[var(--background)]"
                      }`}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--background)] text-[var(--gold)]">
                        <Icon size={17} aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-semibold">
                          {label}
                        </span>
                        <span className="mt-1 block text-[11px] text-[var(--muted)]">
                          {description}
                        </span>
                      </span>
                      {form.subject === label && (
                        <Check
                          size={15}
                          className="shrink-0 text-[var(--gold)]"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block text-sm font-medium">
                Message <span className="text-[var(--gold)]">*</span>
                <textarea
                  className={`${fieldClass} min-h-36 resize-y`}
                  name="message"
                  required
                  minLength={20}
                  maxLength={5000}
                  value={form.message}
                  onChange={updateField}
                  placeholder="Share a little context so we can direct your inquiry."
                />
                <span className="mt-1 block text-xs font-normal text-[var(--muted)]">
                  Please don&apos;t include passwords or sensitive payment
                  information.
                </span>
              </label>

              <div
                className="absolute -left-[10000px] h-px w-px overflow-hidden"
                aria-hidden="true"
              >
                <label>
                  Leave this field empty
                  <input
                    tabIndex={-1}
                    autoComplete="off"
                    name="website"
                    value={form.website}
                    onChange={updateField}
                  />
                </label>
              </div>

              <div className="flex flex-col gap-4 border-t border-[var(--border)] pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-sm text-xs leading-5 text-[var(--muted)]">
                  By sending this message, you agree that Membrix may use these
                  details to respond to your inquiry.
                </p>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex min-h-12 shrink-0 items-center justify-center gap-3 rounded-xl bg-[var(--gold)] px-5 text-sm font-semibold text-[var(--gold-contrast)] transition hover:-translate-y-0.5 hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--gold)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  {isSubmitting ? "Sending…" : "Send Message"}
                  {!isSubmitting && (
                    <ArrowRight size={16} aria-hidden="true" />
                  )}
                </button>
              </div>

              <p
                role="status"
                aria-live="polite"
                className={`min-h-5 text-sm ${
                  feedback?.type === "error"
                    ? "text-red-700 dark:text-red-300"
                    : "text-[var(--gold)]"
                }`}
              >
                {feedback?.message}
              </p>
            </form>
          </div>
        </div>
      </section>

      <section className="border-y border-[var(--border)] bg-[var(--surface)]">
        <div className="container-shell grid gap-10 py-16 md:grid-cols-[0.8fr_1.2fr] md:items-center md:py-20">
          <div data-reveal>
            <p className="text-xs font-semibold tracking-[0.18em] text-[var(--gold)]">
              A THOUGHTFUL SUPPORT EXPERIENCE
            </p>
            <h2 className="mt-4 max-w-md text-3xl font-medium tracking-[-0.035em]">
              The more context you share, the better we can help.
            </h2>
          </div>
          <div
            data-reveal
            className="grid gap-4 sm:grid-cols-2"
          >
            <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-5">
              <span className="text-xs font-semibold text-[var(--gold)]">
                01
              </span>
              <h3 className="mt-3 text-sm font-semibold">Choose a topic</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Select the category closest to your question so it can be
                routed appropriately.
              </p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-5">
              <span className="text-xs font-semibold text-[var(--gold)]">
                02
              </span>
              <h3 className="mt-3 text-sm font-semibold">Add useful context</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Include relevant membership or payment references, but never
                share passwords or full card details.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="container-shell py-16 md:py-20">
        <div
          data-reveal
          className="flex flex-col gap-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-7 sm:p-10 md:flex-row md:items-center md:justify-between"
        >
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-[var(--gold)]">
              HERE WHEN YOU&apos;RE READY
            </p>
            <h2 className="mt-3 max-w-2xl text-2xl font-medium tracking-[-0.03em] sm:text-3xl">
              Your Membrix Journey Starts with a Conversation.
            </h2>
          </div>
          <Link
            href="#contact-form"
            className="inline-flex min-h-11 shrink-0 items-center gap-2 self-start rounded-xl border border-[var(--border)] px-4 text-sm font-medium transition hover:border-[var(--gold)] hover:text-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--gold)] md:self-auto"
          >
            Contact our team
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  );
}
