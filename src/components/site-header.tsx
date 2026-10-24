"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  LayoutDashboard,
  Menu,
  ShieldCheck,
  X,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const navigation = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Membership", href: "/membership" },
  { label: "Contact", href: "/contact" },
];

type HeaderUser = {
  id: string;
  name: string;
  role: "member" | "admin";
};

export default function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<HeaderUser | null>(null);

  // Home, Member Dashboard, and Admin Dashboard have their own headers/sidebars.
  const isDedicatedLayout =
    pathname === "/" ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admin");

  useEffect(() => {
    if (isDedicatedLayout) return;

    let cancelled = false;

    async function checkAuth() {
      try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          if (!cancelled) setUser(null);
          return;
        }

        const data = await response.json();
        const authUser = data?.user ?? data?.data?.user;

        if (authUser && !cancelled) {
          setUser({
            id: String(authUser.id ?? authUser._id),
            name: String(authUser.name || ""),
            role: authUser.role === "admin" ? "admin" : "member",
          });
        }
      } catch {
        if (!cancelled) setUser(null);
      }
    }

    void checkAuth();

    return () => {
      cancelled = true;
    };
  }, [isDedicatedLayout, pathname]);

  if (isDedicatedLayout) {
    return null;
  }

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
        <Link
          href="/"
          onClick={closeMenu}
          className="flex items-center gap-3"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--gold)] text-lg font-bold text-black">
            M
          </span>
          <span className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
            Membrix<span className="text-[var(--gold)]">®</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm transition-colors hover:text-[var(--gold)] ${
                pathname === item.href
                  ? "font-semibold text-[var(--gold)]"
                  : "text-[var(--muted)]"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            user.role === "admin" ? (
              <Link
                href="/admin"
                className="hidden items-center gap-2 rounded-full bg-[#102b46] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#193c5e] sm:inline-flex"
              >
                <ShieldCheck size={16} className="text-[#d6b878]" />
                Admin Dashboard
              </Link>
            ) : (
              <Link
                href="/dashboard"
                className="hidden items-center gap-2 rounded-full bg-[var(--gold)] px-5 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 sm:inline-flex"
              >
                <LayoutDashboard size={16} />
                Dashboard
              </Link>
            )
          ) : (
            <>
              <Link
                href="/login"
                className="hidden rounded-full border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface)] sm:inline-flex"
              >
                Sign in
              </Link>

              <Link
                href="/register"
                className="hidden items-center gap-2 rounded-full bg-[var(--gold)] px-5 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 sm:inline-flex"
              >
                Join Membrix <ArrowUpRight size={16} />
              </Link>
            </>
          )}

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-[var(--foreground)] transition-colors hover:bg-[var(--surface)] lg:hidden"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav
          id="mobile-navigation"
          className="border-t border-[var(--border)] bg-[var(--background)] px-5 py-5 sm:px-8 lg:hidden"
        >
          <div className="mx-auto flex max-w-[1440px] flex-col gap-1">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMenu}
                className={`rounded-xl px-4 py-3 text-sm transition-colors hover:bg-[var(--surface)] ${
                  pathname === item.href
                    ? "font-semibold text-[var(--gold)]"
                    : "text-[var(--foreground)]"
                }`}
              >
                {item.label}
              </Link>
            ))}

            <div className="my-3 border-t border-[var(--border)]" />

            {user ? (
              user.role === "admin" ? (
                <Link
                  href="/admin"
                  onClick={closeMenu}
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#102b46] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#193c5e]"
                >
                  <ShieldCheck size={16} className="text-[#d6b878]" />
                  Admin Dashboard
                </Link>
              ) : (
                <Link
                  href="/dashboard"
                  onClick={closeMenu}
                  className="flex items-center justify-center gap-2 rounded-xl bg-[var(--gold)] px-4 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90"
                >
                  <LayoutDashboard size={16} />
                  Dashboard
                </Link>
              )
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={closeMenu}
                  className="rounded-xl px-4 py-3 text-sm text-[var(--foreground)] transition-colors hover:bg-[var(--surface)]"
                >
                  Sign in
                </Link>

                <Link
                  href="/register"
                  onClick={closeMenu}
                  className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-[var(--gold)] px-4 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90"
                >
                  Become a member <ArrowUpRight size={16} />
                </Link>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
