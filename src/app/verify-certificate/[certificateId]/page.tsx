import { Suspense } from "react";
import VerifyCertificateClient from "./verification-client";

export default function VerifyCertificatePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[var(--background)] text-sm text-[var(--muted-foreground)]">
          Loading verification...
        </main>
      }
    >
      <VerifyCertificateClient />
    </Suspense>
  );
}
