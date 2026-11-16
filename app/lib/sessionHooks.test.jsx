import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StrictMode, useEffect } from "react";
import { act, render, renderHook, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router";
import {
  EXPIRED_MESSAGE,
  MAX_TIMEOUT_MS,
  useSessionEvents,
  useSessionExpiry,
} from "./sessionHooks";
import {
  beginManualLogout,
  consumeExpiredNotice,
  getSession,
  notifyMustChangePassword,
  notifyUnauthorized,
  onUnauthorized,
  setSession,
} from "./session";

function Where() {
  const l = useLocation();
  return <div data-testid="where">{l.pathname + l.search}</div>;
}
const navCount = { n: 0 };
function Events() {
  const { notice } = useSessionEvents();
  const loc = useLocation();
  useEffect(() => {
    navCount.n += 1;
  }, [loc.key]);
  return (
    <>
      <Where />
      {notice && <p>{notice}</p>}
    </>
  );
}
const app = (path) => (
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="*" element={<Events />} />
    </Routes>
  </MemoryRouter>
);

const offs = [];
beforeEach(() => {
  window.sessionStorage.clear();
  navCount.n = 0;
  setSession({ token: "t-fake", expires_in: 600, user: {} });
});
afterEach(() => {
  offs.splice(0).forEach((off) => off());
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useSessionEvents", () => {
  it("redirige UNA vez a /login?next con varias notificaciones y avisa", () => {
    render(app("/list?x=1"));
    act(() => {
      notifyUnauthorized();
      notifyUnauthorized();
      notifyUnauthorized();
    });
    expect(screen.getByTestId("where")).toHaveTextContent("/login?next=%2Flist%3Fx%3D1");
    expect(screen.getByText(EXPIRED_MESSAGE)).toBeInTheDocument();
    act(() => notifyUnauthorized());
    expect(screen.getByTestId("where")).toHaveTextContent("/login?next=%2Flist%3Fx%3D1");
  });
  it("en /login no navega ni avisa", () => {
    render(app("/login"));
    act(() => notifyUnauthorized());
    expect(screen.getByTestId("where")).toHaveTextContent("/login");
    expect(screen.queryByText(EXPIRED_MESSAGE)).toBeNull();
  });
  it("mustChangePassword navega a /cambiar-contrasena", () => {
    render(app("/dashboard"));
    act(() => notifyMustChangePassword());
    expect(screen.getByTestId("where")).toHaveTextContent("/cambiar-contrasena");
  });
  it("limpia suscripciones al desmontar: no navega ni actualiza tras desmontar", () => {
    const tracker = { path: "" };
    function Probe() {
      tracker.path = useLocation().pathname;
      return <Events />;
    }
    const { unmount } = render(
      <MemoryRouter initialEntries={["/list"]}>
        <Routes>
          <Route path="*" element={<Probe />} />
        </Routes>
      </MemoryRouter>,
    );
    const addSpy = vi.spyOn(window, "removeEventListener");
    unmount();
    const countAfterUnmount = navCount.n;
    act(() => {
      notifyUnauthorized();
      notifyMustChangePassword();
      window.dispatchEvent(Object.assign(new Event("pageshow"), { persisted: true }));
    });
    expect(tracker.path).toBe("/list");
    expect(navCount.n).toBe(countAfterUnmount);
    expect(addSpy).toHaveBeenCalledWith("pageshow", expect.any(Function));
  });
  it("StrictMode: una sola redirección y una sola suscripción efectiva", () => {
    render(<StrictMode>{app("/list")}</StrictMode>);
    const before = navCount.n;
    act(() => {
      notifyUnauthorized();
      notifyUnauthorized();
    });
    expect(screen.getByTestId("where")).toHaveTextContent("/login?next=%2Flist");
    expect(navCount.n - before).toBe(1);
    expect(screen.getAllByText(EXPIRED_MESSAGE)).toHaveLength(1);
  });
  it("mustChangePassword con varias notificaciones redirige una sola vez", () => {
    render(app("/dashboard"));
    const before = navCount.n;
    act(() => {
      notifyMustChangePassword();
      notifyMustChangePassword();
      notifyMustChangePassword();
    });
    expect(screen.getByTestId("where")).toHaveTextContent("/cambiar-contrasena");
    expect(navCount.n - before).toBe(1);
  });
  it("sin sesión previa en la pestaña redirige pero no avisa de expiración", () => {
    window.sessionStorage.clear();
    consumeExpiredNotice(); // simula una pestaña que nunca tuvo sesión
    render(app("/list"));
    act(() => notifyUnauthorized());
    expect(screen.getByTestId("where")).toHaveTextContent("/login?next=%2Flist");
    expect(screen.queryByText(EXPIRED_MESSAGE)).toBeNull();
  });
  it("el logout manual no muestra el aviso aunque la sesión ya venciera", () => {
    render(app("/list"));
    beginManualLogout();
    act(() => notifyUnauthorized());
    expect(screen.getByTestId("where")).toHaveTextContent("/login");
    expect(screen.queryByText(EXPIRED_MESSAGE)).toBeNull();
  });
  it("el aviso se retira al llegar a una ruta autenticada", () => {
    function Go() {
      const navigate = useNavigate();
      return (
        <button
          onClick={() => {
            setSession({ token: "t-nuevo", expires_in: 600, user: {} });
            navigate("/dashboard");
          }}
        >
          entrar
        </button>
      );
    }
    render(
      <MemoryRouter initialEntries={["/list"]}>
        <Routes>
          <Route path="/login" element={<><Events /><Go /></>} />
          <Route path="*" element={<Events />} />
        </Routes>
      </MemoryRouter>,
    );
    act(() => notifyUnauthorized());
    expect(screen.getByText(EXPIRED_MESSAGE)).toBeInTheDocument();
    act(() => screen.getByText("entrar").click());
    expect(screen.getByTestId("where")).toHaveTextContent("/dashboard");
    expect(screen.queryByText(EXPIRED_MESSAGE)).toBeNull();
  });
  it("pageshow persistido sin sesión navega a /login con aviso", () => {
    render(app("/list"));
    window.sessionStorage.clear();
    act(() => {
      window.dispatchEvent(Object.assign(new Event("pageshow"), { persisted: true }));
    });
    expect(screen.getByTestId("where")).toHaveTextContent("/login?next=%2Flist");
  });
  it("pageshow no persistido o con sesión vigente no navega", () => {
    render(app("/list"));
    act(() => {
      window.dispatchEvent(Object.assign(new Event("pageshow"), { persisted: true }));
    });
    window.sessionStorage.clear();
    act(() => {
      window.dispatchEvent(Object.assign(new Event("pageshow"), { persisted: false }));
    });
    expect(screen.getByTestId("where")).toHaveTextContent("/list");
  });
});

describe("useSessionExpiry", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
  });
  const listen = () => {
    const cb = vi.fn();
    offs.push(onUnauthorized(cb));
    return cb;
  };
  it("dispara notifyUnauthorized al vencer y limpia la sesión", () => {
    setSession({ token: "t-fake", expires_in: 30, user: {} });
    const exp = getSession().expiresAt;
    const cb = listen();
    renderHook(() => useSessionExpiry(exp));
    vi.advanceTimersByTime(29_000);
    expect(cb).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2_000);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(getSession()).toBeNull();
  });
  it("se cancela al desmontar", () => {
    setSession({ token: "t-fake", expires_in: 30, user: {} });
    const exp = getSession().expiresAt;
    const cb = listen();
    const { unmount } = renderHook(() => useSessionExpiry(exp));
    unmount();
    vi.advanceTimersByTime(60_000);
    expect(cb).not.toHaveBeenCalled();
  });
  it("se reprograma al cambiar la sesión", () => {
    const cb = listen();
    const t0 = Date.now();
    setSession({ token: "t-fake", expires_in: 30, user: {} });
    const { rerender } = renderHook(({ e }) => useSessionExpiry(e), {
      initialProps: { e: t0 + 30_000 },
    });
    setSession({ token: "t-fake2", expires_in: 300, user: {} });
    rerender({ e: t0 + 300_000 });
    vi.advanceTimersByTime(60_000);
    expect(cb).not.toHaveBeenCalled();
    vi.advanceTimersByTime(250_000);
    expect(cb).toHaveBeenCalledTimes(1);
  });
  it("respeta el tope de setTimeout y re-arma con tiempos muy largos", () => {
    setSession({ token: "t-fake", expires_in: 40 * 24 * 3600, user: {} });
    const exp = getSession().expiresAt;
    const cb = listen();
    const spy = vi.spyOn(globalThis, "setTimeout");
    renderHook(() => useSessionExpiry(exp));
    expect(spy.mock.calls[0][1]).toBeLessThanOrEqual(MAX_TIMEOUT_MS);
    vi.advanceTimersByTime(41 * 24 * 3600 * 1000);
    expect(cb).toHaveBeenCalledTimes(1);
  });
});
