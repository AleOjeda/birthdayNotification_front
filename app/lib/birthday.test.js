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
  it("por próximo cumpleaños con desempate por nombre y apellido", () => {
    const list = [c("Ana", "Zapata", 2), c("Luis", "Álvarez", 2), c("Beto", "Álvarez", 2), c("Ana", "Bravo", 2), c("Zoe", "Pérez", 0)];
    const input = [...list];
    const out = sortByNextBirthday(list);
    expect(out.map((x) => `${x.name} ${x.last_name}`)).toEqual([
      "Zoe Pérez",
      "Ana Bravo",
      "Ana Zapata",
      "Beto Álvarez",
      "Luis Álvarez",
    ]);
    expect(list).toEqual(input);
  });
  it("days_until no numérico va al final con desempate estable por nombre", () => {
    const mk = (name, last_name, days_until) => ({ name, last_name, days_until });
    const list = [mk("A", "Zeta", null), mk("B", "Alva", undefined), mk("C", "Pérez", 5), mk("D", "Beta", NaN), mk("E", "Alva", 0)];
    const input = [...list];
    const out = sortByNextBirthday(list);
    expect(out.map((x) => x.name)).toEqual(["E", "C", "A", "B", "D"]);
    expect(list).toEqual(input);
  });
  it("sortByName: mismo apellido, distinto nombre se ordena por nombre", () => {
    const out = sortByName([c("Carlos", "Pérez"), c("Ana", "Pérez"), c("Bea", "Pérez")]);
    expect(out.map((x) => x.name)).toEqual(["Ana", "Bea", "Carlos"]);
  });
  it("sortByName: nombre antes que apellido", () => {
    const out = sortByName([c("Zoe", "Alva"), c("Ana", "Zapata")]);
    expect(out.map((x) => x.name)).toEqual(["Ana", "Zoe"]);
  });
  it("sortByName: mismo nombre se desempata por apellido", () => {
    const out = sortByName([c("Ana", "Zapata"), c("Ana", "Álvarez"), c("Ana", "Muñoz")]);
    expect(out.map((x) => x.last_name)).toEqual(["Álvarez", "Muñoz", "Zapata"]);
  });
  it("tildes y Ñ en español", () => {
    const out = sortByName([c("Beatriz", "X"), c("Ñandú", "X"), c("Nicolás", "X"), c("Álvaro", "X"), c("Oscar", "X")]);
    expect(out.map((x) => x.name)).toEqual(["Álvaro", "Beatriz", "Nicolás", "Ñandú", "Oscar"]);
  });
  it("sortByName: name vacío o nulo va al final", () => {
    const out = sortByName([c("", "Alva"), c("Zoe", "Zeta"), c(null, "Beta"), c("Ana", "Lopez"), c(undefined, "Cruz"), c("  ", "Dia")]);
    expect(out.map((x) => x.name).slice(0, 2)).toEqual(["Ana", "Zoe"]);
    expect(out.slice(2).map((x) => x.last_name).sort()).toEqual(["Alva", "Beta", "Cruz", "Dia"]);
  });
  it("homónimos exactos se ordenan por id sin importar el orden de entrada", () => {
    const h = (id) => ({ id, name: "Ana", last_name: "Pérez", days_until: 3 });
    const a = [h(3), h(1), h(2)];
    const b = [h(2), h(3), h(1)];
    expect(sortByName(a).map((x) => x.id)).toEqual([1, 2, 3]);
    expect(sortByName(b).map((x) => x.id)).toEqual([1, 2, 3]);
    expect(sortByNextBirthday(a).map((x) => x.id)).toEqual([1, 2, 3]);
    expect(sortByNextBirthday(b).map((x) => x.id)).toEqual([1, 2, 3]);
    expect(a.map((x) => x.id)).toEqual([3, 1, 2]);
  });
  it("homónimos que difieren solo en tildes/mayúsculas se ordenan por id", () => {
    const list = [
      { id: 9, name: "JOSÉ", last_name: "Muñoz" },
      { id: 4, name: "jose", last_name: "munoz" },
      { id: 7, name: "José", last_name: "MUÑOZ" },
    ];
    expect(sortByName(list).map((x) => x.id)).toEqual([4, 7, 9]);
    expect(sortByName([...list].reverse()).map((x) => x.id)).toEqual([4, 7, 9]);
  });
  it("id ausente o no numérico no lanza ni altera los demás criterios", () => {
    const list = [
      { name: "Ana", last_name: "B" },
      { id: "x", name: "Ana", last_name: "A" },
      { id: null, name: "Ana", last_name: "A" },
      { id: 1, name: "Ana", last_name: "A" },
    ];
    expect(() => sortByName(list)).not.toThrow();
    expect(() => sortByNextBirthday(list)).not.toThrow();
    expect(sortByName(list).at(-1).last_name).toBe("B");
    expect(sortByName([{ id: 2, name: "Ana" }, { id: 1, name: "Ana" }]).map((x) => x.id)).toEqual([1, 2]);
  });
  it("prefijos: María antes de María José, y María José antes de Mariano (es, base)", () => {
    const out = sortByName([c("Mariano", ""), c("María José", ""), c("María", "")]);
    expect(out.map((x) => x.name)).toEqual(["María", "María José", "Mariano"]);
  });
  it("sortByName no muta la lista", () => {
    const list = [c("Zoe", "A"), c("Ana", "B")];
    const input = [...list];
    const out = sortByName(list);
    expect(out).not.toBe(list);
    expect(list).toEqual(input);
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
