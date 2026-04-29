/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { HubBottomNav } from "./HubBottomNav";
import { ToastProvider } from "@shared/hooks/useToast";

const STORAGE_KEY = "sergeant.hub.reportsTabRevealedAt";

function renderNav(props: {
  hubView?: "dashboard" | "reports" | "settings";
  showReports?: boolean;
  onChange?: (v: "dashboard" | "reports" | "settings") => void;
}) {
  const onChange = props.onChange ?? vi.fn();
  return {
    onChange,
    ...render(
      <ToastProvider>
        <HubBottomNav
          hubView={props.hubView ?? "dashboard"}
          onChange={onChange}
          showReports={props.showReports ?? true}
        />
      </ToastProvider>,
    ),
  };
}

describe("HubBottomNav", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("рендерить три таби за замовчуванням", () => {
    renderNav({});
    expect(screen.getByRole("tab", { name: /Головна/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Звіти/ })).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /Налаштування/ }),
    ).toBeInTheDocument();
  });

  it("ховає «Звіти» коли showReports=false", () => {
    renderNav({ showReports: false });
    expect(screen.queryByRole("tab", { name: /Звіти/ })).toBeNull();
  });

  it("активний таб має aria-selected=true", () => {
    renderNav({ hubView: "reports" });
    const reports = screen.getByRole("tab", { name: /Звіти/ });
    expect(reports).toHaveAttribute("aria-selected", "true");

    const dashboard = screen.getByRole("tab", { name: /Головна/ });
    expect(dashboard).toHaveAttribute("aria-selected", "false");
  });

  it("виклик onChange при кліку на таб", () => {
    const { onChange } = renderNav({});
    fireEvent.click(screen.getByRole("tab", { name: /Налаштування/ }));
    expect(onChange).toHaveBeenCalledWith("settings");
  });

  it("tablist semantics: кожен таб має aria-controls", () => {
    renderNav({});
    const tabs = screen.getAllByRole("tab");
    for (const tab of tabs) {
      expect(tab).toHaveAttribute("aria-controls");
    }
  });

  it("ставить прапор у localStorage коли reports з'являється", () => {
    const { rerender, onChange } = renderNav({ showReports: false });
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

    rerender(
      <ToastProvider>
        <HubBottomNav
          hubView="dashboard"
          onChange={onChange}
          showReports={true}
        />
      </ToastProvider>,
    );
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });

  it("не показує toast вдруге: якщо прапор вже у localStorage", () => {
    localStorage.setItem(STORAGE_KEY, "123");
    renderNav({ showReports: true });
    // Bounce class = .animate-bounce-in. Без прапора й без transition «false→true»
    // анімація не повинна ставитись.
    const reports = screen.getByRole("tab", { name: /Звіти/ });
    expect(reports.className).not.toContain("animate-bounce-in");
  });
});
