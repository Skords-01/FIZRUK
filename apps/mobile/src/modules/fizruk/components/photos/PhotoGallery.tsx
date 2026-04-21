/**
 * Fizruk — PhotoGallery (React Native).
 *
 * Grid of photo thumbnails grouped by month, rendered inside the parent
 * screen's `ScrollView`. Taps on a thumbnail delegate to `onOpen` so
 * the page owns viewer state — this component is a pure presentational
 * view on top of `PhotoMonthGroup[]`.
 *
 * Uses the built-in `Image` component for rendering; once `expo-image`
 * is added in the follow-up PR we'll swap to it for cached decoding
 * and memory win on large grids. The switch is local — parent API
 * doesn't change.
 */

import { Image, Pressable, Text, View } from "react-native";

import type {
  BodyPhotoMeta,
  PhotoMonthGroup,
} from "@sergeant/fizruk-domain/domain/photos/index";

export interface PhotoGalleryProps {
  groups: readonly PhotoMonthGroup[];
  onOpen: (photo: BodyPhotoMeta) => void;
  /** Accessibility label prefix for thumbnails. Defaults to "Фото". */
  thumbnailLabel?: string;
}

export function PhotoGallery({
  groups,
  onOpen,
  thumbnailLabel = "Фото",
}: PhotoGalleryProps) {
  return (
    <View className="gap-4" testID="fizruk-photos-gallery">
      {groups.map((group) => (
        <View key={group.monthKey} className="gap-2">
          <Text
            className="text-xs font-semibold text-stone-500 uppercase"
            accessibilityRole="header"
          >
            {group.label}
          </Text>
          <View className="flex-row flex-wrap -mx-1">
            {group.photos.map((photo) => (
              <View
                key={photo.id}
                style={{ width: "33.3333%" }}
                className="px-1 mb-2"
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${thumbnailLabel} ${photo.takenAt}`}
                  testID={`fizruk-photo-thumb-${photo.id}`}
                  onPress={() => onOpen(photo)}
                  className="rounded-xl overflow-hidden bg-cream-100 border border-cream-300"
                  style={{ aspectRatio: 3 / 4 }}
                >
                  <Image
                    source={{ uri: photo.uri }}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                    accessibilityIgnoresInvertColors
                  />
                  {photo.note ? (
                    <View className="absolute left-1 right-1 bottom-1 rounded-md bg-black/50 px-1.5 py-0.5">
                      <Text
                        className="text-[10px] text-white"
                        numberOfLines={1}
                      >
                        {photo.note}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

export default PhotoGallery;
