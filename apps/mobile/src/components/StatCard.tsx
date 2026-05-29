import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "../theme";

type Props = {
  label: string;
  value: string;
};

export function StatCard({ label, value }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 84,
    justifyContent: "center",
    padding: 14,
    borderRadius: 20,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  value: {
    color: theme.colors.text,
    fontFamily: theme.fonts.title,
    fontSize: 24,
    fontWeight: "700"
  },
  label: {
    color: theme.colors.mutedText,
    fontFamily: theme.fonts.body,
    fontSize: 12,
    fontWeight: "800"
  }
});
