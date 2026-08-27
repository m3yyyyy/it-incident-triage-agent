import type { IncidentInput, Priority, Recommendation, Runbook } from "../shared/types.js";

const priorityRules: Array<[Priority, string[]]> = [
  ["P1", ["all users", "company-wide", "outage", "ransomware", "data breach", "critical"]],
  ["P2", ["multiple users", "department", "production", "cannot work", "major"]],
  ["P3", ["cannot access", "unable", "error", "password", "slow", "intermittent"]]
];

export function triageIncident(input: IncidentInput, runbooks: Runbook[]) {
  const searchable = `${input.title} ${input.description} ${input.affectedService}`.toLowerCase();
  const scored = runbooks.map((runbook) => ({ runbook, score: runbook.keywords.reduce((sum, keyword) => sum + (searchable.includes(keyword) ? 1 : 0), 0) }))
    .sort((a, b) => b.score - a.score);
  const best = scored[0];
  const matches = scored.filter(({ score }) => score > 0).slice(0, 2).map(({ runbook }) => runbook);
  const priority = priorityRules.find(([, words]) => words.some((word) => searchable.includes(word)))?.[0] ?? "P4";
  const category = best?.score ? best.runbook.category : "General IT support";
  const confidence = Math.min(97, Math.max(42, 48 + (best?.score ?? 0) * 14 + (matches.length > 0 ? 8 : 0)));
  const fallbackCauses = ["Insufficient information to isolate a cause", "Local device or network condition", "Recent service configuration change"];
  const fallbackSteps = ["Confirm the service, user impact, and when the problem started.", "Check the relevant approved service-status page.", "Gather non-sensitive error details and escalate to the service owner if needed."];
  const recommendation: Recommendation = {
    summary: best?.score ? `Matched ${best.runbook.title} using local runbook retrieval.` : "No strong runbook match; a conservative general IT review is recommended.",
    likelyCauses: best?.score ? best.runbook.likelyCauses : fallbackCauses,
    steps: best?.score ? best.runbook.steps : fallbackSteps,
    requiresApproval: true,
    proposedAction: "Approve the read-only investigation and guided remediation plan. This application cannot change accounts, infrastructure, or production systems."
  };
  return { category, priority, confidence, matchedRunbooks: matches, recommendation };
}
