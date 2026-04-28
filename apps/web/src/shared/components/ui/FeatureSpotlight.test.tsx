/** @vitest-environment jsdom */
import { describe, it, expect, afterEach, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { FeatureSpotlight } from "./FeatureSpotlight";

afterEach(() => {
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
