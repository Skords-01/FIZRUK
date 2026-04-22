/**
 * Smoke test for the Finyk mobile module shell.
 *
 * After Phase 4 / "Overview page" PR, `FinykApp` is a thin wrapper that
 * renders the full Overview screen. We assert on a few stable Overview
 * surfaces (hero + planning copy, in-module nav grid) so this test is a
 * regression fence for the composition itself, not for individual card
 * internals (those have their own tests).
 */
import { render, screen } from "@testing-library/react-native";

import { FinykApp } from "./FinykApp";

jest.mock("expo-router", () => ({
  __esModule: true,
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

describe("FinykApp shell", () => {
  it("renders the Overview hero card", () => {
    render(<FinykApp />);
    expect(screen.getByTestId("finyk-overview-hero")).toBeTruthy();
    expect(screen.getByText("Загальний нетворс")).toBeTruthy();
  });

  it("renders the in-module navigation grid", () => {
    render(<FinykApp />);
    expect(screen.getByTestId("finyk-nav-grid-transactions")).toBeTruthy();
    expect(screen.getByTestId("finyk-nav-grid-budgets")).toBeTruthy();
    expect(screen.getByTestId("finyk-nav-grid-analytics")).toBeTruthy();
    expect(screen.getByTestId("finyk-nav-grid-assets")).toBeTruthy();
  });

  it("renders the networth empty-state on first-run data", () => {
    render(<FinykApp />);
    // Networth history starts empty in the `useFinykOverviewData` stub
    // — we expect the "too few snapshots" placeholder, not the chart.
    expect(screen.getByTestId("finyk-overview-networth-empty")).toBeTruthy();
  });
});
