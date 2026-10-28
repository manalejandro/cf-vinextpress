import { bindings, defineConfig, defineWorker } from "cf/config";
import { createWorkersResponseStoreServiceBindingConfig } from "@vinext/cloudflare/cache/config";

const responseStore = await createWorkersResponseStoreServiceBindingConfig({
  worker: {
    name: "cf-vinextpress-response-store",
    compatibilityDate: "2026-10-22",
    compatibilityFlags: ["nodejs_compat"],
  },
  bucket: "cf-vinextpress-response-store-cache-bodies",
});

export const responseStoreServiceBinding = responseStore.serviceBindingWorker;

export default defineConfig({
  worker: defineWorker({
    ...responseStore.applicationWorker,
    name: "cf-vinextpress",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-10-22",
    compatibilityFlags: ["nodejs_compat"],
    // Production hostname served by this Worker (custom domain).
    domains: ["vp.domain.com"],
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
    },
    // Workers Observability: invocation logs, real-time issues and traces.
    observability: {
      enabled: true,
      headSamplingRate: 1,
      logs: { enabled: true, persist: true },
      traces: { enabled: true, persist: true },
    },
    // Password hashing (PBKDF2) and image transforms need headroom
    // beyond the default 10ms CPU budget.
    limits: {
      cpuMs: 30_000,
    },
    env: {
      ...responseStore.applicationWorker.env,
      ASSETS: bindings.assets(),
      IMAGES: bindings.images(),
      // VinextPress content database (posts, users, comments, options...).
      DB: bindings.d1({
        name: "vp-db",
        id: "",
      }),
      // Media library object storage.
      MEDIA: bindings.r2({ name: "vp-media" }),
    },
  }),
});
