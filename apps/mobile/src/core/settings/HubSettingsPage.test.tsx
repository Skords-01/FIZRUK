/**
 * Render smoke test for the Hub-core Settings shell.
 *
 * Keeps the scope tight: the shell renders the screen title, both
 * first-cut section headers (Routine / Experimental), and at least
 * one of the "буде портовано" placeholders. Section-level behaviour
 * is covered by the per-section suites.
 */

import { render } from "@testing-library/react-native";

import { HubSettingsPage } from "./HubSettingsPage";

jest.mock("react-native-safe-area-context", () => {
  const actual = jest.requireActual("react-native-safe-area-context");
  return {
    ...actual,
    SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  };
});

describe("HubSettingsPage", () => {
  it("renders the screen title and both first-cut section headers", () => {
    const { getByText } = render(<HubSettingsPage />);

    expect(getByText("Налаштування")).toBeTruthy();
    expect(getByText("Рутина")).toBeTruthy();
    expect(getByText("Експериментальне")).toBeTruthy();
  });

  it("renders placeholders for the not-yet-ported sections", () => {
    const { getByText, getAllByText } = render(<HubSettingsPage />);

    for (const title of [
      "Інтерфейс і синхронізація",
      "Нагадування",
      "AI-дайджести",
      "Фізрук",
      "Фінік",
    ]) {
      expect(getByText(title)).toBeTruthy();
    }
    // All five placeholders share the same "Скоро" chip + caption.
    expect(getAllByText("Скоро")).toHaveLength(5);
    expect(getAllByText("Буде портовано у наступному PR.")).toHaveLength(5);
  });
});
