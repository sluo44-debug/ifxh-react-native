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

import { getOrderDetail, confirmBuReceive } from "../src/api/orders";
import { STATUS_SENT_STEP6, STATUS_FILLED } from "../src/workflow/orderWorkflow";

export default function BUConfirmReceiveScreen() {
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
    navigation.setOptions({
      title: "Confirm Received Order",
    });
  }, [navigation]);

  //const syncApiClient = useCallback(() => {
  //}, [apiBaseUrl, userToken]);

  const load = useCallback(async () => {
    if (!orderId) return;
    try {
      setLoading(true);
      //syncApiClient();
      const d = await getOrderDetail(orderId);
      setDetail(d ?? null);
    } catch (e) {
      Alert.alert("Load failed", e?.message ? String(e.message) : "Unknown error");
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  const onConfirm = useCallback(async () => {
    if (!confirmChecked) {
      Alert.alert("Validation", "Please check confirm checkbox before confirming receive order.");
      return;
    }

    if (latestStatusId !== STATUS_SENT_STEP6) {
      Alert.alert("Not allowed", `This order is not Sent Step6 (23). Current: ${latestStatusId}`);
      return;
    }

    try {
      setSubmitting(true);
      console.log("[BUConfirmReceive] request", { orderId, beforeStatusId: latestStatusId });

      const res = await confirmBuReceive(orderId);

      console.log("[BUConfirmReceive] response", { orderId, response: res, expectedAfterStatusId: STATUS_FILLED });

      Alert.alert("Success", "Confirmed Received. Status should become Filled (9).", [
        {
          text: "OK",
          onPress: () => navigation.goBack(), // parent refreshes on focus
        },
      ]);
    } catch (err) {
      console.log("[BUConfirmReceive] error", { orderId, err });
      Alert.alert("Confirm failed", err?.message ? String(err.message) : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }, [confirmChecked, latestStatusId, orderId, navigation]);

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
        <Text style={{ opacity: 0.7 }}>Order not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.h1}>Confirm Received Order</Text>

        <Text style={styles.row}>Order ID: {detail.orderId}</Text>
        <Text style={styles.row}>Order Date: {detail.orderDate}</Text>
        <Text style={styles.row}>Update Time: {detail.updateTime}</Text>
        <Text style={styles.row}>Order Status: {detail.status}</Text>
        <Text style={styles.row}>Rate: {detail.rate}</Text>
        <Text style={styles.row}>Amount: {detail.amount}</Text>
        <Text style={styles.row}>Purpose: {detail.purpose}</Text>

        <Text style={styles.section}>Sender</Text>
        <Text style={styles.row}>Country: {detail.senderCountry}</Text>
        <Text style={styles.row}>Company: {detail.senderCompany}</Text>
        <Text style={styles.row}>Currency: {detail.senderCurrency}</Text>

        <Text style={styles.section}>Receiver</Text>
        <Text style={styles.row}>Country: {detail.recipientCountry}</Text>
        <Text style={styles.row}>Company: {detail.recipientCompany}</Text>
        <Text style={styles.row}>Currency: {detail.recipientCurrency}</Text>

        <View style={styles.divider} />

        <View style={styles.confirmRow}>
          <Switch value={confirmChecked} onValueChange={setConfirmChecked} />
          <Text style={styles.confirmText}>Click the check box to confirm receive order.</Text>
        </View>

        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[styles.btn, submitting ? styles.btnDisabled : null]}
            disabled={submitting}
            onPress={onConfirm}
          >
            <Text style={styles.btnText}>{submitting ? "Confirming..." : "Confirm"}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={() => navigation.goBack()}>
            <Text style={[styles.btnText, styles.btnTextSecondary]}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    backgroundColor: NIGHT.card,
    borderRadius: 18,
    padding: 16,
    shadowColor: "#FFFFFF",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  h1: { fontSize: 20, fontWeight: "900", marginBottom: 10, color: NIGHT.text },
  row: { marginTop: 6, opacity: 0.92, color: NIGHT.text },
  section: { marginTop: 14, fontWeight: "900", color: NIGHT.text },
  divider: { height: 1, backgroundColor: NIGHT.border, marginTop: 14 },

  confirmRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14 },
  confirmText: { flex: 1, opacity: 0.9, color: NIGHT.muted },

  btnRow: { flexDirection: "row", gap: 10, marginTop: 18 },
  btn: {
    flex: 1,
    backgroundColor: NIGHT.primaryDark,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  btnSecondary: { backgroundColor: NIGHT.card2 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#FFFFFF", fontWeight: "800" },
});
