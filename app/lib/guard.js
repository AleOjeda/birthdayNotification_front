import { redirect } from "react-router";
import { getToken, getUser } from "./session";
import { safeNextPath } from "./safeRedirect";

export function loginUrl(path) {
  const next = safeNextPath(path, null);
  return next ? `/login?next=${encodeURIComponent(next)}` : "/login";
}

function hereOf(request) {
  const url = new URL(request.url);
  return url.pathname + url.search;
}

// Solo cliente: en el servidor no hay sesión y el HTML sale con HydrateFallback.
// Devuelve una Response de redirect o null si la sesión es válida y completa.
export function guardLoader({ request }) {
  if (!getToken()) return redirect(loginUrl(hereOf(request)));
  if (getUser()?.must_change_password) return redirect("/cambiar-contrasena");
  return null;
}
guardLoader.hydrate = true;

export function indexLoader() {
  if (!getToken()) return redirect("/login");
  return redirect(getUser()?.must_change_password ? "/cambiar-contrasena" : "/dashboard");
}
indexLoader.hydrate = true;

// /cambiar-contrasena: exige sesión (con o sin cambio obligatorio).
export function changePasswordLoader({ request }) {
  if (!getToken()) return redirect(loginUrl(hereOf(request)));
  return null;
}
changePasswordLoader.hydrate = true;
