import { useEffect, useRef, useState, useCallback } from 'react';
import type { MetricsResponse } from '../types';
import { fetchMetrics, startSim, stopSim, resetSim, setConfig } from '../api/client';

const POLL_FAST = 300;
const POLL_SLOW = 1000;

export function useSimulation() {
  const [state, setState] = useState<MetricsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inflight = useRef(false);

  const poll = useCallback(async () => {
    if (inflight.current) return;
    inflight.current = true;
    try {
      const data = await fetchMetrics();
      setState(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch');
    } finally {
      inflight.current = false;
    }
  }, []);

  useEffect(() => {
    poll();
    const ms = state?.isRunning ? POLL_FAST : POLL_SLOW;
    const id = setInterval(poll, ms);
    return () => clearInterval(id);
  }, [poll, state?.isRunning]);

  const start = useCallback(async () => {
    await startSim();
    await poll();
  }, [poll]);

  const stop = useCallback(async () => {
    await stopSim();
    await poll();
  }, [poll]);

  const reset = useCallback(async () => {
    await resetSim();
    await poll();
  }, [poll]);

  const configure = useCallback(
    async (cfg: Parameters<typeof setConfig>[0]) => {
      await setConfig(cfg);
      await poll();
    },
    [poll],
  );

  return { state, error, start, stop, reset, configure };
}
