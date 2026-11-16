import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkForNewVersion, isChunkLoadError } from "./versionCheck";

const CURRENT = "2.0.0+2026-11-16T10:00:00.000Z+abc1234";
const NEWER = "2.0.0+2026-11-16T12:00:00.000Z+abc1234";
const json = (body, init = {}) => ({ ok: true, json: async () => body, ...init });

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("checkForNewVersion", () => {
  it("misma identidad: nada", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ identity: CURRENT })));
    expect(await checkForNewVersion(CURRENT)).toBeNull();
  });

  it("identidad distinta y válida: devuelve la nueva", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ identity: NEWER })));
    expect(await checkForNewVersion(CURRENT)).toBe(NEWER);
  });

  it("usa el mismo origen, sin caché ni credenciales", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ identity: CURRENT }));
    vi.stubGlobal("fetch", fetchMock);
    await checkForNewVersion(CURRENT);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toMatch(/^\/version\.json\?t=\d+$/);
    expect(options).toMatchObject({ cache: "no-store", credentials: "omit" });
  });

  it.each([
    ["404", json({}, { ok: false, status: 404 })],
    [
      "HTML en vez de JSON",
      {
        ok: true,
        json: async () => {
          throw new SyntaxError("Unexpected token <");
        },
      },
    ],
    ["JSON sin identity", json({ version: "1" })],
    ["identity no string", json({ identity: 5 })],
    ["identity con caracteres raros", json({ identity: "<script>alert(1)</script>" })],
    ["identity vacía", json({ identity: "" })],
    ["cuerpo null", json(null)],
  ])("%s: ignora", async (_name, response) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
    expect(await checkForNewVersion(CURRENT)).toBeNull();
  });

  it("red caída: ignora sin lanzar", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    expect(await checkForNewVersion(CURRENT)).toBeNull();
  });

  it("timeout: ignora y aborta la petición", async () => {
    let signal;
    vi.stubGlobal(
      "fetch",
      vi.fn((_url, options) => {
        signal = options.signal;
        return new Promise(() => {});
      }),
    );
    const promise = checkForNewVersion(CURRENT, { timeoutMs: 5000 });
    await vi.advanceTimersByTimeAsync(5000);
    expect(await promise).toBeNull();
    expect(signal.aborted).toBe(true);
  });

  it("sin identidad actual (dev) no consulta", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await checkForNewVersion("")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("isChunkLoadError", () => {
  it.each([
    new TypeError("Failed to fetch dynamically imported module: https://x/assets/a-1.js"),
    new TypeError("error loading dynamically imported module"),
    Object.assign(new Error("Loading chunk 3 failed."), { name: "ChunkLoadError" }),
    "Importing a module script failed.",
  ])("detecta %s", (e) => expect(isChunkLoadError(e)).toBe(true));

  it.each([null, undefined, new Error("boom"), new TypeError("x is not a function")])(
    "no detecta %s",
    (e) => expect(isChunkLoadError(e)).toBe(false),
  );
});
