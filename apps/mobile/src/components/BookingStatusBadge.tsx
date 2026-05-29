import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { BOOKING_STATUS_LABELS, type BookingStatus } from "@pet-villa/shared";
import { theme } from "../theme";

const colors: Record<BookingStatus, string> = {
  pending_confirmation: theme.colors.warning,
  confirmed_awaiting_deposit: theme.colors.secondary,
  deposit_paid: theme.colors.accentGreen,
  in_boarding: theme.colors.primary,
  awaiting_final_payment: theme.colors.warning,
  completed: theme.colors.accentGreen,
  cancelled: theme.colors.danger,
  refunded: theme.colors.accentGreen
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return (
    <View style={[styles.badge, { backgroundColor: colors[status] }]}>
      <Text style={styles.text}>{BOOKING_STATUS_LABELS[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.chip
  },
  text: {
    color: theme.colors.text,
    fontFamily: theme.fonts.body,
    fontSize: 12,
    fontWeight: "900"
  }
});
