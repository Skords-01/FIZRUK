import type { AnthropicTool } from "./types.js";

export const MEMORY_TOOLS: AnthropicTool[] = [
  {
    name: "remember",
    description:
      "Запам'ятати факт про користувача: алергії, уподобання, цілі, обмеження тощо. Наприклад: 'запам'ятай що я не їм глютен'. Зберігається між сесіями.",
    input_schema: {
      type: "object",
      properties: {
        fact: { type: "string", description: "Факт для запам'ятовування" },
        category: {
          type: "string",
          description:
            "Категорія: allergy, diet, goal, training, health, preference, other",
        },
      },
      required: ["fact"],
    },
  },
  {
    name: "forget",
    description:
      "Видалити раніше запам'ятований факт. 'Забудь про алергію на глютен'",
    input_schema: {
      type: "object",
      properties: {
        fact_id: {
          type: "string",
          description: "ID факту (з my_profile) або текст факту для пошуку",
        },
      },
      required: ["fact_id"],
    },
  },
  {
    name: "my_profile",
    description:
      "Показати всі запам'ятовані факти про користувача. 'Що ти про мене знаєш?'",
    input_schema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          description: "Фільтр по категорії (опційно)",
        },
      },
    },
  },
];
