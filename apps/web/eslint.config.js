import {
  baseConfigs,
  baseIgnores,
  prettierCompat,
} from "@sergeant/config/eslint.base";

export default [
  baseIgnores,
  ...baseConfigs,
  // DS primitives that legitimately define the eyebrow treatment.
  // SectionHeading owns the uppercase+tracking+text size tokens, Label
  // owns the field-label eyebrow variant, and chartTheme defines the
  // tooltip label token — all three are the single source-of-truth
  // callers should import from.
  {
    files: [
      "src/shared/components/ui/SectionHeading.tsx",
      "src/shared/components/ui/FormField.tsx",
      "src/shared/charts/chartTheme.ts",
    ],
    rules: {
      "sergeant-design/no-eyebrow-drift": "off",
    },
  },
  prettierCompat,
];
