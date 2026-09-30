import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { cloudflare } from "@cloudflare/vite-plugin";

// Set by `npm run build:cloudflare`; other hosts (Vercel, Netlify) keep the plain build.
const forCloudflare = process.env.DEPLOY_TARGET === "cloudflare";

export default defineConfig({
  plugins: [
    tanstackStart({
      server: { entry: "server" },
    }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
    ...(forCloudflare ? [cloudflare({ viteEnvironment: { name: "ssr" } })] : []),
  ],
});
