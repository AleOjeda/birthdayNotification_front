import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { changePassword, getMe, login, logout } from "./auth";
import { getToken, getSession, setSession } from "../lib/session";

const res = (status, data) => ({
  ok: status < 400,
  status,
  json: async () => data,
  headers: { get: () => null },
});
const user = { id: 1, username: "demo", must_change_password: false };
beforeEach(() => window.sessionStorage.clear());
afterEach(() => vi.unstubAllGlobals());

describe("auth api", () => {
  it("login guarda la sesión y envía el cuerpo", async () => {
    const f = vi.fn().mockResolvedValue(res(200, { token: "t1", expires_in: 60, user }));
    vi.stubGlobal("fetch", f);
    await expect(login("demo", "pw-fake")).resolves.toEqual(user);
    expect(JSON.parse(f.mock.calls[0][1].body)).toEqual({
      identifier: "demo",
      password: "pw-fake",
    });
    expect(getToken()).toBe("t1");
  });
  it("login fallido no guarda sesión", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(res(401, { error: "Credenciales inválidas" })),
    );
    await expect(login("demo", "x")).rejects.toThrow("Credenciales inválidas");
    expect(getToken()).toBeNull();
  });
  it("getMe devuelve el usuario", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(res(200, { user })));
    await expect(getMe()).resolves.toEqual(user);
  });
  it("logout limpia aunque falle la red", async () => {
    setSession({ token: "t", expires_in: 60, user });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("net")));
    await expect(logout()).resolves.toBeUndefined();
    expect(getToken()).toBeNull();
  });
  it("logout limpia aunque responda 401", async () => {
    setSession({ token: "t", expires_in: 60, user });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(res(401, { error: "No autorizado" })));
    await logout();
    expect(getSession()).toBeNull();
  });
  it("changePassword guarda la sesión nueva", async () => {
    setSession({ token: "old", expires_in: 60, user });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(res(200, { token: "new", expires_in: 60, user })),
    );
    await changePassword("a-fake", "b-fake");
    expect(getToken()).toBe("new");
  });
});
