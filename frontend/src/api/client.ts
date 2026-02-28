import type { MetricsResponse } from '../types';

const BASE = '/api';

export async function fetchMetrics(): Promise<MetricsResponse> {
  const res = await fetch(`${BASE}/metrics`);
  if (!res.ok) throw new Error(`GET /api/metrics failed: ${res.status}`);
  return res.json();
}

async function postControl(path: string, body?: Record<string, unknown>): Promise<void> {
  await fetch(`${BASE}/controls/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

export const startSim = () => postControl('start');
export const stopSim = () => postControl('stop');
export const resetSim = () => postControl('reset');
export const setConfig = (cfg: {
  numFloors?: number;
  numElevators?: number;
  speed?: number;
  requestFrequencyMs?: number;
}) => postControl('config', cfg);
