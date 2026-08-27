import dns from "node:dns/promises";
import net from "node:net";
import type { DiagnosticResult } from "../shared/types.js";

const ALLOWED_HOSTS = new Set(["localhost", "example.com", "example.org", "httpbin.org"]);
const ALLOWED_PORTS = new Set([80, 443, 3000, 3001, 5173]);
const validHost = (host: string) => ALLOWED_HOSTS.has(host.toLowerCase());
const base = (tool: DiagnosticResult["tool"], target: string) => ({ tool, target, checkedAt: new Date().toISOString() });
const blocked = (tool: DiagnosticResult["tool"], target: string, reason: string): DiagnosticResult => ({ ...base(tool, target), status: "blocked", details: { reason, policy: "Only approved demonstration hosts and ports can be checked." } });

export async function dnsLookup(host: string): Promise<DiagnosticResult> {
  if (!validHost(host)) return blocked("dns", host, "Host is not on the local demonstration allowlist.");
  try { const addresses = await dns.lookup(host, { all: true }); return { ...base("dns", host), status: "success", details: { addresses } }; }
  catch (error) { return { ...base("dns", host), status: "failed", details: { message: error instanceof Error ? error.message : "DNS lookup failed" } }; }
}
export async function httpStatus(urlText: string): Promise<DiagnosticResult> {
  let url: URL; try { url = new URL(urlText); } catch { return blocked("http", urlText, "A valid absolute URL is required."); }
  if (url.protocol !== "https:" || !validHost(url.hostname)) return blocked("http", urlText, "HTTPS and approved demonstration hosts are required.");
  try { const response = await fetch(url, { method: "HEAD", redirect: "manual", signal: AbortSignal.timeout(5000) }); return { ...base("http", urlText), status: "success", details: { statusCode: response.status, statusText: response.statusText } }; }
  catch (error) { return { ...base("http", urlText), status: "failed", details: { message: error instanceof Error ? error.message : "HTTP check failed" } }; }
}
export async function portCheck(host: string, port: number): Promise<DiagnosticResult> {
  const target = `${host}:${port}`;
  if (!validHost(host) || !ALLOWED_PORTS.has(port)) return blocked("port", target, "Host or port is outside the local demonstration allowlist.");
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port, timeout: 3000 });
    socket.once("connect", () => { socket.destroy(); resolve({ ...base("port", target), status: "success", details: { open: true, port } }); });
    socket.once("timeout", () => { socket.destroy(); resolve({ ...base("port", target), status: "failed", details: { open: false, reason: "Timed out" } }); });
    socket.once("error", (error) => resolve({ ...base("port", target), status: "failed", details: { open: false, reason: error.message } }));
  });
}
