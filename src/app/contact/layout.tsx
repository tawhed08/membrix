import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Membrix",
  description:
    "Contact the Membrix team for membership support, account questions, payment assistance, and business inquiries.",
};

export default function ContactLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
