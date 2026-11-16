// Guard con los loaders REALES de app/routes.ts: ninguna ruta protegida responde sin sesión.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { waitFor } from "@testing-library/react";
import routesConfig from "../routes";
import { makeRouter, settled, where } from "../test/appRouter";
import { setSession } from "../lib/session";

const PROTECTED = ["/dashboard", "/register", "/list", "/calendar"];
const PUBLIC_FILES = new Set(["routes/redirect.tsx", "routes/login/Login.jsx", "routes/changePassword/ChangePassword.jsx"]);
const open = async (path) => {
  const router = await makeRouter([path]);
  await waitFor(() => expect(settled(router)).toBe(true));
  return router;
};

beforeEach(() => window.sessionStorage.clear());
afterEach(() => window.sessionStorage.clear());

describe("guard de rutas (loaders reales)", () => {
  it.each(PROTECTED)("%s sin sesión redirige a /login?next=", async (path) => {
    const router = await open(path);
    expect(where(router)).toBe(`/login?next=${encodeURIComponent(path)}`);
  });

  it("conserva la query en next", async () => {
    const router = await open("/calendar?month=2026-11");
    expect(where(router)).toBe(`/login?next=${encodeURIComponent("/calendar?month=2026-11")}`);
  });

  it("sesión expirada (expiresAt pasado) se trata como sin sesión", async () => {
    setSession({ token: "t-fake", expires_in: -10, user: { id: 1, must_change_password: false } });
    const router = await open("/list");
    expect(where(router)).toBe("/login?next=%2Flist");
    expect(window.sessionStorage.getItem("bn.session")).toBeNull();
  });

  it.each(["{no-json", JSON.stringify({ user: {} }), JSON.stringify({ token: 5 }), "null"])(
    "sesión corrupta %s => login",
    async (raw) => {
      window.sessionStorage.setItem("bn.session", raw);
      expect(where(await open("/dashboard"))).toBe("/login?next=%2Fdashboard");
    },
  );

  it.each(PROTECTED)("%s con sesión válida NO redirige", async (path) => {
    setSession({ token: "t-fake", expires_in: 600, user: { id: 1, must_change_password: false } });
    expect(where(await open(path))).toBe(path);
  });

  it.each(PROTECTED)("%s con must_change_password => /cambiar-contrasena", async (path) => {
    setSession({ token: "t-fake", expires_in: 600, user: { id: 1, must_change_password: true } });
    expect(where(await open(path))).toBe("/cambiar-contrasena");
  });

  it("/cambiar-contrasena sin sesión => login; la raíz sin sesión => /login", async () => {
    expect(where(await open("/cambiar-contrasena"))).toBe("/login");
    expect(where(await open("/"))).toBe("/login");
  });

  it("raíz con sesión => /dashboard; con cambio obligatorio => /cambiar-contrasena", async () => {
    setSession({ token: "t-fake", expires_in: 600, user: { id: 1, must_change_password: false } });
    expect(where(await open("/"))).toBe("/dashboard");
    setSession({ token: "t-fake", expires_in: 600, user: { id: 1, must_change_password: true } });
    expect(where(await open("/"))).toBe("/cambiar-contrasena");
  });

  it("toda ruta declarada en routes.ts salvo index/login/cambiar-contrasena está bajo un layout protegido", () => {
    const top = routesConfig.filter((r) => !PUBLIC_FILES.has(r.file));
    // lo único permitido fuera de las públicas es un layout con hijos; sus hijos heredan el guard
    for (const r of top) expect(r.children?.length, `ruta ${r.path} fuera del layout`).toBeGreaterThan(0);
    const guarded = top.flatMap((r) => r.children.map((c) => `/${c.path}`)).sort();
    expect(guarded).toEqual([...PROTECTED].sort());
  });
});
