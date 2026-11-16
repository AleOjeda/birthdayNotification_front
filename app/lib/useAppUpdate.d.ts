export const CHECK_INTERVAL_MS: number;
export const NAV_THROTTLE_MS: number;
export const MAX_JITTER_MS: number;
export const INITIAL_CHECK_MS: number;
export function recoverFromChunkError(current?: string): Promise<boolean>;
export function forceReload(target?: string): void;
export function useAppUpdate(options?: {
  currentIdentity?: string;
  intervalMs?: number;
  navThrottleMs?: number;
  jitterMs?: number;
  initialDelayMs?: number;
}): { status: "idle" | "available" | "failed"; updateNow: () => void; dismiss: () => void };
