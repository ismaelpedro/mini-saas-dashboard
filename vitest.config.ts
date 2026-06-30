import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.test" });

const alias = { "@": fileURLToPath(new URL(".", import.meta.url)) };
const shared = { globals: true, setupFiles: ["./vitest.setup.ts"] };

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      {
        plugins: [react()],
        resolve: { alias },
        test: { ...shared, name: "node", environment: "node", include: ["tests/**/*.test.ts"] },
      },
      {
        plugins: [react()],
        resolve: { alias },
        test: { ...shared, name: "dom", environment: "jsdom", include: ["tests/**/*.test.tsx"] },
      },
    ],
  },
});
