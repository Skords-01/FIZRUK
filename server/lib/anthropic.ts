import {
  aiRequestDurationMs,
  aiRequestsTotal,
  aiTokensTotal,
  externalHttpDurationMs,
  externalHttpRequestsTotal,
} from "../obs/metrics.js";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

export interface AnthropicCallOptions {
  timeoutMs?: number;
  endpoint?: string;
}

export interface AnthropicMessagesResult {
  response: Response | null;
  data: Record<string, unknown>;
}

export interface AnthropicStreamResult {
  response: Response;
  recordStreamEnd: (outcome?: string) => void;
}

interface RecordOutcomeMeta {
  model: string;
  endpoint: string;
  ms: number | null;
}

function recordOutcome(outcome: string, meta: RecordOutcomeMeta): void {
  const { model, endpoint, ms } = meta;
  try {
    externalHttpRequestsTotal.inc({ upstream: "anthropic", outcome });
    if (ms != null) {
      externalHttpDurationMs.observe({ upstream: "anthropic", outcome }, ms);
    }
    aiRequestsTotal.inc({
      provider: "anthropic",
      model: model || "unknown",
      endpoint: endpoint || "unknown",
      outcome,
    });
    if (ms != null) {
      aiRequestDurationMs.observe(
        {
          provider: "anthropic",
          model: model || "unknown",
          endpoint: endpoint || "unknown",
        },
        ms,
      );
    }
  } catch {
    /* metrics must never break a request */
  }
}

interface AnthropicUsage {
  input_tokens?: number;
  output_tokens?: number;
}

interface AnthropicResponseData {
  usage?: AnthropicUsage;
  content?: Array<{ type: string; text?: string }>;
  [key: string]: unknown;
}

function recordUsage(model: string, data: AnthropicResponseData | null): void {
  try {
    const usage = data?.usage;
    if (!usage) return;
    if (Number.isFinite(usage.input_tokens)) {
      aiTokensTotal.inc(
        { provider: "anthropic", model, kind: "prompt" },
        usage.input_tokens,
      );
    }
    if (Number.isFinite(usage.output_tokens)) {
      aiTokensTotal.inc(
        { provider: "anthropic", model, kind: "completion" },
        usage.output_tokens,
      );
    }
  } catch {
    /* ignore */
  }
}

export async function anthropicMessages(
  apiKey: string,
  payload: Record<string, unknown>,
  { timeoutMs = 20000, endpoint = "unknown" }: AnthropicCallOptions = {},
): Promise<AnthropicMessagesResult> {
  const maxAttempts = 3;
  const retryDelayMs = [0, 250, 750];
  const model = (payload?.model as string) || "unknown";
  const overallStart = process.hrtime.bigint();

  let lastResponse: Response | null = null;
  let lastData: Record<string, unknown> = {};

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    try {
      if (retryDelayMs[attempt - 1]) {
        await sleep(retryDelayMs[attempt - 1]);
      }

      const response = await fetch(ANTHROPIC_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const data = (await response
        .json()
        .catch(() => ({}))) as AnthropicResponseData;
      lastResponse = response;
      lastData = data;

      // Ретраїмо тільки тимчасові/перевантажені стани.
      if (shouldRetryStatus(response.status) && attempt < maxAttempts) continue;

      const ms = Number(process.hrtime.bigint() - overallStart) / 1e6;
      if (response.ok) {
        recordOutcome("ok", { model, endpoint, ms });
        recordUsage(model, data);
      } else {
        recordOutcome(response.status === 429 ? "rate_limited" : "error", {
          model,
          endpoint,
          ms,
        });
      }
      return { response, data };
    } catch (e: unknown) {
      // На явний timeout (AbortError) краще не "допалювати" запити.
      if (isAbortError(e) || attempt >= maxAttempts) {
        const ms = Number(process.hrtime.bigint() - overallStart) / 1e6;
        recordOutcome(isAbortError(e) ? "timeout" : "error", {
          model,
          endpoint,
          ms,
        });
        throw e;
      }
      continue;
    } finally {
      clearTimeout(t);
    }
  }

  // На випадок якщо цикл завершився без return (теоретично не має статись).
  return { response: lastResponse, data: lastData };
}

/**
 * Стрімова версія Anthropic Messages API. Викликає fetch з `stream: true`,
 * інструментує outcome/latency (розмір відповіді = час до закриття з'єднання),
 * і повертає `{ response, recordStreamEnd }`. Викликай `recordStreamEnd(outcome?)`
 * коли боді повністю спожите (або з помилкою) щоб закрити latency-вимір.
 *
 * Таймаут (`AbortController`) навмисно НЕ гаситься у `finally`: боді SSE
 * споживається у caller-і після повернення з цієї функції, тому abort-таймер
 * мусить жити до виклику `recordStreamEnd`, щоб захистити stream від зависання.
 */
export async function anthropicMessagesStream(
  apiKey: string,
  payload: Record<string, unknown>,
  { endpoint = "unknown", timeoutMs = 60000 }: AnthropicCallOptions = {},
): Promise<AnthropicStreamResult> {
  const model = (payload?.model as string) || "unknown";
  const start = process.hrtime.bigint();
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ ...payload, stream: true }),
      signal: controller.signal,
    });
  } catch (e: unknown) {
    clearTimeout(t);
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    recordOutcome(isAbortError(e) ? "timeout" : "error", {
      model,
      endpoint,
      ms,
    });
    throw e;
  }

  if (!response.ok) {
    clearTimeout(t);
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    recordOutcome(response.status === 429 ? "rate_limited" : "error", {
      model,
      endpoint,
      ms,
    });
    return { response, recordStreamEnd: () => {} };
  }

  let settled = false;
  const recordStreamEnd = (outcome: string = "ok"): void => {
    if (settled) return;
    settled = true;
    clearTimeout(t);
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    recordOutcome(outcome, { model, endpoint, ms });
  };

  return { response, recordStreamEnd };
}

export function extractAnthropicText(
  data: AnthropicResponseData | null | undefined,
): string {
  return (data?.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("\n")
    .trim();
}

function shouldRetryStatus(status: number): boolean {
  return (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 529
  );
}

function isAbortError(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const err = e as { name?: string; message?: string };
  return err.name === "AbortError" || /abort/i.test(String(err.message || ""));
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
