"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CertificateLookupPage() {
  const router = useRouter();
  const [certificateId, setCertificateId] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = certificateId.trim();
    if (normalized) {
      router.push(`/verify-certificate/${encodeURIComponent(normalized)}`);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-10 text-[var(--foreground)]">
      <section className="w-full max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl sm:p-9">
        <Link href="/" className="text-sm font-bold tracking-[0.2em]">MEMBRIX</Link>
        <h1 className="mt-7 text-2xl font-semibold">Verify a membership certificate</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
          Enter the certificate ID to check it against the official Membrix records.
        </p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium">Certificate ID</span>
            <input
              value={certificateId}
              onChange={(event) => setCertificateId(event.target.value)}
              required
              maxLength={100}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm"
            />
          </label>
          <button className="w-full rounded-xl bg-[#b88b48] px-4 py-3 text-sm font-semibold text-[#1d160c]">
            Verify certificate
          </button>
        </form>
      </section>
    </main>
  );
}
