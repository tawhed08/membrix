
"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import gsap from "gsap";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  CreditCard,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

type PlanId = "essential" | "premium" | "lifetime";

type PaymentMethod = "bkash" | "nagad" | "bank" | "online";

const plans: Record<
  PlanId,
  {
    name: string;
    price: string;
    billing: string;
    description: string;
    features: string[];
  }
> = {
  essential: {
    name: "Essential",
    price: "৳500",
    billing: "per year",
    description: "A simple starting point for your membership journey.",
    features: [
      "Personal member profile",
      "Membership status tracking",
      "Member announcements",
    ],
  },
  premium: {
    name: "Premium",
    price: "৳1,000",
    billing: "per year",
    description: "More value for members ready to get involved.",
    features: [
      "Everything in Essential",
      "Digital membership card",
      "Priority member support",
      "Membership history",
    ],
  },
  lifetime: {
    name: "Lifetime",
    price: "৳5,000",
    billing: "one-time",
    description: "A long-term membership option.",
    features: [
      "Lifetime membership option",
      "Digital membership card",
      "Member profile and history",
      "Priority support",
    ],
  },
};

const paymentMethods: {
  id: PaymentMethod;
  name: string;
  description: string;
  icon: typeof Wallet;
}[] = [
  {
    id: "bkash",
    name: "bKash",
    description: "Mobile financial service",
    icon: Wallet,
  },
  {
    id: "nagad",
    name: "Nagad",
    description: "Mobile financial service",
    icon: Wallet,
  },
  {
    id: "bank",
    name: "Bank transfer",
    description: "Transfer from your bank",
    icon: Building2,
  },
  {
    id: "online",
    name: "Online gateway",
    description: "Online payment integration",
    icon: CreditCard,
  },
];

function CheckoutContent() {
  const searchParams = useSearchParams();
  const pageRef = useRef<HTMLElement>(null);

  const rawPlan = searchParams.get("plan")?.toLowerCase() ?? "essential";

  const initialPlan: PlanId =
    rawPlan === "premium" || rawPlan === "lifetime" || rawPlan === "essential"
      ? rawPlan
      : "essential";

  const [selectedPlan, setSelectedPlan] = useState<PlanId>(initialPlan);
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("bkash");
  const [transactionId, setTransactionId] = useState("");
  const [payerNumber, setPayerNumber] = useState("");
  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState<"info" | "error">("info");
const [isSubmitting, setIsSubmitting] = useState(false);

  const plan = plans[selectedPlan];
  const isManualPayment = paymentMethod !== "online";

  useEffect(() => {
    if (!pageRef.current) return;

    const root = pageRef.current;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const ctx = gsap.context(() => {
      if (prefersReducedMotion) return;

      gsap.from("[data-checkout-animate]", {
        opacity: 0,
        y: 22,
        duration: 0.65,
        stagger: 0.1,
        ease: "power3.out",
        clearProps: "all",
      });
    }, root);

    return () => ctx.revert();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNoticeType("info");

    // Prevent duplicate submissions
    if (isSubmitting) {
      return;
    }

    // Validate transaction ID for manual payments
    if (isManualPayment && !transactionId.trim()) {
      setNoticeType("error");
      setNotice("Enter the transaction ID to continue.");
      return;
    }

    setIsSubmitting(true);
    setNotice("");

    try {
      if (!isManualPayment) {
        // Online gateway initiation via verified aamarPay backend route
        const res = await fetch(`${API_URL}/api/payments/aamarpay/initiate`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            planSlug: selectedPlan,
          }),
        });

        const data = await res.json();

        if (res.status === 401) {
          setNoticeType("error");
          setNotice("Please sign in to your member account before continuing.");
          return;
        }

        if (res.ok && data.payment_url) {
          window.location.href = String(data.payment_url);
          return;
        }

        setNoticeType("error");
        setNotice(
          data.message ||
            "The online payment gateway is currently unavailable. Please select a manual payment method.",
        );
        return;
      }

      const payload = {
        planSlug: selectedPlan,
        method: paymentMethod,
        transactionId: transactionId.trim(),
        payerNumber: payerNumber.trim() || undefined,
      };

      const res = await fetch(`${API_URL}/api/payments/manual/submit`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.status === 401) {
        setNoticeType("error");
        setNotice("Please sign in to your member account before submitting payment.");
        return;
      }

      if (res.ok && data.success) {
        setNoticeType("info");
        setNotice(
          `Payment submitted successfully (Reference: ${data.payment.transactionId}). Your membership is now pending admin review.`,
        );
        setTransactionId("");
        setPayerNumber("");
      } else {
        setNoticeType("error");
        setNotice(data.message ?? "Failed to submit payment.");
      }
    } catch {
      setNoticeType("error");
      setNotice("Network error while submitting payment. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main
      ref={pageRef}
      className="min-h-screen bg-[var(--background)] text-[var(--foreground)]"
    >
      <header className="border-b border-[var(--border)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/" className="inline-flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d6b878]/40 bg-[#d6b878]/10 text-[#b99a5b]">
              <Sparkles size={21} />
            </span>
            <span className="text-xl font-semibold tracking-tight">
              Membrix<span className="text-[#b99a5b]">.</span>
            </span>
          </Link>

          <Link
            href="/membership"
            className="inline-flex items-center gap-2 text-sm text-[var(--muted)] transition hover:text-[var(--foreground)]"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Membership plans</span>
            <span className="sm:hidden">Plans</span>
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
        <div data-checkout-animate className="mb-9 max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#b88b48]/30 bg-[#b88b48]/10 px-3 py-1.5 text-xs font-medium text-[#b88b48]">
            <LockKeyhole size={14} />
            Secure checkout preview
          </div>

          <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
            Complete your{" "}
            <span className="text-[#b88b48]">membership.</span>
          </h1>

          <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--muted)] sm:text-base">
            Review your selected plan and explore the available payment
            options. This checkout is a frontend preview; payments are not
            active yet.
          </p>
        </div>

        <div className="mb-8 flex items-start gap-3 rounded-2xl border border-[#b88b48]/30 bg-[#b88b48]/10 p-4 sm:p-5">
          <ShieldCheck
            size={21}
            className="mt-0.5 shrink-0 text-[#b88b48]"
          />
          <div>
            <p className="text-sm font-semibold">Demo checkout — no real payment</p>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
              All prices shown below are illustrative placeholders. Final
              membership pricing is yet to be determined. Payment submission,
              verification and membership activation are not enabled.
            </p>
          </div>
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-[1fr_360px]">
          <form onSubmit={handleSubmit} className="min-w-0 space-y-8">
            <section
              data-checkout-animate
              className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7"
            >
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#b88b48]/10 text-[#b88b48]">
                  <Sparkles size={19} />
                </span>
                <div>
                  <h2 className="text-lg font-semibold">01. Select membership</h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Choose a plan to preview its details.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {(Object.entries(plans) as [PlanId, (typeof plans)[PlanId]][]).map(
                  ([id, item]) => {
                    const isSelected = selectedPlan === id;

                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          setSelectedPlan(id);
                          setNotice("");
                        }}
                        aria-pressed={isSelected}
                        className={`relative rounded-2xl border p-4 text-left transition ${
                          isSelected
                            ? "border-[#b88b48] bg-[#b88b48]/10"
                            : "border-[var(--border)] hover:border-[#b88b48]/60"
                        }`}
                      >
                        {isSelected && (
                          <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-[#b88b48] text-white">
                            <Check size={12} />
                          </span>
                        )}

                        <span className="block pr-5 text-sm font-semibold">
                          {item.name}
                        </span>
                        <span className="mt-3 block text-xl font-semibold tracking-tight">
                          {item.price}
                        </span>
                        <span className="mt-1 block text-xs text-[var(--muted)]">
                          {item.billing}
                        </span>
                        <span className="mt-3 block text-[11px] leading-5 text-[#b88b48]">
                          Placeholder price
                        </span>
                      </button>
                    );
                  },
                )}
              </div>
            </section>

            <section
              data-checkout-animate
              className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7"
            >
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#b88b48]/10 text-[#b88b48]">
                  <Wallet size={19} />
                </span>
                <div>
                  <h2 className="text-lg font-semibold">02. Payment method</h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Select your preferred payment option.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {paymentMethods.map((method) => {
                  const Icon = method.icon;
                  const isSelected = paymentMethod === method.id;

                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => {
                        setPaymentMethod(method.id);
                        setNotice("");
                      }}
                      aria-pressed={isSelected}
                      className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
                        isSelected
                          ? "border-[#b88b48] bg-[#b88b48]/10"
                          : "border-[var(--border)] hover:border-[#b88b48]/60"
                      }`}
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-alt)]">
                        <Icon size={20} className="text-[#b88b48]" />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">
                          {method.name}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">
                          {method.description}
                        </span>
                      </span>

                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                          isSelected
                            ? "border-[#b88b48] bg-[#b88b48] text-white"
                            : "border-[var(--border)]"
                        }`}
                      >
                        {isSelected && <Check size={12} />}
                      </span>
                    </button>
                  );
                })}
              </div>

              {isManualPayment ? (
                <div className="mt-6 space-y-5 border-t border-[var(--border)] pt-6">
                  <div>
                    <h3 className="text-sm font-semibold">
                      Manual payment details
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                      The actual recipient account and payment instructions
                      will be configured securely when the backend is ready.
                      Do not send money based on this preview.
                    </p>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium">
                        Transaction ID
                        <span className="ml-1 text-[#b88b48]">*</span>
                      </span>
                      <input
                        value={transactionId}
                        onChange={(event) => {
                          setTransactionId(event.target.value);
                          setNotice("");
                        }}
                        required
                        maxLength={120}
                        placeholder="Enter transaction reference"
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none transition placeholder:text-[var(--muted)] focus:border-[#b88b48] focus:ring-2 focus:ring-[#b88b48]/15"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium">
                        Payer number
                        <span className="ml-1 text-xs font-normal text-[var(--muted)]">
                          (optional)
                        </span>
                      </span>
                      <input
                        value={payerNumber}
                        onChange={(event) => {
                          setPayerNumber(event.target.value);
                          setNotice("");
                        }}
                        maxLength={30}
                        placeholder="e.g. 01XXXXXXXXX"
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none transition placeholder:text-[var(--muted)] focus:border-[#b88b48] focus:ring-2 focus:ring-[#b88b48]/15"
                      />
                    </label>
                  </div>

                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)]/30 p-4">
                    <span className="block text-sm font-semibold">
                      Payment evidence & proof
                    </span>
                    <p className="mt-1.5 text-xs leading-5 text-[var(--muted)]">
                      Proof upload is currently unavailable. Your payment will be verified by an administrator using your transaction reference and payer number.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
                  <div className="flex items-start gap-3">
                    <CreditCard
                      size={20}
                      className="mt-0.5 shrink-0 text-[#b88b48]"
                    />
                    <div>
                      <h3 className="text-sm font-semibold">
                        Online gateway preview
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                        The gateway is not connected. No payment session will
                        be created, and no card or banking details are needed
                        here.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {notice && (
              <div
                role="status"
                aria-live="polite"
                className={`flex items-start gap-3 rounded-2xl border p-4 text-sm leading-6 ${
                  noticeType === "error"
                    ? "border-red-500/30 bg-red-500/5 text-red-600 dark:text-red-300"
                    : "border-[#b88b48]/30 bg-[#b88b48]/10 text-[var(--foreground)]"
                }`}
              >
                {noticeType === "error" ? (
                  <X size={19} className="mt-0.5 shrink-0" />
                ) : (
                  <CheckCircle2
                    size={19}
                    className="mt-0.5 shrink-0 text-[#b88b48]"
                  />
                )}
                <p>{notice}</p>
              </div>
            )}

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#b88b48] px-5 py-4 text-sm font-semibold text-[#1d160c] transition hover:bg-[#c99b59] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b88b48] sm:w-auto sm:min-w-64"
            >
              Preview checkout submission
              <ArrowRight size={17} />
            </button>

            <p className="text-xs leading-5 text-[var(--muted)]">
              Preview only. This action does not charge money, submit a payment
              request, upload a file or activate a membership.
            </p>
          </form>

          <aside data-checkout-animate className="space-y-5 lg:sticky lg:top-8">
            <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)]">
              <div className="bg-[var(--dark-panel)] p-6 text-[var(--dark-text)] sm:p-7">
                <div className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-[var(--dark-muted)]">
                  <Sparkles size={14} className="text-[#d3ad70]" />
                  Order summary
                </div>

                <h2 className="text-2xl font-semibold">{plan.name}</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--dark-muted)]">
                  {plan.description}
                </p>

                <div className="mt-6 border-t border-white/10 pt-5">
                  <p className="text-xs text-[var(--dark-muted)]">
                    Illustrative price
                  </p>
                  <div className="mt-1 flex flex-wrap items-baseline gap-2">
                    <span className="text-3xl font-semibold tracking-tight">
                      {plan.price}
                    </span>
                    <span className="text-sm text-[var(--dark-muted)]">
                      {plan.billing}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-[#d3ad70]">
                    Placeholder — not a confirmed charge
                  </p>
                </div>
              </div>

              <div className="p-6 sm:p-7">
                <h3 className="text-sm font-semibold">Plan includes</h3>

                <ul className="mt-4 space-y-3">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2.5 text-sm leading-5 text-[var(--muted)]"
                    >
                      <Check
                        size={16}
                        className="mt-0.5 shrink-0 text-[#b88b48]"
                      />
                      {feature}
                    </li>
                  ))}
                </ul>

                <div className="mt-6 border-t border-[var(--border)] pt-5">
                  <div className="flex items-start gap-3">
                    <ShieldCheck
                      size={19}
                      className="mt-0.5 shrink-0 text-[#b88b48]"
                    />
                    <p className="text-xs leading-5 text-[var(--muted)]">
                      Payment confirmation and membership activation will
                      require server-side verification.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border)] p-5">
              <div className="flex items-center gap-3">
                <LockKeyhole
                  size={19}
                  className="shrink-0 text-[#b88b48]"
                />
                <div>
                  <p className="text-sm font-medium">Questions about a plan?</p>
                  <Link
                    href="/contact"
                    className="mt-1 inline-flex items-center gap-1 text-sm text-[#b88b48] hover:underline"
                  >
                    Contact our team
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </div>

            <Link
              href="/membership"
              className="inline-flex items-center gap-2 px-1 text-sm text-[var(--muted)] transition hover:text-[var(--foreground)]"
            >
              <ArrowLeft size={15} />
              Back to membership plans
            </Link>
          </aside>
        </div>
      </section>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[var(--background)] p-8 text-[var(--foreground)]">
          Loading checkout preview...
        </main>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
