
"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowRight,
  CheckCircle2,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Target,
} from "lucide-react";

const values = [
  {
    icon: ShieldCheck,
    title: "Trust & Transparency",
    description:
      "We believe membership should be clear, reliable, and built on trust at every step.",
  },
  {
    icon: UsersRound,
    title: "Community First",
    description:
      "We put people at the center of the experience and make it easier to stay connected.",
  },
  {
    icon: Sparkles,
    title: "A Better Experience",
    description:
      "We aim to make membership management feel simpler, more organized, and more accessible.",
  },
];

export default function AboutPage() {
  const pageRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!pageRef.current) return;

    gsap.registerPlugin(ScrollTrigger);

    const root = pageRef.current;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const ctx = gsap.context(() => {
      if (prefersReducedMotion) return;

      // Hero: reveal content in a smooth sequence.
      const heroTimeline = gsap.timeline({
        defaults: {
          ease: "power3.out",
        },
      });

      heroTimeline
        .from("[data-hero-badge]", {
          opacity: 0,
          y: 18,
          duration: 0.65,
        })
        .from(
          "[data-hero-title]",
          {
            opacity: 0,
            y: 34,
            duration: 0.9,
          },
          "-=0.35",
        )
        .from(
          "[data-hero-description]",
          {
            opacity: 0,
            y: 22,
            duration: 0.75,
          },
          "-=0.45",
        )
        .from(
          "[data-hero-actions]",
          {
            opacity: 0,
            y: 18,
            duration: 0.65,
          },
          "-=0.4",
        )
        .from(
          "[data-approach-card]",
          {
            opacity: 0,
            x: 35,
            scale: 0.97,
            duration: 0.9,
          },
          "-=0.65",
        );

      // The decorative orbital rings move continuously.
      gsap.to("[data-orbit-one]", {
        rotation: 360,
        duration: 32,
        ease: "none",
        repeat: -1,
        transformOrigin: "50% 50%",
      });

      gsap.to("[data-orbit-two]", {
        rotation: -360,
        duration: 24,
        ease: "none",
        repeat: -1,
        transformOrigin: "50% 50%",
      });

      // Approach checklist items.
      gsap.from("[data-approach-item]", {
        opacity: 0,
        x: 20,
        duration: 0.65,
        stagger: 0.16,
        ease: "power2.out",
        delay: 0.75,
      });

      // Purpose section reveals when it enters the viewport.
      gsap.from("[data-purpose-content]", {
        opacity: 0,
        y: 38,
        duration: 0.85,
        ease: "power3.out",
        scrollTrigger: {
          trigger: "[data-purpose-content]",
          start: "top 82%",
          once: true,
        },
      });

      // Value cards appear in a staggered sequence.
      gsap.from("[data-value-card]", {
        opacity: 0,
        y: 42,
        duration: 0.8,
        stagger: 0.18,
        ease: "power3.out",
        scrollTrigger: {
          trigger: "[data-values-grid]",
          start: "top 82%",
          once: true,
        },
      });

      // CTA content reveals as the section enters the viewport.
      gsap.from("[data-cta-content]", {
        opacity: 0,
        y: 32,
        duration: 0.85,
        ease: "power3.out",
        scrollTrigger: {
          trigger: "[data-cta-section]",
          start: "top 82%",
          once: true,
        },
      });

      // Subtle CTA background motion.
      gsap.to("[data-cta-orbit]", {
        rotation: 360,
        duration: 36,
        ease: "none",
        repeat: -1,
        transformOrigin: "50% 50%",
      });
    }, root);

    return () => {
      ctx.revert();
    };
  }, []);

  return (
    <main
      ref={pageRef}
      className="min-h-screen bg-[var(--background)] text-[var(--foreground)]"
    >
      <header className="border-b border-[var(--border)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/" className="inline-flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d6b878]/40 bg-[#d6b878]/10 text-[#b99a5b]">
              <Sparkles size={21} />
            </span>
            <span className="text-xl font-semibold tracking-tight">
              Membrix<span className="text-[#b99a5b]">.</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm text-[var(--muted)] md:flex">
            <Link
              href="/"
              className="transition hover:text-[var(--foreground)]"
            >
              Home
            </Link>
            <Link href="/about" className="text-[var(--foreground)]">
              About
            </Link>
            <Link
              href="/membership"
              className="transition hover:text-[var(--foreground)]"
            >
              Membership
            </Link>
            <Link
              href="/contact"
              className="transition hover:text-[var(--foreground)]"
            >
              Contact
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden text-sm font-medium transition hover:text-[#b99a5b] sm:inline-flex"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-[#d6b878] px-4 py-2.5 text-sm font-semibold text-[#172b3d] transition hover:bg-[#e6ca8b]"
            >
              Join Membrix <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div
          data-orbit-one
          className="pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full border border-[#d6b878]/20"
        />
        <div
          data-orbit-two
          className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full border border-[#d6b878]/20"
        />

        <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[1.1fr_0.9fr] lg:py-32">
          <div>
            <span
              data-hero-badge
              className="inline-flex items-center gap-2 rounded-full border border-[#d6b878]/30 bg-[#d6b878]/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#b99a5b]"
            >
              <Sparkles size={14} /> About Membrix
            </span>

            <h1
              data-hero-title
              className="mt-7 max-w-3xl text-4xl font-semibold leading-[1.12] tracking-tight sm:text-5xl lg:text-6xl"
            >
              Membership should feel like{" "}
              <span className="text-[#b99a5b]">belonging.</span>
            </h1>

            <p
              data-hero-description
              className="mt-6 max-w-xl text-base leading-8 text-[var(--muted)] sm:text-lg"
            >
              Membrix is being built to make membership experiences more
              organized, accessible, and connected—for the people who belong
              and the organizations that bring them together.
            </p>

            <div data-hero-actions className="mt-9 flex flex-wrap gap-4">
              <Link
                href="/membership"
                className="inline-flex items-center gap-2 rounded-xl bg-[#d6b878] px-6 py-3.5 text-sm font-semibold text-[#172b3d] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#e6ca8b]"
              >
                Explore membership <ArrowRight size={17} />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-6 py-3.5 text-sm font-semibold transition hover:border-[#b99a5b] hover:text-[#b99a5b]"
              >
                Get in touch
              </Link>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-lg">
            <div className="absolute inset-5 rounded-[2rem] bg-[#d6b878]/10 blur-2xl" />

            <div
              data-approach-card
              className="relative overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-7 shadow-xl sm:p-10"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--muted)]">
                  The Membrix approach
                </span>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d6b878]/15 text-[#b99a5b]">
                  <HeartHandshake size={21} />
                </span>
              </div>

              <div className="mt-9 space-y-6">
                {[
                  "People before processes",
                  "Clear and organized membership",
                  "A more connected community",
                ].map((item, index) => (
                  <div
                    key={item}
                    data-approach-item
                    className="flex items-center gap-4"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#d6b878]/30 text-sm font-semibold text-[#b99a5b]">
                      0{index + 1}
                    </span>
                    <span className="text-sm font-medium sm:text-base">
                      {item}
                    </span>
                    <CheckCircle2
                      size={18}
                      className="ml-auto shrink-0 text-[#b99a5b]"
                    />
                  </div>
                ))}
              </div>

              <div className="mt-9 border-t border-[var(--border)] pt-6">
                <p className="text-sm leading-7 text-[var(--muted)]">
                  Our goal is simple: make it easier for communities to grow
                  while keeping the membership experience personal.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24">
          <div data-purpose-content className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b99a5b]">
              Our purpose
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              Designed around people, built for better connections.
            </h2>
            <p className="mt-5 text-base leading-8 text-[var(--muted)]">
              We want to help organizations spend less time navigating
              complicated membership processes and more time creating value
              for their members. Membrix is designed around that ambition.
            </p>
          </div>

          <div
            data-values-grid
            className="mt-14 grid gap-5 md:grid-cols-3"
          >
            {values.map((value) => {
              const Icon = value.icon;

              return (
                <article
                  key={value.title}
                  data-value-card
                  className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-7 transition duration-300 hover:-translate-y-1 hover:border-[#d6b878]/50"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#d6b878]/15 text-[#b99a5b]">
                    <Icon size={23} />
                  </span>
                  <h3 className="mt-6 text-lg font-semibold">{value.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                    {value.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section
        data-cta-section
        className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28"
      >
        <div className="relative overflow-hidden rounded-[2rem] bg-[#102b46] px-7 py-12 text-white sm:px-12 sm:py-16 lg:px-16">
          <div
            data-cta-orbit
            className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full border border-white/10"
          />
          <div className="pointer-events-none absolute -right-10 -top-14 h-52 w-52 rounded-full border border-white/10" />

          <div data-cta-content className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#e6ca8b]">
              <Target size={15} /> Be part of the journey
            </span>
            <h2 className="mt-5 text-3xl font-semibold leading-tight sm:text-4xl">
              A better membership experience starts with connection.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-white/65 sm:text-base">
              Discover the Membrix experience and take your next step toward
              a more connected community.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-[#d6b878] px-6 py-3.5 text-sm font-semibold text-[#172b3d] transition hover:bg-[#e6ca8b]"
              >
                Get started <ArrowRight size={17} />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-6 py-3.5 text-sm font-semibold text-white transition hover:border-[#e6ca8b] hover:text-[#e6ca8b]"
              >
                Contact us
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--border)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-7 text-sm text-[var(--muted)] sm:px-8 md:flex-row md:items-center md:justify-between">
          <Link
            href="/"
            className="w-fit text-lg font-semibold tracking-tight text-[var(--foreground)]"
          >
            Membrix<span className="text-[#b99a5b]">.</span>
          </Link>
          <p>© 2026 Membrix. All rights reserved.</p>
          <div className="flex flex-wrap gap-5">
            <Link
              href="/membership"
              className="transition hover:text-[var(--foreground)]"
            >
              Membership
            </Link>
            <Link
              href="/contact"
              className="transition hover:text-[var(--foreground)]"
            >
              Contact
            </Link>
            <Link
              href="/login"
              className="transition hover:text-[var(--foreground)]"
            >
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
