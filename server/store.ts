import fs from "node:fs/promises";
import path from "node:path";
import type { Incident, Runbook } from "../shared/types.js";

const dataDir = path.resolve(process.cwd(), "data");
const incidentFile = path.join(dataDir, "incidents.local.json");
const seedFile = path.join(dataDir, "incidents.json");

async function readJson<T>(file: string): Promise<T> { return JSON.parse(await fs.readFile(file, "utf8")) as T; }
export async function getRunbooks() { return readJson<Runbook[]>(path.join(dataDir, "runbooks.json")); }
export async function getIncidents() {
  try { return await readJson<Incident[]>(incidentFile); } catch { return readJson<Incident[]>(seedFile); }
}
export async function saveIncidents(incidents: Incident[]) { await fs.writeFile(incidentFile, JSON.stringify(incidents, null, 2)); }
