"use client";

import Link from "next/link";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  Building2,
  CheckCircle2,
  CreditCard,
  LogOut,
  Palette,
  Save,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/+$/, "");

type SectionKey =
  | "organization"
  | "membership"
  | "payments"
  | "security"
  | "appearance";

type SettingsState = {
  organizationName: string;
  websiteUrl: string;
  contactEmail: string;
  supportPhone: string;
  currency: string;
  defaultPlanName: string;
  allowMembershipChanges: boolean;
  requireApprovalForManualPayments: boolean;
  allowBankTransfers: boolean;
  allowBkash: boolean;
  allowNagad: boolean;
  require2FA: boolean;
  sessionTimeout: string;
  showAuditTrail: boolean;
  darkModeDefault: boolean;
  brandAccent: string;
  primaryHighlight: string;
};

const EMPTY_SETTINGS: SettingsState = {
  organizationName: "Membrix",
  websiteUrl: "https://membrix.com",
  contactEmail: "hello@membrix.com",
  supportPhone: "+880 1700-000000",
  currency: "BDT",
  defaultPlanName: "Standard Membership",
  allowMembershipChanges: true,
  requireApprovalForManualPayments: true,
  allowBankTransfers: true,
  allowBkash: true,
  allowNagad: true,
  require2FA: true,
  sessionTimeout: "12 hours",
  showAuditTrail: true,
  darkModeDefault: true,
  brandAccent: "#d6b878",
  primaryHighlight: "#b88b48",
};

const sections: Array<{ key: SectionKey; label: string; icon: typeof Building2 }> = [
  { key: "organization", label: "Organization Settings", icon: Building2 },
  { key: "membership", label: "Membership Configuration", icon: Users },
  { key: "payments", label: "Payment Configuration", icon: CreditCard },
  { key: "security", label: "Security", icon: ShieldCheck },
  { key: "appearance", label: "Appearance", icon: Palette },
];

const SETTINGS_PREVIEW_KEY = "membrix-admin-settings-preview";

function readStoredPreviewSettings(): Partial<SettingsState> | null {
  try {
    const raw = window.localStorage.getItem(SETTINGS_PREVIEW_KEY);
    return raw ? (JSON.parse(raw) as Partial<SettingsState>) : null;
  } catch {
    return null;
  }
}

function writeStoredPreviewSettings(nextSettings: SettingsState) {
  try {
    window.localStorage.setItem(SETTINGS_PREVIEW_KEY, JSON.stringify(nextSettings));
    return true;
  } catch {
    return false;
  }
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SectionKey>("organization");
  const [settings, setSettings] = useState<SettingsState>(EMPTY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
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

        const authData = (await authResponse.json()) as { success?: boolean; user?: { role?: string } };

        if (!authResponse.ok || !authData.success || authData.user?.role !== "admin") {
          router.replace("/dashboard");
          return;
        }

        const response = await fetch(`${API_URL}/api/admin/settings`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        if (response.status === 404 || response.status === 405) {
          const previewSettings = readStoredPreviewSettings();
          if (!cancelled && previewSettings) {
            setSettings((current) => ({ ...current, ...previewSettings }));
          }
          if (!cancelled) {
            setNotice("No backend admin settings endpoint is configured. The current values are preview-only and are stored in this browser.");
          }
          return;
        }

        if (response.ok) {
          const result = (await response.json()) as { success?: boolean; data?: Partial<SettingsState> };

          if (!cancelled && result.success && result.data) {
            setSettings((current) => ({ ...current, ...result.data }));
          }
        }
      } catch {
        if (!cancelled) {
          const previewSettings = readStoredPreviewSettings();
          if (previewSettings) {
            setSettings((current) => ({ ...current, ...previewSettings }));
          }
          setNotice("No live admin settings backend is configured. Changes below are treated as local UI preferences until a persistent API is added.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadSettings();

    return () => {
      cancelled = true;
    };
  }, [router]);

  function updateValue<K extends keyof SettingsState>(key: K, value: SettingsState[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
    setError("");
  }

  function updateToggle(
    key:
      | "allowMembershipChanges"
      | "requireApprovalForManualPayments"
      | "allowBankTransfers"
      | "allowBkash"
      | "allowNagad"
      | "require2FA"
      | "showAuditTrail"
      | "darkModeDefault",
  ) {
    setSettings((current) => ({ ...current, [key]: !current[key] }));
    setError("");
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = event.target;

    if (!name) {
      return;
    }

    updateValue(name as keyof SettingsState, value as never);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    const payload = {
      ...settings,
      organizationName: settings.organizationName.trim(),
      websiteUrl: settings.websiteUrl.trim(),
      contactEmail: settings.contactEmail.trim(),
    };

    try {
      const response = await fetch(`${API_URL}/api/admin/settings`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.status === 404 || response.status === 405) {
        const saved = writeStoredPreviewSettings(payload);
        setNotice(
          saved
            ? "Preview saved locally in this browser only. Organization and payment configuration are not persisted because no admin settings API exists yet."
            : "Preview values were updated in memory, but local storage is unavailable in this browser session. No backend settings were changed.",
        );
        return;
      }

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        const result = (await response.json()) as { message?: string };
        throw new Error(result.message || "Unable to save settings.");
      }

      const result = (await response.json()) as { message?: string };
      setNotice(result.message || "The backend accepted the update.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save settings.");
    } finally {
      setSaving(false);
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
        throw new Error("Unable to confirm sign out.");
      }
    } catch {
      setError("Unable to contact the server to sign out.");
      setLoggingOut(false);
      return;
    }

    router.replace("/login");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto flex min-h-screen max-w-[1800px]">
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-[258px] flex-col border-r border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] lg:flex">
          <div className="border-b border-[var(--border)] px-6 py-6">
            <Link href="/admin" className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#d6b878]/25 bg-[#d6b878]/10 text-[#e6ca8b]">
                <Building2 size={21} strokeWidth={1.7} />
              </span>

              <span>
                <span className="block text-xl font-semibold tracking-tight">
                  Membrix<span className="text-[#d6b878]">.</span>
                </span>
                <span className="mt-0.5 block text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
                  Management suite
                </span>
              </span>
            </Link>
          </div>

          <div className="px-4 pt-7">
            <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              Workspace
            </p>

            <nav className="space-y-1">
              <Link href="/admin" className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm text-[var(--muted)] transition hover:bg-[var(--surface-alt)] hover:text-[var(--foreground)]">
                <Users size={18} />
                Overview
              </Link>
              <Link href="/admin/members" className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm text-[var(--muted)] transition hover:bg-[var(--surface-alt)] hover:text-[var(--foreground)]">
                <Users size={18} />
                Members
              </Link>
              <Link href="/admin/payments" className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm text-[var(--muted)] transition hover:bg-[var(--surface-alt)] hover:text-[var(--foreground)]">
                <Wallet size={18} />
                Payments
              </Link>
              <Link href="/admin/plans" className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm text-[var(--muted)] transition hover:bg-[var(--surface-alt)] hover:text-[var(--foreground)]">
                <BadgeCheck size={18} />
                Plans
              </Link>
              <Link href="/admin/settings" aria-current="page" className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] px-3.5 py-3 text-sm font-medium text-[var(--foreground)]">
                <Settings size={18} className="text-[#e6ca8b]" />
                Settings
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#e6ca8b]" />
              </Link>
            </nav>
          </div>

          <div className="mt-auto p-4">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] p-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d6b878]/10 text-[#e6ca8b]">
                <ShieldCheck size={18} />
              </span>
              <p className="mt-3 text-sm font-medium">Protected configuration</p>
              <p className="mt-1.5 text-xs leading-5 text-[var(--muted)]">
                Core settings stay protected and no gateway secrets are exposed to the frontend.
              </p>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1 lg:ml-[258px]">
          <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-xl">
            <div className="flex h-[76px] items-center justify-between gap-4 px-5 sm:px-8 xl:px-10">
              <div className="flex min-w-0 items-center gap-3">
                <Link href="/admin" className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--foreground)]">
                  <ArrowLeft size={17} />
                </Link>

                <div className="min-w-0">
                  <p className="truncate text-xs text-[var(--muted)]">Membrix / Administration</p>
                  <p className="mt-1 truncate text-sm font-semibold">Settings</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button type="button" onClick={handleLogout} disabled={loggingOut} className="hidden h-10 items-center gap-2 rounded-xl border border-[var(--border)] px-3 text-sm transition hover:bg-[var(--surface)] disabled:opacity-60 md:flex">
                  <LogOut size={16} />
                  <span>{loggingOut ? "Signing out..." : "Sign out"}</span>
                </button>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[1600px] px-5 py-7 sm:px-8 sm:py-9 xl:px-10">
            <section className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#d6b878]/25 bg-[#d6b878]/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#a98843]">
                  <Sparkles size={13} />
                  Workspace configuration
                </div>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-[38px]">Admin settings</h1>
                <p className="mt-2.5 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                  Review and adjust safe operational settings for your organization, memberships, payments, security, and storefront appearance. Preview-only values are clearly marked below when there is no live API endpoint for persistence.
                </p>
              </div>

              <button type="submit" form="admin-settings-form" disabled={saving || loading} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--foreground)] px-4 text-sm font-medium text-[var(--background)] transition hover:opacity-90 disabled:opacity-60">
                <Save size={16} />
                {saving ? "Saving preview..." : "Save preview"}
              </button>
            </section>

            {(error || notice) && (
              <div className={`mb-6 flex items-start gap-3 rounded-2xl border p-4 ${error ? "border-red-500/20 bg-red-500/5" : "border-emerald-500/20 bg-emerald-500/5"}`} role="alert">
                {error ? <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-500" /> : <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {error ? "Unable to save settings" : "Settings saved"}
                  </p>
                  <p className="mt-1 text-sm leading-5 text-[var(--muted)]">{error || notice}</p>
                </div>
              </div>
            )}

            <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
              <aside className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3">
                <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                  Sections
                </p>
                <div className="space-y-1">
                  {sections.map(({ key, label, icon: Icon }) => {
                    const active = activeTab === key;

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setActiveTab(key)}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${active ? "border border-[var(--border)] bg-[var(--surface-alt)] text-[var(--foreground)]" : "text-[var(--muted)] hover:bg-[var(--surface-alt)] hover:text-[var(--foreground)]"}`}
                      >
                        <Icon size={16} className={active ? "text-[#e6ca8b]" : ""} />
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </aside>

              <form id="admin-settings-form" onSubmit={handleSave} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
                {loading ? (
                  <div className="flex min-h-[220px] items-center justify-center text-sm text-[var(--muted)]">
                    Loading configuration...
                  </div>
                ) : (
                  <>
                    <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                      <ShieldCheck size={14} className="shrink-0" />
                      Preview-only controls are clearly marked. Real organization and payment settings require a backend-backed admin endpoint.
                    </div>
                    <div className="mb-6 border-b border-[var(--border)] pb-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#b99a5b]">
                        {activeTab === "organization" ? "Organization Settings" : activeTab === "membership" ? "Membership Configuration" : activeTab === "payments" ? "Payment Configuration" : activeTab === "security" ? "Security" : "Appearance"}
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold tracking-tight">{activeTab === "organization" ? "Organization Settings" : activeTab === "membership" ? "Membership Configuration" : activeTab === "payments" ? "Payment Configuration" : activeTab === "security" ? "Security" : "Appearance"}</h2>
                    </div>

                    {activeTab === "organization" && (
                      <div className="grid gap-5 md:grid-cols-2">
                        <label className="block md:col-span-2">
                          <span className="mb-2 block text-sm font-medium">Organization name</span>
                          <input name="organizationName" value={settings.organizationName} onChange={handleInputChange} className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[#c5a45f] focus:ring-2 focus:ring-[#d6b878]/20" />
                        </label>

                        <label className="block">
                          <span className="mb-2 block text-sm font-medium">Website URL</span>
                          <input name="websiteUrl" value={settings.websiteUrl} onChange={handleInputChange} className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[#c5a45f] focus:ring-2 focus:ring-[#d6b878]/20" />
                        </label>

                        <label className="block">
                          <span className="mb-2 block text-sm font-medium">Contact email</span>
                          <input name="contactEmail" type="email" value={settings.contactEmail} onChange={handleInputChange} className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[#c5a45f] focus:ring-2 focus:ring-[#d6b878]/20" />
                        </label>

                        <label className="block">
                          <span className="mb-2 block text-sm font-medium">Support phone</span>
                          <input name="supportPhone" value={settings.supportPhone} onChange={handleInputChange} className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[#c5a45f] focus:ring-2 focus:ring-[#d6b878]/20" />
                        </label>

                        <label className="block">
                          <span className="mb-2 block text-sm font-medium">Default currency</span>
                          <select name="currency" value={settings.currency} onChange={handleInputChange} className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[#c5a45f] focus:ring-2 focus:ring-[#d6b878]/20">
                            <option value="BDT">BDT</option>
                            <option value="USD">USD</option>
                          </select>
                        </label>
                      </div>
                    )}

                    {activeTab === "membership" && (
                      <div className="grid gap-5 md:grid-cols-2">
                        <label className="block md:col-span-2">
                          <span className="mb-2 block text-sm font-medium">Default plan name</span>
                          <input name="defaultPlanName" value={settings.defaultPlanName} onChange={handleInputChange} className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[#c5a45f] focus:ring-2 focus:ring-[#d6b878]/20" />
                        </label>

                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 md:col-span-2">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium">Allow membership changes</p>
                              <p className="mt-1 text-xs text-[var(--muted)]">Members can switch plans from the dashboard workflow.</p>
                            </div>
                            <button type="button" onClick={() => updateToggle("allowMembershipChanges")} className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${settings.allowMembershipChanges ? "bg-[#d6b878]" : "bg-[var(--surface-alt)]"}`} aria-pressed={settings.allowMembershipChanges}>
                              <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${settings.allowMembershipChanges ? "translate-x-6" : "translate-x-1"}`} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === "payments" && (
                      <div className="grid gap-5 md:grid-cols-2">
                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
                          <p className="text-sm font-medium">Manual bKash</p>
                          <div className="mt-3 flex items-center justify-between gap-2">
                            <span className="text-xs text-[var(--muted)]">Toggle payment method</span>
                            <button type="button" onClick={() => updateToggle("allowBkash")} className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${settings.allowBkash ? "bg-[#d6b878]" : "bg-[var(--surface-alt)]"}`} aria-pressed={settings.allowBkash}>
                              <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${settings.allowBkash ? "translate-x-6" : "translate-x-1"}`} />
                            </button>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
                          <p className="text-sm font-medium">Manual Nagad</p>
                          <div className="mt-3 flex items-center justify-between gap-2">
                            <span className="text-xs text-[var(--muted)]">Toggle payment method</span>
                            <button type="button" onClick={() => updateToggle("allowNagad")} className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${settings.allowNagad ? "bg-[#d6b878]" : "bg-[var(--surface-alt)]"}`} aria-pressed={settings.allowNagad}>
                              <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${settings.allowNagad ? "translate-x-6" : "translate-x-1"}`} />
                            </button>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
                          <p className="text-sm font-medium">Bank transfer</p>
                          <div className="mt-3 flex items-center justify-between gap-2">
                            <span className="text-xs text-[var(--muted)]">Toggle payment option</span>
                            <button type="button" onClick={() => updateToggle("allowBankTransfers")} className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${settings.allowBankTransfers ? "bg-[#d6b878]" : "bg-[var(--surface-alt)]"}`} aria-pressed={settings.allowBankTransfers}>
                              <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${settings.allowBankTransfers ? "translate-x-6" : "translate-x-1"}`} />
                            </button>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
                          <p className="text-sm font-medium">Manual approval</p>
                          <div className="mt-3 flex items-center justify-between gap-2">
                            <span className="text-xs text-[var(--muted)]">Manual transactions require review</span>
                            <button type="button" onClick={() => updateToggle("requireApprovalForManualPayments")} className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${settings.requireApprovalForManualPayments ? "bg-[#d6b878]" : "bg-[var(--surface-alt)]"}`} aria-pressed={settings.requireApprovalForManualPayments}>
                              <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${settings.requireApprovalForManualPayments ? "translate-x-6" : "translate-x-1"}`} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === "security" && (
                      <div className="grid gap-5 md:grid-cols-2">
                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 md:col-span-2">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium">Require 2FA for admin accounts</p>
                              <p className="mt-1 text-xs text-[var(--muted)]">Protect elevated access to administrative tools.</p>
                            </div>
                            <button type="button" onClick={() => updateToggle("require2FA")} className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${settings.require2FA ? "bg-[#d6b878]" : "bg-[var(--surface-alt)]"}`} aria-pressed={settings.require2FA}>
                              <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${settings.require2FA ? "translate-x-6" : "translate-x-1"}`} />
                            </button>
                          </div>
                        </div>

                        <label className="block">
                          <span className="mb-2 block text-sm font-medium">Session timeout</span>
                          <input name="sessionTimeout" value={settings.sessionTimeout} onChange={handleInputChange} className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[#c5a45f] focus:ring-2 focus:ring-[#d6b878]/20" />
                        </label>

                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
                          <p className="text-sm font-medium">Audit log</p>
                          <div className="mt-3 flex items-center justify-between gap-2">
                            <span className="text-xs text-[var(--muted)]">Keep operational activity trail</span>
                            <button type="button" onClick={() => updateToggle("showAuditTrail")} className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${settings.showAuditTrail ? "bg-[#d6b878]" : "bg-[var(--surface-alt)]"}`} aria-pressed={settings.showAuditTrail}>
                              <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${settings.showAuditTrail ? "translate-x-6" : "translate-x-1"}`} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === "appearance" && (
                      <div className="grid gap-5 md:grid-cols-2">
                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
                          <p className="text-sm font-medium">Default theme</p>
                          <div className="mt-3 flex items-center justify-between gap-2">
                            <span className="text-xs text-[var(--muted)]">Dark mode default</span>
                            <button type="button" onClick={() => updateToggle("darkModeDefault")} className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${settings.darkModeDefault ? "bg-[#d6b878]" : "bg-[var(--surface-alt)]"}`} aria-pressed={settings.darkModeDefault}>
                              <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${settings.darkModeDefault ? "translate-x-6" : "translate-x-1"}`} />
                            </button>
                          </div>
                        </div>

                        <label className="block">
                          <span className="mb-2 block text-sm font-medium">Brand accent</span>
                          <input name="brandAccent" type="color" value={settings.brandAccent} onChange={handleInputChange} className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] p-1" />
                        </label>

                        <label className="block">
                          <span className="mb-2 block text-sm font-medium">Primary highlight</span>
                          <input name="primaryHighlight" type="color" value={settings.primaryHighlight} onChange={handleInputChange} className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] p-1" />
                        </label>

                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
                          <p className="text-sm font-medium">Theme preview</p>
                          <div className="mt-4 flex items-center gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-semibold text-[#102b46]" style={{ background: settings.brandAccent }}>
                              M
                            </span>
                            <div>
                              <p className="text-sm font-medium">Membrix brand</p>
                              <p className="text-xs text-[var(--muted)]">Professional dashboard styling</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
