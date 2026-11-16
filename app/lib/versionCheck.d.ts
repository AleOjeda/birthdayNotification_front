export const CHECK_TIMEOUT_MS: number;
export function isChunkLoadError(error: unknown): boolean;
export function checkForNewVersion(
  current?: string,
  options?: { timeoutMs?: number },
): Promise<string | null>;
