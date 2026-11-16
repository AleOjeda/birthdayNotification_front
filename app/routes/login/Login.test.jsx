import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material/styles";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import theme from "../../theme";
import Login from "./Login";
import * as auth from "../../api/auth";
import { ApiError } from "../../api/http";
import { setSession } from "../../lib/session";
import { hasUnsavedChanges, resetUnsavedChanges } from "../../lib/unsavedChanges";

vi.mock("../../api/auth");

function Where() {
  const l = useLocation();
  return <div data-testid="where">{l.pathname}</div>;
}
function setup(url = "/login") {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  );
}
const fill = async (u) => {
  await u.type(screen.getByLabelText(/usuario o correo/i), "demo");
  await u.type(screen.getByLabelText(/^contraseña/i), "pw-fake-123");
};
const send = (u) => u.click(screen.getByRole("button", { name: "Ingresar" }));

beforeEach(() => window.sessionStorage.clear());
afterEach(() => vi.resetAllMocks());

describe("Login", () => {
  it("renderiza título, campos y foco inicial", () => {
    setup();
    expect(
      screen.getByRole("heading", { level: 1, name: "Iniciar sesión" }),
    ).toBeInTheDocument();
    const id = screen.getByLabelText(/usuario o correo/i);
    expect(id).toHaveFocus();
    expect(id).toHaveAttribute("autocomplete", "username");
    expect(screen.getByLabelText(/^contraseña/i)).toHaveAttribute(
      "autocomplete",
      "current-password",
    );
  });
  it("muestra y oculta la contraseña", async () => {
    const u = userEvent.setup({ delay: null });
    setup();
    const input = screen.getByLabelText(/^contraseña/i);
    expect(input).toHaveAttribute("type", "password");
    const btn = screen.getByRole("button", { name: /mostrar contraseña/i });
    expect(btn).toHaveAttribute("aria-pressed", "false");
    await u.click(btn);
    expect(input).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: /ocultar contraseña/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
  it("envía con Enter y navega a /dashboard", async () => {
    auth.login.mockResolvedValue({ must_change_password: false });
    const u = userEvent.setup({ delay: null });
    setup();
    await fill(u);
    await u.keyboard("{Enter}");
    expect(auth.login).toHaveBeenCalledWith("demo", "pw-fake-123");
    expect(await screen.findByTestId("where")).toHaveTextContent("/dashboard");
  });
  it("usa next interno seguro", async () => {
    auth.login.mockResolvedValue({ must_change_password: false });
    const u = userEvent.setup({ delay: null });
    setup("/login?next=/list");
    await fill(u);
    await send(u);
    expect(await screen.findByTestId("where")).toHaveTextContent("/list");
  });
  it.each(["//evil.com", "https://x"])("rechaza next externo %s", async (n) => {
    auth.login.mockResolvedValue({ must_change_password: false });
    const u = userEvent.setup({ delay: null });
    setup(`/login?next=${encodeURIComponent(n)}`);
    await fill(u);
    await send(u);
    expect(await screen.findByTestId("where")).toHaveTextContent("/dashboard");
  });
  it("va a /cambiar-contrasena si debe cambiar", async () => {
    auth.login.mockResolvedValue({ must_change_password: true });
    const u = userEvent.setup({ delay: null });
    setup("/login?next=/list");
    await fill(u);
    await send(u);
    expect(await screen.findByTestId("where")).toHaveTextContent("/cambiar-contrasena");
  });
  it("muestra error de credenciales y limpia la contraseña", async () => {
    auth.login.mockRejectedValue(new ApiError("Credenciales inválidas", 401));
    const u = userEvent.setup({ delay: null });
    setup();
    await fill(u);
    await send(u);
    expect(await screen.findByRole("alert")).toHaveTextContent("Credenciales inválidas");
    expect(screen.getByLabelText(/^contraseña/i)).toHaveValue("");
  });
  it("muestra 429 con minutos de espera", async () => {
    auth.login.mockRejectedValue(
      new ApiError("Demasiados intentos. Intente más tarde.", 429, { retryAfter: 120 }),
    );
    const u = userEvent.setup({ delay: null });
    setup();
    await fill(u);
    await send(u);
    expect(await screen.findByRole("alert")).toHaveTextContent(/intenta de nuevo en 2 min/i);
  });
  it("muestra error de red", async () => {
    auth.login.mockRejectedValue(
      new ApiError("No se pudo conectar con el servidor. Revisa tu conexión.", 0),
    );
    const u = userEvent.setup({ delay: null });
    setup();
    await fill(u);
    await send(u);
    expect(await screen.findByRole("alert")).toHaveTextContent(/no se pudo conectar/i);
  });
  it("deshabilita el botón mientras envía (sin doble envío)", async () => {
    let resolve;
    auth.login.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const u = userEvent.setup({ delay: null });
    setup();
    await fill(u);
    await send(u);
    const btn = await screen.findByRole("button", { name: /ingresando/i });
    expect(btn).toBeDisabled();
    resolve({ must_change_password: false });
    await waitFor(() => expect(screen.getByTestId("where")).toBeInTheDocument());
    expect(auth.login).toHaveBeenCalledTimes(1);
  });
  it("valida campos vacíos sin llamar al API", async () => {
    const u = userEvent.setup({ delay: null });
    setup();
    await send(u);
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(auth.login).not.toHaveBeenCalled();
  });
  it("redirige si ya hay sesión válida", async () => {
    setSession({ token: "t-fake", expires_in: 60, user: {} });
    setup();
    expect(await screen.findByTestId("where")).toHaveTextContent("/dashboard");
  });
  it("no deja el token en el DOM", async () => {
    auth.login.mockRejectedValue(new ApiError("Credenciales inválidas", 401));
    const u = userEvent.setup({ delay: null });
    const { container } = setup();
    await fill(u);
    await send(u);
    await screen.findByRole("alert");
    expect(container.innerHTML).not.toMatch(/Bearer|t-fake/);
  });
});

describe("Login versión", () => {
  it("muestra la versión de la aplicación", () => {
    setup();
    expect(screen.getByLabelText("Versión de la aplicación")).toHaveTextContent(/^v[0-9]+[.][0-9]+[.][0-9]+/);
  });
});

describe('Login y auto-actualización', () => {
  afterEach(() => resetUnsavedChanges());
  it('marca trabajo en curso al escribir y lo libera al desmontar', async () => {
    const u = userEvent.setup();
    const { unmount } = setup();
    expect(hasUnsavedChanges()).toBe(false);
    await u.type(screen.getByLabelText(/usuario o correo/i), 'demo');
    expect(hasUnsavedChanges()).toBe(true);
    unmount();
    expect(hasUnsavedChanges()).toBe(false);
  });
  it('la versión va en el flujo (no absoluta) para no solapar la tarjeta', () => {
    setup();
    const v = screen.getByTestId('app-version');
    expect(getComputedStyle(v).position).not.toBe('absolute');
  });
});
