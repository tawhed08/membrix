"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  Banknote,
  BadgeCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  FileSearch,
  Filter,
  LayoutDashboard,
  LogOut,
  Menu,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  Wallet,
  X,
  XCircle,
} from "lucide-react";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

type PaymentStatus =
  | "pending"
  | "processing"
  | "completed"
  | "rejected"
  | "failed"
  | "refunded";

type PaymentStatusFilter = "all" | PaymentStatus;
type PaymentMethod = "bkash" | "nagad" | "bank" | "online";
type PaymentMethodFilter = "all" | PaymentMethod;
type ReviewAction = "approve" | "reject";

interface PopulatedUser {
  _id?: string;
  id?: string;
  name?: string;
  fullName?: string;
  email?: string;
}

interface PopulatedPlan {
  _id?: string;
  name?: string;
  title?: string;
}

interface PopulatedMembership {
  _id?: string;
  status?: string;
  membershipId?: string;
}

interface PaymentRecord {
  _id: string;
  id?: string;
  user?: string | PopulatedUser | null;
  membership?: string | PopulatedMembership | null;
  plan?: string | PopulatedPlan | null;
  amount?: number | string;
  currency?: string;
  method?: PaymentMethod | string;
  status?: PaymentStatus | string;
  transactionId?: string;
  payerNumber?: string;
  paymentReference?: string;
  gatewayTransactionId?: string;
  gatewayName?: string;
  proofUrl?: string;
  adminNote?: string;
  reviewedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  reviewedBy?: string | PopulatedUser | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Overview {
  totalMembers: number;
  activeMemberships: number;
  pendingPayments: number;
  processingPayments: number;
  completedPayments: number;
  totalRevenue: number;
}

interface ApiPayload {
  success?: boolean;
  message?: string;
  error?: string;
  payments?: PaymentRecord[];
  pagination?: Partial<Pagination>;
  overview?: Partial<Overview>;
  data?: ApiPayload;
  totalMembers?: number;
  activeMemberships?: number;
  pendingPayments?: number;
  processingPayments?: number;
  completedPayments?: number;
  totalRevenue?: number;
}

const INITIAL_PAGINATION: Pagination = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
};

const INITIAL_OVERVIEW: Overview = {
  totalMembers: 0,
  activeMemberships: 0,
  pendingPayments: 0,
  processingPayments: 0,
  completedPayments: 0,
  totalRevenue: 0,
};

const STATUS_OPTIONS: {
  value: PaymentStatus;
  label: string;
}[] = [
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "completed", label: "Completed" },
  { value: "rejected", label: "Rejected" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
];

const METHOD_OPTIONS: {
  value: PaymentMethod;
  label: string;
}[] = [
  { value: "bkash", label: "bKash" },
  { value: "nagad", label: "Nagad" },
  { value: "bank", label: "Bank transfer" },
  { value: "online", label: "Online gateway" },
];

function normalizeStatus(value?: string): PaymentStatus {
  const normalized = (value || "pending").toLowerCase();

  switch (normalized) {
    case "pending":
    case "processing":
    case "completed":
    case "rejected":
    case "failed":
    case "refunded":
      return normalized;

    default:
      return "pending";
  }
}

function normalizeMethod(value?: string): string {
  return (value || "unknown").toLowerCase();
}

function getStatusLabel(status?: string): string {
  const normalized = normalizeStatus(status);

  return (
    STATUS_OPTIONS.find((item) => item.value === normalized)?.label ??
    "Pending"
  );
}

function getStatusClasses(status?: string): string {
  switch (normalizeStatus(status)) {
    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-800";

    case "processing":
      return "border-blue-200 bg-blue-50 text-blue-800";

    case "completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";

    case "rejected":
      return "border-rose-200 bg-rose-50 text-rose-800";

    case "failed":
      return "border-red-300 bg-red-100 text-red-900";

    case "refunded":
      return "border-violet-200 bg-violet-50 text-violet-800";

    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

/*
 * Return React elements instead of component constructors.
 * This avoids the React static-components lint error.
 */
function getStatusIcon(status?: string): ReactNode {
  switch (normalizeStatus(status)) {
    case "pending":
      return <Clock3 size={13} strokeWidth={2.2} />;

    case "processing":
      return <Activity size={13} strokeWidth={2.2} />;

    case "completed":
      return <CheckCircle2 size={13} strokeWidth={2.2} />;

    case "rejected":
    case "failed":
      return <XCircle size={13} strokeWidth={2.2} />;

    case "refunded":
      return <ArrowDownRight size={13} strokeWidth={2.2} />;

    default:
      return <AlertCircle size={13} strokeWidth={2.2} />;
  }
}

function getMethodLabel(method?: string): string {
  const normalized = normalizeMethod(method);

  const match = METHOD_OPTIONS.find(
    (item) => item.value === normalized,
  );

  if (match) return match.label;

  if (normalized === "bank_transfer") return "Bank transfer";
  if (normalized === "aamarpay") return "Online gateway";

  return normalized === "unknown"
    ? "Unknown method"
    : normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function getMethodClasses(method?: string): string {
  switch (normalizeMethod(method)) {
    case "bkash":
      return "border-pink-200 bg-pink-50 text-pink-800";

    case "nagad":
      return "border-orange-200 bg-orange-50 text-orange-800";

    case "bank":
    case "bank_transfer":
      return "border-slate-200 bg-slate-100 text-slate-800";

    case "online":
    case "aamarpay":
      return "border-[#d6b878]/40 bg-[#f8f3e7] text-[#76591e]";

    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function getAmount(payment: PaymentRecord): number {
  const amount = Number(payment.amount ?? 0);

  return Number.isFinite(amount) ? amount : 0;
}

function formatMoney(value: number): string {
  return `৳${new Intl.NumberFormat("en-BD", {
    maximumFractionDigits: 2,
  }).format(value)}`;
}

function formatDate(value?: string): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value?: string): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getMemberName(payment: PaymentRecord): string {
  if (payment.user && typeof payment.user === "object") {
    return (
      payment.user.name ||
      payment.user.fullName ||
      payment.user.email ||
      "Unknown member"
    );
  }

  return "Member";
}

function getMemberEmail(payment: PaymentRecord): string {
  if (payment.user && typeof payment.user === "object") {
    return payment.user.email || "No email available";
  }

  return "Member information unavailable";
}

function getPlanName(payment: PaymentRecord): string {
  if (payment.plan && typeof payment.plan === "object") {
    return payment.plan.name || payment.plan.title || "Membership plan";
  }

  return "Membership plan";
}

function getTransactionReference(payment: PaymentRecord): string {
  return (
    payment.transactionId ||
    payment.paymentReference ||
    payment.gatewayTransactionId ||
    payment._id ||
    payment.id ||
    "—"
  );
}

function canReviewPayment(payment: PaymentRecord): boolean {
  const status = normalizeStatus(payment.status);
  const method = normalizeMethod(payment.method);

  const manualMethod = [
    "bkash",
    "nagad",
    "bank",
    "bank_transfer",
  ].includes(method);

  return (
    manualMethod &&
    (status === "pending" || status === "processing")
  );
}

function getErrorMessage(
  payload: ApiPayload | undefined,
  fallback: string,
): string {
  return payload?.message || payload?.error || fallback;
}

function StatusBadge({ status }: { status?: string }) {
  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
        status,
      )}`}
    >
      {getStatusIcon(status)}
      {getStatusLabel(status)}
    </span>
  );
}

function MethodBadge({ method }: { method?: string }) {
  const normalized = normalizeMethod(method);

  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-semibold ${getMethodClasses(
        method,
      )}`}
    >
      {normalized === "bank" || normalized === "bank_transfer" ? (
        <Banknote size={13} />
      ) : normalized === "online" || normalized === "aamarpay" ? (
        <CreditCard size={13} />
      ) : (
        <Wallet size={13} />
      )}

      {getMethodLabel(method)}
    </span>
  );
}

function StatCard({
  title,
  value,
  description,
  icon,
  accent,
}: {
  title: string;
  value: string;
  description: string;
  icon: ReactNode;
  accent: string;
}) {
  return (
    <div
      data-payment-animate
      className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.035)] transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{title}</p>

          <p className="mt-3 truncate text-2xl font-bold tracking-tight text-[#102b46] sm:text-3xl">
            {value}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${accent}`}
        >
          {icon}
        </div>
      </div>

      <p className="mt-3 text-xs leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}

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

export default function AdminPaymentsPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [pagination, setPagination] =
    useState<Pagination>(INITIAL_PAGINATION);
  const [overview, setOverview] =
    useState<Overview>(INITIAL_OVERVIEW);

  const [loading, setLoading] = useState(true);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [draftSearch, setDraftSearch] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] =
    useState<PaymentStatusFilter>("all");
  const [method, setMethod] =
    useState<PaymentMethodFilter>("all");
  const [page, setPage] = useState(1);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] =
    useState<PaymentRecord | null>(null);
  const [reviewAction, setReviewAction] =
    useState<ReviewAction | null>(null);
  const [adminNote, setAdminNote] = useState("");

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/overview`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        },
      );

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (response.status === 403) {
        router.replace("/dashboard");
        return;
      }

      const payload = (await response.json()) as ApiPayload;

      if (!response.ok || payload.success === false) {
        throw new Error(
          getErrorMessage(payload, "Could not load payment overview."),
        );
      }

      const data = payload.data ?? payload;
      const overviewData = data.overview ?? data;

      setOverview({
        totalMembers: Number(overviewData.totalMembers ?? 0),
        activeMemberships: Number(
          overviewData.activeMemberships ?? 0,
        ),
        pendingPayments: Number(overviewData.pendingPayments ?? 0),
        processingPayments: Number(
          overviewData.processingPayments ?? 0,
        ),
        completedPayments: Number(
          overviewData.completedPayments ?? 0,
        ),
        totalRevenue: Number(overviewData.totalRevenue ?? 0),
      });
    } catch {
      setOverview(INITIAL_OVERVIEW);
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();

      params.set("page", String(page));
      params.set("limit", String(INITIAL_PAGINATION.limit));

      if (search.trim()) params.set("search", search.trim());
      if (status !== "all") params.set("status", status);
      if (method !== "all") params.set("method", method);

      const response = await fetch(
        `${API_BASE_URL}/api/admin/payments?${params.toString()}`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        },
      );

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (response.status === 403) {
        router.replace("/dashboard");
        return;
      }

      const payload = (await response.json()) as ApiPayload;

      if (!response.ok || payload.success === false) {
        throw new Error(
          getErrorMessage(payload, "Could not load payments."),
        );
      }

      const data = payload.data ?? payload;
      const records = Array.isArray(data.payments)
        ? data.payments
        : [];

      const paginationData = data.pagination ?? {};
      const total = Number(paginationData.total ?? records.length);
      const limit = Number(
        paginationData.limit ?? INITIAL_PAGINATION.limit,
      );

      setPayments(records);

      setPagination({
        page: Number(paginationData.page ?? page),
        limit,
        total,
        totalPages: Math.max(
          1,
          Number(
            paginationData.totalPages ??
              Math.ceil(total / Math.max(1, limit)),
          ),
        ),
      });
    } catch (fetchError) {
      setPayments([]);
      setPagination(INITIAL_PAGINATION);

      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Unable to connect to the payment API.",
      );
    } finally {
      setLoading(false);
    }
  }, [method, page, search, status]);

  useEffect(() => {
    let cancelled = false;

    async function checkAdminSession() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        if (response.status === 401) {
          router.replace("/login");
          return;
        }

        const data = (await response.json()) as AuthResponse;

        if (!response.ok || !data.success || !data.user) {
          router.replace("/login");
          return;
        }

        if (data.user.role !== "admin") {
          router.replace("/dashboard");
          return;
        }

        if (!cancelled) {
          setAdmin(data.user);
        }
      } catch {
        router.replace("/login");
      }
    }

    void checkAdminSession();

    return () => {
      cancelled = true;
    };
  }, [router]);

  /*
   * Schedule the requests asynchronously to avoid triggering
   * react-hooks/set-state-in-effect from the initial effects.
   */
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadOverview();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadOverview]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPayments();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadPayments]);

  useEffect(() => {
    if (!containerRef.current) return;

    const context = gsap.context(() => {
      gsap.fromTo(
        "[data-payment-animate]",
        { opacity: 0, y: 14 },
        {
          opacity: 1,
          y: 0,
          duration: 0.45,
          stagger: 0.055,
          ease: "power2.out",
          clearProps: "opacity,transform",
        },
      );
    }, containerRef);

    return () => context.revert();
  }, []);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(draftSearch.trim());
  }

  function resetFilters() {
    setDraftSearch("");
    setSearch("");
    setStatus("all");
    setMethod("all");
    setPage(1);
    setNotice("");
    setError("");
  }

  function openReview(
    payment: PaymentRecord,
    action: ReviewAction,
  ) {
    setSelectedPayment(payment);
    setReviewAction(action);
    setAdminNote("");
    setNotice("");
    setError("");
  }

  function closeReview() {
    if (reviewing) return;

    setSelectedPayment(null);
    setReviewAction(null);
    setAdminNote("");
  }

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedPayment || !reviewAction) return;

    if (!canReviewPayment(selectedPayment)) {
      setError(
        "This payment cannot be reviewed manually. Online payments must be verified by the gateway callback.",
      );
      return;
    }

    setReviewing(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/payments/${encodeURIComponent(
          selectedPayment._id,
        )}/review`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: reviewAction,
            adminNote: adminNote.trim(),
          }),
        },
      );

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (response.status === 403) {
        router.replace("/dashboard");
        return;
      }

      const payload = (await response.json()) as ApiPayload;

      if (!response.ok || payload.success === false) {
        throw new Error(
          getErrorMessage(payload, "Unable to review this payment."),
        );
      }

      setNotice(
        reviewAction === "approve"
          ? "Payment approved successfully."
          : "Payment rejected successfully.",
      );

      setSelectedPayment(null);
      setReviewAction(null);
      setAdminNote("");

      await Promise.all([loadPayments(), loadOverview()]);
    } catch (reviewError) {
      setError(
        reviewError instanceof Error
          ? reviewError.message
          : "An unexpected error occurred while reviewing payment.",
      );
    } finally {
      setReviewing(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);

    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      router.replace("/login");
      router.refresh();
      setLoggingOut(false);
    }
  }

  const pageTotal = pagination.total;
  const pendingReviewCount =
    overview.pendingPayments + overview.processingPayments;

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-[#f5f7fa] text-[#102b46]"
    >
      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-[#0b1c2e]/55 backdrop-blur-[2px] lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col bg-[#102b46] text-white transition-transform duration-300 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="flex h-[82px] items-center justify-between border-b border-white/10 px-6">
          <Link
            href="/admin"
            className="flex items-center gap-3"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d6b878] text-[#102b46]">
              <ShieldCheck size={22} strokeWidth={2.2} />
            </div>

            <div>
              <p className="text-[19px] font-bold tracking-tight">
                Membrix
              </p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Administration
              </p>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
            className="rounded-lg p-2 text-slate-300 hover:bg-white/10 lg:hidden"
          >
            <X size={19} />
          </button>
        </div>

        <div className="px-5 pb-3 pt-7">
          <p className="px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Workspace
          </p>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          <Link
            href="/admin"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white"
          >
            <LayoutDashboard size={18} />
            Overview
            <ArrowRight size={15} className="ml-auto opacity-40" />
          </Link>

          <Link
            href="/admin/members"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white"
          >
            <Users size={18} />
            Members
          </Link>

          <Link
            href="/admin/payments"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 rounded-xl border border-[#d6b878]/20 bg-[#d6b878]/10 px-3.5 py-3 text-sm font-semibold text-[#e8ce91]"
          >
            <Wallet size={18} />
            Payments
            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#d6b878]" />
          </Link>
        </nav>

        <div className="mx-5 mb-5 rounded-2xl border border-white/10 bg-white/[0.045] p-4">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-[#d6b878]">
            <ShieldCheck size={18} />
          </div>
          <p className="text-sm font-semibold">Admin workspace</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            Manage members and review manual payments securely.
          </p>
        </div>

        <div className="border-t border-white/10 p-4">
          <Link
            href="/"
            className="mb-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 transition hover:bg-white/[0.07] hover:text-white"
          >
            <ArrowLeft size={17} />
            Back to website
          </Link>

          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={loggingOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 transition hover:bg-rose-400/10 hover:text-rose-200 disabled:opacity-60"
          >
            {loggingOut ? (
              <RefreshCw size={17} className="animate-spin" />
            ) : (
              <LogOut size={17} />
            )}
            {loggingOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </aside>

      <main className="min-w-0 lg:pl-[264px]">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
          <div className="flex h-[72px] items-center justify-between gap-4 px-4 sm:px-7 xl:px-10">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                aria-label="Open navigation"
                onClick={() => setMobileMenuOpen(true)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-[#102b46] transition hover:bg-slate-50 lg:hidden"
              >
                <Menu size={20} />
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>Admin</span>
                  <ChevronRight size={13} />
                  <span className="font-medium text-[#8b6b2e]">
                    Payments
                  </span>
                </div>

                <h1 className="mt-1 truncate text-lg font-bold tracking-tight text-[#102b46] sm:text-xl">
                  Payment management
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-[#102b46]">
                  {admin?.name || "Administrator"}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Administrator
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d6b878]/30 bg-[#d6b878]/15 text-sm font-semibold text-[#a98843]">
                {getInitials(admin?.name || "Admin")}
              </div>

              <button
                type="button"
                aria-label="Sign out"
                onClick={() => void handleLogout()}
                disabled={loggingOut}
                className="hidden h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-medium transition hover:bg-slate-50 disabled:opacity-60 md:flex"
              >
                <LogOut size={16} />
                <span>{loggingOut ? "Signing out..." : "Sign out"}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  void Promise.all([loadPayments(), loadOverview()])
                }
                disabled={loading || overviewLoading}
                className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-600 transition hover:border-[#d6b878]/60 hover:text-[#76591e] disabled:opacity-60 sm:px-4"
              >
                <RefreshCw
                  size={15}
                  className={
                    loading || overviewLoading ? "animate-spin" : ""
                  }
                />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1600px] px-4 py-7 sm:px-7 sm:py-9 xl:px-10">
          <section
            data-payment-animate
            className="mb-7 flex flex-col justify-between gap-5 md:flex-row md:items-end"
          >
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#d6b878]/30 bg-[#f8f3e7] px-3 py-1.5 text-xs font-semibold text-[#76591e]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#b99a5b]" />
                Payment operations
              </div>

              <h2 className="text-2xl font-bold tracking-tight text-[#102b46] sm:text-3xl">
                Payments overview
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Track transactions, check payment methods, and review
                pending manual payments from one place.
              </p>
            </div>

            <div className="flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-500 shadow-sm">
              <ShieldCheck size={16} className="text-[#b99a5b]" />
              Admin access
            </div>
          </section>

          {error && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm text-rose-800"
            >
              <AlertCircle size={18} className="mt-0.5 shrink-0" />

              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  Unable to complete request
                </p>
                <p className="mt-1 leading-5">{error}</p>
              </div>

              <button
                type="button"
                aria-label="Dismiss error"
                onClick={() => setError("")}
                className="rounded-lg p-1 text-rose-500 hover:bg-rose-100"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {notice && (
            <div
              role="status"
              className="mb-5 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-sm text-emerald-800"
            >
              <CheckCircle2 size={18} className="shrink-0" />
              <p className="flex-1 font-medium">{notice}</p>

              <button
                type="button"
                aria-label="Dismiss message"
                onClick={() => setNotice("")}
                className="rounded-lg p-1 hover:bg-emerald-100"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Matching payments"
              value={
                loading && pageTotal === 0
                  ? "—"
                  : new Intl.NumberFormat("en-BD").format(pageTotal)
              }
              description="Payments matching your current filters"
              icon={<CreditCard size={21} />}
              accent="bg-slate-100 text-[#102b46]"
            />

            <StatCard
              title="Awaiting review"
              value={
                overviewLoading
                  ? "—"
                  : new Intl.NumberFormat("en-BD").format(
                      pendingReviewCount,
                    )
              }
              description="Pending and processing payments"
              icon={<Clock3 size={21} />}
              accent="bg-[#f8f3e7] text-[#76591e]"
            />

            <StatCard
              title="Completed payments"
              value={
                overviewLoading
                  ? "—"
                  : new Intl.NumberFormat("en-BD").format(
                      overview.completedPayments,
                    )
              }
              description="Successfully completed transactions"
              icon={<BadgeCheck size={21} />}
              accent="bg-emerald-50 text-emerald-700"
            />

            <StatCard
              title="Total revenue"
              value={
                overviewLoading
                  ? "—"
                  : formatMoney(overview.totalRevenue)
              }
              description="Revenue from completed payments"
              icon={<Banknote size={21} />}
              accent="bg-[#f8f3e7] text-[#76591e]"
            />
          </section>

          <section
            data-payment-animate
            className="mb-6 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_4px_24px_rgba(15,23,42,0.025)] sm:p-5"
          >
            <div className="mb-3 flex items-center gap-2">
              <Activity size={17} className="text-[#b99a5b]" />
              <h3 className="text-sm font-bold text-[#102b46]">
                Payment status guide
              </h3>
            </div>

            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((item) => (
                <StatusBadge key={item.value} status={item.value} />
              ))}
            </div>
          </section>

          <section
            data-payment-animate
            className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_28px_rgba(15,23,42,0.04)]"
          >
            <div className="border-b border-slate-200/80 px-5 py-5 sm:px-6">
              <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
                <div>
                  <h3 className="text-base font-bold text-[#102b46]">
                    Transaction history
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Search and filter transactions by status or payment
                    method.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
                    {pageTotal} result{pageTotal === 1 ? "" : "s"}
                  </span>

                  <button
                    type="button"
                    onClick={resetFilters}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <RefreshCw size={13} />
                    Reset filters
                  </button>
                </div>
              </div>

              <form
                onSubmit={handleSearch}
                className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1.5fr)_minmax(170px,0.8fr)_minmax(180px,0.9fr)_auto] xl:items-center"
              >
                <label className="flex h-11 min-w-0 items-center gap-2.5 rounded-xl border border-slate-200 bg-[#f8fafc] px-3.5 transition focus-within:border-[#b99a5b] focus-within:ring-2 focus-within:ring-[#d6b878]/15">
                  <Search
                    size={17}
                    className="shrink-0 text-slate-400"
                  />

                  <input
                    value={draftSearch}
                    onChange={(event) =>
                      setDraftSearch(event.target.value)
                    }
                    placeholder="Search transactions or members..."
                    className="min-w-0 flex-1 bg-transparent text-sm text-[#102b46] outline-none placeholder:text-slate-400"
                  />
                </label>

                <label className="flex h-11 min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 transition focus-within:border-[#102b46] focus-within:ring-2 focus-within:ring-[#102b46]/10">
                  <Filter
                    size={15}
                    className="shrink-0 text-slate-400"
                  />

                  <span className="shrink-0 text-xs font-semibold text-slate-500">
                    Status
                  </span>

                  <span className="relative min-w-0 flex-1">
                    <select
                      aria-label="Filter by payment status"
                      value={status}
                      onChange={(event) => {
                        setStatus(
                          event.target.value as PaymentStatusFilter,
                        );
                        setPage(1);
                      }}
                      className="w-full cursor-pointer appearance-none bg-transparent py-1 pr-5 text-sm font-semibold text-[#102b46] outline-none"
                    >
                      <option value="all">All statuses</option>
                      {STATUS_OPTIONS.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>

                    <ChevronDown
                      size={14}
                      className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                  </span>
                </label>

                <label className="flex h-11 min-w-0 items-center gap-2 rounded-xl border border-[#d6b878]/40 bg-[#f8f3e7] px-3 transition hover:border-[#b99a5b] focus-within:ring-2 focus-within:ring-[#d6b878]/20">
                  <Wallet
                    size={16}
                    className="shrink-0 text-[#76591e]"
                  />

                  <span className="shrink-0 text-xs font-bold text-[#76591e]">
                    Method
                  </span>

                  <span className="relative min-w-0 flex-1">
                    <select
                      aria-label="Filter by payment method"
                      value={method}
                      onChange={(event) => {
                        setMethod(
                          event.target.value as PaymentMethodFilter,
                        );
                        setPage(1);
                      }}
                      className="w-full cursor-pointer appearance-none bg-transparent py-1 pr-5 text-sm font-bold text-[#102b46] outline-none"
                    >
                      <option value="all">All methods</option>
                      {METHOD_OPTIONS.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>

                    <ChevronDown
                      size={14}
                      className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-[#76591e]"
                    />
                  </span>
                </label>

                <button
                  type="submit"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#102b46] px-5 text-sm font-semibold text-white transition hover:bg-[#193c5e]"
                >
                  <Search size={15} />
                  Search
                </button>
              </form>
            </div>

            <div className="relative">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-[#f8fafc]">
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.13em] text-slate-500">
                        Member
                      </th>
                      <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-[0.13em] text-slate-500">
                        Transaction
                      </th>
                      <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-[0.13em] text-slate-500">
                        Amount
                      </th>
                      <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-[0.13em] text-slate-500">
                        Method
                      </th>
                      <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-[0.13em] text-slate-500">
                        Status
                      </th>
                      <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-[0.13em] text-slate-500">
                        Date
                      </th>
                      <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-[0.13em] text-slate-500">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      Array.from({ length: 5 }).map((_, index) => (
                        <tr key={`skeleton-${index}`}>
                          {Array.from({ length: 7 }).map(
                            (_, columnIndex) => (
                              <td
                                key={`skeleton-${index}-${columnIndex}`}
                                className="px-5 py-5"
                              >
                                <div className="h-4 w-24 animate-pulse rounded-md bg-slate-100" />
                              </td>
                            ),
                          )}
                        </tr>
                      ))
                    ) : payments.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-6 py-16 text-center"
                        >
                          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                            {error ? (
                              <AlertCircle size={25} />
                            ) : (
                              <FileSearch size={25} />
                            )}
                          </div>

                          <h4 className="mt-4 text-sm font-bold text-[#102b46]">
                            {error
                              ? "Payments could not be loaded"
                              : "No payment records found"}
                          </h4>

                          <p className="mx-auto mt-1.5 max-w-sm text-sm leading-6 text-slate-500">
                            {error
                              ? "Check your admin session and API connection, then try refreshing."
                              : "There are no payments matching these filters. Try a different status or payment method."}
                          </p>

                          <button
                            type="button"
                            onClick={() =>
                              void Promise.all([
                                loadPayments(),
                                loadOverview(),
                              ])
                            }
                            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#102b46] transition hover:bg-slate-50"
                          >
                            <RefreshCw size={15} />
                            Try again
                          </button>
                        </td>
                      </tr>
                    ) : (
                      payments.map((payment) => {
                        const reviewable = canReviewPayment(payment);

                        return (
                          <tr
                            key={payment._id || payment.id}
                            className="transition hover:bg-[#f8fafc]"
                          >
                            <td className="px-6 py-4">
                              <div className="flex min-w-[200px] items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8eef5] text-sm font-bold text-[#102b46]">
                                  {getMemberName(payment)
                                    .trim()
                                    .charAt(0)
                                    .toUpperCase() || "M"}
                                </div>

                                <div className="min-w-0">
                                  <p className="max-w-[190px] truncate text-sm font-semibold text-[#102b46]">
                                    {getMemberName(payment)}
                                  </p>
                                  <p className="mt-1 max-w-[190px] truncate text-xs text-slate-500">
                                    {getMemberEmail(payment)}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              <div className="min-w-[190px]">
                                <p className="max-w-[220px] truncate font-mono text-xs font-semibold text-[#102b46]">
                                  {getTransactionReference(payment)}
                                </p>
                                <p className="mt-1.5 text-xs text-slate-500">
                                  {getPlanName(payment)}
                                </p>
                              </div>
                            </td>

                            <td className="whitespace-nowrap px-5 py-4">
                              <p className="text-sm font-bold text-[#102b46]">
                                {formatMoney(getAmount(payment))}
                              </p>
                              <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                                {payment.currency || "BDT"}
                              </p>
                            </td>

                            <td className="px-5 py-4">
                              <MethodBadge method={payment.method} />
                            </td>

                            <td className="px-5 py-4">
                              <StatusBadge status={payment.status} />
                            </td>

                            <td className="whitespace-nowrap px-5 py-4">
                              <p className="text-sm font-medium text-slate-700">
                                {formatDate(payment.createdAt)}
                              </p>
                              <p className="mt-1 text-xs text-slate-400">
                                {formatDateTime(payment.createdAt)}
                              </p>
                            </td>

                            <td className="px-6 py-4">
                              <div className="flex min-w-[110px] justify-end">
                                {reviewable ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openReview(payment, "approve")
                                    }
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#d6b878]/40 bg-[#f8f3e7] px-3 py-2 text-xs font-bold text-[#76591e] transition hover:border-[#b99a5b] hover:bg-[#efe3c2]"
                                  >
                                    Review
                                    <ArrowRight size={13} />
                                  </button>
                                ) : (
                                  <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-400">
                                    No action
                                  </span>
                                )}
                              </div>

                              {reviewable && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    openReview(payment, "reject")
                                  }
                                  className="mt-2 block w-full text-right text-[11px] font-medium text-rose-600 transition hover:text-rose-800"
                                >
                                  Reject payment
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col justify-between gap-4 border-t border-slate-200/80 bg-white px-5 py-4 sm:flex-row sm:items-center sm:px-6">
                <p className="text-xs font-medium text-slate-500">
                  {pageTotal === 0 ? (
                    "No results"
                  ) : (
                    <>
                      Showing{" "}
                      <span className="font-bold text-[#102b46]">
                        {(page - 1) * pagination.limit + 1}
                      </span>
                      {" – "}
                      <span className="font-bold text-[#102b46]">
                        {Math.min(
                          page * pagination.limit,
                          pageTotal,
                        )}
                      </span>{" "}
                      of{" "}
                      <span className="font-bold text-[#102b46]">
                        {pageTotal}
                      </span>{" "}
                      payments
                    </>
                  )}
                </p>

                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <span className="text-xs text-slate-500">
                    Page {page} of {pagination.totalPages}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      aria-label="Previous page"
                      disabled={page <= 1 || loading}
                      onClick={() =>
                        setPage((current) => Math.max(1, current - 1))
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft size={17} />
                    </button>

                    <button
                      type="button"
                      aria-label="Next page"
                      disabled={
                        page >= pagination.totalPages || loading
                      }
                      onClick={() =>
                        setPage((current) =>
                          Math.min(
                            pagination.totalPages,
                            current + 1,
                          ),
                        )
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronRight size={17} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <footer className="flex flex-col justify-between gap-2 py-6 text-xs text-slate-400 sm:flex-row sm:items-center">
            <p>Membrix Admin · Payment management</p>
            <p className="flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-[#b99a5b]" />
              Secure admin workspace
            </p>
          </footer>
        </div>
      </main>

      {selectedPayment && reviewAction && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-[#0b1c2e]/60 p-4 backdrop-blur-[3px]">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-review-title"
            className="my-auto w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                    reviewAction === "approve"
                      ? "bg-[#f8f3e7] text-[#76591e]"
                      : "bg-rose-50 text-rose-700"
                  }`}
                >
                  {reviewAction === "approve" ? (
                    <CheckCircle2 size={21} />
                  ) : (
                    <XCircle size={21} />
                  )}
                </div>

                <div>
                  <h2
                    id="payment-review-title"
                    className="text-lg font-bold text-[#102b46]"
                  >
                    {reviewAction === "approve"
                      ? "Approve payment"
                      : "Reject payment"}
                  </h2>

                  <p className="mt-1 text-sm leading-5 text-slate-500">
                    {reviewAction === "approve"
                      ? "Confirm that the manual payment has been verified."
                      : "Record the reason for rejecting this manual payment."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                aria-label="Close review dialog"
                disabled={reviewing}
                onClick={closeReview}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submitReview}>
              <div className="space-y-4 px-5 py-5 sm:px-6">
                <div className="rounded-xl border border-slate-200 bg-[#f8fafc] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-500">
                        Member
                      </p>
                      <p className="mt-1 truncate text-sm font-bold text-[#102b46]">
                        {getMemberName(selectedPayment)}
                      </p>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {getMemberEmail(selectedPayment)}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-medium text-slate-500">
                        Amount
                      </p>
                      <p className="mt-1 whitespace-nowrap text-lg font-bold text-[#102b46]">
                        {formatMoney(getAmount(selectedPayment))}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3">
                    <MethodBadge method={selectedPayment.method} />
                    <StatusBadge status={selectedPayment.status} />
                  </div>

                  <p className="mt-3 break-all font-mono text-[11px] leading-5 text-slate-500">
                    Reference: {getTransactionReference(selectedPayment)}
                  </p>

                  {selectedPayment.payerNumber && (
                    <p className="mt-1 font-mono text-[11px] leading-5 text-slate-500">
                      Payer number: {selectedPayment.payerNumber}
                    </p>
                  )}
                </div>

                {selectedPayment.proofUrl ? (
                  <a
                    href={selectedPayment.proofUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-[#76591e] underline-offset-4 hover:underline"
                  >
                    View payment proof
                    <ArrowRight size={14} />
                  </a>
                ) : (
                  <p className="text-xs text-slate-400">
                    Payment proof: No file attached (proof upload is currently unavailable)
                  </p>
                )}

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[#102b46]">
                    Admin note{" "}
                    <span className="font-normal text-slate-400">
                      (optional)
                    </span>
                  </span>

                  <textarea
                    value={adminNote}
                    onChange={(event) =>
                      setAdminNote(event.target.value)
                    }
                    maxLength={1000}
                    rows={3}
                    placeholder={
                      reviewAction === "approve"
                        ? "Add an internal verification note..."
                        : "Explain why this payment is being rejected..."
                    }
                    className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm leading-6 text-[#102b46] outline-none transition placeholder:text-slate-400 focus:border-[#b99a5b] focus:ring-2 focus:ring-[#d6b878]/15"
                  />

                  <span className="mt-1.5 block text-right text-[11px] text-slate-400">
                    {adminNote.length}/1000 characters
                  </span>
                </label>

                <div
                  className={`rounded-xl border px-3.5 py-3 text-xs leading-5 ${
                    reviewAction === "approve"
                      ? "border-[#d6b878]/40 bg-[#f8f3e7] text-[#76591e]"
                      : "border-rose-200 bg-rose-50 text-rose-800"
                  }`}
                >
                  {reviewAction === "approve" ? (
                    <div className="flex items-start gap-2">
                      <Check size={15} className="mt-0.5 shrink-0" />
                      <p>
                        Approval will mark this payment as completed.
                        The backend must also activate the associated
                        membership.
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <AlertCircle
                        size={15}
                        className="mt-0.5 shrink-0"
                      />
                      <p>
                        Rejection will mark this payment as rejected.
                        Check the transaction reference and payment
                        evidence before proceeding.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-[#fafbfd] px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
                <button
                  type="button"
                  disabled={reviewing}
                  onClick={closeReview}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    reviewing || !canReviewPayment(selectedPayment)
                  }
                  className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    reviewAction === "approve"
                      ? "bg-[#102b46] hover:bg-[#193c5e]"
                      : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  {reviewing ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      Processing...
                    </>
                  ) : reviewAction === "approve" ? (
                    <>
                      <CheckCircle2 size={15} />
                      Confirm approval
                    </>
                  ) : (
                    <>
                      <XCircle size={15} />
                      Confirm rejection
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}