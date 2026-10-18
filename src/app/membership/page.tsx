
"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowRight,
  Check,
  Crown,
  Gem,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";

const plans = [
  {
    name: "Essential",
    description: "A simple starting point for your membership journey.",
    price: "৳500",
    period: "/ year",
    icon: UsersRound,
    featured: false,
    features: [
      "Personal member profile",
      "Membership status tracking",
      "Member announcements",
      "Email support",
    ],
  },
  {
    name: "Premium",
    description: "More value for members ready to get more involved.",
    price: "৳1,000",
    period: "/ year",
    icon: Crown,
    featured: true,
    features: [
      "Everything in Essential",
      "Digital membership card",
      "Priority member support",
      "Exclusive member updates",
      "Membership history",
    ],
  },
  {
    name: "Lifetime",
    description: "A long-term membership option for lasting commitment.",
    price: "৳5,000",
    period: " one-time",
    icon: Gem,
    featured: false,
    features: [
      "Lifetime membership option",
      "Digital membership card",
      "Member profile and history",
      "Priority support",
      "Community updates",
    ],
  },
];

const faqs = [
  {
    question: "How do I become a member?",
    answer:
      "Create an account, review the available membership options, and follow the enrollment process when it becomes available.",
  },
  {
    question: "Can I manage my membership online?",
    answer:
      "Membrix is being designed to bring membership details and related activities together in one convenient place.",
  },
  {
    question: "How can I ask about a membership plan?",
    answer:
      "Visit our Contact page to reach out with questions about membership options and eligibility.",
  },
];

export default function MembershipPage() {
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

      // Hero entrance animation.
      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .from("[data-membership-badge]", {
          opacity: 0,
          y: 18,
          duration: 0.6,
        })
        .from(
          "[data-membership-title]",
          {
            opacity: 0,
            y: 32,
            duration: 0.85,
          },
          "-=0.3",
        )
        .from(
          "[data-membership-description]",
          {
            opacity: 0,
            y: 20,
            duration: 0.7,
          },
          "-=0.4",
        );

      // Decorative orbital rings.
      gsap.to("[data-membership-orbit-one]", {
        rotation: 360,
        duration: 35,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      });

      gsap.to("[data-membership-orbit-two]", {
        rotation: -360,
        duration: 27,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      });

      // Membership pricing cards enter one by one.
      gsap.from("[data-plan-card]", {
        opacity: 0,
        y: 48,
        scale: 0.97,
        duration: 0.85,
        stagger: 0.17,
        ease: "power3.out",
        scrollTrigger: {
          trigger: "[data-plans-grid]",
          start: "top 82%",
          once: true,
        },
      });

      // Feature lists reveal in a gentle sequence.
      gsap.utils.toArray<HTMLElement>("[data-plan-features]").forEach((list) => {
        gsap.from(list.children, {
          opacity: 0,
          x: -12,
          duration: 0.45,
          stagger: 0.07,
          ease: "power2.out",
          scrollTrigger: {
            trigger: list,
            start: "top 88%",
            once: true,
          },
        });
      });

      // FAQ heading and individual items.
      gsap.from("[data-faq-heading]", {
        opacity: 0,
        y: 26,
        duration: 0.75,
        ease: "power3.out",
        scrollTrigger: {
          trigger: "[data-faq-heading]",
          start: "top 85%",
          once: true,
        },
      });

      gsap.from("[data-faq-item]", {
        opacity: 0,
        y: 22,
        duration: 0.65,
        stagger: 0.12,
        ease: "power2.out",
        scrollTrigger: {
          trigger: "[data-faq-list]",
          start: "top 85%",
          once: true,
        },
      });

      // Bottom CTA entrance.
      gsap.from("[data-membership-cta]", {
        opacity: 0,
        y: 36,
        scale: 0.985,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: {
          trigger: "[data-membership-cta]",
          start: "top 84%",
          once: true,
        },
      });

      // Subtle movement in the CTA decorative artwork.
      gsap.to("[data-cta-orbit]", {
        rotation: 360,
        duration: 32,
        repeat: -1,
        ease: "none",
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
            <Link href="/" className="transition hover:text-[var(--foreground)]">
              Home
            </Link>
            <Link href="/about" className="transition hover:text-[var(--foreground)]">
              About
            </Link>
            <Link href="/membership" className="text-[var(--foreground)]">
              Membership
            </Link>
            <Link href="/contact" className="transition hover:text-[var(--foreground)]">
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
              Join now <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div
          data-membership-orbit-one
          className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full border border-[#d6b878]/20"
        />
        <div
          data-membership-orbit-two
          className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full border border-[#d6b878]/20"
        />

        <div className="mx-auto max-w-4xl px-5 py-20 text-center sm:px-8 sm:py-28">
          <span
            data-membership-badge
            className="inline-flex items-center gap-2 rounded-full border border-[#d6b878]/30 bg-[#d6b878]/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#b99a5b]"
          >
            <ShieldCheck size={14} /> Membership options
          </span>

          <h1
            data-membership-title
            className="mt-7 text-4xl font-semibold leading-[1.12] tracking-tight sm:text-5xl lg:text-6xl"
          >
            Find the membership that fits{" "}
            <span className="text-[#b99a5b]">your journey.</span>
          </h1>

          <p
            data-membership-description
            className="mx-auto mt-6 max-w-2xl text-base leading-8 text-[var(--muted)] sm:text-lg"
          >
            Explore the available membership concepts and choose the option
            that best matches your needs.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8 sm:pb-28">
        <div
          data-plans-grid
          className="grid items-stretch gap-6 lg:grid-cols-3"
        >
          {plans.map((plan) => {
            const Icon = plan.icon;

            return (
              <article
                key={plan.name}
                data-plan-card
                className={`relative flex flex-col rounded-3xl border p-7 transition duration-300 hover:-translate-y-1 sm:p-8 ${
                  plan.featured
                    ? "border-[#d6b878] bg-[#102b46] text-white shadow-xl shadow-[#102b46]/10 lg:scale-[1.03]"
                    : "border-[var(--border)] bg-[var(--surface)]"
                }`}
              >
                {plan.featured && (
                  <span className="absolute right-5 top-5 rounded-full bg-[#d6b878] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-[#172b3d]">
                    Popular choice
                  </span>
                )}

                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                    plan.featured
                      ? "bg-white/10 text-[#e6ca8b]"
                      : "bg-[#d6b878]/15 text-[#b99a5b]"
                  }`}
                >
                  <Icon size={23} />
                </span>

                <h2 className="mt-6 text-2xl font-semibold">{plan.name}</h2>

                <p
                  className={`mt-3 min-h-[48px] text-sm leading-6 ${
                    plan.featured ? "text-white/65" : "text-[var(--muted)]"
                  }`}
                >
                  {plan.description}
                </p>

                <div className="mt-7 flex items-baseline gap-2">
                  <span className="text-4xl font-semibold tracking-tight">
                    {plan.price}
                  </span>
                  <span
                    className={`text-sm ${
                      plan.featured ? "text-white/55" : "text-[var(--muted)]"
                    }`}
                  >
                    {plan.period}
                  </span>
                </div>

                <div
                  className={`my-7 border-t ${
                    plan.featured ? "border-white/15" : "border-[var(--border)]"
                  }`}
                />

                <p
                  className={`mb-5 text-xs font-semibold uppercase tracking-[0.16em] ${
                    plan.featured ? "text-[#e6ca8b]" : "text-[var(--muted)]"
                  }`}
                >
                  What&apos;s included
                </p>

                <ul data-plan-features className="flex-1 space-y-4">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-3 text-sm leading-6"
                    >
                      <Check
                        size={17}
                        className={`mt-0.5 shrink-0 ${
                          plan.featured ? "text-[#e6ca8b]" : "text-[#b99a5b]"
                        }`}
                      />
                      <span
                        className={
                          plan.featured
                            ? "text-white/80"
                            : "text-[var(--foreground)]"
                        }
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={`/checkout?plan=${plan.name.toLowerCase()}`}
                  className={`mt-9 inline-flex h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition ${
                    plan.featured
                      ? "bg-[#d6b878] text-[#172b3d] hover:bg-[#e6ca8b]"
                      : "border border-[var(--border)] hover:border-[#b99a5b] hover:text-[#b99a5b]"
                  }`}
                >
                  Choose {plan.name} <ArrowRight size={16} />
                </Link>
              </article>
            );
          })}
        </div>

        <p className="mx-auto mt-8 max-w-3xl text-center text-xs leading-6 text-[var(--muted)]">
          The prices and benefits shown are illustrative placeholders, not
          confirmed Membrix offerings. Confirm the actual plans, prices, and
          benefits before accepting payments or publishing them as official
          terms.
        </p>
      </section>

      <section className="border-y border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto max-w-4xl px-5 py-20 sm:px-8 sm:py-24">
          <div data-faq-heading className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b99a5b]">
              Frequently asked questions
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              A few things to know.
            </h2>
          </div>

          <div data-faq-list className="mt-12 space-y-4">
            {faqs.map((faq) => (
              <details
                key={faq.question}
                data-faq-item
                className="group rounded-2xl border border-[var(--border)] bg-[var(--background)] p-6"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold sm:text-base">
                  {faq.question}
                  <span className="text-xl font-normal text-[#b99a5b] transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)]">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24">
        <div
          data-membership-cta
          className="relative overflow-hidden rounded-[2rem] bg-[#102b46] px-7 py-12 text-white sm:px-12 sm:py-16"
        >
          <div
            data-cta-orbit
            className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full border border-white/10"
          />
          <div className="pointer-events-none absolute -right-10 -top-14 h-52 w-52 rounded-full border border-white/10" />

          <div className="relative z-10 mx-auto max-w-2xl text-center">
            <Sparkles className="mx-auto text-[#e6ca8b]" size={30} />
            <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
              Ready to join the community?
            </h2>
            <p className="mt-4 text-sm leading-7 text-white/65 sm:text-base">
              Create your account to get started with the Membrix membership
              experience.
            </p>
            <Link
              href="/register"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#d6b878] px-6 py-3.5 text-sm font-semibold text-[#172b3d] transition hover:bg-[#e6ca8b]"
            >
              Create your account <ArrowRight size={17} />
            </Link>
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
              href="/about"
              className="transition hover:text-[var(--foreground)]"
            >
              About
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
