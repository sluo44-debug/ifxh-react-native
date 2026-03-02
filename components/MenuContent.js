import React, { useContext } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { AuthContext } from "../context/AuthContext";

const MENU_ITEMS = [
  { key: "Dashboard", label: "Dashboard" },
  { key: "Account", label: "Account" },
  { key: "My Portfolio", label: "My Portfolio" },
  { key: "Place Order", label: "Place Order" },
  { key: "Market Analysis", label: "Market Analysis" },
  { key: "Statements", label: "Statements" },
  { key: "Contact Us", label: "Contact Us" },
  { key: "Logout", label: "Logout" },
];

const NIGHT = {
  text: "#FFFFFF",
  muted: "#BFC6CF",
  card: "#1A1F2B",
  border: "#2A3142",
  gold: "#C9A24D",
};

export default function MenuContent({ onDone, variant = "full", showBrand = true }) {
  const navigation = useNavigation();
  const { signOut, role } = useContext(AuthContext);
  const upperRole = String(role || "").toUpperCase();
  // BU users are allowed to create new orders from the menu.
  // (SO/Trader should not see or access Place Order.)
  const isBU = upperRole.includes("BU") && !upperRole.includes("SO") && !upperRole.includes("TRADER");

  const done = () => {
    if (typeof onDone === "function") onDone();
  };

  const handleSelect = async (key) => {
    done();

    if (key === "Dashboard") {
      const next = upperRole.includes("TRADER")
        ? "TraderDashboard"
        : upperRole.includes("SO")
        ? "SODashboard"
        : "Dashboard";
      navigation.navigate(next);
      return;
    }

    if (key === "Logout") {
      Alert.alert("Logout", "Are you sure you want to logout?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              await signOut();
            } catch (e) {}
            navigation.reset({ index: 0, routes: [{ name: "Login" }] });
          },
        },
      ]);
      return;
    }

    if (key === "Account") {
      navigation.navigate("Account");
      return;
    }

    if (key === "Place Order") {
      if (isBU) {
        navigation.navigate("CreateOrder");
      } else {
        Alert.alert("Not available", "Place Order is only available for BU at this time.");
      }
      return;
    }

    Alert.alert("Coming soon", `${key} is not implemented yet.`);
  };

  const isCompact = variant === "compact";

  return (
    <View style={[styles.drawer, isCompact && styles.drawerCompact]}>
      {showBrand ? (
        <View style={[styles.brand, isCompact && styles.brandCompact]}>
          <Text style={[styles.brandText, isCompact && styles.brandTextCompact]}>CREDORA</Text>
          {!isCompact && <Text style={styles.brandSub}>Menu</Text>}
        </View>
      ) : null}

      {MENU_ITEMS.filter((item) => (item.key === "Place Order" ? isBU : true)).map((item) => (
        <TouchableOpacity
          key={item.key}
          style={[styles.menuItem, item.key === "Logout" && styles.menuItemLogout]}
          onPress={() => handleSelect(item.key)}
        >
          <Text style={[styles.menuText, item.key === "Logout" && styles.menuTextLogout]}>
            {item.label}
          </Text>
        </TouchableOpacity>
      ))}

      <View style={{ flex: 1 }} />
      {!isCompact && (
        <Text style={styles.footerText}>{Platform.OS === "web" ? "Web" : "Mobile"} Menu</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  drawer: {
    flex: 1,
    backgroundColor: NIGHT.card,
    borderRightWidth: 1,
    borderRightColor: NIGHT.border,
    paddingTop: 14,
    paddingHorizontal: 14,
  },
  drawerCompact: {
    paddingHorizontal: 8,
  },
  brand: {
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: NIGHT.border,
    marginBottom: 12,
  },
  brandCompact: {
    alignItems: "center",
    paddingBottom: 8,
  },
  brandText: {
    color: NIGHT.gold,
    fontWeight: "900",
    letterSpacing: 2,
    fontSize: 16,
  },
  brandTextCompact: {
    fontSize: 14,
  },
  brandSub: {
    marginTop: 6,
    color: NIGHT.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#151A25",
    borderWidth: 1,
    borderColor: NIGHT.border,
  },
  menuItemLogout: {
    backgroundColor: "#22141A",
    borderColor: "#4A2A34",
  },
  menuText: {
    color: NIGHT.text,
    fontWeight: "800",
    fontSize: 14,
  },
  menuTextLogout: {
    color: "#FFB3C0",
  },
  footerText: {
    color: NIGHT.muted,
    fontSize: 12,
    paddingVertical: 12,
    textAlign: "center",
  },
});
