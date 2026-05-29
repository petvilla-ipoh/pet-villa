import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { PAYMENT_METHODS, formatMoney, type PaymentMethod } from "@pet-villa/shared";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { PaymentMethodCard } from "../components/PaymentMethodCard";
import { ProgressStepper } from "../components/ProgressStepper";
import { Body, Caption, H1, H2 } from "../components/Text";

export function PaymentScreen() {
  const [selected, setSelected] = useState<PaymentMethod>("duitnow_qr");

  return (
    <View style={styles.stack}>
      <H1>Payment</H1>
      <ProgressStepper steps={["Confirmed", "Deposit", "Stay", "Final"]} activeIndex={1} />
      <Card>
        <Caption>Deposit due</Caption>
        <H2>{formatMoney(4000)}</H2>
        <Body>Pay 50% deposit after host confirmation. Final 50% is paid after boarding ends.</Body>
      </Card>

      <View style={styles.stack}>
        {PAYMENT_METHODS.map((method) => (
          <PaymentMethodCard
            key={method}
            method={method}
            selected={selected === method}
            onPress={() => setSelected(method)}
          />
        ))}
      </View>

      <Card>
        <Caption>Security</Caption>
        <Body>Payment is linked to this booking and protected with an idempotency key to prevent duplicate charges.</Body>
      </Card>
      <Button label="Pay deposit now" />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 14 }
});
