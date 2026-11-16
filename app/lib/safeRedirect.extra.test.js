import { describe, expect, it } from "vitest";
import { safeNextPath } from "./safeRedirect";

const FALLBACK = "/dashboard";

describe("safeNextPath: casos extra", () => {
  it.each([
    ["javascript:alert(1)", "javascript:alert(1)"],
    ["data:text/html,x", "data:text/html,x"],
    ["/\\evil.com", "barra invertida tras /"],
    ["/%5cevil.com", "barra invertida codificada"],
    ["/%5Cevil.com", "barra invertida codificada (mayúscula)"],
    ["/%2f%2fevil.com", "// codificado"],
    ["/%2F/evil.com", "/ y // mezclados"],
    ["/%252F%252Fevil.com", "// doblemente codificado"],
    ["/%00", "NUL codificado"],
    ["/a%0d%0ab", "CRLF codificado"],
    ["/a\r\nb", "CRLF literal"],
    ["/a\tb", "tabulador"],
    ["/\u0000x", "NUL literal"],
    ["/\u007fx", "DEL"],
    ["/a b://c", "esquema embebido"],
    ["/redirect?u=https://evil.com", "URL absoluta en query (contiene ://)"],
    ["/ok#https://evil.com", "URL absoluta en hash (contiene ://)"],
    ["http:evil.com", "esquema sin barras"],
    [" /list", "espacio al inicio"],
    ["\t/list", "tab al inicio"],
    ["", "vacío"],
    ["   ", "solo espacios"],
    [0, "número"],
    [{}, "objeto"],
    [["/list"], "array"],
    [true, "booleano"],
    ["/%E0%A4%A", "UTF-8 truncado"],
  ])("rechaza %j (%s)", (value) => expect(safeNextPath(value)).toBe(FALLBACK));

  it.each([
    "/login",
    "/LOGIN",
    "/login/",
    "/login//",
    "/login?next=%2Flist",
    "/login#frag",
    "/cambiar-contrasena/",
    "/cambiar-contrasena?x=1",
    "/CAMBIAR-CONTRASENA",
    "/a/b/../../login",
    "/a/./../login",
    "/%252e%252e/login",
    "/%2e%2e/login",
    "/list/../login",
    "/x/%2E%2E/%2E%2E/cambiar-contrasena",
  ])("rechaza el destino bloqueado %s", (value) => expect(safeNextPath(value)).toBe(FALLBACK));

  it.each(["/", "/dashboard", "/list?page=2#fin", "/calendar?month=2026-11", "/register", "/%C3%B1andu", "/a%20b?c=d%26e"])(
    "acepta y devuelve intacto %s",
    (value) => expect(safeNextPath(value)).toBe(value),
  );

  it("acepta rutas con parecidos engañosos a las bloqueadas", () => {
    for (const p of ["/login-help", "/logins", "/api/login", "/a/login", "/cambiar-contrasena2", "/loginx/login"]) {
      expect(safeNextPath(p)).toBe(p);
    }
  });

  it("el fallback se devuelve tal cual (null incluido)", () => {
    expect(safeNextPath("//x", null)).toBeNull();
    expect(safeNextPath(undefined, "/list")).toBe("/list");
    expect(safeNextPath("/login", "/otra")).toBe("/otra");
  });

  it("una cadena larguísima de codificaciones no cuelga ni se acepta", () => {
    expect(safeNextPath(`/${"%25".repeat(200)}6cogin`)).toBe(FALLBACK);
    expect(safeNextPath(`/${"a".repeat(100000)}`)).toBe(`/${"a".repeat(100000)}`);
  });

  it("no tiene estado: llamadas repetidas dan el mismo resultado", () => {
    for (let i = 0; i < 3; i += 1) {
      expect(safeNextPath("/%6cogin")).toBe(FALLBACK);
      expect(safeNextPath("/list")).toBe("/list");
    }
  });
});
