import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { request, ApiError, REQUEST_TIMEOUT_MS } from "./http";
import { logout } from "./auth";
import { hasUnsavedChanges } from "../lib/unsavedChanges";
import {
  getToken,
  onMustChangePassword,
  onUnauthorized,
  setSession,
} from "../lib/session";

const res = (status, data, headers = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => data,
  headers: { get: (k) => headers[k] ?? null },
});
const start = () => setSession({ token: "t-fake", expires_in: 600, user: { id: 1 } });

const offs = [];
const sub = (subscribe, cb) => offs.push(subscribe(cb));
beforeEach(() => window.sessionStorage.clear());
afterEach(() => {
  offs.splice(0).forEach((off) => off());
  vi.unstubAllGlobals();
});

describe("http request", () => {
  it("adjunta Bearer con sesión y no sin ella", async () => {
    const f = vi.fn().mockResolvedValue(res(200, {}));
    vi.stubGlobal("fetch", f);
    await request("/x");
    expect(f.mock.calls[0][1].headers).toBeUndefined();
    start();
    await request("/x");
    expect(f.mock.calls[1][1].headers.Authorization).toBe("Bearer t-fake");
  });
  it("401 No autorizado limpia y notifica una sola vez con varias peticiones", async () => {
    start();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(res(401, { error: "No autorizado" })));
    const cb = vi.fn();
    sub(onUnauthorized, cb);
    const results = await Promise.allSettled([request("/a"), request("/b"), request("/c")]);
    expect(
      results.every((r) => r.reason instanceof ApiError && r.reason.status === 401),
    ).toBe(true);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(getToken()).toBeNull();
  });
  it("401 Credenciales inválidas no cierra sesión", async () => {
    start();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(res(401, { error: "Credenciales inválidas" })),
    );
    const cb = vi.fn();
    sub(onUnauthorized, cb);
    await expect(request("/api/auth/login")).rejects.toThrow("Credenciales inválidas");
    expect(cb).not.toHaveBeenCalled();
    expect(getToken()).toBe("t-fake");
  });
  it("403 notifica cambio de contraseña", async () => {
    start();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(res(403, { error: "Debe cambiar su contraseña" })),
    );
    const cb = vi.fn();
    sub(onMustChangePassword, cb);
    await expect(request("/api/customers")).rejects.toMatchObject({ status: 403 });
    expect(cb).toHaveBeenCalledTimes(1);
    expect(getToken()).toBe("t-fake");
  });
  it("429 conserva mensaje y retryAfter", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        res(429, { error: "Demasiados intentos. Intente más tarde." }, { "Retry-After": "120" }),
      ),
    );
    await expect(request("/api/auth/login")).rejects.toMatchObject({
      status: 429,
      message: "Demasiados intentos. Intente más tarde.",
      retryAfter: 120,
    });
  });
  it("red caída lanza ApiError(0)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fail")));
    await expect(request("/x")).rejects.toMatchObject({ status: 0 });
  });
  it("401 sin token ni sesión notifica (no queda mudo)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(res(401, { error: "No autorizado" })));
    const cb = vi.fn();
    sub(onUnauthorized, cb);
    await expect(request("/a")).rejects.toBeInstanceOf(ApiError);
    expect(cb).toHaveBeenCalledTimes(1);
  });
  it("401 de un token viejo no cierra una sesión nueva (carrera)", async () => {
    start();
    let resolveFetch;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValue(new Promise((r) => (resolveFetch = r))),
    );
    const cb = vi.fn();
    sub(onUnauthorized, cb);
    const pending = request("/a");
    setSession({ token: "t-nuevo-fake", expires_in: 600, user: { id: 1 } });
    resolveFetch(res(401, { error: "No autorizado" }));
    await expect(pending).rejects.toBeInstanceOf(ApiError);
    expect(cb).not.toHaveBeenCalled();
    expect(getToken()).toBe("t-nuevo-fake");
  });
  it("401 sin token pero con sesión nueva no notifica", async () => {
    let resolveFetch;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValue(new Promise((r) => (resolveFetch = r))),
    );
    const cb = vi.fn();
    sub(onUnauthorized, cb);
    const pending = request("/a");
    start();
    resolveFetch(res(401, { error: "No autorizado" }));
    await expect(pending).rejects.toBeInstanceOf(ApiError);
    expect(cb).not.toHaveBeenCalled();
    expect(getToken()).toBe("t-fake");
  });
});

describe("http timeout", () => {
  // fetch que respeta el signal, como el real
  const hanging = () =>
    vi.fn((_url, init) => new Promise((_, reject) => {
      init.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    }));
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("aborta una lectura colgada con ApiError status 0 y no cierra sesión", async () => {
    start();
    const f = hanging();
    vi.stubGlobal("fetch", f);
    const cb = vi.fn();
    sub(onUnauthorized, cb);
    const p = request("/x");
    const assertion = expect(p).rejects.toMatchObject({
      name: "ApiError",
      status: 0,
      message: "La solicitud tardó demasiado. Revisa tu conexión.",
    });
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
    await assertion;
    expect(f.mock.calls[0][1].signal.aborted).toBe(true);
    expect(cb).not.toHaveBeenCalled();
    expect(getToken()).toBe("t-fake");
  });
  it("una escritura colgada libera el trabajo en curso al vencer", async () => {
    vi.stubGlobal("fetch", hanging());
    const p = request("/x", { method: "POST", body: { a: 1 } });
    const assertion = expect(p).rejects.toBeInstanceOf(ApiError);
    expect(hasUnsavedChanges()).toBe(true);
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
    await assertion;
    expect(hasUnsavedChanges()).toBe(false);
  });
  it("un éxito rápido limpia el temporizador", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(res(200, { ok: 1 })));
    await expect(request("/x", { method: "POST" })).resolves.toEqual({ ok: 1 });
    expect(vi.getTimerCount()).toBe(0);
  });
  it("logout con timeout igualmente limpia la sesión", async () => {
    start();
    vi.stubGlobal("fetch", hanging());
    const p = logout();
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
    await p;
    expect(getToken()).toBeFalsy();
  });
});
