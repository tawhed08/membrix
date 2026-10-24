"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  Building2,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
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

type MemberStatusFilter = "all" | "active" | "inactive";

type AdminMember = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  membershipCount: number;
  activeMembershipCount: number;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type MembersResponse = {
  success: boolean;
  message?: string;
  data?: {
    members: AdminMember[];
    pagination: Pagination;
    filters: {
      search: string;
      status: MemberStatusFilter;
    };
  };
};

const EMPTY_PAGINATION: Pagination = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-BD").format(value);
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

  if (!parts.length) {
    return "MB";
  }

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export default function AdminMembersPage() {
  const router = useRouter();
  const pageRef = useRef<HTMLDivElement>(null);

  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [pagination, setPagination] =
    useState<Pagination>(EMPTY_PAGINATION);

  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [status, setStatus] =
    useState<MemberStatusFilter>("all");

  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadMembers() {
      try {
        const authResponse = await fetch(
          `${API_URL}/api/auth/me`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          },
        );

        if (authResponse.status === 401) {
          router.replace("/login");
          return;
        }

        const authData =
          (await authResponse.json()) as AuthResponse;

        if (
          !authResponse.ok ||
          !authData.success ||
          !authData.user
        ) {
          throw new Error(
            authData.message || "Unable to verify your account.",
          );
        }

        if (authData.user.role !== "admin") {
          router.replace("/dashboard");
          return;
        }

        const params = new URLSearchParams({
          page: String(page),
          limit: "10",
          status,
        });

        if (activeSearch) {
          params.set("search", activeSearch);
        }

        const response = await fetch(
          `${API_URL}/api/admin/members?${params.toString()}`,
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

        const result =
          (await response.json()) as MembersResponse;

        if (response.status === 403) {
          throw new Error(
            "You do not have permission to manage members.",
          );
        }

        if (
          !response.ok ||
          !result.success ||
          !result.data
        ) {
          throw new Error(
            result.message || "Unable to load members.",
          );
        }

        if (cancelled) {
          return;
        }

        setAdmin(authData.user);
        setMembers(result.data.members);
        setPagination(result.data.pagination);
      } catch (err: unknown) {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Unable to connect to the Membrix API.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadMembers();

    return () => {
      cancelled = true;
    };
  }, [router, page, status, activeSearch, reloadKey]);

  useEffect(() => {
    if (loading || error || !pageRef.current) {
      return;
    }

    const context = gsap.context(() => {
      gsap.fromTo(
        ".member-reveal",
        {
          y: 12,
          opacity: 0,
        },
        {
          y: 0,
          opacity: 1,
          duration: 0.45,
          stagger: 0.04,
          ease: "power2.out",
          clearProps: "transform",
        },
      );
    }, pageRef);

    return () => context.revert();
  }, [loading, error, members]);

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextSearch = searchInput.trim();

    if (nextSearch.length > 100) {
      setError("Search text must not exceed 100 characters.");
      return;
    }

    setError("");
    setLoading(true);
    setPage(1);

    if (nextSearch === activeSearch && page === 1) {
      setReloadKey((current) => current + 1);
    } else {
      setActiveSearch(nextSearch);
    }
  }

  function handleStatusChange(
    nextStatus: MemberStatusFilter,
  ) {
    setError("");
    setLoading(true);
    setPage(1);

    if (nextStatus === status && page === 1) {
      setReloadKey((current) => current + 1);
    } else {
      setStatus(nextStatus);
    }
  }

  function handlePageChange(nextPage: number) {
    const totalPages = Math.max(1, pagination.totalPages);

    if (
      nextPage < 1 ||
      nextPage > totalPages ||
      nextPage === page
    ) {
      return;
    }

    setError("");
    setLoading(true);
    setPage(nextPage);
  }

  function handleRefresh() {
    setError("");
    setLoading(true);
    setReloadKey((current) => current + 1);
  }

  async function handleLogout() {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);

    try {
      const response = await fetch(
        `${API_URL}/api/auth/logout`,
        {
          method: "POST",
          credentials: "include",
        },
      );

      if (!response.ok) {
        setError("Unable to confirm sign out. Please try again.");
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

  const activeAccounts = members.filter(
    (member) => member.isActive,
  ).length;

  const inactiveAccounts = members.filter(
    (member) => !member.isActive,
  ).length;

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
                <Building2 size={21} />
              </span>

              <span>
                <span className="block text-xl font-semibold">
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
                className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm text-white/65 transition hover:bg-white/5 hover:text-white"
              >
                <LayoutDashboard size={18} />
                Overview
              </Link>

              <Link
                href="/admin/members"
                aria-current="page"
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/10 px-3.5 py-3 text-sm font-medium text-white"
              >
                <Users size={18} className="text-[#e6ca8b]" />
                Members
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#e6ca8b]" />
              </Link>

              <Link
                href="/admin/payments"
                className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm text-white/65 transition hover:bg-white/5 hover:text-white"
              >
                <Wallet size={18} />
                Payments
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
              Back to website
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
                Member information is fetched from the protected
                administration API.
              </p>
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
                    Member management
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
                  {loggingOut ? "Signing out..." : "Sign out"}
                </button>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[1600px] px-5 py-7 sm:px-8 sm:py-9 xl:px-10">
            {/* Page heading */}
            <section className="member-reveal mb-8">
              <Link
                href="/admin"
                className="mb-5 inline-flex items-center gap-2 text-xs text-[var(--muted)] transition hover:text-[var(--foreground)]"
              >
                <ArrowLeft size={14} />
                Back to overview
              </Link>

              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
                <div>
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#d6b878]/25 bg-[#d6b878]/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#a98843]">
                    <Users size={13} />
                    Member directory
                  </div>

                  <h1 className="text-3xl font-semibold tracking-tight sm:text-[38px]">
                    Member management
                  </h1>

                  <p className="mt-2.5 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                    Search your community, review account status and
                    understand each member&apos;s membership activity.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={loading}
                  className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-medium transition hover:border-[#d6b878]/60 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw
                    size={15}
                    className={loading ? "animate-spin" : ""}
                  />
                  Refresh list
                </button>
              </div>
            </section>

            {/* Summary */}
            <section className="member-reveal mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-[var(--muted)]">
                    Total members
                  </p>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d6b878]/15 text-[#a98843]">
                    <Users size={19} />
                  </span>
                </div>

                <p className="mt-4 text-3xl font-semibold tracking-tight">
                  {formatNumber(pagination.total)}
                </p>

                <p className="mt-1.5 text-xs text-[var(--muted)]">
                  Matching registered members
                </p>
              </article>

              <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-[var(--muted)]">
                    Active accounts
                  </p>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                    <BadgeCheck size={19} />
                  </span>
                </div>

                <p className="mt-4 text-3xl font-semibold tracking-tight">
                  {loading ? "—" : formatNumber(activeAccounts)}
                </p>

                <p className="mt-1.5 text-xs text-[var(--muted)]">
                  On the current results page
                </p>
              </article>

              <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-[var(--muted)]">
                    Inactive accounts
                  </p>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-500/10 text-slate-500">
                    <UserRound size={19} />
                  </span>
                </div>

                <p className="mt-4 text-3xl font-semibold tracking-tight">
                  {loading ? "—" : formatNumber(inactiveAccounts)}
                </p>

                <p className="mt-1.5 text-xs text-[var(--muted)]">
                  On the current results page
                </p>
              </article>
            </section>

            {/* Directory */}
            <section className="member-reveal overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
              <div className="border-b border-[var(--border)] p-5 sm:p-6">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight">
                      All members
                    </h2>

                    <p className="mt-1.5 text-sm text-[var(--muted)]">
                      Search by name or email and filter by account status.
                    </p>
                  </div>

                  <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 text-[11px] font-medium text-emerald-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Secure API
                  </span>
                </div>

                <div className="mt-6 flex flex-col gap-3 lg:flex-row">
                  <form
                    onSubmit={handleSearch}
                    className="flex min-w-0 flex-1 gap-2"
                  >
                    <div className="flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 transition focus-within:border-[#b99a5b]">
                      <Search
                        size={17}
                        className="shrink-0 text-[var(--muted)]"
                      />

                      <input
                        type="search"
                        value={searchInput}
                        onChange={(event) =>
                          setSearchInput(event.target.value)
                        }
                        maxLength={100}
                        placeholder="Search name or email..."
                        aria-label="Search members by name or email"
                        className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--muted)]"
                      />

                      {searchInput && (
                        <button
                          type="button"
                          aria-label="Clear search"
                          onClick={() => setSearchInput("")}
                          className="shrink-0 rounded-md p-1 text-[var(--muted)] hover:text-[var(--foreground)]"
                        >
                          <X size={15} />
                        </button>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#102b46] px-4 text-sm font-medium text-white transition hover:bg-[#183c5e] disabled:opacity-60"
                    >
                      <Search size={15} />
                      Search
                    </button>
                  </form>

                  <label className="flex h-11 items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 lg:w-[210px]">
                    <span className="shrink-0 text-xs text-[var(--muted)]">
                      Status
                    </span>

                    <select
                      aria-label="Filter by account status"
                      value={status}
                      onChange={(event) =>
                        handleStatusChange(
                          event.target.value as MemberStatusFilter,
                        )
                      }
                      className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                    >
                      <option value="all">All accounts</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </label>
                </div>

                {activeSearch && (
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                    <span>Search results for</span>

                    <span className="rounded-md bg-[var(--background)] px-2 py-1 font-medium text-[var(--foreground)]">
                      {activeSearch}
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        setSearchInput("");
                        setActiveSearch("");
                        setPage(1);
                        setLoading(true);
                        setError("");
                      }}
                      className="font-medium text-[#a98843] hover:underline"
                    >
                      Clear filter
                    </button>
                  </div>
                )}
              </div>

              {error && (
                <div
                  role="alert"
                  className="mx-5 mt-5 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4 sm:mx-6"
                >
                  <AlertCircle
                    size={19}
                    className="mt-0.5 shrink-0 text-red-500"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      Unable to load member list
                    </p>

                    <p className="mt-1 text-sm leading-5 text-[var(--muted)]">
                      {error}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleRefresh}
                    className="shrink-0 text-xs font-semibold text-[#a98843] hover:underline"
                  >
                    Retry
                  </button>
                </div>
              )}

              {loading ? (
                <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 px-5 py-12">
                  <RefreshCw
                    size={26}
                    className="animate-spin text-[#b99a5b]"
                  />

                  <p className="text-sm text-[var(--muted)]">
                    Loading members...
                  </p>
                </div>
              ) : members.length === 0 ? (
                <div className="flex min-h-[300px] flex-col items-center justify-center px-5 py-12 text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--background)] text-[var(--muted)]">
                    <Users size={24} />
                  </span>

                  <h3 className="mt-4 text-sm font-semibold">
                    No members found
                  </h3>

                  <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">
                    Try another search term or change the account
                    status filter.
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput("");
                      setActiveSearch("");
                      setStatus("all");
                      setPage(1);
                      setLoading(true);
                      setError("");
                      setReloadKey((current) => current + 1);
                    }}
                    className="mt-5 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium transition hover:bg-[var(--background)]"
                  >
                    Reset filters
                  </button>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[850px] text-left text-sm">
                      <thead className="border-b border-[var(--border)] bg-[var(--background)]/70 text-[10px] font-semibold uppercase tracking-[0.13em] text-[var(--muted)]">
                        <tr>
                          <th className="px-5 py-4 font-medium sm:px-6">
                            Member
                          </th>

                          <th className="px-5 py-4 font-medium">
                            Account status
                          </th>

                          <th className="px-5 py-4 font-medium">
                            Memberships
                          </th>

                          <th className="px-5 py-4 font-medium">
                            Active memberships
                          </th>

                          <th className="px-5 py-4 font-medium">
                            Joined
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-[var(--border)]">
                        {members.map((member) => (
                          <tr
                            key={member.id}
                            className="member-reveal transition-colors hover:bg-[var(--background)]/70"
                          >
                            <td className="px-5 py-4 sm:px-6">
                              <div className="flex min-w-0 items-center gap-3">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#d6b878]/20 bg-[#d6b878]/10 text-xs font-semibold text-[#a98843]">
                                  {getInitials(member.name)}
                                </span>

                                <div className="min-w-0">
                                  <p className="truncate font-medium">
                                    {member.name}
                                  </p>

                                  <p className="mt-1 truncate text-xs text-[var(--muted)]">
                                    {member.email}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              {member.isActive ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-medium text-emerald-600 ring-1 ring-inset ring-emerald-500/15">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-500/10 px-2.5 py-1.5 text-[11px] font-medium text-slate-500 ring-1 ring-inset ring-slate-500/15">
                                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                                  Inactive
                                </span>
                              )}
                            </td>

                            <td className="px-5 py-4">
                              <span className="inline-flex min-w-8 items-center justify-center rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium">
                                {formatNumber(member.membershipCount)}
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              <span className="inline-flex items-center gap-1.5 text-sm">
                                <BadgeCheck
                                  size={15}
                                  className={
                                    member.activeMembershipCount > 0
                                      ? "text-emerald-600"
                                      : "text-[var(--muted)]"
                                  }
                                />

                                {formatNumber(
                                  member.activeMembershipCount,
                                )}
                              </span>
                            </td>

                            <td className="whitespace-nowrap px-5 py-4 text-xs text-[var(--muted)]">
                              {formatDate(member.createdAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-col justify-between gap-4 border-t border-[var(--border)] px-5 py-4 sm:flex-row sm:items-center sm:px-6">
                    <p className="text-xs leading-5 text-[var(--muted)]">
                      Showing{" "}
                      <span className="font-medium text-[var(--foreground)]">
                        {pagination.total === 0
                          ? 0
                          : (pagination.page - 1) * pagination.limit + 1}
                      </span>
                      {" – "}
                      <span className="font-medium text-[var(--foreground)]">
                        {Math.min(
                          pagination.page * pagination.limit,
                          pagination.total,
                        )}
                      </span>
                      {" of "}
                      <span className="font-medium text-[var(--foreground)]">
                        {formatNumber(pagination.total)}
                      </span>{" "}
                      members
                    </p>

                    <div className="flex items-center gap-2">
                      <span className="mr-2 text-xs text-[var(--muted)]">
                        Page {pagination.page} of{" "}
                        {Math.max(1, pagination.totalPages)}
                      </span>

                      <button
                        type="button"
                        aria-label="Previous page"
                        disabled={page <= 1 || loading}
                        onClick={() => handlePageChange(page - 1)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] transition hover:bg-[var(--background)] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ChevronLeft size={17} />
                      </button>

                      <button
                        type="button"
                        aria-label="Next page"
                        disabled={
                          loading ||
                          pagination.totalPages === 0 ||
                          page >= pagination.totalPages
                        }
                        onClick={() => handlePageChange(page + 1)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] transition hover:bg-[var(--background)] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ChevronRight size={17} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </section>

            <footer className="mt-8 flex flex-col justify-between gap-2 border-t border-[var(--border)] pt-5 text-xs text-[var(--muted)] sm:flex-row">
              <p>© 2026 Membrix Administration</p>
              <p>Member information from the protected API.</p>
            </footer>
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
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm text-white/70 transition hover:bg-white/5 hover:text-white"
              >
                <LayoutDashboard size={18} />
                Overview
              </Link>

              <Link
                href="/admin/members"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/10 px-3.5 py-3 text-sm font-medium"
              >
                <Users size={18} className="text-[#e6ca8b]" />
                Members
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#e6ca8b]" />
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