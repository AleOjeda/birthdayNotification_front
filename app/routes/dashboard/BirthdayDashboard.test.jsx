import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithTheme } from "../../test/renderWithTheme";
import BirthdayDashboard from "./BirthdayDashboard";
import { getBirthdaysToday, getBirthdaysWeek } from "../../api/customers";

vi.mock("../../api/customers", () => ({
  getBirthdaysToday: vi.fn(),
  getBirthdaysWeek: vi.fn(),
}));

const make = (id, name, last_name, days_until, extra = {}) => ({
  id,
  name,
  last_name,
  birth_day: 20,
  birth_month: 3,
  birth_year: null,
  age: null,
  next_birthday: "2026-03-20",
  days_until,
  turning_age: null,
  birthday: null,
  ...extra,
});

const section = (title) =>
  screen.getByRole("heading", { name: title, level: 2 }).closest(".MuiCard-root");

beforeEach(() => vi.resetAllMocks());

describe("BirthdayDashboard", () => {
  it("muestra carga con skeleton", () => {
    getBirthdaysToday.mockReturnValue(new Promise(() => {}));
    getBirthdaysWeek.mockReturnValue(new Promise(() => {}));
    renderWithTheme(<BirthdayDashboard />);
    expect(screen.getAllByRole("status", { name: "Cargando" })).toHaveLength(2);
  });

  it("lista hoy y próximos, sin duplicar a los de hoy, con chips y orden por days_until", async () => {
    getBirthdaysToday.mockResolvedValue([make(1, "Ana", "Soto", 0)]);
    getBirthdaysWeek.mockResolvedValue([
      make(1, "Ana", "Soto", 0),
      make(2, "Bea", "Alva", 1),
      make(4, "Dani", "Paz", 5),
      make(3, "Carla", "Ruiz", 3),
    ]);
    renderWithTheme(<BirthdayDashboard />);
    const hoy = within(await screen.findByText("Ana Soto").then(() => section("Hoy")));
    expect(hoy.getByText("Ana Soto")).toBeInTheDocument();
    expect(hoy.getByText(/Hoy/, { selector: ".MuiChip-label" })).toBeInTheDocument();

    const prox = within(section("Próximos 7 días"));
    expect(prox.queryByText("Ana Soto")).not.toBeInTheDocument();
    expect(screen.getAllByText("Ana Soto")).toHaveLength(1);
    const items = prox.getAllByRole("listitem").map((li) => li.textContent);
    expect(items[0]).toContain("Bea Alva");
    expect(items[0]).toContain("Mañana");
    expect(items[1]).toContain("Carla Ruiz");
    expect(items[1]).toContain("En 3 días");
    expect(items[2]).toContain("Dani Paz");
    expect(items[2]).toContain("En 5 días");

    // KPIs: hoy = 1, próximos (sin hoy) = 3
    expect(screen.getByText("Cumpleaños hoy").previousSibling).toHaveTextContent("1");
    expect(screen.getByText("Próximos 7 días", { selector: "p" }).previousSibling).toHaveTextContent("3");
  });

  it("sin año no muestra 'cumple'; con año sí, junto a la fecha corta", async () => {
    getBirthdaysToday.mockResolvedValue([]);
    getBirthdaysWeek.mockResolvedValue([
      make(1, "Ana", "Soto", 2),
      make(2, "Luis", "Mora", 3, { birth_year: 1995, turning_age: 31 }),
    ]);
    renderWithTheme(<BirthdayDashboard />);
    const prox = within((await screen.findByText("Ana Soto"), section("Próximos 7 días")));
    const [ana, luis] = prox.getAllByRole("listitem");
    expect(ana).toHaveTextContent("20 mar");
    expect(ana).not.toHaveTextContent(/cumple/);
    expect(luis).toHaveTextContent("20 mar · cumple 31");
  });

  it("estado vacío en ambas listas", async () => {
    getBirthdaysToday.mockResolvedValue([]);
    getBirthdaysWeek.mockResolvedValue([]);
    renderWithTheme(<BirthdayDashboard />);
    expect(await screen.findByText("No hay cumpleaños hoy")).toBeInTheDocument();
    expect(screen.getByText("No hay cumpleaños dentro de los próximos 7 días")).toBeInTheDocument();
  });

  it("error total: mensaje del ApiError, KPIs '—' y Reintentar recarga", async () => {
    const err = Object.assign(new Error("Servidor caído"), { name: "ApiError", status: 500 });
    getBirthdaysToday.mockRejectedValueOnce(err).mockResolvedValueOnce([make(1, "Ana", "Soto", 0)]);
    getBirthdaysWeek.mockRejectedValueOnce(err).mockResolvedValueOnce([]);
    const user = userEvent.setup();
    renderWithTheme(<BirthdayDashboard />);
    expect(await screen.findByText("Servidor caído")).toBeInTheDocument();
    expect(screen.getAllByText("—")).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("Ana Soto")).toBeInTheDocument();
    expect(screen.queryByText("Servidor caído")).not.toBeInTheDocument();
  });

  it("error parcial: muestra lo cargado y un aviso", async () => {
    getBirthdaysToday.mockResolvedValue([make(1, "Ana", "Soto", 0)]);
    getBirthdaysWeek.mockRejectedValue(new Error("Falla semana"));
    renderWithTheme(<BirthdayDashboard />);
    expect(await screen.findByText("Falla semana")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveClass("MuiAlert-colorWarning");
    expect(within(section("Hoy")).getByText("Ana Soto")).toBeInTheDocument();
    expect(within(section("Próximos 7 días")).getByText("Sin datos disponibles.")).toBeInTheDocument();
    expect(screen.getAllByText("—")).toHaveLength(1);
  });

  it("enlaces de navegación", async () => {
    getBirthdaysToday.mockResolvedValue([]);
    getBirthdaysWeek.mockResolvedValue([]);
    renderWithTheme(<BirthdayDashboard />);
    await screen.findByText("No hay cumpleaños hoy");
    expect(screen.getByRole("link", { name: /Nuevo/ })).toHaveAttribute("href", "/register");
    expect(screen.getByRole("link", { name: /Ver lista/ })).toHaveAttribute("href", "/list");
    expect(screen.getByRole("link", { name: /Calendario/ })).toHaveAttribute("href", "/calendar");
  });
});
