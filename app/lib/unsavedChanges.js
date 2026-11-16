import { useEffect, useRef } from "react";

// Registro global de trabajo en curso (formularios con cambios sin guardar o
// peticiones de guardado en vuelo). La auto-actualización no recarga mientras
// haya algo registrado.
const active = new Set();
const listeners = new Set();

function notify() {
  for (const listener of [...listeners]) listener();
}

export function hasUnsavedChanges() {
  return active.size > 0;
}

/** Suscripción a cambios del registro; devuelve la función para cancelar. */
export function subscribeUnsavedChanges(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Registra trabajo en curso fuera de React (p. ej. una petición de escritura).
 * Devuelve la función que lo libera (idempotente).
 */
export function beginWork() {
  const id = Symbol("work");
  active.add(id);
  notify();
  return () => {
    if (active.delete(id)) notify();
  };
}

/** Marca el componente como "con trabajo en curso" mientras `dirty` sea true. */
export function useUnsavedChanges(dirty) {
  const token = useRef(null);
  if (token.current === null) token.current = Symbol("unsaved");
  useEffect(() => {
    if (!dirty) return undefined;
    const id = token.current;
    active.add(id);
    notify();
    return () => {
      active.delete(id);
      notify();
    };
  }, [dirty]);
}

/** Solo para pruebas. */
export function resetUnsavedChanges() {
  active.clear();
  listeners.clear();
}
