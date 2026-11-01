"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import ProfilePhotoEditor from "@/components/profile-photo-editor";
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
  Eye,
  EyeOff,
  ExternalLink,
  FileBadge,
  House,
  KeyRound,
  LayoutDashboard,
  LogOut,
  LockKeyhole,
  Menu,
  Moon,
  MoreHorizontal,
  Palette,
  Printer,
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

type Section =
  | "Overview"
  | "My Profile"
  | "My Membership"
  | "Payments"
  | "Settings";

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
  profileImage: string;
};

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

type CertificateData = {
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
};

type NotificationRecord = {
  _id: string;
  type: string;
  title: string;
  message: string;
  reminderKey: string;
  relatedType: string;
  relatedId: string;
  certificateId: string | null;
  membershipId: string | null;
  expiresAt: string | null;
  daysRemaining: number | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
};

type SettingsSection =
  | "Account"
  | "Security"
  | "Appearance"
  | "Notifications"
  | "Privacy";

type NotificationPreferences = {
  email: boolean;
  inApp: boolean;
  certificateExpiry: boolean;
};

const defaultNotificationPreferences: NotificationPreferences = {
  email: true,
  inApp: true,
  certificateExpiry: true,
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const initialProfile: Profile = {
  name: "",
  email: "",
  phone: "",
  organization: "",
  address: "",
  bio: "",
  profileImage: "",
};

const navigation: {
  name: Section;
  icon: typeof LayoutDashboard;
}[] = [
  { name: "Overview", icon: LayoutDashboard },
  { name: "My Profile", icon: UserRound },
  { name: "My Membership", icon: UsersRound },
  { name: "Payments", icon: CreditCard },
  { name: "Settings", icon: Settings },
];

const money = (amount: number) =>
  `৳${new Intl.NumberFormat("en-BD", {
    maximumFractionDigits: 0,
  }).format(amount || 0)}`;

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

const getPaymentStatus = (
  status: PaymentRecord["status"],
): PaymentStatus => {
  if (status === "completed") return "Completed";

  if (status === "pending" || status === "processing") {
    return "Pending";
  }

  return "Failed";
};

function StatusBadge({ status }: { status: PaymentStatus }) {
  const statusStyles: Record<PaymentStatus, string> = {
    Completed: "bg-emerald-100 text-emerald-700",
    Pending: "bg-amber-100 text-amber-700",
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
  const rootRef = useRef<HTMLDivElement>(null);

  // Authentication
  const [authLoading, setAuthLoading] = useState(true);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  // Membership
  const [memberships, setMemberships] = useState<UserMembership[]>([]);
  const [membershipLoading, setMembershipLoading] = useState(true);
  const [membershipError, setMembershipError] = useState("");

  // Payments
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [paymentLoading, setPaymentLoading] = useState(true);
  const [paymentError, setPaymentError] = useState("");

  // Profile
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [savedProfile, setSavedProfile] =
    useState<Profile>(initialProfile);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Dashboard UI
  const [activeSection, setActiveSection] =
    useState<Section>("Overview");
  const [darkMode, setDarkMode] = useState(false);
  const [activeSettingsSection, setActiveSettingsSection] =
    useState<SettingsSection>("Account");
  const [notificationPreferences, setNotificationPreferences] =
    useState<NotificationPreferences>(defaultNotificationPreferences);
  const [preferencesLoading, setPreferencesLoading] = useState(false);
  const [preferencesError, setPreferencesError] = useState("");
  const [preferenceSaving, setPreferenceSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState("");
  const [passwordFeedbackError, setPasswordFeedbackError] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] =
    useState<"All" | PaymentStatus>("All");
  const [notice, setNotice] = useState("");
  const [notificationList, setNotificationList] = useState<
    NotificationRecord[]
  >([]);
  const [notificationLoading, setNotificationLoading] =
    useState(false);
  const [notificationMenuOpen, setNotificationMenuOpen] =
    useState(false);

  // Certificate
  const [certificateOpen, setCertificateOpen] = useState(false);
  const [certificateLoading, setCertificateLoading] = useState(false);
  const [certificateError, setCertificateError] = useState("");
  const [certificateData, setCertificateData] =
    useState<CertificateData | null>(null);

  const showNotice = useCallback((message: string) => {
    setNotice(message);

    window.setTimeout(() => {
      setNotice("");
    }, 3000);
  }, []);

  // --------------------------------------------------
  // 1. VERIFY SESSION AND LOAD REAL DATABASE PROFILE
  // --------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function verifySession() {
      try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
          method: "GET",
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

        if (cancelled) return;

      const loadedProfile: Profile = {
  name: String(user.name ?? ""),
  email: String(user.email ?? ""),
  phone: String(user.phone ?? ""),
  organization: String(user.organization ?? ""),
  address: String(user.address ?? ""),
  bio: String(user.bio ?? ""),
  profileImage: String(user.profileImage ?? ""),
};
        setAuthUser({
          id: String(user.id ?? user._id),
          name: loadedProfile.name,
          email: loadedProfile.email,
          role: user.role === "admin" ? "admin" : "member",
          isActive: user.isActive !== false,
        });

        setProfile(loadedProfile);
        setSavedProfile(loadedProfile);
      } catch {
        router.replace("/login");
      } finally {
        if (!cancelled) {
          setAuthLoading(false);
        }
      }
    }

    void verifySession();

    return () => {
      cancelled = true;
    };
  }, [router]);

  // --------------------------------------------------
  // 2. LOAD MEMBERSHIPS FROM BACKEND
  // --------------------------------------------------

  useEffect(() => {
    if (authLoading || !authUser) return;

    let cancelled = false;

    async function loadMemberships() {
      setMembershipLoading(true);
      setMembershipError("");

      try {
        const response = await fetch(
          `${API_URL}/api/memberships/me`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          },
        );

        const payload = await response.json();

        if (
          !response.ok ||
          payload.success !== true ||
          !Array.isArray(payload.memberships)
        ) {
          throw new Error(
            payload.message ||
              "Unable to load membership information.",
          );
        }

        if (!cancelled) {
          setMemberships(payload.memberships);
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

  // --------------------------------------------------
  // 3. LOAD PAYMENTS FROM BACKEND
  // --------------------------------------------------

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

        const payload = await response.json();

        if (
          !response.ok ||
          payload.success !== true ||
          !Array.isArray(payload.payments)
        ) {
          throw new Error(
            payload.message || "Unable to load payment history.",
          );
        }

        if (!cancelled) {
          setPayments(payload.payments);
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

  // --------------------------------------------------
  // 4. LOAD NOTIFICATIONS FROM BACKEND
  // --------------------------------------------------

  useEffect(() => {
    if (authLoading || !authUser) return;

    let cancelled = false;

    async function loadNotifications() {
      setNotificationLoading(true);

      try {
        const response = await fetch(
          `${API_URL}/api/notifications/me`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          },
        );

        const payload = await response.json();

        if (!response.ok || payload.success !== true) {
          throw new Error(
            payload.message || "Unable to load notifications.",
          );
        }

        if (!cancelled) {
          setNotificationList(Array.isArray(payload.notifications) ? payload.notifications : []);
        }
      } catch {
        if (!cancelled) {
          setNotificationList([]);
        }
      } finally {
        if (!cancelled) {
          setNotificationLoading(false);
        }
      }
    }

    void loadNotifications();

    return () => {
      cancelled = true;
    };
  }, [authUser, authLoading]);

  useEffect(() => {
    if (authLoading || !authUser) return;

    let cancelled = false;

    async function loadPreferences() {
      setPreferencesLoading(true);
      setPreferencesError("");

      try {
        const response = await fetch(`${API_URL}/api/auth/preferences`, {
          credentials: "include",
          cache: "no-store",
        });
        const payload = await response.json();

        if (!response.ok || payload.success !== true || !payload.preferences) {
          throw new Error(
            payload.message || "Unable to load notification preferences.",
          );
        }

        const preferences = payload.preferences;
        if (!cancelled) {
          setNotificationPreferences({
            email: preferences.email !== false,
            inApp: preferences.inApp !== false,
            certificateExpiry: preferences.certificateExpiry !== false,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setPreferencesError(
            error instanceof Error
              ? error.message
              : "Unable to load notification preferences.",
          );
        }
      } finally {
        if (!cancelled) setPreferencesLoading(false);
      }
    }

    void loadPreferences();
    return () => {
      cancelled = true;
    };
  }, [authUser, authLoading]);

  // --------------------------------------------------
  // 4. LOAD THEME SETTINGS
  // --------------------------------------------------

  useEffect(() => {
    const syncTheme = () => {
      const isDark =
        document.documentElement.dataset.theme === "dark" ||
        document.documentElement.classList.contains("dark");

      setDarkMode(isDark);
    };

    syncTheme();

    window.addEventListener("membrix-theme-change", syncTheme);

    return () => {
      window.removeEventListener(
        "membrix-theme-change",
        syncTheme,
      );
    };
  }, []);
  // --------------------------------------------------
  // 5. GSAP ANIMATION
  // --------------------------------------------------

  useEffect(() => {
    const root = rootRef.current;

    if (!root) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
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
        },
      );
    }, root);

    return () => ctx.revert();
  }, [activeSection]);

  useGSAP(
    () => {
      if (activeSection !== "Settings") return;
      const motion = gsap.matchMedia();
      motion.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          "[data-settings-transition]",
          { y: 10, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            duration: 0.3,
            ease: "power2.out",
            clearProps: "all",
          },
        );
      });
      return () => motion.revert();
    },
    {
      scope: rootRef,
      dependencies: [activeSection, activeSettingsSection],
      revertOnUpdate: true,
    },
  );

  // --------------------------------------------------
  // 6. THEME
  // --------------------------------------------------

  const changeTheme = (nextDark: boolean) => {
    setDarkMode(nextDark);

    const theme = nextDark ? "dark" : "light";

    try {
      localStorage.setItem("membrix-theme", theme);
    } catch {
      // Theme changes still apply for the current page when storage is unavailable.
    }
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.classList.toggle("dark", nextDark);

    window.dispatchEvent(new Event("membrix-theme-change"));

    showNotice(`${nextDark ? "Dark" : "Light"} theme selected.`);
  };

  // --------------------------------------------------
  // 7. PROFILE UPDATE
  // --------------------------------------------------

  const updateProfile = (field: keyof Profile, value: string) => {
    setProfile((current) => ({
      ...current,
      [field]: value,
    }));

    setSaved(false);
  };

  const saveProfile = async () => {
    if (profileSaving) return;

    if (!profile.name.trim()) {
      showNotice("Please enter your full name.");
      return;
    }

    setProfileSaving(true);

    try {
      const response = await fetch(
        `${API_URL}/api/auth/profile`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: profile.name.trim(),
            phone: profile.phone.trim(),
            organization: profile.organization.trim(),
            address: profile.address.trim(),
            bio: profile.bio.trim(),
          }),
        },
      );

      const payload = await response.json();

      if (
        !response.ok ||
        payload.success !== true ||
        !payload.user
      ) {
        throw new Error(
          payload.message || "Unable to update your profile.",
        );
      }

      const user = payload.user;

    const updatedProfile: Profile = {
  name: String(user.name ?? ""),
  email: String(user.email ?? profile.email),
  phone: String(user.phone ?? ""),
  organization: String(user.organization ?? ""),
  address: String(user.address ?? ""),
  bio: String(user.bio ?? ""),
  profileImage: String(
    user.profileImage ?? profile.profileImage ?? "",
  ),
};

      setProfile(updatedProfile);
      setSavedProfile(updatedProfile);

      setAuthUser((current) =>
        current
          ? {
              ...current,
              name: updatedProfile.name,
            }
          : current,
      );

      setEditingProfile(false);
      setSaved(true);

      showNotice("Profile updated successfully.");
    } catch (error) {
      showNotice(
        error instanceof Error
          ? error.message
          : "Unable to save profile. Please try again.",
      );
    } finally {
      setProfileSaving(false);
    }
  };

  const discardProfileChanges = () => {
    setProfile(savedProfile);
    setEditingProfile(false);
    setSaved(false);

    showNotice("Unsaved profile changes discarded.");
  };

  const saveNotificationPreferences = async (
    nextPreferences: NotificationPreferences,
  ) => {
    if (preferenceSaving || preferencesLoading || preferencesError) return;

    setPreferenceSaving(true);
    setPreferencesError("");
    try {
      const response = await fetch(`${API_URL}/api/auth/preferences`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: nextPreferences }),
      });
      const payload = await response.json();

      if (
        !response.ok ||
        payload.success !== true ||
        !payload.preferences
      ) {
        throw new Error(
          payload.message || "Unable to save notification preferences.",
        );
      }

      setNotificationPreferences({
        email: payload.preferences.email !== false,
        inApp: payload.preferences.inApp !== false,
        certificateExpiry: payload.preferences.certificateExpiry !== false,
      });
      showNotice("Notification preferences saved.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to save notification preferences.";
      setPreferencesError(message);
      showNotice(message);
    } finally {
      setPreferenceSaving(false);
    }
  };

  const handlePasswordChange = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (passwordSaving) return;
    setPasswordFeedback("");
    setPasswordFeedbackError(false);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordFeedback("New password and confirmation do not match.");
      setPasswordFeedbackError(true);
      return;
    }

    if (
      passwordForm.newPassword.length < 8 ||
      passwordForm.newPassword.length > 128 ||
      !/[A-Z]/.test(passwordForm.newPassword) ||
      !/[a-z]/.test(passwordForm.newPassword) ||
      !/[0-9]/.test(passwordForm.newPassword) ||
      !/[^A-Za-z0-9]/.test(passwordForm.newPassword)
    ) {
      setPasswordFeedback(
        "Use 8–128 characters with uppercase, lowercase, a number, and a symbol.",
      );
      setPasswordFeedbackError(true);
      return;
    }

    setPasswordSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/password`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passwordForm),
      });
      const payload = await response.json();

      if (!response.ok || payload.success !== true) {
        throw new Error(payload.message || "Unable to change your password.");
      }

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setPasswordFeedback(payload.message || "Password changed successfully.");
    } catch (error) {
      setPasswordFeedback(
        error instanceof Error
          ? error.message
          : "Unable to change your password.",
      );
      setPasswordFeedbackError(true);
    } finally {
      setPasswordSaving(false);
    }
  };

  // --------------------------------------------------
  // 8. NAVIGATION
  // --------------------------------------------------

  const navigateTo = (section: Section) => {
    setActiveSection(section);
    setMobileMenuOpen(false);
    setSearchQuery("");
  };

  // --------------------------------------------------
  // 9. LOGOUT
  // --------------------------------------------------

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Continue to login even if the request fails.
    } finally {
      setAuthUser(null);
      router.replace("/login");
      router.refresh();
    }
  };

  // --------------------------------------------------
  // 10. CERTIFICATE PDF DOWNLOAD
  // --------------------------------------------------

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
            await new Promise<void>((resolve, reject) => {
              image.onload = () => resolve();
              image.onerror = () =>
                reject(new Error("A certificate image could not be loaded."));
            });
          }

          if (image.naturalWidth === 0) {
            throw new Error("A certificate image could not be loaded.");
          }

          if (typeof image.decode === "function") {
            await image.decode();
          }
        }),
      );

      const captureWidth = 1122;
      const captureHeight = 794;

      const canvas = await html2canvas(certificateElement, {
        width: captureWidth,
        height: captureHeight,
        windowWidth: captureWidth,
        windowHeight: captureHeight,
        scrollX: 0,
        scrollY: 0,
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        onclone: (clonedDocument) => {
          const clonedCertificate =
            clonedDocument.getElementById(
              "membership-certificate",
            );

          if (!clonedCertificate) {
            throw new Error("Certificate capture layout is unavailable.");
          }

          clonedCertificate.style.setProperty("position", "fixed", "important");
          clonedCertificate.style.setProperty("top", "0", "important");
          clonedCertificate.style.setProperty("left", "0", "important");
          clonedCertificate.style.setProperty("width", `${captureWidth}px`, "important");
          clonedCertificate.style.setProperty("height", `${captureHeight}px`, "important");
          clonedCertificate.style.setProperty("min-width", `${captureWidth}px`, "important");
          clonedCertificate.style.setProperty("max-width", "none", "important");
          clonedCertificate.style.setProperty("min-height", `${captureHeight}px`, "important");
          clonedCertificate.style.setProperty("max-height", `${captureHeight}px`, "important");
          clonedCertificate.style.setProperty("box-sizing", "border-box", "important");
          clonedCertificate.style.setProperty("padding", "42px 58px", "important");
          clonedCertificate.style.setProperty("overflow", "hidden", "important");

          const captureContent = clonedCertificate.querySelector<HTMLElement>(
            "[data-certificate-content]",
          );
          captureContent?.style.setProperty("width", "100%", "important");

          const compactStyles: Array<[string, string, string]> = [
            ["[data-certificate-emblem]", "width", "40px"],
            ["[data-certificate-emblem]", "height", "40px"],
            ["[data-certificate-eyebrow]", "margin-top", "10px"],
            ["[data-certificate-title]", "margin-top", "8px"],
            ["[data-certificate-title]", "font-size", "30px"],
            ["[data-certificate-divider]", "margin-top", "10px"],
            ["[data-certificate-intro]", "margin-top", "12px"],
            ["[data-certificate-name]", "margin-top", "4px"],
            ["[data-certificate-name]", "font-size", "26px"],
            ["[data-certificate-description]", "margin-top", "8px"],
            ["[data-certificate-description]", "font-size", "12px"],
            ["[data-certificate-details]", "margin-top", "20px"],
            ["[data-certificate-details]", "display", "grid"],
            ["[data-certificate-details]", "grid-template-columns", "repeat(3, minmax(0, 1fr))"],
            ["[data-certificate-details]", "gap", "12px"],
            ["[data-certificate-detail-card]", "min-width", "0"],
            ["[data-certificate-detail-card]", "padding", "10px 14px"],
            ["[data-certificate-detail-value]", "font-size", "13px"],
            ["[data-certificate-detail-value]", "line-height", "1.25"],
            ["[data-certificate-detail-value]", "overflow-wrap", "anywhere"],
            ["[data-certificate-footer]", "margin-top", "18px"],
            ["[data-certificate-footer]", "padding-top", "14px"],
            ["[data-certificate-footer]", "display", "grid"],
            ["[data-certificate-footer]", "grid-template-columns", "1fr 150px 1fr"],
            ["[data-certificate-footer]", "align-items", "center"],
            ["[data-certificate-footer]", "gap", "16px"],
            ["[data-certificate-reference]", "text-align", "left"],
            ["[data-certificate-qr]", "justify-self", "center"],
            ["[data-certificate-qr-frame]", "width", "108px"],
            ["[data-certificate-qr-frame]", "height", "108px"],
            ["[data-certificate-qr-frame]", "padding", "6px"],
            ["[data-certificate-qr-image]", "width", "96px"],
            ["[data-certificate-qr-image]", "height", "96px"],
            ["[data-certificate-qr-label]", "margin-top", "4px"],
            ["[data-certificate-signature]", "text-align", "right"],
            ["[data-certificate-signature-line]", "margin-left", "auto"],
          ];

          compactStyles.forEach(([selector, property, value]) => {
            clonedCertificate
              .querySelectorAll<HTMLElement>(selector)
              .forEach((element) =>
                element.style.setProperty(property, value, "important"),
              );
          });

          const elements = [
            clonedCertificate,
            ...Array.from(clonedCertificate.querySelectorAll("*")),
          ];

          elements.forEach((element) => {
            const htmlElement = element as HTMLElement;

            htmlElement.style.setProperty("color", "#29251f");
            htmlElement.style.setProperty(
              "border-color",
              "#b89450",
            );
          });

          clonedCertificate.style.setProperty(
            "background-color",
            "#ffffff",
            "important",
          );
          clonedCertificate
            .querySelectorAll<HTMLElement>("[data-certificate-detail-card]")
            .forEach((card) =>
              card.style.setProperty("background-color", "#f7f3e9", "important"),
            );
          clonedCertificate
            .querySelectorAll<HTMLElement>("[data-certificate-qr-frame]")
            .forEach((frame) =>
              frame.style.setProperty("background-color", "#ffffff", "important"),
            );
        },
      });

      const imageData = canvas.toDataURL("image/png");

      const pdf = new jsPDF({
        orientation: "landscape",
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

      if (pdf.getNumberOfPages() !== 1) {
        throw new Error("Certificate PDF must contain exactly one page.");
      }

      pdf.save(
        `${certificateData?.certificateId || "Membrix-Certificate"}.pdf`,
      );

      showNotice("Certificate PDF downloaded successfully.");
    } catch (error) {
      console.error("Certificate PDF error:", error);
      showNotice("Unable to download certificate PDF.");
    }
  };

  // --------------------------------------------------
  // 11. GENERATE CERTIFICATE
  // --------------------------------------------------

  const handleGenerateCertificateForMembership = async (
    membershipId?: string,
  ) => {
    const selectedMembership = membershipId
      ? memberships.find(
          (membership) => membership.membershipId === membershipId,
        )
      : memberships.find((membership) => membership.status === "active");

    if (!selectedMembership) {
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
            membershipId: selectedMembership.membershipId,
          }),
        },
      );

      const data = await response.json();

      if (
        !response.ok ||
        !data.success ||
        !data.certificate
      ) {
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

  const handleGenerateCertificate = async () => {
    await handleGenerateCertificateForMembership();
  };

  const handleMarkNotificationRead = async (notificationId: string) => {
    try {
      const response = await fetch(
        `${API_URL}/api/notifications/${notificationId}/read`,
        {
          method: "POST",
          credentials: "include",
        },
      );

      if (!response.ok) return;

      setNotificationList((current) =>
        current.map((item) =>
          item._id === notificationId
            ? { ...item, isRead: true, readAt: new Date().toISOString() }
            : item,
        ),
      );
    } catch {
      // Ignore read-state failures and keep the notification visible.
    }
  };

  const handleNotificationAction = async (
    notification: NotificationRecord,
  ) => {
    setNotificationMenuOpen(false);

    if (notification.membershipId) {
      await handleMarkNotificationRead(notification._id);
      await handleGenerateCertificateForMembership(
        notification.membershipId,
      );
      return;
    }

    await handleMarkNotificationRead(notification._id);
    showNotice(notification.message);
  };

  // --------------------------------------------------
  // 12. PAYMENT SUMMARY AND FILTERING
  // --------------------------------------------------

  const totalPaid = payments
    .filter((payment) => payment.status === "completed")
    .reduce((total, payment) => total + payment.amount, 0);

  const completedCount = payments.filter(
    (payment) => payment.status === "completed",
  ).length;

  const pendingAmount = payments
    .filter((payment) =>
      ["pending", "processing"].includes(payment.status),
    )
    .reduce((total, payment) => total + payment.amount, 0);

  const filteredPayments = payments.filter((payment) => {
    const query = searchQuery.trim().toLowerCase();

    const statusLabel = getPaymentStatus(payment.status);

    const matchesSearch =
      `${payment.id} ${payment.transactionId ?? ""} ${
        payment.planName
      } ${payment.method} ${statusLabel}`
        .toLowerCase()
        .includes(query);

    const matchesStatus =
      paymentStatusFilter === "All" ||
      statusLabel === paymentStatusFilter;

    return matchesSearch && matchesStatus;
  });

  // --------------------------------------------------
  // 13. MEMBERSHIP SUMMARY
  // --------------------------------------------------

  const activeMembership = memberships.find(
    (membership) => membership.status === "active",
  );

  const latestMembership = activeMembership ?? memberships[0] ?? null;

  const memberSince = latestMembership?.startDate
    ? formatDate(latestMembership.startDate)
    : "—";

  const renewalDate = latestMembership?.endDate
    ? formatDate(latestMembership.endDate)
    : "—";

  const membershipStatusLabel = latestMembership
    ? latestMembership.status.charAt(0).toUpperCase() +
      latestMembership.status.slice(1)
    : "No membership";

  const profileInitials =
    profile.name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "MB";

  const profileHasChanges =
    profile.name !== savedProfile.name ||
    profile.phone !== savedProfile.phone ||
    profile.organization !== savedProfile.organization ||
    profile.address !== savedProfile.address ||
    profile.bio !== savedProfile.bio;

  // --------------------------------------------------
  // 14. SIDEBAR
  // --------------------------------------------------

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

          <span className="text-xl font-semibold tracking-tight">
            membrix<span className="text-[var(--gold)]">.</span>
          </span>
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

        <nav
          className="space-y-1"
          aria-label="Dashboard navigation"
        >
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

                {name === "Payments" && payments.some(
                  (payment) =>
                    payment.status === "pending" ||
                    payment.status === "processing",
                ) && (
                  <span className="ml-auto rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-600">
                    {payments.filter(
                      (payment) =>
                        payment.status === "pending" ||
                        payment.status === "processing",
                    ).length}
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
          <ExternalLink size={16} />
          Back to website
        </Link>
      </div>
    </>
  );

  // --------------------------------------------------
  // 15. AUTH LOADING
  // --------------------------------------------------

  if (authLoading || !authUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
        <p className="text-sm text-[var(--muted-foreground)]">
          Checking your Membrix account...
        </p>
      </div>
    );
  }

  // --------------------------------------------------
  // 16. MAIN DASHBOARD
  // --------------------------------------------------

  return (
    <div
      ref={rootRef}
      className="min-h-screen bg-[var(--background)] text-[var(--foreground)]"
    >
      <div className="flex min-h-screen">
        {/* Desktop sidebar */}
        <aside className="hidden w-[250px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--background)] lg:flex">
          {sidebar}
        </aside>

        {/* Mobile sidebar */}
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
          {/* Header */}
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
                  aria-label={`Switch to ${
                    darkMode ? "light" : "dark"
                  } theme`}
                  title={`Switch to ${
                    darkMode ? "light" : "dark"
                  } theme`}
                >
                  {darkMode ? <Sun size={17} /> : <Moon size={17} />}
                </button>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setNotificationMenuOpen((current) => !current);
                    }}
                    className="relative rounded-xl border border-[var(--border)] p-2.5 transition-colors hover:bg-[var(--surface)]"
                    aria-label="Notifications"
                    aria-expanded={notificationMenuOpen}
                  >
                    <Bell size={17} />

                    {notificationList.some((item) => !item.isRead) && (
                      <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[var(--gold)]" />
                    )}
                  </button>

                  {notificationMenuOpen && (
                    <div className="absolute right-0 top-full z-50 mt-2 w-[340px] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--background)] shadow-2xl">
                      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold">Notifications</p>
                          <p className="text-[11px] text-[var(--muted-foreground)]">
                            {notificationList.filter((item) => !item.isRead).length} unread
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setNotificationMenuOpen(false)}
                          className="rounded-md p-1 text-[var(--muted-foreground)] hover:bg-[var(--surface)]"
                          aria-label="Close notifications"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      <div className="max-h-[420px] overflow-y-auto">
                        {notificationLoading ? (
                          <div className="px-4 py-6 text-sm text-[var(--muted-foreground)]">
                            Loading notifications...
                          </div>
                        ) : notificationList.length === 0 ? (
                          <div className="px-4 py-6 text-sm text-[var(--muted-foreground)]">
                            No notification reminders yet.
                          </div>
                        ) : (
                          notificationList.map((notification) => (
                            <button
                              key={notification._id}
                              type="button"
                              onClick={() => void handleNotificationAction(notification)}
                              className={`flex w-full items-start gap-3 border-b border-[var(--border)] px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-[var(--surface)] ${
                                notification.isRead ? "opacity-80" : "bg-[var(--surface)]/70"
                              }`}
                            >
                              <span
                                className={`mt-1.5 h-2.5 w-2.5 rounded-full ${
                                  notification.isRead
                                    ? "bg-[var(--border)]"
                                    : "bg-[var(--gold)]"
                                }`}
                              />

                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium">
                                  {notification.title}
                                </span>
                                <span className="mt-1 block text-xs leading-5 text-[var(--muted-foreground)]">
                                  {notification.message}
                                </span>
                                <span className="mt-2 block text-[10px] uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
                                  {notification.daysRemaining !== null
                                    ? `Expires in ${notification.daysRemaining} day${notification.daysRemaining === 1 ? "" : "s"}`
                                    : "Certificate reminder"}
                                </span>
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => navigateTo("My Profile")}
                  className="flex items-center gap-2 rounded-full pl-1 transition-opacity hover:opacity-80"
                  aria-label="Open profile"
                >
                  <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[var(--gold)] text-xs font-semibold text-white">
                    {profile.profileImage ? (
                      <Image
                        src={profile.profileImage}
                        alt=""
                        fill
                        unoptimized
                        sizes="36px"
                        className="object-cover"
                      />
                    ) : (
                      profileInitials
                    )}
                  </span>

                  <span className="hidden text-left sm:block">
                    <span className="block max-w-32 truncate text-xs font-semibold">
                      {profile.name || "Member"}
                    </span>

                    <span className="block text-[10px] text-[var(--muted-foreground)]">
                      {authUser.role === "admin" ? "Admin" : "Member"}
                    </span>
                  </span>

                  <ChevronDown
                    size={14}
                    className="hidden text-[var(--muted-foreground)] sm:block"
                  />
                </button>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8 xl:px-10">
            {/* Notifications */}
            {notice && (
              <div
                role="status"
                className="mb-5 flex items-center gap-2 rounded-xl border border-[var(--gold)]/20 bg-[var(--gold)]/10 px-4 py-3 text-sm text-[var(--gold)] dark:text-[var(--gold-bright)]"
              >
                <CheckCircle2 size={17} />

                {notice}

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

            {/* =================================================
                OVERVIEW
            ================================================== */}

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
                      Your community, membership and account
                      details—all in one place. Let’s keep you connected.
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

                {/* Real account summary */}
                <section
                  data-dashboard-reveal
                  className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
                  aria-label="Account summary"
                >
                  {[
                    {
                      label: "Membership status",
                      value: membershipLoading
                        ? "Loading..."
                        : membershipStatusLabel,
                      detail: latestMembership?.plan?.name ??
                        "Your membership",
                      icon: ShieldCheck,
                      color: "text-emerald-600 bg-emerald-500/10",
                    },
                    {
                      label: "Next renewal",
                      value: renewalDate,
                      detail: "Membership expiry",
                      icon: Activity,
                      color: "text-blue-600 bg-blue-500/10",
                    },
                    {
                      label: "Total payments",
                      value: paymentLoading
                        ? "Loading..."
                        : String(payments.length),
                      detail: `${completedCount} completed`,
                      icon: CreditCard,
                      color: "text-violet-600 bg-violet-500/10",
                    },
                    {
                      label: "Member since",
                      value: memberSince,
                      detail: "Membership start date",
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

                            <p className="mt-3 break-words text-2xl font-semibold tracking-tight">
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

                {/* Recent payments and membership card */}
                <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
                  <div
                    data-dashboard-reveal
                    className="overflow-hidden rounded-2xl border border-[var(--border)]"
                  >
                    <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4 sm:px-6">
                      <div>
                        <h3 className="text-sm font-semibold">
                          Recent payments
                        </h3>

                        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                          Your latest transactions
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

                    {paymentLoading ? (
                      <p className="p-6 text-sm text-[var(--muted-foreground)]">
                        Loading payments...
                      </p>
                    ) : paymentError ? (
                      <p className="p-6 text-sm text-red-500">
                        {paymentError}
                      </p>
                    ) : payments.length === 0 ? (
                      <p className="p-6 text-sm text-[var(--muted-foreground)]">
                        No payment records yet.
                      </p>
                    ) : (
                      <div className="divide-y divide-[var(--border)]">
                        {payments.slice(0, 3).map((payment) => (
                          <div
                            key={payment.id}
                            className="flex items-center justify-between gap-3 px-5 py-4 sm:px-6"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface)]">
                                <ArrowDownLeft
                                  size={18}
                                  className="text-[var(--gold)]"
                                />
                              </span>

                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">
                                  {payment.planName}
                                </p>

                                <p className="mt-1 truncate text-xs text-[var(--muted-foreground)]">
                                  {formatDate(payment.createdAt)}
                                </p>
                              </div>
                            </div>

                            <div className="shrink-0 text-right">
                              <p className="text-sm font-semibold">
                                {money(payment.amount)}
                              </p>

                              <div className="mt-1">
                                <StatusBadge
                                  status={getPaymentStatus(payment.status)}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div
                    data-dashboard-reveal
                    className="rounded-2xl border border-[var(--border)] p-5 sm:p-6"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold">
                          Membership card
                        </h3>

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
                          <p className="text-xs text-white/65">
                            MEMBRIX MEMBERSHIP
                          </p>

                          <p className="mt-2 text-2xl font-semibold">
                            {latestMembership?.plan?.name ?? "No plan"}
                          </p>
                        </div>

                        <ShieldCheck
                          size={25}
                          className="text-[var(--gold-bright)]"
                        />
                      </div>

                      <div className="mt-9 flex items-end justify-between gap-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-white/60">
                            Member
                          </p>

                          <p className="mt-1 text-sm font-medium">
                            {profile.name || "Membrix Member"}
                          </p>
                        </div>

                        <p className="text-xs text-white/70">
                          {latestMembership
                            ? latestMembership.membershipId
                            : "MEMBRIX"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-sm">
                      <span className="text-[var(--muted-foreground)]">
                        Status
                      </span>

                      <span className="flex items-center gap-1.5 font-medium">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            latestMembership?.status === "active"
                              ? "bg-emerald-500"
                              : "bg-amber-500"
                          }`}
                        />

                        {membershipStatusLabel}
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

                {/* Profile completion */}
                <section
                  data-dashboard-reveal
                  className="rounded-2xl border border-[var(--border)] p-5 sm:p-6"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--gold)]/10 text-[var(--gold)]">
                      <CheckCircle2 size={19} />
                    </span>

                    <div>
                      <h3 className="text-sm font-semibold">
                        Complete your profile
                      </h3>

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
                    <div
                      className="h-full rounded-full bg-[var(--gold)]"
                      style={{
                        width: `${
                          [
                            profile.name,
                            profile.phone,
                            profile.organization,
                            profile.address,
                            profile.bio,
                          ].filter((value) => value.trim()).length * 20
                        }%`,
                      }}
                    />
                  </div>

                  <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                    Profile completion ·{" "}
                    {
                      [
                        profile.name,
                        profile.phone,
                        profile.organization,
                        profile.address,
                        profile.bio,
                      ].filter((value) => value.trim()).length * 20
                    }
                    %
                  </p>
                </section>
              </div>
            )}

            {/* =================================================
                MY PROFILE
            ================================================== */}

            {activeSection === "My Profile" && (
              <section
                data-dashboard-reveal
                className="mx-auto max-w-4xl space-y-6"
              >
                <div>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Manage your personal information and how you appear
                    to the community.
                  </p>
                </div>

                <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
                  {/* Profile header */}
                  <div className="flex flex-wrap items-center gap-4 border-b border-[var(--border)] p-5 sm:p-7">
                   <ProfilePhotoEditor
  currentImage={profile.profileImage}
  initials={profileInitials}
  onUploaded={(imageUrl) => {
    setProfile((current) => ({
      ...current,
      profileImage: imageUrl,
    }));

    setSavedProfile((current) => ({
      ...current,
      profileImage: imageUrl,
    }));

    showNotice("Profile photo updated successfully.");
  }}
  onRemoved={() => {
    setProfile((current) => ({
      ...current,
      profileImage: "",
    }));

    setSavedProfile((current) => ({
      ...current,
      profileImage: "",
    }));

    showNotice("Profile photo removed successfully.");
  }}
/>

                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-semibold">
                        {profile.name || "Your name"}
                      </h2>

                      <p className="mt-1 break-all text-sm text-[var(--muted-foreground)]">
                        {profile.email}
                      </p>

                      <p className="mt-2 text-xs text-[var(--gold)]">
                        Membrix member
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (editingProfile) {
                          discardProfileChanges();
                        } else {
                          setProfile(savedProfile);
                          setEditingProfile(true);
                          setSaved(false);
                        }
                      }}
                      disabled={profileSaving}
                      className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--surface)] disabled:opacity-50"
                    >
                      {editingProfile ? "Cancel editing" : "Edit profile"}
                    </button>
                  </div>

                  {/* Profile form */}
                  <form
                    className="grid gap-5 p-5 sm:grid-cols-2 sm:p-7"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void saveProfile();
                    }}
                  >
                    {(
                      [
                        ["name", "Full name", "Your full name"],
                        ["email", "Email address", "you@example.com"],
                        ["phone", "Phone number", "+880 1XXXXXXXXX"],
                        ["organization", "Organization", "Your organization"],
                        ["address", "Location", "City, Country"],
                      ] as const
                    ).map(([field, label, placeholder]) => (
                      <label key={field} className="block">
                        <span className="mb-2 block text-xs font-medium text-[var(--muted-foreground)]">
                          {label}
                          {field === "email" && (
                            <span className="ml-2 text-[var(--gold)]">
                              (Read only)
                            </span>
                          )}
                        </span>

                        <input
                          type={field === "email" ? "email" : "text"}
                          value={profile[field]}
                          placeholder={placeholder}
                          readOnly={
                            field === "email" || !editingProfile
                          }
                          required={field === "name" || field === "email"}
                          onChange={(event) =>
                            updateProfile(field, event.target.value)
                          }
                          className={`w-full rounded-xl border border-[var(--border)] px-3.5 py-3 text-sm outline-none transition-colors placeholder:text-[var(--muted-foreground)] focus:border-[var(--gold)] ${
                            editingProfile && field !== "email"
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
                        placeholder="Tell us a little about yourself..."
                        maxLength={1000}
                        onChange={(event) =>
                          updateProfile("bio", event.target.value)
                        }
                        className={`w-full resize-y rounded-xl border border-[var(--border)] px-3.5 py-3 text-sm leading-6 outline-none transition-colors focus:border-[var(--gold)] ${
                          editingProfile
                            ? "bg-[var(--background)]"
                            : "bg-[var(--surface)]"
                        }`}
                      />

                      {editingProfile && (
                        <p className="mt-1 text-right text-xs text-[var(--muted-foreground)]">
                          {profile.bio.length}/1000
                        </p>
                      )}
                    </label>

                    {editingProfile && (
                      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                        <button
                          type="submit"
                          disabled={profileSaving}
                          className="inline-flex items-center gap-2 rounded-xl bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-[var(--background)] transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {profileSaving ? (
                            <>
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Check size={16} />
                              Save changes
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={discardProfileChanges}
                          disabled={profileSaving}
                          className="rounded-xl border border-[var(--border)] px-5 py-3 text-sm font-medium disabled:opacity-50"
                        >
                          Discard
                        </button>
                      </div>
                    )}

                    {saved && (
                      <p className="text-xs text-emerald-600 sm:col-span-2">
                        Profile saved successfully.
                      </p>
                    )}
                  </form>
                </div>

                <div className="flex items-start gap-3 rounded-2xl border border-[var(--border)] p-5">
                  <ShieldCheck
                    size={20}
                    className="mt-0.5 shrink-0 text-[var(--gold)]"
                  />

                  <div>
                    <h3 className="text-sm font-semibold">
                      Your information
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">
                      Your profile information is saved to your Membrix
                      account. Your email address is linked to your account
                      and cannot be edited here.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* =================================================
                MY MEMBERSHIP
            ================================================== */}

            {activeSection === "My Membership" && (
              <section
                data-dashboard-reveal
                className="mx-auto max-w-5xl space-y-6"
              >
                <div>
                  <h2 className="text-xl font-semibold">
                    My Membership
                  </h2>

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
                    <h3 className="font-semibold">
                      Unable to load membership
                    </h3>

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
                                  {plan?.name ??
                                    "Plan information unavailable"}
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
                        <h3 className="text-sm font-semibold">
                          Plan benefits
                        </h3>

                        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                          Benefits from your recorded membership plan.
                        </p>

                        <ul className="mt-5 space-y-4">
                          {(
                            memberships.find(
                              (item) => item.status === "active",
                            )?.plan?.features ??
                            memberships[0]?.plan?.features ??
                            []
                          ).length > 0 ? (
                            (
                              memberships.find(
                                (item) => item.status === "active",
                              )?.plan?.features ??
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

            {/* =================================================
                PAYMENTS
            ================================================== */}

            {activeSection === "Payments" && (
              <section data-dashboard-reveal className="space-y-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      View your payment transactions and payment methods.
                    </p>

                    <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                      Payment history from your Membrix account
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
                        onChange={(event) =>
                          setSearchQuery(event.target.value)
                        }
                        placeholder="Search transactions..."
                        aria-label="Search transactions"
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[var(--gold)]"
                      />
                    </div>

                    <select
                      value={paymentStatusFilter}
                      onChange={(event) =>
                        setPaymentStatusFilter(
                          event.target.value as
                            | "All"
                            | PaymentStatus,
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

                {/* Payment summary */}
                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    {
                      label: "Total paid",
                      value: paymentLoading ? "..." : money(totalPaid),
                      icon: ArrowUpRight,
                    },
                    {
                      label: "Completed",
                      value: paymentLoading
                        ? "..."
                        : `${completedCount} transactions`,
                      icon: CheckCircle2,
                    },
                    {
                      label: "Pending",
                      value: paymentLoading ? "..." : money(pendingAmount),
                      icon: Activity,
                    },
                  ].map((item) => {
                    const Icon = item.icon;

                    return (
                      <div
                        key={item.label}
                        className="rounded-2xl border border-[var(--border)] p-5"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-[var(--muted-foreground)]">
                            {item.label}
                          </p>

                          <Icon
                            size={17}
                            className="text-[var(--gold)]"
                          />
                        </div>

                        <p className="mt-3 text-2xl font-semibold">
                          {item.value}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Transactions table */}
                <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
                  <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4 sm:px-6">
                    <div>
                      <h2 className="text-sm font-semibold">
                        Transaction history
                      </h2>

                      <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                        {paymentLoading
                          ? "Loading records..."
                          : `${filteredPayments.length} records`}
                      </p>
                    </div>

                    <MoreHorizontal
                      size={20}
                      className="text-[var(--muted-foreground)]"
                    />
                  </div>

                  {paymentLoading ? (
                    <div className="p-12 text-center text-sm text-[var(--muted-foreground)]">
                      Loading your payment history...
                    </div>
                  ) : paymentError ? (
                    <div
                      role="alert"
                      className="p-8 text-center text-sm text-red-500"
                    >
                      {paymentError}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[680px] text-left">
                        <thead className="bg-[var(--surface)] text-xs text-[var(--muted-foreground)]">
                          <tr>
                            <th className="px-5 py-3.5 font-medium sm:px-6">
                              Transaction
                            </th>

                            <th className="px-5 py-3.5 font-medium">
                              Date
                            </th>

                            <th className="px-5 py-3.5 font-medium">
                              Payment method
                            </th>

                            <th className="px-5 py-3.5 font-medium">
                              Status
                            </th>

                            <th className="px-5 py-3.5 text-right font-medium">
                              Amount
                            </th>

                            <th className="px-5 py-3.5 text-right font-medium">
                              Receipt
                            </th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-[var(--border)]">
                          {filteredPayments.map((payment) => (
                            <tr
                              key={payment.id}
                              className="transition-colors hover:bg-[var(--surface)]"
                            >
                              <td className="px-5 py-4 sm:px-6">
                                <p className="text-sm font-medium">
                                  {payment.planName}
                                </p>

                                <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                                  {payment.transactionId ||
                                    payment.id}
                                </p>
                              </td>

                              <td className="whitespace-nowrap px-5 py-4 text-xs text-[var(--muted-foreground)]">
                                {formatDate(payment.createdAt)}
                              </td>

                              <td className="px-5 py-4 text-xs capitalize">
                                {payment.method === "online"
                                  ? "AamarPay"
                                  : payment.method}
                              </td>

                              <td className="px-5 py-4">
                                <StatusBadge
                                  status={getPaymentStatus(
                                    payment.status,
                                  )}
                                />
                              </td>

                              <td className="px-5 py-4 text-right text-xs font-medium">
                                {money(payment.amount)}
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
                                    Try a different search term or select
                                    another payment status.
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
                  )}
                </div>
              </section>
            )}

            {/* =================================================
                SETTINGS
            ================================================== */}

            {activeSection === "Settings" && (
              <section
                data-dashboard-reveal
                className="mx-auto max-w-6xl space-y-7"
              >
                <header className="max-w-3xl">
                  <p className="text-xs font-semibold tracking-[0.18em] text-[var(--gold)]">
                    ACCOUNT & PREFERENCES
                  </p>
                  <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                    Settings
                  </h1>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                    Manage your profile, sign-in security, and Membrix
                    experience from one place.
                  </p>
                </header>

                <div className="grid items-start gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
                  <nav
                    role="tablist"
                    aria-label="Settings sections"
                    className="flex gap-2 overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2 lg:sticky lg:top-6 lg:flex-col lg:overflow-visible"
                  >
                    {(
                      [
                        { name: "Account", icon: UserRound, hint: "Profile details" },
                        { name: "Security", icon: KeyRound, hint: "Password" },
                        { name: "Appearance", icon: Palette, hint: "Theme" },
                        { name: "Notifications", icon: Bell, hint: "Delivery options" },
                        { name: "Privacy", icon: ShieldCheck, hint: "Your data" },
                      ] as const
                    ).map(({ name, icon: Icon, hint }) => {
                      const selected = activeSettingsSection === name;
                      return (
                        <button
                          key={name}
                          type="button"
                          role="tab"
                          id={`settings-tab-${name.toLowerCase()}`}
                          aria-controls="settings-panel"
                          aria-selected={selected}
                          onClick={() => setActiveSettingsSection(name)}
                          className={`flex min-h-11 shrink-0 items-center gap-3 rounded-xl px-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)] lg:w-full ${
                            selected
                              ? "bg-[var(--surface-alt)] text-[var(--foreground)] shadow-sm"
                              : "text-[var(--muted-foreground)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"
                          }`}
                        >
                          <Icon
                            size={17}
                            className={selected ? "text-[var(--gold)]" : ""}
                            aria-hidden="true"
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-medium">
                              {name}
                            </span>
                            <span className="hidden text-[11px] text-[var(--muted-foreground)] lg:block">
                              {hint}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </nav>

                  <div
                    id="settings-panel"
                    role="tabpanel"
                    aria-labelledby={`settings-tab-${activeSettingsSection.toLowerCase()}`}
                    data-settings-transition
                    className="min-w-0 space-y-5"
                  >
                    {activeSettingsSection === "Account" && (
                      <>
                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
                          <div className="border-b border-[var(--border)] px-5 py-5 sm:px-7">
                            <h2 className="text-base font-semibold">
                              Profile information
                            </h2>
                            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                              Keep your account details current. Changes are
                              saved to your Membrix profile.
                            </p>
                          </div>
                          <div className="flex flex-col gap-5 border-b border-[var(--border)] px-5 py-5 sm:flex-row sm:items-center sm:px-7">
                            <ProfilePhotoEditor
                              currentImage={profile.profileImage}
                              initials={profileInitials}
                              onUploaded={(imageUrl) => {
                                setProfile((current) => ({
                                  ...current,
                                  profileImage: imageUrl,
                                }));
                                setSavedProfile((current) => ({
                                  ...current,
                                  profileImage: imageUrl,
                                }));
                                showNotice("Profile photo updated successfully.");
                              }}
                              onRemoved={() => {
                                setProfile((current) => ({
                                  ...current,
                                  profileImage: "",
                                }));
                                setSavedProfile((current) => ({
                                  ...current,
                                  profileImage: "",
                                }));
                                showNotice("Profile photo removed successfully.");
                              }}
                            />
                            <div>
                              <h3 className="text-sm font-semibold">
                                Profile photo
                              </h3>
                              <p className="mt-1 max-w-md text-xs leading-5 text-[var(--muted-foreground)]">
                                Upload, crop, reposition, or remove your
                                Cloudinary-hosted profile photo.
                              </p>
                            </div>
                          </div>
                          <form
                            className="grid gap-5 p-5 sm:grid-cols-2 sm:p-7"
                            onSubmit={(event) => {
                              event.preventDefault();
                              void saveProfile();
                            }}
                          >
                            <label className="block text-sm font-medium">
                              Full name
                              <input
                                type="text"
                                required
                                minLength={2}
                                maxLength={100}
                                autoComplete="name"
                                value={profile.name}
                                onChange={(event) =>
                                  updateProfile("name", event.target.value)
                                }
                                className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 py-3 text-sm outline-none transition focus:border-[var(--gold)] focus:ring-2 focus:ring-[var(--gold)]/20"
                              />
                            </label>
                            <label className="block text-sm font-medium">
                              Email address
                              <input
                                type="email"
                                readOnly
                                value={profile.email}
                                className="mt-2 w-full cursor-not-allowed rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] px-3.5 py-3 text-sm text-[var(--muted-foreground)] outline-none"
                              />
                              <span className="mt-1.5 block text-xs font-normal text-[var(--muted-foreground)]">
                                Email changes require a verified change process.
                              </span>
                            </label>
                            <label className="block text-sm font-medium">
                              Phone number
                              <input
                                type="tel"
                                required
                                minLength={7}
                                maxLength={20}
                                pattern="\+?[0-9\s()-]{7,20}"
                                title="Enter a valid phone number using digits, spaces, parentheses, or hyphens."
                                autoComplete="tel"
                                value={profile.phone}
                                onChange={(event) =>
                                  updateProfile("phone", event.target.value)
                                }
                                className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 py-3 text-sm outline-none transition focus:border-[var(--gold)] focus:ring-2 focus:ring-[var(--gold)]/20"
                              />
                            </label>
                            <label className="block text-sm font-medium">
                              Organization
                              <input
                                type="text"
                                maxLength={150}
                                autoComplete="organization"
                                value={profile.organization}
                                onChange={(event) =>
                                  updateProfile("organization", event.target.value)
                                }
                                placeholder="Organization name"
                                className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 py-3 text-sm outline-none transition focus:border-[var(--gold)] focus:ring-2 focus:ring-[var(--gold)]/20"
                              />
                            </label>
                            <label className="block text-sm font-medium sm:col-span-2">
                              Address
                              <input
                                type="text"
                                maxLength={300}
                                autoComplete="street-address"
                                value={profile.address}
                                onChange={(event) =>
                                  updateProfile("address", event.target.value)
                                }
                                placeholder="City, region, country"
                                className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 py-3 text-sm outline-none transition focus:border-[var(--gold)] focus:ring-2 focus:ring-[var(--gold)]/20"
                              />
                            </label>
                            <label className="block text-sm font-medium sm:col-span-2">
                              Bio
                              <textarea
                                rows={4}
                                maxLength={1000}
                                value={profile.bio}
                                onChange={(event) =>
                                  updateProfile("bio", event.target.value)
                                }
                                placeholder="Tell us a little about yourself."
                                className="mt-2 w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 py-3 text-sm leading-6 outline-none transition focus:border-[var(--gold)] focus:ring-2 focus:ring-[var(--gold)]/20"
                              />
                              <span className="mt-1 block text-right text-xs font-normal text-[var(--muted-foreground)]">
                                {profile.bio.length}/1000
                              </span>
                            </label>
                            <div className="flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-5 sm:col-span-2">
                              <button
                                type="submit"
                                disabled={!profileHasChanges || profileSaving}
                                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--gold)] px-5 text-sm font-semibold text-[var(--gold-contrast)] transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--gold)] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {profileSaving ? "Saving changes…" : "Save changes"}
                              </button>
                              {profileHasChanges && (
                                <button
                                  type="button"
                                  disabled={profileSaving}
                                  onClick={() => setProfile(savedProfile)}
                                  className="min-h-11 rounded-xl border border-[var(--border)] px-4 text-sm font-medium transition hover:bg-[var(--background)] disabled:opacity-50"
                                >
                                  Discard
                                </button>
                              )}
                              {saved && !profileHasChanges && (
                                <span className="text-sm text-[var(--gold)]">
                                  Profile saved successfully.
                                </span>
                              )}
                            </div>
                          </form>
                        </div>
                      </>
                    )}

                    {activeSettingsSection === "Security" && (
                      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
                        <div className="border-b border-[var(--border)] px-5 py-5 sm:px-7">
                          <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-alt)] text-[var(--gold)]">
                              <LockKeyhole size={19} />
                            </span>
                            <div>
                              <h2 className="text-base font-semibold">
                                Change password
                              </h2>
                              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                                Confirm your current password before choosing a
                                new one.
                              </p>
                            </div>
                          </div>
                        </div>
                        <form
                          onSubmit={(event) => void handlePasswordChange(event)}
                          className="space-y-5 p-5 sm:p-7"
                        >
                          {(
                            [
                              ["currentPassword", "Current password", "current"],
                              ["newPassword", "New password", "new"],
                              ["confirmPassword", "Confirm new password", "confirm"],
                            ] as const
                          ).map(([field, label, visibilityKey]) => (
                            <label
                              key={field}
                              className="block max-w-xl text-sm font-medium"
                            >
                              {label}
                              <span className="relative mt-2 block">
                                <input
                                  type={showPasswords[visibilityKey] ? "text" : "password"}
                                  required
                                  autoComplete={
                                    field === "currentPassword"
                                      ? "current-password"
                                      : "new-password"
                                  }
                                  minLength={field === "currentPassword" ? undefined : 8}
                                  maxLength={128}
                                  value={passwordForm[field]}
                                  onChange={(event) => {
                                    setPasswordForm((current) => ({
                                      ...current,
                                      [field]: event.target.value,
                                    }));
                                    setPasswordFeedback("");
                                  }}
                                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 py-3 pr-12 text-sm outline-none transition focus:border-[var(--gold)] focus:ring-2 focus:ring-[var(--gold)]/20"
                                />
                                <button
                                  type="button"
                                  aria-label={
                                    showPasswords[visibilityKey]
                                      ? `Hide ${label.toLowerCase()}`
                                      : `Show ${label.toLowerCase()}`
                                  }
                                  onClick={() =>
                                    setShowPasswords((current) => ({
                                      ...current,
                                      [visibilityKey]: !current[visibilityKey],
                                    }))
                                  }
                                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-[var(--muted-foreground)] transition hover:text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--gold)]"
                                >
                                  {showPasswords[visibilityKey] ? (
                                    <EyeOff size={17} />
                                  ) : (
                                    <Eye size={17} />
                                  )}
                                </button>
                              </span>
                            </label>
                          ))}
                          <p className="text-xs leading-5 text-[var(--muted-foreground)]">
                            Use 8–128 characters and include uppercase and
                            lowercase letters, a number, and a symbol.
                          </p>
                          <button
                            type="submit"
                            disabled={
                              passwordSaving ||
                              !passwordForm.currentPassword ||
                              !passwordForm.newPassword ||
                              !passwordForm.confirmPassword
                            }
                            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--gold)] px-5 text-sm font-semibold text-[var(--gold-contrast)] transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--gold)] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <KeyRound size={16} />
                            {passwordSaving ? "Updating password…" : "Update password"}
                          </button>
                          {passwordFeedback && (
                            <p
                              role="status"
                              className={`text-sm ${
                                passwordFeedbackError
                                  ? "text-red-600 dark:text-red-300"
                                  : "text-[var(--gold)]"
                              }`}
                            >
                              {passwordFeedback}
                            </p>
                          )}
                        </form>
                      </div>
                    )}

                    {activeSettingsSection === "Appearance" && (
                      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
                        <div className="border-b border-[var(--border)] px-5 py-5 sm:px-7">
                          <h2 className="text-base font-semibold">Appearance</h2>
                          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                            Choose the Membrix theme. This preference is shared
                            across the website, dashboard, and admin panel on
                            this device.
                          </p>
                        </div>
                        <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-7">
                          {(
                            [
                              { dark: false, label: "Light", icon: Sun },
                              { dark: true, label: "Dark", icon: Moon },
                            ] as const
                          ).map(({ dark, label, icon: Icon }) => (
                            <button
                              key={label}
                              type="button"
                              aria-pressed={darkMode === dark}
                              onClick={() => changeTheme(dark)}
                              className={`flex min-h-24 items-center justify-between rounded-xl border p-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)] ${
                                darkMode === dark
                                  ? "border-[var(--gold)] bg-[var(--surface-alt)]"
                                  : "border-[var(--border)] hover:border-[var(--gold)]/60"
                              }`}
                            >
                              <span className="flex items-center gap-3">
                                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--background)] text-[var(--gold)]">
                                  <Icon size={20} />
                                </span>
                                <span>
                                  <span className="block text-sm font-semibold">
                                    {label} theme
                                  </span>
                                  <span className="mt-1 block text-xs text-[var(--muted-foreground)]">
                                    {dark ? "Low-light surfaces" : "Warm, light surfaces"}
                                  </span>
                                </span>
                              </span>
                              {darkMode === dark && (
                                <CheckCircle2
                                  size={18}
                                  className="text-[var(--gold)]"
                                />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeSettingsSection === "Notifications" && (
                      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
                        <div className="border-b border-[var(--border)] px-5 py-5 sm:px-7">
                          <h2 className="text-base font-semibold">
                            Notification preferences
                          </h2>
                          <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
                            Choose how supported certificate-expiry reminders
                            reach you. Preference changes are saved to your
                            account.
                          </p>
                        </div>
                        {preferencesLoading ? (
                          <div className="p-6 text-sm text-[var(--muted-foreground)]">
                            Loading your preferences…
                          </div>
                        ) : preferencesError ? (
                          <div className="p-6">
                            <p role="alert" className="text-sm text-red-600 dark:text-red-300">
                              {preferencesError}
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setPreferencesError("");
                                setPreferencesLoading(true);
                                void fetch(`${API_URL}/api/auth/preferences`, {
                                  credentials: "include",
                                  cache: "no-store",
                                })
                                  .then(async (response) => {
                                    const payload = await response.json();
                                    if (!response.ok || payload.success !== true) {
                                      throw new Error(payload.message || "Unable to load preferences.");
                                    }
                                    const prefs = payload.preferences;
                                    setNotificationPreferences({
                                      email: prefs.email !== false,
                                      inApp: prefs.inApp !== false,
                                      certificateExpiry: prefs.certificateExpiry !== false,
                                    });
                                  })
                                  .catch((error: unknown) =>
                                    setPreferencesError(
                                      error instanceof Error ? error.message : "Unable to load preferences.",
                                    ),
                                  )
                                  .finally(() => setPreferencesLoading(false));
                              }}
                              className="mt-3 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold transition hover:bg-[var(--background)]"
                            >
                              Try again
                            </button>
                          </div>
                        ) : (
                          <>
                            {(
                              [
                                {
                                  key: "inApp",
                                  title: "In-app reminders",
                                  detail: "Show expiry reminders in your dashboard notification area.",
                                },
                                {
                                  key: "email",
                                  title: "Email reminders",
                                  detail: "Send supported certificate-expiry reminders to your account email.",
                                },
                                {
                                  key: "certificateExpiry",
                                  title: "Certificate expiry reminders",
                                  detail: "Enable or pause 7-day, 1-day, and expiry-day reminders.",
                                },
                              ] as const
                            ).map(({ key, title, detail }) => (
                              <div
                                key={key}
                                className="flex items-center justify-between gap-5 border-b border-[var(--border)] px-5 py-5 last:border-0 sm:px-7"
                              >
                                <div>
                                  <p className="text-sm font-medium">{title}</p>
                                  <p className="mt-1 max-w-xl text-xs leading-5 text-[var(--muted-foreground)]">
                                    {detail}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  role="switch"
                                  aria-checked={notificationPreferences[key]}
                                  aria-label={title}
                                  disabled={preferenceSaving}
                                  onClick={() =>
                                    void saveNotificationPreferences({
                                      ...notificationPreferences,
                                      [key]: !notificationPreferences[key],
                                    })
                                  }
                                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)] disabled:cursor-wait disabled:opacity-60 ${
                                    notificationPreferences[key]
                                      ? "bg-[var(--gold)]"
                                      : "bg-[var(--border)]"
                                  }`}
                                >
                                  <span
                                    className={`absolute top-1 h-4 w-4 rounded-full bg-[var(--surface)] shadow transition-transform ${
                                      notificationPreferences[key]
                                        ? "translate-x-6"
                                        : "translate-x-1"
                                    }`}
                                  />
                                </button>
                              </div>
                            ))}
                            <div className="space-y-0 border-t border-[var(--border)]">
                              {[
                                {
                                  title: "Membership updates",
                                  detail: "Membership-specific notification delivery is not currently available.",
                                },
                                {
                                  title: "Payment updates",
                                  detail: "Payment-specific notification delivery is not currently available.",
                                },
                              ].map((item) => (
                                <div
                                  key={item.title}
                                  className="flex items-center justify-between gap-5 border-b border-[var(--border)] px-5 py-5 last:border-0 sm:px-7"
                                >
                                  <div>
                                    <p className="text-sm font-medium">
                                      {item.title}
                                    </p>
                                    <p className="mt-1 max-w-xl text-xs leading-5 text-[var(--muted-foreground)]">
                                      {item.detail}
                                    </p>
                                  </div>
                                  <span className="shrink-0 rounded-full border border-[var(--border)] px-2.5 py-1 text-[10px] font-medium text-[var(--muted-foreground)]">
                                    Not available
                                  </span>
                                </div>
                              ))}
                            </div>
                            {preferenceSaving && (
                              <p className="px-5 pb-4 text-xs text-[var(--muted-foreground)] sm:px-7">
                                Saving preference…
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {activeSettingsSection === "Privacy" && (
                      <div className="space-y-5">
                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
                          <div className="border-b border-[var(--border)] px-5 py-5 sm:px-7">
                            <h2 className="text-base font-semibold">
                              Your information
                            </h2>
                            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                              Review what is associated with your Membrix
                              account and how you can manage it.
                            </p>
                          </div>
                          <div className="divide-y divide-[var(--border)]">
                            {[
                              {
                                title: "Profile information",
                                detail: "Name, phone, organization, address, bio, and profile photo can be updated or removed in Account.",
                              },
                              {
                                title: "Account email",
                                detail: "Your email is used for sign-in and account communication. It is read-only here because a verified email-change flow is not available.",
                              },
                              {
                                title: "Membership and payment records",
                                detail: "These records support your membership and transaction history and are not editable from Settings.",
                              },
                            ].map((item) => (
                              <div key={item.title} className="px-5 py-5 sm:px-7">
                                <h3 className="text-sm font-medium">
                                  {item.title}
                                </h3>
                                <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
                                  {item.detail}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                          <div>
                            <h2 className="text-sm font-semibold">
                              Account access
                            </h2>
                            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                              Sign out of this Membrix session.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleLogout}
                            disabled={loggingOut}
                            className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-xl border border-[var(--border)] px-4 text-sm font-medium transition hover:bg-[var(--background)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)] disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
                          >
                            <LogOut size={16} />
                            {loggingOut ? "Signing out…" : "Sign out"}
                          </button>
                        </div>
                        <p className="px-1 text-xs leading-5 text-[var(--muted-foreground)]">
                          Account deletion is not offered here because a secure
                          deletion-request workflow is not currently available.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Footer */}
            <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-5 text-xs text-[var(--muted-foreground)]">
              <p>© 2026 Membrix. Member workspace.</p>

              <div className="flex items-center gap-4">
                <Link
                  href="/contact"
                  className="hover:text-[var(--foreground)]"
                >
                  Help & support
                </Link>

                <Link
                  href="/"
                  className="hover:text-[var(--foreground)]"
                >
                  Main website
                </Link>
              </div>
            </footer>
          </div>

          {/* =================================================
              CERTIFICATE MODAL
          ================================================== */}

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

                        <div
                          data-certificate-content
                          className="relative text-center"
                        >
                          <div
                            data-certificate-emblem
                            className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-2 border-[var(--gold)] text-[var(--gold)]"
                          >
                            <FileBadge size={25} />
                          </div>

                          <p
                            data-certificate-eyebrow
                            className="mt-4 text-xs font-bold tracking-[0.35em] text-[var(--gold)]"
                          >
                            MEMBRIX MEMBERSHIP
                          </p>

                          <h2
                            data-certificate-title
                            id="membership-certificate-title"
                            className="mt-3 font-serif text-2xl font-bold tracking-wide text-[var(--foreground)] sm:text-4xl"
                          >
                            Certificate of Membership
                          </h2>

                          <div
                            data-certificate-divider
                            className="mx-auto mt-4 h-1 w-20 rounded-full bg-[var(--gold)]"
                          />

                          <p
                            data-certificate-intro
                            className="mt-5 text-sm text-[var(--muted-foreground)]"
                          >
                            This certificate is presented to
                          </p>

                          <h3
                            data-certificate-name
                            className="mt-2 break-words text-2xl font-semibold text-[var(--foreground)] sm:text-3xl"
                          >
                            {profile.name || "Membrix Member"}
                          </h3>

                          <p
                            data-certificate-description
                            className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--muted-foreground)]"
                          >
                            In recognition of their membership and
                            participation in the Membrix community.
                          </p>

                          <div
                            data-certificate-details
                            className="mt-7 grid grid-cols-1 gap-3 text-left sm:grid-cols-3"
                          >
                            <div
                              data-certificate-detail-card
                              className="border-t-2 border-[var(--gold)] bg-[var(--surface-alt)] p-3"
                            >
                              <p className="text-[10px] font-bold tracking-wider text-[var(--muted-foreground)]">
                                MEMBERSHIP ID
                              </p>

                              <p
                                data-certificate-detail-value
                                className="mt-1 break-all text-sm font-semibold text-[var(--foreground)]"
                              >
                                {certificateData.membership.membershipId}
                              </p>
                            </div>

                            <div
                              data-certificate-detail-card
                              className="border-t-2 border-[var(--gold)] bg-[var(--surface-alt)] p-3"
                            >
                              <p className="text-[10px] font-bold tracking-wider text-[var(--muted-foreground)]">
                                MEMBERSHIP TYPE
                              </p>

                              <p
                                data-certificate-detail-value
                                className="mt-1 text-sm font-semibold text-[var(--foreground)]"
                              >
                                {certificateData.membership.plan}
                              </p>
                            </div>

                            <div
                              data-certificate-detail-card
                              className="border-t-2 border-[var(--gold)] bg-[var(--surface-alt)] p-3"
                            >
                              <p className="text-[10px] font-bold tracking-wider text-[var(--muted-foreground)]">
                                CERTIFICATE STATUS
                              </p>

                              <p
                                data-certificate-detail-value
                                className="mt-1 text-sm font-semibold text-emerald-600"
                              >
                                {certificateData.status.toUpperCase()}
                              </p>
                            </div>
                          </div>

                          <div
                            data-certificate-footer
                            className="mt-7 flex flex-col items-center justify-between gap-6 border-t border-[var(--border)] pt-5 sm:flex-row"
                          >
                            <div data-certificate-reference className="text-center sm:text-left">
                              <p className="text-xs text-[var(--muted-foreground)]">
                                Certificate reference
                              </p>

                              <p className="mt-1 break-all text-sm font-semibold text-[var(--foreground)]">
                                {certificateData.certificateId}
                              </p>

                              <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                                Issued:{" "}
                                {new Date(
                                  certificateData.issuedAt,
                                ).toLocaleDateString("en-GB")}
                              </p>
                            </div>

                            <div data-certificate-qr className="flex flex-col items-center">
                              <div
                                data-certificate-qr-frame
                                className="rounded-xl border border-[var(--gold)]/30 bg-white p-2"
                              >
                                <Image
                                  src={certificateData.qrCode}
                                  alt="Certificate verification QR code"
                                  width={112}
                                  height={112}
                                  unoptimized
                                  data-certificate-qr-image
                                  className="h-full w-full object-contain"
                                />
                              </div>

                              <p
                                data-certificate-qr-label
                                className="mt-2 text-[10px] font-semibold tracking-wider text-[var(--muted-foreground)]"
                              >
                                SCAN TO VERIFY
                              </p>
                            </div>

                            <div data-certificate-signature className="text-center">
                              <div
                                data-certificate-signature-line
                                className="mx-auto w-32 border-b border-[var(--border)] pb-2 font-serif italic text-[var(--foreground)]"
                              >
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