import Link from "next/link";
import React from "react";
import { EstimAIteLogo } from "@/components/brand/EstimAIteLogo";
import "./landing.css";
import WaxSeal from "./WaxSeal";

/* =========================================================
   TYPES
   ========================================================= */

type IconName =
  | "shield"
  | "users"
  | "target"
  | "building"
  | "shirt"
  | "calendar"
  | "database"
  | "sparkle"
  | "chart"
  | "document"
  | "layers"
  | "check"
  | "arrow"
  | "lock"
  | "wallet";

/* =========================================================
   SMALL INLINE ICON SYSTEM
   No external icon library required.
   ========================================================= */

function Icon({
  name,
  size = 20,
  strokeWidth = 1.6,
  className = "",
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };

  switch (name) {
    case "shield":
      return (
        <svg {...common}>
          <path d="M12 3 19 6v5c0 4.8-2.7 8.2-7 10-4.3-1.8-7-5.2-7-10V6l7-3Z" />
          <path d="m9.3 12 1.8 1.8 3.8-4.2" />
        </svg>
      );

    case "users":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3" />
          <path d="M3.5 19c.5-3.6 2.3-5.5 5.5-5.5s5 1.9 5.5 5.5" />
          <circle cx="17.5" cy="9" r="2.2" />
          <path d="M15.3 14.4c2.9-.7 5 .8 5.2 4.1" />
        </svg>
      );

    case "target":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="12" cy="12" r="1" />
        </svg>
      );

    case "building":
      return (
        <svg {...common}>
          <path d="M4 20h16" />
          <path d="M6 20V9h12v11" />
          <path d="M8 9V6h8v3" />
          <path d="M9 12h1M14 12h1M9 15h1M14 15h1" />
        </svg>
      );

    case "shirt":
      return (
        <svg {...common}>
          <path d="M8 4 4 6l2.5 4L9 8v12h6V8l2.5 2L20 6l-4-2c-.8 1.3-2 2-4 2s-3.2-.7-4-2Z" />
        </svg>
      );

    case "calendar":
      return (
        <svg {...common}>
          <rect x="4" y="5" width="16" height="15" rx="2" />
          <path d="M8 3v4M16 3v4M4 9h16" />
          <path d="M8 13h2M12 13h2M16 13h1M8 16h2M12 16h2" />
        </svg>
      );

    case "database":
      return (
        <svg {...common}>
          <ellipse cx="12" cy="5.5" rx="7" ry="3" />
          <path d="M5 5.5v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
          <path d="M5 11.5v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
        </svg>
      );

    case "sparkle":
      return (
        <svg {...common}>
          <path d="m12 3 1.4 4.1L17.5 9l-4.1 1.4L12 14.5l-1.4-4.1L6.5 9l4.1-1.9L12 3Z" />
          <path d="m18.5 14 .7 2.2 2.3.8-2.3.8-.7 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" />
        </svg>
      );

    case "chart":
      return (
        <svg {...common}>
          <path d="M4 20V10M9 20V6M14 20v-8M19 20V3" />
          <path d="M3 20h18" />
        </svg>
      );

    case "document":
      return (
        <svg {...common}>
          <path d="M6 3h8l4 4v14H6V3Z" />
          <path d="M14 3v5h5M9 12h6M9 16h6" />
        </svg>
      );

    case "layers":
      return (
        <svg {...common}>
          <path d="m12 3 8 4-8 4-8-4 8-4Z" />
          <path d="m4 12 8 4 8-4M4 17l8 4 8-4" />
        </svg>
      );

    case "check":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="m8 12 2.5 2.5L16.5 8" />
        </svg>
      );

    case "arrow":
      return (
        <svg {...common}>
          <path d="M5 12h14M15 8l4 4-4 4" />
        </svg>
      );

    case "lock":
      return (
        <svg {...common}>
          <rect x="5" y="10" width="14" height="10" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </svg>
      );

    case "wallet":
      return (
        <svg {...common}>
          <path d="M4 7h14a2 2 0 0 1 2 2v10H4a2 2 0 0 1-2-2V7a3 3 0 0 1 3-3h12" />
          <path d="M16 11h5v5h-5a2.5 2.5 0 0 1 0-5Z" />
        </svg>
      );

    default:
      return null;
  }
}

/* =========================================================
   DATA
   ========================================================= */

const moments = [
  {
    number: "01",
    title: "Ready",
    description: "Clarify the why, outcomes, constraints and assumptions.",
  },
  {
    number: "02",
    title: "Size",
    description: "Size the scope and complexity with evidence.",
  },
  {
    number: "03",
    title: "Plan & cost",
    description: "Plan the work, validate capacity and derive CHF cost.",
  },
  {
    number: "04",
    title: "Govern",
    description: "Two-person approval and an audit-ready ledger.",
  },
];

const chain: Array<{
  label: string;
  icon?: IconName;
  textIcon?: string;
}> = [
  { label: "Scope", icon: "target" },
  { label: "Complexity", icon: "layers" },
  { label: "T-Shirt", icon: "shirt" },
  { label: "SP", textIcon: "SP" },
  { label: "Capacity", icon: "users" },
  { label: "Sprints", icon: "calendar" },
  { label: "Cost", icon: "database" },
  { label: "AI", icon: "sparkle" },
  { label: "Governance", icon: "shield" },
  { label: "Actuals", icon: "chart" },
  { label: "Calibration", icon: "target" },
];

/* =========================================================
   LEDGER MINI GRAPH
   ========================================================= */

function MiniTrendChart() {
  return (
    <svg
      className="mini-trend-chart"
      viewBox="0 0 210 95"
      role="img"
      aria-label="Cost trend chart"
    >
      <line x1="0" y1="18" x2="210" y2="18" />
      <line x1="0" y1="47" x2="210" y2="47" />
      <line x1="0" y1="76" x2="210" y2="76" />

      <polyline
        points="
          3,76
          15,63
          24,68
          34,51
          47,57
          57,43
          70,47
          82,40
          94,47
          108,30
          120,35
          134,25
          146,34
          158,23
          169,16
          182,22
          195,8
          206,2
        "
      />
    </svg>
  );
}

/* =========================================================
   HERO LEDGER
   ========================================================= */

function EstimateLedger() {
  return (
    <div className="ledger-scene">
      <div className="ledger-orbit ledger-orbit-one" />
      <div className="ledger-orbit ledger-orbit-two" />

      <div className="floating-tag floating-tag-ready">
        <Icon name="check" size={16} />
        <span>Ready</span>
      </div>

      <div className="floating-tag floating-tag-size">
        <Icon name="shirt" size={18} />
        <span>Size</span>
      </div>

      <div className="floating-tag floating-tag-govern">
        <Icon name="building" size={17} />
        <span>Govern</span>
      </div>

      <div className="floating-tag floating-tag-plan">
        <Icon name="calendar" size={17} />
        <span>Plan</span>
      </div>

      <div className="ledger-glass">
        <div className="ledger-paper">
          <div className="ledger-pin ledger-pin-tl" />
          <div className="ledger-pin ledger-pin-br" />

          <div className="ledger-topline">
            <div className="ledger-kicker">ESTIMATE LEDGER</div>
            <div className="ledger-id">EST-2024-00187</div>
          </div>

          <div className="ledger-total-label">Total cost (CHF)</div>
          <div className="ledger-total">CHF 180,000</div>

          <div className="ledger-divider" />

          <div className="ledger-body-grid">
            <div className="ledger-chart-column">
              <div className="ledger-small-label">Cost trend (CHF)</div>
              <MiniTrendChart />
            </div>

            <div className="ledger-stats-column">
              <div className="ledger-stat-block">
                <span>T-SHIRT SIZE</span>
                <strong>XL</strong>
              </div>

              <div className="ledger-stat-block">
                <span>STORY POINTS</span>
                <strong>34 SP</strong>
              </div>

              <div className="ledger-stat-block">
                <span>DURATION</span>
                <strong>3 SPRINTS</strong>
              </div>
            </div>
          </div>

          <div className="ledger-bottom-grid">
            <div>
              <span>STATUS</span>
              <strong>GOVERNED</strong>
            </div>
            <div>
              <span>APPROVAL</span>
              <strong>Two-person</strong>
            </div>
            <div>
              <span>UPDATED</span>
              <strong>May 21, 2024</strong>
            </div>
          </div>
        </div>
      </div>

      <WaxSeal
        variant="gold"
        size="xl"
        className="hero-wax-seal"
        ariaLabel="Governed estimate"
      />
    </div>
  );
}

/* =========================================================
   SMALL ESTIMATE CARD
   ========================================================= */

function EstimateCard({
  status,
  visibility,
  seal,
}: {
  status: string;
  visibility: string;
  seal?: "green" | "red";
}) {
  return (
    <div className="estimate-card-wrapper">
      <div className="estimate-card">
        <div className="estimate-card-top">
          <div className="estimate-card-cost">CHF 180,000</div>

          <div className="estimate-card-size">
            <span>T-SHIRT SIZE</span>
            <strong>XL</strong>
          </div>
        </div>

        <div className="estimate-card-body">
          <div className="estimate-card-chart">
            <span>Cost trend (CHF)</span>
            <MiniTrendChart />
          </div>

          <div className="estimate-card-stats">
            <div>
              <span>STORY POINTS</span>
              <strong>34 SP</strong>
            </div>
            <div>
              <span>DURATION</span>
              <strong>3 SPRINTS</strong>
            </div>
          </div>
        </div>

        <div className="estimate-card-footer">
          <div>
            <span>STATUS</span>
            <strong>{status}</strong>
          </div>

          <div>
            <span>VISIBILITY</span>
            <strong>{visibility}</strong>
          </div>
        </div>
      </div>

      {seal && (
        <WaxSeal
          variant={seal}
          size="medium"
          className={`role-card-seal role-card-seal-${seal}`}
        />
      )}
    </div>
  );
}

/* =========================================================
   NAV
   ========================================================= */

function Navigation() {
  return (
    <header className="landing-header">
      <div className="header-inner">
        <Link href="/" className="brand" aria-label="estimAIte home">
          <EstimAIteLogo
            tone="light"
            className="brand-logo"
          />
        </Link>

        <nav className="desktop-nav" aria-label="Main navigation">
          <a href="#product">Product</a>
          <a href="#moments">Moments</a>
          <a href="#governance">Governance</a>
          <a href="#proof">Proof</a>
        </nav>

        <div className="header-actions">
          <Link href="/login" className="button button-outline">Sign in</Link>
          <Link href="/login" className="button button-navy">Open the ledger</Link>
        </div>
      </div>
    </header>
  );
}

/* =========================================================
   HERO
   ========================================================= */

function Hero() {
  return (
    <section className="hero-section" id="product">
      <div className="hero-background-glow" />

      <div className="hero-grid">
        <div className="hero-copy">
          <h1>
            The estimate
            <br />
            that can sit in
            <br />
            <strong>the board pack.</strong>
          </h1>

          <p className="hero-description">
            Scope, complexity, capacity, CHF cost,
            <br className="desktop-break" />
            AI impact and approval — one governed chain.
            <br className="desktop-break" />
            Not a story-point toy.
          </p>

          <div className="hero-actions">
            <Link href="/login" className="button button-navy button-large">
              Start a governed estimate
            </Link>

            <a href="#moments" className="button button-outline button-large">
              Watch the four moments
            </a>
          </div>

          <div className="hero-proof-points">
            <span>
              <Icon name="shield" size={18} />
              Two-person approval
            </span>

            <span className="proof-divider">·</span>

            <span>
              <Icon name="users" size={18} />
              Team-scoped RBAC
            </span>

            <span className="proof-divider">·</span>

            <span>
              <Icon name="target" size={18} />
              Post-delivery calibration
            </span>
          </div>
        </div>

        <div className="hero-art">
          <EstimateLedger />
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   FOUR MOMENTS
   ========================================================= */

function Moments() {
  return (
    <section className="moments-section" id="moments">
      <div className="section-title-with-lines">
        <span className="title-line" />
        <h2>Four moments, one number.</h2>
        <span className="title-line" />
      </div>

      <div className="moments-grid">
        {moments.map((moment, index) => (
          <React.Fragment key={moment.number}>
            <article className="moment-card">
              <div className="moment-heading">
                <span className="moment-number">{moment.number}</span>
                <span className="moment-title">{moment.title}</span>
              </div>

              <p>{moment.description}</p>
            </article>

            {index !== moments.length - 1 && (
              <div className="moment-connector" aria-hidden="true">
                <span />
                <i />
                <span />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </section>
  );
}

/* =========================================================
   ROLE VISIBILITY
   ========================================================= */

function RoleVisibility() {
  return (
    <section className="visibility-section" id="governance">
      <div className="visibility-intro">
        <h2>Who sees what.</h2>

        <p>
          Admin sees every team.
          <br />
          Everyone else sees their team
          <br />
          — as that role.
        </p>

        <div className="small-gold-line" />
      </div>

      <div className="role-column">
        <div className="role-label">
          <Icon name="users" size={20} />
          <span>REQUESTER VIEW</span>
        </div>

        <EstimateCard status="SUBMITTED" visibility="My team only" />
      </div>

      <div className="role-column">
        <div className="role-label">
          <Icon name="shield" size={20} />
          <span>APPROVER VIEW</span>
        </div>

        <EstimateCard
          status="PENDING APPROVAL"
          visibility="My team only"
          seal="red"
        />

        <WaxSeal
          variant="green"
          size="medium"
          className="approver-green-seal"
        />
      </div>

      <div className="role-column">
        <div className="role-label">
          <Icon name="chart" size={20} />
          <span>FINANCE VIEW</span>
        </div>

        <EstimateCard status="GOVERNED" visibility="My team only" />
      </div>
    </section>
  );
}

/* =========================================================
   GOVERNANCE CHAIN
   ========================================================= */

function GovernanceChain() {
  return (
    <section className="chain-section" id="proof">
      <div className="chain-inner">
        <h2>The chain.</h2>

        <div className="chain-flow">
          {chain.map((item, index) => (
            <React.Fragment key={item.label}>
              <div className="chain-item">
                <div className="chain-icon">
                  {item.icon ? (
                    <Icon name={item.icon} size={31} strokeWidth={1.35} />
                  ) : (
                    <span>{item.textIcon}</span>
                  )}
                </div>

                <span className="chain-label">{item.label}</span>
              </div>

              {index !== chain.length - 1 && (
                <Icon
                  name="arrow"
                  size={25}
                  strokeWidth={1.2}
                  className="chain-arrow"
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   METRICS
   ========================================================= */

function Metrics() {
  return (
    <section className="metrics-section">
      <div className="metric-item">
        <Icon name="document" size={43} strokeWidth={1.25} />

        <div className="metric-copy">
          <div className="metric-value">
            <strong>18</strong>
            <span>CRs</span>
          </div>

          <p>Change requests tracked</p>
        </div>
      </div>

      <div className="metric-divider" />

      <div className="metric-item">
        <Icon name="database" size={43} strokeWidth={1.25} />

        <div className="metric-copy">
          <div className="metric-value metric-currency">
            <strong>CHF 180</strong>
            <span>k</span>
          </div>

          <p>Total budget</p>
        </div>
      </div>

      <div className="metric-divider" />

      <div className="metric-item">
        <Icon name="users" size={45} strokeWidth={1.25} />

        <div className="metric-copy">
          <div className="metric-value">
            <strong>4</strong>
            <span>Teams</span>
          </div>

          <p>Active and aligned</p>
        </div>
      </div>

      <div className="metric-divider" />

      <div className="metric-item">
        <Icon name="shield" size={45} strokeWidth={1.25} />

        <div className="metric-copy">
          <div className="metric-value">
            <strong>0</strong>
            <span>Self-approvals</span>
          </div>

          <p>Zero tolerance</p>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   FOOTER
   ========================================================= */

function Footer() {
  return (
    <footer className="landing-footer">
      <div className="footer-primary">
        <div className="footer-brand">
          <EstimAIteLogo tone="dark" className="footer-logo" />
          <span className="footer-gold-line" />
        </div>

        <h2>
          Built for PMO, finance, and delivery leads
          <br />
          who have to defend the number.
        </h2>
      </div>

      <div className="footer-rule" />

      <div className="footer-bottom">
        <span>© 2026 estimAIte. All rights reserved.</span>

        <nav className="footer-nav">
          <a href="#privacy">Privacy</a>
          <a href="#security">Security</a>
          <a href="#terms">Terms</a>
          <a href="#status">Status</a>
          <a href="#contact">Contact</a>
        </nav>

        <span className="made-in">
          Made in Switzerland
          <span className="swiss-flag" aria-label="Swiss flag">
            🇨🇭
          </span>
        </span>
      </div>
    </footer>
  );
}

/* =========================================================
   PAGE
   ========================================================= */

export default function LandingPage() {
  return (
    <div className="estimate-landing-page" id="top">
      <Navigation />

      <main>
        <Hero />
        <Moments />
        <RoleVisibility />
        <GovernanceChain />
        <Metrics />
      </main>

      <Footer />
    </div>
  );
}
