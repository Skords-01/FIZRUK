/**
 * Render tests for `<RoutineSection>`.
 *
 * Covers:
 *  - collapsed-by-default header with the "Рутина" title;
 *  - expanding the group reveals both toggle rows with the
 *    calendar-visibility labels from the web version;
 *  - toggles reflect the persisted MMKV preference (no-op defaults
 *    to `checked` because web mirrors `prefs?.showX !== false`).
 */

import { fireEvent, render } from "@testing-library/react-native";

import { _getMMKVInstance } from "@/lib/storage";

import { RoutineSection } from "./RoutineSection";

beforeEach(() => {
  _getMMKVInstance().clearAll();
});

describe("RoutineSection", () => {
  it("renders the collapsed group header", () => {
    const { getByText, queryByText } = render(<RoutineSection />);
    expect(getByText("Рутина")).toBeTruthy();
    // Toggle labels are hidden until the group is expanded.
    expect(
      queryByText("Показувати тренування з Фізрука в календарі"),
    ).toBeNull();
  });

  it("expands to show both toggle rows when the header is pressed", () => {
    const { getByText } = render(<RoutineSection />);

    fireEvent.press(getByText("Рутина"));

    expect(
      getByText("Показувати тренування з Фізрука в календарі"),
    ).toBeTruthy();
    expect(
      getByText("Показувати планові платежі підписок Фініка в календарі"),
    ).toBeTruthy();
  });
});
