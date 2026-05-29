import React, { type PropsWithChildren } from "react";
import { StyleSheet, Text as RNText } from "react-native";
import { theme } from "../theme";

export function H1({ children }: PropsWithChildren) {
  return <RNText style={styles.h1}>{children}</RNText>;
}

export function H2({ children }: PropsWithChildren) {
  return <RNText style={styles.h2}>{children}</RNText>;
}

export function Body({ children }: PropsWithChildren) {
  return <RNText style={styles.body}>{children}</RNText>;
}

export function Caption({ children }: PropsWithChildren) {
  return <RNText style={styles.caption}>{children}</RNText>;
}

const styles = StyleSheet.create({
  h1: {
    color: theme.colors.text,
    fontFamily: theme.fonts.title,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "700"
  },
  h2: {
    color: theme.colors.text,
    fontFamily: theme.fonts.title,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "700"
  },
  body: {
    color: theme.colors.mutedText,
    fontFamily: theme.fonts.body,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "600"
  },
  caption: {
    color: theme.colors.mutedText,
    fontFamily: theme.fonts.body,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800"
  }
});
