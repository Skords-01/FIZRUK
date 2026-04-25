// Backward-compatible barrel. The real implementation lives next to this
// file (see `./index.ts` for the module-by-module layout). This file
// exists so existing consumers and tests — which import from
// `./useCloudSync.js` — keep working unchanged.
export * from "./index";
