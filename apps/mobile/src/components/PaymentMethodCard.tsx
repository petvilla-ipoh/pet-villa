import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { PaymentMethod } from "@pet-villa/shared";
import { theme } from "../theme";

const labels: Record<PaymentMethod, string> = {
  duitnow_qr: "DuitNow QR",
  fpx: "FPX Online Banking",
  touch_n_go: "Touch'n Go",
  grabpay: "GrabPay",
  visa_mastercard: "Visa / Mastercard"
};

const subtitles: Record<PaymentMethod, string> = {
  duitnow_qr: "Scan QR and upload confirmation",
  fpx: "Pay from Malaysian bank account",
  touch_n_go: "Fast e-wallet checkout",
  grabpay: "GrabPay wallet supported",
  visa_mastercard: "Credit or debit card"
};

type Props = {
  method: PaymentMethod;
  selected?: boolean;
  onPress?: () => void;
};

export function PaymentMethodCard({ method, selected, onPress }: Props) {
  return (
    <TouchableOpacity style={[styles.card, selected && styles.selected]} onPress={onPress}>
      <View style={styles.icon}>
        <Text style={styles.iconText}>{labels[method].slice(0, 2)}</Text>
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{labels[method]}</Text>
        <Text style={styles.subtitle}>{subtitles[method]}</Text>
      </View>
      <Text style={styles.radio}>{selected ? "●" : "○"}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface
  },
  selected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.secondary
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background
  },
  iconText: {
    color: theme.colors.text,
    fontFamily: theme.fonts.body,
    fontWeight: "900"
  },
  copy: {
    flex: 1
  },
  title: {
    color: theme.colors.text,
    fontFamily: theme.fonts.body,
    fontSize: 15,
    fontWeight: "900"
  },
  subtitle: {
    color: theme.colors.mutedText,
    fontFamily: theme.fonts.body,
    fontSize: 12,
    fontWeight: "700"
  },
  radio: {
    color: theme.colors.text,
    fontSize: 18
  }
});
