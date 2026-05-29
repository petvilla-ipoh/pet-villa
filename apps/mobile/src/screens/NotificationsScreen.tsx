import React from "react";
import { StyleSheet, View } from "react-native";
import { Card } from "../components/Card";
import { Body, Caption, H1, H2 } from "../components/Text";

const notifications = [
  ["Booking confirmed", "Please pay 50% deposit to secure Mochi's stay."],
  ["Diary updated", "The host added new photos and care notes."],
  ["Pet comfort alert", "Mochi seems a little tired. The host is monitoring closely."]
];

export function NotificationsScreen() {
  return (
    <View style={styles.stack}>
      <H1>Notifications</H1>
      {notifications.map(([title, body], index) => (
        <Card key={title}>
          <Caption>{index === 0 ? "New" : "Earlier"}</Caption>
          <H2>{title}</H2>
          <Body>{body}</Body>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ stack: { gap: 20 } });
