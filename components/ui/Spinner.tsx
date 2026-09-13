import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

interface SpinnerProps {
  size?: number;
  color?: string;
  duration?: number;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 40,
  color = "#1155CC",
  duration = 1000,
}) => {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const startRotation = () => {
      rotateAnim.setValue(0);
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    };

    startRotation();
  }, [rotateAnim, duration]);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View
        style={[
          styles.spinner,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: Math.max(2, size / 10),
            borderColor: "#E2E8F0", // Slate-200 background circular border
            borderTopColor: color, // The actual spinning track color
            transform: [{ rotate: rotation }],
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
  spinner: {
    backgroundColor: "transparent",
  },
});
