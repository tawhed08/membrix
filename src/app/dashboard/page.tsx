
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  Download,
  ExternalLink,
  House,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  MoreHorizontal,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  UserRound,
  UsersRound,
  X,
  Zap,
} from "lucide-react";
import gsap from "gsap";

type Section = "Overview" | "My Profile" | "My Membership" | "Payments" | "Settings";
type PaymentStatus = "Completed" | "Pending" | "Failed";

type Profile = {
  name: string;
  email: string;
  phone: string;
  organization: string;
  address: string;
  bio: string;
};

const initialProfile: Profile = {
  name: "Alex Morgan",
  email: "alex@example.com",
  phone: "+1 555 010 2020",
  organization: "Morgan Creative Studio",
  address: "New York, United States",
  bio: "Building meaningful connections through community and collaboration.",
};

const payments: {
  id: string;
  description: string;
  date: string;
  amount: number;
  status: PaymentStatus;
  method: string;
}[] = [
  {
    id: "MBX-2026-1042",
    description: "Premium Membership",
    date: "Oct 12, 2026",
    amount: 149,
    status: "Completed",
    method: "Visa •••• 4242",
  },
  {
    id: "MBX-2026-0981",
    description: "Membership Renewal",
    date: "Sep 12, 2026",
    amount: 149,
    status: "Completed",
    method: "Visa •••• 4242",
  },
  {
    id: "MBX-2026-0835",
    description: "Community Event",
    date: "Aug 24, 2026",
    amount: 35,
    status: "Pending",
    method: "Bank transfer",
  },
  {
    id: "MBX-2026-0714",
    description: "Membership Renewal",
    date: "Aug 12, 2026",
    amount: 149,
    status: "Completed",
    method: "Visa •••• 4242",
  },
];

const navigation: { name: Section; icon: typeof LayoutDashboard }[] = [
  { name: "Overview", icon: LayoutDashboard },
  { name: "My Profile", icon: UserRound },
  { name: "My Membership", icon: UsersRound },
  { name: "Payments", icon: CreditCard },
  { name: "Settings", icon: Settings },
];

const money = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);

function StatusBadge({ status }: { status: PaymentStatus }) {
  const styles: Record<PaymentStatus, string> = {
    Completed: "bg-emerald-500/10 text-emerald-600",
    Pending: "bg-amber-500/10 text-amber-600",
    Failed: "bg-red-500/10 text-red-500",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${styles[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

export default function DashboardPage() {
  const [activeSection, setActiveSection] = useState<Section>("Overview");
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [editingProfile, setEditingProfile] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [productUpdates, setProductUpdates] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [saved, setSaved] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const showNotice = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3000);
  }, []);

    useEffect(() => {
    const loadSavedSettings = () => {
      try {
        const storedProfile = localStorage.getItem("membrix-demo-profile");

        if (storedProfile) {
          const parsedProfile: Partial<Profile> = JSON.parse(storedProfile);

          setProfile({ ...initialProfile, ...parsedProfile });
        }

        const storedTheme = localStorage.getItem("membrix-theme");
        const isDark = storedTheme === "dark";

        setDarkMode(isDark);
      } catch {
        // Keep the demo usable if browser storage is unavailable.
      }
    };

    const timeoutId = window.setTimeout(loadSavedSettings, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reduceMotion) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        "[data-dashboard-reveal]",
        { y: 16, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.55,
          stagger: 0.07,
          ease: "power2.out",
          clearProps: "all",
        }
      );
    }, root);

    return () => ctx.revert();
  }, [activeSection]);

  const changeTheme = (nextDark: boolean) => {
    setDarkMode(nextDark);

    const theme = nextDark ? "dark" : "light";
    localStorage.setItem("membrix-theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.classList.toggle("dark", nextDark);
    window.dispatchEvent(new Event("membrix-theme-change"));
    showNotice(`${nextDark ? "Dark" : "Light"} theme selected.`);
  };

  const updateProfile = (field: keyof Profile, value: string) => {
    setProfile((current) => ({ ...current, [field]: value }));
    setSaved(false);
  };

  const saveProfile = () => {
    try {
      localStorage.setItem("membrix-demo-profile", JSON.stringify(profile));
      setEditingProfile(false);
      setSaved(true);
      showNotice("Demo profile saved in this browser.");
    } catch {
      showNotice("Unable to save in this browser.");
    }
  };

  const navigateTo = (section: Section) => {
    setActiveSection(section);
    setMobileMenuOpen(false);
    setSearchQuery("");
  };

  const filteredPayments = payments.filter((payment) =>
    `${payment.id} ${payment.description} ${payment.method} ${payment.status}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  const sidebar = (
    <>
      <div className="flex items-center justify-between px-5 pb-8 pt-5">
        <Link
          href="/"
          className="flex items-center gap-2.5"
          aria-label="Membrix home"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--foreground)] text-[var(--background)]">
            <UsersRound size={21} />
          </span>
          <span className="text-xl font-semibold tracking-tight">membrix<span className="text-teal-600">.</span></span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          className="rounded-lg p-2 lg:hidden"
          aria-label="Close navigation"
        >
          <X size={19} />
        </button>
      </div>

{/* Home navigation */}
<div className="px-4 pb-4">
  <Link
    href="/"
    onClick={() => setMobileMenuOpen(false)}
    className="flex items-center gap-3 rounded-xl border border-[var(--border)] px-3.5 py-3 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface)]"
  >
    <House size={18} strokeWidth={1.8} />
    <span>Home</span>
    <ExternalLink
      size={14}
      className="ml-auto text-[var(--muted-foreground)]"
    />
  </Link>
</div>

      <div className="px-4">

        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
          Workspace
        </p>
        <nav className="space-y-1" aria-label="Dashboard navigation">
          {navigation.map(({ name, icon: Icon }) => {
            const active = activeSection === name;
            return (
              <button
                key={name}
                type="button"
                onClick={() => navigateTo(name)}
                aria-current={active ? "page" : undefined}
                className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm transition-colors ${
                  active
                    ? "bg-[var(--foreground)] font-medium text-[var(--background)]"
                    : "text-[var(--muted-foreground)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                }`}
              >
                <Icon size={18} strokeWidth={1.8} />
                <span>{name}</span>
                {name === "Payments" && (
                  <span className="ml-auto rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-600">
                    1
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-4">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600">
            <Sparkles size={18} />
          </div>
          <p className="text-sm font-semibold">Your community, closer.</p>
          <p className="mt-1.5 text-xs leading-5 text-[var(--muted-foreground)]">
            Stay connected with your Membrix membership.
          </p>
          <button
            type="button"
            onClick={() => navigateTo("My Membership")}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-teal-600"
          >
            View membership <ArrowRight size={13} />
          </button>
        </div>

        <Link
          href="/"
          className="mt-4 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-[var(--muted-foreground)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
        >
          <ExternalLink size={16} /> Back to website
        </Link>
      </div>
    </>
  );

  return (
    <div
      ref={rootRef}
      className="min-h-screen bg-[var(--background)] text-[var(--foreground)]"
    >
      <div className="flex min-h-screen">
        <aside className="hidden w-[250px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--background)] lg:flex">
          {sidebar}
        </aside>

        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/45"
              aria-label="Close navigation overlay"
              onClick={() => setMobileMenuOpen(false)}
            />
            <aside className="relative flex h-full w-[min(300px,86vw)] flex-col border-r border-[var(--border)] bg-[var(--background)] shadow-2xl">
              {sidebar}
            </aside>
          </div>
        )}

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-xl">
            <div className="flex h-[72px] items-center justify-between gap-3 px-4 sm:px-6 xl:px-10">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(true)}
                  className="rounded-xl border border-[var(--border)] p-2.5 lg:hidden"
                  aria-label="Open navigation"
                >
                  <Menu size={18} />
                </button>
                <div className="min-w-0">
                  <p className="truncate text-xs text-[var(--muted-foreground)]">
                    Membrix / Account
                  </p>
                  <h1 className="truncate text-base font-semibold sm:text-lg">
                    {activeSection}
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => changeTheme(!darkMode)}
                  className="rounded-xl border border-[var(--border)] p-2.5 transition-colors hover:bg-[var(--surface)]"
                  aria-label={`Switch to ${darkMode ? "light" : "dark"} theme`}
                  title={`Switch to ${darkMode ? "light" : "dark"} theme`}
                >
                  {darkMode ? <Sun size={17} /> : <Moon size={17} />}
                </button>
                <button
                  type="button"
                  onClick={() => showNotice(notifications ? "You are all caught up." : "Notifications are disabled.")}
                  className="relative rounded-xl border border-[var(--border)] p-2.5 transition-colors hover:bg-[var(--surface)]"
                  aria-label="Notifications"
                >
                  <Bell size={17} />
                  {notifications && (
                    <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-teal-500" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => navigateTo("My Profile")}
                  className="flex items-center gap-2 rounded-full pl-1 transition-opacity hover:opacity-80"
                  aria-label="Open profile"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-600 text-xs font-semibold text-white">
                    {profile.name
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </span>
                  <span className="hidden text-left sm:block">
                    <span className="block max-w-32 truncate text-xs font-semibold">
                      {profile.name}
                    </span>
                    <span className="block text-[10px] text-[var(--muted-foreground)]">
                      Member
                    </span>
                  </span>
                  <ChevronDown size={14} className="hidden text-[var(--muted-foreground)] sm:block" />
                </button>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8 xl:px-10">
            {notice && (
              <div
                role="status"
                className="mb-5 flex items-center gap-2 rounded-xl border border-teal-500/20 bg-teal-500/10 px-4 py-3 text-sm text-teal-700 dark:text-teal-300"
              >
                <CheckCircle2 size={17} /> {notice}
                <button
                  type="button"
                  className="ml-auto rounded-md p-1"
                  onClick={() => setNotice("")}
                  aria-label="Dismiss notification"
                >
                  <X size={15} />
                </button>
              </div>
            )}

            {activeSection === "Overview" && (
              <div className="space-y-7">
                <section
                  data-dashboard-reveal
                  className="relative overflow-hidden rounded-3xl bg-[#102b46] p-6 text-white sm:p-9 xl:p-11"
                >
                  <div className="pointer-events-none absolute -right-16 -top-28 h-72 w-72 rounded-full border border-white/10 sm:h-96 sm:w-96" />
                  <div className="pointer-events-none absolute -right-2 top-12 h-48 w-48 rounded-full border border-white/10 sm:h-64 sm:w-64" />
                  <div className="pointer-events-none absolute bottom-0 right-20 h-36 w-36 rounded-full bg-teal-500/20 blur-3xl" />
                  <div className="relative z-10 max-w-2xl">
                    <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-white/85">
                      <span className="h-1.5 w-1.5 rounded-full bg-teal-300" />
                      Your member space
                    </div>
                    <h2 className="text-3xl font-medium leading-tight tracking-tight sm:text-4xl xl:text-5xl">
                      Welcome back,{" "}
                      <span className="text-teal-300">
                        {profile.name.split(" ")[0] || "Member"}.
                      </span>
                    </h2>
                    <p className="mt-4 max-w-lg text-sm leading-6 text-white/70 sm:text-base sm:leading-7">
                      Your community, membership and account details—all in
                      one place. Let’s keep you connected.
                    </p>
                    <div className="mt-7 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => navigateTo("My Membership")}
                        className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[#102b46] transition-transform hover:-translate-y-0.5"
                      >
                        View membership <ArrowRight size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => navigateTo("My Profile")}
                        className="rounded-xl border border-white/20 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
                      >
                        Edit your profile
                      </button>
                    </div>
                  </div>
                </section>

                <section
                  data-dashboard-reveal
                  className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
                  aria-label="Account summary"
                >
                  {[
                    {
                      label: "Membership status",
                      value: "Active",
                      detail: "Premium member",
                      icon: ShieldCheck,
                      color: "text-emerald-600 bg-emerald-500/10",
                    },
                    {
                      label: "Next renewal",
                      value: "Nov 12",
                      detail: "2026 · Demo date",
                      icon: Activity,
                      color: "text-blue-600 bg-blue-500/10",
                    },
                    {
                      label: "Total payments",
                      value: "4",
                      detail: "Sample transactions",
                      icon: CreditCard,
                      color: "text-violet-600 bg-violet-500/10",
                    },
                    {
                      label: "Member since",
                      value: "Aug 2026",
                      detail: "Demo account",
                      icon: UsersRound,
                      color: "text-teal-600 bg-teal-500/10",
                    },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <article
                        key={item.label}
                        className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs text-[var(--muted-foreground)]">
                              {item.label}
                            </p>
                            <p className="mt-3 text-2xl font-semibold tracking-tight">
                              {item.value}
                            </p>
                            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                              {item.detail}
                            </p>
                          </div>
                          <span className={`rounded-xl p-2.5 ${item.color}`}>
                            <Icon size={19} />
                          </span>
                        </div>
                      </article>
                    );
                  })}
                </section>

                <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
                  <div
                    data-dashboard-reveal
                    className="overflow-hidden rounded-2xl border border-[var(--border)]"
                  >
                    <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4 sm:px-6">
                      <div>
                        <h3 className="text-sm font-semibold">Recent payments</h3>
                        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                          Latest sample transactions
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigateTo("Payments")}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:underline"
                      >
                        View all <ArrowRight size={13} />
                      </button>
                    </div>
                    <div className="divide-y divide-[var(--border)]">
                      {payments.slice(0, 3).map((payment) => (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between gap-3 px-5 py-4 sm:px-6"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface)]">
                              <ArrowDownLeft size={18} className="text-teal-600" />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {payment.description}
                              </p>
                              <p className="mt-1 truncate text-xs text-[var(--muted-foreground)]">
                                {payment.date}
                              </p>
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-semibold">
                              {money(payment.amount)}
                            </p>
                            <div className="mt-1">
                              <StatusBadge status={payment.status} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div
                    data-dashboard-reveal
                    className="rounded-2xl border border-[var(--border)] p-5 sm:p-6"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold">Membership card</h3>
                        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                          Your current plan
                        </p>
                      </div>
                      <span className="rounded-lg bg-teal-500/10 p-2 text-teal-600">
                        <Zap size={18} />
                      </span>
                    </div>
                    <div className="mt-5 rounded-2xl bg-gradient-to-br from-[#102b46] to-[#145c62] p-5 text-white">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs text-white/65">MEMBRIX MEMBERSHIP</p>
                          <p className="mt-2 text-2xl font-semibold">Premium</p>
                        </div>
                        <ShieldCheck size={25} className="text-teal-300" />
                      </div>
                      <div className="mt-9 flex items-end justify-between gap-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-white/60">
                            Member
                          </p>
                          <p className="mt-1 text-sm font-medium">{profile.name}</p>
                        </div>
                        <p className="text-xs text-white/70">MBX •••• 2048</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-sm">
                      <span className="text-[var(--muted-foreground)]">
                        Status
                      </span>
                      <span className="flex items-center gap-1.5 font-medium text-emerald-600">
                        <CheckCircle2 size={15} /> Active (demo)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigateTo("My Membership")}
                      className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-4 py-3 text-sm font-semibold transition-colors hover:bg-[var(--surface)]"
                    >
                      Membership details <ArrowRight size={15} />
                    </button>
                  </div>
                </section>

                <section
                  data-dashboard-reveal
                  className="rounded-2xl border border-[var(--border)] p-5 sm:p-6"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600">
                      <CheckCircle2 size={19} />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold">Complete your profile</h3>
                      <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                        Keep your member information up to date.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigateTo("My Profile")}
                      className="ml-auto rounded-xl bg-[var(--surface)] px-3 py-2 text-xs font-semibold hover:opacity-80"
                    >
                      Review <ArrowRight size={13} className="ml-1 inline" />
                    </button>
                  </div>
                  <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[var(--surface)]">
                    <div className="h-full w-4/5 rounded-full bg-teal-600" />
                  </div>
                  <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                    Profile checklist · Demo progress 80%
                  </p>
                </section>
              </div>
            )}

            {activeSection === "My Profile" && (
              <section data-dashboard-reveal className="mx-auto max-w-4xl space-y-6">
                <div>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Manage your personal information and how you appear to the community.
                  </p>
                </div>

                <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
                  <div className="flex flex-wrap items-center gap-4 border-b border-[var(--border)] p-5 sm:p-7">
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-600 text-lg font-semibold text-white">
                      {profile.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-semibold">{profile.name}</h2>
                      <p className="mt-1 break-all text-sm text-[var(--muted-foreground)]">
                        {profile.email}
                      </p>
                      <p className="mt-2 text-xs text-teal-600">Membrix member</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingProfile((current) => !current);
                        setSaved(false);
                      }}
                      className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--surface)]"
                    >
                      {editingProfile ? "Cancel editing" : "Edit profile"}
                    </button>
                  </div>

                  <form
                    className="grid gap-5 p-5 sm:grid-cols-2 sm:p-7"
                    onSubmit={(event) => {
                      event.preventDefault();
                      saveProfile();
                    }}
                  >
                    {(
                      [
                        ["name", "Full name", "Your full name"],
                        ["email", "Email address", "you@example.com"],
                        ["phone", "Phone number", "+1 555 000 0000"],
                        ["organization", "Organization", "Your organization"],
                        ["address", "Location", "City, Country"],
                      ] as const
                    ).map(([field, label, placeholder]) => (
                      <label key={field} className="block">
                        <span className="mb-2 block text-xs font-medium text-[var(--muted-foreground)]">
                          {label}
                        </span>
                        <input
                          type={field === "email" ? "email" : "text"}
                          value={profile[field]}
                          placeholder={placeholder}
                          readOnly={!editingProfile}
                          required={field === "name" || field === "email"}
                          onChange={(event) => updateProfile(field, event.target.value)}
                          className={`w-full rounded-xl border border-[var(--border)] px-3.5 py-3 text-sm outline-none transition-colors placeholder:text-[var(--muted-foreground)] focus:border-teal-600 ${
                            editingProfile
                              ? "bg-[var(--background)]"
                              : "bg-[var(--surface)]"
                          }`}
                        />
                      </label>
                    ))}

                    <label className="block sm:col-span-2">
                      <span className="mb-2 block text-xs font-medium text-[var(--muted-foreground)]">
                        About me
                      </span>
                      <textarea
                        rows={4}
                        value={profile.bio}
                        readOnly={!editingProfile}
                        onChange={(event) => updateProfile("bio", event.target.value)}
                        className={`w-full resize-y rounded-xl border border-[var(--border)] px-3.5 py-3 text-sm leading-6 outline-none transition-colors focus:border-teal-600 ${
                          editingProfile
                            ? "bg-[var(--background)]"
                            : "bg-[var(--surface)]"
                        }`}
                      />
                    </label>

                    {editingProfile && (
                      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                        <button
                          type="submit"
                          className="inline-flex items-center gap-2 rounded-xl bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-[var(--background)] transition-opacity hover:opacity-85"
                        >
                          <Check size={16} /> Save changes
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setProfile(initialProfile);
                            setEditingProfile(false);
                            showNotice("Demo profile changes discarded.");
                          }}
                          className="rounded-xl border border-[var(--border)] px-5 py-3 text-sm font-medium"
                        >
                          Discard
                        </button>
                      </div>
                    )}
                    {saved && (
                      <p className="text-xs text-emerald-600 sm:col-span-2">
                        Profile saved in this browser.
                      </p>
                    )}
                  </form>
                </div>

                <div className="flex items-start gap-3 rounded-2xl border border-[var(--border)] p-5">
                  <ShieldCheck size={20} className="mt-0.5 shrink-0 text-teal-600" />
                  <div>
                    <h3 className="text-sm font-semibold">Your information</h3>
                    <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">
                      This frontend demo saves profile changes in this browser only.
                      Authentication and server-side profile storage are not connected yet.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {activeSection === "My Membership" && (
              <section data-dashboard-reveal className="mx-auto max-w-5xl space-y-6">
                <p className="text-sm text-[var(--muted-foreground)]">
                  Review your membership plan, included benefits and renewal information.
                </p>

                <div className="relative overflow-hidden rounded-3xl bg-[#102b46] p-6 text-white sm:p-9">
                  <div className="pointer-events-none absolute -right-10 -top-16 h-64 w-64 rounded-full border border-white/10" />
                  <div className="relative z-10 flex flex-wrap items-start justify-between gap-5">
                    <div>
                      <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/15 px-3 py-1.5 text-xs text-emerald-200">
                        <CheckCircle2 size={14} /> Active · Demo status
                      </span>
                      <p className="mt-6 text-xs uppercase tracking-[0.2em] text-white/60">
                        Current plan
                      </p>
                      <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">
                        Premium
                      </h2>
                      <p className="mt-3 max-w-lg text-sm leading-6 text-white/70">
                        A sample membership overview for your Membrix account.
                      </p>
                    </div>
                    <div className="min-w-36 rounded-2xl border border-white/15 bg-white/5 p-4">
                      <p className="text-xs text-white/60">Sample plan price</p>
                      <p className="mt-2 text-3xl font-semibold">$149</p>
                      <p className="mt-1 text-xs text-white/60">per year · demo</p>
                    </div>
                  </div>
                  <div className="relative z-10 mt-8 grid gap-4 border-t border-white/15 pt-5 sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-white/55">Member since</p>
                      <p className="mt-1.5 text-sm font-medium">August 12, 2026</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/55">Next renewal</p>
                      <p className="mt-1.5 text-sm font-medium">November 12, 2026</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/55">Membership ID</p>
                      <p className="mt-1.5 text-sm font-medium">MBX-••••-2048</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-2xl border border-[var(--border)] p-5 sm:p-6">
                    <h3 className="text-sm font-semibold">Plan benefits</h3>
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                      Example benefits for the Premium plan
                    </p>
                    <ul className="mt-5 space-y-4">
                      {[
                        "Access to member community",
                        "Member-only events and updates",
                        "Priority community support",
                        "Membership activity history",
                      ].map((benefit) => (
                        <li key={benefit} className="flex items-center gap-3 text-sm">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-500/10 text-teal-600">
                            <Check size={14} />
                          </span>
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] p-5 sm:p-6">
                    <h3 className="text-sm font-semibold">Membership actions</h3>
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                      Frontend preview actions
                    </p>
                    <div className="mt-5 space-y-3">
                      <button
                        type="button"
                        onClick={() => navigateTo("Payments")}
                        className="flex w-full items-center justify-between rounded-xl border border-[var(--border)] p-4 text-left transition-colors hover:bg-[var(--surface)]"
                      >
                        <span className="flex items-center gap-3">
                          <CreditCard size={18} className="text-teal-600" />
                          <span>
                            <span className="block text-sm font-medium">Payment history</span>
                            <span className="mt-1 block text-xs text-[var(--muted-foreground)]">
                              View sample transactions
                            </span>
                          </span>
                        </span>
                        <ArrowRight size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => showNotice("Renewal management will be connected to the backend later.")}
                        className="flex w-full items-center justify-between rounded-xl border border-[var(--border)] p-4 text-left transition-colors hover:bg-[var(--surface)]"
                      >
                        <span className="flex items-center gap-3">
                          <Activity size={18} className="text-teal-600" />
                          <span>
                            <span className="block text-sm font-medium">Renewal information</span>
                            <span className="mt-1 block text-xs text-[var(--muted-foreground)]">
                              Review your sample renewal date
                            </span>
                          </span>
                        </span>
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {activeSection === "Payments" && (
              <section data-dashboard-reveal className="space-y-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      View your sample transactions and payment methods.
                    </p>
                    <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                      Demo records only · Not connected to a payment gateway
                    </p>
                  </div>
                  <div className="relative w-full sm:w-72">
                    <Search
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
                    />
                    <input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search transactions..."
                      aria-label="Search transactions"
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-teal-600"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    { label: "Total paid", value: money(447), icon: ArrowUpRight },
                    { label: "Completed", value: "3 transactions", icon: CheckCircle2 },
                    { label: "Pending", value: money(35), icon: Activity },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="rounded-2xl border border-[var(--border)] p-5">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-[var(--muted-foreground)]">{item.label}</p>
                          <Icon size={17} className="text-teal-600" />
                        </div>
                        <p className="mt-3 text-2xl font-semibold">{item.value}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
                  <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4 sm:px-6">
                    <div>
                      <h2 className="text-sm font-semibold">Transaction history</h2>
                      <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                        {filteredPayments.length} sample records
                      </p>
                    </div>
                    <MoreHorizontal size={20} className="text-[var(--muted-foreground)]" />
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[680px] text-left">
                      <thead className="bg-[var(--surface)] text-xs text-[var(--muted-foreground)]">
                        <tr>
                          <th className="px-5 py-3.5 font-medium sm:px-6">Transaction</th>
                          <th className="px-5 py-3.5 font-medium">Date</th>
                          <th className="px-5 py-3.5 font-medium">Payment method</th>
                          <th className="px-5 py-3.5 font-medium">Status</th>
                          <th className="px-5 py-3.5 text-right font-medium">Amount</th>
                          <th className="px-5 py-3.5 text-right font-medium">Receipt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)]">
                        {filteredPayments.map((payment) => (
                          <tr key={payment.id} className="transition-colors hover:bg-[var(--surface)]">
                            <td className="px-5 py-4 sm:px-6">
                              <p className="text-sm font-medium">{payment.description}</p>
                              <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                                {payment.id}
                              </p>
                            </td>
                            <td className="whitespace-nowrap px-5 py-4 text-xs text-[var(--muted-foreground)]">
                              {payment.date}
                            </td>
                            <td className="px-5 py-4 text-xs">{payment.method}</td>
                            <td className="px-5 py-4">
                              <StatusBadge status={payment.status} />
                            </td>
                            <td className="px-5 py-4 text-right text-sm font-semibold">
                              {money(payment.amount)}
                            </td>
                            <td className="px-5 py-4 text-right">
                              <button
                                type="button"
                                onClick={() =>
                                  showNotice(
                                    `Demo receipt selected for ${payment.id}. Real receipts require backend integration.`
                                  )
                                }
                                aria-label={`View demo receipt for ${payment.id}`}
                                className="rounded-lg border border-[var(--border)] p-2 transition-colors hover:bg-[var(--background)]"
                              >
                                <Download size={15} />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {filteredPayments.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-5 py-12 text-center text-sm text-[var(--muted-foreground)]">
                              No transactions match “{searchQuery}”.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}

            {activeSection === "Settings" && (
              <section data-dashboard-reveal className="mx-auto max-w-4xl space-y-6">
                <p className="text-sm text-[var(--muted-foreground)]">
                  Adjust the appearance and preferences of your member experience.
                </p>

                <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
                  <div className="border-b border-[var(--border)] p-5 sm:px-6">
                    <h2 className="text-sm font-semibold">Appearance</h2>
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                      Choose how Membrix looks on this device.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:px-6">
                    <div className="flex items-center gap-3">
                      <span className="rounded-xl bg-[var(--surface)] p-3">
                        {darkMode ? <Moon size={19} /> : <Sun size={19} />}
                      </span>
                      <div>
                        <p className="text-sm font-medium">Theme preference</p>
                        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                          {darkMode ? "Dark appearance" : "Light appearance"}
                        </p>
                      </div>
                    </div>
                    <div className="flex rounded-xl border border-[var(--border)] p-1">
                      <button
                        type="button"
                        onClick={() => changeTheme(false)}
                        aria-pressed={!darkMode}
                        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
                          !darkMode ? "bg-[var(--foreground)] text-[var(--background)]" : "text-[var(--muted-foreground)]"
                        }`}
                      >
                        <Sun size={14} /> Light
                      </button>
                      <button
                        type="button"
                        onClick={() => changeTheme(true)}
                        aria-pressed={darkMode}
                        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
                          darkMode ? "bg-[var(--foreground)] text-[var(--background)]" : "text-[var(--muted-foreground)]"
                        }`}
                      >
                        <Moon size={14} /> Dark
                      </button>
                    </div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
                  <div className="border-b border-[var(--border)] p-5 sm:px-6">
                    <h2 className="text-sm font-semibold">Notifications</h2>
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                      Control which demo notification preferences are enabled.
                    </p>
                  </div>

                  {[
                    {
                      title: "Account notifications",
                      description: "Membership reminders and account activity.",
                      checked: notifications,
                      setChecked: setNotifications,
                    },
                    {
                      title: "Product updates",
                      description: "News about features and community updates.",
                      checked: productUpdates,
                      setChecked: setProductUpdates,
                    },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="flex items-center justify-between gap-4 border-b border-[var(--border)] p-5 last:border-b-0 sm:px-6"
                    >
                      <div>
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">
                          {item.description}
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={item.checked}
                        aria-label={item.title}
                        onClick={() => {
                          item.setChecked(!item.checked);
                          showNotice(`${item.title} ${!item.checked ? "enabled" : "disabled"}.`);
                        }}
                        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                          item.checked ? "bg-teal-600" : "bg-[var(--border)]"
                        }`}
                      >
                        <span
                          className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                            item.checked ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
                  <div className="border-b border-[var(--border)] p-5 sm:px-6">
                    <h2 className="text-sm font-semibold">Account & privacy</h2>
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                      Account security controls will connect when authentication is implemented.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => showNotice("Password management will be connected to the authentication backend later.")}
                    className="flex w-full items-center justify-between gap-4 border-b border-[var(--border)] p-5 text-left transition-colors hover:bg-[var(--surface)] sm:px-6"
                  >
                    <span className="flex items-center gap-3">
                      <ShieldCheck size={19} className="text-teal-600" />
                      <span>
                        <span className="block text-sm font-medium">Password & security</span>
                        <span className="mt-1 block text-xs text-[var(--muted-foreground)]">
                          Manage your login security
                        </span>
                      </span>
                    </span>
                    <ArrowRight size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => showNotice("Account deletion is unavailable in this frontend demo.")}
                    className="flex w-full items-center justify-between gap-4 p-5 text-left transition-colors hover:bg-red-500/5 sm:px-6"
                  >
                    <span className="flex items-center gap-3">
                      <LogOut size={19} className="text-red-500" />
                      <span>
                        <span className="block text-sm font-medium">Account actions</span>
                        <span className="mt-1 block text-xs text-[var(--muted-foreground)]">
                          Sensitive actions require backend verification
                        </span>
                      </span>
                    </span>
                    <ArrowRight size={16} />
                  </button>
                </div>

                <p className="text-xs leading-5 text-[var(--muted-foreground)]">
                  Demo settings are not an authentication or authorization system.
                  Secure account actions will require server-side implementation.
                </p>
              </section>
            )}

            <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-5 text-xs text-[var(--muted-foreground)]">
              <p>© 2026 Membrix. Member workspace.</p>
              <div className="flex items-center gap-4">
                <Link href="/contact" className="hover:text-[var(--foreground)]">
                  Help & support
                </Link>
                <Link href="/" className="hover:text-[var(--foreground)]">
                  Main website
                </Link>
              </div>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}
