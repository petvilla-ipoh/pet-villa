import React from "react";
import { StyleSheet, View } from "react-native";
import { Card } from "../components/Card";
import { Body, Caption, H1, H2 } from "../components/Text";
import { PetTag } from "../components/PetTag";
import { MediaTile } from "../components/MediaTile";

export function DiaryScreen() {
  return (
    <View style={styles.stack}>
      <H1>Pet Diary</H1>
      <Card>
        <Caption>10:30am</Caption>
        <H2>Morning cuddle update</H2>
        <Body>Mochi finished breakfast, explored the living room, and settled under 24h air conditioning.</Body>
        <View style={styles.mediaRow}>
          <MediaTile type="photo" label="Breakfast" />
          <MediaTile type="video" label="Living room walk" />
        </View>
        <View style={styles.tags}>
          <PetTag label="Photo" />
          <PetTag label="Meal done" />
          <PetTag label="Calm mood" />
        </View>
      </Card>
      <Card>
        <Caption>3:20pm</Caption>
        <H2>Play and rest</H2>
        <Body>Short indoor play session, then nap time. No discomfort observed.</Body>
        <View style={styles.mediaRow}>
          <MediaTile type="photo" label="Nap corner" />
          <MediaTile type="photo" label="Blanket time" />
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 20 },
  tags: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 12 },
  mediaRow: { flexDirection: "row", gap: 10, marginTop: 14 }
});
