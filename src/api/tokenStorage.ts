import AsyncStorage from "@react-native-async-storage/async-storage";

const ACCESS_TOKEN_KEY = "inventra_access_token";
const REFRESH_TOKEN_KEY = "inventra_refresh_token";
const LAST_PHONE_KEY = "inventra_last_phone";

export async function getAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return AsyncStorage.getItem(REFRESH_TOKEN_KEY);
}

type TokensListener = () => void;

const listeners = new Set<TokensListener>();

/**
 * Fires whenever the stored session changes. Lets anything watching the
 * session react the instant it appears or disappears, instead of waiting for
 * the next poll to notice.
 */
export function onTokensChanged(listener: TokensListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const notifyTokensChanged = () => {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // A misbehaving listener must not break token storage.
    }
  });
};

export async function saveTokens(
  access: string,
  refresh: string,
): Promise<void> {
  await AsyncStorage.multiSet([
    [ACCESS_TOKEN_KEY, access],
    [REFRESH_TOKEN_KEY, refresh],
  ]);
  notifyTokensChanged();
}

export async function clearTokens(): Promise<void> {
  await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
  notifyTokensChanged();
}

/**
 * The last number that reached the PIN screen. Survives logout on purpose, so a
 * returning user lands on "Welcome Back" instead of retyping their number.
 */
export async function saveLastPhone(phone: string): Promise<void> {
  await AsyncStorage.setItem(LAST_PHONE_KEY, phone);
}

export async function getLastPhone(): Promise<string | null> {
  return AsyncStorage.getItem(LAST_PHONE_KEY);
}

export async function clearLastPhone(): Promise<void> {
  await AsyncStorage.removeItem(LAST_PHONE_KEY);
}

/**
 * Where a signed-out user belongs: "Welcome Back" (PIN only) when this device
 * remembers a number, otherwise the phone-number screen that starts sign-up.
 */
export async function signedOutRoute(): Promise<
  "/(Auth)/WelcomeBackScreen" | "/(Auth)/WelcomeScreen"
> {
  try {
    return (await getLastPhone())
      ? "/(Auth)/WelcomeBackScreen"
      : "/(Auth)/WelcomeScreen";
  } catch {
    return "/(Auth)/WelcomeScreen";
  }
}
