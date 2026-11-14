import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    tailwindcss(),
    tanstackStart({ server: { entry: "./src/server.ts" } }),
    react(),
    nitro(
      process.env["VERCEL"]
        ? { preset: "vercel" }
        : {
            ...(process.env["NITRO_PRESET"] ? {} : { preset: "cloudflare-module" as const }),
            output: { dir: "dist" },
          },
    ),
  ],
});
