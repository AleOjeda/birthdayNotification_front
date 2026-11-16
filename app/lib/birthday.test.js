import { describe, expect, it } from "vitest";
import {
  MONTH_NAMES,
  ageToBirthYear,
  daysInMonth,
  daysUntilLabel,
  formatDayMonth,
  ageInYear,
  birthdayDayInYear,
  isValidDayMonth,
  normalizeText,
  sortByName,
  sortByNextBirthday,
  todayParts,
  turningAgeLabel,
} from "./birthday";

describe("formatDayMonth", () => {
  it("formato corto y largo", () => {
    expect(MONTH_NAMES).toHaveLength(12);
    expect(formatDayMonth(15, 3)).toBe("15 mar");
    expect(formatDayMonth(15, 3, true)).toBe("15 de marzo");
    expect(formatDayMonth(1, 13)).toBe("");
  });
});

describe("daysInMonth / isValidDayMonth", () => {
  it("febrero 29 sin año", () => {
    expect(daysInMonth(2)).toBe(29);
    expect(daysInMonth(2, 2023)).toBe(28);
    expect(daysInMonth(2, 2024)).toBe(29);
    expect(daysInMonth(2, 1900)).toBe(28);
    expect(daysInMonth(4)).toBe(30);
    expect(daysInMonth(12)).toBe(31);
  });
  it("valida", () => {
    expect(isValidDayMonth(29, 2)).toBe(true);
    expect(isValidDayMonth(29, 2, 2023)).toBe(false);
    expect(isValidDayMonth(31, 4)).toBe(false);
    expect(isValidDayMonth(0, 4)).toBe(false);
    expect(isValidDayMonth(1, 13)).toBe(false);
  });
});

describe("ageToBirthYear", () => {
  const today = { year: 2026, month: 6, day: 15 };
  it("cumpleaños ya ocurrido o el mismo día", () => {
    expect(ageToBirthYear(30, 1, 3, today)).toBe(1996);
    expect(ageToBirthYear(30, 15, 6, today)).toBe(1996);
  });
  it("cumpleaños aún no ocurrido", () => {
    expect(ageToBirthYear(30, 16, 6, today)).toBe(1995);
    expect(ageToBirthYear(30, 1, 12, today)).toBe(1995);
  });
  it("29/02 se trata como 28/02 en año no bisiesto", () => {
    expect(ageToBirthYear(10, 29, 2, { year: 2027, month: 2, day: 28 })).toBe(2017);
    expect(ageToBirthYear(10, 29, 2, { year: 2027, month: 2, day: 27 })).toBe(2016);
    expect(ageToBirthYear(10, 29, 2, { year: 2028, month: 2, day: 28 })).toBe(2017);
    expect(ageToBirthYear(10, 29, 2, { year: 2028, month: 2, day: 29 })).toBe(2018);
  });
});

describe("etiquetas", () => {
  it("turningAgeLabel nunca inventa", () => {
    expect(turningAgeLabel({ turning_age: 31 })).toBe("cumple 31");
    expect(turningAgeLabel({ turning_age: null })).toBe("");
    expect(turningAgeLabel({})).toBe("");
  });
  it("daysUntilLabel", () => {
    expect(daysUntilLabel(0)).toBe("Hoy");
    expect(daysUntilLabel(1)).toBe("Mañana");
    expect(daysUntilLabel(5)).toBe("En 5 días");
  });
});

describe("ordenamiento", () => {
  const c = (name, last_name, days_until = 0) => ({ name, last_name, days_until });
  it("por próximo cumpleaños con desempate por apellido y nombre", () => {
    const list = [c("Ana", "Zapata", 2), c("Luis", "Álvarez", 2), c("Beto", "Álvarez", 2), c("Zoe", "Pérez", 0)];
    const input = [...list];
    const out = sortByNextBirthday(list);
    expect(out.map((x) => x.name)).toEqual(["Zoe", "Beto", "Luis", "Ana"]);
    expect(list).toEqual(input);
  });
  it("days_until no numérico va al final con desempate estable por nombre", () => {
    const mk = (name, last_name, days_until) => ({ name, last_name, days_until });
    const list = [mk("A", "Zeta", null), mk("B", "Alva", undefined), mk("C", "Pérez", 5), mk("D", "Beta", NaN), mk("E", "Alva", 0)];
    const input = [...list];
    const out = sortByNextBirthday(list);
    expect(out.map((x) => x.name)).toEqual(["E", "C", "B", "D", "A"]);
    expect(list).toEqual(input);
  });
  it("tildes y Ñ en español", () => {
    const out = sortByName([c("A", "Zeta"), c("B", "Ñandú"), c("C", "Nube"), c("D", "Álamo"), c("E", "Oso")]);
    expect(out.map((x) => x.last_name)).toEqual(["Álamo", "Nube", "Ñandú", "Oso", "Zeta"]);
  });
});

describe("todayParts", () => {
  it("usa la zona America/Santiago, no la del navegador", () => {
    // 02:00 UTC de enero = 23:00 del día anterior en Santiago (UTC-3)
    expect(todayParts(new Date("2026-01-01T02:00:00Z"))).toEqual({ year: 2025, month: 12, day: 31 });
    // junio: UTC-4
    expect(todayParts(new Date("2026-06-15T03:30:00Z"))).toEqual({ year: 2026, month: 6, day: 14 });
    expect(todayParts(new Date("2026-06-15T12:00:00Z"))).toEqual({ year: 2026, month: 6, day: 15 });
  });
  it("sin argumento devuelve la fecha actual", () => {
    const t = todayParts();
    expect(t.year).toBeGreaterThan(2000);
    expect(t.month).toBeGreaterThanOrEqual(1);
  });
});

describe("normalizeText / birthdayDayInYear / ageInYear", () => {
  it("quita tildes y mayúsculas", () => {
    expect(normalizeText("JOSÉ Núñez")).toBe("jose nunez");
    expect(normalizeText(null)).toBe("");
  });
  it("29/02 cae el 28 en año no bisiesto", () => {
    const p = { birth_day: 29, birth_month: 2 };
    expect(birthdayDayInYear(p, 2027)).toBe(28);
    expect(birthdayDayInYear(p, 2028)).toBe(29);
    expect(birthdayDayInYear({ birth_day: 29, birth_month: 3 }, 2027)).toBe(29);
  });
  it("edad solo con año", () => {
    expect(ageInYear({ birth_year: 1990 }, 2026)).toBe(36);
    expect(ageInYear({ birth_year: null }, 2026)).toBeNull();
  });
});
