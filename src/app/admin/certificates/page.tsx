"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, BadgeCheck, ClipboardCheck, FileSearch, LogOut, Search, ShieldCheck, X } from "lucide-react";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/+$/, "");

type CertificateRecord = {
  certificateId: string;
  membershipId: string | null;
  renewalOfMembershipId: string | null;
  memberName: string;
  organization: string;
  planName: string;
  issueDate: string;
  expiryDate: string | null;
  status: string;
  revokedAt: string | null;
  revocationReason: string | null;
};

type VerificationValues = {
  certificateId: string;
  membershipId: string;
  memberName: string;
  organization: string;
  planName: string;
  issueDate: string;
  expiryDate: string;
  status: string;
};

type VerificationLog = {
  verificationType: string;
  result: string;
  fieldMatches: Record<string, boolean>;
  createdAt: string;
};

function dateInput(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

export default function AdminCertificatesPage() {
  const router = useRouter();
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<CertificateRecord | null>(null);
  const [selectedMode, setSelectedMode] = useState<"verify" | "logs" | "revoke" | null>(null);
  const [verificationValues, setVerificationValues] = useState<VerificationValues | null>(null);
  const [verificationResult, setVerificationResult] = useState<Record<string, unknown> | null>(null);
  const [logs, setLogs] = useState<VerificationLog[]>([]);
  const [revokeReason, setRevokeReason] = useState("");
  const [busy, setBusy] = useState(false);

  const loadCertificates = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ search, status });
      const response = await fetch(`${API_URL}/api/certificates/admin/certificates?${query}`, {
        credentials: "include",
        cache: "no-store",
      });
      const result = await response.json() as { success?: boolean; message?: string; certificates?: CertificateRecord[] };
      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      if (!response.ok || !result.success || !Array.isArray(result.certificates)) {
        throw new Error(result.message || "Unable to load certificates.");
      }
      setCertificates(result.certificates);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load certificates.");
    } finally {
      setLoading(false);
    }
  }, [router, search, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadCertificates(), 250);
    return () => window.clearTimeout(timer);
  }, [loadCertificates]);

  function openVerification(certificate: CertificateRecord) {
    setSelected(certificate);
    setSelectedMode("verify");
    setVerificationValues({
      certificateId: certificate.certificateId,
      membershipId: certificate.membershipId ?? "",
      memberName: certificate.memberName,
      organization: certificate.organization,
      planName: certificate.planName,
      issueDate: dateInput(certificate.issueDate),
      expiryDate: dateInput(certificate.expiryDate),
      status: certificate.status,
    });
    setVerificationResult(null);
    setRevokeReason("");
    setLogs([]);
  }

  async function verifyCertificate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !verificationValues || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/certificates/admin/certificates/${encodeURIComponent(selected.certificateId)}/verify`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(verificationValues),
      });
      const result = await response.json() as { success?: boolean; message?: string } & Record<string, unknown>;
      if (!response.ok || !result.success) throw new Error(result.message || "Certificate verification failed.");
      setVerificationResult(result);
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "Certificate verification failed.");
    } finally {
      setBusy(false);
    }
  }

  async function loadLogs(certificate: CertificateRecord) {
    setSelected(certificate);
    setSelectedMode("logs");
    setVerificationValues(null);
    setVerificationResult(null);
    try {
      const response = await fetch(`${API_URL}/api/certificates/admin/certificates/${encodeURIComponent(certificate.certificateId)}/logs`, {
        credentials: "include",
        cache: "no-store",
      });
      const result = await response.json() as { success?: boolean; message?: string; logs?: VerificationLog[] };
      if (!response.ok || !result.success) throw new Error(result.message || "Unable to load audit history.");
      setLogs(result.logs ?? []);
    } catch (logError) {
      setError(logError instanceof Error ? logError.message : "Unable to load audit history.");
    }
  }

  async function revokeCertificate() {
    if (!selected || !revokeReason.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/certificates/admin/certificates/${encodeURIComponent(selected.certificateId)}/revoke`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: revokeReason }),
      });
      const result = await response.json() as { success?: boolean; message?: string };
      if (!response.ok || !result.success) throw new Error(result.message || "Unable to revoke certificate.");
      setNotice(result.message || "Certificate revoked.");
      setSelected(null);
      await loadCertificates();
    } catch (revokeError) {
      setError(revokeError instanceof Error ? revokeError.message : "Unable to revoke certificate.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch(`${API_URL}/api/auth/logout`, { method: "POST", credentials: "include" });
    router.replace("/login");
  }

  const fields: Array<[keyof VerificationValues, string, string]> = [
    ["certificateId", "Certificate ID", "text"],
    ["membershipId", "Membership ID", "text"],
    ["memberName", "Member name", "text"],
    ["organization", "Organization", "text"],
    ["planName", "Membership plan", "text"],
    ["issueDate", "Issue date", "date"],
    ["expiryDate", "Expiry date", "date"],
    ["status", "Status", "text"],
  ];

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="border-b border-[var(--border)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="rounded-xl border border-[var(--border)] p-2" aria-label="Back to admin"><ArrowLeft size={17} /></Link>
            <div><p className="text-xs text-[var(--muted)]">Membrix / Administration</p><h1 className="mt-1 text-lg font-semibold">Certificate management</h1></div>
          </div>
          <button type="button" onClick={() => void logout()} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm"><LogOut size={15} /> Sign out</button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <nav className="mb-6 flex flex-wrap gap-2 text-sm">
          <Link href="/admin" className="rounded-lg border border-[var(--border)] px-3 py-2">Overview</Link>
          <Link href="/admin/payments" className="rounded-lg border border-[var(--border)] px-3 py-2">Payments</Link>
          <Link href="/admin/plans" className="rounded-lg border border-[var(--border)] px-3 py-2">Plans</Link>
          <Link href="/admin/certificates" className="rounded-lg border border-[#d6b878] bg-[#d6b878]/10 px-3 py-2">Certificates</Link>
          <Link href="/admin/settings" className="rounded-lg border border-[var(--border)] px-3 py-2">Settings</Link>
        </nav>

        {(error || notice) && <p role={error ? "alert" : "status"} className={`mb-5 rounded-xl border p-4 text-sm ${error ? "border-red-500/30 text-red-600" : "border-emerald-500/30 text-emerald-700"}`}>{error || notice}</p>}

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row">
            <label className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search certificate ID, membership ID, or member name" className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] py-2.5 pl-9 pr-3 text-sm" />
            </label>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm">
              <option value="all">All statuses</option><option value="active">Active</option><option value="expired">Expired</option><option value="revoked">Revoked</option>
            </select>
          </div>
          {loading ? <p className="py-10 text-center text-sm text-[var(--muted)]">Loading certificates...</p> : certificates.length === 0 ? <p className="py-10 text-center text-sm text-[var(--muted)]">No certificates found.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-[var(--border)] text-xs uppercase text-[var(--muted)]"><tr><th className="py-3 pr-4">Certificate</th><th className="py-3 pr-4">Member</th><th className="py-3 pr-4">Membership</th><th className="py-3 pr-4">Status</th><th className="py-3">Actions</th></tr></thead>
                <tbody>
                  {certificates.map((certificate) => (
                    <tr key={certificate.certificateId} className="border-b border-[var(--border)] last:border-0">
                      <td className="py-4 pr-4"><p className="font-medium">{certificate.certificateId}</p><p className="mt-1 text-xs text-[var(--muted)]">{certificate.planName}</p></td>
                      <td className="py-4 pr-4">{certificate.memberName}<p className="mt-1 text-xs text-[var(--muted)]">{certificate.organization || "—"}</p></td>
                      <td className="py-4 pr-4">{certificate.membershipId ?? "—"}</td>
                      <td className="py-4 pr-4"><span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-xs">{certificate.status}</span></td>
                      <td className="py-4"><div className="flex gap-2">
                        <button type="button" onClick={() => openVerification(certificate)} className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs"><ClipboardCheck size={14} /> Verify</button>
                        <button type="button" onClick={() => void loadLogs(certificate)} className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs"><FileSearch size={14} /> Logs</button>
                        {certificate.status !== "REVOKED" && <button type="button" onClick={() => { setSelected(certificate); setSelectedMode("revoke"); setVerificationValues(null); setLogs([]); setRevokeReason(""); }} className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 px-2.5 py-1.5 text-xs text-red-600"><X size={14} /> Revoke</button>}
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {selected && (
          <section className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2"><BadgeCheck size={18} className="text-[#b88b48]" /><h2 className="font-semibold">{selected.certificateId}</h2></div>
              <button type="button" onClick={() => setSelected(null)} aria-label="Close details"><X size={18} /></button>
            </div>
            {selected.renewalOfMembershipId && (
              <p className="mb-5 text-sm text-[var(--muted)]">
                Renewal history: this certificate follows membership {selected.renewalOfMembershipId}.
              </p>
            )}
            {selectedMode === "verify" && verificationValues && (
              <form onSubmit={verifyCertificate} className="space-y-4">
                <p className="text-sm text-[var(--muted)]">Check every value against the submitted certificate. Edit fields that differ from the document.</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {fields.map(([field, label, type]) => <label key={field} className="text-sm"><span className="mb-1.5 block font-medium">{label}</span><input type={type} value={verificationValues[field]} onChange={(event) => setVerificationValues((current) => current ? { ...current, [field]: event.target.value } : current)} required className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5" /></label>)}
                </div>
                <button disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-[#b88b48] px-4 py-2.5 text-sm font-semibold text-[#1d160c] disabled:opacity-50"><ShieldCheck size={16} /> {busy ? "Verifying..." : "Compare all fields"}</button>
              </form>
            )}
            {verificationResult && <div role="status" className="mt-4 rounded-xl border border-[var(--border)] p-4"><p className="font-semibold">{String(verificationResult.status)}</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{Object.entries((verificationResult.fieldMatches ?? {}) as Record<string, boolean>).map(([field, matched]) => <p key={field} className={`text-sm ${matched ? "text-emerald-700" : "text-red-600"}`}>{field}: {matched ? "Match" : "Mismatch"}</p>)}</div></div>}
            {selectedMode === "logs" && (logs.length > 0 ? <div className="space-y-2">{logs.map((log, index) => <p key={`${log.createdAt}-${index}`} className="rounded-lg border border-[var(--border)] p-3 text-sm">{new Date(log.createdAt).toLocaleString()} · {log.verificationType} · {log.result}</p>)}</div> : <p className="text-sm text-[var(--muted)]">No verification log entries found.</p>)}
            {selectedMode === "revoke" && (
              <div className="space-y-3">
                <p className="text-sm text-[var(--muted)]">Revoking this certificate immediately invalidates public verification.</p>
                <label className="block text-sm font-medium">Revocation reason<input value={revokeReason} onChange={(event) => setRevokeReason(event.target.value)} maxLength={500} className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5" /></label>
                <button type="button" disabled={busy || !revokeReason.trim()} onClick={() => void revokeCertificate()} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Confirm revocation</button>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
