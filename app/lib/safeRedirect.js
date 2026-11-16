const BLOCKED_PATHS = new Set(["/login", "/cambiar-contrasena"]);
const hasControl = (value) => [...value].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127);

// Decodifica percent-encoding (hasta 3 veces, por doble codificación).
// Devuelve null si la codificación es inválida o excede el tope.
function decodeFully(value) {
  let current = value;
  for (let i = 0; i < 3; i += 1) {
    let next;
    try {
      next = decodeURIComponent(current);
    } catch {
      return null;
    }
    if (next === current) return current;
    current = next;
  }
  // Si tras el tope sigue cambiando, la codificación es sospechosa.
  try {
    if (decodeURIComponent(current) !== current) return null;
  } catch {
    return null;
  }
  return current;
}

// Pathname canónico: decodificado, sin ".", "..", "//" ni "/" final, en minúsculas.
function canonicalPathname(path) {
  const out = [];
  for (const seg of path.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") out.pop();
    else out.push(seg);
  }
  return `/${out.join("/")}`.toLowerCase();
}

// Solo rutas internas: empieza con "/", no con "//", sin "://" ni "\" ni
// caracteres de control (también tras decodificar). /login y
// /cambiar-contrasena no son destinos válidos (evita bucles), sin importar
// mayúsculas, percent-encoding ni segmentos "." / "..".
export function safeNextPath(next, fallback = "/dashboard") {
  if (
    typeof next !== "string" ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.includes("://") ||
    next.includes("\\") ||
    hasControl(next)
  ) {
    return fallback;
  }
  const rawPath = next.split(/[?#]/, 1)[0];
  const decoded = decodeFully(rawPath);
  if (
    decoded === null ||
    hasControl(decoded) ||
    decoded.includes("\\") ||
    decoded.includes("://") ||
    decoded.startsWith("//")
  ) {
    return fallback;
  }
  if (BLOCKED_PATHS.has(canonicalPathname(decoded))) return fallback;
  return next;
}
