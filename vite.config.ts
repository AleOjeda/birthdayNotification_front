import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

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
    ],
    // 2) Define un global "apiUrl" con el valor de VITE_API_URL
    define: {
      apiUrl: JSON.stringify(env.VITE_API_URL)
    },
    build: {
      outDir: 'build',
      emptyOutDir: false,
    },
  }
})