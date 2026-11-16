import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearSession,
  getSession,
  getToken,
  notifyUnauthorized,
  onUnauthorized,
  setSession,
  updateUser,
} from "./session";

const user = { id: 1, username: "demo" };
beforeEach(() => window.sessionStorage.clear());
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("session", () => {
  it("guarda y lee la sesión", () => {
    setSession({ token: "t-fake", expires_in: 60, user });
    expect(getToken()).toBe("t-fake");
    expect(getSession().user).toEqual(user);
  });
  it("expira y limpia", () => {
    vi.useFakeTimers();
    setSession({ token: "t-fake", expires_in: 10, user });
    vi.advanceTimersByTime(11000);
    expect(getToken()).toBeNull();
    expect(getSession()).toBeNull();
  });
  it("la expiración local notifica una sola vez", () => {
    vi.useFakeTimers();
    const cb = vi.fn();
    const off = onUnauthorized(cb);
    setSession({ token: "t-fake", expires_in: 10, user });
    vi.advanceTimersByTime(11000);
    expect(getToken()).toBeNull();
    expect(getToken()).toBeNull();
    expect(cb).toHaveBeenCalledTimes(1);
    off();
  });
  it("updateUser conserva el token", () => {
    setSession({ token: "t-fake", expires_in: 60, user });
    updateUser({ ...user, name: "X" });
    expect(getToken()).toBe("t-fake");
    expect(getSession().user.name).toBe("X");
  });
  it("clearSession borra", () => {
    setSession({ token: "t-fake", expires_in: 60, user });
    clearSession();
    expect(getToken()).toBeNull();
  });
  it("JSON corrupto devuelve null", () => {
    window.sessionStorage.setItem("bn.session", "{no");
    expect(getSession()).toBeNull();
  });
  it("tolera sessionStorage que lanza", () => {
    const boom = () => {
      throw new Error("x");
    };
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(boom);
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(boom);
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(boom);
    expect(() => setSession({ token: "t", expires_in: 1, user })).not.toThrow();
    expect(getToken()).toBeNull();
    expect(() => clearSession()).not.toThrow();
  });
  it("es seguro sin window", () => {
    vi.stubGlobal("window", undefined);
    expect(getToken()).toBeNull();
    expect(() => setSession({ token: "t", expires_in: 1, user })).not.toThrow();
    expect(() => clearSession()).not.toThrow();
  });
  it("onUnauthorized notifica y se puede cancelar", () => {
    const cb = vi.fn();
    const off = onUnauthorized(cb);
    notifyUnauthorized();
    off();
    notifyUnauthorized();
    expect(cb).toHaveBeenCalledTimes(1);
  });
});
