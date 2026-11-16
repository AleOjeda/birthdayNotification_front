import { describe, expect, it } from "vitest";
import * as Yup from "yup";
import {
  birthdayInitialValues,
  birthdaySchemaShape,
  buildBirthdayPayload,
  buildPreview,
  isLeapDayWithAge,
} from "./birthdayForm";

const TODAY = { year: 2026, month: 11, day: 15 };
const schema = Yup.object().shape(birthdaySchemaShape(TODAY));
const base = { birth_day: "15", birth_month: "3", year_mode: "none", birth_year: "", age: "" };

const errorsOf = async (values) => {
  try {
    await schema.validate({ ...base, ...values }, { abortEarly: false });
    return {};
  } catch (e) {
    return Object.fromEntries(e.inner.map((i) => [i.path, i.message]));
  }
};

describe("birthdayInitialValues", () => {
  it("sin cliente: todo vacío y modo No sé", () => {
    expect(birthdayInitialValues(null)).toEqual({
      birth_day: "", birth_month: "", year_mode: "none", birth_year: "", age: "",
    });
  });
  it("cliente con birth_year 0 o null se trata según corresponda", () => {
    expect(birthdayInitialValues({ birth_day: 1, birth_month: 2, birth_year: null }).year_mode).toBe("none");
    expect(birthdayInitialValues({ birth_day: 1, birth_month: 2 }).year_mode).toBe("none");
    expect(birthdayInitialValues({ birth_day: 1, birth_month: 2, birth_year: 1900 })).toMatchObject({
      year_mode: "year", birth_year: "1900",
    });
  });
});

describe("validación de día y mes", () => {
  it("strings vacíos piden día y mes", async () => {
    const e = await errorsOf({ birth_day: "", birth_month: "" });
    expect(e.birth_day).toBe("Elige el día");
    expect(e.birth_month).toBe("Elige el mes");
  });
  it("29/02 es válido en el esquema (sin año)", async () => {
    expect(await errorsOf({ birth_day: "29", birth_month: "2" })).toEqual({});
  });
  it("30/02 y 31/04 se rechazan; 31/12 se acepta", async () => {
    expect((await errorsOf({ birth_day: "30", birth_month: "2" })).birth_day).toBe("Febrero tiene como máximo 29 días");
    expect((await errorsOf({ birth_day: "31", birth_month: "4" })).birth_day).toBe("Abril tiene 30 días");
    expect(await errorsOf({ birth_day: "31", birth_month: "12" })).toEqual({});
  });
  it("día 0, 32 y mes 13 se rechazan", async () => {
    expect((await errorsOf({ birth_day: "0" })).birth_day).toBeDefined();
    expect((await errorsOf({ birth_day: "32" })).birth_day).toBeDefined();
    expect((await errorsOf({ birth_month: "13" })).birth_month).toBeDefined();
  });
});

describe("validación del año de nacimiento", () => {
  const year = (v, extra = {}) => errorsOf({ year_mode: "year", birth_year: v, ...extra });

  it("año vacío en modo Año es requerido", async () => {
    expect((await year("")).birth_year).toBe("Escribe el año de nacimiento");
  });
  it("1900 es el mínimo aceptado; 1899 no", async () => {
    expect(await year("1900")).toEqual({});
    expect((await year("1899")).birth_year).toBe("El año debe ser 1900 o posterior");
  });
  it("año actual: ok si el cumpleaños ya pasó, error si es futuro", async () => {
    expect(await year("2026", { birth_day: "1", birth_month: "1" })).toEqual({});
    expect(await year("2026", { birth_day: "15", birth_month: "11" })).toEqual({});
    expect((await year("2026", { birth_day: "16", birth_month: "11" })).birth_year).toBe(
      "La fecha de nacimiento no puede ser futura",
    );
    expect((await year("2026", { birth_day: "1", birth_month: "12" })).birth_year).toBe(
      "La fecha de nacimiento no puede ser futura",
    );
  });
  it("año posterior al actual se rechaza", async () => {
    expect((await year("2027")).birth_year).toBe("El año no puede ser mayor que 2026");
  });
  it("decimales y texto no numérico se rechazan", async () => {
    expect((await year("1990.5")).birth_year).toBeDefined();
    expect((await year("abc")).birth_year).toBeDefined();
  });
  it("29/02: bisiesto ok; 2023 y 1900 (no bisiesto) fallan; 2000 ok", async () => {
    const leap = { birth_day: "29", birth_month: "2" };
    expect(await year("2024", leap)).toEqual({});
    expect(await year("2000", leap)).toEqual({});
    expect((await year("2023", leap)).birth_year).toBe("El 29 de febrero no existe en 2023");
    expect((await year("1900", leap)).birth_year).toBe("El 29 de febrero no existe en 1900");
  });
  it("en modo No sé un año escrito se ignora", async () => {
    expect(await errorsOf({ year_mode: "none", birth_year: "1500" })).toEqual({});
  });
});

describe("validación de la edad", () => {
  const age = (v) => errorsOf({ year_mode: "age", age: v });

  it("0 y 120 válidos; -1 y 121 no", async () => {
    expect(await age("0")).toEqual({});
    expect(await age("120")).toEqual({});
    expect((await age("-1")).age).toBe("La edad no puede ser negativa");
    expect((await age("121")).age).toBe("La edad no puede superar 120 años");
  });
  it("vacío es requerido; decimal y texto se rechazan", async () => {
    expect((await age("")).age).toBe("Escribe la edad");
    expect((await age("30.5")).age).toBe("La edad debe ser un número entero");
    expect((await age("abc")).age).toBe("Escribe una edad válida");
  });
  it("en modo No sé la edad escrita se ignora", async () => {
    expect(await errorsOf({ year_mode: "none", age: "999" })).toEqual({});
  });
});

describe("buildBirthdayPayload", () => {
  it("No sé: solo día y mes; con clearSavedYear agrega birth_year null", () => {
    expect(buildBirthdayPayload(base)).toEqual({ birth_day: 15, birth_month: 3 });
    expect(buildBirthdayPayload(base, { clearSavedYear: true })).toEqual({
      birth_day: 15, birth_month: 3, birth_year: null,
    });
  });
  it("modo año: solo birth_year; clearSavedYear no lo pisa", () => {
    const p = buildBirthdayPayload(
      { ...base, year_mode: "year", birth_year: "1900", age: "40" },
      { clearSavedYear: true },
    );
    expect(p).toEqual({ birth_day: 15, birth_month: 3, birth_year: 1900 });
    expect(p).not.toHaveProperty("age");
  });
  it("modo edad: age 0 se envía (no se pierde por falsy) y nunca birth_year", () => {
    const p = buildBirthdayPayload(
      { ...base, year_mode: "age", age: "0", birth_year: "1990" },
      { clearSavedYear: true },
    );
    expect(p).toEqual({ birth_day: 15, birth_month: 3, age: 0 });
    expect(p).not.toHaveProperty("birth_year");
  });
  it("edad 120", () => {
    expect(buildBirthdayPayload({ ...base, year_mode: "age", age: "120" }).age).toBe(120);
  });
});

describe("isLeapDayWithAge", () => {
  it("solo con 29/02 y modo edad", () => {
    expect(isLeapDayWithAge({ ...base, birth_day: "29", birth_month: "2", year_mode: "age" })).toBe(true);
    expect(isLeapDayWithAge({ ...base, birth_day: "29", birth_month: "2", year_mode: "year" })).toBe(false);
    expect(isLeapDayWithAge({ ...base, birth_day: "28", birth_month: "2", year_mode: "age" })).toBe(false);
  });
});

describe("buildPreview", () => {
  it("null sin día o mes", () => {
    expect(buildPreview({ ...base, birth_day: "" }, TODAY)).toBeNull();
    expect(buildPreview({ ...base, birth_month: "" }, TODAY)).toBeNull();
  });
  it("sin año: texto sin edad, 29/02 incluido", () => {
    const p = buildPreview({ ...base, birth_day: "29", birth_month: "2" }, TODAY);
    expect(p.main).toBe("Sin año: solo se mostrará el 29 de febrero y no se calculará la edad.");
  });
  it("año fuera de rango o vacío: null", () => {
    expect(buildPreview({ ...base, year_mode: "year", birth_year: "" }, TODAY)).toBeNull();
    expect(buildPreview({ ...base, year_mode: "year", birth_year: "1899" }, TODAY)).toBeNull();
    expect(buildPreview({ ...base, year_mode: "year", birth_year: "2027" }, TODAY)).toBeNull();
  });
  it("año 1900 calcula la edad que cumplirá", () => {
    // 15 de marzo ya pasó en 2026 => próximo cumpleaños 2027
    expect(buildPreview({ ...base, year_mode: "year", birth_year: "1900" }, TODAY).main).toBe(
      "Cumple 127 años el 15 de marzo",
    );
  });
  it("edad 0 y 120 tienen vista previa; vacío o negativa no", () => {
    expect(buildPreview({ ...base, year_mode: "age", age: "0" }, TODAY).extra).toBe(
      "Año de nacimiento estimado: 2026",
    );
    expect(buildPreview({ ...base, year_mode: "age", age: "120" }, TODAY)).not.toBeNull();
    expect(buildPreview({ ...base, year_mode: "age", age: "" }, TODAY)).toBeNull();
    expect(buildPreview({ ...base, year_mode: "age", age: "-3" }, TODAY)).toBeNull();
  });
  it("29/02 con edad cuyo año no es bisiesto avisa y no estima año", () => {
    const p = buildPreview({ ...base, birth_day: "29", birth_month: "2", year_mode: "age", age: "29" }, TODAY);
    expect(p.extra).toBeUndefined();
    expect(p.main).toMatch(/no es bisiesto/);
  });
});
