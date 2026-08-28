import express from "express";
import cors from "cors";
import crypto from "node:crypto";
import path from "node:path";
import type { Incident, IncidentInput, TimelineEvent } from "../shared/types.js";
import { triageIncident } from "./triage.js";
import { getIncidents, getRunbooks, saveIncidents } from "./store.js";
import { dnsLookup, httpStatus, portCheck } from "./diagnostics.js";

const app = express(); app.use(cors()); app.use(express.json({ limit: "50kb" }));
const event = (type: TimelineEvent["type"], actor: string, message: string, metadata?: Record<string, unknown>): TimelineEvent => ({ id: crypto.randomUUID(), type, actor, message, metadata, at: new Date().toISOString() });
app.get("/api/health", (_req, res) => res.json({ status: "ok", mode: "local-simulated", version: "1.0.0" }));
app.get("/api/incidents", async (_req, res) => res.json(await getIncidents()));
app.get("/api/incidents/:id", async (req, res) => { const incident = (await getIncidents()).find((item) => item.id === req.params.id); if (!incident) return res.status(404).json({ error: "Incident not found" }); res.json(incident); });
app.post("/api/incidents", async (req, res) => {
  const input = req.body as IncidentInput;
  const fields = [input.title, input.description, input.reporter, input.affectedService];
  if (!fields.every((value) => typeof value === "string" && value.trim())) return res.status(400).json({ error: "title, description, reporter, and affectedService are required." });
  if (input.title.length > 160 || input.description.length > 2000 || input.reporter.length > 100 || input.affectedService.length > 120) return res.status(400).json({ error: "Incident fields exceed the public demo limits." });
  const analysis = triageIncident(input, await getRunbooks()); const now = new Date().toISOString();
  const incident: Incident = { id: `inc-${crypto.randomUUID().slice(0, 8)}`, ...input, createdAt: now, status: "awaiting_approval", ...analysis, timeline: [], auditTrail: [] };
  incident.timeline = [event("submitted", input.reporter, "Incident submitted."), event("triaged", "Triage agent", `Classified as ${incident.category} (${incident.priority}, ${incident.confidence}% confidence).`), event("approval_requested", "Triage agent", "Recommendation is waiting for human approval.")];
  incident.auditTrail = [...incident.timeline]; const incidents = await getIncidents(); incidents.unshift(incident); await saveIncidents(incidents.slice(0, 100)); res.status(201).json(incident);
});
app.post("/api/incidents/:id/decision", async (req, res) => {
  const decision = req.body?.decision; const reviewer = String(req.body?.reviewer || "Operations reviewer"); if (decision !== "approve" && decision !== "reject") return res.status(400).json({ error: "decision must be approve or reject" });
  const incidents = await getIncidents(); const incident = incidents.find((item) => item.id === req.params.id); if (!incident) return res.status(404).json({ error: "Incident not found" }); if (incident.status !== "awaiting_approval") return res.status(409).json({ error: "A decision has already been recorded." });
  const approved = decision === "approve"; incident.status = approved ? "approved" : "rejected"; const record = event(approved ? "approved" : "rejected", reviewer, approved ? "Recommendation approved. No automated action was executed." : "Recommendation rejected. No action was executed."); incident.timeline.push(record); incident.auditTrail.push(record); await saveIncidents(incidents); res.json(incident);
});
app.post("/api/diagnostics/:tool", async (req, res) => {
  const { tool } = req.params; let result; if (tool === "dns") result = await dnsLookup(String(req.body?.host || "")); else if (tool === "http") result = await httpStatus(String(req.body?.url || "")); else if (tool === "port") result = await portCheck(String(req.body?.host || ""), Number(req.body?.port)); else return res.status(404).json({ error: "Unknown diagnostic tool" }); res.json(result);
});
if (process.env.SERVE_CLIENT === "true") { const root = path.resolve(process.cwd(), "dist"); app.use(express.static(root)); app.get("/{*splat}", (_req, res) => res.sendFile(path.join(root, "index.html"))); }
const port = Number(process.env.PORT || 3001); app.listen(port, () => console.log(`Triage API listening on http://localhost:${port}`));
