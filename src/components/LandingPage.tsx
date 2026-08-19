import Link from "next/link";
import type { ReactNode } from "react";
import { EstimAIteLogo } from "@/components/brand/EstimAIteLogo";
import {
  Ban,
  BarChart3,
  Calendar,
  Coins,
  Crosshair,
  Eye,
  FileStack,
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

const TRUST = [
  { label: "Two-person approval", Icon: Shield },
  { label: "Team-scoped RBAC", Icon: Users },
  { label: "Post-delivery calibration", Icon: Eye },
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
    <div className={`landing-seal ${toneClass} ${className}`}>
      <span className="landing-seal-label">{label}</span>
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
    <article className={`landing-plaque px-5 py-5 ${raised ? "landing-plaque-raised" : ""}`}>
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
        Estimate ledger
      </p>
      <p className="font-landing mt-4 text-[1.7rem] leading-none text-[var(--landing-navy)]">CHF 180,000</p>
      <dl className="mt-5 space-y-3 text-xs">
        <div>
          <dt className="uppercase tracking-[0.14em] text-[var(--muted)]">Status</dt>
          <dd className="mt-1 font-semibold uppercase tracking-[0.04em] text-[var(--landing-navy)]">{status}</dd>
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
      <header className="sticky top-0 z-30 border-b border-[#eadfce]/70 bg-[#fdfcf8]/85 backdrop-blur">
        <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto] items-center gap-4 px-6 py-3.5 md:grid-cols-[1fr_auto_1fr]">
          <Link href="/" aria-label="estimAIte home" className="flex shrink-0 items-center">
            <EstimAIteLogo
              tone="light"
              className="block h-8 w-auto max-h-8 max-w-[4rem] object-contain object-left sm:h-[2.6rem] sm:max-h-[2.6rem] sm:max-w-[5.2rem] lg:h-[2.875rem] lg:max-h-[2.875rem] lg:max-w-[5.75rem]"
            />
          </Link>
          <nav className="hidden items-center gap-8 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[var(--landing-navy)] md:flex">
            <a href="#product" className="hover:opacity-70">
              Product
            </a>
            <a href="#moments" className="hover:opacity-70">
              Moments
            </a>
            <a href="#governance" className="hover:opacity-70">
              Governance
            </a>
            <a href="#proof" className="hover:opacity-70">
              Proof
            </a>
          </nav>
          <div className="flex justify-end">
            <Link href={LOGIN} className="landing-btn-ghost">
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <section id="product" className="landing-hero-grid relative">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div>
            <h1 className="font-landing max-w-xl text-4xl leading-[1.12] text-[var(--landing-navy)] sm:text-5xl lg:text-[3.45rem]">
              The estimate that can sit in <em>the board pack.</em>
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
            <ul className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm text-[var(--muted)]">
              {TRUST.map(({ label, Icon }) => (
                <li key={label} className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-[var(--landing-gold)]" strokeWidth={1.7} />
                  {label}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative mx-auto w-full max-w-[26.5rem] lg:mx-0 lg:justify-self-end">
            <span className="landing-float hidden sm:flex" style={{ top: "1.5rem", right: "-0.4rem" }}>
              Ready
            </span>
            <span className="landing-float hidden sm:flex" style={{ top: "42%", right: "-1.6rem" }}>
              Size
            </span>
            <span className="landing-float hidden sm:flex" style={{ bottom: "4.5rem", left: "-1.8rem" }}>
              Plan
            </span>
            <span className="landing-float hidden sm:flex" style={{ bottom: "1.2rem", right: "18%" }}>
              Govern
            </span>

            <div className="landing-plaque landing-plaque-hero relative px-7 pb-8 pt-7">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                Estimate ledger
              </p>
              <p className="mt-1 text-[0.7rem] tracking-[0.16em] text-[var(--muted)]">EST-2024-00187</p>
              <p className="mt-7 text-[0.62rem] uppercase tracking-[0.18em] text-[var(--muted)]">
                Total cost (CHF)
              </p>
              <p className="font-landing mt-2 text-[2.85rem] leading-none text-[var(--landing-navy)]">
                CHF 180,000
              </p>
              <p className="mt-5 text-[0.62rem] uppercase tracking-[0.18em] text-[var(--muted)]">
                Cost trend (CHF)
              </p>
              <svg viewBox="0 0 280 72" className="mt-2 h-[4.4rem] w-full" aria-hidden>
                <defs>
                  <linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#0f766e" stopOpacity="0.28" />
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
              <div className="mt-5 grid grid-cols-3 gap-3 border-t border-[#eadfce]/90 pt-5 text-sm">
                <div>
                  <p className="text-[0.58rem] uppercase tracking-[0.14em] text-[var(--muted)]">T-shirt size</p>
                  <p className="mt-1 font-semibold text-[var(--landing-navy)]">XL</p>
                </div>
                <div>
                  <p className="text-[0.58rem] uppercase tracking-[0.14em] text-[var(--muted)]">Story points</p>
                  <p className="mt-1 font-semibold text-[var(--landing-navy)]">34 SP</p>
                </div>
                <div>
                  <p className="text-[0.58rem] uppercase tracking-[0.14em] text-[var(--muted)]">Duration</p>
                  <p className="mt-1 font-semibold text-[var(--landing-navy)]">3 sprints</p>
                </div>
              </div>
              <p className="mt-5 text-[0.68rem] text-[var(--muted)]">
                Status · <span className="font-semibold text-[var(--landing-navy)]">Governed</span>
                <span className="mx-2">·</span>
                Approval · Two-person
              </p>
              <WaxSeal
                tone="gold"
                className="absolute -bottom-7 -right-5 h-[6.1rem] w-[6.1rem] rotate-[-12deg]"
                label={
                  <>
                    Governed
                    <span className="mt-0.5 block tracking-[0.28em]">★★★</span>
                  </>
                }
              />
            </div>
          </div>
        </div>
      </section>

      <section id="moments" className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="font-landing text-3xl text-[var(--landing-navy)] sm:text-4xl">
            Four moments, one number.
          </h2>
          <div className="relative mt-14 grid gap-10 md:grid-cols-4">
            <div className="pointer-events-none absolute top-[1.15rem] right-[8%] left-[8%] hidden h-px bg-[var(--landing-gold)] md:block" />
            {MOMENTS.map((moment) => (
              <article key={moment.n} className="relative">
                <span className="relative z-10 mb-5 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--landing-gold)] bg-[#fdfcf8] font-landing text-sm text-[var(--landing-navy)]">
                  {moment.n}
                </span>
                <h3 className="font-landing text-2xl text-[var(--landing-navy)]">{moment.title}</h3>
                <p className="mt-3 max-w-xs text-sm leading-relaxed text-[var(--muted)]">{moment.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="governance" className="pb-24 pt-6">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 lg:grid-cols-[0.85fr_1.65fr]">
          <div>
            <h2 className="font-landing text-4xl leading-tight text-[var(--landing-navy)] sm:text-[2.75rem]">
              Who sees what.
            </h2>
            <p className="mt-5 max-w-md text-base leading-relaxed text-[var(--muted)]">
              Admin sees every team. Everyone else sees their team — as that role. A Vikings Approver
              works the whole product as Approver, for Vikings only.
            </p>
          </div>
          <div className="grid items-end gap-5 md:grid-cols-3">
            <div>
              <p className="mb-3 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                Requester view
              </p>
              <RoleLedger status="Submitted" visibility="My team only" />
            </div>
            <div className="md:-translate-y-6">
              <p className="mb-3 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                Approver view
              </p>
              <RoleLedger
                raised
                status="Pending approval"
                visibility="My team only"
                seals={
                  <div className="relative mt-2 h-16">
                    <WaxSeal
                      label="Rejected"
                      tone="red"
                      className="absolute bottom-[-1.6rem] left-4 h-[4.7rem] w-[4.7rem] -rotate-[18deg]"
                    />
                    <WaxSeal
                      label="Governed"
                      tone="green"
                      className="absolute right-3 bottom-[-1.8rem] h-[4.7rem] w-[4.7rem] rotate-[10deg]"
                    />
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
            The chain.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-5">
            {CHAIN.map(({ label, Icon }, index) => (
              <div key={label} className="flex items-center gap-3">
                <div className="flex flex-col items-center gap-2">
                  <Icon className="h-5 w-5 text-[var(--landing-gold)]" strokeWidth={1.6} />
                  <span className="text-[0.7rem] uppercase tracking-[0.12em]">{label}</span>
                </div>
                {index < CHAIN.length - 1 ? <span className="hidden h-px w-6 bg-white/25 sm:block" /> : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="proof" className="py-16">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { value: "18 CRs", label: "Change requests tracked", Icon: FileStack },
            { value: "CHF 180k", label: "Total budget", Icon: Coins },
            { value: "4 teams", label: "Active and aligned", Icon: Users },
            { value: "0", label: "Self-approvals. Zero tolerance.", Icon: Ban },
          ].map((stat) => (
            <div key={stat.label}>
              <stat.Icon className="mb-3 h-6 w-6 text-[var(--landing-gold)]" strokeWidth={1.5} />
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
          <div className="mt-16 flex justify-center">
            <EstimAIteLogo tone="dark" className="h-auto w-full max-w-[28rem] object-contain" />
          </div>
          <div className="mt-12 flex flex-wrap items-center justify-between gap-6 border-t border-white/10 pt-6 text-xs uppercase tracking-[0.14em] text-white/45">
            <div className="flex flex-wrap gap-4">
              <span>Privacy</span>
              <span>Security</span>
              <span>Terms</span>
              <span>Status</span>
              <span>Contact</span>
            </div>
            <p className="flex items-center gap-2 normal-case tracking-normal">
              <span aria-hidden>🇨🇭</span> Made in Switzerland
            </p>
          </div>
          <p className="mt-4 text-center text-[0.7rem] text-white/30">© 2026 estimAIte. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
