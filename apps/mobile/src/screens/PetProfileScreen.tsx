import React from "react";
import { StyleSheet, View } from "react-native";
import { evaluateDogEligibility } from "@pet-villa/shared";
import { Avatar } from "../components/Avatar";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { PetTag } from "../components/PetTag";
import { Body, H1, H2 } from "../components/Text";
import { theme } from "../theme";

export function PetProfileScreen() {
  const eligibility = evaluateDogEligibility({
    weightKg: 6.2,
    hasAggression: false,
    hasFleas: false,
    vaccineStatus: "valid"
  });

  return (
    <View style={styles.stack}>
      <H1>Pet Profile</H1>
      <Card>
        <View style={styles.header}>
          <Avatar initials="MO" size={72} />
          <View style={styles.grow}>
            <H2>Mochi</H2>
            <Body>Poodle mix · 6.2kg · Vaccinated</Body>
          </View>
        </View>
        <View style={styles.tags}>
          <PetTag label="Small dog" />
          <PetTag label="No fleas" />
          <PetTag label="Calm" />
          <PetTag label="Special diet" />
        </View>
      </Card>

      <Card>
        <H2>Eligibility</H2>
        <Body>{eligibility.accepted ? "Accepted for The Pet Villa Ipoh." : eligibility.reasons.join(" ")}</Body>
      </Card>

      <Card>
        <H2>Pet Details</H2>
        <Input label="Weight" value="6.2kg" helper="Only 1-12kg small dogs are accepted." />
        <Input label="Vaccine status" value="Valid" />
        <Input label="Habits" value="Prefers chicken kibbles, sleeps with a small blanket." />
        <Input label="Special needs" value="No allergies. Mild separation anxiety for first hour." />
        <Input label="Emergency vet" value="Ipoh Garden Vet Clinic" />
        <Button label="Save profile" />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 20 },
  header: { flexDirection: "row", alignItems: "center", gap: 16 },
  grow: { flex: 1 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 },
  input: {}
});
