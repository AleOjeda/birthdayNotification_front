import { StrictMode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import { MemoryRouter } from "react-router";
import theme from "../../theme";
import { renderWithTheme } from "../../test/renderWithTheme";
import BirthdayList from "./BirthdayList";
import { getCustomers } from "../../api/customers";

vi.mock("../../api/customers", () => ({
  getCustomers: vi.fn(),
  updateCustomer: vi.fn(),
  deleteCustomer: vi.fn(),
}));

const make = (id, name, last_name, days_until) => ({
  id, name, last_name, birth_day: 15, birth_month: 3, birth_year: null, age: null,
  next_birthday: "2026-12-01", days_until, turning_age: null, birthday: null,
});
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

beforeEach(() => vi.resetAllMocks());

describe("BirthdayList: respuestas obsoletas", () => {
  it("la primera petición (StrictMode) que llega tarde no pisa la lista vigente", async () => {
    const a = deferred();
    const b = deferred();
    getCustomers.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
    render(
      <StrictMode>
        <ThemeProvider theme={theme}>
          <MemoryRouter>
            <BirthdayList />
          </MemoryRouter>
        </ThemeProvider>
      </StrictMode>,
    );
    expect(getCustomers).toHaveBeenCalledTimes(2);
    b.resolve([make(1, "Nueva", "Vigente", 3)]);
    expect(await screen.findByText("Nueva Vigente")).toBeInTheDocument();
    a.resolve([make(9, "Vieja", "Obsoleta", 1)]);
    await new Promise((r) => setTimeout(r, 10));
    expect(screen.queryByText("Vieja Obsoleta")).not.toBeInTheDocument();
    expect(screen.getByText("Nueva Vigente")).toBeInTheDocument();
  });

  it("un error de la petición obsoleta no muestra el aviso de error", async () => {
    const a = deferred();
    const b = deferred();
    getCustomers.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
    render(
      <StrictMode>
        <ThemeProvider theme={theme}>
          <MemoryRouter>
            <BirthdayList />
          </MemoryRouter>
        </ThemeProvider>
      </StrictMode>,
    );
    b.resolve([make(1, "Nueva", "Vigente", 3)]);
    await screen.findByText("Nueva Vigente");
    a.reject(new Error("tarde"));
    await new Promise((r) => setTimeout(r, 10));
    expect(screen.queryByRole("button", { name: "Reintentar" })).not.toBeInTheDocument();
    expect(screen.getByText("Nueva Vigente")).toBeInTheDocument();
  });

  it("respuesta tras desmontar no provoca errores", async () => {
    const a = deferred();
    getCustomers.mockReturnValue(a.promise);
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { unmount } = renderWithTheme(<BirthdayList />);
    unmount();
    a.resolve([make(1, "Ana", "Soto", 0)]);
    await new Promise((r) => setTimeout(r, 10));
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
