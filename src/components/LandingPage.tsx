import Link from "next/link";
import { EstimAIteLogo } from "@/components/brand/EstimAIteLogo";
import { WaxSeal } from "@/components/brand/WaxSeal";
import {
  ArrowRight,
  BarChart3,
  Calendar,
  Coins,
  Crosshair,
  Eye,
  FileText,
  Hash,
  Scale,
  Shield,
  Shirt,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";

const LOGIN = "/login";

export function LandingPage() {
  return (
    <div className="lp">
      <header className="lp-header">
        <div className="lp-wrap lp-header-row">
          <Link href="/" aria-label="estimAIte home" className="lp-header-logo">
            <EstimAIteLogo
              tone="light"
              className="block h-8 w-auto max-h-8 max-w-[4rem] object-contain object-left sm:h-[2.6rem] sm:max-h-[2.6rem] sm:max-w-[5.2rem] lg:h-[2.875rem] lg:max-h-[2.875rem] lg:max-w-[5.75rem]"
            />
          </Link>
          <div className="lp-header-end">
            <nav className="lp-nav">
              <a href="#product">Product</a>
              <a href="#moments">Moments</a>
              <a href="#governance">Governance</a>
              <a href="#proof">Proof</a>
            </nav>
            <Link href={LOGIN} className="lp-link-signin">
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <section id="product" className="lp-hero">
        <div className="lp-wrap lp-hero-grid">
          <div>
            <h1 className="lp-display">
              The estimate that can sit in the board pack.
            </h1>
            <p className="lp-lede">
              Scope, complexity, capacity, CHF cost, AI impact and approval — one governed chain.
              Not a story-point toy.
            </p>
            <div className="lp-cta-row">
              <Link href={LOGIN} className="lp-btn-primary">
                Start a governed estimate
              </Link>
              <a href="#moments" className="lp-btn-ghost">
                Watch the four moments
              </a>
            </div>
            <ul className="lp-trust">
              <li>
                <Shield strokeWidth={1.5} />
                Two-person approval
              </li>
              <li>
                <Users strokeWidth={1.5} />
                Team-scoped RBAC
              </li>
              <li>
                <Eye strokeWidth={1.5} />
                Post-delivery calibration
              </li>
            </ul>
          </div>

          <div className="lp-hero-art">
            <span className="lp-chip lp-chip-ready">Ready</span>
            <span className="lp-chip lp-chip-size">Size</span>
            <span className="lp-chip lp-chip-plan">Plan</span>
            <span className="lp-chip lp-chip-govern">Govern</span>

            <article className="lp-ledger">
              <p className="lp-kicker">Estimate ledger</p>
              <p className="lp-ref">EST-2024-00187</p>
              <p className="lp-kicker lp-kicker-space">Total cost (CHF)</p>
              <p className="lp-figure">CHF 180,000</p>
              <p className="lp-kicker lp-kicker-space">Cost trend (CHF)</p>
              <svg viewBox="0 0 280 72" className="lp-spark" aria-hidden>
                <defs>
                  <linearGradient id="lpTrend" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#0f766e" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#0f766e" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  fill="url(#lpTrend)"
                  d="M0 72 L0 50 L40 46 L80 48 L120 34 L160 30 L200 24 L240 20 L280 14 L280 72 Z"
                />
                <path
                  fill="none"
                  stroke="#0f766e"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  d="M0 50 L40 46 L80 48 L120 34 L160 30 L200 24 L240 20 L280 14"
                />
              </svg>
              <div className="lp-metrics">
                <div>
                  <p>T-shirt size</p>
                  <strong>XL</strong>
                </div>
                <div>
                  <p>Story points</p>
                  <strong>34 SP</strong>
                </div>
                <div>
                  <p>Duration</p>
                  <strong>3 sprints</strong>
                </div>
              </div>
              <p className="lp-ledger-foot">Status · Governed</p>
              <WaxSeal tone="gold" label="Governed" stars className="lp-ledger-seal" />
            </article>
          </div>
        </div>
      </section>

      <section id="moments" className="lp-moments">
        <div className="lp-wrap">
          <h2 className="lp-section-title lp-center">Four moments, one number.</h2>
          <div className="lp-moment-grid">
            <div className="lp-moment-line" aria-hidden />
            {[
              ["01", "Ready", "Clarify the why, outcomes, constraints and assumptions."],
              ["02", "Size", "Size the scope and complexity with evidence."],
              ["03", "Plan & cost", "Plan the work, validate capacity and derive CHF cost."],
              ["04", "Govern", "Two-person approval and audit-ready ledger."],
            ].map(([n, title, body]) => (
              <article key={n} className="lp-moment-card">
                <span className="lp-moment-n">{n}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="governance" className="lp-roles">
        <div className="lp-wrap lp-roles-grid">
          <div>
            <h2 className="lp-section-title">Who sees what.</h2>
            <p className="lp-copy">
              Admin sees every team. Everyone else sees their team — as that role. A Vikings Approver
              works the whole product as Approver, for Vikings only.
            </p>
          </div>
          <div className="lp-role-cards">
            <div>
              <p className="lp-role-label">Requester view</p>
              <article className="lp-mini-ledger">
                <p className="lp-kicker">Estimate ledger</p>
                <p className="lp-mini-figure">CHF 180,000</p>
                <p className="lp-mini-meta">
                  Status
                  <strong>Submitted</strong>
                </p>
                <p className="lp-mini-meta">
                  Visibility
                  <strong>My team only</strong>
                </p>
              </article>
            </div>
            <div className="lp-role-approver">
              <p className="lp-role-label">Approver view</p>
              <article className="lp-mini-ledger lp-mini-ledger-raised">
                <p className="lp-kicker">Estimate ledger</p>
                <p className="lp-mini-figure">CHF 180,000</p>
                <p className="lp-mini-meta">
                  Status
                  <strong>Pending approval</strong>
                </p>
                <p className="lp-mini-meta">
                  Visibility
                  <strong>My team only</strong>
                </p>
              </article>
              <div className="lp-role-seals">
                <WaxSeal tone="red" label="Rejected" className="lp-wax-red" />
                <WaxSeal tone="green" label="Governed" className="lp-wax-green" />
              </div>
            </div>
            <div>
              <p className="lp-role-label">Finance view</p>
              <article className="lp-mini-ledger">
                <p className="lp-kicker">Estimate ledger</p>
                <p className="lp-mini-figure">CHF 180,000</p>
                <p className="lp-mini-meta">
                  Status
                  <strong>Governed</strong>
                </p>
                <p className="lp-mini-meta">
                  Visibility
                  <strong>My team only</strong>
                </p>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-chain">
        <div className="lp-wrap">
          <h2 className="lp-chain-title">The chain.</h2>
          <ol className="lp-chain-list">
            {(
              [
                [Crosshair, "Scope"],
                [Scale, "Complexity"],
                [Shirt, "T-Shirt"],
                [Hash, "SP"],
                [Users, "Capacity"],
                [Calendar, "Sprints"],
                [Coins, "Cost"],
                [Sparkles, "AI"],
                [Shield, "Governance"],
                [BarChart3, "Actuals"],
                [Eye, "Calibration"],
              ] as const
            ).map(([Icon, label], index, list) => (
              <li key={label}>
                <span className="lp-chain-node">
                  <Icon strokeWidth={1.4} />
                  <em>{label}</em>
                </span>
                {index < list.length - 1 ? (
                  <ArrowRight className="lp-chain-arrow" strokeWidth={1.4} aria-hidden />
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="proof" className="lp-proof">
        <div className="lp-wrap lp-proof-grid">
          {(
            [
              [FileText, "18 CRs", "Change requests tracked"],
              [Coins, "CHF 180k", "Total budget"],
              [Users, "4 Teams", "Active and aligned"],
              [Shield, "0 Self-approvals", "Zero tolerance"],
            ] satisfies [LucideIcon, string, string][]
          ).map(([Icon, value, label]) => (
            <div key={value}>
              <Icon className="lp-proof-icon" strokeWidth={1.4} />
              <p className="lp-proof-value">{value}</p>
              <p className="lp-proof-label">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-wrap">
          <div className="lp-footer-top">
            <EstimAIteLogo tone="dark" className="h-auto w-[11rem] max-w-full object-contain object-left sm:w-[13rem]" />
            <p className="lp-footer-quote">
              Built for PMO, finance, and delivery leads who have to defend the number.
            </p>
            <span className="lp-footer-spacer" />
          </div>
          <div className="lp-footer-bottom">
            <p>© 2026 estimAIte. All rights reserved.</p>
            <div className="lp-footer-links">
              <span>Privacy</span>
              <span>Security</span>
              <span>Terms</span>
              <span>Status</span>
              <span>Contact</span>
            </div>
            <p className="lp-footer-ch">
              <span aria-hidden>🇨🇭</span> Made in Switzerland
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
