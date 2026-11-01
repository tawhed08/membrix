import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Membrix",
  description:
    "Learn about Membrix’s purpose, values, and membership platform for organizations and their communities.",
};

export default function AboutLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
