// Integracion registro -> lista -> edicion con la capa api REAL; solo se mockea fetch.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithTheme } from "../test/renderWithTheme";
import RegisterBirthday from "./registerBirthday/RegisterBirthday";
import BirthdayList from "./birthdayList/BirthdayList";

const json = (status, body) => ({ ok: status < 400, status, json: async () => body });
const serialized = (over = {}) => ({
  id: 1, name: "Ana", last_name: "Paz", birth_day: 15, birth_month: 3, birth_year: null,
  age: null, next_birthday: "2027-03-15", days_until: 120, turning_age: null, birthday: null, ...over,
});
const bodyOf = (call) => JSON.parse(call[1].body);
const callsTo = (fetchMock, method) =>
  fetchMock.mock.calls.filter(([, init]) => (init?.method || "GET") === method);

let fetchMock;
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-11-15T15:00:00Z") });
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function fillRegister(user, { day = "15", month = "3" } = {}) {
  await user.type(screen.getByLabelText(/^Nombre/), "Ana");
  await user.type(screen.getByLabelText(/^Apellido/), "Paz");
  await user.selectOptions(screen.getByLabelText(/^Día/), day);
  await user.selectOptions(screen.getByLabelText(/^Mes/), month);
}
const save = () => screen.getByRole("button", { name: /guardar/i });

describe("registro (fetch real mockeado)", () => {
  it("sin año: POST a /api/customers con JSON sin birth_year ni age", async () => {
    fetchMock.mockResolvedValue(json(201, serialized()));
    const user = userEvent.setup();
    renderWithTheme(<RegisterBirthday />);
    await fillRegister(user);
    await user.click(save());
    expect(await screen.findByText("Cumpleaños guardado correctamente.")).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/api\/customers$/);
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(init.body).not.toMatch(/birth_year|age/);
    expect(JSON.parse(init.body)).toEqual({ name: "Ana", last_name: "Paz", birth_day: 15, birth_month: 3 });
  });

  it("con edad: el JSON lleva solo age", async () => {
    fetchMock.mockResolvedValue(json(201, serialized({ birth_year: 1995, age: 31 })));
    const user = userEvent.setup();
    renderWithTheme(<RegisterBirthday />);
    await fillRegister(user);
    await user.click(screen.getByRole("button", { name: "Edad actual" }));
    await user.type(screen.getByLabelText(/^Edad/), "31");
    await user.click(save());
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const body = bodyOf(fetchMock.mock.calls[0]);
    expect(body.age).toBe(31);
    expect(body).not.toHaveProperty("birth_year");
  });

  it("con año: el JSON lleva solo birth_year", async () => {
    fetchMock.mockResolvedValue(json(201, serialized({ birth_year: 1995 })));
    const user = userEvent.setup();
    renderWithTheme(<RegisterBirthday />);
    await fillRegister(user);
    await user.click(screen.getByRole("button", { name: "Año de nacimiento" }));
    await user.type(screen.getByLabelText(/^Año/), "1995");
    await user.click(save());
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const body = bodyOf(fetchMock.mock.calls[0]);
    expect(body.birth_year).toBe(1995);
    expect(body).not.toHaveProperty("age");
  });

  it("400 {error} del backend (29/02 + edad) se muestra con la sugerencia", async () => {
    fetchMock.mockResolvedValue(
      json(400, { error: "Con el 29 de febrero indica el año de nacimiento: no se puede deducir con la edad" }),
    );
    const user = userEvent.setup();
    renderWithTheme(<RegisterBirthday />);
    await fillRegister(user, { day: "29", month: "2" });
    await user.click(screen.getByRole("button", { name: "Edad actual" }));
    await user.type(screen.getByLabelText(/^Edad/), "29");
    await user.click(save());
    expect(
      await screen.findByText(/Con el 29 de febrero indica el año de nacimiento: no se puede deducir.*Año de nacimiento/),
    ).toBeInTheDocument();
    expect(screen.queryByText("Cumpleaños guardado correctamente.")).not.toBeInTheDocument();
  });

  it("409 {error} y error de red se muestran sin romper", async () => {
    fetchMock.mockResolvedValueOnce(json(409, { error: "Ya existe un cliente con ese correo o teléfono" }));
    const user = userEvent.setup();
    renderWithTheme(<RegisterBirthday />);
    await fillRegister(user);
    await user.click(save());
    expect(await screen.findByText("Ya existe un cliente con ese correo o teléfono")).toBeInTheDocument();
  });

  it("error de red muestra el mensaje de conexión", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const user = userEvent.setup();
    renderWithTheme(<RegisterBirthday />);
    await fillRegister(user);
    await user.click(save());
    expect(await screen.findByText(/No se pudo conectar con el servidor/)).toBeInTheDocument();
  });

  it("500 sin cuerpo JSON muestra un mensaje genérico", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => { throw new Error("no json"); } });
    const user = userEvent.setup();
    renderWithTheme(<RegisterBirthday />);
    await fillRegister(user);
    await user.click(save());
    expect(await screen.findByText("Error inesperado (500)")).toBeInTheDocument();
  });
});

describe("lista y edición (fetch real mockeado)", () => {
  it("registro -> lista: lo guardado sin año aparece sin edad", async () => {
    // servidor en memoria
    const db = [];
    fetchMock.mockImplementation(async (url, init = {}) => {
      if ((init.method || "GET") === "POST") {
        const b = JSON.parse(init.body);
        db.push(serialized({ id: db.length + 1, ...b }));
        return json(201, db.at(-1));
      }
      return json(200, db);
    });
    const user = userEvent.setup();
    const { unmount } = renderWithTheme(<RegisterBirthday />);
    await fillRegister(user);
    await user.click(save());
    await screen.findByText("Cumpleaños guardado correctamente.");
    unmount();

    renderWithTheme(<BirthdayList />);
    const item = await screen.findByRole("listitem");
    expect(item).toHaveTextContent("Ana Paz");
    expect(item).toHaveTextContent("15");
    expect(item).not.toHaveTextContent(/cumple \d|años/);
  });

  it("editar pasando de año a No sé envía PUT con birth_year null", async () => {
    const person = serialized({ birth_year: 1995, age: 31, turning_age: 32 });
    fetchMock.mockImplementation(async (url, init = {}) => {
      const m = init.method || "GET";
      if (m === "PUT") return json(200, serialized());
      return json(200, [person]);
    });
    const user = userEvent.setup();
    renderWithTheme(<BirthdayList />);
    await user.click(await screen.findByRole("button", { name: "Editar Ana Paz" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "No sé" }));
    await user.click(within(dialog).getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(callsTo(fetchMock, "PUT")).toHaveLength(1));
    const put = callsTo(fetchMock, "PUT")[0];
    expect(put[0]).toMatch(/\/api\/customers\/1$/);
    const body = bodyOf(put);
    expect(body).toHaveProperty("birth_year", null);
    expect(body).not.toHaveProperty("age");
    // refresca la lista tras guardar
    await waitFor(() => expect(callsTo(fetchMock, "GET").length).toBeGreaterThanOrEqual(2));
  });

  it("editar: 400 {error} del backend se muestra y la lista no se rompe", async () => {
    const person = serialized({ birth_year: 1995, age: 31, turning_age: 32 });
    fetchMock.mockImplementation(async (url, init = {}) => {
      if ((init.method || "GET") === "PUT") return json(400, { error: "La fecha de nacimiento no existe en el calendario" });
      return json(200, [person]);
    });
    const user = userEvent.setup();
    renderWithTheme(<BirthdayList />);
    await user.click(await screen.findByRole("button", { name: "Editar Ana Paz" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Guardar" }));
    expect(await screen.findByText("La fecha de nacimiento no existe en el calendario")).toBeInTheDocument();
    expect(screen.getAllByText("Ana Paz").length).toBeGreaterThan(0);
  });
});
