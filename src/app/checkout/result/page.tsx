"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleX,
  Clock3,
  Download,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import { downloadPaymentReceipt } from "@/lib/payment-receipt";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

type ResultStatus =
  | "checking"
  | "success"
  | "pending"
  | "failed"
  | "cancelled"
  | "unknown";

type PaymentSummary = {
  id: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  transactionId: string | null;
  membershipId: string | null;
  planName: string;
  createdAt: string;
};

function PaymentResultContent() {
  const searchParams = useSearchParams();
  const rawStatus = searchParams.get("status");
  const paymentId = searchParams.get("paymentId");
  const [status, setStatus] = useState<ResultStatus>("checking");
  const [payment, setPayment] = useState<PaymentSummary | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptError, setReceiptError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function confirmPayment() {
      setPayment(null);
      setReceiptError("");
      if (rawStatus === "failed" || rawStatus === "cancelled") {
        setStatus(rawStatus);
        return;
      }
      if (rawStatus !== "success" || !paymentId) {
        setStatus("unknown");
        return;
      }

      setStatus("checking");
      try {
        const response = await fetch(`${API_URL}/api/payments/me`, {
          credentials: "include",
          cache: "no-store",
        });
        const payload: unknown = await response.json();
        if (
          !response.ok ||
          !payload ||
          typeof payload !== "object" ||
          !("success" in payload) ||
          payload.success !== true ||
          !("payments" in payload) ||
          !Array.isArray(payload.payments)
        ) {
          throw new Error("Unable to confirm payment status from your account.");
        }

        const confirmedPayment = payload.payments.find(
          (item): item is PaymentSummary =>
            Boolean(
              item &&
                typeof item === "object" &&
                "id" in item &&
                item.id === paymentId,
            ),
        );
        if (!confirmedPayment) {
          throw new Error("This payment was not found in your account.");
        }

        if (cancelled) return;
        if (confirmedPayment.status === "completed") {
          setPayment(confirmedPayment);
          setStatus("success");
        } else if (
          confirmedPayment.status === "pending" ||
          confirmedPayment.status === "processing"
        ) {
          setPayment(confirmedPayment);
          setStatus("pending");
        } else {
          setStatus("failed");
        }
      } catch {
        if (!cancelled) setStatus("unknown");
      }
    }

    void confirmPayment();
    return () => {
      cancelled = true;
    };
  }, [paymentId, rawStatus]);

  async function handleDownloadReceipt() {
    if (!payment || payment.status !== "completed" || receiptLoading) return;
    setReceiptLoading(true);
    setReceiptError("");
    try {
      await downloadPaymentReceipt(API_URL, payment.id);
    } catch (error) {
      setReceiptError(
        error instanceof Error
          ? error.message
          : "Unable to download the payment receipt.",
      );
    } finally {
      setReceiptLoading(false);
    }
  }

  async function handleDownloadSubmissionReceipt() {
    if (
      !payment ||
      payment.status !== "pending" ||
      !["bkash", "nagad", "bank"].includes(payment.method) ||
      receiptLoading
    ) {
      return;
    }
    setReceiptLoading(true);
    setReceiptError("");
    try {
      await downloadPaymentReceipt(API_URL, payment.id, "submission");
    } catch (error) {
      setReceiptError(
        error instanceof Error
          ? error.message
          : "Unable to download the submission receipt.",
      );
    } finally {
      setReceiptLoading(false);
    }
  }

  const resultContent = {
    success: {
      eyebrow: "Payment result",
      title: "Payment successful",
      description: "Your payment is confirmed as completed in your Membrix account.",
      detail: "Your official payment receipt is available to download below.",
      icon: CheckCircle2,
      iconClass: "text-emerald-600 dark:text-emerald-400",
    },
    checking: {
      eyebrow: "Verifying payment",
      title: "Checking your payment status",
      description: "We are checking the completed payment record in your Membrix account.",
      detail: "A gateway redirect by itself is not treated as payment confirmation.",
      icon: LoaderCircle,
      iconClass: "animate-spin text-[#b88b48]",
    },
    pending: {
      eyebrow: "Payment pending",
      title: "Payment is awaiting verification",
      description: "The payment has not been confirmed as completed yet.",
      detail: "Manual payments remain pending until an administrator verifies them. A submission receipt confirms only that payment information was received; it does not confirm approval or activate membership.",
      icon: Clock3,
      iconClass: "text-amber-600 dark:text-amber-400",
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
        "We couldn't verify a completed payment in your account.",
      detail:
        "Check your dashboard payment history. Contact support if your payment is missing or unclear.",
      icon: ShieldCheck,
      iconClass: "text-[#b88b48]",
    },
  }[status];

  const resultDetail =
    status === "pending" && payment?.method === "online"
      ? "The AamarPay callback has not yet been confirmed as successful by the server. Your final receipt will be available only after server-side verification completes."
      : resultContent.detail;
  const ResultIcon = resultContent.icon;
  const amountLabel = payment
    ? `${payment.currency.toUpperCase()} ${new Intl.NumberFormat("en-BD", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(payment.amount)}`
    : null;

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
                  {resultDetail}
                </p>
              </div>
            </div>

            {payment && (
              <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 text-left sm:p-5">
                <h2 className="text-sm font-semibold">Payment summary</h2>
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-[var(--muted)]">Plan</dt>
                    <dd className="mt-1 font-medium">{payment.planName}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[var(--muted)]">Amount</dt>
                    <dd className="mt-1 font-medium">{amountLabel}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[var(--muted)]">Payment method</dt>
                    <dd className="mt-1 font-medium capitalize">
                      {payment.method === "online" ? "AamarPay" : payment.method}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[var(--muted)]">Membership ID</dt>
                    <dd className="mt-1 font-medium">{payment.membershipId ?? "—"}</dd>
                  </div>
                  {payment.transactionId && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs text-[var(--muted)]">Transaction ID</dt>
                      <dd className="mt-1 break-all font-medium">{payment.transactionId}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}

            {receiptError && (
              <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-300">
                {receiptError}
              </p>
            )}

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              {status === "success" && payment?.status === "completed" && (
                <button
                  type="button"
                  disabled={receiptLoading}
                  onClick={() => void handleDownloadReceipt()}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[var(--gold)] px-6 py-3 text-sm font-semibold transition hover:bg-[var(--background)] disabled:opacity-60"
                >
                  {receiptLoading ? (
                    <LoaderCircle size={17} className="animate-spin" />
                  ) : (
                    <Download size={17} />
                  )}
                  {receiptLoading ? "Preparing receipt..." : "Download Final Receipt"}
                </button>
              )}
              {status === "pending" &&
                payment?.status === "pending" &&
                ["bkash", "nagad", "bank"].includes(payment.method) && (
                  <button
                    type="button"
                    disabled={receiptLoading}
                    onClick={() => void handleDownloadSubmissionReceipt()}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[var(--gold)] px-6 py-3 text-sm font-semibold transition hover:bg-[var(--background)] disabled:opacity-60"
                  >
                    {receiptLoading ? (
                      <LoaderCircle size={17} className="animate-spin" />
                    ) : (
                      <Download size={17} />
                    )}
                    {receiptLoading
                      ? "Preparing receipt..."
                      : "Download Submission Receipt"}
                  </button>
                )}
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