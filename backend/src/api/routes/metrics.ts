// GET state (elevators, requests) and metrics (avg/max wait, avg travel, utilization).

 
import { Router } from 'express';
import { getElevators, getRequests, getSimTimeMs, getIsRunning, getSpeedMultiplier, getRequestFrequencyMs, getNumFloors, getNumElevators, getStartTimeMs } from '../../simulation/state';
import * as calculator from '../../metrics/calculator';
import { defaults } from '../../config/defaults';

const router = Router();

router.get('/', (_req, res) => {
  const elevators = getElevators();
  const requests = getRequests();
  res.json({
    simTimeMs: getSimTimeMs(),
    isRunning: getIsRunning(),
    speedMultiplier: getSpeedMultiplier(),
    requestFrequencyMs: getRequestFrequencyMs(),
    numFloors: getNumFloors(),
    numElevators: getNumElevators(),
    startTimeMs: getStartTimeMs(),
    elevatorCapacity: defaults.elevatorCapacity,
    elevators,
    requests,
    metrics: {
      averageWaitTimeMs: calculator.averageWaitTimeMs(requests),
      maxWaitTimeMs: calculator.maxWaitTimeMs(requests),
      averageTravelTimeMs: calculator.averageTravelTimeMs(requests),
      utilization: calculator.utilizationPerElevator(elevators),
      pendingCount: calculator.pendingCount(requests),
      rejectedCount: calculator.rejectedCount(requests),
    },
  });
});

export default router;
