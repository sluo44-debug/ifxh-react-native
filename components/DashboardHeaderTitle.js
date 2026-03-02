import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";

/**
 * Shared dashboard header title.
 *
 * iPhone:
 *  - BU/SO: 2 lines => {CompanyName} + "Dashboard"
 *  - Trader: 2 lines => "Trader" + "Dashboard"
 *
 * iPad/tablet:
 *  - BU/SO: 1 line => "{CompanyName} - Dashboard"
 *  - Trader: 1 line => "Trader Dashboard"
 */
export default function DashboardHeaderTitle({ role, companyName, isTablet }) {
  const upperRole = String(role || "").toUpperCase();
  const isTrader = upperRole.includes("TRADER");

  const safeCompany = useMemo(() => {
    const s = String(companyName || "").trim();
    return s.length ? s : "Bu Company";
  }, [companyName]);

  if (isTablet) {
    const oneLine = isTrader ? "Trader Dashboard" : `${safeCompany} - Dashboard`;
    return (
      <View style={styles.centerWrap}>
        <Text numberOfLines={1} ellipsizeMode="tail" style={styles.tabletTitle}>
          {oneLine}
        </Text>
      </View>
    );
  }

  // Phone: 2-line title
  const line1 = isTrader ? "Trader" : safeCompany;
  const line2 = "Dashboard";

  return (
    <View style={styles.centerWrap}>
      <Text numberOfLines={1} ellipsizeMode="tail" style={styles.phoneLine1}>
        {line1}
      </Text>
      <Text numberOfLines={1} ellipsizeMode="tail" style={styles.phoneLine2}>
        {line2}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centerWrap: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  tabletTitle: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 18,
  },
  phoneLine1: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 16,
    lineHeight: 18,
  },
  phoneLine2: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 16,
    lineHeight: 18,
  },
});
