import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AppVersion from "./AppVersion";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("AppVersion", () => {
  it("muestra versión, fecha y hash con valores dados", () => {
    render(<AppVersion version="1.2.3" buildDate="2026-11-15" buildId="abc1234" />);
    const el = screen.getByLabelText("Versión de la aplicación");
    expect(el).toHaveTextContent("v1.2.3 · build 2026-11-15 UTC · abc1234");
  });
  it("sin hash muestra solo la fecha", () => {
    render(<AppVersion version="1.2.3" buildDate="2026-11-15" buildId="" />);
    expect(screen.getByTestId("app-version")).toHaveTextContent(/^v1\.2\.3 · build 2026-11-15 UTC$/);
  });
  it("no es focalizable ni interactivo", () => {
    render(<AppVersion version="1.0.0" buildDate="2026-01-01" buildId="" />);
    expect(screen.getByTestId("app-version")).not.toHaveAttribute("tabindex");
  });
  it("usa los valores inyectados en build", async () => {
    vi.resetModules();
    vi.stubGlobal("__APP_VERSION__", "9.8.7");
    vi.stubGlobal("__BUILD_DATE__", "2030-02-03");
    vi.stubGlobal("__BUILD_ID__", "deadbee");
    const { default: Fresh } = await import("./AppVersion");
    render(<Fresh />);
    expect(screen.getByTestId("app-version")).toHaveTextContent("v9.8.7 · build 2030-02-03 UTC · deadbee");
  });
  it("sin definiciones usa el fallback seguro", async () => {
    vi.resetModules();
    const { default: Fresh } = await import("./AppVersion");
    render(<Fresh />);
    expect(screen.getByTestId("app-version")).toHaveTextContent("v0.0.0-dev · dev");
  });
});
