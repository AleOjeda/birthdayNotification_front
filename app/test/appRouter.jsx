// Construye el router de datos REAL a partir de app/routes.ts (mismos loaders, layouts y
// componentes de ruta que la app). Solo para pruebas de integración.
import routesConfig from "../routes";
import App from "../root";
import { createMemoryRouter } from "react-router";

const modules = import.meta.glob(["../routes/**/*.{jsx,tsx}", "!../routes/**/*.test.*"]);

async function toRoute(entry) {
  const mod = await modules[`../${entry.file}`]();
  const route = {
    id: entry.file,
    path: entry.path,
    index: entry.index,
    Component: mod.default,
    HydrateFallback: mod.HydrateFallback,
    loader: mod.clientLoader,
    shouldRevalidate: mod.shouldRevalidate,
  };
  if (entry.children) route.children = await Promise.all(entry.children.map(toRoute));
  return route;
}

export async function buildRoutes() {
  const children = await Promise.all(routesConfig.map(toRoute));
  return [{ id: "root", Component: App, children }];
}

export async function makeRouter(initialEntries) {
  return createMemoryRouter(await buildRoutes(), { initialEntries });
}

export const where = (router) => router.state.location.pathname + router.state.location.search;
export const settled = (router) => router.state.initialized && router.state.navigation.state === "idle";

/** Servidor falso: handlers por "METODO /ruta"; registra todas las llamadas. */
export function fakeServer(handlers) {
  const calls = [];
  const fn = async (url, init = {}) => {
    const path = new URL(url, "http://localhost").pathname;
    const method = (init.method || "GET").toUpperCase();
    const call = { method, path, headers: init.headers || {}, body: init.body ? JSON.parse(init.body) : undefined };
    calls.push(call);
    const h = handlers[`${method} ${path}`];
    if (!h) return { ok: false, status: 404, json: async () => ({ error: "Ruta no encontrada" }) };
    const { status = 200, body } = typeof h === "function" ? await h(call) : h;
    return {
      ok: status < 400,
      status,
      headers: { get: () => null },
      json: async () => {
        if (body === undefined) throw new SyntaxError("sin cuerpo");
        return body;
      },
    };
  };
  fn.calls = calls;
  return fn;
}
