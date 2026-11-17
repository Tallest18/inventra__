// hooks/useVoiceSearch.ts
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import { useCallback, useState } from "react";
import { Alert } from "react-native";

export function useVoiceSearch({
  onTranscript,
}: {
  onTranscript: (text: string) => void;
}) {
  const [isListening, setIsListening] = useState(false);

  useSpeechRecognitionEvent("start", () => {
    setIsListening(true);
  });

  useSpeechRecognitionEvent("end", () => {
    setIsListening(false);
  });

  useSpeechRecognitionEvent("speechend", () => {
    setIsListening(false);
  });

  useSpeechRecognitionEvent("result", (event) => {
    const transcript = event.results?.[0]?.transcript;
    if (transcript) {
      onTranscript(transcript);
    }
  });

  useSpeechRecognitionEvent("error", (event) => {
    setIsListening(false);
    if (
      event.error !== "no-speech" &&
      event.error !== "aborted" &&
      event.error !== "speech-timeout"
    ) {
      Alert.alert("Voice Search", event.message || "Could not recognize speech.");
    }
  });

  const startListening = useCallback(async () => {
    try {
      const perms = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perms.granted) {
        Alert.alert(
          "Microphone Permission Required",
          "Please allow microphone and speech recognition access in your device settings to use voice search."
        );
        return;
      }

      ExpoSpeechRecognitionModule.start({
        lang: "en-US",
        interimResults: true,
        continuous: false,
      });
      setIsListening(true);
    } catch (err: any) {
      setIsListening(false);
      Alert.alert("Voice Search", err?.message || "Could not start voice search.");
    }
  }, []);

  const stopListening = useCallback(() => {
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      // Ignore stop errors
    }
    setIsListening(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    startListening,
    stopListening,
    toggleListening,
  };
}

