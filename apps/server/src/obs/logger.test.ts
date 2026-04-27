import { describe, it, expect } from "vitest";
import pino from "pino";
import { redactPaths, serializeError } from "./logger.js";

describe("logger", () => {
  describe("redactPaths", () => {
    it("містить обов'язкові шляхи для секретів та PII", () => {
      expect(redactPaths).toContain("req.headers.authorization");
      expect(redactPaths).toContain("req.headers.cookie");
      expect(redactPaths).toContain("password");
      expect(redactPaths).toContain("token");
      expect(redactPaths).toContain("email");
      expect(redactPaths).toContain("phone");
    });

    it("redact працює з pino — маскує секретні поля", () => {
      const chunks: string[] = [];

      // Створюємо тестовий логер з тим же redact-конфігом.
      const stream: pino.DestinationStream = {
        write(chunk: string) {
          chunks.push(chunk);
        },
      };
      const testLogger = pino(
        {
          level: "info",
          redact: { paths: redactPaths, censor: "[redacted]" },
        },
        stream,
      );

      testLogger.info({
        msg: "test_redact",
        password: "super-secret-123",
        token: "jwt-token-abc",
        email: "user@example.com",
        phone: "+380991234567",
        safeField: "this-should-remain",
      });

      expect(chunks).toHaveLength(1);
      const parsed = JSON.parse(chunks[0]!) as Record<string, unknown>;
      expect(parsed.password).toBe("[redacted]");
      expect(parsed.token).toBe("[redacted]");
      expect(parsed.email).toBe("[redacted]");
      expect(parsed.phone).toBe("[redacted]");
      expect(parsed.safeField).toBe("this-should-remain");
    });
  });

  describe("serializeError", () => {
    it("серіалізує звичайний Error", () => {
      const err = new Error("test error");
      err.name = "TestError";
      const result = serializeError(err);
      expect(result).toMatchObject({
        name: "TestError",
        message: "test error",
      });
      expect(result?.stack).toBeUndefined();
    });

    it("включає stack коли includeStack=true", () => {
      const err = new Error("with stack");
      const result = serializeError(err, { includeStack: true });
      expect(result?.stack).toBeDefined();
      expect(result?.stack).toContain("with stack");
    });

    it("розгортає err.cause рекурсивно", () => {
      const root = new Error("root cause");
      const mid = new Error("middle", { cause: root });
      const top = new Error("top", { cause: mid });

      const result = serializeError(top);
      expect(result?.message).toBe("top");
      expect(result?.cause?.message).toBe("middle");
      expect(result?.cause?.cause?.message).toBe("root cause");
    });

    it("обмежує глибину рекурсії (depth)", () => {
      const deep = new Error("deep", {
        cause: new Error("deeper", {
          cause: new Error("deepest"),
        }),
      });
      const result = serializeError(deep, { depth: 1 });
      expect(result?.message).toBe("deep");
      expect(result?.cause?.message).toBe("deeper");
      // depth=1 на рівні cause → cause.cause має depth=0 → undefined
      expect(result?.cause?.cause).toBeUndefined();
    });

    it("повертає undefined для null/undefined", () => {
      expect(serializeError(null)).toBeUndefined();
      expect(serializeError(undefined)).toBeUndefined();
    });

    it("обробляє не-об'єктні значення", () => {
      const result = serializeError("string error");
      expect(result).toEqual({ message: "string error" });
    });

    it("включає code та status", () => {
      const err = Object.assign(new Error("http error"), {
        code: "ECONNREFUSED",
        status: 502,
      });
      const result = serializeError(err);
      expect(result?.code).toBe("ECONNREFUSED");
      expect(result?.status).toBe(502);
    });
  });
});
