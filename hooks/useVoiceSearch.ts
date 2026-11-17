// hooks/useVoiceSearch.ts
import { useCallback, useState } from "react";
import { Alert } from "react-native";

export function useVoiceSearch({
  onTranscript,
}: {
  onTranscript: (text: string) => void;
}) {
  const [isListening, setIsListening] = useState(false);

  const startListening = useCallback(async () => {
    Alert.alert(
      "Voice Search",
      "Voice search is currently unavailable in this build."
    );
  }, []);

  const stopListening = useCallback(() => {
    setIsListening(false);
  }, []);

  const toggleListening = useCallback(() => {
    startListening();
  }, [startListening]);

  return {
    isListening,
    startListening,
    stopListening,
    toggleListening,
  };
}
