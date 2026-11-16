import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv, type Plugin } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

// Hash corto solo si este directorio es la raíz de su propio repo git; con
// sufijo "-dirty" si el árbol de trabajo tiene cambios. Sin git: "".
function shortHash(): string {
  try {
    const run = (cmd: string) =>
      execSync(cmd, { cwd: process.cwd(), stdio: ["ignore", "pipe", "ignore"] })
        .toString()
        .trim();
    const top = path.resolve(run("git rev-parse --show-toplevel"));
    if (top.toLowerCase() !== path.resolve(process.cwd()).toLowerCase()) return "";
    const hash = run("git rev-parse --short HEAD");
    return run("git status --porcelain") ? `${hash}-dirty` : hash;
  } catch {
    return "";
  }
}

// Identidad del build: cualquier build nuevo la cambia (la hora es única).
// `react-router build` evalúa este config por separado para el build de cliente
// y el de SSR (en el mismo proceso), y `new Date()` daría instantes distintos.
// `process.env` persiste entre esas reevaluaciones, así que el instante se fija
// UNA vez (o lo fija quien invoque con APP_BUILD_TIME) y ambos bundles y
// version.json comparten exactamente la misma identidad.
//
// APP_BUILD_TIME es solo para builds reproducibles o pruebas: exportarlo de
// forma permanente congela la identidad entre builds con el mismo valor (los
// clientes no detectarían la versión nueva). Si no es una fecha ISO válida se
// ignora con un aviso y se genera una nueva.
const rawBuildTime = process.env.APP_BUILD_TIME;
if (rawBuildTime !== undefined && Number.isNaN(Date.parse(rawBuildTime))) {
  console.warn(
    `[build] APP_BUILD_TIME inválido ("${rawBuildTime}"): debe ser una fecha ISO 8601. ` +
      "Se ignora y se usa la hora actual; bórralo del entorno.",
  );
  delete process.env.APP_BUILD_TIME;
}
process.env.APP_BUILD_TIME ??= new Date().toISOString();
const now = new Date(process.env.APP_BUILD_TIME);
const BUILD = {
  version: String(pkg.version),
  buildTime: now.toISOString(),
  buildDate: now.toISOString().slice(0, 10),
  buildId: shortHash(),
};
const IDENTITY = `${BUILD.version}+${BUILD.buildTime}+${BUILD.buildId}`;

// Escribe version.json junto a los assets del cliente (no en el build SSR).
function versionJsonPlugin(): Plugin {
  let isSsr = false;
  return {
    name: "version-json",
    apply: "build",
    configResolved(config) {
      isSsr = Boolean(config.build.ssr);
    },
    // emptyOutDir:false conserva assets de builds anteriores; se limpian solo
    // los del cliente para que no confundan (ni a las pruebas ni al despliegue).
    buildStart() {
      if (isSsr) return;
      rmSync(path.resolve(process.cwd(), "build/client/assets"), { recursive: true, force: true });
    },
    writeBundle(options) {
      if (isSsr || !options.dir) return;
      mkdirSync(options.dir, { recursive: true });
      writeFileSync(
        path.join(options.dir, "version.json"),
        JSON.stringify({
          version: BUILD.version,
          buildTime: BUILD.buildTime,
          buildId: BUILD.buildId,
          identity: IDENTITY,
        }),
      );
    },
  };
}

// export default defineConfig({
//   plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
//   build: {
//     outDir: "build",
//     emptyOutDir: false
//   }
// });


export default defineConfig(({ mode }) => {
  // 1) Carga .env.development o .env.production según mode
  const env = loadEnv(mode, process.cwd())

  return {
    plugins: [
      tailwindcss(),
      reactRouter(),
      tsconfigPaths(),
      versionJsonPlugin(),
    ],
    // 2) Define un global "apiUrl" con el valor de VITE_API_URL
    define: {
      apiUrl: JSON.stringify(env.VITE_API_URL),
      __APP_VERSION__: JSON.stringify(BUILD.version),
      __BUILD_ID__: JSON.stringify(BUILD.buildId),
      __BUILD_DATE__: JSON.stringify(BUILD.buildDate),
      __BUILD_TIME__: JSON.stringify(BUILD.buildTime),
    },
    build: {
      outDir: 'build',
      emptyOutDir: false,
    },
  }
})