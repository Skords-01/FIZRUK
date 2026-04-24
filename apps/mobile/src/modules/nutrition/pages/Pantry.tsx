import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import {
  groupItemsByCategory,
  type PantryItem,
} from "@sergeant/nutrition-domain";
import { hapticTap } from "@sergeant/shared";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

import { useNutritionPantries } from "../hooks/useNutritionPantries";

export function PantryPage({ testID }: { testID?: string }) {
  const router = useRouter();
  const {
    pantries,
    activePantryId,
    activePantry,
    setActivePantryId,
    addLine,
    removeItemAt,
    addPantry,
  } = useNutritionPantries();
  const [draft, setDraft] = useState("");
  const [newPantryName, setNewPantryName] = useState("");

  const grouped = useMemo(() => {
    const items: readonly PantryItem[] = activePantry?.items || [];
    return groupItemsByCategory<PantryItem>(items);
  }, [activePantry?.items]);

  const onAdd = useCallback(() => {
    addLine(draft);
    setDraft("");
  }, [addLine, draft]);

  const onBack = useCallback(() => {
    hapticTap();
    router.back();
  }, [router]);

  return (
    <View className="flex-1 bg-cream-50" testID={testID}>
      <View className="px-4 pt-2 pb-2 border-b border-cream-200 flex-row items-center gap-2">
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Назад"
        >
          <Text className="text-coral-700 text-base">‹ Назад</Text>
        </Pressable>
        <Text className="text-lg font-semibold text-stone-800 flex-1">
          Комора
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4 gap-3 pb-8"
        keyboardShouldPersistTaps="handled"
      >
        {pantries.length > 1 ? (
          <View className="flex-row flex-wrap gap-2">
            {pantries.map((p) => {
              const sel = p.id === activePantryId;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => {
                    hapticTap();
                    setActivePantryId(p.id);
                  }}
                  className={
                    sel
                      ? "px-3 py-1.5 rounded-full bg-lime-600"
                      : "px-3 py-1.5 rounded-full bg-cream-200"
                  }
                >
                  <Text
                    className={
                      sel ? "text-white text-xs" : "text-stone-700 text-xs"
                    }
                    numberOfLines={1}
                  >
                    {p.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <Text className="text-xs text-stone-500">
          Додавай рядок як на веб: «2 л молока», «яйця 10 шт» — парсер
          `parseLoosePantryText` зведе в структуровані позиції.
        </Text>

        <View className="flex-row gap-2">
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Продукт або список…"
            className="flex-1 border border-cream-300 rounded-xl px-3 py-2 text-stone-800 bg-white"
            placeholderTextColor="#a8a29e"
            onSubmitEditing={onAdd}
          />
          <Button variant="nutrition" onPress={onAdd} disabled={!draft.trim()}>
            Додати
          </Button>
        </View>

        {grouped.length === 0 ? (
          <Card className="p-4">
            <Text className="text-stone-600 text-sm text-center">
              Склад порожній. Додай продукти рядком вище.
            </Text>
          </Card>
        ) : (
          grouped.map((bucket) => (
            <View key={bucket.cat.id} className="gap-1">
              <Text className="text-xs font-semibold text-stone-500">
                {bucket.cat.emoji} {bucket.cat.label}
              </Text>
              {bucket.items.map(({ item, idx }) => {
                const it: PantryItem = item;
                return (
                  <View
                    key={`${it.name}-${idx}`}
                    className="flex-row items-center py-1.5 border-b border-cream-200/80"
                  >
                    <View className="flex-1">
                      <Text className="text-stone-800 text-sm">{it.name}</Text>
                      {it.qty != null || it.unit ? (
                        <Text className="text-xs text-stone-500">
                          {it.qty != null && it.unit
                            ? `${it.qty} ${it.unit}`
                            : it.qty != null
                              ? String(it.qty)
                              : String(it.unit || "")}
                        </Text>
                      ) : null}
                    </View>
                    <Pressable
                      onPress={() => {
                        hapticTap();
                        removeItemAt(idx);
                      }}
                      accessibilityLabel={`Видалити ${it.name}`}
                      className="px-2 py-1"
                    >
                      <Text className="text-stone-400 text-lg leading-none">
                        ×
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ))
        )}

        <View className="mt-4 border-t border-cream-200 pt-4 gap-2">
          <Text className="text-xs text-stone-500">
            Новий склад (кілька комор)
          </Text>
          <View className="flex-row gap-2">
            <TextInput
              value={newPantryName}
              onChangeText={setNewPantryName}
              placeholder="Назва (напр. Офіс)"
              className="flex-1 border border-cream-300 rounded-xl px-3 py-2 text-stone-800 bg-white"
              placeholderTextColor="#a8a29e"
            />
            <Button
              variant="secondary"
              onPress={() => {
                if (!newPantryName.trim()) return;
                addPantry(newPantryName.trim());
                setNewPantryName("");
              }}
            >
              Створити
            </Button>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
