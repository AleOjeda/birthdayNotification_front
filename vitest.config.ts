import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["./app/test/setup.ts"],
    include: ["app/**/*.test.{js,jsx,ts,tsx}"],
    css: false,
    testTimeout: 15000,
  },
});
