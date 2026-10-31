
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

import { useRouter } from "next/navigation";

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

  Printer,
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
  FileBadge,
} from "lucide-react";
import gsap from "gsap";

type Section = "Overview" | "My Profile" | "My Membership" | "Payments" | "Settings";
type PaymentStatus = "Completed" | "Pending" | "Failed";
type PaymentRecord = {
  id: string;
  amount: number;
  currency: string;
  method: "bkash" | "nagad" | "bank" | "online";
  status:
    | "pending"
    | "processing"
    | "completed"
    | "rejected"
    | "failed"
    | "refunded";
  transactionId: string | null;
  gatewayTransactionId: string | null;
  membershipId: string | null;
  planName: string;
  createdAt: string;
};

type Profile = {
  name: string;
  email: string;
  phone: string;
  organization: string;
  address: string;
  bio: string;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "member" | "admin";
  isActive: boolean;
};
type MembershipPlanData = {
  name: string;
  slug: string;
  price: number;
  billingType: "yearly" | "one_time";
  durationDays: number | null;
  features: string[];
};

type UserMembership = {
  membershipId: string;
  status: "pending" | "active" | "expired" | "cancelled";
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  plan: MembershipPlanData | null;
};
const initialProfile: Profile = {
  name: "",
  email: "",
  phone: "",
  organization: "",
  address: "",
  bio: "",
};

const payments: {
  id: string;
  description: string;
  date: string;
  amount: number;
  status: PaymentStatus;
  method: string;
}[] = [];

const navigation: { name: Section; icon: typeof LayoutDashboard }[] = [
  { name: "Overview", icon: LayoutDashboard },
  { name: "My Profile", icon: UserRound },
  { name: "My Membership", icon: UsersRound },
  { name: "Payments", icon: CreditCard },
  { name: "Settings", icon: Settings },
];

const money = (amount: number) =>
  `৳${new Intl.NumberFormat("en-BD", {
    maximumFractionDigits: 0,
  }).format(amount)}`;

function StatusBadge({ status }: { status: PaymentStatus }) {
  const statusStyles: Record<PaymentStatus, string> = {
    Completed: "bg-emerald-100 text-emerald-700",
    Pending: "bg-amber-100 text-[var(--dark-muted)]",
    Failed: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

export default function DashboardPage() {
  const router = useRouter();
const [authLoading, setAuthLoading] = useState(true);
const [authUser, setAuthUser] = useState<AuthUser | null>(null);
const [memberships, setMemberships] = useState<UserMembership[]>([]);
const [payments, setPayments] = useState<PaymentRecord[]>([]);
const [paymentLoading, setPaymentLoading] = useState(true);
const [paymentError, setPaymentError] = useState("");
const [membershipLoading, setMembershipLoading] = useState(true);
const [membershipError, setMembershipError] = useState("");
const [loggingOut, setLoggingOut] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>("Overview");
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [editingProfile, setEditingProfile] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [productUpdates, setProductUpdates] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<
  "All" | PaymentStatus
>("All");
  const [notice, setNotice] = useState("");
  const [saved, setSaved] = useState(false);
  const [certificateOpen, setCertificateOpen] = useState(false);
  const [certificateLoading, setCertificateLoading] = useState(false);
const [certificateError, setCertificateError] = useState("");
const [certificateData, setCertificateData] = useState<{
  certificateId: string;
  status: string;
  issuedAt: string;
  verificationUrl: string;
  qrCode: string;
  membership: {
    membershipId: string;
    plan: string;
    startDate: string | null;
    endDate: string | null;
  };
} | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const showNotice = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3000);
  }, []);
  


  
  useEffect(() => {
  let cancelled = false;

  async function verifySession() {
    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        router.replace("/login");
        return;
      }

      const payload = await response.json();
      const user = payload?.user ?? payload?.data?.user;

      if (!user || !(user.id || user._id) || !user.email) {
        router.replace("/login");
        return;
      }

      if (!cancelled) {
        setAuthUser({
          id: String(user.id ?? user._id),
          name: String(user.name),
          email: String(user.email),
          role: user.role === "admin" ? "admin" : "member",
          isActive: user.isActive !== false,
        });

        setProfile((current) => ({
          ...current,
          name: String(user.name),
          email: String(user.email),
        }));
      }
    } catch {
      router.replace("/login");
    } finally {
      if (!cancelled) setAuthLoading(false);
    }
  }

  void verifySession();

  return () => {
    cancelled = true;
  };
}, [router]);
 useEffect(() => {
  if (authLoading || !authUser) return;

  let cancelled = false;

  async function loadMemberships() {
    setMembershipLoading(true);
    setMembershipError("");

    try {
      const response = await fetch(`${API_URL}/api/memberships/me`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const payload: unknown = await response.json();

      if (
        typeof payload !== "object" ||
        payload === null
      ) {
        throw new Error("Invalid membership response.");
      }

      const data = payload as {
        success?: unknown;
        memberships?: unknown;
        message?: unknown;
      };

      if (
        !response.ok ||
        data.success !== true ||
        !Array.isArray(data.memberships)
      ) {
        throw new Error(
          typeof data.message === "string"
            ? data.message
            : "Unable to load membership information.",
        );
      }

      if (!cancelled) {
        setMemberships(data.memberships as UserMembership[]);
      }
    } catch (error) {
      if (!cancelled) {
        setMembershipError(
          error instanceof Error
            ? error.message
            : "Unable to load membership information.",
        );
      }
    } finally {
      if (!cancelled) {
        setMembershipLoading(false);
      }
    }
  }

  void loadMemberships();

  return () => {
    cancelled = true;
  };
}, [authUser, authLoading]);
useEffect(() => {
  if (authLoading || !authUser) return;

  let cancelled = false;

  async function loadPayments() {
    setPaymentLoading(true);
    setPaymentError("");

    try {
      const response = await fetch(`${API_URL}/api/payments/me`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const payload: unknown = await response.json();

      if (typeof payload !== "object" || payload === null) {
        throw new Error("Invalid payment response.");
      }

      const data = payload as {
        success?: unknown;
        payments?: unknown;
        message?: unknown;
      };

      if (
        !response.ok ||
        data.success !== true ||
        !Array.isArray(data.payments)
      ) {
        throw new Error(
          typeof data.message === "string"
            ? data.message
            : "Unable to load payment history.",
        );
      }

      if (!cancelled) {
        setPayments(data.payments as PaymentRecord[]);
      }
    } catch (error) {
      if (!cancelled) {
        setPaymentError(
          error instanceof Error
            ? error.message
            : "Unable to load payment history.",
        );
      }
    } finally {
      if (!cancelled) {
        setPaymentLoading(false);
      }
    }
  }

  void loadPayments();

  return () => {
    cancelled = true;
  };
}, [authUser, authLoading]);
useEffect(() => {
  if (authLoading || !authUser) return;

  let cancelled = false;

  async function loadPayments() {
    setPaymentLoading(true);
    setPaymentError("");

    try {
      const response = await fetch(`${API_URL}/api/payments/me`, {
        credentials: "include",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || data.success !== true) {
        throw new Error(data.message || "Unable to load payments.");
      }

      if (!cancelled) {
        setPayments(data.payments);
      }
    } catch (error) {
      if (!cancelled) {
        setPaymentError(
          error instanceof Error ? error.message : "Unable to load payments.",
        );
      }
    } finally {
      if (!cancelled) setPaymentLoading(false);
    }
  }

  void loadPayments();

  return () => {
    cancelled = true;
  };
}, [authUser, authLoading]);
const handleDownloadCertificatePDF = async () => {
  
  const certificateElement = document.getElementById(
    "membership-certificate",
  );

  if (!certificateElement) {
    showNotice("Certificate is not available.");
    return;
  }

  try {
    await document.fonts.ready;

    const images = Array.from(
      certificateElement.querySelectorAll("img"),
    );

    await Promise.all(
      images.map(async (image) => {
        if (!image.complete) {
          await new Promise<void>((resolve) => {
            image.onload = () => resolve();
            image.onerror = () => resolve();
          });
        }
      }),
    );

   const canvas = await html2canvas(certificateElement, {
  scale: 3,
  useCORS: true,
  backgroundColor: "#ffffff",
  logging: false,
  onclone: (clonedDocument) => {
    const clonedCertificate =
      clonedDocument.getElementById("membership-certificate");

    if (!clonedCertificate) return;

    const elements = [
      clonedCertificate,
      ...Array.from(clonedCertificate.querySelectorAll("*")),
    ];

    elements.forEach((element) => {
      const htmlElement = element as HTMLElement;

      htmlElement.style.setProperty("color", "#29251f");
      htmlElement.style.setProperty("background-color", "#ffffff");
      htmlElement.style.setProperty("border-color", "#b89450");
    });
  },
});

    const imageData = canvas.toDataURL("image/png");

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 8;

    const availableWidth = pageWidth - margin * 2;
    const availableHeight = pageHeight - margin * 2;

    const ratio = Math.min(
      availableWidth / canvas.width,
      availableHeight / canvas.height,
    );

    const width = canvas.width * ratio;
    const height = canvas.height * ratio;

    pdf.addImage(
      imageData,
      "PNG",
      (pageWidth - width) / 2,
      (pageHeight - height) / 2,
      width,
      height,
    );

    pdf.save(
      `${certificateData?.certificateId || "Membrix-Certificate"}.pdf`,
    );

    showNotice("Certificate PDF downloaded successfully.");
  } catch (error) {
    console.error("Certificate PDF error:", error);
    showNotice("Unable to download certificate PDF.");
  }
};
const handleGenerateCertificate = async () => {
  const activeMembership = memberships.find(
    (membership) => membership.status === "active",
  );

  if (!activeMembership) {
    setCertificateError(
      "You need an active membership to generate a certificate.",
    );
    setCertificateData(null);
    setCertificateOpen(true);
    return;
  }

  setCertificateLoading(true);
  setCertificateError("");
  setCertificateData(null);
  setCertificateOpen(true);

  try {
    const response = await fetch(
      `${API_URL}/api/certificates/generate`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          membershipId: activeMembership.membershipId,
        }),
      },
    );

    const data = await response.json();

    if (!response.ok || !data.success || !data.certificate) {
      throw new Error(
        data.message || "Unable to generate certificate.",
      );
    }

    setCertificateData(data.certificate);
  } catch (error) {
    setCertificateError(
      error instanceof Error
        ? error.message
        : "Unable to generate certificate.",
    );
  } finally {
    setCertificateLoading(false);
  }
};
const handleLogout = async () => {
  if (loggingOut) return;

  setLoggingOut(true);

  try {
    await fetch(`${API_URL}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // Continue to login.
  } finally {
    localStorage.removeItem("membrix-demo-profile");
    setAuthUser(null);
    router.replace("/login");
    router.refresh();
  }
};
    useEffect(() => {
    const loadSavedSettings = () => {
      try {
       const storedProfile = localStorage.getItem("membrix-demo-profile");

if (storedProfile) {
  const parsedProfile: Partial<Profile> = JSON.parse(storedProfile);

  const isOldDemoProfile =
    parsedProfile.name === "Alex Morgan" ||
    parsedProfile.email === "alex@example.com" ||
    parsedProfile.organization === "Morgan Creative Studio" ||
    parsedProfile.address === "New York, United States";

  if (isOldDemoProfile) {
    localStorage.removeItem("membrix-demo-profile");
  } else {
    setProfile((current) => ({
      ...current,
      ...parsedProfile,
      name: current.name,
      email: current.email,
    }));
  }
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
const totalPaid = payments
  .filter((payment) => payment.status === "completed")
  .reduce((total, payment) => total + payment.amount, 0);

const completedCount = payments.filter(
  (payment) => payment.status === "completed"
).length;

const pendingAmount = payments
  .filter((payment) =>
    ["pending", "processing"].includes(payment.status),
  )
  .reduce((total, payment) => total + payment.amount, 0);

const filteredPayments = payments.filter((payment) => {
  const query = searchQuery.trim().toLowerCase();

  const statusLabel =
    payment.status.charAt(0).toUpperCase() +
    payment.status.slice(1);

  const matchesSearch =
    `${payment.id} ${payment.transactionId ?? ""} ${payment.planName} ${payment.method} ${statusLabel}`
      .toLowerCase()
      .includes(query);

  const matchesStatus =
    paymentStatusFilter === "All" ||
    statusLabel === paymentStatusFilter;

  return matchesSearch && matchesStatus;
});
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
          <span className="text-xl font-semibold tracking-tight">membrix<span className="text-[var(--gold)]">.</span></span>
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
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--gold)]/10 text-[var(--gold)]">
            <Sparkles size={18} />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
  Your community, closer.
</h2>

<p className="mt-2 text-sm leading-6 text-[var(--muted)]">
  Stay connected with your Membrix membership.
</p>
         <button
  type="button"
  onClick={() => navigateTo("My Membership")}
  className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[var(--gold)] px-4 py-3 text-xs font-semibold text-black transition-opacity hover:opacity-90"
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

    if (authLoading || !authUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
        <p className="text-sm text-[var(--muted-foreground)]">
          Checking your Membrix account...
        </p>
      </div>
    );
  }
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
                    <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[var(--gold)]" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => navigateTo("My Profile")}
                  className="flex items-center gap-2 rounded-full pl-1 transition-opacity hover:opacity-80"
                  aria-label="Open profile"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--gold)] text-xs font-semibold text-white">
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
                className="mb-5 flex items-center gap-2 rounded-xl border border-[var(--gold)]/20 bg-[var(--gold)]/10 px-4 py-3 text-sm text-[var(--gold)] dark:text-[var(--gold-bright)]"
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
                  className="relative overflow-hidden rounded-3xl bg-[var(--dark-panel)] p-6 text-white sm:p-9 xl:p-11"
                >
                  <div className="pointer-events-none absolute -right-16 -top-28 h-72 w-72 rounded-full border border-white/10 sm:h-96 sm:w-96" />
                  <div className="pointer-events-none absolute -right-2 top-12 h-48 w-48 rounded-full border border-white/10 sm:h-64 sm:w-64" />
                  <div className="pointer-events-none absolute bottom-0 right-20 h-36 w-36 rounded-full bg-[var(--gold)]/20 blur-3xl" />
                  <div className="relative z-10 max-w-2xl">
                    <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-white/85">
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--gold-bright)]" />
                      Your member space
                    </div>
                    <h2 className="text-3xl font-medium leading-tight tracking-tight sm:text-4xl xl:text-5xl">
                      Welcome back,{" "}
                      <span className="text-[var(--gold-bright)]">
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
                        className="inline-flex items-center gap-2 rounded-xl bg-[var(--gold)] px-4 py-3 text-sm font-semibold text-black transition-transform hover:-translate-y-0.5"
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
                      color: "text-[var(--gold)] bg-[var(--gold)]/10",
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
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--gold)] hover:underline"
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
                              <ArrowDownLeft size={18} className="text-[var(--gold)]" />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {payment.planName}
                              </p>
                              <p className="mt-1 truncate text-xs text-[var(--muted-foreground)]">
                                {new Date(payment.createdAt).toLocaleDateString("en-BD")}
                              </p>
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-semibold">
                              {money(payment.amount)}
                            </p>
                            <div className="mt-1">
                              <StatusBadge
  status={
    payment.status === "completed"
      ? "Completed"
      : ["pending", "processing"].includes(payment.status)
        ? "Pending"
        : "Failed"
  }
/>
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
                      <span className="rounded-lg bg-[var(--gold)]/10 p-2 text-[var(--gold)]">
                        <Zap size={18} />
                      </span>
                    </div>
                    <div className="mt-5 rounded-2xl bg-gradient-to-br from-[var(--dark-panel)] to-[var(--dark-panel-alt)] p-5 text-white">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs text-white/65">MEMBRIX MEMBERSHIP</p>
                          <p className="mt-2 text-2xl font-semibold">Premium</p>
                        </div>
                        <ShieldCheck size={25} className="text-[var(--gold-bright)]" />
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
                 <button
  type="button"
 onClick={handleGenerateCertificate}
  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--gold)] px-4 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90"
>
  <FileBadge size={16} />
  View Membership Certificate
</button>
                  </div>
                </section>

                <section
                  data-dashboard-reveal
                  className="rounded-2xl border border-[var(--border)] p-5 sm:p-6"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--gold)]/10 text-[var(--gold)]">
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
                    <div className="h-full w-4/5 rounded-full bg-[var(--gold)]" />
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
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--gold)] text-lg font-semibold text-white">
                      {profile.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-semibold">{profile.name}</h2>
                      <p className="mt-1 break-all text-sm text-[var(--muted-foreground)]">
                        {profile.email}
                      </p>
                      <p className="mt-2 text-xs text-[var(--gold)]">Membrix member</p>
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
                          className={`w-full rounded-xl border border-[var(--border)] px-3.5 py-3 text-sm outline-none transition-colors placeholder:text-[var(--muted-foreground)] focus:border-[var(--gold)] ${
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
                        className={`w-full resize-y rounded-xl border border-[var(--border)] px-3.5 py-3 text-sm leading-6 outline-none transition-colors focus:border-[var(--gold)] ${
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
  setProfile(() => {
    try {
      const stored = localStorage.getItem("membrix-demo-profile");
      return stored
        ? { ...initialProfile, ...JSON.parse(stored) }
        : initialProfile;
    } catch {
      return initialProfile;
    }
  });
  setEditingProfile(false);
  setSaved(false);
  showNotice("Unsaved profile changes discarded.");
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
                  <ShieldCheck size={20} className="mt-0.5 shrink-0 text-[var(--gold)]" />
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
  <section
    data-dashboard-reveal
    className="mx-auto max-w-5xl space-y-6"
  >
    <div>
      <h2 className="text-xl font-semibold">My Membership</h2>
      <p className="mt-2 text-sm text-[var(--muted-foreground)]">
        Your membership information from your Membrix account.
      </p>
    </div>

    {membershipLoading ? (
      <div className="rounded-2xl border border-[var(--border)] p-8 text-center">
        <p className="text-sm text-[var(--muted-foreground)]">
          Loading your membership...
        </p>
      </div>
    ) : membershipError ? (
      <div
        role="alert"
        className="rounded-2xl border border-red-500/30 p-6"
      >
        <h3 className="font-semibold">Unable to load membership</h3>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          {membershipError}
        </p>
      </div>
    ) : memberships.length === 0 ? (
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center sm:p-12">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--gold)]/10 text-[var(--gold)]">
          <UsersRound size={26} />
        </div>

        <h3 className="mt-5 text-xl font-semibold">
          No membership yet
        </h3>

        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--muted-foreground)]">
          Your account does not have a membership record yet.
          Explore the available plans to get started.
        </p>

        <Link
          href="/membership"
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--gold)] px-5 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90"
        >
          Explore membership plans
          <ArrowRight size={17} />
        </Link>
      </div>
    ) : (
      <>
        <div className="space-y-5">
          {memberships.map((membership) => {
            const plan = membership.plan;

            const statusStyles: Record<
              UserMembership["status"],
              string
            > = {
              active:
                "bg-emerald-400/15 text-emerald-600 dark:text-emerald-300",
              pending:
                "bg-amber-400/15 text-amber-700 dark:text-amber-300",
              expired:
                "bg-slate-400/15 text-slate-600 dark:text-slate-300",
              cancelled:
                "bg-red-400/15 text-red-600 dark:text-red-300",
            };

            const formatDate = (value: string | null) => {
              if (!value) return "—";

              const date = new Date(value);

              if (Number.isNaN(date.getTime())) return "—";

              return date.toLocaleDateString("en-BD", {
                day: "numeric",
                month: "short",
                year: "numeric",
              });
            };

            const statusLabel =
              membership.status.charAt(0).toUpperCase() +
              membership.status.slice(1);

            return (
              <article
                key={membership.membershipId}
                className="relative overflow-hidden rounded-3xl bg-[var(--dark-panel)] p-6 text-white sm:p-9"
              >
                <div className="pointer-events-none absolute -right-10 -top-16 h-64 w-64 rounded-full border border-white/10" />

                <div className="relative z-10 flex flex-wrap items-start justify-between gap-6">
                  <div className="min-w-0">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${statusStyles[membership.status]}`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {statusLabel}
                    </span>

                    <p className="mt-6 text-xs uppercase tracking-[0.2em] text-white/60">
                      Membership plan
                    </p>

                    <h3 className="mt-2 break-words text-3xl font-semibold sm:text-4xl">
                      {plan?.name ?? "Plan information unavailable"}
                    </h3>

                    <p className="mt-3 max-w-lg text-sm leading-6 text-white/70">
                      {plan?.billingType === "one_time"
                        ? "One-time membership"
                        : plan
                          ? "Yearly membership"
                          : "Plan details could not be loaded."}
                    </p>
                  </div>

                  <div className="min-w-36 rounded-2xl border border-white/15 bg-white/5 p-4">
                    <p className="text-xs text-white/60">
                      Plan price
                    </p>
                    <p className="mt-2 text-3xl font-semibold">
                      {plan ? money(plan.price) : "—"}
                    </p>
                    <p className="mt-1 text-xs text-white/60">
                      {plan?.billingType === "one_time"
                        ? "One-time"
                        : plan
                          ? "Per year"
                          : "Unavailable"}
                    </p>
                  </div>
                </div>

                <div className="relative z-10 mt-8 grid gap-5 border-t border-white/15 pt-5 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-white/55">
                      Member since
                    </p>
                    <p className="mt-1.5 text-sm font-medium">
                      {formatDate(membership.startDate)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-white/55">
                      Membership expiry
                    </p>
                    <p className="mt-1.5 text-sm font-medium">
                      {membership.endDate
                        ? formatDate(membership.endDate)
                        : plan?.billingType === "one_time"
                          ? "No expiry"
                          : membership.status === "pending"
                            ? "Not started"
                            : "Not set"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-white/55">
                      Membership ID
                    </p>
                    <p className="mt-1.5 break-all text-sm font-medium">
                      {membership.membershipId}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-[var(--border)] p-5 sm:p-6">
            <h3 className="text-sm font-semibold">Plan benefits</h3>

            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              Benefits from your recorded membership plan.
            </p>

            <ul className="mt-5 space-y-4">
              {(
                memberships.find((item) => item.status === "active")
                  ?.plan?.features ??
                memberships[0]?.plan?.features ??
                []
              ).length > 0 ? (
                (
                  memberships.find((item) => item.status === "active")
                    ?.plan?.features ??
                  memberships[0]?.plan?.features ??
                  []
                ).map((benefit) => (
                  <li
                    key={benefit}
                    className="flex items-start gap-3 text-sm"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--gold)]/10 text-[var(--gold)]">
                      <Check size={14} />
                    </span>
                    <span>{benefit}</span>
                  </li>
                ))
              ) : (
                <li className="text-sm text-[var(--muted-foreground)]">
                  No plan benefits are available.
                </li>
              )}
            </ul>
          </div>

          <div className="rounded-2xl border border-[var(--border)] p-5 sm:p-6">
            <h3 className="text-sm font-semibold">
              Membership actions
            </h3>

            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              Manage your membership information.
            </p>

            <div className="mt-5 space-y-3">
              <button
                type="button"
                onClick={() => navigateTo("Payments")}
                className="flex w-full items-center justify-between rounded-xl border border-[var(--border)] p-4 text-left transition-colors hover:bg-[var(--surface)]"
              >
                <span className="flex items-center gap-3">
                  <CreditCard
                    size={18}
                    className="text-[var(--gold)]"
                  />
                  <span>
                    <span className="block text-sm font-medium">
                      Payment history
                    </span>
                    <span className="mt-1 block text-xs text-[var(--muted-foreground)]">
                      View your recorded payments
                    </span>
                  </span>
                </span>
                <ArrowRight size={16} />
              </button>

              <Link
                href="/membership"
                className="flex w-full items-center justify-between rounded-xl border border-[var(--border)] p-4 text-left transition-colors hover:bg-[var(--surface)]"
              >
                <span className="flex items-center gap-3">
                  <Activity
                    size={18}
                    className="text-[var(--gold)]"
                  />
                  <span>
                    <span className="block text-sm font-medium">
                      Membership plans
                    </span>
                    <span className="mt-1 block text-xs text-[var(--muted-foreground)]">
                      Review the available plans
                    </span>
                  </span>
                </span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </>
    )}
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
<div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
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
      className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[var(--gold)]"
    />
  </div>

  <select
    value={paymentStatusFilter}
    onChange={(event) =>
      setPaymentStatusFilter(
        event.target.value as "All" | PaymentStatus
      )
    }
    aria-label="Filter payments by status"
    className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)] sm:w-40"
  >
    <option value="All">All statuses</option>
    <option value="Completed">Completed</option>
    <option value="Pending">Pending</option>
    <option value="Failed">Failed</option>
  </select>
</div>

                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    { label: "Total paid", value: money(totalPaid), icon: ArrowUpRight },
{ label: "Completed", value: `${completedCount} transactions`, icon: CheckCircle2 },
{ label: "Pending", value: money(pendingAmount), icon: Activity },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="rounded-2xl border border-[var(--border)] p-5">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-[var(--muted-foreground)]">{item.label}</p>
                          <Icon size={17} className="text-[var(--gold)]" />
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
                              <p className="text-sm font-medium">{payment.planName}</p>
                              <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                                {payment.id}
                              </p>
                            </td>
                            <td className="whitespace-nowrap px-5 py-4 text-xs text-[var(--muted-foreground)]">
                              {new Date(payment.createdAt).toLocaleDateString("en-BD")}
                            </td>
                            <td className="px-5 py-4 text-xs capitalize">
  {payment.method === "online" ? "AamarPay" : payment.method}
</td>
                            <td className="px-5 py-4">
                              <StatusBadge
  status={
    payment.status === "completed"
      ? "Completed"
      : ["pending", "processing"].includes(payment.status)
        ? "Pending"
        : "Failed"
  }
/>
                            </td>
                           <td className="px-5 py-4 text-right text-xs text-[var(--muted-foreground)]">
  —
</td>
                          </tr>
                        ))}
                       {filteredPayments.length === 0 && (
  <tr>
    <td
      colSpan={6}
      className="px-5 py-12 text-center"
    >
      <div className="mx-auto flex max-w-sm flex-col items-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--muted-foreground)]">
          <Search size={20} />
        </span>

        <p className="mt-3 text-sm font-semibold">
          No transactions found
        </p>

        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
          Try a different search term or select another payment status.
        </p>

        <button
          type="button"
          onClick={() => {
            setSearchQuery("");
            setPaymentStatusFilter("All");
          }}
          className="mt-4 rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold transition-colors hover:bg-[var(--surface)]"
        >
          Clear filters
        </button>
      </div>
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
                          item.checked ? "bg-[var(--gold)]" : "bg-[var(--border)]"
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
                      <ShieldCheck size={19} className="text-[var(--gold)]" />
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
                    onClick={handleLogout}
disabled={loggingOut}
                    className="flex w-full items-center justify-between gap-4 p-5 text-left transition-colors hover:bg-red-500/5 sm:px-6"
                  >
                    <span className="flex items-center gap-3">
                      <LogOut size={19} className="text-red-500" />
                      <span>
                        <span className="block text-sm font-medium">
  {loggingOut ? "Signing out..." : "Sign out"}
</span>
                        <span className="mt-1 block text-xs text-[var(--muted-foreground)]">
                          Sign out of your Membrix account
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

{certificateOpen && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="membership-certificate-title"
      className="my-auto w-full max-w-4xl overflow-hidden rounded-2xl bg-[var(--dark-panel)] text-[var(--dark-text)] shadow-2xl"
    >
      <div className="flex items-center justify-between gap-4 bg-[var(--dark-panel)] px-5 py-4 text-white sm:px-8">
        <div>
          <p className="text-xs font-bold tracking-[0.3em] text-[var(--gold-bright)]">
            MEMBRIX
          </p>
          <p className="mt-1 text-xs text-white/60">
            Member workspace · Membership certificate
          </p>
        </div>
        <ShieldCheck className="h-8 w-8 text-[var(--gold-bright)]" />
      </div>

      <div className="bg-[var(--surface)] p-3 text-[var(--foreground)] sm:p-6">
        {certificateLoading ? (
          <div className="flex min-h-[350px] flex-col items-center justify-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--gold)]/20 border-t-[var(--gold)]" />
            <p className="text-sm font-medium">
              Generating your certificate...
            </p>
          </div>
        ) : certificateError ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
            <ShieldCheck className="mb-4 h-12 w-12 text-[var(--gold)]" />
            <h2 className="text-xl font-semibold">
              Certificate unavailable
            </h2>
            <p className="mt-3 max-w-md text-sm text-[var(--muted-foreground)]">
              {certificateError}
            </p>
            <button
              type="button"
              onClick={() => setCertificateOpen(false)}
              className="mt-6 rounded-xl bg-[var(--gold)] px-5 py-2.5 text-sm font-semibold text-black"
            >
              Close
            </button>
          </div>
        ) : certificateData ? (
          <>
            <div
              id="membership-certificate"
              className="relative border-2 border-[var(--gold)] bg-[var(--surface)] p-5 sm:p-9"
            >
              <div className="pointer-events-none absolute inset-2 border border-[var(--gold)]/20" />

              <div className="relative text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-2 border-[var(--gold)] text-[var(--gold)]">
                  <FileBadge size={25} />
                </div>

                <p className="mt-4 text-xs font-bold tracking-[0.35em] text-[var(--gold)]">
                  MEMBRIX MEMBERSHIP
                </p>

                <h2
                  id="membership-certificate-title"
                  className="mt-3 font-serif text-2xl font-bold tracking-wide text-[var(--foreground)] sm:text-4xl"
                >
                  Certificate of Membership
                </h2>

                <div className="mx-auto mt-4 h-1 w-20 rounded-full bg-[var(--gold)]" />

                <p className="mt-5 text-sm text-[var(--muted-foreground)]">
                  This certificate is presented to
                </p>

                <h3 className="mt-2 break-words text-2xl font-semibold text-[var(--foreground)] sm:text-3xl">
                  {profile.name || "Membrix Member"}
                </h3>

                <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--muted-foreground)]">
                  In recognition of their membership and participation in the Membrix community.
                </p>

                <div className="mt-7 grid grid-cols-1 gap-3 text-left sm:grid-cols-3">
                  <div className="border-t-2 border-[var(--gold)] bg-[var(--surface-alt)] p-3">
                    <p className="text-[10px] font-bold tracking-wider text-[var(--muted-foreground)]">
                      MEMBERSHIP ID
                    </p>
                    <p className="mt-1 break-all text-sm font-semibold text-[var(--foreground)]">
                      {certificateData.membership.membershipId}
                    </p>
                  </div>

                  <div className="border-t-2 border-[var(--gold)] bg-[var(--surface-alt)] p-3">
                    <p className="text-[10px] font-bold tracking-wider text-[var(--muted-foreground)]">
                      MEMBERSHIP TYPE
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
                      {certificateData.membership.plan}
                    </p>
                  </div>

                  <div className="border-t-2 border-[var(--gold)] bg-[var(--surface-alt)] p-3">
                    <p className="text-[10px] font-bold tracking-wider text-[var(--muted-foreground)]">
                      CERTIFICATE STATUS
                    </p>
                    <p className="mt-1 text-sm font-semibold text-emerald-600">
                      {certificateData.status.toUpperCase()}
                    </p>
                  </div>
                </div>

                <div className="mt-7 flex flex-col items-center justify-between gap-6 border-t border-[var(--border)] pt-5 sm:flex-row">
                  <div className="text-center sm:text-left">
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Certificate reference
                    </p>
                    <p className="mt-1 break-all text-sm font-semibold text-[var(--foreground)]">
                      {certificateData.certificateId}
                    </p>
                    <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                      Issued:{" "}
                      {new Date(certificateData.issuedAt).toLocaleDateString("en-GB")}
                    </p>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="rounded-xl border border-[var(--gold)]/30 bg-white p-2">
                    <Image
  src={certificateData.qrCode}
  alt="Certificate verification QR code"
  width={112}
  height={112}
  unoptimized
  className="h-28 w-28"
/>
                    </div>
                    <p className="mt-2 text-[10px] font-semibold tracking-wider text-[var(--muted-foreground)]">
                      SCAN TO VERIFY
                    </p>
                  </div>

                  <div className="text-center">
                    <div className="mx-auto w-32 border-b border-[var(--border)] pb-2 font-serif italic text-[var(--foreground)]">
                      Membrix
                    </div>
                    <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                      Authorized signature
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-4 text-center text-xs text-[var(--muted-foreground)]">
              Verify this certificate by scanning the QR code.
            </p>



 <div className="mt-6 flex flex-col gap-4 border-t border-[var(--border)] pt-5 print:hidden">
  <div>
    <p className="text-sm font-semibold text-[var(--foreground)]">
      Certificate actions
    </p>
    <p className="mt-1 text-xs text-[var(--muted-foreground)]">
      Print your certificate or download a PDF copy.
    </p>
  </div>

  <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-6 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-alt)]"
    >
      <Printer size={17} />
      Print Certificate
    </button>

    <button
      type="button"
      onClick={handleDownloadCertificatePDF}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--gold)] px-6 py-3 text-sm font-semibold text-black transition hover:opacity-90"
    >
      <Download size={17} />
      Download PDF
    </button>

    <button
      type="button"
      onClick={() => setCertificateOpen(false)}
      className="rounded-xl border border-[var(--border)] px-6 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-alt)]"
    >
      Close
    </button>
  </div>
</div>
          </>
        ) : null}
      </div>
    </section>
  </div>
)}

        </main>
      </div>
    </div>
  );
}
