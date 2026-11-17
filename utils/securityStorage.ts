import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export type BiometricType = "face" | "fingerprint";

const PIN_LOCK_ENABLED_KEY = "@inventra_pin_lock_enabled";
const BIOMETRICS_ENABLED_KEY = "@inventra_biometrics_enabled";
const BIOMETRIC_TYPE_KEY = "@inventra_biometric_type";
const ENROLLED_FACE_URI_KEY = "@inventra_enrolled_face_uri";
const CACHED_PIN_KEY = "inventra_cached_pin";

type SecurityListener = () => void;
const listeners = new Set<SecurityListener>();

export function onSecuritySettingsChanged(listener: SecurityListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const notifySecurityChanged = () => {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Safe no-op on listener error
    }
  });
};

/** Whether PIN protection is required to unlock app on inactivity or open. Defaults to true. */
export async function isPinLockEnabled(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(PIN_LOCK_ENABLED_KEY);
    if (val === null) return true; // Default enabled
    return val === "true";
  } catch {
    return true;
  }
}

export async function setPinLockEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(PIN_LOCK_ENABLED_KEY, enabled ? "true" : "false");
  notifySecurityChanged();
}

/** Whether Biometric unlock is enabled. Defaults to false until user configures face or fingerprint. */
export async function isBiometricsEnabled(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(BIOMETRICS_ENABLED_KEY);
    return val === "true";
  } catch {
    return false;
  }
}

export async function setBiometricsEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(BIOMETRICS_ENABLED_KEY, enabled ? "true" : "false");
  notifySecurityChanged();
}

/** Returns the active biometric method: "face" | "fingerprint" | null */
export async function getBiometricType(): Promise<BiometricType | null> {
  try {
    const val = await AsyncStorage.getItem(BIOMETRIC_TYPE_KEY);
    if (val === "face" || val === "fingerprint") return val;
    return null;
  } catch {
    return null;
  }
}

export async function setBiometricType(type: BiometricType | null): Promise<void> {
  if (type) {
    await AsyncStorage.setItem(BIOMETRIC_TYPE_KEY, type);
  } else {
    await AsyncStorage.removeItem(BIOMETRIC_TYPE_KEY);
  }
  notifySecurityChanged();
}

/** Returns the URI of the captured face image if enrolled */
export async function getEnrolledFaceUri(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(ENROLLED_FACE_URI_KEY);
  } catch {
    return null;
  }
}

export async function setEnrolledFaceUri(uri: string | null): Promise<void> {
  if (uri) {
    await AsyncStorage.setItem(ENROLLED_FACE_URI_KEY, uri);
  } else {
    await AsyncStorage.removeItem(ENROLLED_FACE_URI_KEY);
  }
  notifySecurityChanged();
}

/**
 * Cache user's PIN securely for offline unlock validation
 */
export async function saveCachedPin(pin: string): Promise<void> {
  try {
    if (Platform.OS !== "web") {
      await SecureStore.setItemAsync(CACHED_PIN_KEY, pin);
    } else {
      await AsyncStorage.setItem(CACHED_PIN_KEY, pin);
    }
  } catch {
    await AsyncStorage.setItem(CACHED_PIN_KEY, pin);
  }
}

export async function getCachedPin(): Promise<string | null> {
  try {
    if (Platform.OS !== "web") {
      const val = await SecureStore.getItemAsync(CACHED_PIN_KEY);
      if (val) return val;
    }
    return await AsyncStorage.getItem(CACHED_PIN_KEY);
  } catch {
    return await AsyncStorage.getItem(CACHED_PIN_KEY);
  }
}

export async function clearCachedPin(): Promise<void> {
  try {
    if (Platform.OS !== "web") {
      await SecureStore.deleteItemAsync(CACHED_PIN_KEY);
    }
  } catch {
    // Ignore error
  }
  await AsyncStorage.removeItem(CACHED_PIN_KEY);
}

