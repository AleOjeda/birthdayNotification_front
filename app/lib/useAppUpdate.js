import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";
import { APP_IDENTITY } from "./version";
import { checkForNewVersion } from "./versionCheck";
import { hasUnsavedChanges, subscribeUnsavedChanges } from "./unsavedChanges";
import {
  navigation,
  recordAttempt,
  reloadForUpdate,
  updateFailedAfterReload,
} from "./updateGuard";

export const CHECK_INTERVAL_MS = 5 * 60 * 1000;
export const NAV_THROTTLE_MS = 60 * 1000;
export const MAX_JITTER_MS = 30 * 1000;
export const INITIAL_CHECK_MS = 10 * 1000;

/**
 * Tras un error de carga de módulo (ErrorBoundary): intenta actualizar.
 * true si recargó; false si no hay versión nueva o el anti-bucle lo impide.
 */
export async function recoverFromChunkError(current = APP_IDENTITY) {
  const target = await checkForNewVersion(current);
  return target ? reloadForUpdate(target) : false;
}

/** Recarga pedida por el usuario (siempre recarga). */
export function forceReload(target = "manual") {
  recordAttempt(target);
  navigation.reload();
}

/**
 * Detecta versiones nuevas y actualiza la app en un momento seguro.
 * status: "idle" | "available" (hay trabajo en curso; se avisa) | "failed".
 */
export function useAppUpdate({
  currentIdentity = APP_IDENTITY,
  intervalMs = CHECK_INTERVAL_MS,
  navThrottleMs = NAV_THROTTLE_MS,
  jitterMs,
  initialDelayMs = INITIAL_CHECK_MS,
} = {}) {
  const location = useLocation();
  const [status, setStatus] = useState("idle");
  const pending = useRef(null);
  const checking = useRef(false);
  const lastNavCheck = useRef(0);
  const prevRoute = useRef(location.pathname + location.search);
  const mounted = useRef(true);

  const tryReload = useCallback((target, destination) => {
    if (!reloadForUpdate(target, destination) && mounted.current) setStatus("failed");
  }, []);

  const onNewVersion = useCallback(
    (target) => {
      pending.current = target;
      if (hasUnsavedChanges()) {
        setStatus((s) => (s === "failed" ? s : "available"));
        return;
      }
      tryReload(target);
    },
    [tryReload],
  );

  const check = useCallback(async () => {
    if (!currentIdentity || checking.current) return;
    checking.current = true;
    try {
      const target = await checkForNewVersion(currentIdentity);
      if (target && mounted.current) onNewVersion(target);
    } finally {
      checking.current = false;
    }
  }, [currentIdentity, onNewVersion]);

  // Resultado de un intento anterior (anti-bucle: identidad aún desfasada).
  useEffect(() => {
    mounted.current = true;
    if (updateFailedAfterReload(currentIdentity)) setStatus("failed");
    return () => {
      mounted.current = false;
    };
  }, [currentIdentity]);

  // Volver a la pestaña, intervalo y errores de carga de módulos.
  useEffect(() => {
    if (typeof window === "undefined" || !currentIdentity) return undefined;
    const onVisibility = () => {
      if (document.visibilityState === "visible") check();
    };
    const onFocus = () => check();
    const onPreloadError = (event) => {
      event.preventDefault();
      check();
    };
    // Comprobación inicial diferida (no compite con la carga de la página).
    // initialDelayMs <= 0 la desactiva.
    const initial = initialDelayMs > 0 ? setTimeout(check, initialDelayMs) : undefined;
    const jitter = jitterMs ?? Math.random() * MAX_JITTER_MS;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") check();
    }, intervalMs + jitter);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    window.addEventListener("vite:preloadError", onPreloadError);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("vite:preloadError", onPreloadError);
    };
  }, [check, currentIdentity, intervalMs, jitterMs, initialDelayMs]);

  // Recarga automática cuando termina el trabajo en curso.
  useEffect(() => {
    let timer;
    const off = subscribeUnsavedChanges(() => {
      clearTimeout(timer);
      // Diferido: evita reaccionar a un desmontaje/remontaje transitorio.
      timer = setTimeout(() => {
        if (pending.current && !hasUnsavedChanges()) tryReload(pending.current);
      }, 0);
    });
    return () => {
      clearTimeout(timer);
      off();
    };
  }, [tryReload]);

  // Tras cada navegación de ruta.
  const route = location.pathname + location.search;
  useEffect(() => {
    if (prevRoute.current === route) return;
    prevRoute.current = route;
    if (pending.current) {
      if (!hasUnsavedChanges()) tryReload(pending.current, route + window.location.hash);
      return;
    }
    const now = Date.now();
    if (now - lastNavCheck.current < navThrottleMs) return;
    lastNavCheck.current = now;
    check();
  }, [route, check, tryReload, navThrottleMs]);

  const updateNow = useCallback(() => forceReload(pending.current || "manual"), []);
  const dismiss = useCallback(() => setStatus("idle"), []);
  return { status, updateNow, dismiss };
}
