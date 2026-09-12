/**
 * Feature flags — env-driven, OFF by default. Server-only.
 *
 * GitLab Agentic Intake (PRD §10 Isolation): the entire feature is gated behind
 * FEATURE_GITLAB_INTAKE so it ships dark and can be disabled without a redeploy. Nothing in the
 * intake feature may run — routes, nav, actions, jobs — unless this returns true.
 */
export function isGitlabIntakeEnabled(): boolean {
  const v = process.env.FEATURE_GITLAB_INTAKE;
  return v === "1" || v === "true" || v === "on";
}
