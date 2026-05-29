import React from "react";
import { StyleSheet, View } from "react-native";
import { formatMoney } from "@pet-villa/shared";
import { BookingStatusBadge } from "../components/BookingStatusBadge";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { ProgressStepper } from "../components/ProgressStepper";
import { Body, H1, H2 } from "../components/Text";

export function OrdersScreen() {
  return (
    <View style={styles.stack}>
      <H1>My Orders</H1>
      <Card>
        <BookingStatusBadge status="confirmed_awaiting_deposit" />
        <H2>Mochi · Overnight</H2>
        <Body>10 Jun - 12 Jun · Deposit due {formatMoney(4000)}</Body>
        <ProgressStepper steps={["Request", "Confirm", "Deposit", "Stay", "Final", "Done"]} activeIndex={1} />
        <Button label="Pay 50% deposit" />
      </Card>
      <Card>
        <BookingStatusBadge status="in_boarding" />
        <H2>Boba · Daycare</H2>
        <Body>Today · Diary updates due 3-5 times</Body>
        <ProgressStepper steps={["Request", "Confirm", "Deposit", "Stay", "Final", "Done"]} activeIndex={3} />
        <Button label="View diary" variant="secondary" />
      </Card>
      <Card>
        <BookingStatusBadge status="completed" />
        <H2>Luna · Overnight</H2>
        <Body>Completed · final payment paid · review available</Body>
        <Button label="Leave review" variant="ghost" />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({ stack: { gap: 20 } });
