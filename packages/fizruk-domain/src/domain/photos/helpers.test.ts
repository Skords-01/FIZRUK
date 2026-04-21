import { describe, expect, it } from "vitest";

import {
  filterValidPhotos,
  formatMonthLabel,
  formatTakenAtLabel,
  getPhotoIndex,
  groupPhotosByMonth,
  isDateKey,
  isMonthKey,
  monthKeyFromTakenAt,
  neighborPhoto,
  pairBeforeAfterOfMonth,
  sortPhotosLatestFirst,
} from "./helpers.js";
import type { BodyPhotoMeta } from "./types.js";

function photo(
  partial: Partial<BodyPhotoMeta> & { id: string },
): BodyPhotoMeta {
  return {
    takenAt: "2026-04-10",
    createdAt: "2026-04-10T08:00:00.000Z",
    uri: `file:///photos/${partial.id}.jpg`,
    ...partial,
  };
}

describe("isDateKey / isMonthKey", () => {
  it("accepts well-formed YYYY-MM-DD and YYYY-MM keys", () => {
    expect(isDateKey("2026-04-21")).toBe(true);
    expect(isMonthKey("2026-04")).toBe(true);
  });

  it("rejects malformed or non-string input", () => {
    expect(isDateKey("2026/04/21")).toBe(false);
    expect(isDateKey("2026-4-21")).toBe(false);
    expect(isDateKey(undefined)).toBe(false);
    expect(isMonthKey("April 2026")).toBe(false);
    expect(isMonthKey(20260421)).toBe(false);
  });
});

describe("monthKeyFromTakenAt", () => {
  it("returns the YYYY-MM prefix for a valid takenAt", () => {
    expect(monthKeyFromTakenAt("2026-04-10")).toBe("2026-04");
    expect(monthKeyFromTakenAt("2025-12-31")).toBe("2025-12");
  });

  it("returns null for malformed input", () => {
    expect(monthKeyFromTakenAt("2026/04/10")).toBeNull();
    expect(monthKeyFromTakenAt("")).toBeNull();
  });
});

describe("formatMonthLabel / formatTakenAtLabel", () => {
  it("formats a month key in Ukrainian nominative", () => {
    expect(formatMonthLabel("2026-04")).toBe("квітень 2026");
    expect(formatMonthLabel("2025-01")).toBe("січень 2025");
    expect(formatMonthLabel("2024-12")).toBe("грудень 2024");
  });

  it("formats a date key as day + genitive month + year", () => {
    expect(formatTakenAtLabel("2026-04-12")).toBe("12 квітня 2026");
    expect(formatTakenAtLabel("2025-01-05")).toBe("5 січня 2025");
  });

  it("returns the raw input on malformed values", () => {
    expect(formatMonthLabel("foo")).toBe("foo");
    expect(formatMonthLabel("2026-13")).toBe("2026-13");
    expect(formatTakenAtLabel("bar")).toBe("bar");
  });
});

describe("sortPhotosLatestFirst", () => {
  it("puts the most recent takenAt first", () => {
    const sorted = sortPhotosLatestFirst([
      photo({ id: "a", takenAt: "2026-03-01" }),
      photo({ id: "b", takenAt: "2026-04-21" }),
      photo({ id: "c", takenAt: "2026-01-15" }),
    ]);
    expect(sorted.map((p) => p.id)).toEqual(["b", "a", "c"]);
  });

  it("breaks ties by createdAt then id", () => {
    const sorted = sortPhotosLatestFirst([
      photo({
        id: "z",
        takenAt: "2026-04-10",
        createdAt: "2026-04-10T08:00:00.000Z",
      }),
      photo({
        id: "a",
        takenAt: "2026-04-10",
        createdAt: "2026-04-10T09:00:00.000Z",
      }),
      photo({
        id: "m",
        takenAt: "2026-04-10",
        createdAt: "2026-04-10T08:00:00.000Z",
      }),
    ]);
    // "a" wins on createdAt, then "m" before "z" on id tiebreak.
    expect(sorted.map((p) => p.id)).toEqual(["a", "m", "z"]);
  });

  it("does not mutate the input array", () => {
    const input = [
      photo({ id: "b", takenAt: "2026-04-01" }),
      photo({ id: "a", takenAt: "2026-05-01" }),
    ];
    const snap = [...input];
    sortPhotosLatestFirst(input);
    expect(input).toEqual(snap);
  });
});

describe("groupPhotosByMonth", () => {
  it("groups photos by YYYY-MM bucket with latest month first", () => {
    const groups = groupPhotosByMonth([
      photo({ id: "1", takenAt: "2026-04-01" }),
      photo({ id: "2", takenAt: "2026-04-20" }),
      photo({ id: "3", takenAt: "2026-03-15" }),
      photo({ id: "4", takenAt: "2026-05-02" }),
    ]);
    expect(groups.map((g) => g.monthKey)).toEqual([
      "2026-05",
      "2026-04",
      "2026-03",
    ]);
    const april = groups.find((g) => g.monthKey === "2026-04");
    expect(april?.label).toBe("квітень 2026");
    expect(april?.photos.map((p) => p.id)).toEqual(["2", "1"]);
  });

  it("drops photos with malformed takenAt values", () => {
    const groups = groupPhotosByMonth([
      photo({ id: "ok", takenAt: "2026-04-10" }),
      photo({ id: "bad", takenAt: "nope" }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.photos.map((p) => p.id)).toEqual(["ok"]);
  });

  it("returns an empty array when no photos are supplied", () => {
    expect(groupPhotosByMonth([])).toEqual([]);
  });
});

describe("pairBeforeAfterOfMonth", () => {
  it("returns the earliest + latest photo of the month with ≥2 entries", () => {
    const pair = pairBeforeAfterOfMonth([
      photo({ id: "a", takenAt: "2026-04-01" }),
      photo({ id: "b", takenAt: "2026-04-15" }),
      photo({ id: "c", takenAt: "2026-04-30" }),
    ]);
    expect(pair?.before.id).toBe("a");
    expect(pair?.after.id).toBe("c");
  });

  it("respects an explicit monthKey when provided", () => {
    const pair = pairBeforeAfterOfMonth(
      [
        photo({ id: "a", takenAt: "2026-03-01" }),
        photo({ id: "b", takenAt: "2026-03-25" }),
        photo({ id: "c", takenAt: "2026-05-02" }),
      ],
      "2026-03",
    );
    expect(pair?.before.id).toBe("a");
    expect(pair?.after.id).toBe("b");
  });

  it("returns null when no month has ≥2 photos", () => {
    expect(
      pairBeforeAfterOfMonth([
        photo({ id: "a", takenAt: "2026-04-01" }),
        photo({ id: "b", takenAt: "2026-05-01" }),
      ]),
    ).toBeNull();
  });

  it("returns null when the requested monthKey is missing", () => {
    expect(
      pairBeforeAfterOfMonth(
        [photo({ id: "a", takenAt: "2026-04-01" })],
        "2020-01",
      ),
    ).toBeNull();
  });
});

describe("getPhotoIndex / neighborPhoto", () => {
  const list = [
    photo({ id: "a", takenAt: "2026-05-01" }),
    photo({ id: "b", takenAt: "2026-04-15" }),
    photo({ id: "c", takenAt: "2026-04-01" }),
  ];

  it("locates a photo by id", () => {
    expect(getPhotoIndex(list, "b")).toBe(1);
    expect(getPhotoIndex(list, "zzz")).toBe(-1);
  });

  it("walks forward / backward with clamp at the edges", () => {
    expect(neighborPhoto(list, "a", +1)?.id).toBe("b");
    expect(neighborPhoto(list, "b", -1)?.id).toBe("a");
    expect(neighborPhoto(list, "a", -1)).toBeNull();
    expect(neighborPhoto(list, "c", +1)).toBeNull();
    expect(neighborPhoto(list, "missing", +1)).toBeNull();
  });
});

describe("filterValidPhotos", () => {
  it("drops entries missing required fields", () => {
    const cleaned = filterValidPhotos([
      {
        id: "ok",
        takenAt: "2026-04-01",
        createdAt: "2026-04-01T00:00:00.000Z",
        uri: "file:///ok.jpg",
      },
      { id: "missing-uri", takenAt: "2026-04-01", createdAt: "x" },
      null,
      "string",
      { id: 123, takenAt: "2026-04-01" },
    ]);
    expect(cleaned.map((p) => p.id)).toEqual(["ok"]);
  });

  it("preserves optional fields when they are present and valid", () => {
    const cleaned = filterValidPhotos([
      {
        id: "ok",
        takenAt: "2026-04-01",
        createdAt: "2026-04-01T00:00:00.000Z",
        uri: "file:///ok.jpg",
        note: "Week 1",
        weightKg: 82.5,
      },
      {
        id: "bad-weight",
        takenAt: "2026-04-02",
        createdAt: "2026-04-02T00:00:00.000Z",
        uri: "file:///b.jpg",
        weightKg: "not a number",
        note: "",
      },
    ]);
    expect(cleaned[0]).toMatchObject({ note: "Week 1", weightKg: 82.5 });
    // Empty note is dropped; invalid weight is dropped.
    expect(cleaned[1]?.note).toBeUndefined();
    expect(cleaned[1]?.weightKg).toBeUndefined();
  });

  it("returns an empty array for non-array input", () => {
    expect(filterValidPhotos(null)).toEqual([]);
    expect(filterValidPhotos("foo")).toEqual([]);
    expect(filterValidPhotos({ id: "x" })).toEqual([]);
  });
});
