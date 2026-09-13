import React from "react";
import { Image, StatusBar, StyleSheet, Text, View } from "react-native";
import { moderateScale, scale, verticalScale } from "../../utils/scaling";

/**
 * Branded splash. It deliberately does not navigate: the root layout waits for
 * the session check and then routes on `onboarding_status`, so this screen has
 * exactly one job.
 */
const Onboarding1 = () => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1155CC" />

      <View style={styles.centerContent}>
        <Image
          source={require("../../assets/images/splashScreen.png")}
          style={styles.mainLogo}
          resizeMode="contain"
        />
        <Text style={styles.wordmark} numberOfLines={1} adjustsFontSizeToFit>
          inventra
        </Text>
        <Text style={styles.tagline} numberOfLines={1} adjustsFontSizeToFit>
          One app, everything your shop needs
        </Text>
      </View>

      <View style={styles.logoContainer}>
        <Text style={styles.fromText}>From</Text>
        <View style={styles.logoRow}>
          <Image
            source={require("../../assets/images/logo.png")}
            style={styles.image}
          />
          <Text style={styles.logoText} numberOfLines={1} adjustsFontSizeToFit>
            Wonderfall
          </Text>
        </View>
        <Text style={styles.systemsText} numberOfLines={1} adjustsFontSizeToFit>
          S Y S T E M S
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1155CC",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: verticalScale(40),
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: scale(20),
  },
  mainLogo: {
    width: scale(86),
    height: verticalScale(86),
    marginBottom: verticalScale(12),
  },
  wordmark: {
    fontSize: moderateScale(32),
    color: "#fff",
    fontFamily: "DMSans_700Bold",
    textAlign: "center",
    includeFontPadding: false,
  },
  tagline: {
    fontSize: moderateScale(12),
    color: "#E3EDFC",
    fontFamily: "DMSans_400Regular",
    textAlign: "center",
    marginTop: verticalScale(6),
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: verticalScale(20),
    width: "100%",
    paddingHorizontal: scale(20),
  },
  fromText: {
    color: "#fff",
    fontSize: moderateScale(12),
    marginBottom: verticalScale(2),
    fontFamily: "DMSans_400Regular",
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: verticalScale(2),
    width: "100%",
    justifyContent: "center",
  },
  logoText: {
    color: "#fff",
    fontSize: moderateScale(20),
    fontFamily: "DMSans_700Bold",
    letterSpacing: 1,
    flexShrink: 1,
    includeFontPadding: false,
    marginLeft: scale(8),
  },
  systemsText: {
    color: "#fff",
    fontSize: moderateScale(10),
    letterSpacing: 4,
    fontFamily: "DMSans_400Regular",
    includeFontPadding: false,
    marginLeft: scale(28),
  },
  image: {
    height: verticalScale(24),
    width: scale(24),
  },
});

export default Onboarding1;
