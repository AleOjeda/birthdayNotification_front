import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithTheme } from "../../test/renderWithTheme";
import EditBirthdayModal from "./EditBirthdayModal";
import { hasUnsavedChanges, resetUnsavedChanges } from "../../lib/unsavedChanges";

const withYear = { id: 7, name: "Ana", last_name: "Paz", birth_day: 15, birth_month: 3, birth_year: 1995 };
const noYear = { ...withYear, birth_year: null };

const setup = (customer, props = {}) => {
  const onSave = vi.fn();
  renderWithTheme(
    <EditBirthdayModal open customer={customer} onClose={vi.fn()} onSave={onSave} {...props} />,
  );
  return onSave;
};

beforeEach(() =>
  vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-11-15T15:00:00Z") }),
);
afterEach(() => vi.useRealTimers());

describe("EditBirthdayModal", () => {
  it("precarga con año: modo Año de nacimiento", () => {
    setup(withYear);
    expect(screen.getByLabelText(/^Nombre/)).toHaveValue("Ana");
    expect(screen.getByLabelText(/^Día/)).toHaveValue("15");
    expect(screen.getByLabelText(/^Mes/)).toHaveValue("3");
    expect(screen.getByRole("button", { name: "Año de nacimiento" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText(/^Año/)).toHaveValue(1995);
    expect(screen.queryByText("Se quitará el año guardado")).not.toBeInTheDocument();
  });

  it("precarga sin año: modo No sé", () => {
    setup(noYear);
    expect(screen.getByRole("button", { name: "No sé" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByLabelText(/^Año/)).not.toBeInTheDocument();
  });

  it("pasar a No sé avisa y envía birth_year null", async () => {
    const user = userEvent.setup();
    const onSave = setup(withYear);
    await user.click(screen.getByRole("button", { name: "No sé" }));
    expect(screen.getByText("Se quitará el año guardado")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).toEqual({
      name: "Ana",
      last_name: "Paz",
      birth_day: 15,
      birth_month: 3,
      birth_year: null,
    });
  });

  it("pasar a Edad envía age sin birth_year", async () => {
    const user = userEvent.setup();
    const onSave = setup(withYear);
    await user.click(screen.getByRole("button", { name: "Edad actual" }));
    await user.type(screen.getByLabelText(/^Edad/), "30");
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    const payload = onSave.mock.calls[0][0];
    expect(payload.age).toBe(30);
    expect(payload).not.toHaveProperty("birth_year");
  });

  it("sin año y sin cambios no envía birth_year", async () => {
    const user = userEvent.setup();
    const onSave = setup(noYear);
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).not.toHaveProperty("birth_year");
  });

  it("deshabilita Guardar con errores visibles", async () => {
    const user = userEvent.setup();
    setup(withYear);
    await user.selectOptions(screen.getByLabelText(/^Día/), "31");
    await user.selectOptions(screen.getByLabelText(/^Mes/), "4");
    expect(screen.getByText("Abril tiene 30 días")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
  });

  it("muestra Guardando y bloquea mientras saving", () => {
    setup(withYear, { saving: true });
    expect(screen.getByRole("button", { name: /guardando/i })).toBeDisabled();
    expect(screen.getByLabelText(/^Nombre/)).toHaveAttribute("readonly");
  });

  it("deshabilita día y mes mientras guarda", () => {
    setup(withYear, { saving: true });
    expect(screen.getByLabelText(/^Día/)).toBeDisabled();
    expect(screen.getByLabelText(/^Mes/)).toBeDisabled();
  });

  it("no muestra error rojo en año antes de escribir", async () => {
    const user = userEvent.setup();
    setup(noYear);
    await user.click(screen.getByRole("button", { name: "Año de nacimiento" }));
    expect(screen.queryByText("Escribe el año de nacimiento")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Edad actual" }));
    expect(screen.queryByText("Escribe la edad")).not.toBeInTheDocument();
  });

  it("solo hay un grupo de botones de año", () => {
    setup(withYear);
    expect(screen.getAllByRole("group")).toHaveLength(1);
  });

  it("edad 0 y 120 son válidas; 121 no", async () => {
    const user = userEvent.setup();
    const onSave = setup(withYear);
    await user.click(screen.getByRole("button", { name: "Edad actual" }));
    const age = screen.getByLabelText(/^Edad/);
    await user.type(age, "0");
    expect(screen.getByRole("button", { name: "Guardar" })).toBeEnabled();
    await user.clear(age);
    await user.type(age, "120");
    expect(screen.getByRole("button", { name: "Guardar" })).toBeEnabled();
    await user.clear(age);
    await user.type(age, "121");
    await user.tab();
    expect(screen.getByText("La edad no puede superar 120 años")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
    await user.clear(age);
    await user.type(age, "0");
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].age).toBe(0);
  });

  it("acepta el año actual si el cumpleaños ya pasó", async () => {
    const user = userEvent.setup();
    const onSave = setup(withYear);
    const year = screen.getByLabelText(/^Año/);
    await user.clear(year);
    await user.type(year, "2026");
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].birth_year).toBe(2026);
  });

  it("29/02 con edad que da año no bisiesto no afirma el año estimado", async () => {
    const user = userEvent.setup();
    setup({ ...withYear, birth_day: 29, birth_month: 2 });
    await user.click(screen.getByRole("button", { name: "Edad actual" }));
    await user.type(screen.getByLabelText(/^Edad/), "31"); // 2026-31 = 1995, no bisiesto
    expect(screen.getByText(/no se podrá guardar con edad/i)).toBeInTheDocument();
    expect(screen.queryByText(/Año de nacimiento estimado/)).not.toBeInTheDocument();
  });

  it("29/02 con edad que da año bisiesto muestra el año estimado", async () => {
    const user = userEvent.setup();
    setup({ ...withYear, birth_day: 29, birth_month: 2 });
    await user.click(screen.getByRole("button", { name: "Edad actual" }));
    await user.type(screen.getByLabelText(/^Edad/), "30"); // 1996
    expect(screen.getByText("Año de nacimiento estimado: 1996")).toBeInTheDocument();
  });

  it("cambiar de modo conserva lo escrito", async () => {
    const user = userEvent.setup();
    setup(withYear);
    await user.click(screen.getByRole("button", { name: "Edad actual" }));
    await user.type(screen.getByLabelText(/^Edad/), "30");
    await user.click(screen.getByRole("button", { name: "Año de nacimiento" }));
    expect(screen.getByLabelText(/^Año/)).toHaveValue(1995);
    await user.click(screen.getByRole("button", { name: "Edad actual" }));
    expect(screen.getByLabelText(/^Edad/)).toHaveValue(30);
  });

  it("registro con año sin tocar re-envía el mismo birth_year", async () => {
    const user = userEvent.setup();
    const onSave = setup(withYear);
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).toEqual({
      name: "Ana",
      last_name: "Paz",
      birth_day: 15,
      birth_month: 3,
      birth_year: 1995,
    });
  });
});

describe('EditBirthdayModal y auto-actualización', () => {
  afterEach(() => resetUnsavedChanges());
  it('registra trabajo en curso al editar o guardar y lo libera al cerrar', async () => {
    const user = userEvent.setup();
    const { rerender } = renderWithTheme(
      <EditBirthdayModal open customer={withYear} onClose={vi.fn()} onSave={vi.fn()} />,
    );
    expect(hasUnsavedChanges()).toBe(false);
    await user.type(screen.getByLabelText(/^Nombre/), 'x');
    expect(hasUnsavedChanges()).toBe(true);
    rerender(<EditBirthdayModal open={false} customer={null} onClose={vi.fn()} onSave={vi.fn()} />);
    await waitFor(() => expect(hasUnsavedChanges()).toBe(false));
  });
  it('guardando (saving) cuenta como petición en vuelo aunque no haya cambios', () => {
    setup(withYear, { saving: true });
    expect(hasUnsavedChanges()).toBe(true);
  });
});
