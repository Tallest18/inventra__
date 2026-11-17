// components/security/InactivityLockWatcher.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";

import { getAccessToken } from "@/src/api";
import { isPinLockEnabled } from "@/utils/securityStorage";
import { PinLockModal } from "./PinLockModal";

// 5 minutes in milliseconds
export const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000;

let lastActivityTimestamp = Date.now();

/** Call whenever the user interacts with the app (touches, navigates, scrolls) */
export function recordUserActivity(): void {
  lastActivityTimestamp = Date.now();
}

export const InactivityLockWatcher: React.FC = () => {
  const [isLocked, setIsLocked] = useState(false);
  const appState = useRef(AppState.currentState);
  const backgroundedTime = useRef<number | null>(null);

  const checkAndLockIfEligible = useCallback(async () => {
    try {
      const token = await getAccessToken();
      if (!token) return; // Only lock if user is signed in

      const pinRequired = await isPinLockEnabled();
      if (!pinRequired) return; // User turned off PIN lock

      setIsLocked(true);
    } catch {
      // Ignore error
    }
  }, []);

  // Interval check while app is open in foreground
  useEffect(() => {
    const interval = setInterval(() => {
      if (isLocked) return;

      const idleTime = Date.now() - lastActivityTimestamp;
      if (idleTime >= INACTIVITY_TIMEOUT_MS) {
        checkAndLockIfEligible();
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [isLocked, checkAndLockIfEligible]);

  // AppState listener for background / foreground transition
  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      async (nextAppState: AppStateStatus) => {
        if (
          appState.current.match(/inactive|background/) &&
          nextAppState === "active"
        ) {
          // App came back to foreground
          if (backgroundedTime.current) {
            const timeInBackground = Date.now() - backgroundedTime.current;
            if (timeInBackground >= INACTIVITY_TIMEOUT_MS && !isLocked) {
              await checkAndLockIfEligible();
            }
          }
          backgroundedTime.current = null;
          recordUserActivity();
        } else if (nextAppState.match(/inactive|background/)) {
          // App entered background
          backgroundedTime.current = Date.now();
        }

        appState.current = nextAppState;
      }
    );

    return () => {
      subscription.remove();
    };
  }, [isLocked, checkAndLockIfEligible]);

  const handleUnlock = () => {
    setIsLocked(false);
    recordUserActivity();
  };

  return <PinLockModal visible={isLocked} onUnlock={handleUnlock} />;
};

