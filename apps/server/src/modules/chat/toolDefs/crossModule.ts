import type { AnthropicTool } from "./types.js";

export const CROSS_MODULE_TOOLS: AnthropicTool[] = [
  {
    name: "morning_briefing",
    description:
      "Ранковий брифінг по всіх модулях: заплановані тренування, звички на сьогодні, бюджет, калорії. Відповідає структурованим текстом.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "weekly_summary",
    description:
      "Тижневий підсумок по всіх модулях: фінанси, тренування, звички, харчування. Повертає текстовий звіт.",
    input_schema: {
      type: "object",
      properties: {
        include_recommendations: {
          type: "boolean",
          description:
            "Чи додавати рекомендації на наступний тиждень (default true)",
        },
      },
    },
  },
  {
    name: "set_goal",
    description:
      "Встановити комплексну ціль через модулі. Наприклад: 'Хочу схуднути на 5 кг' — ШІ автоматично ставить цілі по калоріях + тренуваннях + відстежуванню ваги.",
    input_schema: {
      type: "object",
      properties: {
        description: {
          type: "string",
          description: "Опис цілі вільним текстом",
        },
        target_weight_kg: {
          type: "number",
          description: "Цільова вага кг (опційно)",
        },
        target_date: {
          type: "string",
          description: "Дедлайн YYYY-MM-DD (опційно)",
        },
        daily_kcal: {
          type: "number",
          description:
            "Калорійна ціль/день (опційно, ШІ порахує якщо не вказано)",
        },
        workouts_per_week: {
          type: "number",
          description: "Тренувань на тиждень (опційно)",
        },
      },
      required: ["description"],
    },
  },
  {
    name: "spending_trend",
    description:
      "Показати тренд витрат за період і порівняти з попереднім аналогічним періодом. Наприклад: 'який тренд витрат за місяць?'",
    input_schema: {
      type: "object",
      properties: {
        period_days: {
          type: "number",
          description: "Період аналізу в днях (default 30)",
        },
      },
    },
  },
  {
    name: "weight_chart",
    description:
      "Показати дані ваги за період у текстовому/табличному форматі для аналізу трендів.",
    input_schema: {
      type: "object",
      properties: {
        period_days: {
          type: "number",
          description: "Період в днях (default 30)",
        },
      },
    },
  },
  {
    name: "category_breakdown",
    description:
      "Розбивка витрат по категоріях за період. Показує суму і відсоток для кожної категорії.",
    input_schema: {
      type: "object",
      properties: {
        period_days: {
          type: "number",
          description: "Період в днях (default 30)",
        },
      },
    },
  },
  {
    name: "detect_anomalies",
    description:
      "Виявити аномальні витрати — транзакції, які значно відрізняються від середнього. 'Чи є підозрілі витрати?'",
    input_schema: {
      type: "object",
      properties: {
        period_days: {
          type: "number",
          description: "Період аналізу в днях (default 30)",
        },
        threshold_multiplier: {
          type: "number",
          description:
            "Множник від середнього для визначення аномалії (default 3)",
        },
      },
    },
  },
  {
    name: "habit_trend",
    description:
      "Тренд виконання звичок за період: тижневий breakdown, чи покращується дисципліна.",
    input_schema: {
      type: "object",
      properties: {
        habit_id: {
          type: "string",
          description: "ID звички (опційно — якщо не вказано, по всіх)",
        },
        period_days: {
          type: "number",
          description: "Період в днях (default 30)",
        },
      },
    },
  },
];
