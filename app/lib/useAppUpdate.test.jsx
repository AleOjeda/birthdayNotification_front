import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router";
import { useAppUpdate } from "./useAppUpdate";
import { resetUnsavedChanges, useUnsavedChanges } from "./unsavedChanges";
import { navigation, resetUpdateGuard, simulateNewDocument } from "./updateGuard";
import { request } from "../api/http";

const CURRENT = "2.0.0+2026-11-16T10:00:00.000Z+abc1234";
const NEWER = "2.0.0+2026-11-16T12:00:00.000Z+abc1234";

let remote;
let fetchMock;
let reload;
let assign;

function Harness({ options }) {
  const { status, updateNow } = useAppUpdate({ currentIdentity: CURRENT, jitterMs: 0, initialDelayMs: 0, ...options });
  const navigate = useNavigate();
  return (
    <div>
      <span data-testid="status">{status}</span>
      <button onClick={updateNow}>now</button>
      <button onClick={() => navigate("/b")}>go-b</button>
      <button onClick={() => navigate("/c")}>go-c</button>
    </div>
  );
}

function Form() {
  useUnsavedChanges(true);
  return null;
}

function tree(options, form = null) {
  return (
    <MemoryRouter>
      <Harness options={options} />
      {form}
    </MemoryRouter>
  );
}

const setup = (options, form) => render(tree(options, form));
const flush = () =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
const setVisibility = (value) =>
  Object.defineProperty(document, "visibilityState", { value, configurable: true });
const becomeVisible = async () => {
  setVisibility("visible");
  act(() => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await flush();
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-16T12:30:00Z"));
  remote = CURRENT;
  fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ identity: remote }) }));
  vi.stubGlobal("fetch", fetchMock);
  reload = vi.spyOn(navigation, "reload").mockImplementation(() => {});
  assign = vi.spyOn(navigation, "assign").mockImplementation(() => {});
  window.sessionStorage.clear();
  resetUpdateGuard();
  resetUnsavedChanges();
  setVisibility("visible");
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  delete document.visibilityState;
});

describe("useAppUpdate", () => {
  it("al volver a la pestaña sin versión nueva no hace nada", async () => {
    setup();
    await becomeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(reload).not.toHaveBeenCalled();
    expect(screen.getByTestId("status")).toHaveTextContent("idle");
  });

  it("al volver a la pestaña con versión nueva recarga automáticamente", async () => {
    setup();
    remote = NEWER;
    await becomeVisible();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("visibilitychange a hidden no consulta", async () => {
    setup();
    setVisibility("hidden");
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await flush();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("focus consulta", async () => {
    setup();
    remote = NEWER;
    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("cada 5 minutos con la pestaña visible; no con la pestaña oculta", async () => {
    setup();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    setVisibility("hidden");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("al desmontar limpia intervalo y listeners", async () => {
    const { unmount } = setup();
    unmount();
    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("tras navegar consulta con throttle de 60 s", async () => {
    setup();
    fireEvent.click(screen.getByText("go-b"));
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText("go-c"));
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60 * 1000);
    });
    fireEvent.click(screen.getByText("go-b"));
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("errores de red al consultar nunca recargan", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    setup();
    await becomeVisible();
    expect(reload).not.toHaveBeenCalled();
    expect(screen.getByTestId("status")).toHaveTextContent("idle");
  });

  it("con formulario sucio NO recarga y avisa; recarga al terminar", async () => {
    const { rerender } = setup(undefined, <Form />);
    remote = NEWER;
    await becomeVisible();
    expect(reload).not.toHaveBeenCalled();
    expect(screen.getByTestId("status")).toHaveTextContent("available");
    rerender(tree());
    await flush();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("con trabajo en curso la navegación de ruta no recarga", async () => {
    setup(undefined, <Form />);
    remote = NEWER;
    await becomeVisible();
    fireEvent.click(screen.getByText("go-b"));
    await flush();
    expect(assign).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it("pendiente y sin trabajo en curso: navegar carga el destino con assign", async () => {
    setup(undefined, <Form />);
    remote = NEWER;
    await becomeVisible();
    resetUnsavedChanges();
    fireEvent.click(screen.getByText("go-b"));
    await flush();
    expect(assign).toHaveBeenCalledWith("/b");
    expect(reload).not.toHaveBeenCalled();
  });

  it("Actualizar ahora siempre recarga", async () => {
    setup(undefined, <Form />);
    remote = NEWER;
    await becomeVisible();
    fireEvent.click(screen.getByText("now"));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("anti-bucle: tras recargar con identidad aún desfasada avisa y no recarga", async () => {
    window.sessionStorage.setItem(
      "app-update-attempt",
      JSON.stringify({ target: NEWER, at: Date.now() - 60_000 }),
    );
    setup();
    await flush();
    expect(screen.getByTestId("status")).toHaveTextContent("failed");
    remote = NEWER;
    await becomeVisible();
    expect(reload).not.toHaveBeenCalled();
    expect(screen.getByTestId("status")).toHaveTextContent("failed");
  });

  it("anti-bucle: pasados 10 minutos vuelve a intentar", async () => {
    window.sessionStorage.setItem(
      "app-update-attempt",
      JSON.stringify({ target: NEWER, at: Date.now() - 11 * 60_000 }),
    );
    setup();
    remote = NEWER;
    await becomeVisible();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("guarda objetivo y hora en sessionStorage y no recarga dos veces en el documento", async () => {
    setup();
    remote = NEWER;
    await becomeVisible();
    await becomeVisible();
    expect(reload).toHaveBeenCalledTimes(1);
    expect(JSON.parse(window.sessionStorage.getItem("app-update-attempt"))).toEqual({
      target: NEWER,
      at: Date.now(),
    });
  });

  it("sessionStorage bloqueado: falla de forma segura, una sola recarga por documento", async () => {
    vi.spyOn(window, "sessionStorage", "get").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    setup();
    remote = NEWER;
    await becomeVisible();
    await becomeVisible();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("anti-bucle con identidades ALTERNAS: A->B, B->A y la tercera se bloquea", async () => {
    // Documento 1 (build A) ve B.
    const doc1 = setup({ currentIdentity: CURRENT });
    remote = NEWER;
    await becomeVisible();
    expect(reload).toHaveBeenCalledTimes(1);
    doc1.unmount();
    // Documento 2 (build B) ve A.
    simulateNewDocument();
    remote = CURRENT;
    const doc2 = setup({ currentIdentity: NEWER });
    await flush();
    expect(screen.getByTestId("status")).toHaveTextContent("idle");
    await becomeVisible();
    expect(reload).toHaveBeenCalledTimes(2);
    doc2.unmount();
    // Documento 3 (build A) ve B: bloqueado, aviso persistente.
    simulateNewDocument();
    remote = NEWER;
    setup({ currentIdentity: CURRENT });
    await flush();
    await becomeVisible();
    expect(reload).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("status")).toHaveTextContent("failed");
    // El historial sobrevive a la coincidencia de identidad.
    expect(JSON.parse(window.sessionStorage.getItem("app-update-attempts")).at).toHaveLength(2);
    // Actualizar ahora (manual) sí recarga.
    fireEvent.click(screen.getByText("now"));
    expect(reload).toHaveBeenCalledTimes(3);
  });

  it("anti-bucle: con el historial expirado vuelve a recargar", async () => {
    const old = Date.now() - 11 * 60_000;
    window.sessionStorage.setItem("app-update-attempts", JSON.stringify({ at: [old, old - 1000] }));
    setup();
    remote = NEWER;
    await becomeVisible();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("anti-bucle: dos recargas recientes bloquean una nueva identidad distinta", async () => {
    const recent = Date.now() - 60_000;
    window.sessionStorage.setItem("app-update-attempts", JSON.stringify({ at: [recent, recent + 1] }));
    setup();
    remote = "2.0.0+2026-11-16T13:00:00.000Z+zzz9999";
    await becomeVisible();
    expect(reload).not.toHaveBeenCalled();
    expect(screen.getByTestId("status")).toHaveTextContent("failed");
  });

  it("comprobación inicial a los 10 s del montaje", async () => {
    setup({ initialDelayMs: 10_000 });
    remote = NEWER;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(9_000);
    });
    expect(fetchMock).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("una petición DELETE en vuelo retrasa la recarga hasta que termina", async () => {
    let finish;
    fetchMock.mockImplementation(async (url, init) => {
      if (init?.method === "DELETE") {
        await new Promise((resolve) => {
          finish = resolve;
        });
        return { ok: true, json: async () => null };
      }
      return { ok: true, json: async () => ({ identity: remote }) };
    });
    setup();
    let pendingDelete;
    act(() => {
      pendingDelete = request("/customers/1", { method: "DELETE" });
    });
    remote = NEWER;
    await becomeVisible();
    expect(reload).not.toHaveBeenCalled();
    expect(screen.getByTestId("status")).toHaveTextContent("available");
    await act(async () => {
      finish();
      await pendingDelete;
    });
    await flush();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("la petición de escritura se libera también ante error", async () => {
    let fail;
    fetchMock.mockImplementation(async (url, init) => {
      if (init?.method === "POST") {
        await new Promise((_, reject) => {
          fail = reject;
        });
      }
      return { ok: true, json: async () => ({ identity: remote }) };
    });
    setup();
    let pendingPost;
    act(() => {
      pendingPost = request("/x", { method: "POST", body: {} }).catch((e) => e);
    });
    remote = NEWER;
    await becomeVisible();
    expect(reload).not.toHaveBeenCalled();
    await act(async () => {
      fail(new TypeError("Failed to fetch"));
      await pendingPost;
    });
    await flush();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("vite:preloadError: previene el error y consulta la versión", async () => {
    setup();
    remote = NEWER;
    const event = new Event("vite:preloadError", { cancelable: true });
    act(() => {
      window.dispatchEvent(event);
    });
    await flush();
    expect(event.defaultPrevented).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("sin identidad (dev) no consulta nada", async () => {
    setup({ currentIdentity: "" });
    await becomeVisible();
    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    await flush();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
