import React from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { PetTag } from "../components/PetTag";
import { Body, Caption, H1, H2 } from "../components/Text";
import { theme } from "../theme";

export function ChatScreen() {
  return (
    <View style={styles.stack}>
      <H1>Chat</H1>
      <Card>
        <Caption>Booking-linked conversation</Caption>
        <H2>The Pet Villa Host</H2>
        <View style={styles.quick}>
          <PetTag label="Ask update" />
          <PetTag label="Send photo" />
          <PetTag label="Emergency call" />
        </View>
        <Body>Hi Mei Ling, Mochi has settled in. I will send today's first photo update soon.</Body>
      </Card>
      <Card>
        <Caption>You</Caption>
        <Body>Thank you. Please let me know if she seems anxious before sleep.</Body>
      </Card>
      <TextInput style={styles.input} placeholder="Type a message..." placeholderTextColor={theme.colors.mutedText} />
      <Button label="Send message" />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 20 },
  quick: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 10 },
  input: {
    minHeight: 56,
    borderRadius: theme.radius.input,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface
  }
});
