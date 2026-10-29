
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Check,
  Crown,
  Gem,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import gsap from "gsap";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

type MembershipPlan = {
  _id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  billingType: "yearly" | "one_time";
  durationDays?: number | null;
  features: string[];
  isActive: boolean;
};

type PlansResponse = {
  success: boolean;
  data?: {
    plans?: MembershipPlan[];
  };
  message?: string;
};

const planIcons = [ShieldCheck, Crown, Gem];

function formatPrice(price: number) {
  return `৳${new Intl.NumberFormat("en-BD", {
    maximumFractionDigits: 2,
  }).format(price)}`;
}

function formatBilling(plan: MembershipPlan) {
  if (plan.billingType === "one_time") {
    return "One-time payment";
  }

  const days = plan.durationDays ?? 365;

  return days === 365 ? "Per year" : `Every ${days} days`;
}

export default function MembershipPage() {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  const pageRef = useRef<HTMLElement>(null);

  const loadPlans = useCallback(async (signal: AbortSignal) => {
    try {
      const response = await fetch(`${API_URL}/api/plans`, {
        cache: "no-store",
        signal,
      });

      const result = (await response.json()) as PlansResponse;

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to load membership plans.",
        );
      }

      setPlans(
        (result.data?.plans ?? []).filter((plan) => plan.isActive),
      );
      setError("");
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading plans.",
      );
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

 useEffect(() => {
  const controller = new AbortController();

  const timer = window.setTimeout(() => {
    void loadPlans(controller.signal);
  }, 0);

  return () => {
    window.clearTimeout(timer);
    controller.abort();
  };
}, [loadPlans, retryCount]);

  const handleRetry = () => {
    setError("");
    setLoading(true);
    setRetryCount((count) => count + 1);
  };

  useEffect(() => {
    if (loading || error || plans.length === 0) {
      return;
    }

    const context = gsap.context(() => {
      gsap.fromTo(
        "[data-membership-reveal]",
        { y: 28, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.75,
          stagger: 0.12,
          ease: "power3.out",
          clearProps: "all",
        },
      );
    }, pageRef);

    return () => context.revert();
  }, [loading, error, plans]);

  return (
    <main
      ref={pageRef}
      className="min-h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]"
    >
      <header className="border-b border-[var(--border)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:px-12">
          <Link
            href="/"
            className="text-xl font-semibold tracking-tight"
            aria-label="Membrix home"
          >
            Membrix<span className="text-[#b88b48]">®</span>
          </Link>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2.5 text-sm transition hover:border-[#b88b48] hover:text-[#b88b48]"
          >
            Dashboard
            <ArrowRight size={15} />
          </Link>
        </div>
      </header>

      <section className="relative border-b border-[var(--border)]">
        <div className="pointer-events-none absolute -right-32 -top-40 h-96 w-96 rounded-full bg-[#b88b48]/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28 lg:px-12">
          <Link
            href="/"
            className="mb-10 inline-flex items-center gap-2 text-sm text-[var(--muted)] transition hover:text-[#b88b48]"
          >
            <ArrowLeft size={15} />
            Back to home
          </Link>

          <div data-membership-reveal className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#b88b48]/30 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-[#b88b48]">
              <Sparkles size={13} />
              Membrix Membership
            </span>

            <h1 className="mt-7 text-4xl font-medium leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl">
              Membership built
              <br />
              around <span className="text-[#b88b48]">your ambition.</span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-[var(--muted)] sm:text-lg">
              Discover the membership that fits your journey. Compare
              plans, explore the benefits, and choose the level that
              works for you.
            </p>
          </div>

          <div className="mt-12 flex items-center gap-3 text-sm text-[var(--muted)]">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)]">
              <ArrowDown size={16} />
            </span>
            Explore available plans
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#b88b48]">
              Find your membership
            </p>

            <h2 className="mt-3 text-3xl font-medium tracking-tight sm:text-4xl">
              Choose your plan
            </h2>
          </div>

          {!loading && !error && plans.length > 0 && (
            <p className="text-sm text-[var(--muted)]">
              {plans.length} {plans.length === 1 ? "plan" : "plans"}{" "}
              available
            </p>
          )}
        </div>

        {loading && (
          <div className="flex min-h-64 flex-col items-center justify-center gap-4 rounded-2xl border border-[var(--border)]">
            <LoaderCircle
              className="animate-spin text-[#b88b48]"
              size={30}
            />

            <p className="text-sm text-[var(--muted)]">
              Loading membership plans...
            </p>
          </div>
        )}

        {!loading && error && (
          <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-[var(--border)] px-6 text-center">
            <p className="text-lg font-medium">
              We couldn&apos;t load the plans
            </p>

            <p className="mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
              {error} Make sure the Membrix backend is running and
              the public plans API is available.
            </p>

            <button
              type="button"
              onClick={handleRetry}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#b88b48] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#a77b3d]"
            >
              <RefreshCw size={15} />
              Try again
            </button>
          </div>
        )}

        {!loading && !error && plans.length === 0 && (
          <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#b88b48]/10 text-[#b88b48]">
              <Crown size={25} />
            </div>

            <h3 className="mt-5 text-xl font-medium">
              Membership plans are coming soon
            </h3>

            <p className="mt-3 max-w-md text-sm leading-6 text-[var(--muted)]">
              There are no active plans available right now. Please
              check back later.
            </p>

            <Link
              href="/"
              className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[#b88b48] hover:underline"
            >
              Return to home
              <ArrowRight size={15} />
            </Link>
          </div>
        )}

        {!loading && !error && plans.length > 0 && (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {plans.map((plan, index) => {
              const Icon = planIcons[index % planIcons.length];

              const featured =
                plans.length > 1 &&
                index === Math.floor(plans.length / 2);

              return (
                <article
                  key={plan._id}
                  data-membership-reveal
                  className={`relative flex flex-col rounded-2xl border p-6 transition duration-300 hover:-translate-y-1 hover:shadow-xl sm:p-8 ${
                    featured
                      ? "border-[#b88b48] bg-[#b88b48]/[0.06]"
                      : "border-[var(--border)] bg-[var(--background)]"
                  }`}
                >
                  {featured && (
                    <span className="absolute right-5 top-5 rounded-full bg-[#b88b48] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
                      Featured
                    </span>
                  )}

                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#b88b48]/30 text-[#b88b48]">
                    <Icon size={23} strokeWidth={1.6} />
                  </div>

                  <p className="mt-7 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                    Plan {String(index + 1).padStart(2, "0")}
                  </p>

                  <h3 className="mt-2 text-2xl font-medium">
                    {plan.name}
                  </h3>

                  <p className="mt-3 min-h-12 text-sm leading-6 text-[var(--muted)]">
                    {plan.description}
                  </p>

                  <div className="mt-7 border-b border-[var(--border)] pb-7">
                    <p className="text-4xl font-medium tracking-tight">
                      {formatPrice(plan.price)}
                    </p>

                    <p className="mt-2 text-sm text-[var(--muted)]">
                      {formatBilling(plan)}
                    </p>
                  </div>

                  <div className="flex-1 py-7">
                    <p className="mb-4 text-xs font-semibold uppercase tracking-[0.15em]">
                      What&apos;s included
                    </p>

                    {plan.features.length > 0 ? (
                      <ul className="space-y-3">
                        {plan.features.map((feature, featureIndex) => (
                          <li
                            key={`${plan._id}-${featureIndex}`}
                            className="flex items-start gap-3 text-sm leading-6"
                          >
                            <Check
                              size={17}
                              className="mt-0.5 shrink-0 text-[#b88b48]"
                            />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-[var(--muted)]">
                        Contact us to learn more about this plan.
                      </p>
                    )}
                  </div>

                  <Link
                    href={`/checkout?plan=${encodeURIComponent(plan.slug)}`}
                    className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-medium transition ${
                      featured
                        ? "bg-[#b88b48] text-white hover:bg-[#a77b3d]"
                        : "border border-[var(--border)] hover:border-[#b88b48] hover:text-[#b88b48]"
                    }`}
                  >
                    Choose {plan.name}
                    <ArrowRight size={16} />
                  </Link>
                </article>
              );
            })}
          </div>
        )}

        <p className="mt-8 text-center text-xs leading-5 text-[var(--muted)]">
          Prices and benefits shown here are loaded from Membrix&apos;s
          active membership plans.
        </p>
      </section>

      <footer className="border-t border-[var(--border)]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-7 text-xs text-[var(--muted)] sm:px-8 lg:px-12">
          <p>© 2026 Membrix®. All rights reserved.</p>

          <Link href="/" className="transition hover:text-[#b88b48]">
            Membrix home
          </Link>
        </div>
      </footer>
    </main>
  );
}
