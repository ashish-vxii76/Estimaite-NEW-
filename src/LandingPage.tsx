"use client";

import { useEffect, useRef } from "react";
import WaxSeal, { SealDefs } from "./WaxSeal";
import { EstimAIteLogo } from "@/components/brand/EstimAIteLogo";
import "./landing.css";

const HEADLINE = ["The", "estimate", "that", "holds", "up", "in"];

const MOMENTS = [
  { n: "01", t: "Ready", b: "Clarify the why, outcomes, constraints and assumptions." },
  { n: "02", t: "Size", b: "Size scope and complexity with evidence." },
  { n: "03", t: "Plan & cost", b: "Validate capacity, derive CHF cost." },
  { n: "04", t: "Govern", b: "Two-person approval, audit-ready ledger." },
];

const CHAIN = [
  "Scope", "Complexity", "T-Shirt", "SP / ROM", "Capacity", "Sprints",
  "CHF cost", "AI impact", "Governance", "Actuals", "Calibration",
];

export default function LandingPage() {
  const rootRef = useRef<HTMLDivElement>(null);

  function toggleTheme() {
    const el = document.documentElement;
    const next = el.dataset.theme === "dark" ? "light" : "dark";
    el.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const RM = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fmt = new Intl.NumberFormat("en-CH");

    const countTo = (el: HTMLElement) => {
      if (el.dataset.done) return;
      el.dataset.done = "1";
      const to = Number(el.dataset.to || 0);
      const pre = el.dataset.prefix || "";
      const suf = el.dataset.suffix || "";
      if (RM) {
        el.textContent = pre + fmt.format(to) + suf;
        return;
      }
      const dur = 1500;
      const t0 = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - t0) / dur);
        const e = 1 - Math.pow(1 - p, 3);
        el.textContent = pre + fmt.format(Math.round(to * e)) + suf;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    const hero = root.querySelector<HTMLElement>("[data-hero-counter]");
    if (hero) {
      if (RM) hero.textContent = fmt.format(180000);
      else window.setTimeout(() => countTo(hero), 800);
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("in");
            en.target.querySelectorAll<HTMLElement>(".num[data-to]").forEach(countTo);
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.25 },
    );
    root.querySelectorAll(".rv").forEach((el) => io.observe(el));

    const seal = root.querySelector<HTMLElement>(".lp-seal-wrap");
    const ring = root.querySelector<HTMLElement>(".lp-seal-ring");
    if (ring && !RM) window.setTimeout(() => ring.classList.add("go"), 2350);
    let firstSeal = true;
    const sealIo = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting || RM) return;
          if (firstSeal) {
            firstSeal = false;
            return;
          }
          if (seal) {
            seal.classList.remove("restamp");
            void seal.offsetWidth;
            seal.classList.add("restamp");
          }
          if (ring) {
            ring.classList.remove("go");
            void ring.offsetWidth;
            ring.classList.add("go");
          }
        });
      },
      { threshold: 0.6 },
    );
    if (seal) sealIo.observe(seal);

    const stage = root.querySelector<HTMLElement>(".lp-stage");
    const card = root.querySelector<HTMLElement>(".lp-card");
    const fine = window.matchMedia("(pointer:fine)").matches;
    const onMove = (e: PointerEvent) => {
      if (!stage || !card) return;
      const r = stage.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `rotate(1.6deg) rotateY(${x * 5}deg) rotateX(${-y * 5}deg)`;
    };
    const onLeave = () => {
      if (card) card.style.transform = "rotate(1.6deg)";
    };
    if (!RM && fine && stage) {
      stage.addEventListener("pointermove", onMove);
      stage.addEventListener("pointerleave", onLeave);
    }

    return () => {
      io.disconnect();
      sealIo.disconnect();
      if (stage) {
        stage.removeEventListener("pointermove", onMove);
        stage.removeEventListener("pointerleave", onLeave);
      }
    };
  }, []);

  return (
    <div className="lp" ref={rootRef} id="top">
      <SealDefs />
      <div className="lp-bg" aria-hidden="true">
        <div className="lp-grid" />
        <div className="lp-glow" />
        <div className="lp-glow two" />
      </div>

      <div className="lp-page">
        <header className="lp-header">
          <div className="wrap">
            <a className="lp-brand" href="#top" aria-label="estimAIte home">
              <EstimAIteLogo tone="light" className="lp-logo lp-logo-light" />
              <EstimAIteLogo tone="dark" className="lp-logo lp-logo-dark" />
            </a>
            <nav className="lp-nav" aria-label="Main">
              <a href="#moments">Moments</a>
              <a href="#governance">Governance</a>
              <a href="#roles">Visibility</a>
              <a href="#proof">Proof</a>
            </nav>
            <div className="lp-right">
              <button
                type="button"
                className="lp-toggle"
                onClick={toggleTheme}
                aria-label="Switch light / dark theme"
                title="Switch theme"
              >
                <svg className="lp-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />
                </svg>
                <svg className="lp-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                </svg>
              </button>
              <a href="/login" className="lp-btn lp-btn-ghost" style={{ minHeight: 44, padding: "0 18px" }}>
                Sign in
              </a>
            </div>
          </div>
        </header>

        <main>
          {/* HERO */}
          <section className="lp-hero" id="product">
            <div className="wrap">
              <div>
                <p className="lp-eyebrow">
                  <span className="lp-pulse" />
                  Governed estimation · CHF costing · Two-person approval
                </p>
                <h1 className="lp-h1">
                  {HEADLINE.map((w, i) => (
                    <span key={w} className="lp-word" style={{ animationDelay: `${0.05 + i * 0.1}s` }}>
                      {w}{" "}
                    </span>
                  ))}
                  <span className="lp-word it" style={{ animationDelay: "0.68s", whiteSpace: "nowrap" }}>
                    the&nbsp;board&nbsp;pack.
                  </span>
                </h1>
                <p className="lp-sub">
                  Scope, complexity, capacity, CHF cost, AI impact and approval — one governed chain,
                  sealed and audit-ready. Not a story-point toy.
                </p>
                <div className="lp-pills">
                  <span className="lp-pill"><span className="dot g" />Reproducible</span>
                  <span className="lp-pill"><span className="dot" />Audit-ready ledger</span>
                  <span className="lp-pill"><span className="dot" />Two-person rule</span>
                </div>
                <div className="lp-cta">
                  <a href="/login" className="lp-btn lp-btn-gold">Start a governed estimate →</a>
                  <a href="#governance" className="lp-btn lp-btn-ghost">See how it works</a>
                </div>
              </div>

              <div className="lp-stage">
                <div className="lp-card">
                  <div className="lp-paper">
                    <div className="lp-ctop"><span>Estimate ledger</span><span>EST-2024-00187</span></div>
                    <p className="lp-clbl">Total cost (CHF)</p>
                    <p className="lp-total"><span className="cur">CHF</span><span data-hero-counter data-to="180000">0</span></p>
                    <div className="lp-cmid">
                      <div>
                        <p className="lp-clbl" style={{ marginTop: 0 }}>Cost trend</p>
                        <svg className="lp-spark" viewBox="0 0 240 66" aria-hidden="true">
                          <line className="g" x1="0" y1="16" x2="240" y2="16" />
                          <line className="g" x1="0" y1="38" x2="240" y2="38" />
                          <line className="g" x1="0" y1="58" x2="240" y2="58" />
                          <polyline className="ln" points="6,54 34,46 62,49 92,34 120,39 150,25 180,29 210,17 234,8" />
                          <circle className="end" cx="234" cy="8" r="4" />
                        </svg>
                      </div>
                      <dl className="lp-cstats">
                        <div><dt>T-shirt</dt><dd>XL</dd></div>
                        <div><dt>Story points</dt><dd>34 SP</dd></div>
                        <div><dt>Duration</dt><dd>3 sprints</dd></div>
                      </dl>
                    </div>
                    <div className="lp-cfoot">
                      <div><span>Status</span><strong>Governed</strong></div>
                      <div><span>Approval</span><strong>Two-person</strong></div>
                      <div><span>Updated</span><strong>21 May 2024</strong></div>
                    </div>
                  </div>
                </div>
                <div className="lp-seal-ring" aria-hidden="true" />
                <WaxSeal variant="governed" className="lp-seal-wrap" fontSize={27} />
              </div>
            </div>
          </section>

          <div className="wrap">
            <div className="lp-marquee">
              <div className="row">
                <span><b>AMER</b> · EMEA · APAC · CHF costing · GOVERNED · AUDIT-READY · TWO-PERSON · REPRODUCIBLE · CALIBRATED · &nbsp;</span>
                <span><b>AMER</b> · EMEA · APAC · CHF costing · GOVERNED · AUDIT-READY · TWO-PERSON · REPRODUCIBLE · CALIBRATED · &nbsp;</span>
              </div>
            </div>
          </div>

          {/* MOMENTS */}
          <section className="lp-moments" id="moments">
            <div className="wrap">
              <div className="lp-khead rv">
                <p className="lp-kk">The path</p>
                <h2>Four moments, one number.</h2>
                <p className="lp-lede">From readiness to governance — each step leaves evidence on the ledger.</p>
              </div>
              <ol className="lp-track">
                {MOMENTS.map((m, i) => (
                  <li key={m.n} className={`lp-moment rv d${i}`}>
                    <div className="lp-rail" aria-hidden="true">
                      <span className="lp-dot">{m.n}</span>
                      {i < MOMENTS.length - 1 ? <span className="lp-line" /> : null}
                    </div>
                    <div><h3>{m.t}</h3><p>{m.b}</p></div>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* GOVERNANCE + PROOF */}
          <section className="lp-gov" id="governance">
            <div className="lp-grid" aria-hidden="true" />
            <div className="wrap">
              <div className="lp-khead rv">
                <p className="lp-kk">Traceability</p>
                <h2>Nothing orphaned — scope to calibration.</h2>
                <p className="lp-lede">Every field on the ledger connects. Change one input and the chain re-derives, governed end to end.</p>
              </div>
              <div className="lp-flow">
                {CHAIN.map((c, i) => (
                  <span key={c} className={`lp-node rv d${Math.min(4, Math.floor(i / 3))}`}>
                    <b>{String(i + 1).padStart(2, "0")}</b>{c}
                  </span>
                ))}
              </div>
              <div className="lp-mgrid" id="proof">
                <div className="rv"><div className="num" data-to="180" data-prefix="CHF " data-suffix="k">CHF 0k</div><div className="cap">Governed budget on the ledger</div></div>
                <div className="rv d1"><div className="num" data-to="18">0</div><div className="cap">Change requests tracked</div></div>
                <div className="rv d2"><div className="num" data-to="4">0</div><div className="cap">Teams active and aligned</div></div>
                <div className="rv d3"><div className="num" data-to="0">0</div><div className="cap">Self-approvals tolerated</div></div>
              </div>
            </div>
          </section>

          {/* ROLES */}
          <section id="roles">
            <div className="wrap">
              <div className="lp-khead center rv">
                <p className="lp-kk">Visibility</p>
                <h2>Who sees what.</h2>
                <p className="lp-lede">Same estimate. Different lenses. Admin sees every team — everyone else sees theirs, as that role.</p>
              </div>
              <div className="lp-roles-grid">
                <article className="lp-role rv">
                  <div className="lp-role-head"><p className="lp-role-label">Requester</p><p className="lp-role-status">Submitted</p></div>
                  <div className="lp-role-body">
                    <p className="lp-role-cost">CHF 180,000</p>
                    <p className="lp-role-note">Drafts and submits for approval. Cannot self-approve.</p>
                    <ul className="lp-role-meta"><li><span>Visibility</span><strong>My team only</strong></li><li><span>T-shirt</span><strong>XL</strong></li><li><span>Story points</span><strong>34 SP</strong></li></ul>
                  </div>
                </article>
                <article className="lp-role emph rv d1">
                  <div className="lp-role-head"><p className="lp-role-label">Approver</p><p className="lp-role-status">Pending</p></div>
                  <div className="lp-role-body">
                    <p className="lp-role-cost">CHF 180,000</p>
                    <p className="lp-role-note">Reviews, rejects, or governs. Two-person rule enforced.</p>
                    <ul className="lp-role-meta"><li><span>Visibility</span><strong>My team only</strong></li><li><span>T-shirt</span><strong>XL</strong></li><li><span>Story points</span><strong>34 SP</strong></li></ul>
                  </div>
                  <WaxSeal variant="rejected" className="lp-role-seal red" fontSize={29} />
                  <WaxSeal variant="governed" className="lp-role-seal green" fontSize={27} />
                </article>
                <article className="lp-role rv d2">
                  <div className="lp-role-head"><p className="lp-role-label">Finance</p><p className="lp-role-status">Governed</p></div>
                  <div className="lp-role-body">
                    <p className="lp-role-cost">CHF 180,000</p>
                    <p className="lp-role-note">Reads the board-ready CHF number and approval trail.</p>
                    <ul className="lp-role-meta"><li><span>Visibility</span><strong>My team only</strong></li><li><span>T-shirt</span><strong>XL</strong></li><li><span>Story points</span><strong>34 SP</strong></li></ul>
                  </div>
                </article>
              </div>
            </div>
          </section>

          {/* CLOSE */}
          <section className="lp-close">
            <div className="wrap rv">
              <p className="lp-kk" style={{ textAlign: "center" }}>Ready</p>
              <h2>When the number has to hold up.</h2>
              <p className="lp-lede">Open the ledger and start a governed estimate.</p>
              <a href="/login" className="lp-btn lp-btn-gold">Start a governed estimate →</a>
            </div>
          </section>
        </main>

        <footer className="lp-footer">
          <div className="wrap">
            <span>© 2026 Ashish Joshi · estimAIte</span>
            <span>Made in India</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
