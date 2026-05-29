import React from "react";
import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { theme } from "../theme";

type Props = TextInputProps & {
  label: string;
  helper?: string;
};

export function Input({ label, helper, style, ...props }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor={theme.colors.mutedText}
        style={[styles.input, style]}
      />
      {helper ? <Text style={styles.helper}>{helper}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6
  },
  label: {
    color: theme.colors.text,
    fontFamily: theme.fonts.body,
    fontSize: 13,
    fontWeight: "900"
  },
  input: {
    minHeight: 54,
    borderRadius: theme.radius.input,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
    fontFamily: theme.fonts.body,
    fontWeight: "700"
  },
  helper: {
    color: theme.colors.mutedText,
    fontFamily: theme.fonts.body,
    fontSize: 12,
    lineHeight: 16
  }
});
