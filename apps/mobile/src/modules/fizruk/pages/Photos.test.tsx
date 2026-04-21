/**
 * Render + interaction tests for `pages/Photos.tsx` (Phase 6 / PR-E).
 *
 * Covers the four invariants called out in the PR spec:
 *   1. Empty-state renders when no photos exist.
 *   2. A 3-photo gallery renders every thumbnail (plus the month
 *      heading above them).
 *   3. Tapping a thumbnail opens the full-screen viewer and shows the
 *      tapped photo.
 *   4. Pressing the viewer's "delete" action invokes the hook's
 *      `remove` CRUD op with the right id.
 *
 * The Photos page pulls from `useBodyPhotos`, which goes through
 * `@/lib/storage` (MMKV) and the local `photoFileStore` adapter. Rather
 * than mock both modules for every test, the page exposes a
 * `photosAdapter` prop that matches the hook's return type — we inject
 * a fake adapter with spy callbacks so tests only exercise the screen
 * logic. The follow-up PR (once `expo-file-system` / `expo-image-picker`
 * land) will add integration coverage that exercises the hook end-to-
 * end with `jest.mock("expo-file-system", …)` + `jest.mock(
 * "expo-image-picker", …)` — placeholders below call out the shape
 * that mock must have.
 */

import { fireEvent, render } from "@testing-library/react-native";

import type { BodyPhotoMeta } from "@sergeant/fizruk-domain/domain/photos/index";

import { Photos } from "./Photos";
import type { UseBodyPhotosReturn } from "../hooks/useBodyPhotos";

// The Photos page uses `SafeAreaView` from `react-native-safe-area-context`.
// Other suites in this module stub it the same way — keep parity so the
// screen renders under jest-expo's node env.
jest.mock("react-native-safe-area-context", () => {
  const RN = jest.requireActual("react-native");
  return {
    SafeAreaView: RN.View,
    SafeAreaProvider: ({ children }: { children: unknown }) => children,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

// TODO(fizruk-mobile, PR-E follow-up): once `expo-file-system` +
// `expo-image-picker` are in `apps/mobile/package.json`, add:
//
//   jest.mock("expo-file-system", () => ({
//     documentDirectory: "file:///sandbox/",
//     makeDirectoryAsync: jest.fn(() => Promise.resolve()),
//     copyAsync: jest.fn(() => Promise.resolve()),
//     deleteAsync: jest.fn(() => Promise.resolve()),
//   }));
//   jest.mock("expo-image-picker", () => ({
//     requestMediaLibraryPermissionsAsync: jest.fn(() =>
//       Promise.resolve({ granted: true }),
//     ),
//     launchImageLibraryAsync: jest.fn(() =>
//       Promise.resolve({ canceled: false, assets: [{ uri: "file:///picked.jpg" }] }),
//     ),
//   }));
//
// Those mocks stay scoped to the integration tests that exercise the
// real `useBodyPhotos` / `photoFileStore` modules end-to-end.

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

function adapter(overrides: Partial<UseBodyPhotosReturn>): UseBodyPhotosReturn {
  const photos = overrides.photos ?? [];
  return {
    photos,
    ready: true,
    list: () => photos,
    add: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(async () => {}),
    clear: jest.fn(),
    ...overrides,
  };
}

describe("Fizruk Photos screen (mobile)", () => {
  it("renders the empty-state card when no photos exist", () => {
    const { getByTestId, queryByTestId } = render(
      <Photos photosAdapter={adapter({ photos: [] })} />,
    );

    expect(getByTestId("fizruk-photos-screen")).toBeTruthy();
    expect(getByTestId("fizruk-photos-empty")).toBeTruthy();
    expect(queryByTestId("fizruk-photos-gallery")).toBeNull();
    expect(queryByTestId("fizruk-photo-viewer")).toBeNull();
    expect(getByTestId("fizruk-photos-add")).toBeTruthy();
  });

  it("renders the gallery with every thumbnail when photos are present", () => {
    const photos: BodyPhotoMeta[] = [
      photo({ id: "p1", takenAt: "2026-04-01" }),
      photo({ id: "p2", takenAt: "2026-04-15", note: "Тиждень 2" }),
      photo({ id: "p3", takenAt: "2026-03-20" }),
    ];

    const { getByTestId, getByText, queryByTestId } = render(
      <Photos photosAdapter={adapter({ photos })} />,
    );

    expect(queryByTestId("fizruk-photos-empty")).toBeNull();
    expect(getByTestId("fizruk-photos-gallery")).toBeTruthy();
    // Every thumbnail is mounted — the gallery does not virtualise.
    expect(getByTestId("fizruk-photo-thumb-p1")).toBeTruthy();
    expect(getByTestId("fizruk-photo-thumb-p2")).toBeTruthy();
    expect(getByTestId("fizruk-photo-thumb-p3")).toBeTruthy();
    // Month headings from `groupPhotosByMonth` are rendered (latest
    // month first).
    expect(getByText("квітень 2026")).toBeTruthy();
    expect(getByText("березень 2026")).toBeTruthy();
  });

  it("opens the full-screen viewer when a thumbnail is tapped", () => {
    const photos: BodyPhotoMeta[] = [
      photo({ id: "p1", takenAt: "2026-04-01" }),
      photo({ id: "p2", takenAt: "2026-04-15" }),
    ];

    const { getByTestId, queryByTestId } = render(
      <Photos photosAdapter={adapter({ photos })} />,
    );

    // Viewer is not mounted until a thumbnail is tapped.
    expect(queryByTestId("fizruk-photo-viewer")).toBeNull();

    fireEvent.press(getByTestId("fizruk-photo-thumb-p1"));
    expect(getByTestId("fizruk-photo-viewer")).toBeTruthy();
    expect(getByTestId("fizruk-photo-viewer-image-p1")).toBeTruthy();
  });

  it("removes the entry when the viewer's delete action is pressed", async () => {
    const removeSpy = jest.fn(async (_id: string) => {});
    const photos: BodyPhotoMeta[] = [
      photo({ id: "p1", takenAt: "2026-04-01" }),
      photo({ id: "p2", takenAt: "2026-04-15" }),
    ];

    const { getByTestId } = render(
      <Photos photosAdapter={adapter({ photos, remove: removeSpy })} />,
    );

    fireEvent.press(getByTestId("fizruk-photo-thumb-p2"));
    fireEvent.press(getByTestId("fizruk-photo-viewer-delete"));

    expect(removeSpy).toHaveBeenCalledTimes(1);
    expect(removeSpy).toHaveBeenCalledWith("p2");
  });
});
