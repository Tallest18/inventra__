// app/(routes)/_layout.tsx
import {
  AnimatedStack as Stack,
  OVERLAY_ROUTE,
  PAGE_TRANSITION,
} from "@/components/navigation/AnimatedStack";
import React from "react";

export default function RoutesLayout() {
  return (
    <Stack screenOptions={PAGE_TRANSITION}>
      <Stack.Screen
        name="Profile"
        options={{
          headerShown: false,
          title: "Profile",
        }}
      />
      <Stack.Screen
        name="AccountScreen"
        options={{
          headerShown: false,
          title: "Account",
        }}
      />
      <Stack.Screen
        name="NewProductScreen"
        options={{
          headerShown: false,
          title: "New Product",
        }}
      />
      <Stack.Screen
        name="QuickSellScreen"
        options={{
          headerShown: false,
          title: "Quick Sell",
        }}
      />
      <Stack.Screen
        name="TotalSummaryScreen"
        options={{
          headerShown: false,
          title: "Sales Summary",
        }}
      />
      <Stack.Screen
        name="HelpCenterScreen"
        options={{
          headerShown: false,
          title: "Profile",
        }}
      />
      <Stack.Screen
        name="SettingsScreen"
        options={{
          headerShown: false,
          title: "Profile",
        }}
      />
      {/* Product Summary is a bottom sheet over the current screen, not a page.
          The screen itself draws the dimmed backdrop and slides the sheet up. */}
      <Stack.Screen
        name="ProductDetails"
        options={OVERLAY_ROUTE}
      />
      <Stack.Screen
        name="PrivacyPolicy"
        options={{
          headerShown: false,
          title: "Privacy Policy",
        }}
      />
    </Stack>
  );
}
