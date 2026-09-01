"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CrewScopePanel } from "@/components/admin/CrewScopePanel";
import { EstimationConfigForm } from "@/components/admin/EstimationConfigForm";
import type { EstimationConfig, TShirt } from "@/domain/estimation/types";

type Unit = { id: string; type: string; name: string; parentId: string | null };

// DEC-014 tiers. Tier 1 = crew-tunable (never breaks person-days). Tier 2 = governance policy. Tier 3
// = comparability-breaking (computes/guards person-days itself) → loud flag + advisory calibration.
const TIER1: { key: keyof EstimationConfig; label: string }[] = [
  { key: "sprintWorkingDays", label: "Sprint working days" },
  { key: "aiMinPct", label: "AI productivity minimum" },
  { key: "aiMaxPct", label: "AI productivity maximum" },
  { key: "standardTeamSize", label: "Standard team size" },
  { key: "fullTeamRateUtilisationWarning", label: "Full team rate utilisation (ratio)" },
];
const TIER2: { key: keyof EstimationConfig; label: string }[] = [
  { key: "issueMaxRecommendedSprints", label: "Issue max recommended sprints" },
  { key: "issueReviewSp", label: "Issue review SP threshold" },
  { key: "issueSplitSp", label: "Issue split SP threshold" },
  { key: "epicDecomposeSp", label: "Epic decompose ROM SP threshold" },
  { key: "epicSplitSp", label: "Epic split ROM SP threshold" },
  { key: "indexReviewMin", label: "Index review minimum" },
  { key: "indexSplitMin", label: "Index split minimum" },
  { key: "dashboardMinEstimates", label: "Dashboard min estimates" },
];
const TIER3_SCALAR: { key: keyof EstimationConfig; label: string }[] = [
  { key: "calibrationMinSamples", label: "Calibration min samples / level" },
];
const TSHIRTS: TShirt[] = ["XS", "S", "M", "L", "XL", "XXL"];

const SCALAR_KEYS = [...TIER1, ...TIER2, ...TIER3_SCALAR].map((f) => f.key as string);

export function EstimationConfigCrewShell({
  config,
  units,
  lockedUnitIds,
  crews,
  activeCrewId,
  override,
  canEditGlobal,
  canWriteCrew,
  canApprove,
}: {
  config: EstimationConfig;
  units: Unit[];
  lockedUnitIds: string[];
  crews: { id: string; name: string }[];
  activeCrewId: string | null;
  override: { status: string; version: number; fields: Record<string, unknown> } | null;
  canEditGlobal: boolean;
  canWriteCrew: boolean;
  canApprove: boolean;
}) {
  const router = useRouter();
  const editingGlobal = !activeCrewId;
  const isApproved = override?.status === "APPROVED";
  const isRequested = override?.status === "REQUESTED";
  const crewName = crews.find((c) => c.id === activeCrewId)?.name ?? "—";

  const globalScalars = Object.fromEntries(SCALAR_KEYS.map((k) => [k, config[k as keyof EstimationConfig] as number]));
  const globalMult = config.complexityMultipliers;

  function seed() {
    const ovFields = (override?.fields ?? {}) as Record<string, unknown>;
    return {
      scalars: { ...globalScalars, ...Object.fromEntries(SCALAR_KEYS.filter((k) => k in ovFields).map((k) => [k, Number(ovFields[k])])) },
      mult: { ...globalMult, ...((ovFields.complexityMultipliers as Record<string, number>) ?? {}) } as Record<TShirt, number>,
    };
  }

  const [scalars, setScalars] = useState<Record<string, number>>(() => seed().scalars);
  const [mult, setMult] = useState<Record<TShirt, number>>(() => seed().mult);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const s = seed();
    setScalars(s.scalars);
    setMult(s.mult);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [override, activeCrewId]);

  // Tier-3 divergence: multipliers or the confidence floor moved from global → PD-incomparable.
  const tier3Diverged =
    isApproved &&
    (scalars.calibrationMinSamples !== globalScalars.calibrationMinSamples ||
      TSHIRTS.some((t) => mult[t] !== globalMult[t]));

  async function call(action: string, extra: Record<string, unknown> = {}) {
    if (!activeCrewId) return;
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/crew-mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, table: "ESTIMATION_CONFIG", crewId: activeCrewId, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Action failed");
      router.refresh();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function revert() {
    if (!window.confirm(`Revert ${crewName} to global estimation config?`)) return;
    await call("revert");
  }
  function save() {
    void call("save", { fields: { ...scalars, complexityMultipliers: mult } });
  }
  function copyFromGlobal() {
    setScalars({ ...globalScalars });
    setMult({ ...globalMult });
  }

  function numInput(key: string, label: string, global: number) {
    const diverged = scalars[key] !== global;
    return (
      <label key={key} className="text-sm">
        {label}
        <input
          type="number"
          step="any"
          className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2"
          value={scalars[key] ?? 0}
          disabled={!canWriteCrew}
          onChange={(e) => setScalars((v) => ({ ...v, [key]: Number(e.target.value) }))}
        />
        <span className="mt-1 block text-[11px] text-[var(--muted)]">
          global: {global}{diverged ? " · overridden" : ""}
        </span>
      </label>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-[var(--navy)]">Estimation Config</h1>
        <p className="mt-1 max-w-3xl text-sm text-[var(--muted)]">
          A crew may override these per DEC-014 (approved &amp; version-pinned). Tier-3 fields
          (complexity multipliers, calibration floor) break cross-crew comparability — see the warning.
          Rounding stays global and is not editable.
        </p>
      </div>

      <div className="flex flex-wrap items-start gap-4">
        <CrewScopePanel units={units} lockedUnitIds={lockedUnitIds} activeCrewId={activeCrewId} />

        <section className="min-w-[340px] flex-1 space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[var(--muted)]">Editing:</span>
            <span className="rounded-full bg-[var(--panel-2)] px-2.5 py-0.5 font-medium text-[var(--navy)]">
              {editingGlobal ? "Global · all crews" : `${crewName}${isApproved ? " · crew-specific" : ""}`}
            </span>
          </div>

          {editingGlobal ? (
            <EstimationConfigForm config={config} readOnly={!canEditGlobal} />
          ) : isApproved ? (
            <div className="space-y-4">
              {tier3Diverged ? (
                <div className="rounded-xl border border-[var(--danger)] bg-[var(--bg-danger,rgba(220,50,50,.08))] px-4 py-3 text-sm text-[var(--danger)]">
                  <span className="font-semibold">Not comparable to any other crew — not even in person-days.</span>{" "}
                  {crewName} has overridden Tier-3 fields (complexity multipliers or the calibration floor),
                  which change how effort itself is computed. Its calibration is <strong>advisory-only</strong>,
                  and its totals must not be pooled with other crews&apos;.
                </div>
              ) : null}
              <div className="flex flex-wrap items-center gap-2">
                {canWriteCrew ? (
                  <>
                    <button type="button" className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm text-[var(--navy)]" onClick={copyFromGlobal}>Copy from global</button>
                    <button type="button" className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm text-[var(--muted)]" disabled={busy} onClick={revert}>Revert to global</button>
                    <button type="button" className="btn-primary text-sm" disabled={busy} onClick={save}>Save for {crewName}</button>
                  </>
                ) : null}
                <span className="text-xs text-[var(--muted)]">Crew-specific · v{override?.version}</span>
              </div>

              <FieldGroup title="Planning (crew-tunable)">
                {TIER1.map((f) => numInput(f.key as string, f.label, globalScalars[f.key as string]))}
              </FieldGroup>
              <FieldGroup title="Governance thresholds (per-crew policy)">
                {TIER2.map((f) => numInput(f.key as string, f.label, globalScalars[f.key as string]))}
              </FieldGroup>
              <FieldGroup title="Comparability-breaking (Tier 3 — use with care)" danger>
                {TIER3_SCALAR.map((f) => numInput(f.key as string, f.label, globalScalars[f.key as string]))}
                {TSHIRTS.map((t) => (
                  <label key={t} className="text-sm">
                    Complexity multiplier {t}
                    <input
                      type="number"
                      step="any"
                      className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2"
                      value={mult[t] ?? 0}
                      disabled={!canWriteCrew}
                      onChange={(e) => setMult((m) => ({ ...m, [t]: Number(e.target.value) }))}
                    />
                    <span className="mt-1 block text-[11px] text-[var(--muted)]">
                      global: {globalMult[t]}{mult[t] !== globalMult[t] ? " · overridden" : ""}
                    </span>
                  </label>
                ))}
              </FieldGroup>
            </div>
          ) : isRequested ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--navy)]">
              <span>Crew-specific estimation config requested — pending administrator approval.</span>
              {canApprove ? <button type="button" className="btn-primary text-sm" disabled={busy} onClick={() => call("approve")}>Approve</button> : null}
              {canWriteCrew ? <button type="button" className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm text-[var(--muted)]" disabled={busy} onClick={revert}>Cancel request</button> : null}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 rounded-lg bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--navy)]">
              <span>{crewName} uses the governed global estimation config. {canApprove ? "Enable a crew-specific copy?" : "Opt into a crew-specific copy (admin-approved)?"}</span>
              {canWriteCrew ? <button type="button" className="btn-primary text-sm" disabled={busy} onClick={() => call("request")}>{canApprove ? "Enable crew-specific" : "Request crew-specific"}</button> : null}
            </div>
          )}

          {message ? <p className="text-sm text-[var(--navy)]">{message}</p> : null}
        </section>
      </div>
    </div>
  );
}

function FieldGroup({ title, danger, children }: { title: string; danger?: boolean; children: React.ReactNode }) {
  return (
    <section className={`card p-5 ${danger ? "border-[var(--danger)]" : ""}`}>
      <h2 className={`mb-3 font-medium ${danger ? "text-[var(--danger)]" : "text-[var(--navy)]"}`}>{title}</h2>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}
