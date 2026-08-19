import Link from "next/link";
import type { ReactNode } from "react";
import { EstimAIteLogo } from "@/components/brand/EstimAIteLogo";
import {
  BarChart3,
  Calendar,
  Coins,
  Crosshair,
  Eye,
  Hash,
  Scale,
  Shield,
  Shirt,
  Sparkles,
  Users,
} from "lucide-react";

const LOGIN = "/login";

const MOMENTS = [
  {
    n: "01",
    title: "Ready",
    body: "Clarify the why, outcomes, constraints and assumptions.",
  },
  {
    n: "02",
    title: "Size",
    body: "Size the scope and complexity with evidence.",
  },
  {
    n: "03",
    title: "Plan & cost",
    body: "Plan the work, validate capacity and derive CHF cost.",
  },
  {
    n: "04",
    title: "Govern",
    body: "Two-person approval and an audit-ready ledger.",
  },
];

const CHAIN = [
  { label: "Scope", Icon: Crosshair },
  { label: "Complexity", Icon: Scale },
  { label: "T-Shirt", Icon: Shirt },
  { label: "SP", Icon: Hash },
  { label: "Capacity", Icon: Users },
  { label: "Sprints", Icon: Calendar },
  { label: "Cost", Icon: Coins },
  { label: "AI", Icon: Sparkles },
  { label: "Governance", Icon: Shield },
  { label: "Actuals", Icon: BarChart3 },
  { label: "Calibration", Icon: Eye },
];

function WaxSeal({
  label,
  tone,
  className = "",
}: {
  label: ReactNode;
  tone: "gold" | "red" | "green";
  className?: string;
}) {
  const toneClass =
    tone === "gold" ? "landing-seal-gold" : tone === "red" ? "landing-seal-red" : "landing-seal-green";
  return (
    <div
      className={`landing-seal ${toneClass} flex rotate-[-8deg] items-center justify-center rounded-full text-center font-extrabold uppercase tracking-[0.14em] text-white ${className}`}
    >
      {label}
    </div>
  );
}

function RoleLedger({
  status,
  visibility,
  raised,
  seals,
}: {
  status: string;
  visibility: string;
  raised?: boolean;
  seals?: ReactNode;
}) {
  return (
    <article
      className={`landing-paper relative rounded-[1.35rem] px-5 pb-5 pt-5 ${
        raised ? "landing-paper-raised -translate-y-3 pb-6 md:-translate-y-5" : ""
      }`}
    >
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
        Estimate ledger
      </p>
      <p className="font-landing mt-5 text-[1.85rem] leading-none text-[var(--landing-navy)]">
        CHF 180,000
      </p>
      <dl className="mt-6 space-y-3 text-xs">
        <div>
          <dt className="uppercase tracking-[0.14em] text-[var(--muted)]">Status</dt>
          <dd className="mt-1 font-semibold text-[var(--landing-navy)]">{status}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-[0.14em] text-[var(--muted)]">Visibility</dt>
          <dd className="mt-1 font-semibold text-[var(--landing-navy)]">{visibility}</dd>
        </div>
      </dl>
      {seals}
    </article>
  );
}

export function LandingPage() {
  return (
    <div className="landing min-h-screen">
      <header className="sticky top-0 z-20 border-b border-[#eadfce]/70 bg-[#fbf7ef]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-6 py-3.5">
          <Link href="/" aria-label="estimAIte home" className="flex shrink-0 items-center">
            <EstimAIteLogo
              tone="light"
              className="block h-8 w-auto max-h-8 max-w-[4rem] object-contain object-left sm:h-[2.6rem] sm:max-h-[2.6rem] sm:max-w-[5.2rem] lg:h-[2.875rem] lg:max-h-[2.875rem] lg:max-w-[5.75rem]"
            />
          </Link>
          <div className="ml-auto flex items-center justify-end gap-8">
            <nav className="hidden items-center justify-end gap-8 text-[0.81rem] font-semibold uppercase leading-none tracking-[0.14em] text-[var(--landing-navy)] md:flex">
              <a href="#product" className="py-1 hover:opacity-70">
                Product
              </a>
              <a href="#moments" className="py-1 hover:opacity-70">
                Moments
              </a>
              <a href="#governance" className="py-1 hover:opacity-70">
                Governance
              </a>
              <a href="#proof" className="py-1 hover:opacity-70">
                Proof
              </a>
            </nav>
            <Link href={LOGIN} className="landing-btn-navy">
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <section id="product" className="landing-hero-grid relative overflow-visible">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div>
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[var(--landing-gold)]">
              Delivery economics
            </p>
            <h1 className="font-landing mt-4 max-w-xl text-4xl leading-[1.12] text-[var(--landing-navy)] sm:text-5xl lg:text-[3.35rem]">
              The estimate that can sit in the board pack.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-[var(--muted)]">
              Scope, complexity, capacity, CHF cost, AI impact and approval — one governed chain.
              Not a story-point toy.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={LOGIN} className="landing-btn-navy px-5 py-3">
                Start a governed estimate
              </Link>
              <a href="#moments" className="landing-btn-ghost px-5 py-3">
                Watch the four moments
              </a>
            </div>
            <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[var(--muted)]">
              <li>Two-person approval</li>
              <li>Team-scoped RBAC</li>
              <li>Post-delivery calibration</li>
            </ul>
          </div>

          <div className="relative mx-auto mt-6 w-full max-w-[26rem] overflow-visible lg:mx-0 lg:mt-0 lg:justify-self-end">
            <span className="landing-paper absolute -left-3 top-10 hidden rounded-full px-3 py-1 text-[0.62rem] uppercase tracking-[0.16em] text-[var(--landing-navy)] sm:block">
              Ready
            </span>
            <span className="landing-paper absolute -right-2 top-28 hidden rounded-full px-3 py-1 text-[0.62rem] uppercase tracking-[0.16em] text-[var(--landing-navy)] sm:block">
              Size
            </span>
            <span className="landing-paper absolute -left-8 bottom-32 hidden rounded-full px-3 py-1 text-[0.62rem] uppercase tracking-[0.16em] text-[var(--landing-navy)] sm:block">
              Plan
            </span>
            <span className="landing-paper absolute right-2 bottom-10 hidden rounded-full px-3 py-1 text-[0.62rem] uppercase tracking-[0.16em] text-[var(--landing-navy)] sm:block">
              Govern
            </span>

            <div className="landing-paper landing-paper-raised relative rotate-[1.5deg] rounded-[1.75rem] px-7 pb-6 pt-7">
              <WaxSeal
                label={
                  <>
                    Governed
                    <span className="mt-0.5 block text-[0.7rem] tracking-[0.2em]">★</span>
                  </>
                }
                tone="gold"
                className="absolute -right-5 -top-6 z-10 h-[5.8rem] w-[5.8rem] flex-col text-[0.58rem] leading-tight"
              />
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                Estimate ledger
              </p>
              <p className="mt-1 text-[0.7rem] tracking-[0.18em] text-[var(--muted)]">EST-2024-00187</p>
              <p className="font-landing mt-8 text-[2.85rem] leading-none text-[var(--landing-navy)]">
                CHF 180,000
              </p>
              <p className="mt-3 text-[0.62rem] uppercase tracking-[0.18em] text-[var(--muted)]">
                Cost trend (CHF)
              </p>
              <svg viewBox="0 0 280 72" className="mt-3 h-[4.5rem] w-full" aria-hidden>
                <defs>
                  <linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#0f766e" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#0f766e" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  fill="url(#trendFill)"
                  d="M0 72 L0 50 L40 46 L80 48 L120 34 L160 30 L200 24 L240 20 L280 14 L280 72 Z"
                />
                <path
                  fill="none"
                  stroke="#0f766e"
                  strokeWidth="2.75"
                  strokeLinecap="round"
                  d="M0 50 L40 46 L80 48 L120 34 L160 30 L200 24 L240 20 L280 14"
                />
              </svg>
              <div className="mt-5 grid grid-cols-3 gap-3 border-t border-[#eadfce] pt-5 text-sm">
                <div>
                  <p className="text-[0.62rem] uppercase tracking-[0.14em] text-[var(--muted)]">T-shirt</p>
                  <p className="mt-1 font-semibold text-[var(--landing-navy)]">XL</p>
                </div>
                <div>
                  <p className="text-[0.62rem] uppercase tracking-[0.14em] text-[var(--muted)]">Story points</p>
                  <p className="mt-1 font-semibold text-[var(--landing-navy)]">34 SP</p>
                </div>
                <div>
                  <p className="text-[0.62rem] uppercase tracking-[0.14em] text-[var(--muted)]">Duration</p>
                  <p className="mt-1 font-semibold text-[var(--landing-navy)]">3 sprints</p>
                </div>
              </div>
              <p className="mt-5 text-[0.68rem] tracking-wide text-[var(--muted)]">
                Status · Governed &nbsp;&nbsp; Approval · Two-person &nbsp;&nbsp; Updated · 21 May 2024
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="moments" className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="font-landing text-3xl text-[var(--landing-navy)] sm:text-4xl">
            Four moments, one number.
          </h2>
          <div className="relative mt-14 grid gap-6 md:grid-cols-4">
            <div className="pointer-events-none absolute top-[1.35rem] right-[10%] left-[10%] hidden h-[2px] bg-[linear-gradient(90deg,transparent,#c4a15c_8%,#c4a15c_92%,transparent)] md:block" />
            {MOMENTS.map((moment) => (
              <article key={moment.n} className="landing-paper relative rounded-[1.35rem] p-6">
                <span className="relative z-10 mb-5 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--landing-gold)] bg-[#fffcf7] font-landing text-sm text-[var(--landing-navy)] shadow-[0_8px_18px_rgba(10,25,47,0.08)]">
                  {moment.n}
                </span>
                <h3 className="font-landing text-2xl text-[var(--landing-navy)]">{moment.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">{moment.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="governance" className="py-8 pb-24">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 lg:grid-cols-[0.9fr_1.7fr]">
          <div>
            <h2 className="font-landing text-4xl leading-tight text-[var(--landing-navy)] sm:text-5xl">
              Who sees what.
            </h2>
            <p className="mt-5 max-w-md text-base leading-relaxed text-[var(--muted)]">
              Admin sees every team. Everyone else sees their team — as that role. A Vikings
              Approver works the whole product as Approver, for Vikings only.
            </p>
          </div>
          <div className="grid items-end gap-5 md:grid-cols-3">
            <div>
              <p className="mb-3 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                Requester view
              </p>
              <RoleLedger status="Submitted" visibility="My team only" />
            </div>
            <div>
              <p className="mb-3 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                Approver view
              </p>
              <RoleLedger
                raised
                status="Pending approval"
                visibility="My team only"
                seals={
                  <div className="mt-5 flex justify-center gap-3">
                    <WaxSeal label="Rejected" tone="red" className="h-[4.6rem] w-[4.6rem] text-[0.52rem]" />
                    <WaxSeal label="Governed" tone="green" className="h-[4.6rem] w-[4.6rem] text-[0.52rem]" />
                  </div>
                }
              />
            </div>
            <div>
              <p className="mb-3 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                Finance view
              </p>
              <RoleLedger status="Governed" visibility="My team only" />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[var(--landing-navy)] py-14 text-[var(--landing-cream)]">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[var(--landing-gold)]">
            The chain
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-5">
            {CHAIN.map(({ label, Icon }, index) => (
              <div key={label} className="flex items-center gap-3">
                <div className="flex flex-col items-center gap-2">
                  <Icon className="h-5 w-5 text-[var(--landing-gold)]" strokeWidth={1.6} />
                  <span className="text-[0.7rem] uppercase tracking-[0.12em]">{label}</span>
                </div>
                {index < CHAIN.length - 1 ? (
                  <span className="hidden h-px w-6 bg-white/25 sm:block" />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="proof" className="py-16">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { value: "18 CRs", label: "Change requests tracked" },
            { value: "CHF 180k", label: "Portfolio budget" },
            { value: "4 teams", label: "Active and aligned" },
            { value: "0", label: "Self-approvals. Zero tolerance." },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="font-landing text-4xl text-[var(--landing-navy)]">{stat.value}</p>
              <p className="mt-2 text-sm text-[var(--muted)]">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="bg-black px-6 pt-16 pb-10 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="mx-auto max-w-xl text-center font-landing text-3xl leading-snug sm:text-4xl">
            Built for PMO, finance, and delivery leads who have to defend the number.
          </p>
          <div className="mt-8 flex justify-center">
            <Link href={LOGIN} className="landing-btn-gold">
              Open the ledger
            </Link>
          </div>
          <div className="mt-16 flex justify-center">
            <EstimAIteLogo tone="dark" className="h-auto w-full max-w-[28rem] object-contain" />
          </div>
          <div className="mt-12 flex flex-wrap items-center justify-between gap-6 border-t border-white/10 pt-6 text-xs text-white/45">
            <div className="flex flex-wrap gap-4">
              <span>Privacy</span>
              <span>Security</span>
              <span>Terms</span>
              <span>Status</span>
              <span>Contact</span>
            </div>
            <p className="flex items-center gap-2">
              <span aria-hidden>🇨🇭</span> Made in Switzerland
            </p>
          </div>
          <p className="mt-4 text-center text-[0.7rem] text-white/30">© 2026 estimAIte. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
