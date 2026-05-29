import { BRAND } from "@pet-villa/shared";

export const theme = {
  colors: {
    ...BRAND.colors,
    mutedText: "#7a5a46",
    warning: "#d9922e",
    danger: "#c95c50"
  },
  fonts: BRAND.fonts,
  radius: {
    card: 24,
    button: 50,
    input: 18,
    chip: 999
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32
  }
};
