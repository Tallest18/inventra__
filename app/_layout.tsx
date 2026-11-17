import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { useRouter, useSegments } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AnimatedStack, FULL_HEIGHT, PAGE_TRANSITION } from "@/components/navigation/AnimatedStack";
import * as SplashScreen from "expo-splash-screen";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, Text, TextInput } from "react-native";
import {
    SafeAreaProvider,
    useSafeAreaInsets,
} from "react-native-safe-area-context";

import { SubscriptionWatcher } from "@/components/auth/SubscriptionWatcher";
import { BroadcastWatcher } from "@/components/notifications/BroadcastWatcher";
import { InactivityLockWatcher, recordUserActivity } from "@/components/security/InactivityLockWatcher";
import { AddProductContext } from "@/context/AddProductContext";
import type { Product as AddProductModel } from "@/hooks/useAddProductForm";
import {
  clearTokens,
  getAccessToken,
  getProfile,
  parseApiError,
  signedOutRoute,
} from "@/src/api";
import type { OnboardingStatus } from "@/src/api/types";
import { FONT_ASSETS } from "../constants/fonts";
import AddProductFlow from "./(Routes)/AddProductFlow";

SplashScreen.preventAutoHideAsync();

/** How long the branded splash stays up even when the session check is instant. */
const SPLASH_MIN_MS = 1800;

type Session =
  // `route` is Welcome Back when the device remembers a number, else sign-up.
  | { status: "signed-out"; route: string }
  | { status: "signed-in"; onboarding: OnboardingStatus };

/**
 * Everything routes on `onboarding_status`, the one field the API documents as
 * covering every case: no PIN yet, PIN but no trial, active, or lapsed.
 */
function destinationFor(session: Session): string {
  if (session.status === "signed-out") return session.route;

  switch (session.onboarding) {
    case "active":
      return "/(Main)/Home";
    case "verify_number":
      // Verified the number but never set a business type or PIN.
      return "/(Auth)/BusinessSelectionScreen";
    case "start_trial":
    case "expired":
    default:
      // The design has no trial or paywall screen  the subscription gate
      // surfaces those states on the first product call instead.
      return "/(Main)/Home";
  }
}

export default function AppLayout() {
  return (
    // Gesture root: the animated stack's swipe-back needs it on native.
    <GestureHandlerRootView
      style={{ flex: 1 }}
      onStartShouldSetResponderCapture={() => {
        recordUserActivity();
        return false;
      }}
    >
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppContent() {
  const [session, setSession] = useState<Session | null>(null);
  const [splashElapsed, setSplashElapsed] = useState(false);
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // A 401/403 is an auth state, not a transient fault. Retrying it
            // three times (React Query's default) floods both the network tab
            // and the server with calls that cannot possibly succeed.
            retry: (failureCount, error) => {
              const status = (error as any)?.response?.status;
              if (status === 401 || status === 403) return false;
              return failureCount < 2;
            },
          },
        },
      }),
  );
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [addProductInitialProduct, setAddProductInitialProduct] = useState<
    AddProductModel | undefined
  >(undefined);
  const [addProductStartStep, setAddProductStartStep] = useState(0);
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const navigationHandled = useRef(false);

  const [fontsLoaded, fontError] = useFonts(FONT_ASSETS);

  // --- Global font defaults ---
  useEffect(() => {
    if (!fontsLoaded && !fontError) return;

    (Text as any).defaultProps = {
      ...(Text as any).defaultProps,
      allowFontScaling: false,
      maxFontSizeMultiplier: 1,
    };

    (TextInput as any).defaultProps = {
      ...(TextInput as any).defaultProps,
      allowFontScaling: false,
      maxFontSizeMultiplier: 1,
    };
  }, [fontsLoaded, fontError]);

  // --- Bootstrap auth session ---
  useEffect(() => {
    let cancelled = false;

    const bootstrapSession = async () => {
      try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
          const route = await signedOutRoute();
          if (!cancelled) setSession({ status: "signed-out", route });
          return;
        }
        const profile = await getProfile();
        if (!cancelled) {
          setSession({
            status: "signed-in",
            onboarding: profile.onboarding_status,
          });
        }
      } catch (err: any) {
        // A 403 is NOT a failed login. /auth/profile/ is gated behind the
        // subscription (despite the docs saying otherwise), so a user who has
        // registered but not started a trial gets one here with a perfectly
        // valid token. Clearing it would sign them out on every reload 
        // precisely the people who should be seeing the blocking trial sheet.
        const info = parseApiError(err);
        const gated =
          info.status === 403 ||
          info.code === "trial_required" ||
          info.code === "subscription_expired";

        if (gated) {
          if (!cancelled) {
            setSession({
              status: "signed-in",
              onboarding:
                info.code === "subscription_expired" ? "expired" : "start_trial",
            });
          }
          return;
        }

        await clearTokens();
        const route = await signedOutRoute();
        if (!cancelled) setSession({ status: "signed-out", route });
      }
    };

    bootstrapSession();

    const splashTimer = setTimeout(() => setSplashElapsed(true), SPLASH_MIN_MS);

    return () => {
      cancelled = true;
      clearTimeout(splashTimer);
    };
  }, []);

  // --- Handle navigation based on auth state ---
  const handleNavigation = useCallback(() => {
    const fontsReady = fontsLoaded || fontError;
    const routerReady = segments.length > 0 && !!segments[0];

    // The splash is a real screen in the flow, so hold the redirect until it has
    // had its moment  otherwise a warm session flashes past it.
    if (!fontsReady || !session || !routerReady || !splashElapsed) return;
    if (navigationHandled.current) return;

    SplashScreen.hideAsync();

    const inProtectedGroup =
      segments[0] === "(Main)" || segments[0] === "(Routes)";

    // Anywhere but the splash means the user is already navigating themselves.
    if (segments[0] !== "(Onboarding)") {
      navigationHandled.current = true;
      if (session.status === "signed-out" && inProtectedGroup) {
        router.replace(session.route as any);
      }
      return;
    }

    // FIX: Set the flag BEFORE calling router.replace so a re-render
    // triggered by the replace cannot fire this callback a second time.
    // The old setTimeout(..., 100) caused a race: if the user tapped a tab
    // within that 100 ms window, Expo Router tore down part of the navigator
    // tree, and when the timeout fired it called History.pushState on a null
    // node → "Cannot read properties of null (reading 'dispatchEvent')".
    navigationHandled.current = true;
    router.replace(destinationFor(session) as any);
  }, [fontsLoaded, fontError, session, splashElapsed, segments, router]);

  useEffect(() => {
    handleNavigation();
  }, [handleNavigation]);

  if (!fontsLoaded && !fontError) return null;

  const openAddProduct = () => {
    setAddProductInitialProduct(undefined);
    setAddProductStartStep(0);
    setShowAddProduct(true);
  };

  const openRestockProduct = (product: AddProductModel) => {
    setAddProductInitialProduct(product);
    setAddProductStartStep(1);
    setShowAddProduct(true);
  };

  const closeAddProduct = () => {
    setShowAddProduct(false);
    setAddProductInitialProduct(undefined);
    setAddProductStartStep(0);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AddProductContext.Provider
        value={{ openAddProduct, openRestockProduct }}
      >
        <AnimatedStack
          screenOptions={{
            ...PAGE_TRANSITION,
            cardStyle: {
              ...FULL_HEIGHT,
              paddingTop: Platform.OS === "android" ? insets.top : 0,
              backgroundColor: "#E7EEFA",
            },
          }}
        >
          <AnimatedStack.Screen
            name="(Onboarding)"
            options={{
              headerShown: false,
              // Full-bleed blue splash: drop the global top inset + grey
              // background so the status-bar strip isn't a mismatched colour.
              cardStyle: { ...FULL_HEIGHT, paddingTop: 0, backgroundColor: "#1155CC" },
            }}
          />
          <AnimatedStack.Screen
            name="(Auth)"
            options={{
              headerShown: false,
              // Same reason as the splash: the auth screens are full-bleed blue
              // and apply their own top inset, so the global one would be
              // counted twice under a mismatched grey strip.
              cardStyle: { ...FULL_HEIGHT, paddingTop: 0, backgroundColor: "#1155CC" },
            }}
          />
          <AnimatedStack.Screen name="(Main)" options={{ headerShown: false }} />
          <AnimatedStack.Screen name="(Routes)" options={{ headerShown: false }} />
        </AnimatedStack>

        {/* App-wide, so an expiry or reminder surfaces on whatever screen the
            user is on. It self-gates on the stored token rather than on
            `session`, which is resolved once at boot and would still read
            "signed out" straight after a fresh registration. */}
        <SubscriptionWatcher />
        <BroadcastWatcher />
        <InactivityLockWatcher />

        {/* Mounted only once signed in. ProductFormModal calls useProductsData
            in its component body, so keeping this mounted on the auth screens
            fired unauthenticated /products/ requests on every screen. */}
        {session?.status === "signed-in" && (
          <AddProductFlow
            visible={showAddProduct}
            onClose={closeAddProduct}
            onSaveProduct={closeAddProduct}
            initialProduct={addProductInitialProduct}
            startStep={addProductStartStep}
          />
        )}
      </AddProductContext.Provider>
    </QueryClientProvider>
  );
}
