import React from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";

export type AppMenuKey =
  | "Dashboard"
  | "Account"
  | "My Portfolio"
  | "Place Order"
  | "Market Analysis"
  | "Statements"
  | "Contact Us"
  | "Logout";

export const MENU_ITEMS: { key: AppMenuKey; label: string }[] = [
  { key: "Dashboard", label: "Dashboard" },
  { key: "Account", label: "Account" },
  { key: "My Portfolio", label: "My Portfolio" },
  { key: "Place Order", label: "Place Order" },
  { key: "Market Analysis", label: "Market Analysis" },
  { key: "Statements", label: "Statements" },
  { key: "Contact Us", label: "Contact Us" },
  { key: "Logout", label: "Logout" },
];

export default function AppMenu({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (key: AppMenuKey) => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      {/* Drawer */}
      <View style={styles.drawerWrap} pointerEvents="box-none">
        <View style={styles.drawer}>
          <View style={styles.brand}>
            <Text style={styles.brandText}>CREDORA</Text>
          </View>

          {MENU_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[styles.menuItem, item.key === "Logout" && styles.menuItemLogout]}
              onPress={() => onSelect(item.key)}
            >
              <Text style={[styles.menuText, item.key === "Logout" && styles.menuTextLogout]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}

          <View style={{ flex: 1 }} />

          <Text style={styles.footerText}>
            {Platform.OS === "web" ? "Web" : "Mobile"} Menu
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  drawerWrap: {
    flex: 1,
    flexDirection: "row",
  },
  drawer: {
    width: 260,
    backgroundColor: "#1A1F2B",
    paddingTop: 18,
    paddingHorizontal: 12,
    paddingBottom: 18,
  },
  brand: {
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginBottom: 12,
  },
  brandText: {
    color: "#FFFFFF",
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  menuItemLogout: {
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  menuText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  menuTextLogout: {
    color: "#FFFFFF",
  },
  footerText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    paddingHorizontal: 10,
    marginTop: 10,
  },
});