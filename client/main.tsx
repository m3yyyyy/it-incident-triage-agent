import { useEffect, useState, type FormEvent } from "react";
import { createRoot } from "react-dom/client";
import type { DiagnosticResult, Incident, IncidentInput } from "../shared/types";
import "./styles.css";

const api = async <T,>(path: string, options?: RequestInit): Promise<T> => { const response = await fetch(`/api${path}`, { headers: { "Content-Type": "application/json" }, ...options }); if (!response.ok) throw new Error((await response.json()).error || "Request failed"); return response.json() as Promise<T>; };
const priorityClass = (priority: string) => `priority ${priority.toLowerCase()}`;
const date = (value: string) => new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

function App() {
  const [incidents, setIncidents] = useState<Incident[]>([]); const [selected, setSelected] = useState<Incident | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [diagnostic, setDiagnostic] = useState<DiagnosticResult | null>(null);
  const load = async () => { try { const data = await api<Incident[]>("/incidents"); setIncidents(data); setSelected((previous) => data.find((item) => item.id === previous?.id) ?? data[0] ?? null); } catch (e) { setError(e instanceof Error ? e.message : "Could not load incidents"); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form)) as unknown as IncidentInput;
    try {
      const item = await api<Incident>("/incidents", { method: "POST", body: JSON.stringify(values) });
      form.reset();
      await load();
      setSelected(item);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit incident");
    }
  }
  async function decide(decision: "approve" | "reject") { if (!selected) return; try { const updated = await api<Incident>(`/incidents/${selected.id}/decision`, { method: "POST", body: JSON.stringify({ decision, reviewer: "Dashboard reviewer" }) }); setSelected(updated); setIncidents((items) => items.map((item) => item.id === updated.id ? updated : item)); } catch (e) { setError(e instanceof Error ? e.message : "Could not record decision"); } }
  async function runDiagnostic(tool: "dns" | "http" | "port") { const payload = tool === "dns" ? { host: "example.com" } : tool === "http" ? { url: "https://example.com" } : { host: "example.com", port: 443 }; try { setDiagnostic(await api<DiagnosticResult>(`/diagnostics/${tool}`, { method: "POST", body: JSON.stringify(payload) })); } catch (e) { setError(e instanceof Error ? e.message : "Diagnostic failed"); } }
  return <main><header><div><p className="eyebrow">LOCAL-FIRST • HUMAN-IN-THE-LOOP</p><h1>Incident Triage <span>Agent</span></h1><p className="subtitle">Turn reports into explainable, approval-gated IT response plans.</p></div><div className="safe-badge">● Read-only mode<br/><small>No infrastructure changes</small></div></header>
  {error && <div className="notice">{error}<button onClick={() => setError("")}>Dismiss</button></div>}
  <section className="stats"><article><strong>{incidents.length}</strong><span>Incidents tracked</span></article><article><strong>{incidents.filter((item) => item.status === "awaiting_approval").length}</strong><span>Awaiting approval</span></article><article><strong>100%</strong><span>Audit coverage</span></article><article><strong>Local</strong><span>Execution mode</span></article></section>
  <section className="layout"><aside className="card queue"><div className="section-title"><h2>Incident queue</h2><span>{loading ? "Loading" : `${incidents.length} open`}</span></div>{incidents.map((item) => <button className={`incident-row ${selected?.id === item.id ? "active" : ""}`} key={item.id} onClick={() => setSelected(item)}><span className={priorityClass(item.priority)}>{item.priority}</span><div><strong>{item.title}</strong><small>{item.category} · {item.status.replace("_", " ")}</small></div></button>)}</aside>
  <section className="card detail">{selected ? <><div className="detail-head"><div><div className="row"><span className={priorityClass(selected.priority)}>{selected.priority}</span><span className="status">{selected.status.replace("_", " ")}</span></div><h2>{selected.title}</h2><p>{selected.description}</p><small>Reported by {selected.reporter} · {selected.affectedService} · {date(selected.createdAt)}</small></div><div className="confidence"><strong>{selected.confidence}%</strong><span>triage confidence</span></div></div>
  <div className="analysis"><div><h3>Classification</h3><p className="category">{selected.category}</p><h3>Likely causes</h3><ul>{selected.recommendation.likelyCauses.map((cause) => <li key={cause}>{cause}</li>)}</ul></div><div><h3>Recommended response</h3><ol>{selected.recommendation.steps.map((step) => <li key={step}>{step}</li>)}</ol><div className="approval"><strong>Approval required</strong><p>{selected.recommendation.proposedAction}</p>{selected.status === "awaiting_approval" ? <div><button className="approve" onClick={() => void decide("approve")}>Approve plan</button><button className="reject" onClick={() => void decide("reject")}>Reject</button></div> : <p className="decision">Decision recorded: {selected.status}. No automated action ran.</p>}</div></div></div>
  <div className="timeline"><h3>Incident timeline & audit trail</h3>{selected.timeline.map((item) => <div className="event" key={item.id}><i></i><div><strong>{item.type.replaceAll("_", " ")}</strong><p>{item.message}</p><small>{item.actor} · {date(item.at)}</small></div></div>)}</div></> : <p>No incident selected.</p>}</section></section>
  <section className="bottom"><form className="card submit" onSubmit={submit}><h2>Submit an incident</h2><label>Title<input name="title" required placeholder="e.g. VPN connection fails after MFA"/></label><label>Description<textarea name="description" required placeholder="Describe the impact, error, and when it started."></textarea></label><div className="two"><label>Reporter<input name="reporter" required placeholder="Your name"/></label><label>Affected service<input name="affectedService" required placeholder="e.g. Corporate VPN"/></label></div><button className="primary">Create triage plan</button></form>
  <section className="card diagnostics"><h2>Safe diagnostics</h2><p>Read-only checks use a small demonstration allowlist: localhost, example.com, example.org, and httpbin.org.</p><div><button onClick={() => void runDiagnostic("dns")}>DNS lookup</button><button onClick={() => void runDiagnostic("http")}>HTTP status</button><button onClick={() => void runDiagnostic("port")}>Port check</button></div>{diagnostic && <pre>{JSON.stringify(diagnostic, null, 2)}</pre>}<small>Every action is intentionally non-destructive. Blocked requests return structured JSON.</small></section></section>
  <footer>Built for explainable IT operations · Local sample data only · <a href="https://github.com">Ready for GitHub</a></footer></main>;
}
createRoot(document.getElementById("root")!).render(<App />);
