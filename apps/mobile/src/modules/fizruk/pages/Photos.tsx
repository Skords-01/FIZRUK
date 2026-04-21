/**
 * Fizruk / Photos — body-photo progress screen (Phase 6 · PR-E).
 *
 * Mobile port of `apps/web/src/modules/fizruk/components/PhotoProgress.tsx`
 * scoped to the PR-E deliverables (gallery grid + full-screen viewer +
 * add flow). The before/after `CompareSlider` that web renders inline
 * will follow in a dedicated UI PR — the pure `pairBeforeAfterOfMonth`
 * selector is already shipped in `@sergeant/fizruk-domain` so the UI
 * port is a pure addition.
 *
 * BLOB storage lives under `FileSystem.documentDirectory +
 * "fizruk/photos/<id>.jpg"` (see `hooks/photoFileStore.ts`). Metadata
 * lives in MMKV under the `BODY_PHOTOS_STORAGE_KEY` constant shipped
 * in `@sergeant/fizruk-domain/constants`.
 *
 * IMPORTANT: `expo-image-picker` / `expo-file-system` / `expo-image`
 * are NOT yet in `apps/mobile/package.json`. Per the PR-E spec we
 * ship the screen with a stubbed "+ Додати" button (disabled with a
 * visible TODO) + data-URI-friendly thumbnails. A follow-up PR swaps
 * the stub for a real picker without touching the page structure.
 */

import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  groupPhotosByMonth,
  sortPhotosLatestFirst,
  type BodyPhotoMeta,
} from "@sergeant/fizruk-domain/domain/photos/index";

import { Card } from "@/components/ui/Card";

import { PhotoGallery } from "../components/photos/PhotoGallery";
import { PhotoViewer } from "../components/photos/PhotoViewer";
import { useBodyPhotos } from "../hooks/useBodyPhotos";
import type { UseBodyPhotosReturn } from "../hooks/useBodyPhotos";

export interface PhotosProps {
  /**
   * Dependency-injected hook return for jest tests / storybook. When
   * omitted the screen reads from the real `useBodyPhotos` hook.
   */
  photosAdapter?: UseBodyPhotosReturn;
}

export function Photos({ photosAdapter }: PhotosProps = {}) {
  const liveAdapter = useBodyPhotos();
  const adapter: UseBodyPhotosReturn = photosAdapter ?? liveAdapter;
  const { photos, remove } = adapter;

  const sorted = useMemo(() => sortPhotosLatestFirst(photos), [photos]);
  const groups = useMemo(() => groupPhotosByMonth(sorted), [sorted]);

  const [viewerId, setViewerId] = useState<string | null>(null);
  const current = useMemo(
    () => sorted.find((p) => p.id === viewerId) ?? null,
    [sorted, viewerId],
  );

  const handleOpen = useCallback((photo: BodyPhotoMeta) => {
    setViewerId(photo.id);
  }, []);

  const handleClose = useCallback(() => setViewerId(null), []);

  const handleChange = useCallback((next: BodyPhotoMeta) => {
    setViewerId(next.id);
  }, []);

  const handleDelete = useCallback(
    async (photo: BodyPhotoMeta) => {
      // Close first so the viewer unmounts synchronously — prevents a
      // flash of a missing image before the parent re-renders with the
      // shorter list.
      setViewerId(null);
      await remove(photo.id);
    },
    [remove],
  );

  const empty = sorted.length === 0;

  return (
    <SafeAreaView
      className="flex-1 bg-cream-50"
      edges={["bottom"]}
      testID="fizruk-photos-screen"
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 96, gap: 12 }}
      >
        <View className="gap-1">
          <Text className="text-[22px] font-bold text-stone-900">
            Фото-прогрес
          </Text>
          <Text className="text-sm text-stone-600 leading-snug">
            Додавай фото раз на тиждень — тут збережеться повна стрічка прогресу
            по місяцях.
          </Text>
        </View>

        {empty ? (
          <Card
            radius="lg"
            padding="xl"
            className="items-center"
            testID="fizruk-photos-empty"
          >
            <Text className="text-3xl mb-2">{"📸"}</Text>
            <Text className="text-sm font-semibold text-stone-900 mb-1">
              {"Додай перше фото прогресу"}
            </Text>
            <Text className="text-xs text-stone-500 text-center">
              {
                "Коли додаси хоча б одне фото, воно зʼявиться в сітці нижче та у повноекранному перегляді"
              }
            </Text>
          </Card>
        ) : (
          <PhotoGallery groups={groups} onOpen={handleOpen} />
        )}

        {/*
         * `expo-image-picker` is NOT yet in `apps/mobile/package.json`.
         * We ship the screen with a disabled stub so reviewers can see
         * the visual and the intent. Follow-up PR adds the dep and
         * swaps `disabled` for the real `launchImageLibraryAsync` call.
         */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Додати фото"
          accessibilityState={{ disabled: true }}
          testID="fizruk-photos-add"
          disabled
          className="h-12 rounded-2xl border border-dashed border-teal-300 bg-teal-50/60 items-center justify-center opacity-70"
        >
          <Text className="text-sm font-semibold text-teal-700">
            + Додати фото (скоро)
          </Text>
        </Pressable>
        <Text className="text-[10px] text-stone-400 text-center">
          {
            "Фаза 6 · PR-E — сторінка з галереєю, переглядачем і CRUD-гуком. Кнопка додавання під'єднається у наступному PR разом із expo-image-picker."
          }
        </Text>
      </ScrollView>

      <PhotoViewer
        photos={sorted}
        current={current}
        onClose={handleClose}
        onChange={handleChange}
        onDelete={handleDelete}
      />
    </SafeAreaView>
  );
}

export default Photos;
