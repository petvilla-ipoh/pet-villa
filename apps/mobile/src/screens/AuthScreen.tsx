import React from "react";
import { StyleSheet, View } from "react-native";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { Body, Caption, H1, H2 } from "../components/Text";

export function AuthScreen() {
  return (
    <View style={styles.stack}>
      <H1>Welcome Home</H1>
      <Body>Login or create an account to manage pet profiles, bookings, payments, diary updates, and host chat.</Body>

      <Card>
        <Caption>Owner login</Caption>
        <H2>Sign in</H2>
        <Input label="Email" value="mei@example.com" keyboardType="email-address" />
        <Input label="Password" value="secret123" secureTextEntry />
        <Button label="Login" />
      </Card>

      <Card>
        <Caption>New to The Pet Villa?</Caption>
        <H2>Create account</H2>
        <Input label="Full name" value="Mei Ling" />
        <Input label="Phone" value="+60123456789" keyboardType="phone-pad" />
        <Input label="Email" value="mei@example.com" keyboardType="email-address" />
        <Input label="Password" value="secret123" secureTextEntry />
        <Button label="Register" variant="secondary" />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 20 }
});
