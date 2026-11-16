import {
  clearSession,
  getSession,
  getToken,
  notifyMustChangePassword,
  notifyUnauthorized,
} from "../lib/session";

import { beginWork } from "../lib/unsavedChanges";

export const API_URL =
  import.meta.env?.VITE_API_URL || "https://servidorossa.ddns.net";

// Tiempo máximo de cada petición (lecturas y escrituras). Una petición colgada
// no debe bloquear indefinidamente la auto-actualización (beginWork).
export const REQUEST_TIMEOUT_MS = 30000;
export const TIMEOUT_MESSAGE = "La solicitud tardó demasiado. Revisa tu conexión.";

export class ApiError extends Error {
  constructor(message, status, extra = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    if (extra.retryAfter != null) this.retryAfter = extra.retryAfter;
  }
}

function parseRetryAfter(res) {
  const raw = res.headers?.get?.("Retry-After");
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

/**
 * options.handleUnauthorized=false: no cierra sesión ni notifica ante 401/403
 * (usado por logout).
 */
export async function request(path, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  if (method === "GET" || method === "HEAD") return doRequest(path, options);
  // Escritura en vuelo: la auto-actualización no debe recargar a mitad de ella.
  const release = beginWork();
  try {
    return await doRequest(path, options);
  } finally {
    release();
  }
}

async function doRequest(path, options) {
  const { body, handleUnauthorized = true, ...rest } = options;
  const init = { ...rest };
  if (body !== undefined) {
    init.headers = { "Content-Type": "application/json", ...rest.headers };
    init.body = JSON.stringify(body);
  }
  const sentToken = getToken();
  if (sentToken) {
    init.headers = { ...init.headers, Authorization: `Bearer ${sentToken}` };
  }
  // Un único temporizador cubre fetch + lectura del cuerpo; se limpia siempre.
  const controller = new AbortController();
  if (rest.signal) {
    if (rest.signal.aborted) controller.abort();
    else rest.signal.addEventListener("abort", () => controller.abort(), { once: true });
  }
  init.signal = controller.signal;
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new ApiError(TIMEOUT_MESSAGE, 0));
    }, REQUEST_TIMEOUT_MS);
  });
  timeout.catch(() => {});
  let res;
  let data = null;
  try {
    res = await Promise.race([
      fetch(`${API_URL}${path}`, init).catch((e) => {
        if (e instanceof ApiError) throw e;
        throw new ApiError("No se pudo conectar con el servidor. Revisa tu conexión.", 0);
      }),
      timeout,
    ]);
    try {
      data = await Promise.race([res.json(), timeout]);
    } catch (e) {
      if (e instanceof ApiError) throw e;
      data = null;
    }
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    const message = data?.error || `Error inesperado (${res.status})`;
    if (handleUnauthorized) {
      if (res.status === 401 && data?.error === "No autorizado") {
        // Solo la primera respuesta que aún ve el mismo token cierra y notifica.
        // Un 401 de un token viejo nunca cierra una sesión nueva.
        if (sentToken) {
          if (getToken() === sentToken) {
            clearSession();
            notifyUnauthorized();
          }
        } else if (!getSession()) {
          // Sin token ni sesión: no queda mudo (los listeners deduplican).
          notifyUnauthorized();
        }
      } else if (res.status === 403 && data?.error === "Debe cambiar su contraseña") {
        notifyMustChangePassword();
      }
    }
    throw new ApiError(
      message,
      res.status,
      res.status === 429 ? { retryAfter: parseRetryAfter(res) } : {},
    );
  }
  return data;
}
