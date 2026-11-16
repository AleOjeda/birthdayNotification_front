import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithTheme } from "../../test/renderWithTheme";
import RegisterBirthday from "./RegisterBirthday";
import { ApiError, createCustomer } from "../../api/customers";
import { hasUnsavedChanges, resetUnsavedChanges } from "../../lib/unsavedChanges";

vi.mock("../../api/customers", async () => {
  const actual = await vi.importActual("../../api/customers");
  return { ...actual, createCustomer: vi.fn() };
});

async function fill(user, { day = "15", month = "3" } = {}) {
  await user.type(screen.getByLabelText(/^Nombre/), "Ana");
  await user.type(screen.getByLabelText(/^Apellido/), "Paz");
  await user.selectOptions(screen.getByLabelText(/^Día/), day);
  await user.selectOptions(screen.getByLabelText(/^Mes/), month);
}

const save = () => screen.getByRole("button", { name: /guardar/i });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-11-15T15:00:00Z") });
  createCustomer.mockReset();
  createCustomer.mockResolvedValue({ id: 1 });
});
afterEach(() => vi.useRealTimers());

describe("RegisterBirthday", () => {
  it("por defecto es No sé y se envía solo con día y mes", async () => {
    const user = userEvent.setup();
    renderWithTheme(<RegisterBirthday />);
    expect(screen.getByRole("button", { name: "No sé" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("No hace falta. Solo recordaremos el día y el mes.")).toBeInTheDocument();
    await fill(user);
    expect(
      screen.getByText("Sin año: solo se mostrará el 15 de marzo y no se calculará la edad."),
    ).toBeInTheDocument();
    await user.click(save());
    await waitFor(() => expect(createCustomer).toHaveBeenCalledTimes(1));
    const payload = createCustomer.mock.calls[0][0];
    expect(payload).toEqual({ name: "Ana", last_name: "Paz", birth_day: 15, birth_month: 3 });
    expect(payload).not.toHaveProperty("birth_year");
    expect(payload).not.toHaveProperty("age");
    expect(await screen.findByText("Cumpleaños guardado correctamente.")).toBeInTheDocument();
  });

  it("modo año envía birth_year y nunca age", async () => {
    const user = userEvent.setup();
    renderWithTheme(<RegisterBirthday />);
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Año de nacimiento" }));
    await user.type(screen.getByLabelText(/^Año/), "1995");
    expect(screen.getByText("Cumple 32 años el 15 de marzo")).toBeInTheDocument();
    await user.click(save());
    await waitFor(() => expect(createCustomer).toHaveBeenCalled());
    const payload = createCustomer.mock.calls[0][0];
    expect(payload.birth_year).toBe(1995);
    expect(payload).not.toHaveProperty("age");
  });

  it("modo edad envía age y nunca birth_year, aunque haya un año escrito antes", async () => {
    const user = userEvent.setup();
    renderWithTheme(<RegisterBirthday />);
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Año de nacimiento" }));
    await user.type(screen.getByLabelText(/^Año/), "1990");
    await user.click(screen.getByRole("button", { name: "Edad actual" }));
    expect(screen.getByText(/calcularemos el año de nacimiento/)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/^Edad/), "31");
    expect(screen.getByText("Año de nacimiento estimado: 1995")).toBeInTheDocument();
    await user.click(save());
    await waitFor(() => expect(createCustomer).toHaveBeenCalled());
    const payload = createCustomer.mock.calls[0][0];
    expect(payload.age).toBe(31);
    expect(payload).not.toHaveProperty("birth_year");
  });

  it("al volver al modo anterior conserva lo escrito", async () => {
    const user = userEvent.setup();
    renderWithTheme(<RegisterBirthday />);
    await user.click(screen.getByRole("button", { name: "Año de nacimiento" }));
    await user.type(screen.getByLabelText(/^Año/), "1990");
    await user.click(screen.getByRole("button", { name: "Edad actual" }));
    await user.click(screen.getByRole("button", { name: "Año de nacimiento" }));
    expect(screen.getByLabelText(/^Año/)).toHaveValue(1990);
  });

  it("31 de abril muestra error y no envía", async () => {
    const user = userEvent.setup();
    renderWithTheme(<RegisterBirthday />);
    await fill(user, { day: "31", month: "4" });
    expect(screen.getByText("Abril tiene 30 días")).toBeInTheDocument();
    await user.click(save());
    expect(createCustomer).not.toHaveBeenCalled();
  });

  it("año en que el 29 de febrero no existe no se envía", async () => {
    const user = userEvent.setup();
    renderWithTheme(<RegisterBirthday />);
    await fill(user, { day: "29", month: "2" });
    await user.click(screen.getByRole("button", { name: "Año de nacimiento" }));
    await user.type(screen.getByLabelText(/^Año/), "2023");
    await user.tab();
    expect(screen.getByText("El 29 de febrero no existe en 2023")).toBeInTheDocument();
    await user.click(save());
    expect(createCustomer).not.toHaveBeenCalled();
  });

  it("29 de febrero con Edad muestra el aviso en el formulario", async () => {
    const user = userEvent.setup();
    renderWithTheme(<RegisterBirthday />);
    await fill(user, { day: "29", month: "2" });
    expect(screen.queryByText(/no es\s+bisiesto/)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Edad actual" }));
    expect(screen.getByText(/no es\s+bisiesto/)).toBeInTheDocument();
  });

  it("muestra el error del backend y sugiere Año de nacimiento en 29/02", async () => {
    const user = userEvent.setup();
    createCustomer.mockRejectedValue(
      new ApiError("Con el 29 de febrero indica el año de nacimiento", 400),
    );
    renderWithTheme(<RegisterBirthday />);
    await fill(user, { day: "29", month: "2" });
    await user.click(screen.getByRole("button", { name: "Edad actual" }));
    await user.type(screen.getByLabelText(/^Edad/), "30");
    await user.click(save());
    expect(
      await screen.findByText(/Con el 29 de febrero indica el año de nacimiento.*Año de nacimiento/),
    ).toBeInTheDocument();
    expect(save()).toBeEnabled();
  });

  it("muestra el error del backend en otros fallos", async () => {
    const user = userEvent.setup();
    createCustomer.mockRejectedValue(new ApiError("Ya existe una persona igual", 409));
    renderWithTheme(<RegisterBirthday />);
    await fill(user);
    await user.click(save());
    expect(await screen.findByText("Ya existe una persona igual")).toBeInTheDocument();
  });

  it("bloquea el doble envío y tras el éxito resetea a No sé", async () => {
    const user = userEvent.setup();
    let resolve;
    createCustomer.mockReturnValue(new Promise((r) => (resolve = r)));
    renderWithTheme(<RegisterBirthday />);
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Año de nacimiento" }));
    await user.type(screen.getByLabelText(/^Año/), "1995");
    await user.click(save());
    const busy = await screen.findByRole("button", { name: /guardando/i });
    expect(busy).toBeDisabled();
    resolve({ id: 1 });
    await screen.findByText("Cumpleaños guardado correctamente.");
    expect(createCustomer).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText(/^Nombre/)).toHaveValue("");
    expect(screen.getByLabelText(/^Día/)).toHaveValue("");
    expect(screen.getByRole("button", { name: "No sé" })).toHaveAttribute("aria-pressed", "true");
  });
});

describe('RegisterBirthday y auto-actualización', () => {
  afterEach(() => resetUnsavedChanges());
  it('con cambios sin guardar registra trabajo en curso y lo libera al guardar', async () => {
    const user = userEvent.setup();
    renderWithTheme(<RegisterBirthday />);
    expect(hasUnsavedChanges()).toBe(false);
    await fill(user);
    expect(hasUnsavedChanges()).toBe(true);
    await user.click(save());
    await waitFor(() => expect(createCustomer).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(hasUnsavedChanges()).toBe(false));
  });
});
