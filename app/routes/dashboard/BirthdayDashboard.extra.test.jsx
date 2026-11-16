import { StrictMode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import { MemoryRouter } from "react-router";
import theme from "../../theme";
import { renderWithTheme } from "../../test/renderWithTheme";
import BirthdayDashboard from "./BirthdayDashboard";
import { getBirthdaysToday, getBirthdaysWeek } from "../../api/customers";

vi.mock("../../api/customers", () => ({
  getBirthdaysToday: vi.fn(),
  getBirthdaysWeek: vi.fn(),
}));

const make = (id, name, last_name, days_until, extra = {}) => ({
  id, name, last_name, birth_day: 20, birth_month: 3, birth_year: null, age: null,
  next_birthday: "2026-03-20", days_until, turning_age: null, birthday: null, ...extra,
});
const section = (title) =>
  screen.getByRole("heading", { name: title, level: 2 }).closest(".MuiCard-root");
const kpi = (label, selector) => screen.getByText(label, selector && { selector }).previousSibling;

const deferred = () => {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
};

beforeEach(() => vi.resetAllMocks());

describe("BirthdayDashboard (casos adicionales)", () => {
  it("/today falla pero /week carga: muestra Próximos, KPI de hoy en —, aviso de advertencia", async () => {
    getBirthdaysToday.mockRejectedValue(new Error("Falla hoy"));
    getBirthdaysWeek.mockResolvedValue([make(2, "Bea", "Alva", 2)]);
    renderWithTheme(<BirthdayDashboard />);
    expect(await screen.findByText("Falla hoy")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveClass("MuiAlert-colorWarning");
    expect(within(section("Hoy")).getByText("Sin datos disponibles.")).toBeInTheDocument();
    expect(within(section("Próximos 7 días")).getByText("Bea Alva")).toBeInTheDocument();
    expect(kpi("Cumpleaños hoy")).toHaveTextContent("—");
    expect(kpi("Próximos 7 días", "p")).toHaveTextContent("1");
  });

  it("days_until null o ausente no aparece en Próximos ni cuenta en el KPI", async () => {
    getBirthdaysToday.mockResolvedValue([]);
    getBirthdaysWeek.mockResolvedValue([
      make(1, "Nula", "Uno", null),
      make(2, "Falta", "Dos", undefined),
      make(3, "Bea", "Alva", 4),
    ]);
    renderWithTheme(<BirthdayDashboard />);
    await screen.findByText("Bea Alva");
    expect(screen.queryByText("Nula Uno")).not.toBeInTheDocument();
    expect(screen.queryByText("Falta Dos")).not.toBeInTheDocument();
    expect(kpi("Próximos 7 días", "p")).toHaveTextContent("1");
  });

  it("KPI: los de hoy que no vienen en /week igual cuentan en Hoy y no restan de Próximos", async () => {
    getBirthdaysToday.mockResolvedValue([make(1, "Ana", "Soto", 0), make(5, "Eva", "Rey", 0)]);
    getBirthdaysWeek.mockResolvedValue([make(2, "Bea", "Alva", 1)]);
    renderWithTheme(<BirthdayDashboard />);
    await screen.findByText("Bea Alva");
    expect(kpi("Cumpleaños hoy")).toHaveTextContent("2");
    expect(kpi("Próximos 7 días", "p")).toHaveTextContent("1");
    expect(within(section("Hoy")).getAllByRole("listitem")).toHaveLength(2);
  });

  it("respuesta no-array se trata como lista vacía", async () => {
    getBirthdaysToday.mockResolvedValue(null);
    getBirthdaysWeek.mockResolvedValue({ error: "x" });
    renderWithTheme(<BirthdayDashboard />);
    expect(await screen.findByText("No hay cumpleaños hoy")).toBeInTheDocument();
  });

  it("descarta la respuesta obsoleta: la primera carga (StrictMode) llega al final y no pisa a la vigente", async () => {
    const t1 = deferred();
    const w1 = deferred();
    const t2 = deferred();
    const w2 = deferred();
    getBirthdaysToday.mockReturnValueOnce(t1.promise).mockReturnValueOnce(t2.promise);
    getBirthdaysWeek.mockReturnValueOnce(w1.promise).mockReturnValueOnce(w2.promise);
    render(
      <StrictMode>
        <ThemeProvider theme={theme}>
          <MemoryRouter>
            <BirthdayDashboard />
          </MemoryRouter>
        </ThemeProvider>
      </StrictMode>,
    );
    expect(getBirthdaysToday).toHaveBeenCalledTimes(2);
    // llega primero la vigente
    t2.resolve([make(1, "Nueva", "Vigente", 0)]);
    w2.resolve([]);
    expect(await screen.findByText("Nueva Vigente")).toBeInTheDocument();
    // luego la obsoleta
    t1.resolve([make(9, "Vieja", "Obsoleta", 0)]);
    w1.resolve([make(8, "Vieja", "Semana", 3)]);
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 10));
    expect(screen.queryByText("Vieja Obsoleta")).not.toBeInTheDocument();
    expect(screen.queryByText("Vieja Semana")).not.toBeInTheDocument();
    expect(screen.getByText("Nueva Vigente")).toBeInTheDocument();
  });

  it("una respuesta que llega tras desmontar no provoca errores", async () => {
    const t = deferred();
    const w = deferred();
    getBirthdaysToday.mockReturnValue(t.promise);
    getBirthdaysWeek.mockReturnValue(w.promise);
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { unmount } = renderWithTheme(<BirthdayDashboard />);
    unmount();
    t.resolve([make(1, "Ana", "Soto", 0)]);
    w.resolve([]);
    await new Promise((r) => setTimeout(r, 10));
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
