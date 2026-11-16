// Flujo de sesión integrado: router REAL (routes.ts + loaders), capa app/api/* REAL,
// solo `fetch` stubbeado con un servidor falso. Datos y tokens de prueba aleatorios.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider } from "react-router";
import { fakeServer, makeRouter, settled, where } from "../test/appRouter";
import { getSession, setSession } from "../lib/session";
import { resetUnsavedChanges } from "../lib/unsavedChanges";

const rand = () => `t-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
const user = (over = {}) => ({ id: 7, name: "Ana", username: "ana", email: null, must_change_password: false, ...over });
const grant = (token, u = user()) => ({ token, token_type: "Bearer", expires_in: 3600, user: u });
const authOf = (c) => c.headers.Authorization;
const wait = (ms) => act(async () => { await new Promise((r) => setTimeout(r, ms)); });

let server;
const install = (handlers) => {
  server = fakeServer(handlers);
  vi.stubGlobal("fetch", server);
};
const callsTo = (method, path) => server.calls.filter((c) => c.method === method && c.path === path);
async function mount(path) {
  const router = await makeRouter([path]);
  render(<RouterProvider router={router} />);
  await waitFor(() => expect(settled(router)).toBe(true));
  return router;
}
function track(router) {
  const visited = [];
  router.subscribe((s) => {
    const here = s.location.pathname + s.location.search;
    if (s.navigation.state === "idle" && visited.at(-1) !== here) visited.push(here);
  });
  return visited;
}
const typeLogin = async (u, id, pwd) => {
  await u.type(await screen.findByLabelText(/usuario o correo/i), id);
  await u.type(screen.getByLabelText(/^contraseña/i), pwd);
  await u.click(screen.getByRole("button", { name: "Ingresar" }));
};
const dashboardApi = {
  "GET /api/customers/birthdays/today": { body: [] },
  "GET /api/customers/birthdays/week": { body: [] },
};

beforeEach(() => {
  window.sessionStorage.clear();
  resetUnsavedChanges();
  window.matchMedia ??= () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
});
afterEach(() => {
  vi.unstubAllGlobals();
  window.sessionStorage.clear();
});

describe("login exitoso", () => {
  it("guarda la sesión, va al destino ?next= y envía Authorization solo en customers", async () => {
    const token = rand();
    install({
      "POST /api/auth/login": { body: grant(token) },
      "GET /api/customers": { body: [] },
    });
    const u = userEvent.setup({ delay: null });
    const router = await mount("/login?next=%2Flist");
    const pwd = rand();
    await typeLogin(u, "ana", pwd);
    await waitFor(() => expect(where(router)).toBe("/list"));

    expect(callsTo("POST", "/api/auth/login")[0].body).toEqual({ identifier: "ana", password: pwd });
    expect(authOf(callsTo("POST", "/api/auth/login")[0])).toBeUndefined();
    await waitFor(() => expect(callsTo("GET", "/api/customers").length).toBeGreaterThan(0));
    expect(authOf(callsTo("GET", "/api/customers")[0])).toBe(`Bearer ${token}`);
    expect(getSession()).toMatchObject({ token, user: { username: "ana" } });
    expect(window.sessionStorage.getItem("bn.session")).not.toContain(pwd);
    expect(document.body.innerHTML).not.toContain(token);
  });

  it("sin next va a /dashboard y los endpoints de hoy/semana llevan el Bearer", async () => {
    const token = rand();
    install({ "POST /api/auth/login": { body: grant(token) }, ...dashboardApi });
    const u = userEvent.setup({ delay: null });
    const router = await mount("/login");
    await typeLogin(u, "ANA", rand());
    await waitFor(() => expect(where(router)).toBe("/dashboard"));
    await waitFor(() => expect(callsTo("GET", "/api/customers/birthdays/week")).toHaveLength(1));
    for (const p of ["today", "week"]) {
      expect(authOf(callsTo("GET", `/api/customers/birthdays/${p}`)[0])).toBe(`Bearer ${token}`);
    }
  });

  it("next malicioso (//evil.com) se ignora y va a /dashboard", async () => {
    install({ "POST /api/auth/login": { body: grant(rand()) }, ...dashboardApi });
    const u = userEvent.setup({ delay: null });
    const router = await mount("/login?next=%2F%2Fevil.com");
    await typeLogin(u, "ana", rand());
    await waitFor(() => expect(where(router)).toBe("/dashboard"));
  });

  it("credenciales inválidas: muestra error, sin sesión y sigue en /login", async () => {
    install({ "POST /api/auth/login": { status: 401, body: { error: "Credenciales inválidas" } } });
    const u = userEvent.setup({ delay: null });
    const router = await mount("/login");
    await typeLogin(u, "ana", rand());
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(where(router)).toBe("/login");
    expect(getSession()).toBeNull();
  });
});

describe("401 No autorizado", () => {
  it("limpia la sesión y redirige a /login?next= UNA sola vez aunque fallen varias peticiones", async () => {
    install({
      "GET /api/customers/birthdays/today": { status: 401, body: { error: "No autorizado" } },
      "GET /api/customers/birthdays/week": { status: 401, body: { error: "No autorizado" } },
    });
    setSession(grant(rand()));
    const tokenBefore = getSession().token;
    const router = await makeRouter(["/dashboard"]);
    const visited = track(router);
    render(<RouterProvider router={router} />);
    await waitFor(() => expect(where(router)).toBe("/login?next=%2Fdashboard"));
    await wait(150);
    expect(getSession()).toBeNull();
    expect(window.sessionStorage.getItem("bn.session")).toBeNull();
    expect(visited.filter((v) => v.startsWith("/login"))).toEqual(["/login?next=%2Fdashboard"]);
    expect(callsTo("GET", "/api/customers/birthdays/today")[0].headers.Authorization).toBe(`Bearer ${tokenBefore}`);
    expect(await screen.findByText(/sesión expiró/i)).toBeInTheDocument();
  });

  it("tras el 401 un nuevo login funciona y vuelve a la ruta original", async () => {
    let fail = true;
    const token = rand();
    install({
      "GET /api/customers": () => (fail ? { status: 401, body: { error: "No autorizado" } } : { body: [] }),
      "POST /api/auth/login": { body: grant(token) },
    });
    setSession(grant(rand()));
    const router = await mount("/list");
    await waitFor(() => expect(where(router)).toBe("/login?next=%2Flist"));
    fail = false;
    const u = userEvent.setup({ delay: null });
    await typeLogin(u, "ana", rand());
    await waitFor(() => expect(where(router)).toBe("/list"));
    expect(getSession().token).toBe(token);
  });

  it("un 401 con otro mensaje (Credenciales inválidas) NO cierra la sesión", async () => {
    install({ "GET /api/customers": { status: 401, body: { error: "Credenciales inválidas" } } });
    setSession(grant(rand()));
    const router = await mount("/list");
    await wait(100);
    expect(where(router)).toBe("/list");
    expect(getSession()).not.toBeNull();
  });
});

describe("cambio de contraseña obligatorio", () => {
  it("login con must_change_password => /cambiar-contrasena; tras cambiar => /dashboard con el token nuevo", async () => {
    const t1 = rand();
    const t2 = rand();
    install({
      "POST /api/auth/login": { body: grant(t1, user({ must_change_password: true })) },
      "POST /api/auth/change-password": { body: grant(t2, user({ must_change_password: false })) },
      ...dashboardApi,
    });
    const u = userEvent.setup({ delay: null });
    const router = await mount("/login?next=%2Flist");
    const current = rand();
    await typeLogin(u, "ana", current);
    await waitFor(() => expect(where(router)).toBe("/cambiar-contrasena"));
    // mientras debe cambiar, las rutas protegidas lo devuelven aquí
    await act(async () => { await router.navigate("/dashboard"); });
    expect(where(router)).toBe("/cambiar-contrasena");

    const next = `${rand()}${rand()}`;
    await u.type(await screen.findByLabelText(/^contraseña actual/i), current);
    await u.type(screen.getByLabelText(/^nueva contraseña/i), next);
    await u.type(screen.getByLabelText(/^repetir nueva/i), next);
    await u.click(screen.getByRole("button", { name: "Cambiar contraseña" }));
    await waitFor(() => expect(where(router)).toBe("/dashboard"), { timeout: 4000 });

    const change = callsTo("POST", "/api/auth/change-password")[0];
    expect(change.body).toEqual({ currentPassword: current, newPassword: next });
    expect(authOf(change)).toBe(`Bearer ${t1}`);
    expect(getSession()).toMatchObject({ token: t2, user: { must_change_password: false } });
    await waitFor(() => expect(callsTo("GET", "/api/customers/birthdays/today").length).toBeGreaterThan(0));
    expect(authOf(callsTo("GET", "/api/customers/birthdays/today")[0])).toBe(`Bearer ${t2}`);
    expect(window.sessionStorage.getItem("bn.session")).not.toContain(next);
  });

  it("403 del backend (Debe cambiar su contraseña) lleva a /cambiar-contrasena una vez y sin cerrar sesión", async () => {
    const blocked = { status: 403, body: { error: "Debe cambiar su contraseña" } };
    install({
      "GET /api/customers/birthdays/today": blocked,
      "GET /api/customers/birthdays/week": blocked,
    });
    // el cliente cree que no debe cambiar (estado desfasado); el backend manda
    setSession(grant(rand(), user({ must_change_password: false })));
    const router = await makeRouter(["/dashboard"]);
    const visited = track(router);
    render(<RouterProvider router={router} />);
    await waitFor(() => expect(where(router)).toBe("/cambiar-contrasena"));
    await wait(100);
    expect(visited.filter((v) => v === "/cambiar-contrasena")).toHaveLength(1);
    expect(getSession()).not.toBeNull();
  });

  it("change-password con 'Credenciales inválidas' mantiene sesión y muestra el error", async () => {
    install({ "POST /api/auth/change-password": { status: 401, body: { error: "Credenciales inválidas" } } });
    setSession(grant(rand(), user({ must_change_password: true })));
    const u = userEvent.setup({ delay: null });
    const router = await mount("/cambiar-contrasena");
    const next = `${rand()}${rand()}`;
    await u.type(await screen.findByLabelText(/^contraseña actual/i), rand());
    await u.type(screen.getByLabelText(/^nueva contraseña/i), next);
    await u.type(screen.getByLabelText(/^repetir nueva/i), next);
    await u.click(screen.getByRole("button", { name: "Cambiar contraseña" }));
    expect(await screen.findByText("Credenciales inválidas")).toBeInTheDocument();
    expect(where(router)).toBe("/cambiar-contrasena");
    expect(getSession()).not.toBeNull();
  });
});

describe("logout", () => {
  it("llama a /api/auth/logout con el Bearer, limpia la sesión, va a /login y no muestra 'sesión expiró'", async () => {
    const token = rand();
    install({ "POST /api/auth/logout": { status: 204 }, ...dashboardApi });
    setSession(grant(token));
    const router = await mount("/dashboard");
    fireEvent.click((await screen.findAllByRole("button", { name: "Cerrar sesión" }))[0]);
    await waitFor(() => expect(where(router)).toBe("/login"));
    expect(authOf(callsTo("POST", "/api/auth/logout")[0])).toBe(`Bearer ${token}`);
    expect(getSession()).toBeNull();
    expect(screen.queryByText(/sesión expiró/i)).not.toBeInTheDocument();
    // la ruta protegida ya no es accesible
    await act(async () => { await router.navigate("/list"); });
    expect(where(router)).toBe("/login?next=%2Flist");
  });

  it("si el logout falla por red igualmente se cierra la sesión local", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url, init) => {
      if (init?.method === "POST") throw new TypeError("Failed to fetch");
      return { ok: true, status: 200, json: async () => [] };
    }));
    setSession(grant(rand()));
    const router = await mount("/dashboard");
    fireEvent.click((await screen.findAllByRole("button", { name: "Cerrar sesión" }))[0]);
    await waitFor(() => expect(where(router)).toBe("/login"));
    expect(getSession()).toBeNull();
  });

  it("logout con 401 del servidor no provoca segunda redirección ni aviso de expiración", async () => {
    install({ "POST /api/auth/logout": { status: 401, body: { error: "No autorizado" } }, ...dashboardApi });
    setSession(grant(rand()));
    const router = await makeRouter(["/dashboard"]);
    const visited = track(router);
    render(<RouterProvider router={router} />);
    await waitFor(() => expect(settled(router)).toBe(true));
    fireEvent.click((await screen.findAllByRole("button", { name: "Cerrar sesión" }))[0]);
    await waitFor(() => expect(where(router)).toBe("/login"));
    await wait(100);
    expect(visited.filter((v) => v.startsWith("/login"))).toEqual(["/login"]);
    expect(screen.queryByText(/sesión expiró/i)).not.toBeInTheDocument();
  });
});
