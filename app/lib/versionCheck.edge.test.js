import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkForNewVersion } from "./versionCheck";

const CURRENT = "2.0.0+2026-11-16T10:00:00.000Z+abc1234";
const NEWER = "2.0.0+2026-11-16T12:00:00.000Z+abc1234";
const ok = (body) => ({ ok: true, status: 200, json: async () => body });

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("checkForNewVersion: casos límite", () => {
  it.each([
    ["500", { ok: false, status: 500, json: async () => ({ identity: NEWER }) }],
    ["503 con identity válida", { ok: false, status: 503, json: async () => ({ identity: NEWER }) }],
    ["respuesta undefined", undefined],
    ["cuerpo string", ok("2.0.0+x")],
    ["cuerpo array", ok([NEWER])],
    ["cuerpo número", ok(7)],
    ["identity objeto", ok({ identity: { v: NEWER } })],
    ["identity array", ok({ identity: [NEWER] })],
    ["identity con espacios", ok({ identity: "2.0.0 +x" })],
    ["identity con salto de línea", ok({ identity: `${NEWER}\n` })],
    ["identity con barra o ruta", ok({ identity: "../../etc/passwd" })],
    ["identity de 201 caracteres", ok({ identity: "a".repeat(201) })],
    ["json() rechaza con error de red a mitad", { ok: true, json: async () => { throw new TypeError("terminated"); } }],
  ])("%s: devuelve null sin lanzar", async (_n, response) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
    await expect(checkForNewVersion(CURRENT)).resolves.toBeNull();
  });

  it("identity de exactamente 200 caracteres válidos se acepta si es distinta", async () => {
    const id = "a".repeat(200);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(ok({ identity: id })));
    await expect(checkForNewVersion(CURRENT)).resolves.toBe(id);
  });

  it("la comparación distingue mayúsculas (otra identidad)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(ok({ identity: CURRENT.toUpperCase() })));
    await expect(checkForNewVersion(CURRENT)).resolves.toBe(CURRENT.toUpperCase());
  });

  it("ignora campos extra en version.json", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(ok({ identity: CURRENT, version: "9.9.9", extra: true })));
    await expect(checkForNewVersion(CURRENT)).resolves.toBeNull();
  });

  it("una petición que nunca responde no bloquea y aborta con la señal", async () => {
    let signal;
    vi.stubGlobal("fetch", vi.fn((url, init) => { signal = init.signal; return new Promise(() => {}); }));
    const p = checkForNewVersion(CURRENT, { timeoutMs: 1000 });
    await vi.advanceTimersByTimeAsync(1000);
    await expect(p).resolves.toBeNull();
    expect(signal.aborted).toBe(true);
  });

  it("una respuesta tardía tras el timeout no se aplica", async () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise((resolve) => setTimeout(() => resolve(ok({ identity: NEWER })), 2000))));
    const p = checkForNewVersion(CURRENT, { timeoutMs: 1000 });
    await vi.advanceTimersByTimeAsync(3000);
    await expect(p).resolves.toBeNull();
  });
});
