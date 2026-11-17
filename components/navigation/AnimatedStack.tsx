// components/navigation/AnimatedStack.tsx
//
// The app's one page transition. Expo Router's default <Stack> is the NATIVE
// stack, which doesn't animate on web. This is the JS stack from
// @react-navigation/stack wired into Expo Router, so every new page slides in
// the same way on web, iOS and Android (with swipe-back on touch devices).
//
// Use <AnimatedStack> wherever a layout would use <Stack>.
import {
  CardStyleInterpolators,
  createStackNavigator,
  TransitionPresets,
  type StackNavigationEventMap,
  type StackNavigationOptions,
} from "@react-navigation/stack";
import type { ParamListBase, StackNavigationState } from "@react-navigation/native";
import { withLayoutContext } from "expo-router";

const { Navigator } = createStackNavigator();

export const AnimatedStack = withLayoutContext<
  StackNavigationOptions,
  typeof Navigator,
  StackNavigationState<ParamListBase>,
  StackNavigationEventMap
>(Navigator);

/** Height-bounded page: lets ScrollView/FlatList inside actually scroll. */
export const FULL_HEIGHT = { flex: 1, minHeight: 0, overflow: "hidden" as const };

/** Full-width slide in from the right, previous page eased back: one feel app-wide. */
export const PAGE_TRANSITION: StackNavigationOptions = {
  headerShown: false,
  gestureEnabled: true,
  ...TransitionPresets.SlideFromRightIOS,
  // Each page fills the screen height. Without this the JS stack's cards on
  // web grow to fit their content, so nothing inside them can ever scroll.
  cardStyle: FULL_HEIGHT,
};

/** For routes that draw their own overlay (e.g. a bottom sheet) over the page below. */
export const OVERLAY_ROUTE: StackNavigationOptions = {
  headerShown: false,
  presentation: "transparentModal",
  cardStyle: { ...FULL_HEIGHT, backgroundColor: "transparent" },
  cardOverlayEnabled: false,
  gestureEnabled: false,
  cardStyleInterpolator: CardStyleInterpolators.forNoAnimation,
};
