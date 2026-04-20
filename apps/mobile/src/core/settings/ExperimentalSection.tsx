/**
 * Sergeant Hub-core — ExperimentalSection (React Native, first cut)
 *
 * Mobile mirror of `apps/web/src/core/settings/ExperimentalSection.tsx`.
 *
 * The web version renders `FLAG_REGISTRY` (from
 * `apps/web/src/core/lib/featureFlags.ts`) as toggle rows. The
 * registry + store stack has not yet been lifted into
 * `@sergeant/shared`, so for the first cut we keep a small
 * mobile-local copy of the experimental flags — identical `id` /
 * `label` / `description` / `defaultValue` shape so the section is
 * trivial to rewire once a shared flag store lands.
 *
 * Flag values are persisted via the same MMKV-backed `useLocalStorage`
 * hook used by the web typedStore under the hood (just without the
 * `zod` schema-versioning layer — that lands alongside the shared
 * store port).
 */

import { useLocalStorage } from "@/lib/storage";

import { SettingsGroup, ToggleRow } from "./SettingsPrimitives";

interface FlagDefinition {
  id: string;
  label: string;
  description: string;
  defaultValue: boolean;
}

// TODO(mobile-migration): replace with a shared `FLAG_REGISTRY` once
// `featureFlags` moves into `@sergeant/shared`. Entries here mirror the
// `experimental: true` subset from
// `apps/web/src/core/lib/featureFlags.ts` 1:1.
const EXPERIMENTAL_FLAGS: readonly FlagDefinition[] = [
  {
    id: "finyk_subscriptions_category",
    label: "Категорія «Підписки» у швидкому додаванні",
    description:
      "Додає окрему кнопку для підписок у ManualExpenseSheet (раніше вони потрапляли у «інше»).",
    defaultValue: false,
  },
  {
    id: "hub_command_palette",
    label: "Command Palette (Ctrl/⌘+K)",
    description:
      "Глобальний пошук і дії через клавіатуру. Ранній preview — може не працювати у деяких PWA-кейсах.",
    defaultValue: false,
  },
] as const;

// Mirrors the web `hub_flags_v1` typedStore key (minus the shared-schema
// envelope). See TODO above.
const FLAGS_KEY = "@hub_flags_v1";

type FlagValues = Record<string, boolean>;

export function ExperimentalSection() {
  const [flags, setFlags] = useLocalStorage<FlagValues>(FLAGS_KEY, {});

  if (EXPERIMENTAL_FLAGS.length === 0) return null;

  return (
    <SettingsGroup title="Експериментальне" emoji="🧪">
      {EXPERIMENTAL_FLAGS.map((flag) => (
        <ToggleRow
          key={flag.id}
          label={flag.label}
          description={flag.description}
          checked={flags[flag.id] ?? flag.defaultValue}
          onChange={(next) =>
            setFlags((prev) => ({ ...prev, [flag.id]: next }))
          }
        />
      ))}
    </SettingsGroup>
  );
}
