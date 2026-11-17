import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useSegments } from "expo-router";
import {
  getAccessToken,
  getPopupNotifications,
  markNotificationRead,
  onTokensChanged,
  type ApiNotification,
} from "@/src/api";
import { BroadcastModal } from "./BroadcastModal";

export const BroadcastWatcher: React.FC = () => {
  const segments = useSegments();
  const inAuthFlow = segments[0] === "(Auth)" || segments[0] === "(Onboarding)";

  const [activeNotification, setActiveNotification] = useState<ApiNotification | null>(null);
  const dismissedIds = useRef<Set<number>>(new Set());
  const isChecking = useRef(false);

  const checkPopups = useCallback(async () => {
    if (inAuthFlow || isChecking.current) return;
    const token = await getAccessToken();
    if (!token) return;

    isChecking.current = true;
    try {
      const popups = await getPopupNotifications();
      if (Array.isArray(popups) && popups.length > 0) {
        // Find the newest popup that hasn't been dismissed in this session
        const nextPopup = popups.find(
          (p) => !p.is_read && !dismissedIds.current.has(p.id)
        );
        if (nextPopup) {
          setActiveNotification(nextPopup);
        } else if (activeNotification && dismissedIds.current.has(activeNotification.id)) {
          setActiveNotification(null);
        }
      }
    } catch {
      // Background check failed (offline or network error); ignore silently
    } finally {
      isChecking.current = false;
    }
  }, [inAuthFlow, activeNotification]);

  const handleDismiss = useCallback(async () => {
    if (!activeNotification) return;
    const id = activeNotification.id;
    dismissedIds.current.add(id);
    setActiveNotification(null);
    try {
      await markNotificationRead(id);
    } catch {
      // Mark read failed; ID is already dismissed locally
    }
  }, [activeNotification]);

  useEffect(() => {
    if (inAuthFlow) return;

    // Initial check
    checkPopups();

    // Poll every 20 seconds while app is active
    const interval = setInterval(checkPopups, 20_000);

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") checkPopups();
    });

    const unsubscribe = onTokensChanged(() => {
      checkPopups();
    });

    return () => {
      clearInterval(interval);
      sub.remove();
      unsubscribe();
    };
  }, [inAuthFlow, checkPopups]);

  if (inAuthFlow || !activeNotification) return null;

  return (
    <BroadcastModal
      visible={!!activeNotification}
      notification={activeNotification}
      onDismiss={handleDismiss}
    />
  );
};

