/**
 * Fizruk — PhotoViewer (React Native).
 *
 * Full-screen modal that renders a single `BodyPhotoMeta` with prev /
 * next chevrons driving the sibling navigation through
 * `neighborPhoto` from `@sergeant/fizruk-domain/domain/photos`. Also
 * exposes a "delete" action so the host screen can wire it to
 * `useBodyPhotos().remove`.
 *
 * This component is intentionally imperative about what it renders —
 * swipe-to-change (using `react-native-gesture-handler`) is a nice-to-
 * have for a later PR; the chevrons + hardware back already satisfy
 * the PR-E scope and they're deterministic under jest-native.
 */

import { useCallback } from "react";
import {
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  Text,
  View,
} from "react-native";

import {
  formatTakenAtLabel,
  neighborPhoto,
  type BodyPhotoMeta,
} from "@sergeant/fizruk-domain/domain/photos/index";

export interface PhotoViewerProps {
  /** Whole gallery the viewer navigates through (already sorted). */
  photos: readonly BodyPhotoMeta[];
  /** Currently-displayed photo — also drives `open`. */
  current: BodyPhotoMeta | null;
  onClose: () => void;
  onChange: (next: BodyPhotoMeta) => void;
  onDelete: (photo: BodyPhotoMeta) => void;
}

export function PhotoViewer({
  photos,
  current,
  onClose,
  onChange,
  onDelete,
}: PhotoViewerProps) {
  const goDelta = useCallback(
    (delta: number) => {
      if (!current) return;
      const next = neighborPhoto(photos, current.id, delta);
      if (next) onChange(next);
    },
    [photos, current, onChange],
  );

  const canPrev = current
    ? neighborPhoto(photos, current.id, -1) !== null
    : false;
  const canNext = current
    ? neighborPhoto(photos, current.id, +1) !== null
    : false;

  const open = current !== null;

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <SafeAreaView className="flex-1 bg-black" testID="fizruk-photo-viewer">
        {current ? (
          <View className="flex-1">
            <View className="flex-row items-center justify-between px-4 py-3">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Закрити фото"
                testID="fizruk-photo-viewer-close"
                onPress={onClose}
                className="h-11 w-11 items-center justify-center rounded-full bg-white/10"
              >
                <Text className="text-white text-lg">✕</Text>
              </Pressable>
              <Text className="text-white text-sm font-semibold">
                {formatTakenAtLabel(current.takenAt)}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Видалити фото"
                testID="fizruk-photo-viewer-delete"
                onPress={() => onDelete(current)}
                className="h-11 w-11 items-center justify-center rounded-full bg-white/10"
              >
                <Text className="text-white text-lg">🗑</Text>
              </Pressable>
            </View>

            <View className="flex-1 items-center justify-center">
              <Image
                source={{ uri: current.uri }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="contain"
                accessibilityIgnoresInvertColors
                testID={`fizruk-photo-viewer-image-${current.id}`}
              />
            </View>

            {current.note ? (
              <View className="px-4 pb-2">
                <Text className="text-white/90 text-xs">{current.note}</Text>
              </View>
            ) : null}

            <View className="flex-row items-center justify-between px-4 pb-4">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Попереднє фото"
                accessibilityState={{ disabled: !canPrev }}
                testID="fizruk-photo-viewer-prev"
                disabled={!canPrev}
                onPress={() => goDelta(-1)}
                className={`h-12 px-5 items-center justify-center rounded-full ${
                  canPrev ? "bg-white/15" : "bg-white/5 opacity-40"
                }`}
              >
                <Text className="text-white text-sm font-semibold">
                  ‹ Попереднє
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Наступне фото"
                accessibilityState={{ disabled: !canNext }}
                testID="fizruk-photo-viewer-next"
                disabled={!canNext}
                onPress={() => goDelta(+1)}
                className={`h-12 px-5 items-center justify-center rounded-full ${
                  canNext ? "bg-white/15" : "bg-white/5 opacity-40"
                }`}
              >
                <Text className="text-white text-sm font-semibold">
                  Наступне ›
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

export default PhotoViewer;
