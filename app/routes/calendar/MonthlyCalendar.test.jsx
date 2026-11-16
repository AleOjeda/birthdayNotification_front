import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithTheme } from "../../test/renderWithTheme";
import MonthlyCalendar from "./MonthlyCalendar";
import { getCustomers } from "../../api/customers";

vi.mock("../../api/customers", () => ({ getCustomers: vi.fn() }));

const make = (id, name, last_name, birth_day, birth_month, birth_year = null, extra = {}) => ({
  id,
  name,
  last_name,
  birth_day,
  birth_month,
  birth_year,
  age: null,
  next_birthday: "2026-01-01",
  days_until: 10,
  turning_age: null,
  birthday: null,
  ...extra,
});

// hoy = 15 de marzo de 2026 (mediodía UTC: mismo día en America/Santiago)
const setToday = (iso) => vi.useFakeTimers({ toFake: ["Date"], now: new Date(iso) });

// getByLabelText sobre aria-label es mucho más barato que getByRole(name) con ~30 botones
const cellFor = (re) => screen.getByLabelText(re);

const setup = async (data, iso = "2026-03-15T15:00:00Z") => {
  setToday(iso);
  getCustomers.mockResolvedValue(data);
  const user = userEvent.setup();
  renderWithTheme(<MonthlyCalendar />);
  await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
  return user;
};

beforeEach(() => vi.resetAllMocks());
afterEach(() => vi.useRealTimers());

describe("MonthlyCalendar", () => {
  it("muestra carga con skeleton", () => {
    setToday("2026-03-15T15:00:00Z");
    getCustomers.mockReturnValue(new Promise(() => {}));
    renderWithTheme(<MonthlyCalendar />);
    expect(screen.getByRole("status", { name: "Cargando" })).toBeInTheDocument();
    expect(screen.getByText("Cargando cumpleaños...")).toBeInTheDocument();
  });

  it("ubica cumpleaños por birth_day/birth_month, ignorando `birthday`", async () => {
    await setup([make(1, "Ana", "Soto", 20, 3, null, { birthday: "1990-07-01" })]);
    expect(screen.getByText("marzo 2026")).toBeInTheDocument();
    expect(cellFor(/20 de marzo: cumpleaños de Ana Soto/)).toBeInTheDocument();
    expect(screen.getByText("1 cumpleaños este mes")).toBeInTheDocument();
  });

  it("resalta el día actual", async () => {
    await setup([]);
    expect(cellFor(/15 de marzo \(hoy\)/)).toHaveAttribute("aria-current", "date");
    expect(cellFor(/16 de marzo/)).not.toHaveAttribute("aria-current");
  });

  it("persona sin año no muestra 'cumple'; con año muestra la edad del año mostrado", async () => {
    const user = await setup([
      make(1, "Ana", "Soto", 20, 3, null, { turning_age: null }),
      make(2, "Luis", "Mora", 21, 3, 1990, { turning_age: 99 }),
    ]);
    await user.click(cellFor(/20 de marzo/));
    expect(screen.getByText("Ana Soto")).toBeInTheDocument();
    expect(screen.queryByText(/cumple \d/)).not.toBeInTheDocument();
    await user.click(cellFor(/21 de marzo/));
    expect(screen.getByText("Luis Mora")).toBeInTheDocument();
    expect(screen.getByText("(cumple 36)")).toBeInTheDocument();
  });

  it("en el mes de otro año usa añoMostrado - birth_year", async () => {
    const user = await setup([make(2, "Luis", "Mora", 5, 1, 1990)], "2026-12-15T15:00:00Z");
    await user.click(screen.getByRole("button", { name: "Mes siguiente" }));
    expect(screen.getByText("enero 2027")).toBeInTheDocument();
    await user.click(cellFor(/, 5 de enero/));
    expect(screen.getByText("(cumple 37)")).toBeInTheDocument();
  });

  it("29/02 en año no bisiesto aparece el 28; en bisiesto el 29", async () => {
    const user = await setup([make(1, "Bea", "Leap", 29, 2, 2000)], "2027-02-10T15:00:00Z");
    expect(screen.getByText("febrero 2027")).toBeInTheDocument();
    expect(cellFor(/28 de febrero: cumpleaños de Bea Leap/)).toBeInTheDocument();
    expect(cellFor(/27 de febrero: sin cumpleaños/)).toBeInTheDocument();
    await user.click(cellFor(/28 de febrero/));
    expect(screen.getByText("(cumple 27)")).toBeInTheDocument();
  });

  it("29/02 en año bisiesto aparece el 29", async () => {
    await setup([make(1, "Bea", "Leap", 29, 2)], "2028-02-10T15:00:00Z");
    expect(cellFor(/29 de febrero: cumpleaños de Bea Leap/)).toBeInTheDocument();
  });

  it("desde el día 31 de enero el mes siguiente es febrero (no marzo)", async () => {
    const user = await setup([], "2026-01-31T15:00:00Z");
    expect(screen.getByText("enero 2026")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Mes siguiente" }));
    expect(screen.getByText("febrero 2026")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Mes siguiente" }));
    expect(screen.getByText("marzo 2026")).toBeInTheDocument();
  });

  it("cambia de año diciembre -> enero y enero -> diciembre", async () => {
    const user = await setup([], "2026-12-15T15:00:00Z");
    await user.click(screen.getByRole("button", { name: "Mes siguiente" }));
    expect(screen.getByText("enero 2027")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Mes anterior" }));
    expect(screen.getByText("diciembre 2026")).toBeInTheDocument();
  });

  it("'Hoy' vuelve al mes actual", async () => {
    const user = await setup([]);
    await user.click(screen.getByRole("button", { name: "Mes siguiente" }));
    await user.click(screen.getByRole("button", { name: "Hoy" }));
    expect(screen.getByText("marzo 2026")).toBeInTheDocument();
  });

  it("mes sin cumpleaños", async () => {
    await setup([make(1, "Ana", "Soto", 20, 7)]);
    expect(screen.getByText("Sin cumpleaños este mes")).toBeInTheDocument();
  });

  it("varios en un día: panel con el detalle y aria-pressed", async () => {
    const user = await setup([make(1, "Ana", "Soto", 20, 3), make(2, "Bea", "Alva", 20, 3)]);
    const cell = cellFor(/20 de marzo: cumpleaños de Bea Alva, Ana Soto/);
    expect(cell).toHaveAttribute("aria-pressed", "false");
    await user.click(cell);
    expect(cell).toHaveAttribute("aria-pressed", "true");
    const panel = screen.getByRole("complementary", { name: "Detalle del día" });
    expect(within(panel).getByText("Ana Soto")).toBeInTheDocument();
    expect(within(panel).getByText("Bea Alva")).toBeInTheDocument();
  });

  it("muestra error de carga y permite reintentar", async () => {
    setToday("2026-03-15T15:00:00Z");
    getCustomers.mockRejectedValueOnce(new Error("Servidor caído")).mockResolvedValueOnce([make(1, "Ana", "Soto", 20, 3)]);
    const user = userEvent.setup();
    renderWithTheme(<MonthlyCalendar />);
    expect(await screen.findByText("Servidor caído")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByLabelText(/20 de marzo: cumpleaños de Ana Soto/)).toBeInTheDocument();
    expect(screen.queryByText("Servidor caído")).not.toBeInTheDocument();
  });
});
