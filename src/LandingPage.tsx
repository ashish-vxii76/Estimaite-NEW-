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
  { label: "Scope", hint: "Bound the work" },
  { label: "Complexity", hint: "Score the risk" },
  { label: "T-Shirt", hint: "Size the ask" },
  { label: "SP", hint: "Point the effort" },
  { label: "Capacity", hint: "Check the team" },
  { label: "Sprints", hint: "Set the calendar" },
  { label: "Cost", hint: "Derive CHF" },
  { label: "AI", hint: "Note the impact" },
  { label: "Governance", hint: "Two-person sign" },
  { label: "Actuals", hint: "Capture delivery" },
  { label: "Calibration", hint: "Learn the delta" },
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

function RolePanel({
  role,
  status,
  note,
  seals,
  emphasis,
}: {
  role: string;
  status: string;
  note: string;
  seals?: Array<"red" | "green">;
  emphasis?: boolean;
}) {
  return (
    <article className={`bp-role-panel${emphasis ? " bp-role-panel-emphasis" : ""}`}>
      <header className="bp-role-panel-head">
        <p className="bp-role-label">{role}</p>
        <p className="bp-role-status">{status}</p>
      </header>

      <div className="bp-role-panel-body">
        <p className="bp-role-cost">CHF 180,000</p>
        <p className="bp-role-note">{note}</p>
        <ul className="bp-role-meta">
          <li>
            <span>Visibility</span>
            <strong>My team only</strong>
          </li>
          <li>
            <span>T-shirt</span>
            <strong>XL</strong>
          </li>
          <li>
            <span>Story points</span>
            <strong>34 SP</strong>
          </li>
        </ul>
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

          <div className="bp-header-right">
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

            <div className="bp-hero-art">
              <HeroLedger />
            </div>
          </div>
        </section>

        <section className="bp-moments" id="moments">
          <div className="bp-section-inner">
            <div className="bp-section-head">
              <p className="bp-kicker">The path</p>
              <h2>Four moments, one number.</h2>
              <p className="bp-lede">
                From readiness to governance — each step leaves evidence on the
                ledger.
              </p>
            </div>

            <ol className="bp-moments-track">
              {MOMENTS.map((m, i) => (
                <li key={m.n} className="bp-moment">
                  <div className="bp-moment-rail" aria-hidden>
                    <span className="bp-moment-dot">{m.n}</span>
                    {i < MOMENTS.length - 1 ? <span className="bp-moment-line" /> : null}
                  </div>
                  <div className="bp-moment-copy">
                    <h3>{m.title}</h3>
                    <p>{m.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="bp-roles" id="governance">
          <div className="bp-section-inner">
            <div className="bp-section-head bp-section-head-center">
              <p className="bp-kicker">Visibility</p>
              <h2>Who sees what.</h2>
              <p className="bp-lede">
                Same estimate. Different lenses. Admin sees every team —
                everyone else sees theirs, as that role.
              </p>
            </div>

            <div className="bp-roles-grid">
              <RolePanel
                role="Requester"
                status="Submitted"
                note="Drafts and submits for approval. Cannot self-approve."
              />
              <RolePanel
                role="Approver"
                status="Pending approval"
                note="Reviews, rejects, or governs. Two-person rule enforced."
                seals={["red", "green"]}
                emphasis
              />
              <RolePanel
                role="Finance"
                status="Governed"
                note="Reads the board-ready CHF number and approval trail."
              />
            </div>
          </div>
        </section>

        <section className="bp-chain" id="proof">
          <div className="bp-section-inner">
            <div className="bp-section-head">
              <p className="bp-kicker bp-kicker-on-dark">Traceability</p>
              <h2>Nothing orphaned.</h2>
              <p className="bp-lede bp-lede-on-dark">
                Every field on the ledger connects — from scope to calibration.
              </p>
            </div>

            <ol className="bp-chain-flow">
              {CHAIN.map((item, i) => (
                <li key={item.label} className="bp-chain-item">
                  <div className="bp-chain-pill">
                    <strong>{item.label}</strong>
                    <span>{item.hint}</span>
                  </div>
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
          <div className="bp-section-inner">
            <div className="bp-proof-grid">
              <div>
                <strong>18</strong>
                <span>Change requests tracked</span>
              </div>
              <div>
                <strong>CHF 180k</strong>
                <span>Governed budget on the ledger</span>
              </div>
              <div>
                <strong>4</strong>
                <span>Teams active and aligned</span>
              </div>
              <div>
                <strong>0</strong>
                <span>Self-approvals tolerated</span>
              </div>
            </div>
          </div>
        </section>

        <section className="bp-close">
          <div className="bp-section-inner bp-close-inner">
            <h2>Ready when the number has to hold up.</h2>
            <p>Open the ledger and start a governed estimate.</p>
            <Link href={LOGIN} className="bp-btn bp-btn-solid">
              Start a governed estimate
            </Link>
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
