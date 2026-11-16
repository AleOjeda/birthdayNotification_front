export function loginErrorMessage(err) {
  if (err?.status === 429) {
    const base = err.message || "Demasiados intentos. Intente más tarde.";
    if (Number.isFinite(err.retryAfter) && err.retryAfter > 0) {
      const mins = Math.max(1, Math.ceil(err.retryAfter / 60));
      return `${base} Intenta de nuevo en ${mins} min.`;
    }
    return base;
  }
  return err?.message || "No pudimos iniciar sesión. Inténtalo de nuevo.";
}
