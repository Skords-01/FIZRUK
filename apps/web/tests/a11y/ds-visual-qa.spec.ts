import { test, type Page } from "@playwright/test";
import { argosScreenshot } from "@argos-ci/playwright";

/**
 * Design-system visual regression — captures 30 screenshots:
 * 3 viewports × 2 themes × 5 hub surfaces.
 *
 * When ARGOS_TOKEN is set (CI via visual-regression.yml), the Argos
 * reporter uploads them for pixel-diff comparison against the baseline.
 * Without the token screenshots are saved locally to `./screenshots/`.
 *
 * Run explicitly: `pnpm test:visual`
 * (uses playwright.visual.config.ts — not included in the regular a11y lane)
 */

const WIDTHS = [375, 414, 768] as const;
const THEMES = ["light", "dark"] as const;

const SURFACES: Array<{ name: string; path: string }> = [
  { name: "hub", path: "/" },
  { name: "finyk", path: "/?module=finyk" },
  { name: "fizruk", path: "/?module=fizruk" },
  { name: "routine", path: "/?module=routine" },
  { name: "nutrition", path: "/?module=nutrition" },
];

function buildSeed(theme: "light" | "dark"): Record<string, string> {
  return {
    hub_onboarding_done_v1: "1",
    hub_first_action_done_v1: "1",
    finyk_manual_only_v1: "1",
    hub_dark_mode_v1: theme === "dark" ? "1" : "0",
    hub_vibe_picks_v1: JSON.stringify({
      picks: ["finyk", "fizruk", "nutrition", "routine"],
      firstActionPending: null,
      firstActionStartedAt: null,
      firstRealEntryAt: Date.now(),
      updatedAt: Date.now(),
    }),
  };
}

async function seedLocalStorage(page: Page, theme: "light" | "dark") {
  await page.addInitScript((entries: Record<string, string>) => {
    try {
      for (const [k, v] of Object.entries(entries)) {
        window.localStorage.setItem(k, v);
      }
    } catch {
      /* ignore */
    }
  }, buildSeed(theme));
}

for (const theme of THEMES) {
  for (const width of WIDTHS) {
    test(`visual: ${theme} @ ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await seedLocalStorage(page, theme);

      for (const { name, path: routePath } of SURFACES) {
        await page.goto(routePath, { waitUntil: "domcontentloaded" });
        await page
          .waitForLoadState("networkidle", { timeout: 15_000 })
          .catch(() => {
            /* some surfaces keep long-polling — OK */
          });
        await page
          .locator("main, #root > *")
          .first()
          .waitFor({ state: "visible", timeout: 10_000 });
        // Extra settle for Recharts + lazy chunks
        await page.waitForTimeout(800);

        // Screenshot name: "light/375/hub" → Argos groups by folder path
        await argosScreenshot(page, `${theme}/${width}/${name}`, {
          fullPage: true,
          animations: "disabled",
        });
      }
    });
  }
}
