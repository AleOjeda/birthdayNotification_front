// Anti-bucle de recargas por actualización. Dos defensas en sessionStorage:
//  1) "app-update-attempt": último objetivo y hora; no se repite el mismo
//     objetivo en 10 minutos.
//  2) "app-update-attempts": HISTORIAL de recargas (independiente del objetivo).
//     Con >= MAX_RELOADS recargas automáticas en 10 minutos no se recarga más,
//     aunque las identidades alternen (A->B->A) por un despliegue incoherente.
//     El historial NO se borra al coincidir la identidad: expira por tiempo.
// Sin almacenamiento disponible solo se recarga una vez por carga de documento
// (bandera en memoria).
const KEY = "app-update-attempt";
const HISTORY_KEY = "app-update-attempts";
export const RELOAD_WINDOW_MS = 10 * 60 * 1000;
export const MAX_RELOADS = 2;

let reloadedInThisDocument = false;

/** Indirección para poder simular la navegación en pruebas. */
export const navigation = {
  // replace evita añadir entradas al historial del navegador.
  reload: () => window.location.replace(window.location.href),
  assign: (url) => window.location.replace(url),
};

function getStorage() {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage || null;
  } catch {
    return null;
  }
}

export function readAttempt() {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const data = JSON.parse(storage.getItem(KEY));
    if (data && typeof data.target === "string" && Number.isFinite(data.at)) return data;
  } catch {
    // almacenamiento bloqueado o contenido inválido
  }
  return null;
}

/** Marcas de tiempo de recargas dentro de la ventana. */
export function readRecentReloads(now = Date.now()) {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const data = JSON.parse(storage.getItem(HISTORY_KEY));
    if (data && Array.isArray(data.at)) {
      return data.at.filter(
        (t) => Number.isFinite(t) && now - t < RELOAD_WINDOW_MS && now - t >= 0,
      );
    }
  } catch {
    // almacenamiento bloqueado o contenido inválido
  }
  return [];
}

/** true si ya hubo demasiadas recargas por actualización en la ventana. */
export function reloadLimitReached(now = Date.now()) {
  return readRecentReloads(now).length >= MAX_RELOADS;
}

export function canAttemptReload(target, now = Date.now()) {
  if (typeof window === "undefined" || !target) return false;
  if (reloadedInThisDocument) return false;
  if (reloadLimitReached(now)) return false;
  const attempt = readAttempt();
  if (attempt && attempt.target === target && now - attempt.at < RELOAD_WINDOW_MS) return false;
  return true;
}

export function recordAttempt(target, now = Date.now()) {
  reloadedInThisDocument = true;
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(KEY, JSON.stringify({ target, at: now }));
    storage.setItem(HISTORY_KEY, JSON.stringify({ at: [...readRecentReloads(now), now] }));
  } catch {
    // sin almacenamiento: solo queda la bandera en memoria
  }
}

/**
 * Tras cargar el documento: true si un intento reciente apuntaba a una
 * identidad distinta de la que corre (el servidor o la caché siguen desfasados).
 * Si coincide, el intento se da por exitoso, pero el historial se conserva.
 */
export function updateFailedAfterReload(current, now = Date.now()) {
  const attempt = readAttempt();
  if (!attempt || !current) return false;
  if (attempt.target === current) {
    try {
      getStorage()?.removeItem(KEY);
    } catch {
      // ignorar
    }
    return false;
  }
  return now - attempt.at < RELOAD_WINDOW_MS && now - attempt.at >= 0;
}

/** Recarga respetando el anti-bucle. Devuelve false si estaba bloqueada. */
export function reloadForUpdate(target, destination) {
  if (!canAttemptReload(target)) return false;
  recordAttempt(target);
  if (destination) navigation.assign(destination);
  else navigation.reload();
  return true;
}

/** Solo para pruebas: simula un documento nuevo (sessionStorage se conserva). */
export function simulateNewDocument() {
  reloadedInThisDocument = false;
}

/** Solo para pruebas. */
export function resetUpdateGuard() {
  reloadedInThisDocument = false;
  try {
    getStorage()?.removeItem(KEY);
    getStorage()?.removeItem(HISTORY_KEY);
  } catch {
    // ignorar
  }
}
