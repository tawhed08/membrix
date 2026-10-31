
"use client";

import {
  Suspense,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import gsap from "gsap";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Clock3,
  CreditCard,
  LoaderCircle,
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
type NoticeType = "success" | "error" | "info";

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

type ApiResponse = {
  success: boolean;
  message?: string;
  data?: {
    plans?: MembershipPlan[];
    paymentId?: string;
    membershipId?: string;
    status?: string;
  };
  payment?: {
    id?: string;
    membershipId?: string;
    transactionId?: string;
    status?: string;
    amount?: number;
    currency?: string;
    method?: string;
  };
  paymentUrl?: string;
  transactionId?: string;
};

type SubmissionDetails = {
  transactionId: string;
  paymentId?: string;
  membershipId?: string;
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
    description: "Secure AamarPay checkout",
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

async function readApiResponse(
  response: Response,
): Promise<ApiResponse> {
  try {
    const result: unknown = await response.json();

    if (
      !result ||
      typeof result !== "object" ||
      !("success" in result) ||
      typeof result.success !== "boolean"
    ) {
      return {
        success: false,
        message: "The server returned an unexpected response.",
      };
    }

    return result as ApiResponse;
  } catch {
    return {
      success: false,
      message: "The server returned an invalid response. Please try again.",
    };
  }
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
  const [noticeType, setNoticeType] = useState<NoticeType>("info");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionDetails, setSubmissionDetails] =
    useState<SubmissionDetails | null>(null);

  const effectivePlanSlug =
    selectedPlanSlug || plans[0]?.slug || "";

  const plan = plans.find(
    (item) => item.slug === effectivePlanSlug,
  );

  const isManualPayment = paymentMethod !== "online";

  // Load active membership plans from the backend.
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

        const result = await readApiResponse(response);

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Unable to load membership plans.",
          );
        }

        if (!Array.isArray(result.data?.plans)) {
          throw new Error(
            "The plans response has an unexpected format.",
          );
        }

        const activePlans = result.data.plans.filter(
          (item) =>
            item &&
            typeof item._id === "string" &&
            typeof item.name === "string" &&
            typeof item.slug === "string" &&
            item.slug.length > 0 &&
            typeof item.description === "string" &&
            typeof item.price === "number" &&
            Number.isFinite(item.price) &&
            item.price >= 0 &&
            (item.billingType === "yearly" ||
              item.billingType === "one_time") &&
            item.isActive === true &&
            Array.isArray(item.features),
        );

        setPlans(activePlans);

        setSelectedPlanSlug((current) => {
          if (current) {
            return current;
          }

          return activePlans[0]?.slug || "";
        });
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

  // GSAP checkout page animations.
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

  function showNotice(type: NoticeType, message: string) {
    setNoticeType(type);
    setNotice(message);
  }

  function handlePlanChange(slug: string) {
    setSelectedPlanSlug(slug);
    setNotice("");
    setSubmissionDetails(null);
  }

  function handlePaymentMethodChange(method: PaymentMethod) {
    setPaymentMethod(method);
    setNotice("");
    setSubmissionDetails(null);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (isSubmitting) return;

    if (isLoadingPlans || plansError || !plan) {
      showNotice(
        "error",
        "Please select an available membership plan first.",
      );
      return;
    }

    if (!plan.isActive) {
      showNotice(
        "error",
        "This membership plan is no longer available.",
      );
      return;
    }

    const cleanTransactionId = transactionId.trim();
    const cleanPayerNumber = payerNumber.trim();

    if (isManualPayment) {
      if (
        cleanTransactionId.length < 3 ||
        cleanTransactionId.length > 120
      ) {
        showNotice(
          "error",
          "Please enter a valid transaction ID (3–120 characters).",
        );
        return;
      }

      if (cleanPayerNumber.length > 30) {
        showNotice(
          "error",
          "Payer number must not exceed 30 characters.",
        );
        return;
      }
    }

    setIsSubmitting(true);
    setNotice("");
    setSubmissionDetails(null);

    try {
      // AamarPay online payment initialization.
      if (paymentMethod === "online") {
        const response = await fetch(
          `${API_URL}/api/payments/aamarpay/initiate`,
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              planSlug: plan.slug,
            }),
          },
        );

        const result = await readApiResponse(response);

        if (!response.ok || !result.success) {
          throw new Error(
            result.message ||
              "Unable to initialize online payment. Please try again.",
          );
        }

        if (
          typeof result.paymentUrl !== "string" ||
          !result.paymentUrl
        ) {
          throw new Error(
            "The payment gateway did not return a valid payment URL.",
          );
        }

        let paymentUrl: URL;

        try {
          paymentUrl = new URL(result.paymentUrl);
        } catch {
          throw new Error("The payment gateway URL is invalid.");
        }

        // Only allow the configured AamarPay sandbox hostname.
        if (
          paymentUrl.protocol !== "https:" ||
          paymentUrl.hostname !== "sandbox.aamarpay.com"
        ) {
          throw new Error(
            "The payment gateway URL is not an approved sandbox address.",
          );
        }

        window.location.assign(paymentUrl.toString());
        return;
      }

      // Manual bKash, Nagad or bank transfer submission.
      const response = await fetch(
        `${API_URL}/api/payments/manual/submit`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            planSlug: plan.slug,
            method: paymentMethod,
            transactionId: cleanTransactionId,
            payerNumber: cleanPayerNumber,
          }),
        },
      );

      const result = await readApiResponse(response);

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Unable to submit your payment. Please try again.",
        );
      }

     setSubmissionDetails({
  transactionId:
    result.payment?.transactionId || transactionId.trim(),
  paymentId: result.payment?.id || result.data?.paymentId,
  membershipId:
    result.payment?.membershipId || result.data?.membershipId,
});

      setTransactionId("");
      setPayerNumber("");

      showNotice(
        "success",
        result.message ||
          "Your payment information has been submitted successfully. Your membership will remain pending until an administrator verifies your payment.",
      );
    } catch (error) {
      showNotice(
        "error",
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main
      ref={pageRef}
      className="min-h-screen bg-[var(--background)] text-[var(--foreground)]"
    >
      {/* Header */}
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
            <span className="hidden sm:inline">
              Membership plans
            </span>
            <span className="sm:hidden">Plans</span>
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
        {/* Page introduction */}
        <div data-checkout-animate className="mb-9 max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#b88b48]/30 bg-[#b88b48]/10 px-3 py-1.5 text-xs font-medium text-[#b88b48]">
            <LockKeyhole size={14} />
            Secure membership checkout
          </div>

          <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
            Complete your{" "}
            <span className="text-[#b88b48]">membership.</span>
          </h1>

          <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--muted)] sm:text-base">
            Select your membership plan and preferred payment method
            to continue your Membrix registration.
          </p>
        </div>

        {/* Payment security notice */}
        <div className="mb-8 flex items-start gap-3 rounded-2xl border border-[#b88b48]/30 bg-[#b88b48]/10 p-4 sm:p-5">
          <ShieldCheck
            size={21}
            className="mt-0.5 shrink-0 text-[#b88b48]"
          />

          <div>
            <p className="text-sm font-semibold">
              Secure payment processing
            </p>

            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
              Online payments are currently configured for AamarPay
              sandbox testing. Manual payments require administrator
              verification before membership activation. Do not send
              money until official payment instructions are provided.
            </p>
          </div>
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-[1fr_360px]">
          {/* Checkout form */}
          <form
            onSubmit={handleSubmit}
            className="min-w-0 space-y-8"
          >
            {/* Membership selection */}
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
                    Choose an active plan to continue.
                  </p>
                </div>
              </div>

              {isLoadingPlans ? (
                <div
                  className="rounded-2xl border border-[var(--border)] p-6 text-sm text-[var(--muted)]"
                  role="status"
                >
                  <span className="inline-flex items-center gap-2">
                    <LoaderCircle
                      size={16}
                      className="animate-spin"
                    />
                    Loading membership plans...
                  </span>
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
                      const isSelected =
                        effectivePlanSlug === item.slug;

                      return (
                        <button
                          key={item._id}
                          type="button"
                          disabled={isSubmitting}
                          onClick={() =>
                            handlePlanChange(item.slug)
                          }
                          aria-pressed={isSelected}
                          className={`relative rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
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
                            Current database price
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

            {/* Payment method */}
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
                    Select how you want to pay for your membership.
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
                      disabled={isSubmitting}
                      onClick={() =>
                        handlePaymentMethodChange(method.id)
                      }
                      aria-pressed={isSelected}
                      className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        isSelected
                          ? "border-[#b88b48] bg-[#b88b48]/10"
                          : "border-[var(--border)] hover:border-[#b88b48]/60"
                      }`}
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-alt)]">
                        <Icon
                          size={20}
                          className="text-[#b88b48]"
                        />
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

              {/* Manual payment fields */}
              {isManualPayment ? (
                <div className="mt-6 space-y-5 border-t border-[var(--border)] pt-6">
                  <div>
                    <h3 className="text-sm font-semibold">
                      Manual payment details
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                      Submit your transaction reference for
                      administrator review. Official recipient account
                      instructions must be provided by Membrix before
                      you transfer any money.
                    </p>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium">
                        Transaction ID
                        <span className="ml-1 text-xs text-red-500">
                          *
                        </span>
                      </span>

                      <input
                        value={transactionId}
                        onChange={(event) => {
                          setTransactionId(event.target.value);
                          setNotice("");
                          setSubmissionDetails(null);
                        }}
                        disabled={isSubmitting}
                        required
                        minLength={3}
                        maxLength={120}
                        placeholder="Enter your transaction ID"
                        autoComplete="off"
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none transition placeholder:text-[var(--muted)] focus:border-[#b88b48] focus:ring-2 focus:ring-[#b88b48]/15 disabled:opacity-60"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium">
                        Payer number
                        <span className="ml-1 text-xs text-[var(--muted)]">
                          (optional)
                        </span>
                      </span>

                      <input
                        value={payerNumber}
                        onChange={(event) => {
                          setPayerNumber(event.target.value);
                          setNotice("");
                          setSubmissionDetails(null);
                        }}
                        disabled={isSubmitting}
                        maxLength={30}
                        placeholder="Example: 01XXXXXXXXX"
                        autoComplete="tel"
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none transition placeholder:text-[var(--muted)] focus:border-[#b88b48] focus:ring-2 focus:ring-[#b88b48]/15 disabled:opacity-60"
                      />
                    </label>
                  </div>

                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
                    <div className="flex items-start gap-3">
                      <ShieldCheck
                        size={19}
                        className="mt-0.5 shrink-0 text-[#b88b48]"
                      />

                      <div>
                        <p className="text-sm font-semibold">
                          Payment account instructions
                        </p>

                        <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                          Recipient account details have not yet been
                          configured in this checkout. Do not transfer
                          funds until the official Membrix payment
                          instructions are available.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Online gateway information */
                <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
                  <div className="flex items-start gap-3">
                    <CreditCard
                      size={20}
                      className="mt-0.5 shrink-0 text-[#b88b48]"
                    />

                    <div>
                      <h3 className="text-sm font-semibold">
                        AamarPay online checkout
                      </h3>

                      <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                        You will be redirected to the AamarPay sandbox
                        payment page. The backend will verify the
                        transaction before activating your membership.
                      </p>

                      <span className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#b88b48]/30 bg-[#b88b48]/10 px-3 py-1.5 text-xs font-medium text-[#b88b48]">
                        <LockKeyhole size={13} />
                        Sandbox testing mode
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Submission notice */}
            {notice && (
              <div
                role={noticeType === "error" ? "alert" : "status"}
                aria-live="polite"
                className={`flex items-start gap-3 rounded-2xl border p-4 text-sm leading-6 ${
                  noticeType === "error"
                    ? "border-red-500/30 bg-red-500/5 text-red-600 dark:text-red-300"
                    : noticeType === "success"
                      ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300"
                      : "border-[#b88b48]/30 bg-[#b88b48]/10 text-[var(--foreground)]"
                }`}
              >
                {noticeType === "error" ? (
                  <X
                    size={19}
                    className="mt-0.5 shrink-0"
                  />
                ) : noticeType === "success" ? (
                  <CheckCircle2
                    size={19}
                    className="mt-0.5 shrink-0"
                  />
                ) : (
                  <ShieldCheck
                    size={19}
                    className="mt-0.5 shrink-0"
                  />
                )}

                <p>{notice}</p>
              </div>
            )}

            {/* Manual payment confirmation */}
            {submissionDetails && (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                    <Clock3 size={20} />
                  </span>

                  <div>
                    <h3 className="text-sm font-semibold">
                      Payment submitted successfully
                    </h3>

                    <p className="mt-1 text-xs text-[var(--muted)]">
                      <span className="font-semibold text-amber-600">
                        Pending admin review
                      </span>
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-3 border-t border-emerald-500/20 pt-4 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[var(--muted)]">
                      Transaction ID
                    </span>

                    <span className="break-all text-right font-medium">
                      {submissionDetails.transactionId}
                    </span>
                  </div>

                  {submissionDetails.paymentId && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[var(--muted)]">
                        Payment reference
                      </span>

                      <span className="break-all text-right font-medium">
                        {submissionDetails.paymentId}
                      </span>
                    </div>
                  )}

                  {submissionDetails.membershipId && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[var(--muted)]">
                        Membership reference
                      </span>

                      <span className="break-all text-right font-medium">
                        {submissionDetails.membershipId}
                      </span>
                    </div>
                  )}
                </div>

                <p className="mt-4 text-xs leading-5 text-[var(--muted)]">
                  Your membership is not active yet. It will be
                  activated only after the administrator approves
                  the submitted payment.
                </p>

                <Link
                  href="/dashboard"
                  className="mt-5 inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 px-4 py-2.5 text-sm font-medium transition hover:bg-emerald-500/10"
                >
                  Go to dashboard
                  <ArrowRight size={15} />
                </Link>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={
                isLoadingPlans ||
                Boolean(plansError) ||
                !plan ||
                isSubmitting
              }
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#b88b48] px-5 py-4 text-sm font-semibold text-[#1d160c] transition hover:bg-[#c99b59] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b88b48] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-64"
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle
                    size={17}
                    className="animate-spin"
                  />
                  {paymentMethod === "online"
                    ? "Connecting to gateway..."
                    : "Submitting payment..."}
                </>
              ) : (
                <>
                  {paymentMethod === "online"
                    ? "Continue to AamarPay"
                    : "Submit for admin review"}

                  <ArrowRight size={17} />
                </>
              )}
            </button>

            <p className="text-xs leading-5 text-[var(--muted)]">
              {paymentMethod === "online"
                ? "You will continue to the AamarPay sandbox. Membership activation requires successful server-side payment verification."
                : "Your payment submission will remain pending until an administrator verifies and approves it."}
            </p>
          </form>

          {/* Order summary */}
          <aside
            data-checkout-animate
            className="space-y-5 lg:sticky lg:top-8"
          >
            <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)]">
              <div className="bg-[var(--dark-panel)] p-6 text-[var(--dark-text)] sm:p-7">
                <div className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-[var(--dark-muted)]">
                  <Sparkles
                    size={14}
                    className="text-[#d3ad70]"
                  />
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
                        Current database price
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
                <h3 className="text-sm font-semibold">
                  Plan includes
                </h3>

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
                      are controlled by the backend. Manual payments
                      require administrator approval.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact card */}
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
          Loading checkout...
        </main>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
