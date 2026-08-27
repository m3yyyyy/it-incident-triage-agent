import { describe, expect, it } from "vitest";
import { triageIncident } from "../server/triage.js";
import type { Runbook } from "../shared/types.js";
const runbooks: Runbook[] = [{ id: "auth", title: "Sign-in", category: "Identity & access", keywords: ["outlook", "password", "mfa"], summary: "", likelyCauses: ["Session expired"], steps: ["Check sign-in"] }];
describe("triageIncident", () => {
  it("retrieves a matching runbook and grades an authentication incident", () => {
    const result = triageIncident({ title: "Outlook password prompt", description: "MFA keeps failing", reporter: "Sam", affectedService: "Microsoft 365" }, runbooks);
    expect(result.category).toBe("Identity & access"); expect(result.priority).toBe("P3"); expect(result.confidence).toBeGreaterThan(70); expect(result.matchedRunbooks).toHaveLength(1); expect(result.recommendation.requiresApproval).toBe(true);
  });
  it("is conservative when no runbook matches", () => {
    const result = triageIncident({ title: "Odd laptop behaviour", description: "Screen flickers", reporter: "Sam", affectedService: "Laptop" }, runbooks);
    expect(result.category).toBe("General IT support"); expect(result.priority).toBe("P4"); expect(result.confidence).toBeLessThan(60);
  });
});
