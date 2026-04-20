// Root-level ESLint config for files outside the apps/* workspaces
// (e.g. packages/*, shared scripts). Apps have their own more specific
// eslint.config.js — ESLint picks the nearest config when linting a file,
// so those still win for files under apps/.
import {
  baseConfigs,
  baseIgnores,
  prettierCompat,
} from "@sergeant/config/eslint.base";

export default [
  baseIgnores,
  ...baseConfigs,
  {
    ignores: ["apps/**"],
  },
  prettierCompat,
];
