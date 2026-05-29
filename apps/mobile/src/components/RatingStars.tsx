import React from "react";
import { Text, View, StyleSheet } from "react-native";
import { theme } from "../theme";

export function RatingStars({ rating }: { rating: number }) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Text key={star} style={styles.star}>{star <= rating ? "★" : "☆"}</Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 2 },
  star: { color: theme.colors.primary, fontSize: 16 }
});
