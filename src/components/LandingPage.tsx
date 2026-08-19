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
  label: string;
  tone: "gold" | "red" | "green";
  className?: string;
}) {
  const fill =
    tone === "gold"
      ? "from-[#d4b06a] via-[#b89a67] to-[#8a6d3a]"
      : tone === "red"
        ? "from-[#c45c5c] via-[#9f1239] to-[#6b0f24]"
        : "from-[#3d9b78] via-[#047857] to-[#065f46]";
  return (
    <div
      className={`landing-seal flex h-[5.6rem] w-[5.6rem] rotate-[-8deg] items-center justify-center rounded-full bg-gradient-to-br ${fill} text-center text-[0.58rem] font-extrabold uppercase tracking-[0.14em] text-white ${className}`}
    >
      {label}
    </div>
  );
}

function LedgerCard({
  status,
  visibility,
  seals,
}: {
  status: string;
  visibility: string;
  seals?: ReactNode;
}) {
  return (
    <article className="relative rounded-2xl border border-[#e6ddd0] bg-[var(--landing-cream)] p-5 shadow-[0_18px_50px_rgba(10,25,47,0.08)]">
      <p className="text-[0.65rem] uppercase tracking-[0.18em] text-[var(--muted)]">Estimate ledger</p>
      <p className="mt-3 font-landing text-3xl text-[var(--landing-navy)]">CHF 180,000</p>
      <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div>
          <dt className="text-[var(--muted)]">Status</dt>
          <dd className="mt-0.5 font-semibold text-[var(--landing-navy)]">{status}</dd>
        </div>
        <div>
          <dt className="text-[var(--muted)]">Visibility</dt>
          <dd className="mt-0.5 font-semibold text-[var(--landing-navy)]">{visibility}</dd>
        </div>
      </dl>
      {seals}
    </article>
  );
}

export function LandingPage() {
  return (
    <div className="landing min-h-screen">
      <header className="sticky top-0 z-20 border-b border-[#eadfce]/80 bg-[var(--landing-cream)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <Link href="/" aria-label="estimAIte home" className="shrink-0">
            <EstimAIteLogo tone="light" className="h-28 w-auto max-h-28 max-w-[14rem] object-contain sm:h-36 sm:max-h-36 sm:max-w-[18rem] lg:h-40 lg:max-h-40 lg:max-w-[20rem]" />
          </Link>
          <nav className="hidden items-center gap-7 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[var(--landing-navy)] md:flex">
            <a href="#product">Product</a>
            <a href="#moments">Moments</a>
            <a href="#governance">Governance</a>
            <a href="#proof">Proof</a>
          </nav>
          <Link href={LOGIN} className="landing-btn-navy">
            Sign in
          </Link>
        </div>
      </header>

      <section id="product" className="landing-hero-grid relative overflow-hidden">
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

          <div className="relative mx-auto w-full max-w-md lg:mx-0 lg:justify-self-end">
            <span className="absolute -left-2 top-8 hidden rounded-full border border-[#eadfce] bg-white px-3 py-1 text-[0.65rem] uppercase tracking-[0.14em] text-[var(--landing-navy)] shadow-sm sm:block">
              Ready
            </span>
            <span className="absolute -right-4 top-24 hidden rounded-full border border-[#eadfce] bg-white px-3 py-1 text-[0.65rem] uppercase tracking-[0.14em] text-[var(--landing-navy)] shadow-sm sm:block">
              Size
            </span>
            <span className="absolute -left-6 bottom-28 hidden rounded-full border border-[#eadfce] bg-white px-3 py-1 text-[0.65rem] uppercase tracking-[0.14em] text-[var(--landing-navy)] shadow-sm sm:block">
              Plan
            </span>
            <span className="absolute right-0 bottom-8 hidden rounded-full border border-[#eadfce] bg-white px-3 py-1 text-[0.65rem] uppercase tracking-[0.14em] text-[var(--landing-navy)] shadow-sm sm:block">
              Govern
            </span>

            <div className="landing-glass relative rotate-[2deg] rounded-3xl p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[0.65rem] uppercase tracking-[0.18em] text-[var(--muted)]">
                    Estimate ledger
                  </p>
                  <p className="mt-1 font-mono text-xs text-[var(--muted)]">EST-2024-00187</p>
                </div>
                <WaxSeal label="Governed ★" tone="gold" className="absolute -right-3 -top-4 z-10" />
              </div>
              <p className="mt-8 font-landing text-5xl leading-none text-[var(--landing-navy)]">CHF 180,000</p>
              <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Cost trend (CHF)</p>
              <svg viewBox="0 0 280 64" className="mt-2 h-16 w-full" aria-hidden>
                <polyline
                  fill="none"
                  stroke="#0f766e"
                  strokeWidth="2.5"
                  points="0,48 40,44 80,46 120,32 160,28 200,22 240,18 280,12"
                />
                <polyline
                  fill="rgba(15,118,110,0.12)"
                  stroke="none"
                  points="0,64 0,48 40,44 80,46 120,32 160,28 200,22 240,18 280,12 280,64"
                />
              </svg>
              <div className="mt-4 grid grid-cols-3 gap-3 border-t border-[#eadfce] pt-4 text-sm">
                <div>
                  <p className="text-[0.65rem] uppercase tracking-wide text-[var(--muted)]">T-shirt</p>
                  <p className="font-semibold text-[var(--landing-navy)]">XL</p>
                </div>
                <div>
                  <p className="text-[0.65rem] uppercase tracking-wide text-[var(--muted)]">Story points</p>
                  <p className="font-semibold text-[var(--landing-navy)]">34 SP</p>
                </div>
                <div>
                  <p className="text-[0.65rem] uppercase tracking-wide text-[var(--muted)]">Duration</p>
                  <p className="font-semibold text-[var(--landing-navy)]">3 sprints</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-3 text-xs text-[var(--muted)]">
                <span>Status · Governed</span>
                <span>Approval · Two-person</span>
                <span>Updated · 21 May 2024</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="moments" className="border-t border-[#eadfce] bg-[#f7f1e6] py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="font-landing text-3xl text-[var(--landing-navy)] sm:text-4xl">
            Four moments, one number.
          </h2>
          <div className="relative mt-12 grid gap-4 md:grid-cols-4">
            <div className="pointer-events-none absolute top-[1.15rem] right-[8%] left-[8%] hidden h-px bg-[var(--landing-gold)] md:block" />
            {MOMENTS.map((moment) => (
              <article key={moment.n} className="relative rounded-2xl border border-[#eadfce] bg-[var(--landing-cream)] p-5">
                <span className="relative z-10 mb-4 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--landing-gold)] bg-[var(--landing-cream)] font-landing text-sm text-[var(--landing-navy)]">
                  {moment.n}
                </span>
                <h3 className="font-landing text-xl text-[var(--landing-navy)]">{moment.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{moment.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="governance" className="py-20">
        <div className="mx-auto grid max-w-6xl items-start gap-10 px-6 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <h2 className="font-landing text-3xl text-[var(--landing-navy)] sm:text-4xl">Who sees what.</h2>
            <p className="mt-4 text-base leading-relaxed text-[var(--muted)]">
              Admin sees every team. Everyone else sees their team — as that role. A Vikings
              Approver works the whole product as Approver, for Vikings only.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                Requester view
              </p>
              <LedgerCard status="Submitted" visibility="My team only" />
            </div>
            <div>
              <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                Approver view
              </p>
              <LedgerCard
                status="Pending approval"
                visibility="My team only"
                seals={
                  <div className="mt-3 flex justify-end gap-2">
                    <WaxSeal label="Rejected" tone="red" className="h-16 w-16 text-[0.48rem]" />
                    <WaxSeal label="Governed" tone="green" className="h-16 w-16 text-[0.48rem]" />
                  </div>
                }
              />
            </div>
            <div>
              <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                Finance view
              </p>
              <LedgerCard status="Governed" visibility="My team only" />
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
