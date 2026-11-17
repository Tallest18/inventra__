// components/auth/authTheme.ts
// Tokens sampled from the Login-Experience design board so every auth screen
// shares one palette and one set of proportions.
import { moderateScale, scale, verticalScale } from "@/utils/scaling";

export const AUTH_COLORS = {
  brand: "#1155CC",
  brandPressed: "#0E48AC",
  onBrand: "#FFFFFF",
  onBrandMuted: "#C7D9F7",
  sheet: "#F8F9FA",
  field: "#F1F2F4",
  fieldActive: "#FFFFFF",
  border: "#E4E7EC",
  text: "#101828",
  textMuted: "#667085",
  textFaint: "#98A2B3",
  danger: "#D92D20",
  chip: "rgba(255,255,255,0.16)",
} as const;

export const AUTH_FONTS = {
  regular: "DMSans_400Regular",
  medium: "DMSans_500Medium",
  semibold: "DMSans_600SemiBold",
  bold: "DMSans_700Bold",
} as const;

export const AUTH_METRICS = {
  gutter: scale(24),
  sheetRadius: moderateScale(28),
  fieldRadius: moderateScale(14),
  // Rounded rectangle, same corners as the input fields  not a pill.
  buttonRadius: moderateScale(14),
  buttonHeight: verticalScale(54),
  fieldHeight: verticalScale(54),
} as const;

/** Tinted icon tiles used by the business-type list. */
export const AUTH_TINTS = [
  { bg: "#E8EFFC", fg: "#1155CC" },
  { bg: "#FEF0E6", fg: "#E8630A" },
  { bg: "#E3F7EC", fg: "#079455" },
  { bg: "#F7E9FB", fg: "#9E2AB8" },
  { bg: "#FEF3D7", fg: "#DC9A03" },
  { bg: "#EEF1F5", fg: "#475467" },
] as const;
