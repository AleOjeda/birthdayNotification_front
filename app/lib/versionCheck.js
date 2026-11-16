import { APP_IDENTITY } from "./version";

export const CHECK_TIMEOUT_MS = 5000;
const VALID_IDENTITY = /^[\w.+:-]{1,200}$/;
const CHUNK_ERROR =
  /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|ChunkLoadError|Loading (CSS )?chunk [\w-]+ failed/i;

/** true si el error es un fallo al cargar un módulo/chunk (típico tras un deploy). */
export function isChunkLoadError(error) {
  if (!error) return false;
  const text = typeof error === "string" ? error : `${error.name || ""} ${error.message || ""}`;
  return CHUNK_ERROR.test(text);
}

/**
 * Consulta /version.json del MISMO origen de la página (sin credenciales ni
 * caché). Devuelve la identidad remota si es válida y distinta de la
 * ejecutándose; en cualquier otro caso (igual, error, timeout, 404, HTML,
 * JSON inválido) devuelve null. Nunca lanza.
 */
export async function checkForNewVersion(
  current = APP_IDENTITY,
  { timeoutMs = CHECK_TIMEOUT_MS } = {},
) {
  if (typeof window === "undefined" || typeof fetch !== "function" || !current) return null;
  const controller = new AbortController();
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve(null);
    }, timeoutMs);
  });
  const request = (async () => {
    const response = await fetch(`/version.json?t=${Date.now()}`, {
      cache: "no-store",
      credentials: "omit",
      signal: controller.signal,
    });
    if (!response || !response.ok) return null;
    const data = await response.json();
    const identity = data && data.identity;
    if (typeof identity !== "string" || !VALID_IDENTITY.test(identity)) return null;
    return identity !== current ? identity : null;
  })().catch(() => null);
  try {
    return await Promise.race([request, timeout]);
  } finally {
    clearTimeout(timer);
  }
}
