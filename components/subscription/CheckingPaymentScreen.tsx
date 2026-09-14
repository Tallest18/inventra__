// components/subscription/CheckingPaymentScreen.tsx
import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

import { AUTH_FONTS } from "@/components/auth/authTheme";
import { moderateScale, scale, verticalScale } from "@/utils/scaling";
import { PAYWALL_COLORS } from "./paywallParts";

/** Shown while the transfer is being confirmed with Paystack. */
export const CheckingPaymentScreen: React.FC = () => {
  const dots = useRef([0, 1, 2].map(() => new Animated.Value(0.35))).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.stagger(
        180,
        dots.map((dot) =>
          Animated.sequence([
            Animated.timing(dot, {
              toValue: 1,
              duration: 320,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(dot, {
              toValue: 0.35,
              duration: 320,
              easing: Easing.in(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
        ),
      ),
    );
    pulse.start();
    return () => pulse.stop();
  }, [dots]);

  return (
    <View style={styles.page}>
      <View style={styles.ring}>
        <Text style={styles.glyph}>₦</Text>
      </View>
      <Text style={styles.title}>Checking Your Payment</Text>
      <Text style={styles.body}>
        We're confirming your payment. This usually takes a few moments.
      </Text>
      <View style={styles.dots}>
        {dots.map((opacity, index) => (
          <Animated.View key={index} style={[styles.dot, { opacity }]} />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: PAYWALL_COLORS.page,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scale(32),
  },
  ring: {
    width: scale(86),
    height: scale(86),
    borderRadius: scale(43),
    borderWidth: 3,
    borderColor: "#C8D7F1",
    alignItems: "center",
    justifyContent: "center",
  },
  glyph: {
    fontSize: moderateScale(26),
    fontFamily: AUTH_FONTS.bold,
    color: PAYWALL_COLORS.brand,
  },
  title: {
    fontSize: moderateScale(24),
    fontFamily: AUTH_FONTS.bold,
    color: PAYWALL_COLORS.text,
    textAlign: "center",
    marginTop: verticalScale(30),
  },
  body: {
    fontSize: moderateScale(15.5),
    lineHeight: moderateScale(24),
    fontFamily: AUTH_FONTS.regular,
    color: PAYWALL_COLORS.textMuted,
    textAlign: "center",
    marginTop: verticalScale(12),
  },
  dots: {
    flexDirection: "row",
    gap: scale(8),
    marginTop: verticalScale(28),
  },
  dot: {
    width: scale(10),
    height: scale(10),
    borderRadius: scale(5),
    backgroundColor: "#7FA3E3",
  },
});
