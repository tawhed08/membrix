
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

type PaymentMethod = "bkash" | "nagad" | "bank" | "online";

type MembershipPlan = {
  _id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  billingType: "yearly" | "one_time";
  durationDays: number | null;
  features: string[];
  isActive: boolean;
};

type PlansResponse = {
  success: boolean;
  message?: string;
  data?: {
    plans?: MembershipPlan[];
  };
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

const formatPrice = (price: number) =>
  `৳${new Intl.NumberFormat("en-BD", {
    maximumFractionDigits: 2,
  }).format(price)}`;

function getBillingLabel(plan: MembershipPlan) {
  if (plan.billingType === "one_time") {
    return "one-time";
  }

  if (plan.durationDays && plan.durationDays !== 365) {
    return `${plan.durationDays} days`;
  }

  return "per year";
}

function CheckoutContent() {
  const searchParams = useSearchParams();
  const pageRef = useRef<HTMLElement>(null);

  const requestedPlan =
    searchParams.get("plan")?.trim().toLowerCase() ?? "";

  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [selectedPlanSlug, setSelectedPlanSlug] =
    useState(requestedPlan);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [plansError, setPlansError] = useState("");

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("bkash");
  const [transactionId, setTransactionId] = useState("");
  const [payerNumber, setPayerNumber] = useState("");
  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState<"info" | "error">(
    "info",
  );

  const effectivePlanSlug =
    requestedPlan ||
    selectedPlanSlug ||
    (plans.length > 0 ? plans[0].slug : "");

  const selectedPlan = plans.find(
    (plan) => plan.slug === effectivePlanSlug
  );

  const isManualPayment = paymentMethod !== "online";

  // Load active membership plans from the existing public API.
  useEffect(() => {
    const controller = new AbortController();

    async function loadPlans() {
      setIsLoadingPlans(true);
      setPlansError("");

      try {
        const response = await fetch(`${API_URL}/api/plans`, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });

        const result = (await response.json()) as PlansResponse;

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Unable to load membership plans.",
          );
        }

        if (!Array.isArray(result.data?.plans)) {
          throw new Error("The plans response has an unexpected format.");
        }

        const activePlans = result.data.plans.filter(
          (item) =>
            item &&
            typeof item._id === "string" &&
            typeof item.name === "string" &&
            typeof item.slug === "string" &&
            item.slug.length > 0 &&
            typeof item.description === "string" &&
            Number.isFinite(item.price) &&
            item.price >= 0 &&
            (item.billingType === "yearly" ||
              item.billingType === "one_time") &&
            item.isActive === true &&
            Array.isArray(item.features),
        );

        setPlans(activePlans);
      } catch (error) {
        if (controller.signal.aborted) return;

        setPlans([]);
        setPlansError(
          error instanceof Error
            ? error.message
            : "Unable to load membership plans. Please try again.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingPlans(false);
        }
      }
    }

    void loadPlans();

    return () => controller.abort();
  }, []);

  // Follow the URL when the requested plan changes.
const plan = plans.find(
  (item) => item.slug === effectivePlanSlug
);

  // Animate page sections when the checkout renders.
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

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isLoadingPlans || plansError || !plan) {
      setNoticeType("error");
      setNotice("Please select an available membership plan first.");
      return;
    }

    // This page is explicitly in preview mode.
    // No payment endpoint is called and no payment data is transmitted.
    setNoticeType("info");
    setNotice(
      `Checkout preview ready for ${plan.name} (${formatPrice(plan.price)}). No payment has been submitted. Payment processing must be enabled before you can pay.`,
    );
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
            Membership checkout preview
          </div>

          <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
            Complete your{" "}
            <span className="text-[#b88b48]">membership.</span>
          </h1>

          <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--muted)] sm:text-base">
            Choose an active membership plan and review its current
            price and benefits from Membrix.
          </p>
        </div>

        <div className="mb-8 flex items-start gap-3 rounded-2xl border border-[#b88b48]/30 bg-[#b88b48]/10 p-4 sm:p-5">
          <ShieldCheck
            size={21}
            className="mt-0.5 shrink-0 text-[#b88b48]"
          />

          <div>
            <p className="text-sm font-semibold">
              Preview mode — no payment will be taken
            </p>

            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
              Prices and plan details are loaded from the membership
              database. Payment submission is disabled on this preview
              page. Do not send money based on these payment options.
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
                  <h2 className="text-lg font-semibold">
                    01. Select membership
                  </h2>

                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Choose an active plan to review its details.
                  </p>
                </div>
              </div>

              {isLoadingPlans ? (
                <div
                  className="rounded-2xl border border-[var(--border)] p-6 text-sm text-[var(--muted)]"
                  role="status"
                >
                  Loading membership plans...
                </div>
              ) : plansError ? (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5">
                  <p className="text-sm font-semibold text-red-600 dark:text-red-300">
                    Unable to load plans
                  </p>

                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    {plansError}
                  </p>

                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium transition hover:border-[#b88b48]"
                  >
                    Try again
                    <ArrowRight size={15} />
                  </button>
                </div>
              ) : plans.length === 0 ? (
                <div className="rounded-2xl border border-[var(--border)] p-6">
                  <p className="text-sm font-semibold">
                    No active membership plans
                  </p>

                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    There are currently no active plans available for
                    checkout. Please check back later or contact our team.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {plans.map((item) => {
                      const isSelected = selectedPlanSlug === item.slug;

                      return (
                        <button
                          key={item._id}
                          type="button"
                          onClick={() => {
                            setSelectedPlanSlug(item.slug);
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

                          <span className="block pr-6 text-sm font-semibold">
                            {item.name}
                          </span>

                          <span className="mt-3 block break-words text-xl font-semibold tracking-tight">
                            {formatPrice(item.price)}
                          </span>

                          <span className="mt-1 block text-xs text-[var(--muted)]">
                            {getBillingLabel(item)}
                          </span>

                          <span className="mt-3 block text-[11px] leading-5 text-[#b88b48]">
                            Database price
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {requestedPlan && !plan && (
                    <div
                      role="status"
                      className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm leading-6 text-[var(--muted)]"
                    >
                      The requested plan &quot;{requestedPlan}&quot; is
                      unavailable or inactive. Select one of the active
                      plans above to continue.
                    </div>
                  )}
                </>
              )}
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
                  <h2 className="text-lg font-semibold">
                    02. Payment method
                  </h2>

                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Preview the payment options planned for Membrix.
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
                      Manual payment preview
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                      Payment instructions and recipient accounts have
                      not been enabled. The fields below are for UI
                      preview only; do not enter real payment information.
                    </p>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium">
                        Transaction ID
                        <span className="ml-1 text-xs font-normal text-[var(--muted)]">
                          (preview only)
                        </span>
                      </span>

                      <input
                        value={transactionId}
                        onChange={(event) => {
                          setTransactionId(event.target.value);
                          setNotice("");
                        }}
                        maxLength={120}
                        placeholder="Example reference"
                        autoComplete="off"
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none transition placeholder:text-[var(--muted)] focus:border-[#b88b48] focus:ring-2 focus:ring-[#b88b48]/15"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium">
                        Payer number
                        <span className="ml-1 text-xs font-normal text-[var(--muted)]">
                          (preview only)
                        </span>
                      </span>

                      <input
                        value={payerNumber}
                        onChange={(event) => {
                          setPayerNumber(event.target.value);
                          setNotice("");
                        }}
                        maxLength={30}
                        placeholder="Example: 01XXXXXXXXX"
                        autoComplete="off"
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none transition placeholder:text-[var(--muted)] focus:border-[#b88b48] focus:ring-2 focus:ring-[#b88b48]/15"
                      />
                    </label>
                  </div>

                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)]/30 p-4">
                    <span className="block text-sm font-semibold">
                      Payment evidence
                    </span>

                    <p className="mt-1.5 text-xs leading-5 text-[var(--muted)]">
                      File uploads and payment verification are not
                      enabled in preview mode.
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
                        The payment gateway is not enabled on this
                        preview page. No payment session will be
                        created, and no card or banking details are
                        required.
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
              disabled={isLoadingPlans || Boolean(plansError) || !plan}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#b88b48] px-5 py-4 text-sm font-semibold text-[#1d160c] transition hover:bg-[#c99b59] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b88b48] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-64"
            >
              Preview checkout
              <ArrowRight size={17} />
            </button>

            <p className="text-xs leading-5 text-[var(--muted)]">
              Preview only. This action does not call a payment API,
              transmit payment details, charge money, or activate a
              membership.
            </p>
          </form>

          <aside
            data-checkout-animate
            className="space-y-5 lg:sticky lg:top-8"
          >
            <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)]">
              <div className="bg-[var(--dark-panel)] p-6 text-[var(--dark-text)] sm:p-7">
                <div className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-[var(--dark-muted)]">
                  <Sparkles size={14} className="text-[#d3ad70]" />
                  Order summary
                </div>

                {plan ? (
                  <>
                    <h2 className="break-words text-2xl font-semibold">
                      {plan.name}
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-[var(--dark-muted)]">
                      {plan.description}
                    </p>

                    <div className="mt-6 border-t border-white/10 pt-5">
                      <p className="text-xs text-[var(--dark-muted)]">
                        Current plan price
                      </p>

                      <div className="mt-1 flex flex-wrap items-baseline gap-2">
                        <span className="break-words text-3xl font-semibold tracking-tight">
                          {formatPrice(plan.price)}
                        </span>

                        <span className="text-sm text-[var(--dark-muted)]">
                          {getBillingLabel(plan)}
                        </span>
                      </div>

                      <p className="mt-2 text-xs text-[#d3ad70]">
                        Database price · Preview only
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="py-4">
                    <h2 className="text-lg font-semibold">
                      {isLoadingPlans
                        ? "Loading plan..."
                        : "No plan selected"}
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-[var(--dark-muted)]">
                      {isLoadingPlans
                        ? "Fetching current plan details."
                        : "Choose an available active plan to view its price and features."}
                    </p>
                  </div>
                )}
              </div>

              <div className="p-6 sm:p-7">
                <h3 className="text-sm font-semibold">Plan includes</h3>

                {plan ? (
                  plan.features.length > 0 ? (
                    <ul className="mt-4 space-y-3">
                      {plan.features.map((feature, index) => (
                        <li
                          key={`${plan._id}-${index}`}
                          className="flex items-start gap-2.5 text-sm leading-5 text-[var(--muted)]"
                        >
                          <Check
                            size={16}
                            className="mt-0.5 shrink-0 text-[#b88b48]"
                          />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
                      No features have been added to this plan yet.
                    </p>
                  )
                ) : (
                  <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
                    Plan features will appear here when a plan is selected.
                  </p>
                )}

                <div className="mt-6 border-t border-[var(--border)] pt-5">
                  <div className="flex items-start gap-3">
                    <ShieldCheck
                      size={19}
                      className="mt-0.5 shrink-0 text-[#b88b48]"
                    />

                    <p className="text-xs leading-5 text-[var(--muted)]">
                      Payment confirmation and membership activation
                      require server-side verification. Neither is
                      performed by this preview.
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
                  <p className="text-sm font-medium">
                    Questions about a plan?
                  </p>

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
