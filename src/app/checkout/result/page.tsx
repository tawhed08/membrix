"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleX,
  Clock3,
  ShieldCheck,
} from "lucide-react";

type ResultStatus = "success" | "failed" | "cancelled" | "unknown";

function PaymentResultContent() {
  const searchParams = useSearchParams();
  const rawStatus = searchParams.get("status");

  const status: ResultStatus =
    rawStatus === "success" ||
    rawStatus === "failed" ||
    rawStatus === "cancelled"
      ? rawStatus
      : "unknown";

  const resultContent = {
    success: {
      eyebrow: "Payment result",
      title: "Payment verification completed",
      description:
        "Membrix received a successful verification result from the payment flow. Check your dashboard to confirm your current membership status.",
      detail:
        "Your membership status is maintained by the backend. This result page alone is not proof of an active membership.",
      icon: CheckCircle2,
      iconClass: "text-emerald-600 dark:text-emerald-400",
    },
    failed: {
      eyebrow: "Payment unsuccessful",
      title: "We couldn't confirm your payment",
      description:
        "The payment was not confirmed successfully. Check your payment history before trying again.",
      detail:
        "If money was deducted from your account, do not pay again immediately. Contact support and provide your transaction reference.",
      icon: CircleX,
      iconClass: "text-red-600 dark:text-red-400",
    },
    cancelled: {
      eyebrow: "Payment cancelled",
      title: "You cancelled checkout",
      description:
        "No successful payment confirmation was received for this checkout attempt.",
      detail:
        "You can return to the membership plans and start a new checkout when you are ready.",
      icon: Clock3,
      iconClass: "text-amber-600 dark:text-amber-400",
    },
    unknown: {
      eyebrow: "Payment status",
      title: "Result unavailable",
      description:
        "We couldn't determine the payment result from this page.",
      detail:
        "Open your dashboard to check your membership status. Contact support if your payment is missing or unclear.",
      icon: ShieldCheck,
      iconClass: "text-[#b88b48]",
    },
  }[status];

  const ResultIcon = resultContent.icon;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--background)] px-5 py-12 text-[var(--foreground)] sm:px-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-80 w-[min(90vw,700px)] -translate-x-1/2 rounded-full bg-[#b88b48]/10 blur-[100px]"
      />

      <div className="relative w-full max-w-2xl">
        <header className="mb-10 flex items-center justify-between">
          <Link
            href="/"
            className="text-xl font-semibold tracking-tight"
            aria-label="Membrix home"
          >
            Membrix<span className="text-[#b88b48]">.</span>
          </Link>

          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--muted)]">
            <ShieldCheck size={15} className="text-[#b88b48]" />
            Secure checkout
          </span>
        </header>

        <section
          aria-live="polite"
          className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl shadow-black/5"
        >
          <div className="p-7 text-center sm:p-12">
            <div
              className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--background)] ${resultContent.iconClass}`}
            >
              <ResultIcon size={38} strokeWidth={1.6} />
            </div>

            <p className="mt-7 text-xs font-semibold uppercase tracking-[0.22em] text-[#b88b48]">
              {resultContent.eyebrow}
            </p>

            <h1 className="mx-auto mt-4 max-w-lg text-3xl font-semibold tracking-tight sm:text-4xl">
              {resultContent.title}
            </h1>

            <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-[var(--muted)] sm:text-base">
              {resultContent.description}
            </p>

            <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 text-left sm:p-5">
              <div className="flex items-start gap-3">
                <ShieldCheck
                  size={20}
                  className="mt-0.5 shrink-0 text-[#b88b48]"
                />
                <p className="text-sm leading-6 text-[var(--muted)]">
                  {resultContent.detail}
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/dashboard"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#b88b48] px-6 py-3 text-sm font-semibold text-[#1d160c] transition hover:bg-[#c99b59] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b88b48]"
              >
                Go to dashboard
                <ArrowRight size={17} />
              </Link>

              <Link
                href="/membership"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-6 py-3 text-sm font-semibold transition hover:bg-[var(--background)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b88b48]"
              >
                <ArrowLeft size={17} />
                Membership plans
              </Link>
            </div>
          </div>

          <footer className="border-t border-[var(--border)] px-6 py-5 text-center">
            <p className="text-xs leading-5 text-[var(--muted)]">
              Need help with a payment?{" "}
              <Link
                href="/contact"
                className="font-semibold text-[#b88b48] hover:underline"
              >
                Contact our team
              </Link>
            </p>
          </footer>
        </section>

        <p className="mt-6 text-center text-xs text-[var(--muted)]">
          Membrix® · Membership management platform
        </p>
      </div>
    </main>
  );
}

export default function PaymentResultPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-6 text-[var(--foreground)]">
          <p className="text-sm text-[var(--muted)]">
            Loading payment result...
          </p>
        </main>
      }
    >
      <PaymentResultContent />
    </Suspense>
  );
}