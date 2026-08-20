import Link from "next/link";
import { EstimAIteLogo } from "@/components/brand/EstimAIteLogo";
import "./landing.css";
import WaxSeal from "./WaxSeal";

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
] as const;

const CHAIN = [
  "Scope",
  "Complexity",
  "T-Shirt",
  "SP",
  "Capacity",
  "Sprints",
  "Cost",
  "AI",
  "Governance",
  "Actuals",
  "Calibration",
] as const;

function MiniTrend() {
  return (
    <svg className="bp-trend" viewBox="0 0 220 72" aria-hidden>
      <line x1="0" y1="18" x2="220" y2="18" />
      <line x1="0" y1="36" x2="220" y2="36" />
      <line x1="0" y1="54" x2="220" y2="54" />
      <polyline points="4,58 28,52 52,54 78,40 104,44 128,30 152,34 176,22 200,16 216,8" />
    </svg>
  );
}

function HeroLedger() {
  return (
    <div className="bp-ledger-scene">
      <div className="bp-ledger-glass">
        <div className="bp-ledger-paper">
          <div className="bp-ledger-top">
            <span>Estimate ledger</span>
            <span>EST-2024-00187</span>
          </div>

          <p className="bp-ledger-label">Total cost (CHF)</p>
          <p className="bp-ledger-total">CHF 180,000</p>

          <div className="bp-ledger-mid">
            <div>
              <p className="bp-ledger-label">Cost trend</p>
              <MiniTrend />
            </div>
            <dl className="bp-ledger-stats">
              <div>
                <dt>T-shirt</dt>
                <dd>XL</dd>
              </div>
              <div>
                <dt>Story points</dt>
                <dd>34 SP</dd>
              </div>
              <div>
                <dt>Duration</dt>
                <dd>3 sprints</dd>
              </div>
            </dl>
          </div>

          <div className="bp-ledger-foot">
            <div>
              <span>Status</span>
              <strong>Governed</strong>
            </div>
            <div>
              <span>Approval</span>
              <strong>Two-person</strong>
            </div>
            <div>
              <span>Updated</span>
              <strong>21 May 2024</strong>
            </div>
          </div>
        </div>
      </div>

      <WaxSeal
        variant="gold"
        size="xl"
        className="bp-hero-seal"
        ariaLabel="Governed estimate"
      />
    </div>
  );
}

function RoleCard({
  role,
  status,
  visibility,
  seals,
}: {
  role: string;
  status: string;
  visibility: string;
  seals?: Array<"red" | "green">;
}) {
  return (
    <article className="bp-role-card">
      <p className="bp-role-label">{role}</p>
      <div className="bp-role-sheet">
        <p className="bp-role-cost">CHF 180,000</p>
        <dl>
          <div>
            <dt>Status</dt>
            <dd>{status}</dd>
          </div>
          <div>
            <dt>Visibility</dt>
            <dd>{visibility}</dd>
          </div>
          <div>
            <dt>T-shirt</dt>
            <dd>XL</dd>
          </div>
          <div>
            <dt>Story points</dt>
            <dd>34 SP</dd>
          </div>
        </dl>
      </div>
      {seals?.map((seal) => (
        <WaxSeal
          key={seal}
          variant={seal}
          size="medium"
          className={`bp-role-seal bp-role-seal-${seal}`}
          decorative
        />
      ))}
    </article>
  );
}

export default function LandingPage() {
  return (
    <div className="bp-page" id="top">
      <header className="bp-header">
        <div className="bp-header-inner">
          <Link href="/" className="bp-brand" aria-label="estimAIte home">
            <EstimAIteLogo tone="light" className="bp-logo" />
          </Link>

          <nav className="bp-nav" aria-label="Main">
            <a href="#product">Product</a>
            <a href="#moments">Moments</a>
            <a href="#governance">Governance</a>
            <a href="#proof">Proof</a>
          </nav>

          <Link href={LOGIN} className="bp-btn bp-btn-ghost">
            Sign in
          </Link>
        </div>
      </header>

      <main>
        <section className="bp-hero" id="product">
          <div className="bp-hero-inner">
            <div className="bp-hero-copy">
              <h1>
                The estimate that can sit in
                <em> the board pack.</em>
              </h1>
              <p>
                Scope, complexity, capacity, CHF cost, AI impact and approval —
                one governed chain. Not a story-point toy.
              </p>
              <Link href={LOGIN} className="bp-btn bp-btn-solid">
                Start a governed estimate
              </Link>
            </div>

            <div className="bp-hero-art" aria-hidden={false}>
              <HeroLedger />
            </div>
          </div>
        </section>

        <section className="bp-moments" id="moments">
          <div className="bp-section-inner">
            <h2>Four moments, one number.</h2>
            <ol className="bp-moments-grid">
              {MOMENTS.map((m) => (
                <li key={m.n} className="bp-moment">
                  <span className="bp-moment-n">{m.n}</span>
                  <h3>{m.title}</h3>
                  <p>{m.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="bp-roles" id="governance">
          <div className="bp-section-inner bp-roles-inner">
            <div className="bp-roles-intro">
              <h2>Who sees what.</h2>
              <p>
                Admin sees every team. Everyone else sees their team — as that
                role.
              </p>
            </div>

            <div className="bp-roles-grid">
              <RoleCard
                role="Requester"
                status="Submitted"
                visibility="My team only"
              />
              <RoleCard
                role="Approver"
                status="Pending approval"
                visibility="My team only"
                seals={["red", "green"]}
              />
              <RoleCard
                role="Finance"
                status="Governed"
                visibility="My team only"
              />
            </div>
          </div>
        </section>

        <section className="bp-chain" id="proof">
          <div className="bp-section-inner">
            <h2>The chain.</h2>
            <ol className="bp-chain-flow">
              {CHAIN.map((label, i) => (
                <li key={label} className="bp-chain-item">
                  <span>{label}</span>
                  {i < CHAIN.length - 1 ? (
                    <span className="bp-chain-arrow" aria-hidden>
                      →
                    </span>
                  ) : null}
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="bp-proof" aria-label="Proof points">
          <div className="bp-section-inner bp-proof-grid">
            <div>
              <strong>18</strong>
              <span>CRs tracked</span>
            </div>
            <div>
              <strong>CHF 180k</strong>
              <span>Total budget</span>
            </div>
            <div>
              <strong>4</strong>
              <span>Active teams</span>
            </div>
            <div>
              <strong>0</strong>
              <span>Self-approvals</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="bp-footer">
        <div className="bp-footer-inner">
          <div className="bp-footer-brand">
            <EstimAIteLogo tone="dark" className="bp-footer-logo" />
            <p>
              Built for PMO, finance, and delivery leads who have to defend the
              number.
            </p>
          </div>

          <div className="bp-footer-bottom">
            <span>© 2026 estimAIte</span>
            <nav aria-label="Footer">
              <a href="#privacy">Privacy</a>
              <a href="#security">Security</a>
              <a href="#terms">Terms</a>
              <a href="#contact">Contact</a>
            </nav>
            <span>Made in Switzerland</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
