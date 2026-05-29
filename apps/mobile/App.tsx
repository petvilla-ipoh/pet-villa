import React, { useState } from "react";
import { SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { BRAND } from "@pet-villa/shared";
import { OwnerHome } from "./src/screens/OwnerHome";
import { PetProfileScreen } from "./src/screens/PetProfileScreen";
import { BookingFlowScreen } from "./src/screens/BookingFlowScreen";
import { OrdersScreen } from "./src/screens/OrdersScreen";
import { DiaryScreen } from "./src/screens/DiaryScreen";
import { HostDashboard } from "./src/screens/HostDashboard";
import { NotificationsScreen } from "./src/screens/NotificationsScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { ChatScreen } from "./src/screens/ChatScreen";
import { AuthScreen } from "./src/screens/AuthScreen";
import { PaymentScreen } from "./src/screens/PaymentScreen";
import { theme } from "./src/theme";

type Tab = "auth" | "home" | "pet" | "booking" | "payment" | "orders" | "diary" | "chat" | "host" | "alerts" | "profile";

const screens: Record<Tab, React.ComponentType> = {
  auth: AuthScreen,
  home: OwnerHome,
  pet: PetProfileScreen,
  booking: BookingFlowScreen,
  payment: PaymentScreen,
  orders: OrdersScreen,
  diary: DiaryScreen,
  chat: ChatScreen,
  host: HostDashboard,
  alerts: NotificationsScreen,
  profile: ProfileScreen
};

const tabs: { key: Tab; label: string }[] = [
  { key: "auth", label: "Login" },
  { key: "home", label: "Home" },
  { key: "pet", label: "Pet" },
  { key: "booking", label: "Book" },
  { key: "payment", label: "Pay" },
  { key: "orders", label: "Orders" },
  { key: "diary", label: "Diary" },
  { key: "chat", label: "Chat" },
  { key: "host", label: "Host" },
  { key: "alerts", label: "Alerts" },
  { key: "profile", label: "Profile" }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const Screen = screens[activeTab];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={BRAND.colors.background} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Screen />
      </ScrollView>
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  scroll: {
    flex: 1
  },
  content: {
    padding: 20,
    paddingBottom: 96
  },
  tabBar: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    padding: 8,
    borderRadius: 28,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  tab: {
    flexGrow: 1,
    flexBasis: "18%",
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 50
  },
  activeTab: {
    backgroundColor: theme.colors.primary
  },
  tabText: {
    fontFamily: theme.fonts.body,
    fontSize: 11,
    fontWeight: "800",
    color: theme.colors.mutedText
  },
  activeTabText: {
    color: theme.colors.text
  }
});
