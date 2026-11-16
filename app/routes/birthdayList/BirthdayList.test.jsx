import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithTheme } from "../../test/renderWithTheme";
import BirthdayList from "./BirthdayList";
import { hasUnsavedChanges, resetUnsavedChanges } from "../../lib/unsavedChanges";
import { deleteCustomer, getCustomers, updateCustomer } from "../../api/customers";

vi.mock("../../api/customers", () => ({
  getCustomers: vi.fn(),
  updateCustomer: vi.fn(),
  deleteCustomer: vi.fn(),
}));

const make = (id, name, last_name, days_until, extra = {}) => ({
  id,
  name,
  last_name,
  birth_day: 15,
  birth_month: 3,
  birth_year: null,
  age: null,
  next_birthday: "2026-12-01",
  days_until,
  turning_age: null,
  birthday: null,
  ...extra,
});

// orden por nombre: Álvarez, Núñez, Ñancupil, Olmos, Zapata
const DATA = [
  make(1, "Zoe", "Zapata", 0),
  make(2, "Ana", "Álvarez", 40, { birth_year: 1990, age: 35, turning_age: 36 }),
  make(3, "Ñoño", "Ñancupil", 100),
  make(4, "Luis", "Olmos", 1),
  make(5, "Pía", "Núñez", 5),
];

const names = () =>
  screen
    .getAllByRole("listitem")
    .map((li) => li.querySelector("p")?.textContent);

const setup = async (data = DATA) => {
  getCustomers.mockResolvedValue(data);
  const user = userEvent.setup();
  renderWithTheme(<BirthdayList />);
  if (data.length) await screen.findAllByRole("listitem");
  return user;
};

beforeEach(() => {
  vi.resetAllMocks();
  updateCustomer.mockResolvedValue({});
  deleteCustomer.mockResolvedValue(null);
});

describe("BirthdayList", () => {
  it("muestra carga mientras llega la lista", () => {
    getCustomers.mockReturnValue(new Promise(() => {}));
    renderWithTheme(<BirthdayList />);
    expect(screen.getByRole("status", { name: "Cargando" })).toBeInTheDocument();
    expect(screen.getByText("Cargando cumpleaños...")).toBeInTheDocument();
  });

  it("ordena por próximo cumpleaños por defecto", async () => {
    await setup();
    expect(names()).toEqual([
      "Zoe Zapata",
      "Luis Olmos",
      "Pía Núñez",
      "Ana Álvarez",
      "Ñoño Ñancupil",
    ]);
    expect(screen.getByRole("button", { name: "Próximos" })).toHaveAttribute("aria-pressed", "true");
  });

  it("desempata por apellido y nombre cuando coinciden los días", async () => {
    await setup([make(1, "Bea", "Zeta", 3), make(2, "Ana", "Zeta", 3), make(3, "Cris", "Alva", 3)]);
    expect(names()).toEqual(["Cris Alva", "Ana Zeta", "Bea Zeta"]);
  });

  it("alterna a Nombre A–Z respetando tildes y Ñ, y mantiene el orden al buscar", async () => {
    const user = await setup();
    await user.click(screen.getByRole("button", { name: "Nombre A–Z" }));
    expect(names()).toEqual([
      "Ana Álvarez",
      "Pía Núñez",
      "Ñoño Ñancupil",
      "Luis Olmos",
      "Zoe Zapata",
    ]);
    await user.type(screen.getByLabelText("Buscar por nombre"), "o");
    expect(names()).toEqual(["Ñoño Ñancupil", "Luis Olmos", "Zoe Zapata"]);
  });

  it("busca y muestra el contador de coincidencias", async () => {
    const user = await setup();
    expect(screen.getByText("5 personas registradas")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Buscar por nombre"), "olmos");
    expect(names()).toEqual(["Luis Olmos"]);
    expect(screen.getByText("5 personas registradas · 1 coincidencia")).toBeInTheDocument();
    await user.clear(screen.getByLabelText("Buscar por nombre"));
    await user.type(screen.getByLabelText("Buscar por nombre"), "xyz");
    expect(screen.getByText("No se encontraron resultados")).toBeInTheDocument();
  });

  it("sin año no muestra 'cumple'; con año sí", async () => {
    await setup();
    const withYear = screen.getByText("Ana Álvarez").closest("li");
    expect(within(withYear).getByText("cumple 36")).toBeInTheDocument();
    const noYear = screen.getByText("Zoe Zapata").closest("li");
    expect(within(noYear).queryByText(/cumple/)).not.toBeInTheDocument();
    expect(screen.getAllByRole("listitem").filter((li) => /cumple [0-9]/.test(li.textContent))).toHaveLength(1);
    expect(screen.queryByText(/\bañ?os\b/)).not.toBeInTheDocument();
  });

  it("muestra fecha corta y chip de días", async () => {
    await setup();
    const row = screen.getByText("Zoe Zapata").closest("li");
    expect(within(row).getByText("15 mar")).toBeInTheDocument();
    expect(within(row).getByText("Hoy")).toBeInTheDocument();
    expect(screen.getByText("Mañana")).toBeInTheDocument();
    expect(screen.getByText("En 40 días")).toBeInTheDocument();
  });

  it("elimina con confirmación y recarga la lista", async () => {
    const user = await setup();
    getCustomers.mockResolvedValue(DATA.filter((p) => p.id !== 4));
    await user.click(screen.getByRole("button", { name: "Eliminar Luis Olmos" }));
    expect(deleteCustomer).not.toHaveBeenCalled();
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Luis Olmos")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Eliminar" }));
    await waitFor(() => expect(deleteCustomer).toHaveBeenCalledWith(4));
    await waitFor(() => expect(screen.queryByText("Luis Olmos", { selector: "p" })).not.toBeInTheDocument());
    expect(getCustomers).toHaveBeenCalledTimes(2);
    expect(await screen.findByText("Cumpleaños eliminado.")).toBeInTheDocument();
  });

  it("el diálogo de confirmación abierto cuenta como trabajo en curso (retrasa la auto-actualización)", async () => {
    resetUnsavedChanges();
    const user = await setup();
    expect(hasUnsavedChanges()).toBe(false);
    await user.click(screen.getByRole("button", { name: "Eliminar Luis Olmos" }));
    const dialog = await screen.findByRole("dialog");
    expect(hasUnsavedChanges()).toBe(true);
    await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(hasUnsavedChanges()).toBe(false));
  });

  it("el modal de edición abierto cuenta como trabajo en curso", async () => {
    resetUnsavedChanges();
    const user = await setup();
    await user.click(screen.getByRole("button", { name: "Editar Luis Olmos" }));
    await screen.findByRole("dialog");
    expect(hasUnsavedChanges()).toBe(true);
  });

  it("cancelar la confirmación no elimina", async () => {
    const user = await setup();
    await user.click(screen.getByRole("button", { name: "Eliminar Luis Olmos" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));
    expect(deleteCustomer).not.toHaveBeenCalled();
  });

  it("muestra el error de la API si falla eliminar", async () => {
    deleteCustomer.mockRejectedValue(new Error("No se pudo eliminar"));
    const user = await setup();
    await user.click(screen.getByRole("button", { name: "Eliminar Luis Olmos" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Eliminar" }));
    expect(await screen.findByText("No se pudo eliminar")).toBeInTheDocument();
    expect(getCustomers).toHaveBeenCalledTimes(1);
  });

  it("edita (updateCustomer) y recarga con datos nuevos reordenando", async () => {
    const user = await setup();
    getCustomers.mockResolvedValue(
      DATA.map((p) => (p.id === 3 ? { ...p, days_until: 0, name: "Ñoño" } : { ...p, days_until: p.days_until + 1 })),
    );
    await user.click(screen.getByRole("button", { name: "Editar Ñoño Ñancupil" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Guardar" }));
    await waitFor(() =>
      expect(updateCustomer).toHaveBeenCalledWith(3, {
        name: "Ñoño",
        last_name: "Ñancupil",
        birth_day: 15,
        birth_month: 3,
        birth_year: undefined,
      }),
    );
    await waitFor(() => expect(getCustomers).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(names()[0]).toBe("Ñoño Ñancupil"));
    expect(await screen.findByText("Cambios guardados correctamente.")).toBeInTheDocument();
  });

  it("muestra estado vacío", async () => {
    await setup([]);
    expect(await screen.findByText("Aún no hay cumpleaños registrados")).toBeInTheDocument();
  });

  it("muestra error de carga y permite reintentar", async () => {
    getCustomers.mockRejectedValueOnce(new Error("x")).mockResolvedValueOnce(DATA);
    const user = userEvent.setup();
    renderWithTheme(<BirthdayList />);
    expect(await screen.findByText(/No pudimos cargar la lista/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findAllByRole("listitem")).toHaveLength(5);
  });

  it("busca sin tildes ni mayúsculas", async () => {
    const user = await setup([make(1, "José", "Pérez", 3), make(2, "Pía", "Núñez", 4), make(3, "Ana", "Soto", 5)]);
    const box = screen.getByLabelText("Buscar por nombre");
    await user.type(box, "jose");
    expect(names()).toEqual(["José Pérez"]);
    await user.clear(box);
    await user.type(box, "NUNEZ");
    expect(names()).toEqual(["Pía Núñez"]);
    await user.clear(box);
    await user.type(box, "pia");
    expect(names()).toEqual(["Pía Núñez"]);
  });

  it("no muta el array original al ordenar y filtrar", async () => {
    const data = DATA.map((p) => ({ ...p }));
    const snapshot = data.map((p) => p.id);
    const user = await setup(data);
    await user.click(screen.getByRole("button", { name: "Nombre A–Z" }));
    await user.type(screen.getByLabelText("Buscar por nombre"), "o");
    expect(data.map((p) => p.id)).toEqual(snapshot);
  });

  it("recarga fallida tras guardar: aviso warning y la lista previa sigue visible", async () => {
    const user = await setup();
    getCustomers.mockRejectedValue(new Error("caído"));
    await user.click(screen.getByRole("button", { name: "Editar Luis Olmos" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Guardar" }));
    const alert = await screen.findByText(/Se guardaron los cambios, pero no pudimos actualizar la lista/);
    expect(alert.closest(".MuiAlert-root")).toHaveClass("MuiAlert-filledWarning");
    await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(5));
  });

  it("recarga fallida tras eliminar: aviso warning y la lista previa sigue visible", async () => {
    const user = await setup();
    getCustomers.mockRejectedValue(new Error("caído"));
    await user.click(screen.getByRole("button", { name: "Eliminar Luis Olmos" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Eliminar" }));
    const alert = await screen.findByText(/Se eliminó el registro, pero no pudimos actualizar la lista/);
    expect(alert.closest(".MuiAlert-root")).toHaveClass("MuiAlert-filledWarning");
    await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(5));
  });

  it("doble clic en eliminar llama una sola vez", async () => {
    let resolve;
    deleteCustomer.mockReturnValue(new Promise((r) => (resolve = r)));
    const user = await setup();
    await user.click(screen.getByRole("button", { name: "Eliminar Luis Olmos" }));
    const dialog = await screen.findByRole("dialog");
    const btn = within(dialog).getByRole("button", { name: "Eliminar" });
    await user.dblClick(btn);
    expect(deleteCustomer).toHaveBeenCalledTimes(1);
    expect(within(dialog).getByRole("button", { name: "Eliminando..." })).toBeDisabled();
    resolve(null);
    await screen.findByText("Cumpleaños eliminado.");
  });

  it("doble clic en guardar llama una sola vez", async () => {
    let resolve;
    updateCustomer.mockReturnValue(new Promise((r) => (resolve = r)));
    const user = await setup();
    await user.click(screen.getByRole("button", { name: "Editar Luis Olmos" }));
    const dialog = await screen.findByRole("dialog");
    await user.dblClick(within(dialog).getByRole("button", { name: "Guardar" }));
    expect(updateCustomer).toHaveBeenCalledTimes(1);
    resolve({});
    await screen.findByText("Cambios guardados correctamente.");
  });

  it("tras eliminar el foco pasa al buscador", async () => {
    const user = await setup();
    await user.click(screen.getByRole("button", { name: "Eliminar Luis Olmos" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Eliminar" }));
    await screen.findByText("Cumpleaños eliminado.");
    await waitFor(() => expect(screen.getByLabelText("Buscar por nombre")).toHaveFocus());
  });

  it("no actualiza el estado si la respuesta llega tras desmontar", async () => {
    let resolve;
    getCustomers.mockReturnValue(new Promise((r) => (resolve = r)));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const { unmount } = renderWithTheme(<BirthdayList />);
    unmount();
    resolve([make(1, "Ana", "Soto", 1)]);
    await Promise.resolve();
    await Promise.resolve();
    expect(err).not.toHaveBeenCalled();
    err.mockRestore();
  });
});
