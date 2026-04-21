import { describe, expect, it } from "vitest";

import { completionNoteKey } from "./completionNoteKey.js";

describe("routine-domain/completionNoteKey", () => {
  it("joins habitId + dateKey with '__' separator", () => {
    expect(completionNoteKey("habit-1", "2026-01-05")).toBe(
      "habit-1__2026-01-05",
    );
  });

  it("is a pure function", () => {
    expect(completionNoteKey("a", "2026-01-01")).toBe(
      completionNoteKey("a", "2026-01-01"),
    );
  });
});
