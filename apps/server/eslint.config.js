import {
  baseConfigs,
  baseIgnores,
  prettierCompat,
} from "@sergeant/config/eslint.base";

export default [baseIgnores, ...baseConfigs, prettierCompat];
