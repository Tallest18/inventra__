// app/(auth)/create-account.tsx

import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");
const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);
const scale = (size: number) =>
  clamp((width / 375) * size, size * 0.76, size * 1.3);
const verticalScale = (size: number) =>
  clamp((height / 812) * size, size * 0.62, size * 1.2);
const moderateScale = (size: number, factor = 0.5) =>
  size + (scale(size) - size) * factor;

const AccountScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSave = () => {
    if (!fullName.trim()) {
      Alert.alert("Missing Information", "Please enter your full name.");
      return;
    }
    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        Alert.alert("Invalid Email", "Please enter a valid email address.");
        return;
      }
    }
    if (password && password.length < 4) {
      Alert.alert("Invalid Password", "Password must be at least 4 characters long.");
      return;
    }
    Alert.alert("Success", "Account settings saved successfully.");
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={{
          paddingBottom: 120 + insets.bottom,
          flexGrow: 1,
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.headerText}>Account</Text>

        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Full Name"
          value={fullName}
          onChangeText={setFullName}
        />

        <Text style={styles.label}>Email</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="name@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <Text style={styles.label}>Password</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Change password"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <TouchableOpacity
          style={styles.signUpButton}
          onPress={handleSave}
        >
          <Text style={styles.signUpButtonText}>Save Changes</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: scale(20),
    backgroundColor: "#fff",
  },
  headerText: {
    fontSize: moderateScale(22),
    marginTop: verticalScale(42),
    alignSelf: "center",
  },
  tagline: {
    fontSize: moderateScale(15),
    color: "#aaa",
    marginBottom: verticalScale(32),
    alignSelf: "center",
  },
  label: {
    fontSize: moderateScale(15),
    marginBottom: verticalScale(5),
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: moderateScale(8),
    padding: moderateScale(14),
    fontSize: moderateScale(15),
    marginBottom: verticalScale(18),
    backgroundColor: "#F6F7F9",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: moderateScale(8),
    padding: moderateScale(10),
    marginBottom: verticalScale(18),
  },
  passwordInput: {
    flex: 1,
    fontSize: moderateScale(15),
  },
  signUpButton: {
    backgroundColor: "#24A19C",
    padding: moderateScale(14),
    borderRadius: moderateScale(8),
    width: "100%",
    alignSelf: "center",
    marginTop: "auto",
    marginBottom: verticalScale(24),
  },
  signUpButtonText: {
    color: "#fff",
    fontSize: moderateScale(15),
    textAlign: "center",
  },
});

export default AccountScreen;
