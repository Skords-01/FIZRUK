// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

// `WeeklyDigestCard` reads from a TanStack-Query hook + a digest-history
// hook + (when expanded) renders the stories overlay. None of that is
// relevant to the collapse contract being tested here, so we stub all
// three at the module boundary.
vi.mock("./useWeeklyDigest", () => ({
  useWeeklyDigest: () => ({
    digest: null,
    loading: false,
    error: null,
    weekRange: "10 — 16 листоп.",
    generate: vi.fn(),
    isCurrentWeek: true,
  }),
  useDigestHistory: () => ({ data: [] }),
  getWeekKey: () => "2025-W46",
}));

vi.mock("./WeeklyDigestStories", () => ({
  WeeklyDigestStories: () => null,
}));

import { WeeklyDigestCard } from "./WeeklyDigestCard";

describe("WeeklyDigestCard — collapse contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("does NOT expose the header as a collapse control when `onCollapse` is omitted", () => {
    render(<WeeklyDigestCard />);
    expect(
      screen.queryByRole("button", { name: /згорнути звіт тижня/i }),
    ).toBeNull();
  });

  it("makes the whole header clickable when `onCollapse` is provided — click anywhere on it invokes the callback", () => {
    const onCollapse = vi.fn();
    render(<WeeklyDigestCard onCollapse={onCollapse} />);

    const header = screen.getByRole("button", {
      name: /згорнути звіт тижня/i,
    });
    expect(header).not.toBeNull();

    // Click the header element itself (edge of the row).
    fireEvent.click(header);
    expect(onCollapse).toHaveBeenCalledTimes(1);

    // And clicking a child inside the header (e.g. the title text)
    // should still bubble up and collapse the card.
    fireEvent.click(screen.getByText("Звіт тижня"));
    expect(onCollapse).toHaveBeenCalledTimes(2);
  });

  it("supports keyboard activation on the header (Enter + Space)", () => {
    const onCollapse = vi.fn();
    render(<WeeklyDigestCard onCollapse={onCollapse} />);

    const header = screen.getByRole("button", {
      name: /згорнути звіт тижня/i,
    });

    fireEvent.keyDown(header, { key: "Enter" });
    expect(onCollapse).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(header, { key: " " });
    expect(onCollapse).toHaveBeenCalledTimes(2);

    // Unrelated keys do nothing.
    fireEvent.keyDown(header, { key: "Escape" });
    expect(onCollapse).toHaveBeenCalledTimes(2);
  });
});
