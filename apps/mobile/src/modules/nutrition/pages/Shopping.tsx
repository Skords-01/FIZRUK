import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

import { useShoppingList } from "../hooks/useShoppingList";

export function Shopping({ testID }: { testID?: string }) {
  const {
    shoppingList,
    totalCount,
    toggle,
    clearChecked,
    clearAll,
    addItemToCategory,
  } = useShoppingList();
  const [draft, setDraft] = useState("");

  const onAdd = useCallback(() => {
    addItemToCategory("Інше", draft);
    setDraft("");
  }, [addItemToCategory, draft]);

  return (
    <ScrollView
      className="flex-1 bg-cream-50"
      testID={testID}
      contentContainerClassName="p-4 gap-3 pb-8"
    >
      <Text className="text-lg font-semibold text-stone-800">
        Список покупок
      </Text>
      <Text className="text-xs text-stone-500">
        Паритет із web-даними в одному ключі сховища. Повна генерація з рецептів
        / плану — поки в основному веб-клієнті; тут — перегляд, галочки та ручні
        позиції в «Інше».
      </Text>

      <View className="flex-row items-center justify-between">
        <Text className="text-sm text-stone-600" testID="shopping-count">
          {totalCount.total} поз. · відмічено {totalCount.checked}
        </Text>
      </View>

      {shoppingList.categories.length === 0 ? (
        <Card className="p-4">
          <Text className="text-stone-600 text-sm text-center">
            Список порожній. Додай позицію нижче або згенеруй список у
            веб-версії (Рецепти / план) — після sync він з’явиться тут, коли
            додамо той самий сценарій в додатку.
          </Text>
        </Card>
      ) : null}

      {shoppingList.categories.map((cat) => (
        <View key={cat.name} className="gap-1">
          <Text className="text-xs font-semibold text-stone-500 mt-1">
            {cat.name}
          </Text>
          {cat.items.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => toggle(cat.name, item.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: item.checked }}
              className="flex-row items-center py-2 border-b border-cream-200"
            >
              <Text
                className={
                  item.checked
                    ? "text-stone-400 line-through flex-1"
                    : "text-stone-800 flex-1"
                }
              >
                {item.name}
                {item.quantity ? ` · ${item.quantity}` : ""}
              </Text>
            </Pressable>
          ))}
        </View>
      ))}

      <View className="flex-row gap-2 mt-2">
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Назва продукту"
          className="flex-1 border border-cream-300 rounded-xl px-3 py-2 text-stone-800 bg-white"
          placeholderTextColor="#a8a29e"
        />
        <Button variant="nutrition" onPress={onAdd} disabled={!draft.trim()}>
          Додати
        </Button>
      </View>

      <View className="flex-row gap-2 flex-wrap">
        <Button
          variant="secondary"
          onPress={clearChecked}
          disabled={totalCount.checked === 0}
        >
          Прибрати відмічені
        </Button>
        <Button
          variant="ghost"
          onPress={clearAll}
          disabled={totalCount.total === 0}
        >
          Очистити все
        </Button>
      </View>
    </ScrollView>
  );
}
