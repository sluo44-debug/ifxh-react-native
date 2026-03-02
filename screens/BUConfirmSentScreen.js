import React, { useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from "react";
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

import { getOrderDetail, confirmBuSent } from "../src/api/orders";
import { STATUS_IN_PROGRESS, STATUS_SENT_STEP1 } from "../src/workflow/orderWorkflow";

export default function BUConfirmSentScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { token: userToken, apiBaseUrl } = useContext(AuthContext);

  const orderId = String(route?.params?.orderId ?? "");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [detail, setDetail] = useState(null);

  const [confirmChecked, setConfirmChecked] = useState(false);

  const latestStatusId = useMemo(() => String(detail?.latestStatusId ?? ""), [detail]);

  useLayoutEffect(() => {
    navigation.setOptions({ title: "Confirm Sent Order" });
  }, [navigation]);

  const load = useCallback(async () => {
    if (!orderId || !userToken || !apiBaseUrl) return;
    try {
      setLoading(true);

      // Ensure API client is configured (same pattern as other screens)

      const d = await getOrderDetail(orderId);
      setDetail(d);
    } catch (err) {
      Alert.alert("Load failed", err?.message ? String(err.message) : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [orderId, userToken, apiBaseUrl]);

  useEffect(() => {
    load();
  }, [load]);

  const onConfirm = useCallback(async () => {
    if (!confirmChecked) {
      Alert.alert("Validation", "Please check confirm checkbox before confirming sent order.");
      return;
    }

    if (latestStatusId !== STATUS_IN_PROGRESS) {
      Alert.alert("Not allowed", `This order is not In Progress (7). Current: ${latestStatusId}`);
      return;
    }

    try {
      setSubmitting(true);

      // Lightweight debug logs requested (status before/after + API call)
      console.log("[BUConfirmSent] request", { orderId, beforeStatusId: latestStatusId });

      const res = await confirmBuSent(orderId);

      console.log("[BUConfirmSent] response", { orderId, response: res, expectedAfterStatusId: STATUS_SENT_STEP1 });

      Alert.alert("Success", "Confirmed Sent. Status should become Sent Step1 (12).", [
        {
          text: "OK",
          onPress: () => {
            // Go back; parent screen should refresh on focus
            navigation.goBack();
          },
        },
      ]);
    } catch (err) {
      console.log("[BUConfirmSent] error", { orderId, err });
      Alert.alert("Confirm failed", err?.message ? String(err.message) : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }, [confirmChecked, latestStatusId, orderId, navigation]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8, opacity: 0.6 }}>Loading…</Text>
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={styles.center}>
        <Text style={{ opacity: 0.7 }}>Order not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.h1}>Confirm Sent Order</Text>

        <Text style={styles.row}>Order ID: {detail.orderId}</Text>
        <Text style={styles.row}>Order Date: {detail.orderDate}</Text>
        <Text style={styles.row}>Update Time: {detail.updateTime}</Text>
        <Text style={styles.row}>Order Status: {detail.status}</Text>
        <Text style={styles.row}>Rate: {detail.rate}</Text>
        <Text style={styles.row}>Amount: {detail.amount}</Text>
        <Text style={styles.row}>Purpose: {detail.purpose}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sender</Text>
          <Text style={styles.row}>Country: {detail.senderCountry}</Text>
          <Text style={styles.row}>Company: {detail.senderCompany}</Text>
          <Text style={styles.row}>Currency: {detail.senderCurrency}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Receiver</Text>
          <Text style={styles.row}>Country: {detail.recipientCountry}</Text>
          <Text style={styles.row}>Company: {detail.recipientCompany}</Text>
          <Text style={styles.row}>Currency: {detail.recipientCurrency}</Text>
        </View>

        <View style={styles.confirmRow}>
          <Switch value={confirmChecked} onValueChange={setConfirmChecked} />
          <Text style={styles.confirmText}>Click the check box to confirm sent order.</Text>
        </View>

        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[styles.btn, submitting ? styles.btnDisabled : null]}
            disabled={submitting}
            onPress={onConfirm}
          >
            <Text style={styles.btnText}>{submitting ? "Confirming…" : "Confirm"}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={() => navigation.goBack()}>
            <Text style={styles.btnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  card: { backgroundColor: NIGHT.card, borderRadius: 18, padding: 16 },
  h1: { color: NIGHT.text,  fontSize: 18, fontWeight: "900", marginBottom: 10 },

  row: { color: NIGHT.text,  marginTop: 4, opacity: 0.9 },

  section: { marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: NIGHT.border },
  sectionTitle: { color: NIGHT.text,  fontWeight: "800", marginBottom: 6 },

  confirmRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 16 },
  confirmText: { color: NIGHT.muted,  flex: 1, opacity: 0.85 },

  btnRow: { flexDirection: "row", gap: 10, marginTop: 18 },
  btn: {
    flex: 1,
    backgroundColor: NIGHT.primaryDark,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  btnSecondary: { backgroundColor: NIGHT.chip },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#FFFFFF", fontWeight: "800" },
});
