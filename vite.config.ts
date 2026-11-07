// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  vite: {
    plugins: [
      {
        name: "reject-public-secrets",
        configResolved(config) {
          const unsafeKeys = [
            "VITE_SUPABASE_SERVICE_ROLE",
            "VITE_SUPABASE_SERVICE_ROLE_KEY",
            "VITE_TELEGRAM_BOT_TOKEN",
            "VITE_TELEGRAM_TOKEN",
            "VITE_APP_PASSWORD",
          ].filter((key) => config.env[key]);

          if (unsafeKeys.length) {
            throw new Error(
              `Variáveis secretas não podem usar o prefixo VITE_: ${unsafeKeys.join(", ")}. Remova-as e configure as versões apenas no servidor.`,
            );
          }
        },
      },
    ],
  },
  // Force the production build to target Vercel. Without this, the Lovable default can
  // generate a Cloudflare bundle, which causes the static asset/chunk mismatch seen in 
  // production (`assets/...js` returning 404 and the app falling into the generic error page).
  nitro: {
    preset: "vercel",
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
