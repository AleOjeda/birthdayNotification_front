import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import {
  hasUnsavedChanges,
  resetUnsavedChanges,
  subscribeUnsavedChanges,
  useUnsavedChanges,
} from "./unsavedChanges";

function Probe({ dirty }) {
  useUnsavedChanges(dirty);
  return null;
}

afterEach(() => resetUnsavedChanges());

describe("unsavedChanges", () => {
  it("registra mientras dirty y libera al volver a false", () => {
    const { rerender } = render(<Probe dirty={false} />);
    expect(hasUnsavedChanges()).toBe(false);
    rerender(<Probe dirty />);
    expect(hasUnsavedChanges()).toBe(true);
    rerender(<Probe dirty={false} />);
    expect(hasUnsavedChanges()).toBe(false);
  });

  it("libera al desmontar y notifica a los suscriptores", () => {
    const listener = vi.fn();
    subscribeUnsavedChanges(listener);
    const { unmount } = render(<Probe dirty />);
    expect(listener).toHaveBeenCalledTimes(1);
    unmount();
    expect(listener).toHaveBeenCalledTimes(2);
    expect(hasUnsavedChanges()).toBe(false);
  });

  it("varios componentes: sigue activo hasta que todos terminan", () => {
    const a = render(<Probe dirty />);
    const b = render(<Probe dirty />);
    a.unmount();
    expect(hasUnsavedChanges()).toBe(true);
    act(() => b.unmount());
    expect(hasUnsavedChanges()).toBe(false);
  });

  it("cancelar la suscripción deja de notificar", () => {
    const listener = vi.fn();
    const off = subscribeUnsavedChanges(listener);
    off();
    render(<Probe dirty />);
    expect(listener).not.toHaveBeenCalled();
  });
});
