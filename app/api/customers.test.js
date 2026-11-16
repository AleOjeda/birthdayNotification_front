import { afterEach, describe, expect, it, vi } from "vitest";
import {
  API_URL,
  ApiError,
  createCustomer,
  deleteCustomer,
  getBirthdaysToday,
  getBirthdaysWeek,
  getCustomers,
  updateCustomer,
} from "./customers";

const ok = (data, status = 200) => ({ ok: true, status, json: async () => data });
const fail = (status, data) => ({ ok: false, status, json: async () => data });

function mockFetch(response) {
  const fn = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe("customers api", () => {
  it("getCustomers hace GET y devuelve JSON", async () => {
    const fn = mockFetch(ok([{ id: 1 }]));
    await expect(getCustomers()).resolves.toEqual([{ id: 1 }]);
    expect(fn).toHaveBeenCalledWith(`${API_URL}/api/customers`, { signal: expect.any(AbortSignal) });
  });

  it("createCustomer envía POST con cuerpo JSON", async () => {
    const fn = mockFetch(ok({ id: 2 }, 201));
    const payload = { name: "Ana", last_name: "Paz", birth_day: 29, birth_month: 2, age: 10 };
    await expect(createCustomer(payload)).resolves.toEqual({ id: 2 });
    const [url, init] = fn.mock.calls[0];
    expect(url).toBe(`${API_URL}/api/customers`);
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual(payload);
  });

  it("updateCustomer envía PUT con birth_year null", async () => {
    const fn = mockFetch(ok({ id: 3 }));
    await updateCustomer(3, { birth_year: null });
    const [url, init] = fn.mock.calls[0];
    expect(url).toBe(`${API_URL}/api/customers/3`);
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body)).toEqual({ birth_year: null });
  });

  it("deleteCustomer envía DELETE sin cuerpo", async () => {
    const fn = mockFetch(ok({ message: "ok" }));
    await expect(deleteCustomer(4)).resolves.toEqual({ message: "ok" });
    const [url, init] = fn.mock.calls[0];
    expect(url).toBe(`${API_URL}/api/customers/4`);
    expect(init.method).toBe("DELETE");
    expect(init.body).toBeUndefined();
  });

  it("cumpleaños de hoy y de la semana", async () => {
    const fn = mockFetch(ok([]));
    await getBirthdaysToday();
    await getBirthdaysWeek();
    expect(fn.mock.calls[0][0]).toBe(`${API_URL}/api/customers/birthdays/today`);
    expect(fn.mock.calls[1][0]).toBe(`${API_URL}/api/customers/birthdays/week`);
  });

  it("lanza ApiError con el mensaje {error} y el status", async () => {
    mockFetch(fail(400, { error: "El año derivado no es bisiesto" }));
    const err = await createCustomer({}).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(400);
    expect(err.message).toBe("El año derivado no es bisiesto");
  });

  it("mensaje genérico si el error no trae JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => { throw new Error("x"); } }));
    const err = await getCustomers().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(500);
    expect(err.message).toMatch(/500/);
  });

  it("fallo de red da mensaje de conexión", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const err = await getCustomers().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(0);
    expect(err.message).toMatch(/conect/i);
  });

  it("respuesta OK sin cuerpo o no JSON devuelve null", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 204, json: async () => { throw new SyntaxError("Unexpected end of JSON"); } }));
    await expect(deleteCustomer(5)).resolves.toBeNull();
  });
});
