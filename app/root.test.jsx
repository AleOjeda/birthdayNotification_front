import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";

vi.mock("./lib/version", async (importOriginal) => ({
  ...(await importOriginal()),
  APP_IDENTITY: "2.0.0+2026-11-16T10:00:00.000Z+abc1234",
}));

import App, { ErrorBoundary } from "./root";
import { navigation, resetUpdateGuard } from "./lib/updateGuard";
import { resetUnsavedChanges, useUnsavedChanges } from "./lib/unsavedChanges";

const NEWER = "2.0.0+2026-11-16T12:00:00.000Z+abc1234";
let reload;

function Form() {
  useUnsavedChanges(true);
  return null;
}

const flush = () =>
  act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
const remoteIs = (identity) =>
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, json: async () => ({ identity }) })),
  );

beforeEach(() => {
  reload = vi.spyOn(navigation, "reload").mockImplementation(() => {});
  window.sessionStorage.clear();
  resetUpdateGuard();
  resetUnsavedChanges();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const chunkError = () =>
  new TypeError("Failed to fetch dynamically imported module: https://x/assets/a-1.js");

describe("ErrorBoundary de chunk", () => {
  it("con versión nueva actualiza en vez de mostrar el error técnico", async () => {
    remoteIs(NEWER);
    render(<ErrorBoundary error={chunkError()} params={{}} />);
    expect(screen.getByText("Actualizando la aplicación…")).toBeInTheDocument();
    expect(screen.queryByText(/dynamically imported/)).not.toBeInTheDocument();
    await flush();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("sin versión nueva ofrece actualizar manualmente", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    render(<ErrorBoundary error={chunkError()} params={{}} />);
    await flush();
    expect(reload).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Actualizar ahora" }));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("otros errores siguen mostrando el mensaje genérico", () => {
    render(<ErrorBoundary error={new Error("boom")} params={{}} />);
    expect(screen.getByText("Oops!")).toBeInTheDocument();
  });
});

describe("aviso de nueva versión", () => {
  it("con formulario sucio muestra el aviso accesible y el botón recarga", async () => {
    remoteIs(NEWER);
    render(
      <MemoryRouter>
        <App />
        <Form />
      </MemoryRouter>,
    );
    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    await flush();
    expect(screen.getByRole("status")).toHaveTextContent("Hay una versión nueva de la app.");
    expect(reload).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Actualizar ahora" }));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("si la identidad sigue desfasada tras recargar avisa de Ctrl+F5", async () => {
    window.sessionStorage.setItem(
      "app-update-attempt",
      JSON.stringify({ target: NEWER, at: Date.now() }),
    );
    remoteIs(NEWER);
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    await flush();
    expect(screen.getByRole("status")).toHaveTextContent(
      "No se pudo actualizar. Recarga con Ctrl+F5",
    );
  });
});
