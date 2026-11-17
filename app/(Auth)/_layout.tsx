// app/(Auth)/_layout.tsx
import {
  AnimatedStack as Stack,
  OVERLAY_ROUTE,
  PAGE_TRANSITION,
} from "@/components/navigation/AnimatedStack";

export default function AuthLayout() {
  return (
    <Stack screenOptions={PAGE_TRANSITION}>
      <Stack.Screen name="WelcomeScreen" />
      <Stack.Screen name="WelcomeBackScreen" />
      <Stack.Screen name="VerificationScreen" />
      <Stack.Screen name="BusinessSelectionScreen" />
      <Stack.Screen name="CreatePinScreen" />
    </Stack>
  );
}
