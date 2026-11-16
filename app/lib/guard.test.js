import { beforeEach, describe, expect, it } from "vitest";
import { changePasswordLoader, guardLoader, indexLoader, loginUrl } from "./guard";
import { setSession } from "./session";

const req = (path) => ({ request: new Request(`http://localhost${path}`) });
const loc = (r) => r.headers.get("Location");
const start = (user) => setSession({ token: "t-fake", expires_in: 600, user });

beforeEach(() => window.sessionStorage.clear());

describe("guardLoader", () => {
  it("sin sesión redirige a /login con next seguro", () => {
    const r = guardLoader(req("/list?x=1"));
    expect(r.status).toBe(302);
    expect(loc(r)).toBe("/login?next=" + encodeURIComponent("/list?x=1"));
  });
  it("sin sesión en ruta no segura no incluye next", () => {
    expect(loc(guardLoader(req("/login")))).toBe("/login");
    expect(loc(guardLoader(req("//evil.com/x")))).toBe("/login");
  });
  it("con sesión ok pasa", () => {
    start({ id: 1 });
    expect(guardLoader(req("/dashboard"))).toBeNull();
  });
  it("con must_change_password va a /cambiar-contrasena", () => {
    start({ id: 1, must_change_password: true });
    expect(loc(guardLoader(req("/dashboard")))).toBe("/cambiar-contrasena");
  });
  it("sesión expirada redirige a login", () => {
    setSession({ token: "t-fake", expires_in: -5, user: {} });
    expect(loc(guardLoader(req("/calendar")))).toContain("/login?next=");
  });
});

describe("indexLoader", () => {
  it("sin sesión -> /login", () => expect(loc(indexLoader())).toBe("/login"));
  it("con sesión -> /dashboard", () => {
    start({ id: 1 });
    expect(loc(indexLoader())).toBe("/dashboard");
  });
  it("debe cambiar -> /cambiar-contrasena", () => {
    start({ id: 1, must_change_password: true });
    expect(loc(indexLoader())).toBe("/cambiar-contrasena");
  });
});

describe("changePasswordLoader", () => {
  it("sin sesión -> /login", () => {
    expect(loc(changePasswordLoader(req("/cambiar-contrasena")))).toBe("/login");
  });
  it("con sesión pasa", () => {
    start({ id: 1, must_change_password: true });
    expect(changePasswordLoader(req("/cambiar-contrasena"))).toBeNull();
  });
});

describe("loginUrl", () => {
  it("codifica next", () => expect(loginUrl("/a?b=c")).toBe("/login?next=%2Fa%3Fb%3Dc"));
});
