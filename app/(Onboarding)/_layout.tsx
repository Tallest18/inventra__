// app/(Onboarding)/_layout.tsx
import {
  AnimatedStack as Stack,
  OVERLAY_ROUTE,
  PAGE_TRANSITION,
} from "@/components/navigation/AnimatedStack";

/**
 * Without this the group is not a route of its own  the child registers as
 * "(Onboarding)/Onboarding1", so the root layout's <Stack.Screen
 * name="(Onboarding)"> never matched and its full-bleed blue splash styling
 * was silently dropped.
 */
export default function OnboardingLayout() {
  return (
    <Stack screenOptions={PAGE_TRANSITION}>
      <Stack.Screen name="Onboarding1" />
    </Stack>
  );
}
