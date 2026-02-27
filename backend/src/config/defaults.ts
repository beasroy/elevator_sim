// Default simulation config: n elevators, k floors, request frequency, rush window.

export const defaults = {

  numElevators: 4,

  numFloors: 10,

  requestFrequencyMs: 5000,

  rushLobbyFraction: 0.7,

  rushStartMs: 9 * 60 * 60 * 1000,

  rushDurationMs: 30 * 60 * 1000,

  starvationThresholdMs: 30_000,

  lobbyFloor: 0,
} as const;

export type Defaults = typeof defaults;


export function isRushWindow(now: number): boolean {
  return (
    now >= defaults.rushStartMs &&
    now < defaults.rushStartMs + defaults.rushDurationMs
  );
}
