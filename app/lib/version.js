/* global __APP_VERSION__, __BUILD_ID__, __BUILD_DATE__, __BUILD_TIME__ */
// Valores inyectados en build con `define` de Vite (vite.config.ts).
// En tests/dev sin definiciones se usan valores por defecto seguros.
export const APP_VERSION =
  typeof __APP_VERSION__ !== "undefined" && __APP_VERSION__ ? __APP_VERSION__ : "0.0.0-dev";
export const BUILD_ID = typeof __BUILD_ID__ !== "undefined" && __BUILD_ID__ ? __BUILD_ID__ : "";
/** Fecha del build en UTC (YYYY-MM-DD). */
export const BUILD_DATE =
  typeof __BUILD_DATE__ !== "undefined" && __BUILD_DATE__ ? __BUILD_DATE__ : "";
/** Instante completo del build (ISO 8601). */
export const BUILD_TIME =
  typeof __BUILD_TIME__ !== "undefined" && __BUILD_TIME__ ? __BUILD_TIME__ : "";

/** Identidad única de un build: cualquier build nuevo la cambia. */
export function buildIdentity(version, buildTime, buildId) {
  return `${version}+${buildTime}+${buildId}`;
}

/** Identidad de la app en ejecución ("" en dev/tests sin build: no se comprueban versiones). */
export const APP_IDENTITY = BUILD_TIME ? buildIdentity(APP_VERSION, BUILD_TIME, BUILD_ID) : "";

/** `v2.0.0 · build 2026-11-15 UTC · abc1234` (omite lo que no exista). */
export function formatVersion(version = APP_VERSION, buildDate = BUILD_DATE, buildId = BUILD_ID) {
  const parts = [`v${version}`];
  if (buildDate) parts.push(`build ${buildDate} UTC`);
  else if (!buildId) parts.push("dev");
  if (buildId) parts.push(buildId);
  return parts.join(" · ");
}
