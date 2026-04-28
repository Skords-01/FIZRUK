/** @vitest-environment jsdom */
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { FeatureSpotlight } from "./FeatureSpotlight";

// jsdom doesn't compute layout, so getBoundingClientRect() returns a zero-rect
// for every element. FeatureSpotlight rejects zero-sized targets (treats them
// as off-screen) — give the wrapped target a plausible rect so the spotlight
// can decide to render.
const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;

beforeEach(() => {
  Element.prototype.getBoundingClientRect = function () {
    return {
      x: 100,
      y: 100,
      top: 100,
      left: 100,
      right: 200,
      bottom: 140,
      width: 100,
      height: 40,
      toJSON: () => ({}),
    } as DOMRect;
  };
});

afterEach(() => {
  Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
  cleanup();
  vi.useRealTimers();
});

describe("FeatureSpotlight", () => {
  it("keeps wrapped target visible and opens the spotlight after delay", () => {
    vi.useFakeTimers();

    const { getByRole, queryByRole, getByText } = render(
      <FeatureSpotlight
        id="assistant-fab-test"
        title="AI-асистент"
        description="Швидкий вхід у чат"
        placement="left"
        delay={100}
        skipPersist
      >
        <button type="button">Асистент</button>
      </FeatureSpotlight>,
    );

    expect(getByRole("button", { name: "Асистент" })).not.toBeNull();
    expect(queryByRole("dialog")).toBeNull();

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(queryByRole("dialog")).not.toBeNull();
    expect(getByText("AI-асистент")).not.toBeNull();
  });
});
