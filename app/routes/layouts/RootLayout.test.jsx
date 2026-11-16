import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material/styles";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import theme from "../../theme";
import RootLayout, { shouldRevalidate } from "./RootLayout";
import { createMemoryRouter, RouterProvider, Link } from "react-router";
import * as auth from "../../api/auth";
import { getSession, onUnauthorized, setSession } from "../../lib/session";

vi.mock("../../api/auth");

function Where() {
  return <div data-testid="where">{useLocation().pathname}</div>;
}
function setup() {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route element={<RootLayout />}>
            <Route path="/dashboard" element={<p>contenido privado</p>} />
          </Route>
          <Route path="/login" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

const offs = [];
beforeEach(() => {
  window.sessionStorage.clear();
  setSession({
    token: "t-secreto-fake",
    expires_in: 600,
    user: { id: 1, username: "demo", name: "Ana Demo" },
  });
  window.matchMedia ??= () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  });
});
afterEach(() => {
  offs.splice(0).forEach((off) => off());
  vi.resetAllMocks();
  vi.useRealTimers();
});

describe("RootLayout AppBar", () => {
  it("muestra el nombre del usuario y nunca el token", () => {
    const { container } = setup();
    expect(screen.getByTestId("appbar-user")).toHaveTextContent("Ana Demo");
    expect(container.innerHTML).not.toContain("t-secreto-fake");
  });
  it("usa username si no hay name", () => {
    setSession({ token: "t-fake", expires_in: 60, user: { username: "solo_user" } });
    setup();
    expect(screen.getByTestId("appbar-user")).toHaveTextContent("solo_user");
  });
  it("cerrar sesión llama logout, limpia y navega a /login", async () => {
    auth.logout.mockImplementation(async () => {
      window.sessionStorage.clear();
    });
    const user = userEvent.setup({ delay: null });
    setup();
    await user.click(screen.getAllByRole("button", { name: "Cerrar sesión" })[0]);
    expect(auth.logout).toHaveBeenCalledTimes(1);
    expect(await screen.findByTestId("where")).toHaveTextContent("/login");
    expect(screen.queryByText("contenido privado")).toBeNull();
    expect(screen.queryByText("Ana Demo")).toBeNull();
    expect(getSession()).toBeNull();
  });
  it("bloquea el doble clic mientras cierra sesión", async () => {
    let done;
    auth.logout.mockReturnValue(new Promise((r) => (done = r)));
    const user = userEvent.setup({ delay: null });
    setup();
    const btn = screen.getAllByRole("button", { name: "Cerrar sesión" })[0];
    await user.click(btn);
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(auth.logout).toHaveBeenCalledTimes(1);
    expect(btn).toBeDisabled();
    done();
    await waitFor(() => expect(screen.getByTestId("where")).toBeInTheDocument());
  });
  it("el temporizador de expiración notifica y se cancela al desmontar", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    setSession({ token: "t-fake", expires_in: 30, user: { name: "Ana" } });
    const cb = vi.fn();
    offs.push(onUnauthorized(cb));
    const first = setup();
    first.unmount();
    vi.advanceTimersByTime(40_000);
    expect(cb).not.toHaveBeenCalled();
    setSession({ token: "t-fake", expires_in: 30, user: { name: "Ana" } });
    setup();
    vi.advanceTimersByTime(31_000);
    expect(cb).toHaveBeenCalledTimes(1);
  });
});

describe("RootLayout versión y revalidación", () => {
  it("muestra la versión en el Drawer permanente y en el móvil", () => {
    setup();
    expect(screen.getAllByLabelText("Versión de la aplicación")).toHaveLength(2);
    expect(screen.getAllByTestId("app-version")[0]).toHaveTextContent(/^v[0-9]+[.][0-9]+[.][0-9]+/);
  });
  it("shouldRevalidate siempre revalida", () => {
    expect(shouldRevalidate()).toBe(true);
  });
  it("el guard se ejecuta al navegar entre rutas protegidas", async () => {
    const loader = vi.fn(() => null);
    const router = createMemoryRouter(
      [
        {
          Component: RootLayout,
          loader,
          shouldRevalidate,
          children: [
            { path: "/dashboard", element: <Link to="/list">ir</Link> },
            { path: "/list", element: <p>lista</p> },
          ],
        },
      ],
      { initialEntries: ["/dashboard"] },
    );
    const user = userEvent.setup({ delay: null });
    render(
      <ThemeProvider theme={theme}>
        <RouterProvider router={router} />
      </ThemeProvider>,
    );
    await screen.findByText("ir");
    const before = loader.mock.calls.length;
    await user.click(screen.getByText("ir"));
    await screen.findByText("lista");
    expect(loader.mock.calls.length).toBeGreaterThan(before);
  });
});
