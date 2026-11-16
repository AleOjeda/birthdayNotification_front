import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { logout } from "../api/auth";
import {
  beginManualLogout,
  clearSession,
  consumeExpiredNotice,
  getSession,
  getToken,
  notifyUnauthorized,
  onMustChangePassword,
  onUnauthorized,
} from "./session";
import { loginUrl } from "./guard";

export const MAX_TIMEOUT_MS = 2_000_000_000; // < 2^31-1 (~24,8 días)
export const EXPIRED_MESSAGE = "Tu sesión expiró. Inicia sesión de nuevo.";

/** Notifica unauthorized al vencer la sesión; se cancela al desmontar o cambiar de sesión. */
export function useSessionExpiry(expiresAt) {
  useEffect(() => {
    if (typeof expiresAt !== "number") return undefined;
    let id;
    const arm = () => {
      const remaining = expiresAt - Date.now();
      if (remaining > MAX_TIMEOUT_MS) {
        id = setTimeout(arm, MAX_TIMEOUT_MS);
        return;
      }
      id = setTimeout(() => {
        if (getSession()) {
          clearSession();
          notifyUnauthorized();
        }
      }, Math.max(0, remaining));
    };
    arm();
    return () => clearTimeout(id);
  }, [expiresAt]);
}

/** Suscripciones globales (raíz). Devuelve el aviso a mostrar y cómo cerrarlo. */
export function useSessionEvents() {
  const navigate = useNavigate();
  const location = useLocation();
  // El texto se conserva al cerrar para que la animación de salida no muestre un Alert vacío.
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const pathRef = useRef(location.pathname);
  const redirecting = useRef(false);
  const hereRef = useRef(location.pathname + location.search);

  useEffect(() => {
    pathRef.current = location.pathname;
    hereRef.current = location.pathname + location.search;
    redirecting.current = false;
  }, [location.pathname, location.search]);

  // Al llegar a una ruta autenticada con sesión vigente, el aviso ya no aplica.
  useEffect(() => {
    if (location.pathname !== "/login" && getSession()) setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    // Una sola redirección a /login aunque lleguen varios eventos. El aviso
    // solo sale si hubo sesión real y no fue un cierre manual.
    const goToLogin = () => {
      if (pathRef.current === "/login" || redirecting.current) return;
      redirecting.current = true;
      if (consumeExpiredNotice()) {
        setMessage(EXPIRED_MESSAGE);
        setOpen(true);
      }
      navigate(loginUrl(hereRef.current), { replace: true });
    };
    const offUnauthorized = onUnauthorized(goToLogin);
    const offMustChange = onMustChangePassword(() => {
      if (pathRef.current === "/cambiar-contrasena" || redirecting.current) return;
      redirecting.current = true;
      navigate("/cambiar-contrasena", { replace: true });
    });
    // bfcache: al restaurar la página no se re-ejecutan loaders; revalida la sesión.
    const onPageShow = (event) => {
      if (event.persisted && pathRef.current !== "/login" && !getToken()) goToLogin();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => {
      offUnauthorized();
      offMustChange();
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [navigate]);

  return {
    notice: open ? message : null,
    message,
    open,
    closeNotice: useCallback(() => setOpen(false), []),
  };
}

/** Usuario/expiración de la sesión actual (solo cliente) y cierre de sesión. */
export function useSessionBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [session, setSessionState] = useState(() => getSession());
  const [loggingOut, setLoggingOut] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    setSessionState(getSession());
  }, [pathname]);

  useSessionExpiry(session?.expiresAt);

  const doLogout = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    beginManualLogout();
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setSessionState(null);
      navigate("/login", { replace: true });
      busy.current = false;
      setLoggingOut(false);
    }
  }, [navigate]);

  const user = session?.user ?? null;
  return {
    userName: user?.name || user?.username || "",
    loggingOut,
    logout: doLogout,
  };
}
