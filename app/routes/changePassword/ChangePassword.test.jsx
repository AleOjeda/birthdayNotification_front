import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material/styles";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import theme from "../../theme";
import ChangePassword from "./ChangePassword";
import * as auth from "../../api/auth";
import { ApiError } from "../../api/http";
import { setSession } from "../../lib/session";

vi.mock("../../api/auth");

function Where() {
  return <div data-testid="where">{useLocation().pathname}</div>;
}
function setup() {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={["/cambiar-contrasena"]}>
        <Routes>
          <Route path="/cambiar-contrasena" element={<ChangePassword />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  );
}
const NEW = "nueva-fake-clave-1";
const type = async (u, cur, nw, rep) => {
  if (cur) await u.type(screen.getByLabelText(/^contraseña actual/i), cur);
  if (nw) await u.type(screen.getByLabelText(/^nueva contraseña/i), nw);
  if (rep) await u.type(screen.getByLabelText(/^repetir nueva/i), rep);
};
const submit = (u) => u.click(screen.getByRole("button", { name: "Cambiar contraseña" }));

beforeEach(() => {
  window.sessionStorage.clear();
  setSession({ token: "t-fake", expires_in: 60, user: { must_change_password: true } });
});
afterEach(() => vi.resetAllMocks());

describe("ChangePassword", () => {
  it("renderiza título, explicación obligatoria y política", async () => {
    setup();
    expect(
      screen.getByRole("heading", { level: 1, name: "Cambia tu contraseña" }),
    ).toBeInTheDocument();
    expect(await screen.findByText(/antes de continuar/i)).toBeInTheDocument();
    expect(screen.getByText(/mínimo 12 caracteres/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^contraseña actual/i)).toHaveFocus();
    expect(screen.queryByRole("button", { name: /omitir|más tarde/i })).toBeNull();
  });
  it("valida mínimo 12 y enfoca el primer error", async () => {
    const u = userEvent.setup({ delay: null });
    setup();
    await type(u, "actual-fake", "corta", "corta");
    await submit(u);
    expect(await screen.findByText(/al menos 12 caracteres/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^nueva contraseña/i)).toHaveFocus();
    expect(auth.changePassword).not.toHaveBeenCalled();
  });
  it("valida máximo 72 bytes", async () => {
    const u = userEvent.setup({ delay: null });
    setup();
    const long = "ñ".repeat(40);
    await type(u, "actual-fake", long, long);
    await submit(u);
    expect(await screen.findByText(/No puede superar 72 bytes/)).toBeInTheDocument();
  });
  it("valida coincidencia", async () => {
    const u = userEvent.setup({ delay: null });
    setup();
    await type(u, "actual-fake", NEW, NEW + "x");
    await submit(u);
    expect(await screen.findByText(/no coinciden/i)).toBeInTheDocument();
    expect(auth.changePassword).not.toHaveBeenCalled();
  });
  it("401 Credenciales inválidas se muestra en la contraseña actual", async () => {
    auth.changePassword.mockRejectedValue(new ApiError("Credenciales inválidas", 401));
    const u = userEvent.setup({ delay: null });
    setup();
    await type(u, "actual-fake", NEW, NEW);
    await submit(u);
    expect(await screen.findByText("Credenciales inválidas")).toBeInTheDocument();
    expect(screen.getByLabelText(/^contraseña actual/i)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });
  it("muestra el error del backend (política)", async () => {
    auth.changePassword.mockRejectedValue(
      new ApiError("La contraseña no puede contener tu usuario", 400),
    );
    const u = userEvent.setup({ delay: null });
    setup();
    await type(u, "actual-fake", NEW, NEW);
    await submit(u);
    expect(await screen.findByRole("alert")).toHaveTextContent(/contener tu usuario/i);
  });
  it("éxito: mensaje y navega a /dashboard, sin doble envío", async () => {
    let resolve;
    auth.changePassword.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const u = userEvent.setup({ delay: null });
    setup();
    await type(u, "actual-fake", NEW, NEW);
    await submit(u);
    expect(await screen.findByRole("button", { name: /guardando/i })).toBeDisabled();
    resolve({});
    expect(await screen.findByText(/actualizada correctamente/i)).toBeInTheDocument();
    await waitFor(
      () => expect(screen.getByTestId("where")).toHaveTextContent("/dashboard"),
      { timeout: 3000 },
    );
    expect(auth.changePassword).toHaveBeenCalledTimes(1);
    expect(auth.changePassword).toHaveBeenCalledWith("actual-fake", NEW);
  });
  it("429 muestra los minutos de espera", async () => {
    const err = new ApiError("Demasiados intentos", 429);
    err.retryAfter = 600;
    auth.changePassword.mockRejectedValue(err);
    const u = userEvent.setup({ delay: null });
    setup();
    await type(u, "actual-fake", NEW, NEW);
    await submit(u);
    expect(await screen.findByRole("alert")).toHaveTextContent(/10 min/);
  });
  it("cuenta 12 caracteres por puntos de código", async () => {
    auth.changePassword.mockReturnValue(new Promise(() => {}));
    const u = userEvent.setup({ delay: null });
    setup();
    const twelve = String.fromCodePoint(0x1f600).repeat(12);
    await type(u, "actual-fake", twelve, twelve);
    await submit(u);
    expect(screen.queryByText(/al menos 12 caracteres/i)).toBeNull();
    expect(await screen.findByRole("button", { name: /guardando/i })).toBeDisabled();
  });
  it("cancela el temporizador de 900 ms al desmontar", async () => {
    auth.changePassword.mockResolvedValue({});
    const u = userEvent.setup({ delay: null });
    const view = setup();
    await type(u, "actual-fake", NEW, NEW);
    const set = vi.spyOn(window, "setTimeout");
    const clear = vi.spyOn(window, "clearTimeout");
    await submit(u);
    await screen.findByText(/actualizada correctamente/i);
    const idx = set.mock.calls.findIndex((c) => c[1] === 900);
    expect(idx).toBeGreaterThanOrEqual(0);
    const id = set.mock.results[idx].value;
    view.unmount();
    expect(clear).toHaveBeenCalledWith(id);
    set.mockRestore();
    clear.mockRestore();
  });
});
