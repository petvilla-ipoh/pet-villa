import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "../theme";

export function PetTag({ label }: { label: string }) {
  return (
    <View style={styles.tag}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.chip,
    backgroundColor: theme.colors.secondary
  },
  text: {
    color: theme.colors.text,
    fontFamily: theme.fonts.body,
    fontSize: 12,
    fontWeight: "800"
  }
});
