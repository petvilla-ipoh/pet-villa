import React from "react";
import { StyleSheet, View } from "react-native";
import { BookingStatusBadge } from "../components/BookingStatusBadge";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Body, Caption, H1, H2 } from "../components/Text";
import { PetTag } from "../components/PetTag";
import { StatCard } from "../components/StatCard";

export function HostDashboard() {
  return (
    <View style={styles.stack}>
      <H1>Host Dashboard</H1>
      <Card>
        <Caption>Today</Caption>
        <H2>Capacity 2/3 dogs</H2>
        <Body>Daily limit is locked to 3 accepted dogs.</Body>
        <View style={styles.stats}>
          <StatCard label="Pending" value="4" />
          <StatCard label="Boarding" value="2" />
          <StatCard label="Revenue" value="RM 280" />
        </View>
      </Card>
      <Card>
        <H2>Calendar</H2>
        <View style={styles.calendar}>
          {["Mon 2/3", "Tue 3/3", "Wed 1/3", "Thu 0/3"].map((day) => (
            <PetTag key={day} label={day} />
          ))}
        </View>
      </Card>
      <Card>
        <BookingStatusBadge status="pending_confirmation" />
        <H2>New request · Mochi</H2>
        <Body>6.2kg, vaccinated, calm. Overnight boarding request.</Body>
        <View style={styles.tags}>
          <PetTag label="Eligible" />
          <PetTag label="No fleas" />
          <PetTag label="No aggression" />
        </View>
        <View style={styles.actions}>
          <Button label="Confirm" />
          <Button label="Reject" variant="ghost" />
        </View>
      </Card>
      <Card>
        <H2>Diary Due</H2>
        <Body>Post 3-5 photo/video updates per boarding day.</Body>
        <Button label="Create diary update" variant="secondary" />
      </Card>
      <Card>
        <H2>Income</H2>
        <Body>Deposits RM 160 · final payments RM 120 · refunds RM 0 · withdrawable RM 280.</Body>
        <Button label="Request withdrawal" variant="ghost" />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 20 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  actions: { gap: 10, marginTop: 16 },
  stats: { flexDirection: "row", gap: 8, marginTop: 16 },
  calendar: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }
});
