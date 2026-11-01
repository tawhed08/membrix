"use client";

import { useRef } from "react";
import Link from "next/link";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  CreditCard,
  FileBadge,
  LayoutDashboard,
  Layers3,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Workflow,
} from "lucide-react";

const capabilities = [
  {
    icon: UsersRound,
    number: "01",
    title: "Member profiles",
    text: "Keep member details and profile photos together in a dedicated member record.",
  },
  {
    icon: Layers3,
    number: "02",
    title: "Membership plans",
    text: "Present active plans with their pricing, billing terms, and included benefits.",
  },
  {
    icon: Workflow,
    number: "03",
    title: "Membership tracking",
    text: "Follow membership status and term dates through member and admin dashboards.",
  },
  {
    icon: CreditCard,
    number: "04",
    title: "Payment workflows",
    text: "Review payment history and support online checkout alongside manual payment review.",
  },
  {
    icon: FileBadge,
    number: "05",
    title: "Membership certificates",
    text: "Access issued membership certificates and their verification information.",
  },
  {
    icon: LayoutDashboard,
    number: "06",
    title: "Member and admin dashboards",
    text: "Give members self-service access while administrators manage plans, members, and payments.",
  },
] as const;

const values = [
  {
    number: "01",
    title: "Simplicity",
    text: "Make the important steps in membership easier to understand and manage.",
  },
  {
    number: "02",
    title: "Trust",
    text: "Treat member information and payment workflows with care and accountability.",
  },
  {
    number: "03",
    title: "Transparency",
    text: "Keep membership details, statuses, and payment history clear to the people who need them.",
  },
  {
    number: "04",
    title: "Innovation",
    text: "Keep improving the digital tools that support modern membership experiences.",
  },
  {
    number: "05",
    title: "Community",
    text: "Help organizations spend less effort on administration and more on their members.",
  },
] as const;

export default function AboutPage() {
  const pageRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.registerPlugin(ScrollTrigger);
      const motion = gsap.matchMedia();

      motion.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-about-hero]", {
          y: 22,
          autoAlpha: 0,
          duration: 0.8,
          stagger: 0.1,
          ease: "power2.out",
          clearProps: "all",
        });

        gsap.utils.toArray<HTMLElement>("[data-about-reveal]").forEach((item) => {
          gsap.from(item, {
            y: 24,
            autoAlpha: 0,
            duration: 0.7,
            ease: "power2.out",
            clearProps: "all",
            scrollTrigger: {
              trigger: item,
              start: "top 86%",
              once: true,
            },
          });
        });

        gsap.from("[data-about-feature]", {
          y: 18,
          autoAlpha: 0,
          duration: 0.55,
          stagger: 0.08,
          ease: "power2.out",
          clearProps: "all",
          scrollTrigger: {
            trigger: "[data-about-feature-grid]",
            start: "top 84%",
            once: true,
          },
        });
      });

      return () => motion.revert();
    },
    { scope: pageRef },
  );

  return (
    <main
      ref={pageRef}
      className="overflow-hidden bg-[var(--background)] text-[var(--foreground)]"
    >
      <section className="relative border-b border-[var(--border)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-36 -top-36 h-[560px] w-[560px] rounded-full border border-[var(--gold)]/10"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-20 h-[400px] w-[400px] rounded-full border border-[var(--gold)]/15"
        />
        <div className="relative mx-auto grid min-h-[560px] max-w-[1440px] items-center gap-14 px-5 py-20 sm:px-8 md:grid-cols-[1.1fr_0.9fr] md:py-28 lg:px-12">
          <div className="max-w-3xl">
            <p
              data-about-hero
              className="mb-6 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--gold)] sm:text-xs"
            >
              <span className="h-px w-8 bg-[var(--gold)]" />
              ABOUT MEMBRIX
            </p>
            <h1
              data-about-hero
              className="text-4xl font-medium leading-[1.04] tracking-[-0.065em] sm:text-6xl lg:text-7xl"
            >
              Building Better Membership{" "}
              <span className="font-serif italic font-normal text-[var(--gold)]">
                Experiences.
              </span>
            </h1>
            <p
              data-about-hero
              className="mt-7 max-w-2xl text-sm leading-7 text-[var(--muted)] sm:text-base sm:leading-8"
            >
              At Membrix, we believe managing memberships should be simple,
              organized, and meaningful. We bring organizations and their
              members together through a more connected membership experience.
            </p>
            <a
              data-about-hero
              href="#our-story"
              className="mt-9 inline-flex min-h-12 items-center gap-3 rounded-full border border-[var(--border)] px-5 text-sm font-medium transition hover:border-[var(--gold)] hover:text-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--gold)]"
            >
              Discover our approach
              <ArrowDown size={16} aria-hidden="true" />
            </a>
          </div>

          <div data-about-hero className="relative mx-auto w-full max-w-[440px]">
            <div className="absolute -inset-5 rounded-[2rem] border border-[var(--gold)]/10" />
            <div className="relative rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_30px_90px_color-mix(in_srgb,var(--foreground)_7%,transparent)] sm:p-7">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-5">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                    THE MEMBRIX EXPERIENCE
                  </p>
                  <p className="mt-2 text-base font-medium">People, connected.</p>
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--gold)]/30 text-[var(--gold)]">
                  <UsersRound size={18} strokeWidth={1.6} />
                </span>
              </div>
              <div className="space-y-3 py-5">
                {[
                  {
                    icon: BadgeCheck,
                    label: "Membership",
                    detail: "Status and term dates",
                  },
                  {
                    icon: CreditCard,
                    label: "Payments",
                    detail: "History and review workflows",
                  },
                  {
                    icon: FileBadge,
                    label: "Certificates",
                    detail: "Issued and verifiable",
                  },
                ].map(({ icon: Icon, label, detail }, index) => (
                  <div
                    key={label}
                    className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)] p-3.5"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--surface-alt)] text-[var(--gold)]">
                      <Icon size={17} strokeWidth={1.6} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold">{label}</p>
                      <p className="mt-1 text-[10px] text-[var(--muted)]">
                        {detail}
                      </p>
                    </div>
                    <span className="text-[9px] tracking-[0.16em] text-[var(--muted)]">
                      0{index + 1}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3 border-t border-[var(--border)] pt-5">
                <span className="flex -space-x-2">
                  {["M", "B", "X"].map((letter) => (
                    <span
                      key={letter}
                      className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--surface)] bg-[var(--surface-alt)] text-[10px] font-semibold text-[var(--gold)]"
                    >
                      {letter}
                    </span>
                  ))}
                </span>
                <p className="text-xs leading-5 text-[var(--muted)]">
                  One considered space for membership workflows.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="our-story"
        className="border-b border-[var(--border)] py-20 sm:py-28 lg:py-36"
      >
        <div className="mx-auto grid max-w-[1440px] gap-10 px-5 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20 lg:px-12">
          <div data-about-reveal>
            <p className="mb-5 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)] sm:text-xs">
              <span className="h-px w-8 bg-[var(--gold)]" />
              OUR STORY
            </p>
            <h2 className="max-w-xl text-3xl font-medium leading-[1.08] tracking-[-0.055em] sm:text-5xl">
              More Than Membership Management.
            </h2>
          </div>
          <div data-about-reveal className="max-w-3xl">
            <p className="text-lg leading-8 text-[var(--foreground)] sm:text-xl sm:leading-9">
              Membership is about people and the organizations that bring them
              together. The tools behind it should make those relationships
              easier to support—not harder to manage.
            </p>
            <p className="mt-6 text-sm leading-7 text-[var(--muted)] sm:text-base sm:leading-8">
              Membrix brings member profiles, membership plans, status
              tracking, payment workflows, and certificates into a more
              organized digital experience. Members can access their
              information through a personal dashboard, while administrators
              have dedicated tools to manage members, plans, and payment
              activity.
            </p>
            <p className="mt-5 text-sm leading-7 text-[var(--muted)] sm:text-base sm:leading-8">
              Our purpose is practical: simplify everyday administration,
              improve visibility into membership activity, and give every
              interaction a more considered place to happen.
            </p>
            <div className="mt-9 grid gap-4 border-t border-[var(--border)] pt-6 sm:grid-cols-3">
              {[
                ["Organize", "Membership information"],
                ["Connect", "Organizations and members"],
                ["Clarify", "Everyday workflows"],
              ].map(([verb, phrase]) => (
                <div key={verb}>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--gold)]">
                    {verb}
                  </p>
                  <p className="mt-2 text-sm text-[var(--muted)]">{phrase}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--border)] bg-[var(--surface)] py-20 sm:py-28">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <div data-about-reveal className="mb-10 max-w-2xl">
            <p className="mb-5 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)] sm:text-xs">
              <span className="h-px w-8 bg-[var(--gold)]" />
              WHAT GUIDES US
            </p>
            <h2 className="text-3xl font-medium tracking-[-0.055em] sm:text-5xl">
              A clear purpose. A connected vision.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <article
              data-about-reveal
              className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--background)] p-7 sm:p-10"
            >
              <span className="absolute -right-8 -top-10 text-[180px] font-serif leading-none text-[var(--gold)]/[0.06]">
                M
              </span>
              <span className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--gold)]/25 text-[var(--gold)]">
                <ShieldCheck size={23} strokeWidth={1.5} />
              </span>
              <p className="relative mt-8 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--gold)]">
                OUR MISSION
              </p>
              <h3 className="relative mt-4 max-w-xl text-2xl font-medium leading-snug tracking-[-0.04em] sm:text-3xl">
                To make membership management more organized, accessible, and
                efficient for organizations and their communities.
              </h3>
            </article>
            <article
              data-about-reveal
              className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--background)] p-7 sm:p-10"
            >
              <span className="absolute -right-8 -top-10 text-[180px] font-serif leading-none text-[var(--gold)]/[0.06]">
                V
              </span>
              <span className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--gold)]/25 text-[var(--gold)]">
                <Sparkles size={23} strokeWidth={1.5} />
              </span>
              <p className="relative mt-8 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--gold)]">
                OUR VISION
              </p>
              <h3 className="relative mt-4 max-w-xl text-2xl font-medium leading-snug tracking-[-0.04em] sm:text-3xl">
                To create a connected membership ecosystem where organizations
                can manage their communities with confidence and clarity.
              </h3>
            </article>
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--border)] py-20 sm:py-28 lg:py-36">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <div
            data-about-reveal
            className="mb-12 grid gap-6 lg:grid-cols-[1fr_0.7fr] lg:items-end lg:gap-16"
          >
            <div>
              <p className="mb-5 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)] sm:text-xs">
                <span className="h-px w-8 bg-[var(--gold)]" />
                WHAT MEMBRIX OFFERS
              </p>
              <h2 className="max-w-3xl text-3xl font-medium leading-[1.08] tracking-[-0.055em] sm:text-5xl">
                The tools behind a more organized membership experience.
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-[var(--muted)] sm:text-base sm:leading-8">
              Practical capabilities for the member journey and the
              administrative work that supports it.
            </p>
          </div>

          <div
            data-about-feature-grid
            className="grid border-l border-t border-[var(--border)] sm:grid-cols-2 lg:grid-cols-3"
          >
            {capabilities.map(({ icon: Icon, number, title, text }) => (
              <article
                key={number}
                data-about-feature
                className="group min-h-[250px] border-b border-r border-[var(--border)] bg-[var(--background)] p-6 transition-colors hover:bg-[var(--surface)] sm:p-8"
              >
                <div className="flex items-start justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--gold)] transition-colors group-hover:border-[var(--gold)]/40 group-hover:bg-[var(--gold)]/5">
                    <Icon size={20} strokeWidth={1.5} />
                  </span>
                  <span className="text-[10px] tracking-[0.16em] text-[var(--muted)]">
                    {number}
                  </span>
                </div>
                <h3 className="mt-9 text-xl font-medium tracking-[-0.035em]">
                  {title}
                </h3>
                <p className="mt-3 max-w-sm text-sm leading-6 text-[var(--muted)]">
                  {text}
                </p>
              </article>
            ))}
          </div>
          <p className="mt-4 text-xs leading-5 text-[var(--muted)]">
            Available plan details and payment methods may vary. Review current
            options before enrolling.
          </p>
        </div>
      </section>

      <section className="border-b border-[var(--border)] bg-[var(--surface)] py-20 sm:py-28">
        <div className="mx-auto grid max-w-[1440px] gap-12 px-5 sm:px-8 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20 lg:px-12">
          <div data-about-reveal className="max-w-md">
            <p className="mb-5 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)] sm:text-xs">
              <span className="h-px w-8 bg-[var(--gold)]" />
              OUR CORE VALUES
            </p>
            <h2 className="text-3xl font-medium leading-[1.08] tracking-[-0.055em] sm:text-5xl">
              Principles behind every interaction.
            </h2>
            <p className="mt-5 text-sm leading-7 text-[var(--muted)]">
              The experience matters as much as the workflow. These principles
              shape how we think about membership and the people behind it.
            </p>
          </div>
          <div className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
            {values.map(({ number, title, text }) => (
              <article
                key={number}
                data-about-reveal
                className="grid gap-3 py-5 sm:grid-cols-[52px_190px_1fr] sm:items-baseline sm:gap-5 sm:py-6"
              >
                <span className="text-[10px] tracking-[0.16em] text-[var(--gold)]">
                  {number}
                </span>
                <h3 className="text-lg font-medium tracking-[-0.03em]">
                  {title}
                </h3>
                <p className="max-w-lg text-sm leading-6 text-[var(--muted)]">
                  {text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--border)] py-20 sm:py-28 lg:py-36">
        <div className="mx-auto grid max-w-[1440px] gap-12 px-5 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:gap-20 lg:px-12">
          <div data-about-reveal>
            <p className="mb-5 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)] sm:text-xs">
              <span className="h-px w-8 bg-[var(--gold)]" />
              WHY MEMBRIX
            </p>
            <h2 className="max-w-xl text-3xl font-medium leading-[1.08] tracking-[-0.055em] sm:text-5xl">
              Clarity for the organization. Convenience for the member.
            </h2>
          </div>
          <div data-about-reveal className="max-w-3xl">
            <p className="text-base leading-8 text-[var(--muted)]">
              When core membership information and workflows are scattered,
              routine tasks can take more effort than they should. Membrix
              brings key member records, plans, payment activity, and
              certificates into a central digital experience.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                "Organized member information",
                "Centralized membership management",
                "Clearer administrative visibility",
                "Structured payment workflows",
                "Convenient member dashboard access",
                "A professional digital experience",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--gold)]/10 text-[var(--gold)]">
                    <ShieldCheck size={15} strokeWidth={1.7} />
                  </span>
                  <span className="text-sm font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
        <div
          data-about-reveal
          className="relative overflow-hidden rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] px-6 py-10 sm:px-10 sm:py-14 lg:px-16"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-32 h-80 w-80 rounded-full border border-[var(--gold)]/15"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-8 -top-20 h-56 w-56 rounded-full border border-[var(--gold)]/10"
          />
          <div className="relative flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--gold)] sm:text-xs">
                A MORE CONSIDERED MEMBERSHIP EXPERIENCE
              </p>
              <h2 className="mt-4 text-3xl font-medium leading-[1.08] tracking-[-0.055em] sm:text-5xl">
                Let&apos;s Build Better Membership Experiences Together.
              </h2>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-[var(--muted)] sm:text-base">
                Discover a more organized way to manage your membership
                community with Membrix.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/membership"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--gold)] px-5 text-sm font-semibold text-[var(--gold-contrast)] transition hover:-translate-y-0.5 hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--gold)]"
              >
                Explore Membership
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/contact"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[var(--border)] px-5 text-sm font-medium transition hover:border-[var(--gold)] hover:text-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--gold)]"
              >
                Contact Us
                <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--border)]">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-5 px-5 py-7 text-xs text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <p>
            <span className="font-semibold text-[var(--foreground)]">
              membrix<span className="text-[var(--gold)]">.</span>
            </span>{" "}
            — Membership, thoughtfully reimagined.
          </p>
          <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/" className="transition hover:text-[var(--gold)]">
              Home
            </Link>
            <Link
              href="/membership"
              className="transition hover:text-[var(--gold)]"
            >
              Membership
            </Link>
            <Link href="/contact" className="transition hover:text-[var(--gold)]">
              Contact
            </Link>
          </nav>
          <button
            type="button"
            onClick={() =>
              window.scrollTo({
                top: 0,
                behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
                  .matches
                  ? "auto"
                  : "smooth",
              })
            }
            className="inline-flex items-center gap-2 text-left transition hover:text-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)]"
          >
            Back to top <ArrowUpRight size={13} />
          </button>
        </div>
      </footer>
    </main>
  );
}
