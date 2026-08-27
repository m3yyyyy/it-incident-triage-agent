export type Priority = "P1" | "P2" | "P3" | "P4";
export type IncidentStatus = "triaged" | "awaiting_approval" | "approved" | "rejected";
export type EventType = "submitted" | "triaged" | "approval_requested" | "approved" | "rejected" | "diagnostic_run";

export interface TimelineEvent { id: string; type: EventType; at: string; actor: string; message: string; metadata?: Record<string, unknown> }
export interface Recommendation { summary: string; likelyCauses: string[]; steps: string[]; requiresApproval: true; proposedAction: string }
export interface Incident {
  id: string; title: string; description: string; reporter: string; affectedService: string; createdAt: string;
  category: string; priority: Priority; confidence: number; status: IncidentStatus; matchedRunbooks: Runbook[];
  recommendation: Recommendation; timeline: TimelineEvent[]; auditTrail: TimelineEvent[];
}
export interface Runbook { id: string; title: string; category: string; keywords: string[]; summary: string; likelyCauses: string[]; steps: string[] }
export interface IncidentInput { title: string; description: string; reporter: string; affectedService: string }
export interface DiagnosticResult { tool: "dns" | "http" | "port"; target: string; checkedAt: string; status: "success" | "failed" | "blocked"; details: Record<string, unknown> }
