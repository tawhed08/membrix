"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/+$/, "");

type PublicCertificate = {
  certificateId: string;
  memberName: string;
  organization: string;
  membershipId: string;
  membershipType: string;
  issuedAt: string;
  startDate: string | null;
  endDate: string | null;
  status: string;
};

type MatchFields = {
  membershipId: string;
  memberName: string;
  organization: string;
  planName: string;
  issueDate: string;
  expiryDate: string;
};

type VerificationResponse = {
  success: boolean;
  valid?: boolean;
  verified?: boolean;
  status?: string;
  message?: string;
  certificate?: PublicCertificate;
  fieldMatches?: Partial<Record<keyof MatchFields, boolean>>;
};

const EMPTY_FIELDS: MatchFields = {
  membershipId: "",
  memberName: "",
  organization: "",
  planName: "",
  issueDate: "",
  expiryDate: "",
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "No expiry";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-GB");
}

function VerifyCertificateContent() {
  const params = useParams<{ certificateId: string }>();
  const searchParams = useSearchParams();
  const certificateId = params.certificateId;
  const token = searchParams.get("token");
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<VerificationResponse | null>(null);
  const [fields, setFields] = useState(EMPTY_FIELDS);
  const [checking, setChecking] = useState(false);
  const [matchResult, setMatchResult] = useState<VerificationResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function verify() {
      try {
        const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : "";
        const response = await fetch(
          `${API_URL}/api/certificates/verify/${encodeURIComponent(certificateId)}${tokenQuery}`,
          { cache: "no-store", signal: controller.signal },
        );
        const payload = (await response.json()) as VerificationResponse;
        if (!response.ok || !payload.success) {
          throw new Error(payload.message || "Unable to verify this certificate.");
        }

        setResult(payload);
      } catch (verificationError) {
        if (!controller.signal.aborted) {
          setResult({
            success: false,
            valid: false,
            status: "INVALID",
            message: verificationError instanceof Error
              ? verificationError.message
              : "Unable to connect to the verification service.",
          });
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void verify();
    return () => controller.abort();
  }, [certificateId, token]);

  async function crossMatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (checking) return;
    const submitted = Object.fromEntries(
      Object.entries(fields).filter(([, value]) => value.trim()),
    );
    if (Object.keys(submitted).length === 0) {
      setError("Enter at least one certificate detail to compare.");
      return;
    }
    setChecking(true);
    setError("");
    setMatchResult(null);
    try {
      const response = await fetch(
        `${API_URL}/api/certificates/verify/${encodeURIComponent(certificateId)}/match`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(submitted),
        },
      );
      const payload = (await response.json()) as VerificationResponse;
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Unable to compare certificate information.");
      }
      setMatchResult(payload);
    } catch (matchError) {
      setError(matchError instanceof Error ? matchError.message : "Unable to compare certificate information.");
    } finally {
      setChecking(false);
    }
  }

  const certificate = result?.certificate;
  const status = result?.status ?? "INVALID";
  const verified = status === "VERIFIED";

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-10 text-[var(--foreground)] sm:px-6">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 text-center">
          <Link href="/" className="text-xl font-bold tracking-[0.2em]">MEMBRIX</Link>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">Certificate verification</p>
        </header>

        <section className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-xl">
          <div className="bg-[var(--dark-panel)] px-6 py-7 text-center text-white">
            <p className={`text-xs font-semibold tracking-[0.2em] ${verified ? "text-emerald-300" : "text-amber-300"}`}>
              {loading ? "CHECKING OFFICIAL RECORD" : status}
            </p>
            <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">
              {loading ? "Verifying certificate" : verified ? "Certificate verified" : "Certificate not currently valid"}
            </h1>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-white/70">
              {loading ? "Checking this ID against Membrix records." : result?.message}
            </p>
          </div>

          <div className="space-y-8 p-5 sm:p-8">
            {certificate && (
              <dl className="grid gap-5 sm:grid-cols-2">
                {([
                  ["Certificate ID", certificate.certificateId],
                  ["Membership ID", certificate.membershipId],
                  ["Member name", certificate.memberName],
                  ["Organization", certificate.organization || "—"],
                  ["Membership plan", certificate.membershipType],
                  ["Issue date", formatDate(certificate.issuedAt)],
                  ["Expiry date", formatDate(certificate.endDate)],
                  ["Certificate status", certificate.status],
                ] as const).map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-[var(--border)] p-4">
                    <dt className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">{label}</dt>
                    <dd className="mt-1 break-words text-sm font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            )}

            <form onSubmit={crossMatch} className="space-y-4 border-t border-[var(--border)] pt-6">
              <div>
                <h2 className="text-lg font-semibold">Cross-match certificate details</h2>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">Optionally compare the certificate against official records. Blank fields are skipped.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {([
                  ["membershipId", "Membership ID", "text"],
                  ["memberName", "Member name", "text"],
                  ["organization", "Organization", "text"],
                  ["planName", "Membership plan", "text"],
                  ["issueDate", "Issue date", "date"],
                  ["expiryDate", "Expiry date", "date"],
                ] as const).map(([field, label, type]) => (
                  <label key={field} className="block">
                    <span className="mb-1.5 block text-sm font-medium">{label}</span>
                    <input
                      type={type}
                      value={fields[field]}
                      onChange={(event) => setFields((current) => ({ ...current, [field]: event.target.value }))}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm"
                    />
                  </label>
                ))}
              </div>
              <button disabled={checking || loading} className="rounded-xl bg-[#b88b48] px-4 py-2.5 text-sm font-semibold text-[#1d160c] disabled:opacity-50">
                {checking ? "Comparing..." : "Compare with official record"}
              </button>
              {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
              {matchResult && (
                <div role="status" className="rounded-xl border border-[var(--border)] p-4">
                  <p className="font-semibold">{matchResult.status}</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {Object.entries(matchResult.fieldMatches ?? {}).map(([field, matches]) => (
                      <p key={field} className={`text-sm ${matches ? "text-emerald-700" : "text-red-600"}`}>
                        {field}: {matches ? "Match" : "Does not match"}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function VerifyCertificatePage() {
  return <VerifyCertificateContent />;
}
