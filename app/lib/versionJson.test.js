// Verifica el artefacto generado por `npm run build` (plugin de vite.config.ts).
// Si aún no hay build, las pruebas se omiten.
import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const clientDir = path.resolve(process.cwd(), "build/client");
const versionFile = path.join(clientDir, "version.json");
const built = existsSync(versionFile);

const serverFile = path.resolve(process.cwd(), "build/server/index.js");
const ISO = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g;

// Chunks de cliente que el build SSR (manifest de React Router) referencia como
// portadores de la identidad: nunca la suma de todos los assets, para que un
// bundle viejo no haga pasar la prueba.
function referencedVersionChunks() {
  const server = readFileSync(serverFile, "utf8");
  return [...new Set(server.match(/assets\/version-[\w-]+\.js/g) ?? [])];
}

describe.skipIf(!built || !existsSync(serverFile))("build/client/version.json", () => {
  const data = built ? JSON.parse(readFileSync(versionFile, "utf8")) : {};

  it("tiene versión, hora, hash e identidad coherentes (sin rutas ni secretos)", () => {
    expect(Object.keys(data).sort()).toEqual(["buildId", "buildTime", "identity", "version"]);
    expect(data.identity).toBe(`${data.version}+${data.buildTime}+${data.buildId}`);
    expect(new Date(data.buildTime).toISOString()).toBe(data.buildTime);
    expect(JSON.stringify(data)).not.toMatch(/[A-Za-z]:\\|\/\//);
  });

  it("el chunk de cliente referenciado por el manifest lleva la identidad exacta", () => {
    const chunks = referencedVersionChunks();
    expect(chunks.length).toBeGreaterThan(0);
    for (const chunk of chunks) {
      const file = path.join(clientDir, chunk);
      expect(existsSync(file)).toBe(true);
      const text = readFileSync(file, "utf8");
      expect(text).toContain(`"${data.buildTime}"`);
      expect(text).toContain(`"${data.version}"`);
      if (data.buildId) expect(text).toContain(`"${data.buildId}"`);
      // Solo esa hora de build, ninguna otra
      expect(new Set(text.match(ISO) ?? [data.buildTime])).toEqual(new Set([data.buildTime]));
    }
  });

  it("cliente, SSR y version.json comparten el MISMO instante de build", () => {
    const server = readFileSync(serverFile, "utf8");
    expect(new Set(server.match(ISO))).toEqual(new Set([data.buildTime]));
  });

  it("no quedan assets de builds anteriores en build/client/assets", () => {
    const assets = readdirSync(path.join(clientDir, "assets")).filter((f) => /^version-.*\.js$/.test(f));
    expect(assets).toEqual(referencedVersionChunks().map((c) => path.basename(c)));
  });
});
