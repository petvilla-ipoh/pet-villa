import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { theme } from "../theme";

type Props = {
  uri?: string;
  initials: string;
  size?: number;
};

export function Avatar({ uri, initials, size = 56 }: Props) {
  const style = { width: size, height: size, borderRadius: size / 2 };
  if (uri) {
    return <Image source={{ uri }} style={[styles.avatar, style]} />;
  }

  return (
    <View style={[styles.fallback, style]}>
      <Text style={styles.initials}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: theme.colors.secondary
  },
  fallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.secondary
  },
  initials: {
    color: theme.colors.text,
    fontFamily: theme.fonts.body,
    fontWeight: "900"
  }
});
