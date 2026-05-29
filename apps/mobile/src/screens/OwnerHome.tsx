import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { BRAND, OWNER_NOTICE, SERVICE_RULES } from "@pet-villa/shared";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { PetTag } from "../components/PetTag";
import { StatCard } from "../components/StatCard";
import { Body, Caption, H1, H2 } from "../components/Text";
import { theme } from "../theme";

export function OwnerHome() {
  return (
    <View style={styles.stack}>
      <Card>
        <View style={styles.heroIcon}>
          <Text style={styles.heroEmoji}>HOME</Text>
        </View>
        <H1>{BRAND.name}</H1>
        <Body>Ipoh pet boarding · A Home Away From Home for small dogs only.</Body>
        <View style={styles.tags}>
          <PetTag label="1-12kg only" />
          <PetTag label="Max 3 dogs/day" />
          <PetTag label="No cages" />
          <PetTag label="24h AC" />
        </View>
        <Button label="Book a stay" />
      </Card>

      <Card>
        <H2>Find a stay</H2>
        <Input label="Search date or service" value="Overnight boarding in Ipoh" />
        <View style={styles.searchRow}>
          <Input label="Check-in" value="10 Jun, 9:00am" style={styles.compactInput} />
          <Input label="Check-out" value="12 Jun, 12:00pm" style={styles.compactInput} />
        </View>
        <Button label="Check availability" variant="secondary" />
      </Card>

      <H2>Services</H2>
      <View style={styles.grid}>
        <Card>
          <Caption>Overnight Boarding</Caption>
          <Text style={styles.price}>RM 40</Text>
          <Body>Per night · check-out before 12:00pm</Body>
        </Card>
        <Card>
          <Caption>Daycare</Caption>
          <Text style={styles.price}>RM 5</Text>
          <Body>Per hour · check-in 9:00am-8:00pm</Body>
        </Card>
      </View>

      <View style={styles.stats}>
        <StatCard label="Dogs per day" value="3 max" />
        <StatCard label="Accepted size" value="1-12kg" />
        <StatCard label="Updates daily" value="3-5" />
      </View>

      <H2>Villa Care Promise</H2>
      <View style={styles.tags}>
        {SERVICE_RULES.features.map((feature) => <PetTag key={feature} label={feature} />)}
      </View>

      <Card>
        <H2>Owner Notice</H2>
        {OWNER_NOTICE.map((item) => <Body key={item}>• {item}</Body>)}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 20 },
  heroIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.secondary
  },
  heroEmoji: {
    color: theme.colors.text,
    fontFamily: theme.fonts.body,
    fontSize: 14,
    fontWeight: "900"
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginVertical: 12
  },
  grid: {
    gap: 12
  },
  searchRow: {
    flexDirection: "row",
    gap: 10,
    marginVertical: 12
  },
  compactInput: {
    minWidth: 0
  },
  stats: {
    flexDirection: "row",
    gap: 10
  },
  price: {
    color: theme.colors.text,
    fontFamily: theme.fonts.title,
    fontSize: 32,
    fontWeight: "700",
    marginVertical: 4
  }
});
