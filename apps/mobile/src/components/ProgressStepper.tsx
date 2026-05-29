import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "../theme";

type Props = {
  steps: string[];
  activeIndex: number;
};

export function ProgressStepper({ steps, activeIndex }: Props) {
  return (
    <View style={styles.wrap}>
      {steps.map((step, index) => {
        const active = index <= activeIndex;
        return (
          <View key={step} style={styles.step}>
            <View style={[styles.dot, active && styles.activeDot]}>
              <Text style={[styles.number, active && styles.activeNumber]}>{index + 1}</Text>
            </View>
            <Text style={[styles.label, active && styles.activeLabel]}>{step}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    gap: 8
  },
  step: {
    flex: 1,
    alignItems: "center",
    gap: 6
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.border
  },
  activeDot: {
    backgroundColor: theme.colors.primary
  },
  number: {
    color: theme.colors.mutedText,
    fontFamily: theme.fonts.body,
    fontSize: 12,
    fontWeight: "900"
  },
  activeNumber: {
    color: theme.colors.text
  },
  label: {
    textAlign: "center",
    color: theme.colors.mutedText,
    fontFamily: theme.fonts.body,
    fontSize: 10,
    fontWeight: "800"
  },
  activeLabel: {
    color: theme.colors.text
  }
});
