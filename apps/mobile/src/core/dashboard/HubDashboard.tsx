/**
 * Sergeant Hub — top-level dashboard screen (mobile).
 *
 * First cut of the web `HubDashboard` port. This PR lands the
 * structural skeleton (greeting → status row list) so the hub tab
 * finally looks like a product screen instead of the welcome
 * scaffold. Follow-up PRs layer on the bits that were deliberately
 * deferred here:
 *
 *   - `TodayFocusCard` + `useDashboardFocus` → once the domain helpers
 *     are extracted to `@sergeant/shared`, both platforms will share
 *     the same coach-focus picker.
 *   - Quick-stats previews inside each row → gated on the per-module
 *     MMKV writers (Phase 3 — quick-stats writers).
 *   - `HubInsightsPanel`, `WeeklyDigestFooter`, FTUX cards → staged
 *     into PR-3 of the dashboard breakdown.
 *
 * Scope notes:
 *   - Nutrition is hidden until Phase 7 (Food & Water). The persisted
 *     order still contains all four ids so a web session opening the
 *     same account keeps Nutrition in its slot — see
 *     `reorderWithHidden` in `@sergeant/shared`.
 *   - Auth / dev tools that used to live on the welcome scaffold
 *     (sign-out, dev push test) are not reintroduced here; they
 *     belong on the Settings screen in a follow-up.
 */

import { router, type Href } from "expo-router";
import { useCallback, useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useUser } from "@sergeant/api-client/react";
import type { DashboardModuleId } from "@sergeant/shared";

import { DraggableDashboard } from "./DraggableDashboard";
import { DASHBOARD_MODULE_ROUTES } from "./dashboardModuleConfig";
import { useDashboardOrder } from "./useDashboardOrder";

function formatToday(now: Date): string {
  try {
    return now.toLocaleDateString("uk-UA", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  } catch {
    // Hermes without Intl (shouldn't happen on RN 0.76, but stay safe).
    return now.toDateString();
  }
}

function firstName(name: string | null | undefined): string {
  if (!name) return "друже";
  const trimmed = name.trim();
  if (!trimmed) return "друже";
  const [first] = trimmed.split(/\s+/);
  return first ?? trimmed;
}

export function HubDashboard() {
  const { data } = useUser();
  const greetingName = firstName(data?.user?.name);
  const todayLabel = useMemo(() => formatToday(new Date()), []);

  const { visibleOrder, reorderVisible } = useDashboardOrder();

  const openModule = useCallback((id: DashboardModuleId) => {
    // `DASHBOARD_MODULE_ROUTES` holds validated Expo-Router hrefs. We
    // cast to `Href` so the router's typed-href helper accepts them
    // without materialising a union of every literal string.
    router.push(DASHBOARD_MODULE_ROUTES[id] as Href);
  }, []);

  const openSettings = useCallback(() => {
    router.push("/settings" as Href);
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top", "bottom"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 16 }}
      >
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 gap-1">
            <Text className="text-[26px] font-bold text-stone-900">
              Привіт, {greetingName}
            </Text>
            <Text
              accessibilityRole="text"
              className="text-sm text-stone-500 capitalize"
            >
              {todayLabel}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Відкрити налаштування"
            onPress={openSettings}
            className="h-10 w-10 items-center justify-center rounded-full bg-cream-100 active:opacity-70"
            testID="dashboard-settings-button"
          >
            <Text className="text-lg">⚙️</Text>
          </Pressable>
        </View>

        <View className="gap-2">
          <Text className="text-sm font-semibold text-stone-600">Статус</Text>
          <DraggableDashboard
            modules={visibleOrder}
            onReorder={reorderVisible}
            onOpenModule={openModule}
          />
          <Text className="mt-1 text-[11px] leading-snug text-stone-400">
            Утримай і потягни, щоб змінити порядок модулів. Порядок
            синхронізується з вебом.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
