import * as Yup from "yup";
import {
  MONTH_NAMES,
  ageToBirthYear,
  daysInMonth,
  formatDayMonth,
  isLeapYear,
  todayParts,
} from "./birthday";

export const MIN_BIRTH_YEAR = 1900;
export const MAX_AGE = 120;

const cap = (text) => text.charAt(0).toUpperCase() + text.slice(1);
const emptyToUndefined = (value, original) =>
  original === "" || original === null ? undefined : value;

/** Valores iniciales de la parte "cumpleaños" del formulario. */
export function birthdayInitialValues(customer) {
  if (!customer) {
    return { birth_day: "", birth_month: "", year_mode: "none", birth_year: "", age: "" };
  }
  const hasYear = customer.birth_year !== null && customer.birth_year !== undefined;
  return {
    birth_day: customer.birth_day ? String(customer.birth_day) : "",
    birth_month: customer.birth_month ? String(customer.birth_month) : "",
    year_mode: hasYear ? "year" : "none",
    birth_year: hasYear ? String(customer.birth_year) : "",
    age: "",
  };
}

/** Campos Yup de día, mes y año/edad. El backend sigue siendo la autoridad. */
export function birthdaySchemaShape(today = todayParts()) {
  return {
    year_mode: Yup.string().oneOf(["none", "year", "age"]),
    birth_month: Yup.number()
      .transform(emptyToUndefined)
      .typeError("Elige el mes")
      .required("Elige el mes")
      .integer("Elige el mes")
      .min(1, "Elige el mes")
      .max(12, "Elige el mes"),
    birth_day: Yup.number()
      .transform(emptyToUndefined)
      .typeError("Elige el día")
      .required("Elige el día")
      .integer("Elige el día")
      .min(1, "Elige el día")
      .max(31, "Elige el día")
      .test("day-in-month", function (day) {
        const month = Number(this.parent.birth_month);
        if (!day || !month || month < 1 || month > 12) return true;
        const max = daysInMonth(month);
        if (day <= max) return true;
        const name = cap(MONTH_NAMES[month - 1]);
        return this.createError({
          message:
            month === 2
              ? "Febrero tiene como máximo 29 días"
              : `${name} tiene ${max} días`,
        });
      }),
    birth_year: Yup.number()
      .transform(emptyToUndefined)
      .when("year_mode", {
        is: "year",
        then: (schema) =>
          schema
            .typeError("Escribe un año válido")
            .required("Escribe el año de nacimiento")
            .integer("Escribe un año válido")
            .min(MIN_BIRTH_YEAR, `El año debe ser ${MIN_BIRTH_YEAR} o posterior`)
            .max(today.year, `El año no puede ser mayor que ${today.year}`)
            .test("real-date", function (year) {
              const day = Number(this.parent.birth_day);
              const month = Number(this.parent.birth_month);
              if (!year || !day || !month) return true;
              if (month === 2 && day === 29 && !isLeapYear(year)) {
                return this.createError({ message: `El 29 de febrero no existe en ${year}` });
              }
              const future =
                year === today.year &&
                (month > today.month || (month === today.month && day > today.day));
              return future
                ? this.createError({ message: "La fecha de nacimiento no puede ser futura" })
                : true;
            }),
        otherwise: (schema) => schema.nullable().notRequired(),
      }),
    age: Yup.number()
      .transform(emptyToUndefined)
      .when("year_mode", {
        is: "age",
        then: (schema) =>
          schema
            .typeError("Escribe una edad válida")
            .required("Escribe la edad")
            .integer("La edad debe ser un número entero")
            .min(0, "La edad no puede ser negativa")
            .max(MAX_AGE, `La edad no puede superar ${MAX_AGE} años`),
        otherwise: (schema) => schema.nullable().notRequired(),
      }),
  };
}

/**
 * Parte del payload con el cumpleaños. `clearSavedYear` (solo edición): si el
 * registro tenía año y se elige "No sé", se envía birth_year: null.
 * Nunca incluye birth_year y age a la vez.
 */
export function buildBirthdayPayload(values, { clearSavedYear = false } = {}) {
  const payload = {
    birth_day: Number(values.birth_day),
    birth_month: Number(values.birth_month),
  };
  if (values.year_mode === "year") payload.birth_year = Number(values.birth_year);
  else if (values.year_mode === "age") payload.age = Number(values.age);
  else if (clearSavedYear) payload.birth_year = null;
  return payload;
}

/** 29 de febrero con modo Edad: el año derivado podría no ser bisiesto. */
export function isLeapDayWithAge(values) {
  return (
    values.year_mode === "age" &&
    Number(values.birth_day) === 29 &&
    Number(values.birth_month) === 2
  );
}

/** Texto de vista previa; null si faltan datos válidos. */
export function buildPreview(values, today = todayParts()) {
  const day = Number(values.birth_day);
  const month = Number(values.birth_month);
  if (!day || !month) return null;
  const when = formatDayMonth(day, month, true);
  if (values.year_mode === "none") {
    return { main: `Sin año: solo se mostrará el ${when} y no se calculará la edad.` };
  }
  const passed = month < today.month || (month === today.month && day < today.day);
  const nextYear = today.year + (passed ? 1 : 0);
  if (values.year_mode === "year") {
    const year = Number(values.birth_year);
    if (!values.birth_year || !Number.isInteger(year)) return null;
    if (year < MIN_BIRTH_YEAR || year > today.year) return null;
    return { main: `Cumple ${nextYear - year} años el ${when}` };
  }
  const age = Number(values.age);
  if (values.age === "" || !Number.isInteger(age) || age < 0) return null;
  const birthYear = ageToBirthYear(age, day, month, today);
  if (month === 2 && day === 29 && !isLeapYear(birthYear)) {
    return {
      main: `Con esa edad el año sería ${birthYear}, que no es bisiesto: no se podrá guardar con edad. Indica el año de nacimiento.`,
    };
  }
  return {
    main: `Cumple ${nextYear - birthYear} años el ${when}`,
    extra: `Año de nacimiento estimado: ${birthYear}`,
  };
}
