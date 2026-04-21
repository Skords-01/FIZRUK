/**
 * Sergeant Hub — StatusRow (mobile)
 *
 * Single row in the mobile dashboard's module list. Visual layout
 * mirrors the web `StatusRow` inside `apps/web/src/core/HubDashboard.tsx`
 * (accent bar → icon tile → label + description → chevron) but drops
 * the preview-stats block until the quick-stats writers land in a
 * follow-up PR (Phase 3 in the migration plan).
 *
 * Rendering is memoised because the dashboard re-renders on every
 * MMKV-backed write to the order key and each row's render cost
 * includes a small tree of native views.
 */

import { memo } from "react";
import { Pressable, Text, View } from "react-native";

import type { DashboardModuleId } from "@sergeant/shared";

import { DASHBOARD_MODULE_RENDER } from "./dashboardModuleConfig";

export interface StatusRowProps {
  id: DashboardModuleId;
  onPress?: (id: DashboardModuleId) => void;
  disabled?: boolean;
  testID?: string;
}

export const StatusRow = memo(function StatusRow({
  id,
  onPress,
  disabled,
  testID,
}: StatusRowProps) {
  const config = DASHBOARD_MODULE_RENDER[id];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${config.label}: ${config.description}`}
      accessibilityHint="Двічі торкнись, щоб відкрити модуль. Утримай і потягни, щоб змінити порядок."
      accessibilityState={{ disabled: Boolean(disabled) }}
      onPress={() => onPress?.(id)}
      disabled={disabled}
      testID={testID ?? `dashboard-row-${id}`}
      className="flex-row items-stretch overflow-hidden rounded-2xl border border-cream-300 bg-cream-50 active:opacity-80"
    >
      <View className={`w-1.5 ${config.accentClass}`} />
      <View className="flex-1 flex-row items-center gap-3 px-3 py-3">
        <View
          className={`h-11 w-11 items-center justify-center rounded-xl ${config.iconBgClass}`}
        >
          <Text className="text-xl">{config.glyph}</Text>
        </View>
        <View className="flex-1">
          <Text
            className="text-base font-semibold text-stone-900"
            numberOfLines={1}
          >
            {config.label}
          </Text>
          <Text className="text-xs text-stone-500" numberOfLines={1}>
            {config.description}
          </Text>
        </View>
        <Text className="text-stone-400 text-lg">›</Text>
      </View>
    </Pressable>
  );
});
