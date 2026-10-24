"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  Crown,
  Gem,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
  Users,
  X,
  Zap,
} from "lucide-react";

type Theme = "dark" | "light";

type HomeAuthUser = {
  id: string;
  name: string;
  email: string;
  role: "member" | "admin";
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const themeListeners = new Set<() => void>();

function subscribeTheme(callback: () => void) {
  themeListeners.add(callback);
  return () => themeListeners.delete(callback);
}

function getThemeSnapshot(): Theme {
  if (typeof document === "undefined") return "light";

  return document.documentElement.dataset.theme === "dark"
    ? "dark"
    : "light";
}

function getServerThemeSnapshot(): Theme {
  return "light";
}

function applyTheme(nextTheme: Theme) {
  document.documentElement.classList.toggle(
    "dark",
    nextTheme === "dark",
  );

  document.documentElement.dataset.theme = nextTheme;

  try {
    localStorage.setItem("membrix-theme", nextTheme);
  } catch {
    // Theme switching still works when browser storage is unavailable.
  }

  themeListeners.forEach((listener) => listener());

  window.dispatchEvent(new Event("membrix-theme-change"));
}

const plans = [
  {
    number: "01",
    name: "Essential",
    description: "A considered start for your membership journey.",
    price: "৳1,200",
    period: "per year",
    icon: ShieldCheck,
    featured: false,
    benefits: [
      "Digital membership card",
      "Member-only resources",
      "Community access",
      "Email support",
    ],
  },
  {
    number: "02",
    name: "Prestige",
    description: "More access for a more connected experience.",
    price: "৳2,500",
    period: "per year",
    icon: Crown,
    featured: true,
    benefits: [
      "Everything in Essential",
      "Priority member support",
      "Exclusive event access",
      "Premium member benefits",
    ],
  },
  {
    number: "03",
    name: "Elite",
    description: "An elevated experience for ambitious members.",
    price: "৳5,000",
    period: "per year",
    icon: Gem,
    featured: false,
    benefits: [
      "Everything in Prestige",
      "VIP event invitations",
      "Dedicated assistance",
      "Exclusive opportunities",
    ],
  },
];

const benefits = [
  {
    number: "01",
    title: "People, connected.",
    description:
      "Bring members and organizations closer with a more considered digital membership experience.",
    icon: Users,
    detail: "COMMUNITY",
  },
  {
    number: "02",
    title: "Everything, organized.",
    description:
      "Keep membership information, digital cards, renewals and payment records in one place.",
    icon: ShieldCheck,
    detail: "SIMPLICITY",
  },
  {
    number: "03",
    title: "Time, better spent.",
    description:
      "Reduce repetitive administration and make more room for the connections that matter.",
    icon: Zap,
    detail: "EFFICIENCY",
  },
];

const editorialValues = [
  {
    number: "01",
    title: "Clarity over complexity",
    text: "Membership should feel straightforward from the first interaction.",
  },
  {
    number: "02",
    title: "People before processes",
    text: "Technology works best when it helps people build meaningful connections.",
  },
  {
    number: "03",
    title: "Designed with intention",
    text: "Every detail should make the membership experience more useful.",
  },
];

export default function Home() {
  const theme = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getServerThemeSnapshot,
  );

  const [menuOpen, setMenuOpen] = useState(false);
  const [authUser, setAuthUser] = useState<HomeAuthUser | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [authNotice, setAuthNotice] = useState("");

  const homeRef = useRef<HTMLElement>(null);

  // Load the authenticated user from the backend.
  useEffect(() => {
    let cancelled = false;

    async function loadAuthUser() {
      try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          if (!cancelled) {
            setAuthUser(null);
          }
          return;
        }

        const payload: unknown = await response.json();

        if (typeof payload !== "object" || payload === null) {
          return;
        }

        const data = payload as Record<string, unknown>;

        const nested =
          typeof data.data === "object" && data.data !== null
            ? (data.data as Record<string, unknown>)
            : null;

        const candidate = data.user ?? nested?.user;

        if (typeof candidate !== "object" || candidate === null) {
          return;
        }

        const user = candidate as Record<string, unknown>;
        const userId = user.id ?? user._id;

        if (!userId || typeof user.email !== "string") {
          return;
        }

        if (!cancelled) {
          setAuthUser({
            id: String(userId),
            name:
              typeof user.name === "string" && user.name.trim()
                ? user.name.trim()
                : user.email.split("@")[0],
            email: user.email,
            role: user.role === "admin" ? "admin" : "member",
          });
        }
      } catch {
        if (!cancelled) {
          setAuthUser(null);
        }
      }
    }

    void loadAuthUser();

    return () => {
      cancelled = true;
    };
  }, []);

  // Main GSAP animations.
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const root = homeRef.current;

    if (!root) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const ctx = gsap.context(() => {
      if (reduceMotion) {
        gsap.set(
          [
            ".editorial-eyebrow",
            ".editorial-title-line",
            ".editorial-description",
            ".editorial-action",
            ".editorial-visual",
            ".editorial-reveal",
            ".editorial-stagger .stagger-item",
            ".editorial-value",
          ],
          { clearProps: "all" },
        );
        return;
      }

      const intro = gsap.timeline({
        defaults: { ease: "power3.out" },
      });

      intro
        .fromTo(
          ".editorial-eyebrow",
          { autoAlpha: 0, y: 18 },
          { autoAlpha: 1, y: 0, duration: 0.65 },
        )
        .fromTo(
          ".editorial-title-line",
          { autoAlpha: 0, y: 65, rotateX: -8 },
          {
            autoAlpha: 1,
            y: 0,
            rotateX: 0,
            duration: 0.9,
            stagger: 0.13,
          },
          "-=0.28",
        )
        .fromTo(
          ".editorial-description",
          { autoAlpha: 0, y: 22 },
          { autoAlpha: 1, y: 0, duration: 0.7 },
          "-=0.35",
        )
        .fromTo(
          ".editorial-action",
          { autoAlpha: 0, y: 15 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.55,
            stagger: 0.1,
          },
          "-=0.25",
        )
        .fromTo(
          ".editorial-visual",
          { autoAlpha: 0, y: 30, scale: 0.96 },
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            duration: 1,
          },
          "-=0.75",
        );

      gsap.utils
        .toArray<HTMLElement>(".editorial-reveal")
        .forEach((element) => {
          gsap.fromTo(
            element,
            { autoAlpha: 0, y: 32 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.8,
              ease: "power2.out",
              scrollTrigger: {
                trigger: element,
                start: "top 87%",
                once: true,
              },
            },
          );
        });

      gsap.utils
        .toArray<HTMLElement>(".editorial-stagger")
        .forEach((group) => {
          const children = group.querySelectorAll(".stagger-item");

          gsap.fromTo(
            children,
            { autoAlpha: 0, y: 28 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.65,
              stagger: 0.13,
              ease: "power2.out",
              scrollTrigger: {
                trigger: group,
                start: "top 83%",
                once: true,
              },
            },
          );
        });

      gsap.fromTo(
        ".editorial-value",
        { autoAlpha: 0, x: 22 },
        {
          autoAlpha: 1,
          x: 0,
          duration: 0.65,
          stagger: 0.14,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".editorial-values",
            start: "top 85%",
            once: true,
          },
        },
      );

      gsap.to(".hero-orbit", {
        rotation: 360,
        duration: 42,
        ease: "none",
        repeat: -1,
        transformOrigin: "50% 50%",
      });

      gsap.to(".hero-orbit-inner", {
        rotation: -360,
        duration: 32,
        ease: "none",
        repeat: -1,
        transformOrigin: "50% 50%",
      });

      gsap.to(".hero-float-one", {
        y: -10,
        duration: 2.6,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });

      gsap.to(".hero-float-two", {
        y: 10,
        duration: 3.1,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        delay: 0.4,
      });

      gsap.to(".hero-artwork", {
        y: -35,
        ease: "none",
        scrollTrigger: {
          trigger: ".hero-artwork",
          start: "top top",
          end: "bottom top",
          scrub: 1,
        },
      });

      gsap.to(".cta-glow", {
        x: 45,
        y: -20,
        duration: 5,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });
    }, root);

    return () => {
      ctx.revert();
    };
  }, []);

  function toggleTheme() {
    applyTheme(theme === "dark" ? "light" : "dark");
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  async function handleHomeLogout() {
    if (loggingOut) return;

    setLoggingOut(true);
    setAuthNotice("");

    try {
      const response = await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        setAuthNotice("Unable to sign out. Please try again.");
        return;
      }

      setAuthUser(null);
      setMenuOpen(false);
    } catch {
      setAuthNotice(
        "The server could not complete sign out. Please check your connection.",
      );
    } finally {
      setLoggingOut(false);
    }
  }

  const firstName = authUser?.name.trim().split(/\s+/)[0] || "Profile";

  return (
    <main
      ref={homeRef}
      className="membrix-home min-h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]"
    >
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between gap-4 px-5 sm:px-8 lg:px-12">
          <a
            href="#home"
            className="flex shrink-0 items-center gap-3"
            aria-label="Membrix home"
            onClick={closeMenu}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#102b46] text-lg font-semibold text-[#d6b878]">
              m
            </span>
            <span className="text-[21px] font-semibold tracking-[-0.07em]">
              membrix<span className="text-[#b89554]">.</span>
            </span>
          </a>

          <nav className="hidden items-center gap-8 lg:flex">
            <a
              className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
              href="#benefits"
            >
              The experience
            </a>
            <a
              className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
              href="#membership"
            >
              Membership
            </a>
            <a
              className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
              href="#approach"
            >
              Our philosophy
            </a>
            <a
              className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
              href="/contact"
            >
              Contact
            </a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] transition-colors hover:bg-[var(--surface)]"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? (
                <Sun size={17} strokeWidth={1.7} />
              ) : (
                <Moon size={17} strokeWidth={1.7} />
              )}
            </button>

            {authUser ? (
              <>
                <a
                  href={authUser.role === "admin" ? "/admin" : "/dashboard"}
                  className="button button-gold hidden items-center gap-2 sm:inline-flex"
                  title={`${authUser.role === "admin" ? "Admin Dashboard" : "Dashboard"} for ${authUser.name}`}
                >
                  {authUser.role === "admin" ? (
                    <ShieldCheck size={16} />
                  ) : (
                    <LayoutDashboard size={16} />
                  )}
                  <span className="max-w-28 truncate">{firstName}</span>
                  <ArrowUpRight size={16} />
                </a>

                <button
                  type="button"
                  onClick={() => void handleHomeLogout()}
                  disabled={loggingOut}
                  className="button button-outline hidden items-center gap-2 sm:inline-flex disabled:opacity-60"
                >
                  <LogOut size={15} />
                  {loggingOut ? "Signing out..." : "Sign out"}
                </button>
              </>
            ) : (
              <>
                <a
                  href="/login"
                  className="button button-outline hidden sm:inline-flex"
                >
                  Sign in
                </a>

                <a
                  href="/register"
                  className="button button-gold hidden items-center gap-2 sm:inline-flex"
                >
                  Become a member
                  <ArrowUpRight size={16} />
                </a>
              </>
            )}

            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] lg:hidden"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>
        </div>

        {authNotice && (
          <div
            role="status"
            aria-live="polite"
            className="border-t border-red-500/20 bg-red-500/5 px-5 py-3 text-center text-sm text-red-600 dark:text-red-300"
          >
            {authNotice}
          </div>
        )}

        {menuOpen && (
          <nav className="border-t border-[var(--border)] bg-[var(--background)] px-5 py-5 sm:px-8 lg:hidden">
            <div className="mx-auto flex max-w-[1440px] flex-col gap-1">
              <a
                href="#benefits"
                className="rounded-lg px-3 py-3 text-sm hover:bg-[var(--surface)]"
                onClick={closeMenu}
              >
                The experience
              </a>
              <a
                href="#membership"
                className="rounded-lg px-3 py-3 text-sm hover:bg-[var(--surface)]"
                onClick={closeMenu}
              >
                Membership
              </a>
              <a
                href="#approach"
                className="rounded-lg px-3 py-3 text-sm hover:bg-[var(--surface)]"
                onClick={closeMenu}
              >
                Our philosophy
              </a>
              <a
                href="/contact"
                className="rounded-lg px-3 py-3 text-sm hover:bg-[var(--surface)]"
                onClick={closeMenu}
              >
                Contact
              </a>

              <div className="my-2 border-t border-[var(--border)]" />

              {authUser ? (
                <>
                  <a
                    href={authUser.role === "admin" ? "/admin" : "/dashboard"}
                    className="button button-gold mt-2 justify-center"
                    onClick={closeMenu}
                  >
                    {authUser.role === "admin" ? (
                      <ShieldCheck size={16} />
                    ) : (
                      <LayoutDashboard size={16} />
                    )}
                    {authUser.role === "admin"
                      ? "Admin Dashboard"
                      : `${authUser.name} — Dashboard`}
                    <ArrowRight size={16} />
                  </a>

                  <button
                    type="button"
                    className="button button-outline mt-2 justify-center"
                    onClick={() => void handleHomeLogout()}
                    disabled={loggingOut}
                  >
                    <LogOut size={15} />
                    {loggingOut ? "Signing out..." : "Sign out"}
                  </button>
                </>
              ) : (
                <>
                  <a
                    href="/login"
                    className="button button-outline mt-2 justify-center"
                    onClick={closeMenu}
                  >
                    Sign in
                  </a>

                  <a
                    href="/register"
                    className="button button-gold mt-2 justify-center"
                    onClick={closeMenu}
                  >
                    Become a member
                    <ArrowRight size={16} />
                  </a>
                </>
              )}
            </div>
          </nav>
        )}
      </header>

      {/* Hero */}
      <section id="home" className="relative border-b border-[var(--border)]">
        <div className="pointer-events-none absolute right-[-180px] top-[-130px] h-[500px] w-[500px] rounded-full bg-[#c5a66b]/10 blur-[100px]" />

        <div className="relative mx-auto grid max-w-[1440px] items-center gap-12 px-5 pb-16 pt-16 sm:px-8 sm:pb-20 sm:pt-20 lg:grid-cols-[1.12fr_0.88fr] lg:gap-10 lg:px-12 lg:pb-24 lg:pt-24">
          <div className="relative z-10">
            <div className="editorial-eyebrow mb-8 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)] sm:text-xs">
              <span className="h-px w-8 bg-[#b89554]" />
              A more thoughtful way to belong
            </div>

            <h1 className="mb-8 max-w-[850px] text-[clamp(3.5rem,8.2vw,7.8rem)] font-medium leading-[0.94] tracking-[-0.085em]">
              <span className="editorial-title-line block">
                Membership,
              </span>
              <span className="editorial-title-line block">
                reimagined
              </span>
              <span className="editorial-title-line block font-serif italic font-normal tracking-[-0.075em] text-[#b89554]">
                around you.
              </span>
            </h1>

            <p className="editorial-description max-w-[490px] text-base leading-8 text-[var(--muted)] sm:text-lg">
              A more considered way to manage memberships, connect
              communities, and make every member experience matter.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <a
                href="#membership"
                className="button button-gold editorial-action"
              >
                Explore membership
                <ArrowRight size={17} />
              </a>
              <a
                href="#benefits"
                className="button button-outline editorial-action"
              >
                Discover Membrix
                <ArrowDownRight size={16} />
              </a>
            </div>

            <div className="editorial-action mt-12 flex items-center gap-3 border-t border-[var(--border)] pt-5 sm:mt-16">
              <div className="flex -space-x-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--background)] bg-[#102b46] text-[10px] font-semibold text-white">
                  M
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--background)] bg-[#d8c5a2] text-[10px] font-semibold text-[#102b46]">
                  +
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--background)] bg-[var(--surface-alt)] text-[10px] font-semibold">
                  ∞
                </span>
              </div>
              <p className="text-xs leading-5 text-[var(--muted)] sm:text-sm">
                Built around people.
                <span className="block font-medium text-[var(--foreground)]">
                  Designed for better connections.
                </span>
              </p>
            </div>
          </div>

          {/* Animated hero visual */}
          <div className="editorial-visual relative mx-auto w-full max-w-[580px] lg:ml-auto">
            <div className="hero-artwork relative aspect-[0.91] overflow-hidden rounded-[2px] border border-[var(--border)] bg-[var(--surface)] sm:aspect-[0.95]">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_55%_43%,rgba(197,166,107,0.18),transparent_48%)]" />

              <div className="absolute inset-x-0 top-0 flex items-center justify-between border-b border-[var(--border)] px-5 py-4 sm:px-7">
                <span className="text-[9px] font-semibold tracking-[0.2em] text-[var(--muted)] sm:text-[10px]">
                  MEMBRIX / MEMBERSHIP
                </span>
                <span className="text-[9px] tracking-[0.15em] text-[var(--muted)] sm:text-[10px]">
                  EST. FOR PEOPLE
                </span>
              </div>

              <div className="absolute left-1/2 top-[44%] flex aspect-square w-[72%] -translate-x-1/2 -translate-y-1/2 items-center justify-center">
                <div className="hero-orbit absolute inset-0 rounded-full border border-[#b89554]/35">
                  <span className="absolute left-[14%] top-[13%] h-3 w-3 rounded-full bg-[#b89554] shadow-[0_0_28px_rgba(184,149,84,0.5)]" />
                </div>

                <div className="hero-orbit-inner absolute inset-[11%] rounded-full border border-dashed border-[var(--border)]">
                  <span className="absolute bottom-[12%] right-[9%] h-2.5 w-2.5 rounded-full bg-[#102b46] dark:bg-[#d6b878]" />
                </div>

                <div className="relative flex h-[62%] w-[62%] flex-col items-center justify-center rounded-full border border-[#b89554]/40 bg-[var(--background)] shadow-[0_24px_100px_rgba(16,43,70,0.09)]">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#102b46] text-xl font-semibold text-[#d6b878] sm:h-14 sm:w-14 sm:text-2xl">
                    m
                  </div>
                  <span className="text-[10px] font-semibold tracking-[0.26em] sm:text-xs">
                    MEMBRIX
                  </span>
                  <span className="mt-2 text-center font-serif text-xl italic text-[#b89554] sm:text-2xl">
                    A sense of belonging.
                  </span>
                </div>

                <div className="hero-float-one absolute right-[-1%] top-[23%] flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--background)] shadow-lg sm:h-12 sm:w-12">
                  <Gem
                    size={19}
                    strokeWidth={1.3}
                    className="text-[#b89554]"
                  />
                </div>

                <div className="hero-float-two absolute bottom-[12%] left-[-3%] flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--background)] shadow-lg sm:h-12 sm:w-12">
                  <Sparkles
                    size={18}
                    strokeWidth={1.3}
                    className="text-[#b89554]"
                  />
                </div>
              </div>

              <div className="absolute inset-x-0 bottom-0 border-t border-[var(--border)]">
                <div className="grid grid-cols-2">
                  <div className="border-r border-[var(--border)] px-5 py-5 sm:px-7 sm:py-6">
                    <span className="block text-[9px] tracking-[0.18em] text-[var(--muted)] sm:text-[10px]">
                      OUR PRINCIPLE
                    </span>
                    <span className="mt-2 block text-sm font-medium sm:text-base">
                      People first.
                    </span>
                  </div>
                  <div className="px-5 py-5 sm:px-7 sm:py-6">
                    <span className="block text-[9px] tracking-[0.18em] text-[var(--muted)] sm:text-[10px]">
                      OUR APPROACH
                    </span>
                    <span className="mt-2 block text-sm font-medium sm:text-base">
                      Purposefully simple.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 text-[9px] font-medium uppercase tracking-[0.16em] text-[var(--muted)] sm:text-[10px]">
              <span>A considered membership experience</span>
              <span>01 — 03</span>
            </div>
          </div>
        </div>

        <a
          href="#benefits"
          className="group flex items-center justify-center gap-3 border-t border-[var(--border)] px-5 py-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
        >
          Explore the Membrix experience
          <ArrowDownRight
            size={15}
            className="transition-transform group-hover:translate-x-1 group-hover:translate-y-1"
          />
        </a>
      </section>

      {/* Brand principles */}
      <section className="border-b border-[var(--border)]">
        <div className="mx-auto grid max-w-[1440px] gap-6 px-5 py-8 sm:px-8 md:grid-cols-[0.8fr_1fr_1fr_1fr] md:items-center md:gap-5 lg:px-12">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
            The Membrix principles
          </p>

          <div className="flex items-center gap-3">
            <ShieldCheck
              size={18}
              strokeWidth={1.5}
              className="shrink-0 text-[#b89554]"
            />
            <span className="text-sm">Thoughtful organization</span>
          </div>

          <div className="flex items-center gap-3">
            <Users
              size={18}
              strokeWidth={1.5}
              className="shrink-0 text-[#b89554]"
            />
            <span className="text-sm">Meaningful connection</span>
          </div>

          <div className="flex items-center gap-3">
            <Gem
              size={18}
              strokeWidth={1.5}
              className="shrink-0 text-[#b89554]"
            />
            <span className="text-sm">A better experience</span>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section
        id="benefits"
        className="scroll-mt-24 border-b border-[var(--border)] py-20 sm:py-28 lg:py-36"
      >
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <div className="editorial-reveal mb-14 grid gap-7 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:gap-16">
            <div>
              <p className="mb-6 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)] sm:text-xs">
                <span className="h-px w-8 bg-[#b89554]" />
                The experience
              </p>

              <h2 className="max-w-[800px] text-4xl font-medium leading-[1.05] tracking-[-0.065em] sm:text-5xl lg:text-7xl">
                Less friction.
                <br />
                <span className="font-serif italic font-normal text-[#b89554]">
                  More belonging.
                </span>
              </h2>
            </div>

            <p className="max-w-[460px] text-sm leading-7 text-[var(--muted)] sm:text-base sm:leading-8 lg:pb-2">
              The best membership experience does more than keep
              things organized. It gives people and organizations
              a clearer way to connect, participate and grow together.
            </p>
          </div>

          <div className="editorial-stagger grid border-l border-t border-[var(--border)] sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;

              return (
                <article
                  key={benefit.number}
                  className="stagger-item group relative flex min-h-[290px] flex-col border-b border-r border-[var(--border)] p-6 transition-colors hover:bg-[var(--surface)] sm:min-h-[330px] sm:p-8 lg:p-9"
                >
                  <div className="mb-12 flex items-start justify-between">
                    <span className="text-xs tracking-[0.15em] text-[var(--muted)]">
                      {benefit.number}
                    </span>

                    <span className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] transition-all duration-300 group-hover:border-[#b89554]/50 group-hover:bg-[#b89554]/10">
                      <Icon
                        size={20}
                        strokeWidth={1.5}
                        className="text-[#b89554]"
                      />
                    </span>
                  </div>

                  <span className="mb-3 text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                    {benefit.detail}
                  </span>

                  <h3 className="text-2xl font-medium tracking-[-0.045em] sm:text-[27px]">
                    {benefit.title}
                  </h3>

                  <p className="mt-4 max-w-[340px] text-sm leading-7 text-[var(--muted)]">
                    {benefit.description}
                  </p>

                  <span className="mt-auto flex justify-end pt-8 text-[var(--muted)] transition-all duration-300 group-hover:translate-x-1 group-hover:text-[#b89554]">
                    <ArrowUpRight size={20} strokeWidth={1.5} />
                  </span>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Membership plans */}
      <section
        id="membership"
        className="scroll-mt-24 border-b border-[var(--border)] bg-[var(--surface)] py-20 sm:py-28 lg:py-36"
      >
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <div className="editorial-reveal mb-12 flex flex-col justify-between gap-7 lg:mb-16 lg:flex-row lg:items-end">
            <div>
              <p className="mb-6 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)] sm:text-xs">
                <span className="h-px w-8 bg-[#b89554]" />
                Membership options
              </p>

              <h2 className="max-w-[850px] text-4xl font-medium leading-[1.05] tracking-[-0.065em] sm:text-5xl lg:text-7xl">
                Find the right
                <br />
                <span className="font-serif italic font-normal text-[#b89554]">
                  way to belong.
                </span>
              </h2>
            </div>

            <p className="max-w-[390px] text-sm leading-7 text-[var(--muted)] sm:text-base">
              Explore the membership options and find the level
              of access that suits your needs.
            </p>
          </div>

          <div className="editorial-stagger grid gap-4 lg:grid-cols-3">
            {plans.map((plan) => {
              const Icon = plan.icon;

              return (
                <article
                  key={plan.name}
                  className={`stagger-item group relative flex flex-col border p-6 transition-colors duration-300 hover:border-[#b89554]/70 sm:p-8 lg:p-9 ${
                    plan.featured
                      ? "border-[#b89554]/65 bg-[var(--background)]"
                      : "border-[var(--border)] bg-[var(--background)]"
                  }`}
                >
                  {plan.featured && (
                    <div className="mb-6 flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#b89554]">
                      <Sparkles size={14} />
                      Recommended option
                    </div>
                  )}

                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] tracking-[0.16em] text-[var(--muted)]">
                        PLAN {plan.number}
                      </span>
                      <h3 className="mt-3 text-3xl font-medium tracking-[-0.06em]">
                        {plan.name}
                      </h3>
                    </div>

                    <Icon
                      size={25}
                      strokeWidth={1.4}
                      className="text-[#b89554] transition-transform duration-300 group-hover:-translate-y-1"
                    />
                  </div>

                  <p className="mt-4 min-h-[48px] text-sm leading-6 text-[var(--muted)]">
                    {plan.description}
                  </p>

                  <div className="mt-8 border-b border-[var(--border)] pb-7">
                    <span className="text-4xl font-medium tracking-[-0.06em] sm:text-5xl">
                      {plan.price}
                    </span>
                    <span className="mt-2 block text-xs text-[var(--muted)]">
                      {plan.period}
                    </span>
                  </div>

                  <p className="mb-5 mt-7 text-[9px] font-semibold uppercase tracking-[0.19em] text-[var(--muted)]">
                    Included in your membership
                  </p>

                  <ul className="mb-9 space-y-4">
                    {plan.benefits.map((benefit) => (
                      <li
                        key={benefit}
                        className="flex items-start gap-3 text-sm leading-6"
                      >
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#b89554]/12 text-[#b89554]">
                          <Check size={12} strokeWidth={2} />
                        </span>
                        {benefit}
                      </li>
                    ))}
                  </ul>

                  <a
                    href="/register"
                    className={`button mt-auto w-full ${
                      plan.featured ? "button-gold" : "button-plan"
                    }`}
                  >
                    Choose {plan.name}
                    <ArrowRight size={16} />
                  </a>
                </article>
              );
            })}
          </div>

          <p className="editorial-reveal mt-6 text-xs leading-6 text-[var(--muted)]">
            Note: The plans, prices and benefits displayed here are
            illustrative and should be confirmed before launch.
          </p>
        </div>
      </section>

      {/* Philosophy */}
      <section
        id="approach"
        className="scroll-mt-24 border-b border-[var(--border)] py-20 sm:py-28 lg:py-36"
      >
        <div className="mx-auto grid max-w-[1440px] gap-14 px-5 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-24 lg:px-12">
          <div className="editorial-reveal relative flex min-h-[340px] items-center justify-center overflow-hidden border border-[var(--border)] bg-[var(--surface)] p-8 sm:min-h-[450px]">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(197,166,107,0.15),transparent_65%)]" />

            <div className="relative flex aspect-square w-full max-w-[290px] items-center justify-center rounded-full border border-[#b89554]/35">
              <div className="absolute inset-[12%] rounded-full border border-dashed border-[var(--border)]" />

              <div className="relative flex flex-col items-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#102b46] text-3xl font-semibold text-[#d6b878]">
                  m
                </span>
                <span className="mt-5 text-xs font-semibold tracking-[0.3em]">
                  MEMBRIX
                </span>
                <span className="mt-2 font-serif text-lg italic text-[#b89554]">
                  Built around belonging.
                </span>
              </div>

              <span className="absolute right-[6%] top-[22%] flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--background)]">
                <Sparkles size={17} className="text-[#b89554]" />
              </span>

              <span className="absolute bottom-[18%] left-[1%] flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--background)]">
                <Gem size={17} className="text-[#b89554]" />
              </span>
            </div>

            <span className="absolute bottom-5 left-5 text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)] sm:bottom-7 sm:left-7">
              A platform with purpose
            </span>
          </div>

          <div className="editorial-reveal flex flex-col justify-center">
            <p className="mb-6 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)] sm:text-xs">
              <span className="h-px w-8 bg-[#b89554]" />
              Our philosophy
            </p>

            <h2 className="text-4xl font-medium leading-[1.07] tracking-[-0.065em] sm:text-5xl lg:text-6xl">
              Technology should
              <br />
              feel{" "}
              <span className="font-serif italic font-normal text-[#b89554]">
                human.
              </span>
            </h2>

            <p className="mt-7 max-w-[520px] text-sm leading-8 text-[var(--muted)] sm:text-base">
              Great membership experiences begin with people,
              not processes. Membrix is being designed to make
              membership management more organized, more accessible
              and easier to navigate.
            </p>

            <div className="editorial-values mt-10 border-t border-[var(--border)]">
              {editorialValues.map((value) => (
                <div
                  key={value.number}
                  className="editorial-value flex gap-5 border-b border-[var(--border)] py-5 sm:gap-7"
                >
                  <span className="pt-1 text-xs text-[#b89554]">
                    {value.number}
                  </span>

                  <div>
                    <h3 className="text-base font-medium tracking-tight">
                      {value.title}
                    </h3>
                    <p className="mt-2 max-w-[430px] text-sm leading-6 text-[var(--muted)]">
                      {value.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <a
              href="/about"
              className="mt-8 inline-flex w-fit items-center gap-2 text-sm font-medium transition-colors hover:text-[#b89554]"
            >
              Learn more about Membrix
              <ArrowUpRight size={17} />
            </a>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section
        id="get-started"
        className="relative overflow-hidden border-b border-[var(--border)] bg-[#102b46] text-white"
      >
        <div className="cta-glow pointer-events-none absolute -right-24 -top-32 h-[400px] w-[400px] rounded-full bg-[#c5a66b]/15 blur-[100px]" />

        <div className="relative mx-auto grid max-w-[1440px] gap-10 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[1fr_auto] lg:items-end lg:gap-16 lg:px-12 lg:py-32">
          <div className="editorial-reveal">
            <p className="mb-7 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/60 sm:text-xs">
              <span className="h-px w-8 bg-[#d6b878]" />
              Your next chapter
            </p>

            <h2 className="max-w-[850px] text-5xl font-medium leading-[0.99] tracking-[-0.075em] sm:text-6xl lg:text-8xl">
              Make belonging
              <br />
              <span className="font-serif italic font-normal text-[#d6b878]">
                mean more.
              </span>
            </h2>

            <p className="mt-7 max-w-[490px] text-sm leading-7 text-white/65 sm:text-base sm:leading-8">
              Discover a more considered way to manage memberships
              and bring your community closer together.
            </p>
          </div>

          <div className="editorial-reveal flex flex-col items-start gap-4 lg:items-end">
            <a
              href={
                authUser
                  ? authUser.role === "admin"
                    ? "/admin"
                    : "/dashboard"
                  : "/register"
              }
              className="button button-gold"
            >
              {authUser
                ? authUser.role === "admin"
                  ? "Admin Dashboard"
                  : "Go to dashboard"
                : "Become a member"}
              <ArrowRight size={17} />
            </a>

            <a
              href="/contact"
              className="inline-flex items-center gap-2 py-2 text-sm text-white/70 transition-colors hover:text-white"
            >
              Have a question?
              <ArrowUpRight size={15} />
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[var(--background)]">
        <div className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-12">
          <div className="grid gap-9 border-b border-[var(--border)] pb-9 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
            <div>
              <a href="#home" className="inline-flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#102b46] text-lg font-semibold text-[#d6b878]">
                  m
                </span>
                <span className="text-xl font-semibold tracking-[-0.07em]">
                  membrix<span className="text-[#b89554]">.</span>
                </span>
              </a>

              <p className="mt-4 max-w-[300px] text-sm leading-7 text-[var(--muted)]">
                Membership, thoughtfully reimagined. Built around
                people and better connections.
              </p>
            </div>

            <div>
              <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                Explore
              </p>

              <div className="flex flex-col items-start gap-3 text-sm">
                <a
                  className="transition-colors hover:text-[#b89554]"
                  href="#benefits"
                >
                  The experience
                </a>
                <a
                  className="transition-colors hover:text-[#b89554]"
                  href="#membership"
                >
                  Membership
                </a>
                <a
                  className="transition-colors hover:text-[#b89554]"
                  href="/about"
                >
                  About us
                </a>
              </div>
            </div>

            <div>
              <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                {authUser ? "Your account" : "Get in touch"}
              </p>

              <div className="flex flex-col items-start gap-3 text-sm">
                <a
                  className="transition-colors hover:text-[#b89554]"
                  href="/contact"
                >
                  Contact
                </a>

                {authUser ? (
                  <>
                    <a
                      className="transition-colors hover:text-[#b89554]"
                      href={
                        authUser.role === "admin"
                          ? "/admin"
                          : "/dashboard"
                      }
                    >
                      {authUser.role === "admin"
                        ? "Admin Dashboard"
                        : "Member Dashboard"}
                    </a>

                    <button
                      type="button"
                      onClick={() => void handleHomeLogout()}
                      disabled={loggingOut}
                      className="transition-colors hover:text-[#b89554] disabled:opacity-60"
                    >
                      {loggingOut ? "Signing out..." : "Sign out"}
                    </button>
                  </>
                ) : (
                  <>
                    <a
                      className="transition-colors hover:text-[#b89554]"
                      href="/login"
                    >
                      Member sign in
                    </a>
                    <a
                      className="transition-colors hover:text-[#b89554]"
                      href="/register"
                    >
                      Create an account
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-6 text-xs text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 Membrix. All rights reserved.</p>
            <p>Thoughtfully designed for better connections.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}