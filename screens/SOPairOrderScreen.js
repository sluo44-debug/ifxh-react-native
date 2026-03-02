import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  TouchableOpacity,
  Switch,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { AuthContext } from "../context/AuthContext";

const NIGHT = {
  bg: "#0B1320",
  card: "#1A1F2B",
  card2: "#1A1F2B",
  text: "#FFFFFF",
  muted: "#BFC6CF",
  border: "#2A3142",
  primary: "#C9A24D",
  primaryDark: "#C9A24D",
  chip: "#1A1F2B",
  danger: "#ef4444",
};

import { getOrderDetail, pairByCatchingSo } from "../src/api/orders";
import { log, logRefresh, logTransition } from "../src/debug/logger";

const STATUS_OPEN = "5"; // Trader assigned catching SO -> Open
const STATUS_IN_PROGRESS = "7"; // After Pair -> In Progress

export default function SOPairOrderScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { token, role, apiBaseUrl } = useContext(AuthContext);

  const orderId = String(route?.params?.orderId || "");
  const isSO = useMemo(() => String(role || "").toUpperCase().includes("SO"), [role]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [detail, setDetail] = useState(null);

  //const syncApiClient = useCallback(() => {
  //}, [apiBaseUrl, token]);

  useEffect(() => {
    const load = async () => {
      if (!token) {
        Alert.alert("Not logged in", "Please login again.");
        navigation.reset({ index: 0, routes: [{ name: "Login" }] });
        return;
      }
      if (!isSO) {
        Alert.alert("Role mismatch", "This screen is for SO role only.");
        navigation.goBack();
        return;
      }
      if (!orderId) {
        Alert.alert("Missing Order", "OrderId not found.");
        navigation.goBack();
        return;
      }

      try {
        setLoading(true);
        //syncApiClient();
        const d = await getOrderDetail(orderId);
        setDetail(d);
      } catch (e) {
        Alert.alert("Load failed", e?.message ? String(e.message) : "Cannot load order detail.");
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [token, isSO, orderId, navigation]);

  const doPair = async () => {
    if (!detail) return;
    const latestStatusId = String(detail?.latestStatusId || "");

    // Web GUI gating + validation:
    // - Only show Pair when status == Open (5)
    // - Confirm checkbox is client-side safety rule
    if (latestStatusId !== STATUS_OPEN) {
      Alert.alert("Not allowed", `Order must be Open (ID ${STATUS_OPEN}) to Pair. Current: ${latestStatusId}`);
      return;
    }
    if (!confirm) {
      Alert.alert("Validation", "Please confirm the full paired (checkbox) to avoid mistaken click.");
      return;
    }

    try {
      setSubmitting(true);
      await pairByCatchingSo(orderId);

      Alert.alert(
        "Paired",
        `Order paired successfully. It should move to In Progress (ID ${STATUS_IN_PROGRESS}) and disappear from the SO “To Pair” list.`,
        [
          {
            text: "OK",
            onPress: () => {
              // Go back to SO dashboard; it refreshes on focus.
              navigation.goBack();
            },
          },
        ]
      );
    } catch (e) {
      Alert.alert("Pair failed", e?.message ? String(e.message) : "Pair request failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10 }}>Loading...</Text>
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={styles.center}>
        <Text>Order not found.</Text>
      </View>
    );
  }

  const latestStatusId = String(detail?.latestStatusId || "");
  const canPair = latestStatusId === STATUS_OPEN;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={styles.headerCard}>
        <Text style={styles.title}>Pair Order</Text>
        <Text style={styles.subTitle}>
          Catching SO action — available only when Status ID = {STATUS_OPEN} (Open)
        </Text>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.blockTitle}>Order Details</Text>
        <Row label="Order ID" value={detail?.orderId} />
        <Row label="Status" value={`${detail?.status} (ID ${latestStatusId})`} />
        <Row label="Order Date" value={detail?.orderDate} />
        <Row label="Amount" value={detail?.amount} />
        <Row label="Rate" value={detail?.rate} />
        <Row label="Purpose" value={detail?.purpose} />

        <View style={styles.divider} />

        <Text style={styles.blockTitle}>Sender</Text>
        <Row label="Country" value={detail?.senderCountry} />
        <Row label="Company" value={detail?.senderCompany} />
        <Row label="Currency" value={detail?.senderCurrency} />

        <View style={styles.divider} />

        <Text style={styles.blockTitle}>Receiver</Text>
        <Row label="Country" value={detail?.recipientCountry} />
        <Row label="Company" value={detail?.recipientCompany} />
        <Row label="Currency" value={detail?.recipientCurrency} />
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.blockTitle}>Confirm + Pair</Text>
        <Text style={styles.helpText}>
          Client-side safety rule (same as Web): you must confirm before pairing to avoid mistaken click.
        </Text>

        <View style={styles.confirmRow}>
          <Text style={styles.confirmLabel}>Confirm the full paired</Text>
          <Switch value={confirm} onValueChange={setConfirm} />
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, (!canPair || submitting) && styles.primaryBtnDisabled]}
          onPress={doPair}
          disabled={!canPair || submitting}
        >
          <Text style={styles.primaryBtnText}>{submitting ? "Pairing..." : "Pair"}</Text>
        </TouchableOpacity>

        {!canPair && (
          <Text style={styles.warnText}>
            Pair is disabled because current status is not Open (ID {STATUS_OPEN}).
          </Text>
        )}

        <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.secondaryBtnText}>Back</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value ?? ""}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NIGHT.bg, padding: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  headerCard: { backgroundColor: NIGHT.card, borderRadius: 16, padding: 14 },
  title: {fontSize: 20, fontWeight: "900", color: NIGHT.text },
  subTitle: {opacity: 0.7, marginTop: 4, color: NIGHT.muted },

  sectionCard: { backgroundColor: NIGHT.card, borderRadius: 16, padding: 14, marginTop: 12 },

  blockTitle: {fontSize: 16, fontWeight: "900", marginBottom: 8, color: NIGHT.text },
  helpText: {opacity: 0.7, marginBottom: 10, color: NIGHT.muted },

  divider: { height: 1, backgroundColor: NIGHT.border, marginVertical: 12 },

  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8, gap: 12 },
  rowLabel: { fontSize: 12, color: NIGHT.muted, width: 110 },
  rowValue: { fontSize: 12, color: NIGHT.text, flex: 1, textAlign: "right" },

  confirmRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  confirmLabel: {fontWeight: "900", color: NIGHT.text },

  primaryBtn: {
    marginTop: 16,
    backgroundColor: "#C9A24D",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  primaryBtnDisabled: { backgroundColor: "#2A3142" },
  primaryBtnText: { color: "#FFFFFF", fontWeight: "900", fontSize: 15 },

  warnText: { marginTop: 10, fontSize: 12, color: "#C9A24D" },

  secondaryBtn: {
    marginTop: 12,
    backgroundColor: NIGHT.card2,
    borderWidth: 1,
    borderColor: NIGHT.border,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  secondaryBtnText: { color: NIGHT.text, fontWeight: "900", fontSize: 15 },
});