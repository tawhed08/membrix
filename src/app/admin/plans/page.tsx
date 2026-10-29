
"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Edit3,
  LoaderCircle,
  LogOut,
  Menu,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Users,
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
  createdAt?: string;
  updatedAt?: string;
};

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
  user?: AdminUser;
};

type PlanForm = {
  name: string;
  slug: string;
  description: string;
  price: string;
  billingType: "yearly" | "one_time";
  durationDays: string;
  featuresText: string;
  isActive: boolean;
};

const EMPTY_FORM: PlanForm = {
  name: "",
  slug: "",
  description: "",
  price: "",
  billingType: "yearly",
  durationDays: "365",
  featuresText: "",
  isActive: true,
};

function formatMoney(value: number): string {
  return `৳${new Intl.NumberFormat("en-BD").format(value)}`;
}

function formatDate(value?: string): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-BD", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getPlanForm(plan: MembershipPlan): PlanForm {
  return {
    name: plan.name,
    slug: plan.slug,
    description: plan.description,
    price: String(plan.price),
    billingType: plan.billingType,
    durationDays: String(plan.durationDays ?? 365),
    featuresText: plan.features.join("\n"),
    isActive: plan.isActive,
  };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Users;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--muted-foreground)]">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
          <p className="mt-2 text-xs text-[var(--muted-foreground)]">
            {detail}
          </p>
        </div>

        <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#d6b878]/30 bg-[#d6b878]/10 text-[#b3944f]">
          <Icon size={20} />
        </span>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-2 block text-sm font-medium">{label}</span>
      {children}
      {hint && (
        <span className="mt-1.5 block text-xs text-[var(--muted-foreground)]">
          {hint}
        </span>
      )}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 py-3 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-[#c5a45f] focus:ring-2 focus:ring-[#d6b878]/20";

export default function AdminPlansPage() {
  const router = useRouter();
  const pageRef = useRef<HTMLDivElement>(null);

  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
  const [form, setForm] = useState<PlanForm>(EMPTY_FORM);
  const [reloadKey, setReloadKey] = useState(0);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

  // Load authenticated admin and membership plans.
  // AbortController prevents outdated requests after unmount/reload.
  useEffect(() => {
    const controller = new AbortController();

    async function fetchPlans() {
      setError("");

      try {
        const authResponse = await fetch(`${API_URL}/api/auth/me`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        if (authResponse.status === 401) {
          router.replace("/login");
          return;
        }

        const authData =
          (await authResponse.json()) as ApiResponse<never>;

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

        const response = await fetch(`${API_URL}/api/admin/plans`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        const result =
          (await response.json()) as ApiResponse<{
            plans: MembershipPlan[];
          }>;

        if (!response.ok || !result.success || !result.data) {
          throw new Error(
            result.message || "Unable to load membership plans.",
          );
        }

        setPlans(result.data.plans);
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(getErrorMessage(err));
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void fetchPlans();

    return () => {
      controller.abort();
    };
  }, [router, reloadKey]);

  // GSAP reveal animation.
  useEffect(() => {
    if (!pageRef.current || loading) return;

    const context = gsap.context(() => {
      gsap.fromTo(
        "[data-plan-reveal]",
        { opacity: 0, y: 14 },
        {
          opacity: 1,
          y: 0,
          duration: 0.45,
          stagger: 0.07,
          ease: "power2.out",
          clearProps: "all",
        },
      );
    }, pageRef);

    return () => context.revert();
  }, [loading, plans.length]);

  const filteredPlans = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return plans;

    return plans.filter((plan) =>
      [plan.name, plan.slug, plan.description, ...plan.features]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [plans, search]);

  const activeCount = plans.filter((plan) => plan.isActive).length;
  const inactiveCount = plans.length - activeCount;

  const totalListedValue = plans
    .filter((plan) => plan.isActive)
    .reduce((total, plan) => total + plan.price, 0);

  function openCreateEditor() {
    setEditingPlan(null);
    setForm(EMPTY_FORM);
    setError("");
    setNotice("");
    setEditorOpen(true);
  }

  function openEditEditor(plan: MembershipPlan) {
    setEditingPlan(plan);
    setForm(getPlanForm(plan));
    setError("");
    setNotice("");
    setEditorOpen(true);
  }

  function updateForm<K extends keyof PlanForm>(
    key: K,
    value: PlanForm[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    const features = form.featuresText
      .split("\n")
      .map((feature) => feature.trim())
      .filter(Boolean);

    const price = Number(form.price);
    const durationDays =
      form.billingType === "one_time" ? null : Number(form.durationDays);

    if (!form.name.trim()) {
      setError("Please enter a plan name.");
      return;
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug.trim())) {
      setError(
        "Slug must contain lowercase letters, numbers and hyphens only.",
      );
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      setError("Enter a valid non-negative price.");
      return;
    }

    if (
      form.billingType === "yearly" &&
      (!Number.isInteger(durationDays) || Number(durationDays) < 1)
    ) {
      setError("Duration must be a whole number of at least one day.");
      return;
    }

    if (features.length === 0) {
      setError("Add at least one plan feature.");
      return;
    }

    if (features.some((feature) => feature.length > 200)) {
      setError("Each feature must be 200 characters or fewer.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      description: form.description.trim(),
      price,
      billingType: form.billingType,
      durationDays,
      features,
      isActive: form.isActive,
    };

    setSaving(true);

    try {
      const url = editingPlan
        ? `${API_URL}/api/admin/plans/${editingPlan._id}`
        : `${API_URL}/api/admin/plans`;

      const response = await fetch(url, {
        method: editingPlan ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result =
        (await response.json()) as ApiResponse<{
          plan: MembershipPlan;
        }>;

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to save the membership plan.",
        );
      }

      setEditorOpen(false);
      setEditingPlan(null);
      setForm(EMPTY_FORM);
      setNotice(
        editingPlan
          ? "Membership plan updated successfully."
          : "Membership plan created successfully.",
      );
      setReloadKey((value) => value + 1);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function togglePlan(plan: MembershipPlan) {
    const confirmed = window.confirm(
      plan.isActive
        ? `Deactivate "${plan.name}"? Members may no longer be able to select it for new purchases.`
        : `Activate "${plan.name}"?`,
    );

    if (!confirmed) return;

    setStatusUpdating(plan._id);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `${API_URL}/api/admin/plans/${plan._id}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: !plan.isActive }),
        },
      );

      const result =
        (await response.json()) as ApiResponse<{
          plan: MembershipPlan;
        }>;

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to update plan status.",
        );
      }

      setNotice(result.message || "Plan status updated.");
      setReloadKey((value) => value + 1);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setStatusUpdating(null);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);

    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <main
      ref={pageRef}
      className="min-h-screen bg-[var(--background)] text-[var(--foreground)]"
    >
      <div className="mx-auto max-w-[1500px]">
        <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-xl">
          <div className="flex min-h-[76px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <Link
                href="/admin"
                aria-label="Back to admin overview"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] transition hover:border-[#d6b878]"
              >
                <ArrowLeft size={18} />
              </Link>

              <Link href="/admin" className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#102b46] text-[#e6ca8b]">
                  <ShieldCheck size={21} />
                </span>
                <span>
                  <span className="block text-sm font-semibold tracking-wide">
                    MEMBRIX
                  </span>
                  <span className="block text-xs text-[var(--muted-foreground)]">
                    Administration
                  </span>
                </span>
              </Link>
            </div>

            <div className="hidden items-center gap-2 sm:flex">
              <span className="mr-2 text-right">
                <span className="block text-sm font-medium">
                  {admin?.name || "Administrator"}
                </span>
                <span className="block text-xs text-[var(--muted-foreground)]">
                  {admin?.email || "Admin account"}
                </span>
              </span>

              <button
                type="button"
                onClick={() => setReloadKey((value) => value + 1)}
                disabled={loading}
                aria-label="Refresh plans"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] transition hover:border-[#d6b878] disabled:opacity-50"
              >
                <RefreshCw
                  size={16}
                  className={loading ? "animate-spin" : ""}
                />
              </button>

              <button
                type="button"
                onClick={() => void handleLogout()}
                disabled={loggingOut}
                className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm transition hover:border-red-500/50 hover:text-red-500 disabled:opacity-50"
              >
                <LogOut size={16} />
                {loggingOut ? "Signing out..." : "Sign out"}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((value) => !value)}
              aria-label="Toggle admin menu"
              aria-expanded={mobileMenuOpen}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] sm:hidden"
            >
              {mobileMenuOpen ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>

          {mobileMenuOpen && (
            <nav className="grid grid-cols-2 gap-2 border-t border-[var(--border)] p-4 sm:hidden">
              <Link
                href="/admin"
                className="rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm"
              >
                Overview
              </Link>
              <Link
                href="/admin/members"
                className="rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm"
              >
                Members
              </Link>
              <Link
                href="/admin/payments"
                className="rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm"
              >
                Payments
              </Link>
              <Link
                href="/admin/plans"
                className="rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm"
              >
                Membership plans
              </Link>
              <Link
                href="/"
                className="rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm"
              >
                Public website
              </Link>
              <button
                type="button"
                onClick={() => void handleLogout()}
                disabled={loggingOut}
                className="rounded-xl border border-[var(--border)] px-3 py-2.5 text-left text-sm disabled:opacity-50"
              >
                {loggingOut ? "Signing out..." : "Sign out"}
              </button>
            </nav>
          )}
        </header>

        <div className="grid gap-8 px-4 py-7 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:px-8 lg:py-10">
          <aside className="hidden lg:block" data-plan-reveal>
            <div className="sticky top-28 space-y-2">
              <p className="mb-4 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                Workspace
              </p>

              <Link
                href="/admin"
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-[var(--muted-foreground)] transition hover:bg-[var(--card)] hover:text-[var(--foreground)]"
              >
                <Users size={17} />
                Overview
              </Link>

              <Link
                href="/admin/members"
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-[var(--muted-foreground)] transition hover:bg-[var(--card)] hover:text-[var(--foreground)]"
              >
                <Users size={17} />
                Members
              </Link>

              <Link
                href="/admin/payments"
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-[var(--muted-foreground)] transition hover:bg-[var(--card)] hover:text-[var(--foreground)]"
              >
                <CreditCard size={17} />
                Payments
              </Link>

              <Link
                href="/admin/plans"
                aria-current="page"
                className="flex items-center gap-3 rounded-xl border border-[#d6b878]/30 bg-[#d6b878]/10 px-3 py-3 text-sm font-medium text-[#b3944f]"
              >
                <BadgeCheck size={17} />
                Membership plans
              </Link>

              <div className="my-5 border-t border-[var(--border)]" />

              <Link
                href="/"
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-[var(--muted-foreground)] transition hover:bg-[var(--card)] hover:text-[var(--foreground)]"
              >
                <ArrowLeft size={17} />
                Public website
              </Link>
            </div>
          </aside>

          <section className="min-w-0 space-y-7">
            <div
              data-plan-reveal
              className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"
            >
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#d6b878]/30 bg-[#d6b878]/10 px-3 py-1.5 text-xs font-medium text-[#b3944f]">
                  <Sparkles size={14} />
                  Membership management
                </div>

                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  Membership plans
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
                  Create and maintain the plans available to your members.
                  Review pricing, benefits and availability in one place.
                </p>
              </div>

              <button
                type="button"
                onClick={openCreateEditor}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#102b46] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#193e60]"
              >
                <Plus size={17} />
                Create plan
              </button>
            </div>

            {error && !editorOpen && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-600"
              >
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">{error}</div>
                <button
                  type="button"
                  onClick={() => setError("")}
                  aria-label="Dismiss error"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {notice && (
              <div
                role="status"
                className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-emerald-600"
              >
                <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">{notice}</div>
                <button
                  type="button"
                  onClick={() => setNotice("")}
                  aria-label="Dismiss message"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            <div
              className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
              data-plan-reveal
            >
              <StatCard
                label="Total plans"
                value={String(plans.length)}
                detail="All saved plans"
                icon={BadgeCheck}
              />
              <StatCard
                label="Active plans"
                value={String(activeCount)}
                detail="Available status"
                icon={CheckCircle2}
              />
              <StatCard
                label="Inactive plans"
                value={String(inactiveCount)}
                detail="Not currently active"
                icon={Clock3}
              />
              <StatCard
                label="Combined listed price"
                value={formatMoney(totalListedValue)}
                detail="Sum of active plan prices"
                icon={CircleDollarSign}
              />
            </div>

            <div
              data-plan-reveal
              className="rounded-2xl border border-[var(--border)] bg-[var(--card)]"
            >
              <div className="flex flex-col gap-4 border-b border-[var(--border)] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div>
                  <h2 className="text-lg font-semibold">
                    All membership plans
                  </h2>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    {filteredPlans.length}{" "}
                    {filteredPlans.length === 1 ? "plan" : "plans"} found
                  </p>
                </div>

                <div className="relative w-full sm:max-w-xs">
                  <Search
                    size={17}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
                  />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search plans..."
                    aria-label="Search membership plans"
                    className={`${inputClass} pl-10`}
                  />
                </div>
              </div>

              {loading ? (
                <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-sm text-[var(--muted-foreground)]">
                  <LoaderCircle
                    size={25}
                    className="animate-spin text-[#b3944f]"
                  />
                  Loading membership plans...
                </div>
              ) : error && plans.length === 0 ? (
                <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
                  <AlertCircle size={30} className="text-red-500" />
                  <p className="mt-3 font-medium">Unable to load plans</p>
                  <p className="mt-1 max-w-md text-sm text-[var(--muted-foreground)]">
                    {error}
                  </p>
                  <button
                    type="button"
                    onClick={() => setReloadKey((value) => value + 1)}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm"
                  >
                    <RefreshCw size={15} />
                    Try again
                  </button>
                </div>
              ) : filteredPlans.length === 0 ? (
                <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
                  <BadgeCheck
                    size={30}
                    className="text-[var(--muted-foreground)]"
                  />
                  <p className="mt-3 font-medium">
                    {search ? "No matching plans" : "No membership plans yet"}
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    {search
                      ? "Try a different search term."
                      : "Create your first plan to get started."}
                  </p>

                  {!search && (
                    <button
                      type="button"
                      onClick={openCreateEditor}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#102b46] px-4 py-2.5 text-sm font-medium text-white"
                    >
                      <Plus size={16} />
                      Create plan
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-2">
                  {filteredPlans.map((plan) => (
                    <article
                      key={plan._id}
                      data-plan-reveal
                      className="flex min-w-0 flex-col rounded-2xl border border-[var(--border)] bg-[var(--background)] p-5 transition hover:border-[#d6b878]/60 sm:p-6"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#d6b878]/30 bg-[#d6b878]/10 text-[#b3944f]">
                            <BadgeCheck size={22} />
                          </span>

                          <div className="min-w-0">
                            <h3 className="truncate text-lg font-semibold">
                              {plan.name}
                            </h3>
                            <p className="mt-0.5 truncate text-xs text-[var(--muted-foreground)]">
                              /{plan.slug}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                            plan.isActive
                              ? "bg-emerald-500/10 text-emerald-600"
                              : "bg-[var(--border)] text-[var(--muted-foreground)]"
                          }`}
                        >
                          {plan.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <div className="mt-6">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="text-3xl font-semibold tracking-tight">
                            {formatMoney(plan.price)}
                          </span>
                          <span className="text-sm text-[var(--muted-foreground)]">
                            /{" "}
                            {plan.billingType === "yearly"
                              ? "billing period"
                              : "one-time"}
                          </span>
                        </div>

                        <p className="mt-2 min-h-10 text-sm leading-5 text-[var(--muted-foreground)]">
                          {plan.description || "No description provided."}
                        </p>
                      </div>

                      <div className="mt-5 flex items-center gap-2 rounded-xl border border-[var(--border)] px-3.5 py-3 text-sm">
                        <Clock3
                          size={16}
                          className="shrink-0 text-[#b3944f]"
                        />
                        <span>
                          {plan.billingType === "one_time"
                            ? "One-time membership"
                            : `${plan.durationDays ?? 365} days membership`}
                        </span>
                      </div>

                      <div className="mt-5 flex-1">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                          Included benefits
                        </p>

                        <ul className="space-y-2.5">
                          {plan.features.slice(0, 5).map((feature, index) => (
                            <li
                              key={`${plan._id}-${index}`}
                              className="flex items-start gap-2.5 text-sm"
                            >
                              <Check
                                size={15}
                                className="mt-0.5 shrink-0 text-emerald-600"
                              />
                              <span className="min-w-0 break-words">
                                {feature}
                              </span>
                            </li>
                          ))}

                          {plan.features.length > 5 && (
                            <li className="text-xs text-[var(--muted-foreground)]">
                              +{plan.features.length - 5} more benefits
                            </li>
                          )}
                        </ul>
                      </div>

                      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
                        <span className="text-xs text-[var(--muted-foreground)]">
                          Added {formatDate(plan.createdAt)}
                        </span>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openEditEditor(plan)}
                            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm transition hover:border-[#d6b878]"
                          >
                            <Edit3 size={15} />
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => void togglePlan(plan)}
                            disabled={statusUpdating === plan._id}
                            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition disabled:opacity-50 ${
                              plan.isActive
                                ? "border border-amber-500/30 text-amber-600 hover:bg-amber-500/5"
                                : "border border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/5"
                            }`}
                          >
                            {statusUpdating === plan._id ? (
                              <LoaderCircle
                                size={15}
                                className="animate-spin"
                              />
                            ) : plan.isActive ? (
                              <ToggleRight size={16} />
                            ) : (
                              <ToggleLeft size={16} />
                            )}
                            {plan.isActive ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <div
              data-plan-reveal
              className="flex items-start gap-3 rounded-2xl border border-[#d6b878]/25 bg-[#d6b878]/5 p-4 sm:p-5"
            >
              <ShieldCheck
                size={20}
                className="mt-0.5 shrink-0 text-[#b3944f]"
              />
              <div>
                <p className="text-sm font-medium">Plan management safety</p>
                <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">
                  Deactivating a plan changes its availability, not existing
                  member or payment records. Existing memberships and payment
                  history are not deleted by this page.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>

      {editorOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/55 p-3 backdrop-blur-sm sm:items-center sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setEditorOpen(false);
              setError("");
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="plan-editor-title"
            className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] p-5 sm:p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b3944f]">
                  Membership configuration
                </p>
                <h2
                  id="plan-editor-title"
                  className="mt-2 text-xl font-semibold"
                >
                  {editingPlan
                    ? "Edit membership plan"
                    : "Create membership plan"}
                </h2>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  Configure pricing, duration and member benefits.
                </p>
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setEditorOpen(false);
                  setError("");
                }}
                aria-label="Close editor"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] disabled:opacity-50"
              >
                <X size={17} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="max-h-[68vh] space-y-5 overflow-y-auto p-5 sm:p-6">
                {error && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/5 p-3.5 text-sm text-red-600"
                  >
                    <AlertCircle size={17} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Plan name">
                    <input
                      required
                      maxLength={80}
                      value={form.name}
                      onChange={(event) => {
                        const name = event.target.value;
                        updateForm("name", name);

                        if (!editingPlan) {
                          updateForm("slug", slugify(name));
                        }
                      }}
                      placeholder="e.g. Prestige"
                      className={inputClass}
                    />
                  </Field>

                  <Field
                    label="URL slug"
                    hint="Lowercase letters, numbers and hyphens only."
                  >
                    <input
                      required
                      maxLength={80}
                      pattern="[a-z0-9]+(-[a-z0-9]+)*"
                      value={form.slug}
                      onChange={(event) =>
                        updateForm("slug", slugify(event.target.value))
                      }
                      placeholder="e.g. prestige"
                      className={inputClass}
                    />
                  </Field>
                </div>

                <Field label="Description">
                  <textarea
                    rows={3}
                    maxLength={500}
                    value={form.description}
                    onChange={(event) =>
                      updateForm("description", event.target.value)
                    }
                    placeholder="Describe the membership plan..."
                    className={`${inputClass} resize-y`}
                  />
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Price (BDT)">
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[var(--muted-foreground)]">
                        ৳
                      </span>
                      <input
                        required
                        type="number"
                        min="0"
                        step="1"
                        value={form.price}
                        onChange={(event) =>
                          updateForm("price", event.target.value)
                        }
                        placeholder="2500"
                        className={`${inputClass} pl-9`}
                      />
                    </div>
                  </Field>

                  <Field label="Billing type">
                    <select
                      value={form.billingType}
                      onChange={(event) =>
                        updateForm(
                          "billingType",
                          event.target.value as PlanForm["billingType"],
                        )
                      }
                      className={inputClass}
                    >
                      <option value="yearly">Duration-based</option>
                      <option value="one_time">One-time payment</option>
                    </select>
                  </Field>
                </div>

                {form.billingType === "yearly" && (
                  <Field
                    label="Membership duration (days)"
                    hint="365 days is approximately one year."
                  >
                    <input
                      required
                      type="number"
                      min="1"
                      step="1"
                      value={form.durationDays}
                      onChange={(event) =>
                        updateForm("durationDays", event.target.value)
                      }
                      className={inputClass}
                    />
                  </Field>
                )}

                <Field
                  label="Benefits / features"
                  hint="Write one feature per line. At least one feature is required."
                >
                  <textarea
                    required
                    rows={6}
                    maxLength={5000}
                    value={form.featuresText}
                    onChange={(event) =>
                      updateForm("featuresText", event.target.value)
                    }
                    placeholder={
                      "Member dashboard access\nPriority support\nExclusive member benefits"
                    }
                    className={`${inputClass} resize-y`}
                  />
                </Field>

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--border)] p-4">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) =>
                      updateForm("isActive", event.target.checked)
                    }
                    className="mt-1 h-4 w-4 accent-[#b3944f]"
                  />
                  <span>
                    <span className="block text-sm font-medium">
                      Make plan active
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-[var(--muted-foreground)]">
                      Active status does not automatically connect this plan
                      to the homepage or checkout. Public plan integration is
                      a separate step.
                    </span>
                  </span>
                </label>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-[var(--border)] p-5 sm:flex-row sm:justify-end sm:p-6">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setEditorOpen(false);
                    setError("");
                  }}
                  className="rounded-xl border border-[var(--border)] px-5 py-3 text-sm font-medium transition hover:border-[#d6b878] disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#102b46] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#193e60] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <LoaderCircle size={16} className="animate-spin" />
                  ) : (
                    <Check size={16} />
                  )}
                  {saving
                    ? "Saving..."
                    : editingPlan
                      ? "Save changes"
                      : "Create plan"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
