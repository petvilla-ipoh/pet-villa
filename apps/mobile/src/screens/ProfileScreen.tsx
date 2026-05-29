import React from "react";
import { StyleSheet, View } from "react-native";
import { OWNER_NOTICE } from "@pet-villa/shared";
import { Avatar } from "../components/Avatar";
import { Card } from "../components/Card";
import { Body, H1, H2 } from "../components/Text";

export function ProfileScreen() {
  return (
    <View style={styles.stack}>
      <H1>Profile</H1>
      <Card>
        <View style={styles.row}>
          <Avatar initials="ML" />
          <View style={styles.grow}>
            <H2>Mei Ling</H2>
            <Body>Owner · Ipoh</Body>
          </View>
        </View>
      </Card>
      <Card>
        <H2>Owner Notice</H2>
        {OWNER_NOTICE.map((item) => <Body key={item}>• {item}</Body>)}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 20 },
  row: { flexDirection: "row", gap: 16, alignItems: "center" },
  grow: { flex: 1 }
});
