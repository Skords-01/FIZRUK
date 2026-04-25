import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Request, Response } from "express";

const anthropicMessagesMock = vi.fn();

vi.mock("../lib/anthropic.js", async () => {
  const actual = await vi.importActual<typeof import("../lib/anthropic.js")>(
    "../lib/anthropic.js",
  );
  return {
    ...actual,
    anthropicMessages: anthropicMessagesMock,
  };
});

const { default: weeklyDigestHandler } = await import("./weekly-digest.js");
const { ExternalServiceError, ValidationError } =
  await import("../obs/errors.js");

interface TestRes {
  statusCode: number;
  body: unknown;
  status(code: number): TestRes;
  json(payload: unknown): TestRes;
}

function mockRes(): TestRes & Response {
  const res: TestRes = {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res as TestRes & Response;
}

function asReq(body: unknown, apiKey: string | null = "test-key"): Request {
  const r = { body, anthropicKey: apiKey } as unknown;
  return r as Request;
}

function aiOk(text: string) {
  return {
    response: { ok: true, status: 200 },
    data: { content: [{ type: "text", text }] },
  };
}

function aiErr(status: number, message: string) {
  return {
    response: { ok: false, status },
    data: { error: { message } },
  };
}

const REPORT_JSON = {
  finyk: {
    summary: "Витрати на цьому тижні в нормі.",
    comment: "Бюджет дотриманий, ризиків немає.",
    recommendations: ["Тримай курс", "Перевір категорію їжі"],
  },
  fizruk: null,
  nutrition: null,
  routine: null,
  overallRecommendations: ["Спи 8 годин"],
};

beforeEach(() => {
  anthropicMessagesMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("weekly-digest handler — validation", () => {
  it("returns 400 when body is empty (zod fails on missing fields)", async () => {
    // All sections are optional, so empty body parses successfully and the
    // handler instead throws a ValidationError ("Немає даних для генерації
    // звіту"). That is the documented contract.
    const res = mockRes();
    await expect(weeklyDigestHandler(asReq({}), res)).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect(anthropicMessagesMock).not.toHaveBeenCalled();
  });

  it("returns 400 when section payload has wrong field types", async () => {
    const res = mockRes();
    await weeklyDigestHandler(
      asReq({
        finyk: {
          totalSpent: "not-a-number",
        },
      }),
      res,
    );
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ error: "Некоректні дані запиту" });
  });

  it("throws ValidationError when no sections are provided", async () => {
    const res = mockRes();
    await expect(
      weeklyDigestHandler(asReq({ weekRange: "23–29 квіт" }), res),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("weekly-digest handler — Anthropic interaction", () => {
  const finykOnly = {
    weekRange: "23–29 квіт",
    finyk: {
      totalSpent: 1500,
      totalIncome: 0,
      monthlyBudget: 5000,
      txCount: 12,
      topCategories: [{ name: "Їжа", amount: 800 }],
    },
  };

  it("returns 200 with parsed report and generatedAt timestamp on success", async () => {
    anthropicMessagesMock.mockResolvedValueOnce(
      aiOk(JSON.stringify(REPORT_JSON)),
    );
    const res = mockRes();
    await weeklyDigestHandler(asReq(finykOnly), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ report: REPORT_JSON });
    expect((res.body as { generatedAt: string }).generatedAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T/,
    );
  });

  it("propagates Anthropic non-ok as ExternalServiceError", async () => {
    anthropicMessagesMock.mockResolvedValueOnce(aiErr(503, "upstream down"));
    const res = mockRes();
    await expect(
      weeklyDigestHandler(asReq(finykOnly), res),
    ).rejects.toMatchObject({
      name: "ExternalServiceError",
      message: "upstream down",
    });
  });

  it("uses 502 fallback status when Anthropic response is missing", async () => {
    anthropicMessagesMock.mockResolvedValueOnce({
      response: null,
      data: null,
    });
    const res = mockRes();
    await expect(
      weeklyDigestHandler(asReq(finykOnly), res),
    ).rejects.toBeInstanceOf(ExternalServiceError);
  });

  it("throws ANTHROPIC_PARSE_ERROR when response cannot be parsed", async () => {
    anthropicMessagesMock.mockResolvedValueOnce(aiOk("just plain text"));
    const res = mockRes();
    await expect(
      weeklyDigestHandler(asReq(finykOnly), res),
    ).rejects.toMatchObject({
      name: "ExternalServiceError",
      code: "ANTHROPIC_PARSE_ERROR",
    });
  });
});

describe("weekly-digest handler — JSON extraction", () => {
  const minimal = {
    finyk: { totalSpent: 100, totalIncome: 0 },
  };

  it("parses bare JSON without fences", async () => {
    anthropicMessagesMock.mockResolvedValueOnce(
      aiOk(JSON.stringify(REPORT_JSON)),
    );
    const res = mockRes();
    await weeklyDigestHandler(asReq(minimal), res);
    expect(res.statusCode).toBe(200);
  });

  it("parses ```json fenced response", async () => {
    anthropicMessagesMock.mockResolvedValueOnce(
      aiOk("```json\n" + JSON.stringify(REPORT_JSON) + "\n```"),
    );
    const res = mockRes();
    await weeklyDigestHandler(asReq(minimal), res);
    expect(res.statusCode).toBe(200);
  });

  it("parses ``` (no language) fenced response", async () => {
    anthropicMessagesMock.mockResolvedValueOnce(
      aiOk("```\n" + JSON.stringify(REPORT_JSON) + "\n```"),
    );
    const res = mockRes();
    await weeklyDigestHandler(asReq(minimal), res);
    expect(res.statusCode).toBe(200);
  });

  it("strips surrounding prose and parses the embedded JSON object", async () => {
    anthropicMessagesMock.mockResolvedValueOnce(
      aiOk(`Звичайно. Ось звіт:\n${JSON.stringify(REPORT_JSON)}\nДякую.`),
    );
    const res = mockRes();
    await weeklyDigestHandler(asReq(minimal), res);
    expect(res.statusCode).toBe(200);
  });

  it("handles braces nested inside string literals correctly", async () => {
    const tricky = {
      finyk: { summary: "З урахуванням бонусів {до 5%}", recommendations: [] },
      fizruk: null,
      nutrition: null,
      routine: null,
    };
    anthropicMessagesMock.mockResolvedValueOnce(aiOk(JSON.stringify(tricky)));
    const res = mockRes();
    await weeklyDigestHandler(asReq(minimal), res);
    expect(res.statusCode).toBe(200);
    expect(
      (res.body as { report: { finyk: { summary: string } } }).report.finyk
        .summary,
    ).toContain("{до 5%}");
  });

  it("rejects when no JSON object boundary can be found", async () => {
    anthropicMessagesMock.mockResolvedValueOnce(aiOk("[1, 2, 3]"));
    const res = mockRes();
    await expect(
      weeklyDigestHandler(asReq(minimal), res),
    ).rejects.toMatchObject({ code: "ANTHROPIC_PARSE_ERROR" });
  });
});

describe("weekly-digest handler — section building", () => {
  function captureSystemPrompt(): Promise<string> {
    return new Promise<string>((resolve) => {
      anthropicMessagesMock.mockImplementationOnce(
        async (_key, payload: { system?: string }) => {
          resolve(payload.system ?? "");
          return aiOk(JSON.stringify(REPORT_JSON));
        },
      );
    });
  }

  it("builds a finyk section with empty topCategories fallback", async () => {
    const systemP = captureSystemPrompt();
    await weeklyDigestHandler(
      asReq({
        finyk: {
          totalSpent: 100,
          totalIncome: 50,
          monthlyBudget: null,
          txCount: 5,
          topCategories: [],
        },
      }),
      mockRes(),
    );
    const sys = await systemP;
    expect(sys).toContain("[ФІНАНСИ");
    expect(sys).toContain("Місячний бюджет: не встановлено");
    expect(sys).toContain("Топ категорії витрат:\n  Немає даних");
  });

  it("builds a fizruk section with topExercises", async () => {
    const systemP = captureSystemPrompt();
    await weeklyDigestHandler(
      asReq({
        fizruk: {
          workoutsCount: 3,
          totalVolume: 12000,
          recoveryLabel: "відновлений",
          topExercises: [
            { name: "Жим лежачи", totalVolume: 5000 },
            { name: "Присідання", totalVolume: 7000 },
          ],
        },
      }),
      mockRes(),
    );
    const sys = await systemP;
    expect(sys).toContain("Тренувань завершено: 3");
    expect(sys).toContain("Стан відновлення: відновлений");
    expect(sys).toContain("Жим лежачи: 5000 кг");
  });

  it("nutrition section reports deficit when target > avg by more than 50", async () => {
    const systemP = captureSystemPrompt();
    await weeklyDigestHandler(
      asReq({
        nutrition: {
          avgKcal: 1700,
          targetKcal: 2000,
          avgProtein: 100,
          avgFat: 60,
          avgCarbs: 200,
          daysLogged: 6,
        },
      }),
      mockRes(),
    );
    const sys = await systemP;
    expect(sys).toMatch(/дефіцит 300 ккал/);
  });

  it("nutrition section reports profit (профіцит) when avg > target by more than 50", async () => {
    const systemP = captureSystemPrompt();
    await weeklyDigestHandler(
      asReq({
        nutrition: {
          avgKcal: 2400,
          targetKcal: 2000,
          avgProtein: 100,
          avgFat: 60,
          avgCarbs: 200,
          daysLogged: 7,
        },
      }),
      mockRes(),
    );
    const sys = await systemP;
    expect(sys).toMatch(/профіцит 400 ккал/);
  });

  it("nutrition section reports balance when |avg - target| <= 50", async () => {
    const systemP = captureSystemPrompt();
    await weeklyDigestHandler(
      asReq({
        nutrition: {
          avgKcal: 1980,
          targetKcal: 2000,
          avgProtein: 100,
          avgFat: 60,
          avgCarbs: 200,
          daysLogged: 7,
        },
      }),
      mockRes(),
    );
    const sys = await systemP;
    expect(sys).toContain("баланс");
  });

  it("routine section uses 'Немає активних звичок' when habits array is empty", async () => {
    const systemP = captureSystemPrompt();
    await weeklyDigestHandler(
      asReq({
        routine: {
          overallRate: 0,
          habitCount: 0,
          habits: [],
        },
      }),
      mockRes(),
    );
    const sys = await systemP;
    expect(sys).toContain("[ЗВИЧКИ");
    expect(sys).toContain("Немає активних звичок");
  });

  it("includes weekRange in section headers when supplied", async () => {
    const systemP = captureSystemPrompt();
    await weeklyDigestHandler(
      asReq({
        weekRange: "23–29 квіт",
        finyk: { totalSpent: 100 },
      }),
      mockRes(),
    );
    const sys = await systemP;
    expect(sys).toContain("[ФІНАНСИ (23–29 квіт)]");
  });
});
