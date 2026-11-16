export const MONTH_NAMES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

export function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export const APP_TIME_ZONE = "America/Santiago";

const todayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

/** Fecha de hoy como { year, month (1-12), day } en la zona America/Santiago (igual que el backend). */
export function todayParts(now = new Date()) {
  const parts = {};
  for (const { type, value } of todayFormatter.formatToParts(now)) {
    if (type === "year" || type === "month" || type === "day") parts[type] = Number(value);
  }
  return { year: parts.year, month: parts.month, day: parts.day };
}

/** formatDayMonth(15, 3) -> '15 mar'; formatDayMonth(15, 3, true) -> '15 de marzo'. */
export function formatDayMonth(day, month, long = false) {
  const name = MONTH_NAMES[month - 1];
  if (!name) return "";
  return long ? `${day} de ${name}` : `${day} ${name.slice(0, 3)}`;
}

/** Sin año, febrero admite 29. */
export function daysInMonth(month, year) {
  if (month === 2) return year == null || isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

export function isValidDayMonth(day, month, year) {
  if (!Number.isInteger(day) || !Number.isInteger(month)) return false;
  if (month < 1 || month > 12 || day < 1) return false;
  return day <= daysInMonth(month, year);
}

/**
 * Año de nacimiento a partir de la edad actual. Si el cumpleaños ya ocurrió
 * (o es hoy) este año: añoActual - edad; si no, uno menos.
 * 29/02 en año no bisiesto se trata como 28/02.
 */
export function ageToBirthYear(age, day, month, today = todayParts()) {
  let d = day;
  if (month === 2 && day === 29 && !isLeapYear(today.year)) d = 28;
  const occurred = today.month > month || (today.month === month && today.day >= d);
  return today.year - age - (occurred ? 0 : 1);
}

export function turningAgeLabel(customer) {
  const n = customer?.turning_age;
  return n === null || n === undefined ? "" : `cumple ${n}`;
}

export function daysUntilLabel(days) {
  if (days === 0) return "Hoy";
  if (days === 1) return "Mañana";
  return `En ${days} días`;
}

const collator = (a, b) => a.localeCompare(b, "es", { sensitivity: "base" });
const isBlank = (s) => s === null || s === undefined || String(s).trim() === "";
const isNum = (n) => typeof n === "number" && !Number.isNaN(n);
/** Desempate final por id; si alguno no es numérico, 0 (nunca lanza). */
const byId = (a, b) => (isNum(a.id) && isNum(b.id) ? a.id - b.id : 0);
/** Nombre primero (vacío/nulo al final), apellido y por último id como desempates. */
const byName = (a, b) => {
  const ab = isBlank(a.name);
  const bb = isBlank(b.name);
  if (ab !== bb) return ab ? 1 : -1;
  return (
    collator(String(a.name ?? ""), String(b.name ?? "")) ||
    collator(String(a.last_name ?? ""), String(b.last_name ?? "")) ||
    byId(a, b)
  );
};

/** Próximos primero; days_until no numérico va al final. Desempate por nombre y apellido. No muta. */
export function sortByNextBirthday(list) {
  return [...list].sort((a, b) => {
    const an = isNum(a.days_until);
    const bn = isNum(b.days_until);
    if (an !== bn) return an ? -1 : 1;
    return (an ? a.days_until - b.days_until : 0) || byName(a, b);
  });
}

/** Minúsculas y sin tildes (también "ñ" -> "n") para búsquedas. */
export function normalizeText(text) {
  return String(text ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

/** Día del mes en que se celebra en `year`: 29/02 en año no bisiesto cae el 28 (igual que el backend). */
export function birthdayDayInYear(customer, year) {
  if (customer.birth_month === 2 && customer.birth_day === 29 && !isLeapYear(year)) return 28;
  return customer.birth_day;
}

/** Edad que cumple en `year`; null si no hay año de nacimiento (nunca se inventa). */
export function ageInYear(customer, year) {
  const by = customer.birth_year;
  return by === null || by === undefined ? null : year - by;
}

export function sortByName(list) {
  return [...list].sort(byName);
}
