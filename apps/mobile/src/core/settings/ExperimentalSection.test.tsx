/**
 * Render tests for `<ExperimentalSection>`.
 *
 * Covers:
 *  - collapsed-by-default header with the "Експериментальне" title;
 *  - expanding reveals one row per entry in the mobile flag registry
 *    (the two experimental flags mirrored from web featureFlags).
 */

import { fireEvent, render } from "@testing-library/react-native";

import { _getMMKVInstance } from "@/lib/storage";

import { ExperimentalSection } from "./ExperimentalSection";

beforeEach(() => {
  _getMMKVInstance().clearAll();
});

describe("ExperimentalSection", () => {
  it("renders the collapsed group header", () => {
    const { getByText, queryByText } = render(<ExperimentalSection />);
    expect(getByText("Експериментальне")).toBeTruthy();
    expect(queryByText("Категорія «Підписки» у швидкому додаванні")).toBeNull();
  });

  it("expands to show the experimental flag rows", () => {
    const { getByText } = render(<ExperimentalSection />);

    fireEvent.press(getByText("Експериментальне"));

    expect(getByText("Категорія «Підписки» у швидкому додаванні")).toBeTruthy();
    expect(getByText("Command Palette (Ctrl/⌘+K)")).toBeTruthy();
  });
});
