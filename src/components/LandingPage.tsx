import Link from "next/link";
import "@/app/landing.css";
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
import { WaxSeal } from "@/components/brand/WaxSeal";

const LOGIN = "/login";

function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <div className={light ? "mk-mark mk-mark-light" : "mk-mark"}>
      <p>ESTIMAITE</p>
      <em>Governed estimation.</em>
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="mk">
      <header className="mk-header">
        <div className="mk-wrap mk-header-row">
          <Link href="/" aria-label="ESTIMAITE home">
            <Wordmark />
          </Link>
          <div className="mk-header-right">
            <nav className="mk-nav">
              <a href="#product">Product</a>
              <a href="#moments">Moments</a>
              <a href="#governance">Governance</a>
              <a href="#proof">Proof</a>
            </nav>
            <Link href={LOGIN} className="mk-btn-ghost">
              Sign in
            </Link>
            <Link href={LOGIN} className="mk-btn-solid">
              Open the ledger
            </Link>
          </div>
        </div>
      </header>

      <section id="product" className="mk-hero">
        <div className="mk-wrap mk-hero-grid">
          <div>
            <h1 className="mk-h1">The estimate that can sit in the board pack.</h1>
            <p className="mk-lede">
              Scope, complexity, capacity, CHF cost, AI impact and approval — one governed chain. Not a
              story-point toy.
            </p>
            <div className="mk-cta">
              <Link href={LOGIN} className="mk-btn-solid mk-btn-lg">
                Start a governed estimate
              </Link>
              <a href="#moments" className="mk-btn-ghost mk-btn-lg">
                Watch the four moments
              </a>
            </div>
            <ul className="mk-trust">
              <li>
                <Shield strokeWidth={1.5} /> Two-person approval
              </li>
              <li>
                <Users strokeWidth={1.5} /> Team-scoped RBAC
              </li>
              <li>
                <Eye strokeWidth={1.5} /> Post-delivery calibration
              </li>
            </ul>
          </div>

          <div className="mk-art">
            <span className="mk-chip mk-chip-ready">Ready</span>
            <span className="mk-chip mk-chip-size">Size</span>
            <span className="mk-chip mk-chip-plan">Plan</span>
            <span className="mk-chip mk-chip-govern">Govern</span>

            <article className="mk-glass">
              <p className="mk-kicker">Estimate ledger</p>
              <p className="mk-ref">EST-2024-00187</p>
              <p className="mk-kicker mk-space">Total cost (CHF)</p>
              <p className="mk-figure">CHF 180,000</p>
              <p className="mk-kicker mk-space">Cost trend (CHF)</p>
              <svg viewBox="0 0 280 72" className="mk-spark" aria-hidden>
                <defs>
                  <linearGradient id="mkTrend" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#0f766e" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#0f766e" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  fill="url(#mkTrend)"
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
              <div className="mk-metrics">
                <div>
                  <span>T-shirt size</span>
                  <strong>XL</strong>
                </div>
                <div>
                  <span>Story points</span>
                  <strong>34 SP</strong>
                </div>
                <div>
                  <span>Duration</span>
                  <strong>3 sprints</strong>
                </div>
              </div>
              <p className="mk-glass-foot">
                Status · Governed &nbsp;&nbsp; Approval · Two-person &nbsp;&nbsp; Updated · 21 May 2024
              </p>
              <WaxSeal tone="gold" label="Governed" stars className="mk-seal-hero" />
            </article>
          </div>
        </div>
      </section>

      <section id="moments" className="mk-moments">
        <div className="mk-wrap">
          <h2 className="mk-h2 mk-center">Four moments, one number.</h2>
          <div className="mk-moment-grid">
            <div className="mk-moment-line" aria-hidden />
            {[
              ["01", "Ready", "Clarify the why, outcomes, constraints and assumptions."],
              ["02", "Size", "Size the scope and complexity with evidence."],
              ["03", "Plan & cost", "Plan the work, validate capacity and derive CHF cost."],
              ["04", "Govern", "Two-person approval and audit-ready ledger."],
            ].map(([n, title, body]) => (
              <article key={n} className="mk-moment">
                <span className="mk-moment-n">{n}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="governance" className="mk-roles">
        <div className="mk-wrap mk-roles-grid">
          <div>
            <h2 className="mk-h2">Who sees what.</h2>
            <p className="mk-copy">
              Admin sees every team. Everyone else sees their team — as that role.
            </p>
          </div>
          <div className="mk-role-row">
            <div>
              <p className="mk-role-label">Requester view</p>
              <article className="mk-mini">
                <p className="mk-kicker">Estimate ledger</p>
                <p className="mk-mini-fig">CHF 180,000</p>
                <p className="mk-mini-meta">
                  Status <strong>Submitted</strong>
                </p>
                <p className="mk-mini-meta">
                  Visibility <strong>My team only</strong>
                </p>
              </article>
            </div>
            <div className="mk-approver">
              <p className="mk-role-label">Approver view</p>
              <article className="mk-mini mk-mini-up">
                <p className="mk-kicker">Estimate ledger</p>
                <p className="mk-mini-fig">CHF 180,000</p>
                <p className="mk-mini-meta">
                  Status <strong>Pending approval</strong>
                </p>
                <p className="mk-mini-meta">
                  Visibility <strong>My team only</strong>
                </p>
              </article>
              <div className="mk-approver-seals">
                <WaxSeal tone="red" label="Rejected" className="mk-seal-red" />
                <WaxSeal tone="green" label="Governed" className="mk-seal-green" />
              </div>
            </div>
            <div>
              <p className="mk-role-label">Finance view</p>
              <article className="mk-mini">
                <p className="mk-kicker">Estimate ledger</p>
                <p className="mk-mini-fig">CHF 180,000</p>
                <p className="mk-mini-meta">
                  Status <strong>Governed</strong>
                </p>
                <p className="mk-mini-meta">
                  Visibility <strong>My team only</strong>
                </p>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section className="mk-chain">
        <div className="mk-wrap">
          <h2 className="mk-chain-title">The chain.</h2>
          <ol className="mk-chain-list">
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
            ).map(([Icon, label], i, list) => (
              <li key={label}>
                <span>
                  <Icon strokeWidth={1.4} />
                  <em>{label}</em>
                </span>
                {i < list.length - 1 ? <ArrowRight strokeWidth={1.4} aria-hidden /> : null}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="proof" className="mk-proof">
        <div className="mk-wrap mk-proof-grid">
          {(
            [
              [FileText, "18 CRs", "Change requests tracked"],
              [Coins, "CHF 180k", "Total budget"],
              [Users, "4 Teams", "Active and aligned"],
              [Shield, "0 Self-approvals", "Zero tolerance"],
            ] satisfies [LucideIcon, string, string][]
          ).map(([Icon, value, label]) => (
            <div key={value}>
              <Icon strokeWidth={1.4} />
              <p>{value}</p>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </section>

      <footer className="mk-footer">
        <div className="mk-wrap">
          <div className="mk-footer-top">
            <Wordmark light />
            <p>Built for PMO, finance, and delivery leads who have to defend the number.</p>
            <span />
          </div>
          <div className="mk-footer-bottom">
            <p>© 2026 ESTIMAITE. All rights reserved.</p>
            <div>
              <span>Privacy</span>
              <span>Security</span>
              <span>Terms</span>
              <span>Status</span>
              <span>Contact</span>
            </div>
            <p className="mk-ch">
              <span aria-hidden>🇨🇭</span> Made in Switzerland
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
