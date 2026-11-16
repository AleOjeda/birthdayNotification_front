// Actualización de versión integrada: router REAL + App (root.tsx) + Login/RootLayout reales.
// Solo fetch (servidor falso con /version.json) y navigation.reload/assign están simulados.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider } from "react-router";

const CURRENT = "2.0.0+2026-11-16T10:00:00.000Z+abc1234";
const NEW_A = "2.0.0+2026-11-16T12:00:00.000Z+def5678";
const NEW_B = "2.0.0+2026-11-16T13:00:00.000Z+0123abc";

vi.mock("../lib/version", async (importOriginal) => ({
  ...(await importOriginal()),
  APP_VERSION: "2.0.0",
  BUILD_DATE: "2026-11-16",
  BUILD_ID: "abc1234",
  BUILD_TIME: "2026-11-16T10:00:00.000Z",
  APP_IDENTITY: "2.0.0+2026-11-16T10:00:00.000Z+abc1234",
}));

import { fakeServer, makeRouter, settled } from "../test/appRouter";
import { navigation, resetUpdateGuard, simulateNewDocument } from "../lib/updateGuard";
import { resetUnsavedChanges } from "../lib/unsavedChanges";
import { setSession } from "../lib/session";

const EXPECTED_VERSION = "v2.0.0 · build 2026-11-16 UTC · abc1234";
let remote;
let server;
let reload;
let versionResponse;

function boot(handlers = {}) {
  server = fakeServer({
    "GET /version.json": async () => versionResponse(),
    "GET /api/customers/birthdays/today": { body: [] },
    "GET /api/customers/birthdays/week": { body: [] },
    ...handlers,
  });
  vi.stubGlobal("fetch", server);
}
async function mount(path) {
  const router = await makeRouter([path]);
  render(<RouterProvider router={router} />);
  await waitFor(() => expect(settled(router)).toBe(true));
  return router;
}
const versionCalls = () => server.calls.filter((c) => c.path === "/version.json");
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 30)); });
const focusWindow = async () => {
  act(() => { window.dispatchEvent(new Event("focus")); });
  await flush();
};

beforeEach(() => {
  remote = CURRENT;
  versionResponse = () => ({ body: { identity: remote } });
  reload = vi.spyOn(navigation, "reload").mockImplementation(() => {});
  vi.spyOn(navigation, "assign").mockImplementation(() => {});
  window.sessionStorage.clear();
  resetUpdateGuard();
  resetUnsavedChanges();
  window.matchMedia ??= () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  boot();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.sessionStorage.clear();
});

describe("AppVersion visible", () => {
  it("en el Login (en el flujo, una vez) con el formato de versión", async () => {
    await mount("/login");
    const v = await screen.findAllByTestId("app-version");
    expect(v).toHaveLength(1);
    expect(v[0]).toHaveTextContent(EXPECTED_VERSION);
  });

  it("en ambos Drawers (permanente y móvil) del layout protegido", async () => {
    setSession({ token: "t-fake", expires_in: 600, user: { id: 1, name: "Ana", must_change_password: false } });
    await mount("/dashboard");
    const v = await screen.findAllByTestId("app-version");
    expect(v).toHaveLength(2);
    v.forEach((el) => expect(el).toHaveTextContent(EXPECTED_VERSION));
  });
});

describe("detección de versión (integrada)", () => {
  it("identidad igual: consulta /version.json y no recarga ni avisa", async () => {
    await mount("/login");
    await focusWindow();
    expect(versionCalls().length).toBeGreaterThan(0);
    expect(reload).not.toHaveBeenCalled();
    expect(screen.queryByText(/versión nueva/i)).not.toBeInTheDocument();
  });

  it.each([
    ["HTML con 200", () => ({ status: 200, body: undefined })],
    ["404", () => ({ status: 404, body: { error: "no" } })],
    ["500", () => ({ status: 500, body: undefined })],
    ["JSON de otro tipo", () => ({ body: ["x"] })],
    ["identity inválida", () => ({ body: { identity: "<b>x</b>" } })],
    ["identity demasiado larga", () => ({ body: { identity: "a".repeat(201) } })],
  ])("%s: no recarga, no avisa y la app sigue usable", async (_n, make) => {
    versionResponse = make;
    await mount("/login");
    await focusWindow();
    expect(versionCalls().length).toBeGreaterThan(0);
    expect(reload).not.toHaveBeenCalled();
    expect(screen.queryByText(/versión nueva|No se pudo actualizar/i)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Iniciar sesión" })).toBeInTheDocument();
  });

  it("la consulta de versión no envía Authorization aunque haya sesión; la API sí", async () => {
    setSession({ token: "t-secreto-fake", expires_in: 600, user: { id: 1, name: "Ana", must_change_password: false } });
    await mount("/dashboard");
    await focusWindow();
    expect(versionCalls().length).toBeGreaterThan(0);
    versionCalls().forEach((c) => expect(c.headers.Authorization).toBeUndefined());
    await waitFor(() => expect(server.calls.some((c) => c.path === "/api/customers/birthdays/today")).toBe(true));
    expect(server.calls.find((c) => c.path === "/api/customers/birthdays/today").headers.Authorization)
      .toBe("Bearer t-secreto-fake");
  });

  it("versión nueva y sin trabajo en curso: recarga una vez", async () => {
    remote = NEW_A;
    await mount("/login");
    await focusWindow();
    expect(reload).toHaveBeenCalledTimes(1);
    await focusWindow(); // el mismo documento no recarga dos veces
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("con el formulario de login escrito la recarga se aplaza, avisa, y se hace al vaciarlo", async () => {
    remote = NEW_A;
    const u = userEvent.setup({ delay: null });
    await mount("/login");
    await u.type(await screen.findByLabelText(/usuario o correo/i), "ana");
    await focusWindow();
    expect(reload).not.toHaveBeenCalled();
    expect(await screen.findByText("Hay una versión nueva de la app.")).toBeInTheDocument();
    await u.clear(screen.getByLabelText(/usuario o correo/i));
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
  });

  it("'Actualizar ahora' recarga aun con trabajo en curso", async () => {
    remote = NEW_A;
    const u = userEvent.setup({ delay: null });
    await mount("/login");
    await u.type(await screen.findByLabelText(/usuario o correo/i), "ana");
    await focusWindow();
    fireEvent.click(await screen.findByRole("button", { name: "Actualizar ahora" }));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("anti-bucle con objetivos alternos: a la 3.ª recarga en 10 min no recarga y avisa del fallo", async () => {
    await mount("/login");
    remote = NEW_A;
    await focusWindow();
    expect(reload).toHaveBeenCalledTimes(1);
    simulateNewDocument();
    remote = NEW_B;
    await focusWindow();
    expect(reload).toHaveBeenCalledTimes(2);
    simulateNewDocument();
    remote = NEW_A; // alterna: ni el objetivo repetido ni uno nuevo recargan más
    await focusWindow();
    expect(reload).toHaveBeenCalledTimes(2);
    expect(await screen.findByText(/No se pudo actualizar/)).toBeInTheDocument();
    simulateNewDocument();
    remote = "2.0.0+2026-11-16T14:00:00.000Z+ffff000";
    await focusWindow();
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it("tras una recarga con la identidad aún desfasada, al montar avisa y no vuelve a recargar", async () => {
    window.sessionStorage.setItem("app-update-attempt", JSON.stringify({ target: NEW_A, at: Date.now() - 1000 }));
    remote = NEW_A;
    await mount("/login");
    expect(await screen.findByText(/No se pudo actualizar/)).toBeInTheDocument();
    await focusWindow();
    expect(reload).not.toHaveBeenCalled();
  });
});
