/**
 * Sergeant Design System — SwipeableRow (React Native)
 *
 * Swipeable row component for list items with action buttons.
 * Perfect for transactions, habits, and other list-based content.
 *
 * Features:
 * - Left and right swipe actions
 * - Haptic feedback on action trigger
 * - Auto-close after action
 * - Spring-based animations
 * - Accessibility support
 */

import * as Haptics from "expo-haptics";
import type { LucideIcon } from "lucide-react-native";
import { Edit2, MoreHorizontal, Trash2 } from "lucide-react-native";
import { useCallback, useRef, type ReactNode } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";

export interface SwipeAction {
  /** Unique key for the action */
  key: string;
  /** Icon component */
  icon: LucideIcon;
  /** Background color */
  backgroundColor: string;
  /** Icon color */
  iconColor?: string;
  /** Label text */
  label?: string;
  /** Callback when action is triggered */
  onPress: () => void;
  /** Whether this is a destructive action (triggers on full swipe) */
  destructive?: boolean;
}

export interface SwipeableRowProps {
  /** Left side actions (swipe right to reveal) */
  leftActions?: SwipeAction[];
  /** Right side actions (swipe left to reveal) */
  rightActions?: SwipeAction[];
  /** Row content */
  children: ReactNode;
  /** Width of each action button */
  actionWidth?: number;
  /** Threshold percentage to trigger full action */
  threshold?: number;
  /** Disable swipe functionality */
  disabled?: boolean;
  /** Called when row is swiped open */
  onSwipeOpen?: (direction: "left" | "right") => void;
  /** Called when row is closed */
  onSwipeClose?: () => void;
  /** Additional container classes */
  className?: string;
}

const DEFAULT_ACTION_WIDTH = 72;
const DEFAULT_THRESHOLD = 0.5;

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function SwipeableRow({
  leftActions = [],
  rightActions = [],
  children,
  actionWidth = DEFAULT_ACTION_WIDTH,
  threshold = DEFAULT_THRESHOLD,
  disabled = false,
  onSwipeOpen,
  onSwipeClose,
  className,
}: SwipeableRowProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const isOpen = useRef<"left" | "right" | null>(null);

  const leftActionsWidth = leftActions.length * actionWidth;
  const rightActionsWidth = rightActions.length * actionWidth;

  const closeRow = useCallback(() => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      damping: 20,
      stiffness: 200,
    }).start();
    isOpen.current = null;
    onSwipeClose?.();
  }, [translateX, onSwipeClose]);

  const openLeft = useCallback(() => {
    Animated.spring(translateX, {
      toValue: leftActionsWidth,
      useNativeDriver: true,
      damping: 20,
      stiffness: 200,
    }).start();
    isOpen.current = "left";
    onSwipeOpen?.("left");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, [translateX, leftActionsWidth, onSwipeOpen]);

  const openRight = useCallback(() => {
    Animated.spring(translateX, {
      toValue: -rightActionsWidth,
      useNativeDriver: true,
      damping: 20,
      stiffness: 200,
    }).start();
    isOpen.current = "right";
    onSwipeOpen?.("right");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, [translateX, rightActionsWidth, onSwipeOpen]);

  const handleActionPress = useCallback(
    (action: SwipeAction) => {
      Haptics.impactAsync(
        action.destructive
          ? Haptics.ImpactFeedbackStyle.Heavy
          : Haptics.ImpactFeedbackStyle.Medium,
      ).catch(() => {});
      action.onPress();
      closeRow();
    },
    [closeRow],
  );

  const panGesture = Gesture.Pan()
    .enabled(!disabled)
    .onUpdate((event) => {
      let newValue = event.translationX;

      // Add resistance at boundaries
      if (newValue > leftActionsWidth) {
        newValue = leftActionsWidth + (newValue - leftActionsWidth) * 0.2;
      } else if (newValue < -rightActionsWidth) {
        newValue = -rightActionsWidth + (newValue + rightActionsWidth) * 0.2;
      }

      translateX.setValue(newValue);
    })
    .onEnd((event) => {
      const { translationX: tx, velocityX } = event;

      // Determine action based on velocity and position
      const shouldOpenLeft =
        (tx > leftActionsWidth * threshold || velocityX > 500) &&
        leftActions.length > 0;
      const shouldOpenRight =
        (tx < -rightActionsWidth * threshold || velocityX < -500) &&
        rightActions.length > 0;

      // Check for full swipe destructive action
      const leftDestructive = leftActions.find((a) => a.destructive);
      const rightDestructive = rightActions.find((a) => a.destructive);

      if (tx > leftActionsWidth * 1.5 && leftDestructive) {
        // Trigger destructive left action
        handleActionPress(leftDestructive);
        return;
      }

      if (tx < -rightActionsWidth * 1.5 && rightDestructive) {
        // Trigger destructive right action
        handleActionPress(rightDestructive);
        return;
      }

      if (shouldOpenLeft) {
        openLeft();
      } else if (shouldOpenRight) {
        openRight();
      } else {
        closeRow();
      }
    });

  const renderActions = (actions: SwipeAction[], side: "left" | "right") => {
    if (actions.length === 0) return null;

    const totalWidth = actions.length * actionWidth;

    // Animation for action buttons
    const actionTranslate = translateX.interpolate({
      inputRange: side === "left" ? [0, totalWidth] : [-totalWidth, 0],
      outputRange: side === "left" ? [-totalWidth, 0] : [0, totalWidth],
      extrapolate: "clamp",
    });

    const actionScale = translateX.interpolate({
      inputRange:
        side === "left"
          ? [0, totalWidth * 0.5, totalWidth]
          : [-totalWidth, -totalWidth * 0.5, 0],
      outputRange: [0.8, 0.9, 1],
      extrapolate: "clamp",
    });

    return (
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          [side]: 0,
          flexDirection: "row",
          width: totalWidth,
          transform: [{ translateX: actionTranslate }],
        }}
      >
        {actions.map((action, _index) => {
          const Icon = action.icon;
          return (
            <Animated.View
              key={action.key}
              style={{
                width: actionWidth,
                transform: [{ scale: actionScale }],
              }}
            >
              <Pressable
                onPress={() => handleActionPress(action)}
                accessibilityRole="button"
                accessibilityLabel={action.label || action.key}
                style={{ backgroundColor: action.backgroundColor }}
                className="flex-1 items-center justify-center"
              >
                <Icon
                  size={22}
                  color={action.iconColor || "#ffffff"}
                  strokeWidth={2}
                />
                {action.label && (
                  <Text
                    className="text-xs font-medium mt-1"
                    style={{ color: action.iconColor || "#ffffff" }}
                  >
                    {action.label}
                  </Text>
                )}
              </Pressable>
            </Animated.View>
          );
        })}
      </Animated.View>
    );
  };

  return (
    <GestureHandlerRootView className={cx("overflow-hidden", className)}>
      <View className="relative">
        {/* Left actions (revealed by swiping right) */}
        {renderActions(leftActions, "left")}

        {/* Right actions (revealed by swiping left) */}
        {renderActions(rightActions, "right")}

        {/* Main content */}
        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={{
              transform: [{ translateX }],
              backgroundColor: "#ffffff",
            }}
          >
            {children}
          </Animated.View>
        </GestureDetector>
      </View>
    </GestureHandlerRootView>
  );
}

/**
 * Pre-configured swipe actions for common use cases
 */
export const commonActions = {
  edit: (onPress: () => void): SwipeAction => ({
    key: "edit",
    icon: Edit2,
    backgroundColor: "#3b82f6", // blue-500
    label: "Редагувати",
    onPress,
  }),

  delete: (onPress: () => void): SwipeAction => ({
    key: "delete",
    icon: Trash2,
    backgroundColor: "#ef4444", // red-500
    label: "Видалити",
    onPress,
    destructive: true,
  }),

  more: (onPress: () => void): SwipeAction => ({
    key: "more",
    icon: MoreHorizontal,
    backgroundColor: "#6b7280", // gray-500
    label: "Більше",
    onPress,
  }),
};

/**
 * TransactionSwipeableRow — Pre-configured for transaction lists
 */
export function TransactionSwipeableRow({
  children,
  onEdit,
  onDelete,
  className,
}: {
  children: ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}) {
  const rightActions: SwipeAction[] = [];

  if (onEdit) {
    rightActions.push(commonActions.edit(onEdit));
  }

  if (onDelete) {
    rightActions.push(commonActions.delete(onDelete));
  }

  return (
    <SwipeableRow rightActions={rightActions} className={className}>
      {children}
    </SwipeableRow>
  );
}

/**
 * HabitSwipeableRow — Pre-configured for habit lists
 */
export function HabitSwipeableRow({
  children,
  onEdit,
  onSkip,
  onDelete,
  className,
}: {
  children: ReactNode;
  onEdit?: () => void;
  onSkip?: () => void;
  onDelete?: () => void;
  className?: string;
}) {
  const leftActions: SwipeAction[] = [];
  const rightActions: SwipeAction[] = [];

  if (onSkip) {
    leftActions.push({
      key: "skip",
      icon: MoreHorizontal,
      backgroundColor: "#f59e0b", // amber-500
      label: "Пропустити",
      onPress: onSkip,
    });
  }

  if (onEdit) {
    rightActions.push(commonActions.edit(onEdit));
  }

  if (onDelete) {
    rightActions.push(commonActions.delete(onDelete));
  }

  return (
    <SwipeableRow
      leftActions={leftActions}
      rightActions={rightActions}
      className={className}
    >
      {children}
    </SwipeableRow>
  );
}
