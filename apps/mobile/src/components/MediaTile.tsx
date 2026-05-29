import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "../theme";

type Props = {
  type: "photo" | "video";
  label: string;
};

export function MediaTile({ type, label }: Props) {
  return (
    <View style={styles.tile}>
      <Text style={styles.icon}>{type === "photo" ? "IMG" : "VID"}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: 112,
    height: 112,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    backgroundColor: theme.colors.secondary
  },
  icon: {
    color: theme.colors.text,
    fontFamily: theme.fonts.body,
    fontWeight: "900",
    fontSize: 18
  },
  label: {
    marginTop: 8,
    color: theme.colors.mutedText,
    fontFamily: theme.fonts.body,
    fontSize: 11,
    textAlign: "center",
    fontWeight: "800"
  }
});
