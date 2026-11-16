import { describe, expect, it } from "vitest";
import { safeNextPath } from "./safeRedirect";

describe("safeNextPath", () => {
  it("acepta rutas internas", () => expect(safeNextPath("/list?a=1")).toBe("/list?a=1"));
  it.each(["//evil.com", "https://x", "/a://b", "/a\b", "list", "", null, undefined, "/\n//x"])(
    "rechaza %s",
    (v) => expect(safeNextPath(v)).toBe("/dashboard"),
  );
  it.each([
    "/login",
    "/login?next=/list",
    "/cambiar-contrasena",
    "/login/",
    "/login#x",
    "/Login",
    "/LOGIN?a",
    "/a/../login",
    "/./login",
    "/%6cogin",
    "/%6Cogin",
    "/Cambiar-Contrasena",
    "/%2e/login",
    "/a/%2E%2e/login",
    "/login/.",
    "/%256cogin",
    "/%2525256cogin",
  ])("rechaza %s para evitar bucles", (v) => expect(safeNextPath(v)).toBe("/dashboard"));
  it.each(["/%2F/evil.com", "/%5Cevil", "/%0a/x", "/%zz"])(
    "rechaza codificaciones peligrosas o inválidas %s",
    (v) => expect(safeNextPath(v)).toBe("/dashboard"),
  );
  it.each(["/list", "/calendar?month=2026-11", "/a/../list", "/loginx", "/login/x", "/mi%20lista"])(
    "acepta ruta legítima %s",
    (v) => expect(safeNextPath(v)).toBe(v),
  );
  it("acepta rutas que solo empiezan como /login", () =>
    expect(safeNextPath("/loginx")).toBe("/loginx"));
  it("usa el fallback indicado", () => expect(safeNextPath("/Login", null)).toBeNull());
});
