import React from "react";
import { StyleSheet, View } from "react-native";
import { calculateBookingQuote, formatMoney, PAYMENT_METHODS } from "@pet-villa/shared";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { PetTag } from "../components/PetTag";
import { ProgressStepper } from "../components/ProgressStepper";
import { Body, Caption, H1, H2 } from "../components/Text";

const quote = calculateBookingQuote({
  serviceType: "overnight_boarding",
  startAt: new Date("2026-06-10T09:00:00+08:00"),
  endAt: new Date("2026-06-12T12:00:00+08:00")
});

export function BookingFlowScreen() {
  return (
    <View style={styles.stack}>
      <H1>Book a Stay</H1>
      <ProgressStepper steps={["Service", "Dates", "Pet", "Review"]} activeIndex={2} />
      <Card>
        <Caption>Step 1</Caption>
        <H2>Choose Service</H2>
        <View style={styles.tags}>
          <PetTag label="Overnight · RM40/night" />
          <PetTag label="Daycare · RM5/hour" />
        </View>
      </Card>

      <Card>
        <Caption>Step 2</Caption>
        <H2>Select Date</H2>
        <Input label="Check-in" value="10 Jun 2026, 9:00am" />
        <Input label="Check-out" value="12 Jun 2026, 12:00pm" />
        <Body>Check-in 9:00am-8:00pm. Check-out before 12:00pm.</Body>
      </Card>

      <Card>
        <Caption>Step 3</Caption>
        <H2>Pet Information</H2>
        <Input label="Pet name" value="Mochi" />
        <Input label="Weight" value="6.2kg" helper="Large dogs, aggressive dogs, and dogs with fleas are not accepted." />
        <Input label="Vaccine and health proof" value="Valid, uploaded" />
        <Input label="Habits and special needs" value="Bring own food, sleeps with blanket." />
      </Card>

      <Card>
        <Caption>Quote</Caption>
        <H2>{formatMoney(quote.subtotalSen)}</H2>
        <Body>Deposit now after host confirms: {formatMoney(quote.depositSen)}</Body>
        <Body>Final payment after stay: {formatMoney(quote.finalPaymentSen)}</Body>
      </Card>

      <Card>
        <H2>Payment Methods</H2>
        <View style={styles.tags}>
          {PAYMENT_METHODS.map((method) => <PetTag key={method} label={method.replaceAll("_", " ")} />)}
        </View>
      </Card>

      <Button label="Submit booking request" />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 20 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }
});
