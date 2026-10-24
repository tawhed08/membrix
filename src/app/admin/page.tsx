"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  RefreshCw,
  ShieldCheck,
  Users,
  Wallet,
  X,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "member" | "admin";
  isActive: boolean;
};

type AuthResponse = {
  success: boolean;
  message?: string;
  user?: AdminUser;
};

type PaymentStatus =
  | "pending"
  | "processing"
  | "completed"
  | "rejected"
  | "failed"
  | "refunded";

type PaymentMethod = "bkash" | "nagad" | "bank" | "online";

type PopulatedUser = {
  name?: string;
  email?: string;
};

type PopulatedPlan = {
  name?: string;
  slug?: string;
};

type RecentPayment = {
  _id: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId: string | null;
  gatewayTransactionId: string | null;
  createdAt: string;
  user: PopulatedUser | string | null;
  plan: PopulatedPlan | string | null;
};

type AdminOverview = {
  totalMembers: number;
  activeMemberships: number;
  pendingPayments: number;
  processingPayments: number;
  totalRevenue: number;
  completedPayments: number;
  currency: string;
  recentPayments: RecentPayment[];
};

type OverviewResponse = {
  success: boolean;
  message?: string;
  data?: AdminOverview;
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-BD").format(value);
}

function formatMoney(amount: number): string {
  return `৳${formatNumber(amount)}`;
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-BD", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "AD";
  }

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function getMemberName(user: RecentPayment["user"]): string {
  if (user && typeof user === "object") {
    return user.name || user.email || "Unknown member";
  }

  return "Unknown member";
}

function getMemberEmail(user: RecentPayment["user"]): string {
  if (user && typeof user === "object") {
    return user.email || "";
  }

  return "";
}

function getPlanName(plan: RecentPayment["plan"]): string {
  if (plan && typeof plan === "object") {
    return plan.name || "Membership plan";
  }

  return "Membership plan";
}

function getMethodName(method: PaymentMethod): string {
  switch (method) {
    case "bkash":
      return "bKash";
    case "nagad":
      return "Nagad";
    case "bank":
      return "Bank transfer";
    case "online":
      return "Online gateway";
  }
}

function getStatusClass(status: PaymentStatus): string {
  switch (status) {
    case "completed":
      return "bg-emerald-500/10 text-emerald-600 ring-1 ring-inset ring-emerald-500/20";
    case "pending":
      return "bg-amber-500/10 text-amber-600 ring-1 ring-inset ring-amber-500/20";
    case "processing":
      return "bg-sky-500/10 text-sky-600 ring-1 ring-inset ring-sky-500/20";
    case "rejected":
    case "failed":
      return "bg-red-500/10 text-red-600 ring-1 ring-inset ring-red-500/20";
    case "refunded":
      return "bg-violet-500/10 text-violet-600 ring-1 ring-inset ring-violet-500/20";
  }
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  accent,
  href,
}: {
  title: string;
  value: string;
  description: string;
  icon: typeof Users;
  accent: "gold" | "teal" | "blue" | "violet";
  href?: string;
}) {
  const accentClasses = {
    gold: "bg-[#d6b878]/15 text-[#a98843]",
    teal: "bg-teal-500/10 text-teal-600",
    blue: "bg-sky-500/10 text-sky-600",
    violet: "bg-violet-500/10 text-violet-600",
  };

  const cardContent = (
    <article className="admin-reveal group min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#d6b878]/50 hover:shadow-xl hover:shadow-black/[0.035] sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--muted)]">
            {title}
          </p>

          <p className="mt-3 break-words text-2xl font-semibold tracking-tight sm:text-[30px]">
            {value}
          </p>
        </div>

        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105 ${accentClasses[accent]}`}
        >
          <Icon size={21} strokeWidth={1.8} />
        </span>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-[var(--border)] pt-4 text-xs text-[var(--muted)]">
        <p className="leading-5">{description}</p>
        {href && (
          <span className="ml-2 inline-flex shrink-0 items-center gap-1 font-medium text-[#b99a5b] opacity-0 transition-opacity group-hover:opacity-100">
            View <ArrowRight size={12} />
          </span>
        )}
      </div>
    </article>
  );

  return href ? (
    <Link href={href} className="block focus:outline-none">
      {cardContent}
    </Link>
  ) : (
    cardContent
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.19em] text-[#b99a5b]">
        {eyebrow}
      </p>

      <h2 className="text-lg font-semibold tracking-tight">
        {title}
      </h2>

      <p className="mt-1.5 text-sm leading-6 text-[var(--muted)]">
        {description}
      </p>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const pageRef = useRef<HTMLDivElement>(null);

  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [error, setError] = useState("");

  const loadOverview = useCallback(async () => {
    setError("");

    try {
      const authResponse = await fetch(`${API_URL}/api/auth/me`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (authResponse.status === 401) {
        router.replace("/login");
        return;
      }

      const authData = (await authResponse.json()) as AuthResponse;

      if (!authResponse.ok || !authData.success || !authData.user) {
        throw new Error(
          authData.message || "Unable to verify your account.",
        );
      }

      if (authData.user.role !== "admin") {
        router.replace("/dashboard");
        return;
      }

      setAdmin(authData.user);

      const response = await fetch(`${API_URL}/api/admin/overview`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      const result = (await response.json()) as OverviewResponse;

      if (response.status === 403) {
        throw new Error(
          "Your account does not have admin permission.",
        );
      }

      if (!response.ok || !result.success || !result.data) {
        throw new Error(
          result.message || "Unable to load admin statistics.",
        );
      }

      setOverview(result.data);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect to the Membrix API.",
      );
    }
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    async function initialise() {
      try {
        await loadOverview();
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void initialise();

    return () => {
      cancelled = true;
    };
  }, [loadOverview]);

  useEffect(() => {
    const element = pageRef.current;

    if (!element || loading || error) {
      return;
    }

    const context = gsap.context(() => {
      gsap.fromTo(
        ".admin-reveal",
        { y: 14, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          stagger: 0.045,
          ease: "power2.out",
          clearProps: "transform",
        },
      );
    }, element);

    return () => context.revert();
  }, [loading, error, overview]);

  async function handleRefresh() {
    if (refreshing || loading) {
      return;
    }

    setRefreshing(true);

    try {
      await loadOverview();
    } finally {
      setRefreshing(false);
    }
  }

  async function handleLogout() {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        setError("Logout could not be confirmed. Please try again.");
        setLoggingOut(false);
        return;
      }
    } catch {
      setError("Unable to contact the server to sign out.");
      setLoggingOut(false);
      return;
    }

    router.replace("/login");
    router.refresh();
  }

  const stats = overview
    ? [
        {
          title: "Total members",
          value: formatNumber(overview.totalMembers),
          description: "Registered member accounts",
          icon: Users,
          accent: "gold" as const,
          href: "/admin/members",
        },
        {
          title: "Active memberships",
          value: formatNumber(overview.activeMemberships),
          description: "Memberships currently active",
          icon: BadgeCheck,
          accent: "teal" as const,
          href: "/admin/members?status=active",
        },
        {
          title: "Pending payments",
          value: formatNumber(overview.pendingPayments),
          description: "Awaiting admin verification",
          icon: Clock3,
          accent: "blue" as const,
          href: "/admin/payments?status=pending",
        },
        {
          title: "Processing payments",
          value: formatNumber(overview.processingPayments),
          description: "Transactions being processed",
          icon: Activity,
          accent: "teal" as const,
          href: "/admin/payments?status=processing",
        },
        {
          title: "Completed payments",
          value: formatNumber(overview.completedPayments),
          description: "Confirmed successful payments",
          icon: CheckCircle2,
          accent: "gold" as const,
          href: "/admin/payments?status=completed",
        },
        {
          title: "Total revenue",
          value: formatMoney(overview.totalRevenue),
          description: "Completed BDT payments only",
          icon: Wallet,
          accent: "violet" as const,
          href: "/admin/payments",
        },
      ]
    : [];

  return (
    <main
      ref={pageRef}
      className="min-h-screen bg-[var(--background)] text-[var(--foreground)]"
    >
      <div className="mx-auto flex min-h-screen max-w-[1920px]">
        {/* Desktop sidebar */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-[258px] flex-col bg-[#102b46] text-white lg:flex">
          <div className="border-b border-white/10 px-6 py-6">
            <Link href="/admin" className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#d6b878]/25 bg-[#d6b878]/10 text-[#e6ca8b]">
                <Building2 size={21} strokeWidth={1.7} />
              </span>

              <span>
                <span className="block text-xl font-semibold tracking-tight">
                  Membrix<span className="text-[#d6b878]">.</span>
                </span>
                <span className="mt-0.5 block text-[10px] uppercase tracking-[0.18em] text-white/45">
                  Management suite
                </span>
              </span>
            </Link>
          </div>

          <div className="px-4 pt-7">
            <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">
              Workspace
            </p>

            <nav className="space-y-1">
              <Link
                href="/admin"
                aria-current="page"
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/10 px-3.5 py-3 text-sm font-medium text-white"
              >
                <LayoutDashboard size={18} className="text-[#e6ca8b]" />
                <span>Overview</span>
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#e6ca8b]" />
              </Link>

              <Link
                href="/admin/members"
                className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm text-white/65 transition hover:bg-white/5 hover:text-white"
              >
                <Users size={18} />
                <span>Members</span>
              </Link>

              <Link
                href="/admin/payments"
                className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm text-white/65 transition hover:bg-white/5 hover:text-white"
              >
                <Wallet size={18} />
                <span>Payments</span>
                {overview && overview.pendingPayments > 0 && (
                  <span className="ml-auto rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                    {overview.pendingPayments}
                  </span>
                )}
              </Link>
            </nav>
          </div>

          <div className="px-4 pt-8">
            <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">
              Quick links
            </p>

            <Link
              href="/"
              className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm text-white/65 transition hover:bg-white/5 hover:text-white"
            >
              <ArrowLeft size={16} />
              <span>Back to website</span>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="mt-1 flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm text-white/65 transition hover:bg-rose-500/10 hover:text-rose-200 disabled:opacity-60"
            >
              <LogOut size={16} />
              <span>{loggingOut ? "Signing out..." : "Sign out"}</span>
            </button>
          </div>

          <div className="mt-auto p-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d6b878]/10 text-[#e6ca8b]">
                <ShieldCheck size={18} />
              </span>

              <p className="mt-3 text-sm font-medium">
                Protected workspace
              </p>

              <p className="mt-1.5 text-xs leading-5 text-white/45">
                Admin permissions are verified by the backend on each
                dashboard request.
              </p>

              <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-3 text-[10px] font-medium uppercase tracking-[0.14em] text-emerald-300/80">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Secure session
              </div>
            </div>

            <p className="px-3 pb-1 pt-5 text-[10px] text-white/30">
              MEMBRIX ADMINISTRATION
            </p>
          </div>
        </aside>

        {/* Main content */}
        <div className="min-w-0 flex-1 lg:ml-[258px]">
          <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-xl">
            <div className="flex h-[76px] items-center justify-between gap-4 px-5 sm:px-8 xl:px-10">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  aria-label="Open navigation menu"
                  onClick={() => setMobileMenuOpen(true)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] lg:hidden"
                >
                  <Menu size={19} />
                </button>

                <div className="min-w-0">
                  <p className="truncate text-xs text-[var(--muted)]">
                    Membrix / Administration
                  </p>
                  <p className="mt-1 truncate text-sm font-semibold">
                    Overview workspace
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-semibold">
                    {admin?.name || "Administrator"}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">
                    Administrator
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d6b878]/30 bg-[#d6b878]/15 text-sm font-semibold text-[#a98843]">
                  {getInitials(admin?.name || "Admin")}
                </div>

                <button
                  type="button"
                  aria-label="Sign out"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="hidden h-10 items-center gap-2 rounded-xl border border-[var(--border)] px-3 text-sm transition hover:bg-[var(--surface)] disabled:opacity-60 md:flex"
                >
                  <LogOut size={16} />
                  <span>{loggingOut ? "Signing out..." : "Sign out"}</span>
                </button>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[1600px] px-5 py-7 sm:px-8 sm:py-9 xl:px-10">
            <section className="admin-reveal mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#d6b878]/25 bg-[#d6b878]/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#a98843]">
                  <Activity size={13} />
                  Admin workspace
                </div>

                <h1 className="text-3xl font-semibold tracking-tight sm:text-[38px]">
                  Welcome back
                  {admin?.name ? `, ${admin.name.split(" ")[0]}` : ""}
                </h1>

                <p className="mt-2.5 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                  Live membership statistics, financial analytics, and
                  management shortcuts from your database.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="hidden items-center gap-2 rounded-xl border border-[var(--border)] px-3.5 py-2.5 text-xs text-[var(--muted)] md:flex">
                  <CalendarDays size={15} />
                  Live overview
                </div>

                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={refreshing || loading}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-medium transition hover:border-[#d6b878]/60 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw
                    size={15}
                    className={refreshing ? "animate-spin" : ""}
                  />
                  Refresh
                </button>
              </div>
            </section>

            {/* Quick action shortcuts */}
            <section className="admin-reveal mb-8 flex flex-wrap items-center gap-3">
              <Link
                href="/admin/members"
                className="inline-flex items-center gap-2 rounded-xl bg-[#102b46] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#183c5e]"
              >
                <Users size={16} className="text-[#d6b878]" />
                Manage members
                <ArrowRight size={14} />
              </Link>

              <Link
                href="/admin/payments"
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] transition hover:border-[#d6b878]/60 hover:text-[#a98843]"
              >
                <Wallet size={16} />
                Manage payments
                <ArrowRight size={14} />
              </Link>
            </section>

            {loading ? (
              <div className="flex min-h-[350px] flex-col items-center justify-center gap-3">
                <RefreshCw
                  size={26}
                  className="animate-spin text-[#b99a5b]"
                />
                <p className="text-sm text-[var(--muted)]">
                  Loading your admin overview...
                </p>
              </div>
            ) : error ? (
              <section className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 sm:p-8">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
                  <AlertCircle size={23} />
                </span>

                <h2 className="mt-4 text-lg font-semibold">
                  Unable to load your overview
                </h2>

                <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#102b46] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
                >
                  <RefreshCw size={15} />
                  Try again
                </button>
              </section>
            ) : overview ? (
              <>
                <section>
                  <SectionHeading
                    eyebrow="Membership analytics"
                    title="Your community at a glance"
                    description="Key figures derived directly from current MongoDB membership and payment records."
                  />

                  <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {stats.map((stat) => (
                      <StatCard key={stat.title} {...stat} />
                    ))}
                  </div>
                </section>

                <section className="mt-10">
                  <SectionHeading
                    eyebrow="Financial activity"
                    title="Payment overview"
                    description="Monitor confirmed payments and transactions that need review."
                  />

                  <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-3">
                    <article className="admin-reveal relative overflow-hidden rounded-2xl bg-[#102b46] p-6 text-white sm:p-7 xl:col-span-2">
                      <div className="pointer-events-none absolute -right-12 -top-24 h-64 w-64 rounded-full border border-white/[0.07]" />
                      <div className="pointer-events-none absolute -right-1 -top-16 h-44 w-44 rounded-full border border-white/[0.07]" />
                      <div className="pointer-events-none absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-[#d6b878]/10 blur-3xl" />

                      <div className="relative">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <p className="text-sm text-white/60">
                              Confirmed revenue
                            </p>
                            <p className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                              {formatMoney(overview.totalRevenue)}
                            </p>
                            <p className="mt-2 text-xs leading-5 text-white/50">
                              Total sum of payments marked completed in BDT.
                            </p>
                          </div>

                          <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#d6b878]/20 bg-[#d6b878]/10 text-[#e6ca8b]">
                            <Wallet size={23} strokeWidth={1.7} />
                          </span>
                        </div>

                        <div className="mt-7 grid grid-cols-1 gap-3 border-t border-white/10 pt-5 sm:grid-cols-2">
                          <Link
                            href="/admin/payments?status=completed"
                            className="group flex items-center gap-3 rounded-xl p-2 transition hover:bg-white/5"
                          >
                            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300">
                              <CheckCircle2 size={18} />
                            </span>

                            <div>
                              <p className="text-lg font-semibold group-hover:text-[#e6ca8b]">
                                {formatNumber(overview.completedPayments)}
                              </p>
                              <p className="mt-0.5 text-xs text-white/50">
                                Completed payments
                              </p>
                            </div>
                          </Link>

                          <Link
                            href="/admin/payments?status=pending"
                            className="group flex items-center gap-3 rounded-xl p-2 transition hover:bg-white/5"
                          >
                            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-400/10 text-amber-300">
                              <Clock3 size={18} />
                            </span>

                            <div>
                              <p className="text-lg font-semibold group-hover:text-[#e6ca8b]">
                                {formatNumber(
                                  overview.pendingPayments +
                                    overview.processingPayments,
                                )}
                              </p>
                              <p className="mt-0.5 text-xs text-white/50">
                                Pending and processing
                              </p>
                            </div>
                          </Link>
                        </div>
                      </div>
                    </article>

                    <article className="admin-reveal rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-7">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm text-[var(--muted)]">
                            Needs attention
                          </p>
                          <p className="mt-2 text-3xl font-semibold tracking-tight">
                            {formatNumber(
                              overview.pendingPayments +
                                overview.processingPayments,
                            )}
                          </p>
                        </div>

                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                          <Clock3 size={21} />
                        </span>
                      </div>

                      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                        Payments currently pending review or processing.
                      </p>

                      <div className="mt-6 space-y-4 border-t border-[var(--border)] pt-5">
                        <Link
                          href="/admin/payments?status=pending"
                          className="flex items-center justify-between gap-3 text-sm transition hover:text-[#a98843]"
                        >
                          <span className="flex items-center gap-2 text-[var(--muted)]">
                            <span className="h-2 w-2 rounded-full bg-amber-500" />
                            Pending review
                          </span>
                          <span className="font-semibold">
                            {formatNumber(overview.pendingPayments)}
                          </span>
                        </Link>

                        <Link
                          href="/admin/payments?status=processing"
                          className="flex items-center justify-between gap-3 text-sm transition hover:text-[#a98843]"
                        >
                          <span className="flex items-center gap-2 text-[var(--muted)]">
                            <span className="h-2 w-2 rounded-full bg-sky-500" />
                            Processing
                          </span>
                          <span className="font-semibold">
                            {formatNumber(overview.processingPayments)}
                          </span>
                        </Link>
                      </div>
                    </article>
                  </div>
                </section>

                <section className="admin-reveal mt-10 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
                  <div className="flex flex-col justify-between gap-4 border-b border-[var(--border)] p-5 sm:flex-row sm:items-center sm:p-6">
                    <div>
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#b99a5b]">
                        Latest activity
                      </p>

                      <h2 className="text-lg font-semibold tracking-tight">
                        Recent payments
                      </h2>

                      <p className="mt-1.5 text-sm text-[var(--muted)]">
                        The latest payment records received by Membrix.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <span className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3.5 py-2 text-xs text-[var(--muted)]">
                        <CreditCard size={15} />
                        {overview.recentPayments.length} records
                      </span>

                      <Link
                        href="/admin/payments"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 py-2 text-xs font-semibold text-[var(--foreground)] transition hover:border-[#d6b878]/60 hover:text-[#a98843]"
                      >
                        View all payments
                        <ArrowRight size={13} />
                      </Link>
                    </div>
                  </div>

                  {overview.recentPayments.length === 0 ? (
                    <div className="flex min-h-[240px] flex-col items-center justify-center px-5 py-12 text-center">
                      <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--background)] text-[var(--muted)]">
                        <CreditCard size={24} strokeWidth={1.6} />
                      </span>

                      <h3 className="mt-4 text-sm font-semibold">
                        No payment records yet
                      </h3>

                      <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">
                        Once payments are created and saved by the backend,
                        the latest transactions will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[760px] text-left text-sm">
                        <thead className="border-b border-[var(--border)] bg-[var(--background)]/70 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                          <tr>
                            <th className="px-5 py-4 font-medium">Member</th>
                            <th className="px-5 py-4 font-medium">Plan</th>
                            <th className="px-5 py-4 font-medium">Method</th>
                            <th className="px-5 py-4 font-medium">Amount</th>
                            <th className="px-5 py-4 font-medium">Status</th>
                            <th className="px-5 py-4 font-medium">Date</th>
                            <th className="px-5 py-4 text-right font-medium">Action</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-[var(--border)]">
                          {overview.recentPayments.map((payment) => (
                            <tr
                              key={payment._id}
                              className="transition-colors hover:bg-[var(--background)]/70"
                            >
                              <td className="px-5 py-4">
                                <div className="font-medium">
                                  {getMemberName(payment.user)}
                                </div>

                                <div className="mt-1 text-xs text-[var(--muted)]">
                                  {getMemberEmail(payment.user) || "—"}
                                </div>
                              </td>

                              <td className="px-5 py-4">
                                {getPlanName(payment.plan)}
                              </td>

                              <td className="px-5 py-4">
                                {getMethodName(payment.method)}
                              </td>

                              <td className="px-5 py-4 font-semibold tabular-nums">
                                {formatMoney(payment.amount)}
                              </td>

                              <td className="px-5 py-4">
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium capitalize ${getStatusClass(payment.status)}`}
                                >
                                  {payment.status}
                                </span>
                              </td>

                              <td className="whitespace-nowrap px-5 py-4 text-xs text-[var(--muted)]">
                                {formatDate(payment.createdAt)}
                              </td>

                              <td className="whitespace-nowrap px-5 py-4 text-right">
                                {payment.status === "pending" || payment.status === "processing" ? (
                                  <Link
                                    href={`/admin/payments?status=${payment.status}`}
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#a98843] hover:underline"
                                  >
                                    Review
                                    <ArrowRight size={12} />
                                  </Link>
                                ) : (
                                  <Link
                                    href="/admin/payments"
                                    className="text-xs text-[var(--muted)] hover:underline"
                                  >
                                    Details
                                  </Link>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="flex flex-col justify-between gap-2 border-t border-[var(--border)] px-5 py-4 text-xs text-[var(--muted)] sm:flex-row sm:items-center sm:px-6">
                    <span>
                      Revenue includes completed BDT payment records only.
                    </span>

                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Connected to Membrix API
                    </span>
                  </div>
                </section>

                <footer className="mt-8 flex flex-col justify-between gap-2 border-t border-[var(--border)] pt-5 text-xs text-[var(--muted)] sm:flex-row">
                  <p>© 2026 Membrix Administration</p>
                  <p>Designed for secure membership management.</p>
                </footer>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Mobile navigation */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setMobileMenuOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          <aside className="absolute inset-y-0 left-0 flex w-[min(300px,85vw)] flex-col bg-[#102b46] p-5 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-5">
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d6b878]/10 text-[#e6ca8b]">
                  <Building2 size={21} />
                </span>

                <span className="text-xl font-semibold">
                  Membrix<span className="text-[#d6b878]">.</span>
                </span>
              </Link>

              <button
                type="button"
                aria-label="Close navigation menu"
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10"
              >
                <X size={18} />
              </button>
            </div>

            <p className="mb-3 mt-7 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
              Workspace
            </p>

            <div className="space-y-1">
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/10 px-3.5 py-3 text-sm font-medium">
                <LayoutDashboard size={18} className="text-[#e6ca8b]" />
                Overview
              </div>

              <Link
                href="/admin/members"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm text-white/70 transition hover:bg-white/5 hover:text-white"
              >
                <Users size={18} />
                Members
              </Link>

              <Link
                href="/admin/payments"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm text-white/70 transition hover:bg-white/5 hover:text-white"
              >
                <Wallet size={18} />
                Payments
              </Link>
            </div>

            <div className="mt-6 border-t border-white/10 pt-4">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm text-white/70 transition hover:bg-white/5 hover:text-white"
              >
                <ArrowLeft size={16} />
                Back to website
              </Link>
            </div>

            <div className="mt-auto border-t border-white/10 pt-5">
              <p className="truncate text-sm font-medium">
                {admin?.name || "Administrator"}
              </p>

              <p className="mt-1 truncate text-xs text-white/45">
                {admin?.email || ""}
              </p>

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/10 text-sm font-medium transition hover:bg-white/5 disabled:opacity-60"
              >
                <LogOut size={16} />
                {loggingOut ? "Signing out..." : "Sign out"}
              </button>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
