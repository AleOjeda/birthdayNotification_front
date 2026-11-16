// Sesión en sessionStorage. Nunca se loguea ni se expone el token.
const KEY = "bn.session";

// En memoria (por pestaña/carga): ¿hubo sesión? y ¿se cerró manualmente?
// Sirven para decidir si "Tu sesión expiró" tiene sentido. Nunca guardan el token.
let hadSession = false;
let manualLogout = false;

const unauthorizedListeners = new Set();
const mustChangeListeners = new Set();

function storage() {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) return null;
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function write(session) {
  const s = storage();
  if (!s) return;
  try {
    s.setItem(KEY, JSON.stringify(session));
  } catch {
    /* almacenamiento lleno o bloqueado */
  }
}

export function getSession() {
  const s = storage();
  if (!s) return null;
  try {
    const raw = s.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.token !== "string" || !parsed.token) return null;
    hadSession = true;
    return parsed;
  } catch {
    return null;
  }
}

export function clearSession() {
  const s = storage();
  if (!s) return;
  try {
    s.removeItem(KEY);
  } catch {
    /* ignorar */
  }
}

export function getToken() {
  const session = getSession();
  if (!session) return null;
  if (typeof session.expiresAt === "number" && session.expiresAt <= Date.now()) {
    clearSession();
    notifyUnauthorized(); // una sola vez: la sesión ya no existe en las siguientes lecturas
    return null;
  }
  return session.token;
}

export function getUser() {
  return getToken() ? getSession()?.user ?? null : null;
}

export function setSession({ token, expires_in, user }) {
  hadSession = true;
  manualLogout = false;
  const seconds = Number(expires_in);
  write({
    token,
    expiresAt: Date.now() + (Number.isFinite(seconds) ? seconds : 0) * 1000,
    user: user ?? null,
  });
}

export function updateUser(user) {
  const session = getSession();
  if (!session) return;
  write({ ...session, user });
}

function makeSubscription(set) {
  return (callback) => {
    set.add(callback);
    return () => set.delete(callback);
  };
}
const emit = (set) => [...set].forEach((cb) => {
  try {
    cb();
  } catch {
    /* un listener defectuoso no debe afectar a los demás */
  }
});

export const onUnauthorized = makeSubscription(unauthorizedListeners);
export const subscribe = onUnauthorized;
export const onMustChangePassword = makeSubscription(mustChangeListeners);
export const notifyUnauthorized = () => emit(unauthorizedListeners);
export const notifyMustChangePassword = () => emit(mustChangeListeners);

/** Cierre voluntario: no debe mostrarse "Tu sesión expiró". */
export function beginManualLogout() {
  manualLogout = true;
  hadSession = false;
}

/** true solo si hubo sesión real y no fue un logout manual; se consume (una vez). */
export function consumeExpiredNotice() {
  const show = hadSession && !manualLogout;
  hadSession = false;
  return show;
}
