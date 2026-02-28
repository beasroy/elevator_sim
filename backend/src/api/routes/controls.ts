// REST: start, stop, reset; set n, k, frequency, speed (time multiplier).
 
import { Router } from 'express';
import {
  resetState,
  setIsRunning,
  setNumFloors,
  setNumElevators,
  setSpeedMultiplier,
  setRequestFrequencyMs,
  initElevators,
} from '../../simulation/state';
import { resetGenerator } from '../../simulation/requestGenerator';

const router = Router();

router.post('/start', (_req, res) => {
  setIsRunning(true);
  res.json({ ok: true, running: true });
});

router.post('/stop', (_req, res) => {
  setIsRunning(false);
  res.json({ ok: true, running: false });
});

router.post('/reset', (_req, res) => {
  resetState();
  resetGenerator();
  res.json({ ok: true });
});

router.post('/config', (req, res) => {
  const body = req.body ?? {};
  if (typeof body.numFloors === 'number') setNumFloors(body.numFloors);
  if (typeof body.numElevators === 'number') setNumElevators(body.numElevators);
  if (typeof body.speed === 'number') setSpeedMultiplier(body.speed);
  const freq = body.requestFrequencyMs ?? body.frequency;
  if (typeof freq === 'number' && freq > 0) setRequestFrequencyMs(freq);
  initElevators();
  res.json({ ok: true });
});

export default router;
